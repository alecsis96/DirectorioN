/**
 * 🎨 Utilidades de colores para niveles de urgencia
 * Función pura, safe para cliente y servidor
 */

export function getUrgencyColor(urgency: 'none' | 'low' | 'medium' | 'high' | 'critical'): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  const colors = {
    none: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      icon: '✅',
    },
    low: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      text: 'text-blue-800',
      icon: 'ℹ️',
    },
    medium: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-800',
      icon: '⚠️',
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-400',
      text: 'text-orange-900',
      icon: '🔥',
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-500',
      text: 'text-red-900',
      icon: '🚨',
    },
  };
  
  return colors[urgency];
}
