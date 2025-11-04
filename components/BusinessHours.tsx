import React, { useState, useEffect } from 'react';

interface BusinessHoursProps {
  hours: string;
  horarios?: {
    [key: string]: { abierto: boolean; desde: string; hasta: string };
  };
}

interface BusinessStatus {
  isOpen: boolean;
  statusText: string;
  statusColor: string;
  statusIcon: string;
  nextChange?: string;
}

const dayMap: { [key: string]: string } = {
  'lunes': 'Lun',
  'martes': 'Mar',
  'miercoles': 'Mié',
  'jueves': 'Jue',
  'viernes': 'Vie',
  'sabado': 'Sáb',
  'domingo': 'Dom'
};

const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return { hours, minutes };
}

function getMinutesFromMidnight(hours: number, minutes: number): number {
  return hours * 60 + minutes;
}

function getBusinessStatus(horarios?: any): BusinessStatus {
  const now = new Date();
  const currentDay = dayNames[now.getDay()];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutes = getMinutesFromMidnight(currentHour, currentMinute);

  // Si no hay horarios estructurados, asumir cerrado
  if (!horarios || !horarios[currentDay]) {
    return {
      isOpen: false,
      statusText: 'Horario no disponible',
      statusColor: 'text-gray-500',
      statusIcon: '🕒'
    };
  }

  const todaySchedule = horarios[currentDay];

  // Si está marcado como cerrado
  if (!todaySchedule.abierto) {
    // Buscar el próximo día que abre
    let nextOpenDay = '';
    let nextOpenTime = '';
    
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = dayNames[nextDayIndex];
      
      if (horarios[nextDay] && horarios[nextDay].abierto) {
        nextOpenDay = dayMap[nextDay];
        nextOpenTime = horarios[nextDay].desde;
        break;
      }
    }

    return {
      isOpen: false,
      statusText: nextOpenDay ? `Cerrado – Abre ${nextOpenDay} a las ${nextOpenTime}` : 'Cerrado',
      statusColor: 'text-gray-600',
      statusIcon: '⚫',
      nextChange: nextOpenTime
    };
  }

  // Parsear horarios del día
  const openTime = parseTime(todaySchedule.desde);
  const closeTime = parseTime(todaySchedule.hasta);
  
  const openMinutes = getMinutesFromMidnight(openTime.hours, openTime.minutes);
  const closeMinutes = getMinutesFromMidnight(closeTime.hours, closeTime.minutes);

  // Verificar si está abierto ahora
  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return {
      isOpen: true,
      statusText: `Abierto (hasta ${todaySchedule.hasta})`,
      statusColor: 'text-green-600',
      statusIcon: '🟢',
      nextChange: todaySchedule.hasta
    };
  }

  // Si aún no abre hoy
  if (currentMinutes < openMinutes) {
    const minutesUntilOpen = openMinutes - currentMinutes;
    
    if (minutesUntilOpen <= 30) {
      return {
        isOpen: false,
        statusText: `Cerrado – Abre en ${minutesUntilOpen} minutos`,
        statusColor: 'text-yellow-600',
        statusIcon: '🟡',
        nextChange: todaySchedule.desde
      };
    }
    
    return {
      isOpen: false,
      statusText: `Cerrado – Abre a las ${todaySchedule.desde}`,
      statusColor: 'text-red-600',
      statusIcon: '🔴',
      nextChange: todaySchedule.desde
    };
  }

  // Ya cerró hoy, buscar próximo día que abre
  let nextOpenDay = '';
  let nextOpenTime = '';
  
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (now.getDay() + i) % 7;
    const nextDay = dayNames[nextDayIndex];
    
    if (horarios[nextDay] && horarios[nextDay].abierto) {
      nextOpenDay = dayMap[nextDay];
      nextOpenTime = horarios[nextDay].desde;
      break;
    }
  }

  return {
    isOpen: false,
    statusText: nextOpenDay ? `Cerrado – Abre ${nextOpenDay} a las ${nextOpenTime}` : 'Cerrado',
    statusColor: 'text-gray-600',
    statusIcon: '⚫',
    nextChange: nextOpenTime
  };
}

function formatHoursDisplay(horarios?: any): string {
  if (!horarios) return 'Horario no disponible';

  const schedule: { [key: string]: string[] } = {};
  
  Object.entries(horarios).forEach(([day, info]: [string, any]) => {
    if (!info.abierto) return;
    
    const timeRange = `${info.desde}–${info.hasta}`;
    if (!schedule[timeRange]) {
      schedule[timeRange] = [];
    }
    schedule[timeRange].push(dayMap[day]);
  });

  const formatted = Object.entries(schedule).map(([time, days]) => {
    if (days.length === 1) {
      return `${days[0]} ${time}`;
    }
    
    // Detectar rangos consecutivos
    const dayOrder = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const sortedDays = days.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
    
    // Si son consecutivos, mostrar como rango
    let isConsecutive = true;
    for (let i = 1; i < sortedDays.length; i++) {
      const prevIndex = dayOrder.indexOf(sortedDays[i - 1]);
      const currIndex = dayOrder.indexOf(sortedDays[i]);
      if (currIndex !== prevIndex + 1) {
        isConsecutive = false;
        break;
      }
    }
    
    if (isConsecutive && sortedDays.length > 2) {
      return `${sortedDays[0]}–${sortedDays[sortedDays.length - 1]} ${time}`;
    }
    
    return `${sortedDays.join(', ')} ${time}`;
  });

  return formatted.join('; ');
}

export default function BusinessHours({ hours, horarios }: BusinessHoursProps) {
  const [status, setStatus] = useState<BusinessStatus>(getBusinessStatus(horarios));
  const [displayHours, setDisplayHours] = useState<string>('');

  // Actualizar el estado cada minuto
  useEffect(() => {
    const updateStatus = () => {
      setStatus(getBusinessStatus(horarios));
      setDisplayHours(formatHoursDisplay(horarios));
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [horarios]);

  return (
    <div className="space-y-2">
      {/* Estado actual del negocio */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{status.statusIcon}</span>
        <span className={`font-semibold ${status.statusColor}`}>
          {status.statusText}
        </span>
      </div>

      {/* Horario completo */}
      <div className="flex items-start gap-2 text-sm text-gray-600">
        <span className="text-base mt-0.5">🕒</span>
        <div>
          <span className="font-medium">Horario: </span>
          {displayHours || hours || 'No especificado'}
        </div>
      </div>
    </div>
  );
}

// Note: No usamos React.memo aquí porque el componente necesita actualizar cada minuto
