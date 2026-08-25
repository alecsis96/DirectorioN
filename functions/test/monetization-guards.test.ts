// @vitest-environment node

import {beforeEach, describe, expect, it, vi} from "vitest";

const mocks = vi.hoisted(() => {
  const collection = vi.fn(() => {
    throw new Error("Firestore collection access must stay disabled");
  });
  const batch = vi.fn(() => {
    throw new Error("Firestore batch access must stay disabled");
  });
  const sendMail = vi.fn();
  return {
    collection,
    batch,
    sendMail,
    initializeApp: vi.fn(),
    firestore: vi.fn(() => ({collection, batch})),
    getFirestore: vi.fn(() => ({collection, batch})),
  };
});

vi.mock("firebase-admin", () => {
  const firestore = Object.assign(mocks.firestore, {
    Timestamp: {
      now: vi.fn(),
      fromDate: vi.fn(),
      fromMillis: vi.fn(),
    },
  });
  return {
    apps: [{}],
    initializeApp: mocks.initializeApp,
    firestore,
  };
});

vi.mock("firebase-admin/app", () => ({
  initializeApp: mocks.initializeApp,
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {serverTimestamp: vi.fn()},
  getFirestore: mocks.getFirestore,
}));

vi.mock("nodemailer", () => ({
  createTransport: vi.fn(() => ({sendMail: mocks.sendMail})),
}));

import {
  MONETIZATION_FEATURE_ENABLED as NEXT_MONETIZATION_ENABLED,
} from "../../lib/featureFlags";
import {
  MONETIZATION_DISABLED_CODE,
  MONETIZATION_FEATURE_ENABLED,
} from "../src/featureFlags";
import {
  addToWaitlistCallable,
  checkUpgradeAvailability,
  cleanExpiredWaitlist,
  confirmWaitlistUpgrade,
  dailyMetricsReport,
  getCategoryMetrics,
  onBusinessPlanChange,
  onPackagePurchase,
} from "../src/scarcityFunctions";
import {
  sendPaymentFailedNotification,
  sendPaymentReminders,
} from "../src/emailNotifications";
import {sendPaymentFailedEmail} from "../src/index";

describe("Functions monetization kill switch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the Next and Functions flags in parity", () => {
    expect(MONETIZATION_FEATURE_ENABLED).toBe(false);
    expect(NEXT_MONETIZATION_ENABLED).toBe(false);
  });

  it.each([
    ["addToWaitlistCallable", addToWaitlistCallable],
    ["confirmWaitlistUpgrade", confirmWaitlistUpgrade],
  ])(
    "%s fails closed before authentication or Firestore",
    async (_name, fn) => {
      await expect(
        fn.run({data: {}, auth: null} as never)
      ).rejects.toMatchObject({
        code: "failed-precondition",
        details: {code: MONETIZATION_DISABLED_CODE},
      });
      expect(mocks.collection).not.toHaveBeenCalled();
    }
  );

  it(
    "returns neutral availability and category metrics",
    async () => {
      await expect(
        checkUpgradeAvailability.run({data: {}} as never)
      ).resolves.toMatchObject({
        enabled: false,
        code: MONETIZATION_DISABLED_CODE,
        allowed: false,
        slotsLeft: 0,
      });
      await expect(
        getCategoryMetrics.run({data: {}} as never)
      ).resolves.toMatchObject({
        enabled: false,
        code: MONETIZATION_DISABLED_CODE,
        totalBusinesses: 0,
        limits: null,
      });
      expect(mocks.collection).not.toHaveBeenCalled();
    }
  );

  it("makes commercial schedules zero-read no-ops", async () => {
    await expect(
      cleanExpiredWaitlist.run({} as never)
    ).resolves.toBeUndefined();
    await expect(dailyMetricsReport.run({} as never)).resolves.toBeUndefined();
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.batch).not.toHaveBeenCalled();
  });

  it("stops Eventarc triggers before event access", async () => {
    const inaccessibleEvent = {
      get data(): never {
        throw new Error("Event data must not be read");
      },
    };
    await expect(
      onBusinessPlanChange.run(inaccessibleEvent as never)
    ).resolves.toBeUndefined();
    await expect(
      onPackagePurchase.run(inaccessibleEvent as never)
    ).resolves.toBeUndefined();
    expect(mocks.collection).not.toHaveBeenCalled();
  });

  it("stops payment reminders before provider access", async () => {
    await expect(
      sendPaymentReminders.run({} as never, {} as never)
    ).resolves.toMatchObject({
      enabled: false,
      code: MONETIZATION_DISABLED_CODE,
    });
    await expect(
      sendPaymentFailedNotification("business-1")
    ).resolves.toBeUndefined();
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it("returns HTTP 503 before Firestore or email", async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({json}));
    await (sendPaymentFailedEmail as unknown as (
      request: unknown,
      response: unknown
    ) => Promise<void>)(
      {method: "POST", body: {businessId: "business-1"}} as never,
      {status} as never
    );

    expect(status).toHaveBeenCalledWith(503);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      code: MONETIZATION_DISABLED_CODE,
    }));
    expect(mocks.collection).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
