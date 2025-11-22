'use client';

import { useState, useEffect } from 'react';
import { FaClock, FaCheckCircle, FaExclamationTriangle, FaHistory, FaCreditCard } from 'react-icons/fa';

interface PaymentRecord {
  id: string;
  amount: number;
  date: string;
  plan: string;
  status: 'success' | 'failed' | 'refunded';
  stripeInvoiceId?: string;
}

interface PaymentInfoProps {
  businessId: string;
  plan?: string;
  nextPaymentDate?: string;
  lastPaymentDate?: string;
  paymentStatus?: string;
  isActive?: boolean;
  disabledReason?: string;
}

export default function PaymentInfo({ 
  businessId, 
  plan = 'free',
  nextPaymentDate,
  lastPaymentDate,
  paymentStatus = 'active',
  isActive = true,
  disabledReason
}: PaymentInfoProps) {
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (plan === 'free') {
      setLoading(false);
      return;
    }

    const fetchPaymentHistory = async () => {
      try {
        const res = await fetch(`/api/payment-history?businessId=${businessId}`);
        if (res.ok) {
          const data = await res.json();
          setPaymentHistory(data.history || []);
        }
      } catch (error) {
        console.error('Error fetching payment history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentHistory();
  }, [businessId, plan]);

  if (plan === 'free') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
          <FaCreditCard />
          Plan Gratuito
        </div>
        <p className="text-sm text-blue-600">
          Estás usando el plan gratuito. Mejora a un plan de pago para obtener más visibilidad y funcionalidades.
        </p>
      </div>
    );
  }

  const getDaysUntilPayment = () => {
    if (!nextPaymentDate) return null;
    const days = Math.ceil((new Date(nextPaymentDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const daysUntil = getDaysUntilPayment();

  if (!isActive) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
          <FaExclamationTriangle />
          Negocio Deshabilitado
        </div>
        <p className="text-sm text-red-600 mb-2">
          Tu negocio ha sido deshabilitado temporalmente.
        </p>
        {disabledReason && (
          <p className="text-sm text-red-700 font-medium">
            Motivo: {disabledReason}
          </p>
        )}
        <p className="text-sm text-red-600 mt-2">
          Por favor, contacta al administrador para resolver esta situación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Estado del pago */}
      <div className={`border rounded-lg p-4 ${
        daysUntil !== null && daysUntil < 0 
          ? 'bg-red-50 border-red-200' 
          : daysUntil !== null && daysUntil <= 7
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FaCreditCard className={
              daysUntil !== null && daysUntil < 0 
                ? 'text-red-600' 
                : daysUntil !== null && daysUntil <= 7
                ? 'text-yellow-600'
                : 'text-green-600'
            } />
            <h3 className="font-semibold text-gray-900">
              Estado de Pago
            </h3>
          </div>
          <span className={`px-3 py-1 text-sm rounded capitalize font-medium ${
            plan === 'sponsor' ? 'bg-purple-100 text-purple-700' :
            plan === 'featured' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            Plan {plan}
          </span>
        </div>

        {nextPaymentDate && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <FaClock className="text-gray-400" />
              <span className="text-gray-700">Próximo pago:</span>
              <span className="font-medium text-gray-900">
                {new Date(nextPaymentDate).toLocaleDateString('es-MX', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>

            {daysUntil !== null && (
              <div className={`font-medium ${
                daysUntil < 0 ? 'text-red-700' :
                daysUntil <= 7 ? 'text-yellow-700' :
                'text-green-700'
              }`}>
                {daysUntil < 0 ? (
                  <>⚠️ Pago vencido hace {Math.abs(daysUntil)} días</>
                ) : daysUntil === 0 ? (
                  <>🔔 El pago vence hoy</>
                ) : daysUntil <= 7 ? (
                  <>⏰ Faltan {daysUntil} días para el vencimiento</>
                ) : (
                  <>✅ Pago al día (vence en {daysUntil} días)</>
                )}
              </div>
            )}
          </div>
        )}

        {lastPaymentDate && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FaCheckCircle className="text-green-500" />
              <span>Último pago:</span>
              <span className="font-medium text-gray-900">
                {new Date(lastPaymentDate).toLocaleDateString('es-MX')}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Historial de pagos */}
      {!loading && paymentHistory.length > 0 && (
        <div className="border rounded-lg p-4 bg-white">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-gray-900 font-semibold hover:text-[#38761D] w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <FaHistory />
              Historial de Pagos ({paymentHistory.length})
            </div>
            <span className="text-2xl">{showHistory ? '−' : '+'}</span>
          </button>

          {showHistory && (
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="border rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        ${payment.amount.toFixed(2)} MXN
                      </div>
                      <div className="text-sm text-gray-600">
                        {new Date(payment.date).toLocaleDateString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="text-xs text-gray-500 capitalize">
                        Plan: {payment.plan}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded font-medium ${
                      payment.status === 'success' ? 'bg-green-100 text-green-700' :
                      payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {payment.status === 'success' ? '✅ Exitoso' :
                       payment.status === 'failed' ? '❌ Fallido' :
                       '🔄 Reembolsado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mensaje de advertencia si está próximo a vencer */}
      {daysUntil !== null && daysUntil >= 0 && daysUntil <= 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">Recordatorio de Pago</p>
              <p>
                Tu próximo pago está próximo a vencer. Asegúrate de tener fondos suficientes 
                en tu método de pago para evitar la interrupción del servicio.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de error si está vencido */}
      {daysUntil !== null && daysUntil < 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <FaExclamationTriangle className="text-red-600 mt-0.5" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">Pago Vencido</p>
              <p>
                Tu pago está vencido. Por favor, actualiza tu método de pago lo antes posible 
                para evitar que tu negocio sea deshabilitado.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
