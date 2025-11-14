import React from "react";
import { BsEye, BsPhone, BsWhatsapp } from "react-icons/bs";

type Metrics = {
  profileViews: number;
  phoneClicks: number;
  whatsappClicks: number;
};

type AdminStatsPanelProps = {
  metrics?: Metrics | null;
  loading?: boolean;
};

const CardSkeleton = () => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
    <div className="h-5 w-10 rounded bg-gray-200 mb-3" />
    <div className="h-8 w-1/3 rounded bg-gray-200" />
  </div>
);

const MetricCard = ({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex items-center gap-4">
    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${accent}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString("es-MX")}</p>
    </div>
  </div>
);

export default function AdminStatsPanel({ metrics, loading }: AdminStatsPanelProps) {
  if (loading || !metrics) {
    return (
      <section className="grid gap-4 md:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Vistas de perfil"
        value={metrics.profileViews}
        icon={<BsEye className="text-blue-600 text-xl" />}
        accent="bg-blue-50 text-blue-600"
      />
      <MetricCard
        label="Clicks en Llamar"
        value={metrics.phoneClicks}
        icon={<BsPhone className="text-green-600 text-xl" />}
        accent="bg-green-50 text-green-600"
      />
      <MetricCard
        label="Clicks en WhatsApp"
        value={metrics.whatsappClicks}
        icon={<BsWhatsapp className="text-emerald-600 text-xl" />}
        accent="bg-emerald-50 text-emerald-600"
      />
    </section>
  );
}
