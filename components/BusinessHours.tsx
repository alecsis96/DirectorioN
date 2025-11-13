import React, { useEffect, useMemo, useState } from "react";

type StructuredHorario = {
  abierto: boolean;
  desde: string;
  hasta: string;
};

interface BusinessHoursProps {
  hours?: string;
  horarios?: Record<string, StructuredHorario>;
}

type DailySlot = { open: number; close: number };
type Schedule = Record<number, DailySlot[]>;

const DAY_DISPLAY = ["Dom", "Lun", "Mar", "Mi\u00E9", "Jue", "Vie", "S\u00E1b"];
const DAY_KEY_MAP: Record<string, number> = {
  dom: 0,
  domingo: 0,
  lun: 1,
  lunes: 1,
  mar: 2,
  martes: 2,
  mie: 3,
  miercoles: 3,
  jue: 4,
  jueves: 4,
  vie: 5,
  viernes: 5,
  sab: 6,
  sabado: 6,
};

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const parseTimeToMinutes = (time: string): number | null => {
  const match = time.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
};

const formatTime = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

const resolveDayIndex = (input: string): number => {
  const normalized = normalizeToken(input).replace(/\.$/, "");
  if (!normalized) return -1;
  return DAY_KEY_MAP[normalized] ?? -1;
};

const addSlot = (schedule: Schedule, dayIndex: number, start: string, end: string) => {
  const open = parseTimeToMinutes(start);
  const close = parseTimeToMinutes(end);
  if (open == null || close == null || open === close) return;
  if (!schedule[dayIndex]) schedule[dayIndex] = [];
  schedule[dayIndex].push({ open, close });
};

const expandDayToken = (token: string, start: string, end: string, schedule: Schedule) => {
  const normalized = normalizeToken(token);
  if (!normalized) return;
  if (normalized.includes("-")) {
    const [fromRaw, toRaw] = normalized.split("-").map((segment) => segment.trim());
    const fromIndex = resolveDayIndex(fromRaw);
    const toIndex = resolveDayIndex(toRaw);
    if (fromIndex === -1 || toIndex === -1 || fromIndex > toIndex) return;
    for (let idx = fromIndex; idx <= toIndex; idx++) {
      addSlot(schedule, idx, start, end);
    }
    return;
  }
  const dayIndex = resolveDayIndex(normalized);
  if (dayIndex !== -1) {
    addSlot(schedule, dayIndex, start, end);
  }
};

export type BusinessStatus = {
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
  todayLabel: string;
};

const buildSchedule = (hours?: string, horarios?: Record<string, StructuredHorario>): { schedule: Schedule; hasData: boolean } => {
  const schedule: Schedule = {};

  if (horarios) {
    Object.keys(horarios).forEach((dayKey) => {
      const idx = resolveDayIndex(dayKey);
      const info = horarios[dayKey];
      if (idx !== -1 && info?.abierto) {
        addSlot(schedule, idx, info.desde, info.hasta);
      }
    });
  }

  if (!Object.keys(schedule).length && hours) {
    const segments = hours
      .split(";")
      .map((segment) => segment.trim())
      .filter(Boolean);

    segments.forEach((segment) => {
      const match = segment.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
      if (!match) return;
      const [startRaw, endRaw] = [match[1], match[2]];
      const dayPart = segment.slice(0, match.index).trim();
      dayPart
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((token) => expandDayToken(token, startRaw, endRaw, schedule));
    });
  }

  return { schedule, hasData: Object.keys(schedule).length > 0 };
};

export function getBusinessStatus(hours: string, now = new Date()): BusinessStatus {
  const { schedule } = buildSchedule(hours);
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayLabel = DAY_DISPLAY[today];

  const todaysSlots = (schedule[today] || []).sort((a, b) => a.open - b.open);
  for (const slot of todaysSlots) {
    if (currentMinutes >= slot.open && currentMinutes < slot.close) {
      return {
        isOpen: true,
        closesAt: formatTime(slot.close),
        todayLabel,
      };
    }
  }

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (today + offset) % 7;
    const slots = (schedule[dayIndex] || []).sort((a, b) => a.open - b.open);
    for (const slot of slots) {
      const isToday = offset === 0;
      if (isToday && slot.open <= currentMinutes) continue;
      return {
        isOpen: false,
        opensAt: `${DAY_DISPLAY[dayIndex]} ${formatTime(slot.open)}`,
        todayLabel,
      };
    }
  }

  return {
    isOpen: false,
    todayLabel,
  };
}

