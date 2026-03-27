"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BsShare } from "react-icons/bs";

import type { Business } from "../types/business";

type ShareButtonBusiness = Pick<Business, "id" | "slug" | "name">;

type Props = {
  business: ShareButtonBusiness;
  source?: "detail" | "card" | string;
  className?: string;
};

type ShareState = "idle" | "sharing" | "copied";

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document === "undefined") {
    throw new Error("Clipboard unavailable");
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildBusinessPath(business: ShareButtonBusiness) {
  const segment = business.slug || business.id;
  return segment ? `/negocios/${segment}` : null;
}

export default function ShareButton({ business, source = "detail", className = "" }: Props) {
  const [shareState, setShareState] = useState<ShareState>("idle");
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const shareLabel = useMemo(() => {
    if (shareState === "sharing") return "Compartiendo...";
    if (shareState === "copied") return "Enlace copiado";
    return "Compartir";
  }, [shareState]);

  const shareBusiness = async () => {
    if (typeof window === "undefined") return;

    const fallbackPath = buildBusinessPath(business);
    const resolvedUrl = fallbackPath
      ? new URL(fallbackPath, window.location.origin).toString()
      : `${window.location.origin}${window.location.pathname}`;

    const shareText = `Mira este negocio en YajaGon 👇\n${business.name}\n${resolvedUrl}`;

    setShareState("sharing");

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: business.name,
          text: `Mira este negocio en YajaGon 👇\n${business.name}`,
          url: resolvedUrl,
        });

        // Preparado para tracking futuro:
        // track("business_shared", { businessId: business.id, source });
        setShareState("idle");
        return;
      }

      await copyText(shareText);

      // Preparado para tracking futuro:
      // track("business_shared", { businessId: business.id, source });
      setShareState("copied");
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setShareState("idle"), 2200);
    } catch (error) {
      setShareState("idle");
      console.warn("[share-business]", { error, businessId: business.id, source });
    }
  };

  return (
    <button
      type="button"
      onClick={shareBusiness}
      disabled={shareState === "sharing"}
      aria-label={`Compartir ${business.name}`}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      <BsShare className="h-4 w-4" />
      <span>{shareLabel}</span>
    </button>
  );
}
