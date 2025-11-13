import type { NextApiRequest, NextApiResponse } from "next";
import * as admin from "firebase-admin";
import { getAdminFirestore } from "../../../lib/server/firebaseAdmin";

type SummaryResponse = {
  range: { from: string; to: string };
  pageviewsByPage: Record<"home" | "list" | "detail", number>;
  ctaCounts: Record<"call" | "wa" | "maps" | "fb", number>;
  manageOpens: number;
  reviews: { count: number; avgRating: number };
  conversions: { appApprovedCount: number };
  topBusinesses: {
    detail: { businessId: string; count: number }[];
    ctas: { businessId: string; count: number }[];
  };
};

const DEFAULT_RANGE_DAYS = 7;

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value?: string): Date | null {
  if (!value || !DATE_REGEX.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isFinite(date.getTime()) ? date : null;
}

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
}

function endOfDayUTC(date: Date): Date {
  const end = startOfDayUTC(date);
  end.setUTCDate(end.getUTCDate() + 1);
  return end;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SummaryResponse | { error: string }>) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const db = getAdminFirestore();

  const { from: fromParam, to: toParam, range: rangeParam } = req.query;

  const today = new Date();
  const defaultTo = endOfDayUTC(today);
  const defaultFrom = startOfDayUTC(new Date(today.getTime() - DEFAULT_RANGE_DAYS * 86400000));

  let fromDate = parseDate(typeof fromParam === "string" ? fromParam : undefined) ?? defaultFrom;
  let toDate = parseDate(typeof toParam === "string" ? toParam : undefined) ?? defaultTo;

  if (rangeParam && typeof rangeParam === "string") {
    const days = Number(rangeParam);
    if (Number.isFinite(days) && days > 0 && days <= 90) {
      toDate = defaultTo;
      fromDate = startOfDayUTC(new Date(today.getTime() - days * 86400000));
    }
  }

  if (fromDate >= toDate) {
    return res.status(400).json({ error: "Invalid date range" });
  }

  const startTs = admin.firestore.Timestamp.fromDate(fromDate);
  const endTs = admin.firestore.Timestamp.fromDate(toDate);

  const snapshot = await db
    .collection("events")
    .where("ts", ">=", startTs)
    .where("ts", "<", endTs)
    .get();

  const pageviews: SummaryResponse["pageviewsByPage"] = { home: 0, list: 0, detail: 0 };
  const ctas: SummaryResponse["ctaCounts"] = { call: 0, wa: 0, maps: 0, fb: 0 };
  let manageOpens = 0;
  let reviewCount = 0;
  let reviewSum = 0;
  let appApprovedCount = 0;

  const detailPvByBiz = new Map<string, number>();
  const ctaByBiz = new Map<string, number>();

  snapshot.forEach((doc) => {
    const data = doc.data() as Record<string, any>;
    const type = data.t as string;
    const page = data.p as "home" | "list" | "detail" | undefined;
    const businessId = typeof data.b === "string" ? data.b : undefined;

    switch (type) {
      case "pv": {
        if (page && pageviews[page] !== undefined) {
          pageviews[page] += 1;
        }
        if (page === "detail" && businessId) {
          detailPvByBiz.set(businessId, (detailPvByBiz.get(businessId) || 0) + 1);
        }
        break;
      }
      case "cta_call":
      case "cta_wa":
      case "cta_maps":
      case "cta_fb": {
        const key = type.replace("cta_", "") as keyof SummaryResponse["ctaCounts"];
        ctas[key] += 1;
        if (businessId) {
          ctaByBiz.set(businessId, (ctaByBiz.get(businessId) || 0) + 1);
        }
        break;
      }
      case "open_manage": {
        manageOpens += 1;
        break;
      }
      case "review_submit": {
        reviewCount += 1;
        if (typeof data.r === "number" && Number.isFinite(data.r)) {
          reviewSum += data.r;
        }
        break;
      }
      case "app_approved": {
        appApprovedCount += 1;
        break;
      }
      default:
        break;
    }
  });

  const topDetail = Array.from(detailPvByBiz.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([businessId, count]) => ({ businessId, count }));

  const topCtas = Array.from(ctaByBiz.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([businessId, count]) => ({ businessId, count }));

  const response: SummaryResponse = {
    range: {
      from: fromDate.toISOString().slice(0, 10),
      to: new Date(toDate.getTime() - 1).toISOString().slice(0, 10),
    },
    pageviewsByPage: pageviews,
    ctaCounts: ctas,
    manageOpens,
    reviews: {
      count: reviewCount,
      avgRating: reviewCount ? Number((reviewSum / reviewCount).toFixed(2)) : 0,
    },
    conversions: {
      appApprovedCount,
    },
    topBusinesses: {
      detail: topDetail,
      ctas: topCtas,
    },
  };

  res.setHeader("Cache-Control", "private, max-age=60");
  return res.status(200).json(response);
}