type HoursStatus =
  | { status: "open"; closeAt: string; message: string }
  | { status: "closed"; nextOpen?: string; message: string }
  | { status: "unknown"; message: string };

const formatNextOpen = (dayIndex: number, minutes: number) => `${DAY_DISPLAY[dayIndex]} ${formatTime(minutes)}`;

const describeStatus = (schedule: Schedule): HoursStatus => {
  const now = new Date();
  const today = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaysSlots = (schedule[today] || []).sort((a, b) => a.open - b.open);
  for (const slot of todaysSlots) {
    if (currentMinutes >= slot.open && currentMinutes < slot.close) {
      const closeAt = formatTime(slot.close);
      return {
        status: "open",
        closeAt,
        message: `Abierto · Cierra a las ${closeAt}`,
      };
    }
  }

  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (today + offset) % 7;
    const slots = (schedule[dayIndex] || []).sort((a, b) => a.open - b.open);
    for (const slot of slots) {
      const isToday = offset === 0;
      if (isToday && currentMinutes >= slot.close) continue;
      if (isToday && currentMinutes < slot.open) {
        const nextOpen = formatNextOpen(dayIndex, slot.open);
        return {
          status: "closed",
          nextOpen,
          message: `Cerrado · Abre hoy a las ${formatTime(slot.open)}`,
        };
      }
      if (!isToday) {
        const nextOpen = formatNextOpen(dayIndex, slot.open);
        return {
          status: "closed",
          nextOpen,
          message: `Cerrado · Abre ${nextOpen}`,
        };
      }
    }
  }

  return {
    status: "unknown",
    message: "Horario no disponible",
  };
};

const formatSummary = (schedule: Schedule) => {
  if (!Object.keys(schedule).length) return "\u2014";
  const entries: string[] = [];

  let currentRange: { start: number; end: number; time: string } | null = null;
  for (let day = 0; day < 7; day++) {
    const slot = schedule[day]?.[0];
    const timeRange = slot ? `${formatTime(slot.open)}-${formatTime(slot.close)}` : null;

    if (!timeRange) {
      if (currentRange) {
        const label =
          currentRange.start === currentRange.end
            ? `${DAY_DISPLAY[currentRange.start]} ${currentRange.time}`
            : `${DAY_DISPLAY[currentRange.start]}-${DAY_DISPLAY[currentRange.end]} ${currentRange.time}`;
        entries.push(label);
        currentRange = null;
      }
      continue;
    }

    if (currentRange && currentRange.time === timeRange && day === currentRange.end + 1) {
      currentRange.end = day;
    } else {
      if (currentRange) {
        const label =
          currentRange.start === currentRange.end
            ? `${DAY_DISPLAY[currentRange.start]} ${currentRange.time}`
            : `${DAY_DISPLAY[currentRange.start]}-${DAY_DISPLAY[currentRange.end]} ${currentRange.time}`;
        entries.push(label);
      }
      currentRange = { start: day, end: day, time: timeRange };
    }
  }

  if (currentRange) {
    const label =
      currentRange.start === currentRange.end
        ? `${DAY_DISPLAY[currentRange.start]} ${currentRange.time}`
        : `${DAY_DISPLAY[currentRange.start]}-${DAY_DISPLAY[currentRange.end]} ${currentRange.time}`;
    entries.push(label);
  }

  return entries.join("; ");
};

export default function BusinessHours({ hours, horarios }: BusinessHoursProps) {
  const { schedule, hasData } = useMemo(() => buildSchedule(hours, horarios), [hours, horarios]);
  const [statusDetails, setStatusDetails] = useState<HoursStatus | null>(null);

  useEffect(() => {
    const updateStatus = () => setStatusDetails(describeStatus(schedule));
    updateStatus();
    const interval = setInterval(updateStatus, 60_000);
    return () => clearInterval(interval);
  }, [schedule]);

  const summary = useMemo(() => formatSummary(schedule), [schedule]);

  if (!hasData) {
    return (
      <p className="text-sm text-gray-600">
        <span className="font-medium">Horario:</span> {"\u2014"}
      </p>
    );
  }

  const computedStatus = statusDetails ?? { status: "unknown", message: "Actualizando horario..." };
  const isOpen = computedStatus.status === "open";
  const badgeClass = isOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700";

  return (
    <div className="space-y-2" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeClass}`}>
          {isOpen ? "Abierto" : "Cerrado"}
        </span>
        <span className="text-sm text-gray-700">{computedStatus.message}</span>
      </div>
      <p className="text-sm text-gray-600">
        <span className="font-medium">Horario:</span> {summary}
      </p>
    </div>
  );
}
