'use client';
/**
 * Dashboard para editar negocios
 * Con nuevo sistema de estados y completitud
 */
import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, signInWithGoogle } from '../firebaseConfig';
import ImageUploader from './ImageUploader';
import LogoUploader from './LogoUploader';
import CoverUploader from './CoverUploader';
import AddressPicker from './AddressPicker';
import PaymentInfo from './PaymentInfo';
import BusinessStatusBanner from './BusinessStatusBanner';
import FeatureUpsell from './FeatureUpsell';
import ScarcityBadge from './ScarcityBadge';
import { BsBank, BsUpload } from 'react-icons/bs';
import { useAuth, canEditBusiness } from '../hooks/useAuth';
import { updateBusinessDetails } from '../app/actions/businesses';
import { requestPublish, updateBusinessWithState } from '../app/actions/businessActions';
import { computeProfileCompletion, updateBusinessState, type BusinessWithState } from '../lib/businessStates';
import type { Business } from '../types/business';
import { YAJALON_COLONIAS } from '../lib/helpers/colonias';

type DaySchedule = { open: boolean; start: string; end: string };
type WeeklySchedule = Record<string, DaySchedule>;

type AddressState = {
  address: string;
  lat: number;
  lng: number;
};

type FormState = {
  name: string;
  category: string;
  address: string;
  colonia: string;
  description: string;
  phone: string;
  WhatsApp: string;
  Facebook: string;
  hours: string;
  openTime: string;
  closeTime: string;
  plan: string;
  hasEnvio: boolean;
  envioCost: string;
  envioInfo: string;
  featured: boolean;
};



const createDefaultSchedule = (): WeeklySchedule => ({
  lunes: { open: true, start: '09:00', end: '18:00' },
  martes: { open: true, start: '09:00', end: '18:00' },
  miercoles: { open: true, start: '09:00', end: '18:00' },
  jueves: { open: true, start: '09:00', end: '18:00' },
  viernes: { open: true, start: '09:00', end: '18:00' },
  sabado: { open: true, start: '09:00', end: '14:00' },
  domingo: { open: false, start: '09:00', end: '18:00' },
});

function parseHours(value?: string) {
  if (!value) return { openTime: '', closeTime: '' };
  const matches = value.match(/([0-2][0-9]:[0-5][0-9])/g);
  if (!matches) return { openTime: '', closeTime: '' };
  const start = matches[0] || '';
  const end = matches.length > 1 ? matches[1] : '';
  return { openTime: start, closeTime: end };
}

const defaultFormState = {
  name: '',
  category: '',
  address: '',
  colonia: '',
  description: '',
  phone: '',
  WhatsApp: '',
  Facebook: '',
  hours: '',
  openTime: '',
  closeTime: '',
  plan: 'free',
  hasEnvio: false,
  envioCost: 'free',
  envioInfo: '',
  featured: false,
};

function mapToFormState(data?: Partial<Business>): FormState {
  if (!data) return { ...defaultFormState };
  const { openTime, closeTime } = parseHours(typeof data.hours === 'string' ? data.hours : undefined);
  return {
    ...defaultFormState,
    name: data.name ?? '',
    category: data.category ?? '',
    address: data.address ?? '',
    colonia: data.colonia ?? '',
    description: data.description ?? '',
    phone: data.phone ?? '',
    WhatsApp: data.WhatsApp ?? '',
    Facebook: data.Facebook ?? '',
    hours: data.hours ?? '',
    openTime,
    closeTime,
    plan: data.plan ?? 'free',
    hasEnvio: data.hasEnvio === true,
    envioCost: (data as any).envioCost ?? 'free',
    envioInfo: (data as any).envioInfo ?? '',
    featured: data.featured === true || data.featured === 'true',
  };
}

function mapToAddressState(data?: Partial<Business>): AddressState {
  return {
    address: data?.address ?? '',
    lat: typeof data?.lat === 'number' ? data.lat : (data?.location?.lat ?? 0),
    lng: typeof data?.lng === 'number' ? data.lng : (data?.location?.lng ?? 0),
  };
}

function mapToScheduleState(data?: Partial<Business>): WeeklySchedule {
  const base = createDefaultSchedule();
  if (!data?.horarios || typeof data.horarios !== 'object') {
    return base;
  }
  const loaded: WeeklySchedule = { ...base };
  Object.entries(base).forEach(([day, fallback]) => {
    const source = data.horarios?.[day as keyof typeof data.horarios];
    if (!source) return;
    loaded[day] = {
      open: source.abierto !== false,
      start: source.desde || fallback.start,
      end: source.hasta || fallback.end,
    };
  });
  return loaded;
}

type DashboardEditorProps = {
  businessId?: string;
  initialBusiness?: Business | null;
};

export default function EditBusiness({ businessId, initialBusiness }: DashboardEditorProps) {
  const router = useRouter();
  const id = businessId;
  const { user, isAdmin, loading: authLoading } = useAuth();

  const normalizedInitial = initialBusiness ?? undefined;

  // Función para comprimir imágenes antes de subirlas
  const compressImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Reducir tamaño si es muy grande
          const maxSize = 1200;
          if (width > maxSize || height > maxSize) {
            if (width > height) {
              height = (height / width) * maxSize;
              width = maxSize;
            } else {
              width = (width / height) * maxSize;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo crear contexto canvas'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Comprimir a JPEG con calidad 0.7 (70%)
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          // Remover el prefijo 'data:image/jpeg;base64,'
          resolve(base64.split(',')[1]);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }, []);

  // Estados de datos del negocio
  const [addr, setAddr] = useState<AddressState>(() => mapToAddressState(normalizedInitial));
  const [biz, setBiz] = useState<Business | null>(normalizedInitial ?? null);
  const [form, setForm] = useState<FormState>(() => mapToFormState(normalizedInitial));
  const [schedule, setSchedule] = useState<WeeklySchedule>(() => mapToScheduleState(normalizedInitial));

  // Estados de UI consolidados
  const [uiState, setUiState] = useState({
    busy: false,
    submitting: false,
    upgradeBusy: false,
    msg: '',
  });

  // Estado para controlar el toast
  const [showToast, setShowToast] = useState(false);

  // Estado para último guardado
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Estado para detectar cambios sin guardar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Estado para errores de validación
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Ref para saber si ya se cargaron los datos iniciales
  const isInitialLoadRef = useRef(true);

  // NUEVO: Estados del sistema de estados dual
  const [businessState, setBusinessState] = useState({
    businessStatus: (biz?.businessStatus as 'draft' | 'in_review' | 'published') || 'draft',
    applicationStatus: (biz?.applicationStatus as 'submitted' | 'needs_info' | 'ready_for_review' | 'approved' | 'rejected') || 'submitted',
    completionPercent: biz?.completionPercent || 0,
    isPublishReady: biz?.isPublishReady || false,
    missingFields: biz?.missingFields || [],
    adminNotes: biz?.adminNotes || '',
    rejectionReason: biz?.rejectionReason || '',
  });

  // NUEVO: Estado para manejar la publicación
  const [publishLoading, setPublishLoading] = useState(false);

  // Sincronizar businessState cuando cambie biz
  useEffect(() => {
    if (biz) {
      setBusinessState({
        businessStatus: (biz.businessStatus as 'draft' | 'in_review' | 'published') || 'draft',
        applicationStatus: (biz.applicationStatus as 'submitted' | 'needs_info' | 'ready_for_review' | 'approved' | 'rejected') || 'submitted',
        completionPercent: biz.completionPercent || 0,
        isPublishReady: biz.isPublishReady || false,
        missingFields: biz.missingFields || [],
        adminNotes: biz.adminNotes || '',
        rejectionReason: biz.rejectionReason || '',
      });
    }
  }, [biz]);

  // Efecto para auto-ocultar toast
  useEffect(() => {
    if (uiState.msg && !uiState.upgradeBusy) {
      setShowToast(true);
      const timer = setTimeout(() => {
        setShowToast(false);
        setTimeout(() => setUiState(prev => ({ ...prev, msg: '' })), 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [uiState.msg, uiState.upgradeBusy]);

  // Detectar cambios en el formulario (solo después de carga inicial)
  useEffect(() => {
    if (!isInitialLoadRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [form, schedule, addr]);

  // Confirmación antes de salir con cambios sin guardar
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Calcular completitud del perfil
  const calculateCompleteness = useCallback(() => {
    if (!biz) return 0;
    let completed = 0;
    const total = 12;

    if (form.name?.trim()) completed++;
    if (form.category) completed++;
    if (form.description?.trim() && form.description.length >= 20) completed++;
    if (form.phone?.trim()) completed++;
    if (form.address?.trim()) completed++;
    if (form.colonia) completed++;
    if (addr.lat && addr.lng) completed++;
    if (form.WhatsApp?.trim()) completed++;
    if (Object.values(schedule).some(h => h.open)) completed++;
    if (biz.images && biz.images.length > 0) completed++;
    if (biz.logoUrl) completed++;
    if (biz.coverUrl) completed++;

    return Math.round((completed / total) * 100);
  }, [form, biz, addr, schedule]);

  // Validar campos requeridos
  const validateForm = useCallback(() => {
    const errors: Record<string, string> = {};
    
    if (!form.name?.trim()) {
      errors.name = 'El nombre es obligatorio';
    }
    if (!form.category) {
      errors.category = 'Selecciona una categoría';
    }
    if (!form.description?.trim() || form.description.length < 20) {
      errors.description = 'La descripción debe tener al menos 20 caracteres';
    }
    if (!form.phone?.trim()) {
      errors.phone = 'El teléfono es obligatorio';
    }
    if (!form.colonia) {
      errors.colonia = 'Selecciona una colonia';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form]);

  // Estados del recibo consolidados
  const [receiptState, setReceiptState] = useState<{
    file: File | null;
    notes: string;
    plan: 'featured' | 'sponsor';
  }>({
    file: null,
    notes: '',
    plan: 'sponsor',
  });

  const applyBusinessData = useCallback((data: Business) => {
    // Marcar que estamos cargando datos (no detectar cambios)
    isInitialLoadRef.current = true;
    
    setBiz(data);
    setForm(mapToFormState(data));
    setAddr(mapToAddressState(data));
    setSchedule(mapToScheduleState(data));
    setHasUnsavedChanges(false);
    
    // Esperar a que los estados se actualicen antes de permitir detección de cambios
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isInitialLoadRef.current = false;
      });
    });
  }, []);

  useEffect(() => {
    if (initialBusiness) {
      applyBusinessData(initialBusiness);
    }
  }, [initialBusiness, applyBusinessData]);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'businesses', id));
        if (!isMounted) return;
        
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as Business;
          applyBusinessData(data);
        } else {
          setUiState(prev => ({ ...prev, msg: 'No encontramos datos para este negocio.' }));
        }
      } catch (error) {
        console.error('Error al cargar negocio:', error);
        if (isMounted) {
          setUiState(prev => ({ ...prev, msg: 'Error al cargar los datos del negocio' }));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id, applyBusinessData]);

  const userCanEdit = canEditBusiness(user, isAdmin, biz);

  const handleAddressChange = useCallback((value: AddressState) => {
    setAddr(value);
    setForm((prev) => ({
      ...prev,
      address: value.address ?? '',
    }));
  }, []);

  async function save() {
    if (!id) return;
    if (!userCanEdit || !user) {
      setUiState(prev => ({ ...prev, msg: 'Necesitas permisos para editar este negocio.' }));
      return;
    }

    setUiState(prev => ({ ...prev, busy: true, msg: 'Guardando...' }));
    try {
      const horarios: Record<string, { abierto: boolean; desde: string; hasta: string }> = {};
      Object.entries(schedule).forEach(([day, hours]) => {
        horarios[day] = {
          abierto: hours.open,
          desde: hours.start,
          hasta: hours.end,
        };
      });

      const hoursArray: string[] = [];
      Object.entries(schedule).forEach(([day, hours]) => {
        const dayLabel = day.charAt(0).toUpperCase() + day.slice(1, 3);
        if (hours.open) {
          hoursArray.push(`${dayLabel} ${hours.start}-${hours.end}`);
        }
      });
      const derivedHours = hoursArray.join('; ');

      const { openTime: _openTime, closeTime: _closeTime, hours: _hours, ...rest } = form;
      const hasCoords = Number.isFinite(addr.lat) && Number.isFinite(addr.lng) && !(addr.lat === 0 && addr.lng === 0);

      const token = await user.getIdToken();
      const payload = {
        ...rest,
        hasEnvio: form.hasEnvio,
        envioCost: form.envioCost,
        envioInfo: form.envioInfo,
        address: addr.address || rest.address || '',
        hours: derivedHours,
        horarios,
        ...(hasCoords ? { lat: addr.lat, lng: addr.lng } : {}),
      };

      const formData = new FormData();
      formData.append('token', token);
      formData.append('updates', JSON.stringify(payload));
      await updateBusinessDetails(id, formData);

      setUiState(prev => ({ ...prev, msg: 'Guardado correctamente.' }));

      const snap = await getDoc(doc(db, 'businesses', id));
      if (snap.exists()) {
        const updatedData = { id: snap.id, ...snap.data() } as Business;
        applyBusinessData(updatedData);
        
        // NUEVO: Actualizar estados del sistema
        if (updatedData.businessStatus || updatedData.applicationStatus) {
          setBusinessState({
            businessStatus: (updatedData.businessStatus as any) || 'draft',
            applicationStatus: (updatedData.applicationStatus as any) || 'submitted',
            completionPercent: updatedData.completionPercent || 0,
            isPublishReady: updatedData.isPublishReady || false,
            missingFields: updatedData.missingFields || [],
            adminNotes: updatedData.adminNotes || '',
            rejectionReason: updatedData.rejectionReason || '',
          });
        }
      }
      
      // Actualizar timestamp de guardado (ya no es necesario setHasUnsavedChanges aquí)
      setLastSaved(new Date());
      
      // Scroll suave hacia arriba
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error al guardar:', error);
      setUiState(prev => ({ ...prev, msg: error instanceof Error ? error.message : 'No pudimos guardar los cambios. Intenta nuevamente.' }));
    } finally {
      setUiState(prev => ({ ...prev, busy: false }));
    }
  }

  // NUEVO: Handler para solicitar publicación con el nuevo sistema
  const handleRequestPublish = async () => {
    if (!id || !biz || !user) return;
    
    setPublishLoading(true);
    try {
      const token = await user.getIdToken();
      const result = await requestPublish(id, token);
      
      if (result.success) {
        setBusinessState(prev => ({
          ...prev,
          businessStatus: 'in_review',
          applicationStatus: 'ready_for_review',
        }));
        
        setUiState(prev => ({ 
          ...prev, 
          msg: '🚀 ¡Solicitud de publicación enviada! Revisaremos tu negocio pronto.' 
        }));
        
        // Recargar datos del negocio
        const snap = await getDoc(doc(db, 'businesses', id));
        if (snap.exists()) {
          const updatedData = { id: snap.id, ...snap.data() } as Business;
          applyBusinessData(updatedData);
        }
      } else {
        setUiState(prev => ({ 
          ...prev, 
          msg: result.error || 'No se pudo enviar la solicitud. Asegúrate de completar todos los campos obligatorios.' 
        }));
      }
    } catch (error) {
      console.error('Error al solicitar publicación:', error);
      setUiState(prev => ({ 
        ...prev, 
        msg: error instanceof Error ? error.message : 'Error al solicitar publicación' 
      }));
    } finally {
      setPublishLoading(false);
    }
  };

  async function submitForReview() {
    if (!id || !userCanEdit || !biz) return;
    if (biz.status !== 'draft' && biz.status !== 'rejected') {
      setUiState(prev => ({ ...prev, msg: 'Este negocio ya esta en revision o publicado.' }));
      return;
    }
    
    // Validar formulario completo
    if (!validateForm()) {
      setUiState(prev => ({ ...prev, msg: 'Por favor completa todos los campos obligatorios marcados con *' }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setUiState(prev => ({ ...prev, submitting: true, msg: 'Enviando a revision...' }));
    try {
      await updateDoc(doc(db, 'businesses', id), {
        status: 'review',
        submittedAt: new Date(),
        ownerId: biz.ownerId,
        ownerEmail: biz.ownerEmail,
      });

      try {
        const token = await user?.getIdToken();
        if (token) {
          await fetch('/api/notify-business-review', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              businessId: id,
              businessName: form.name || biz.name,
            }),
          });
        }
      } catch (notifyError) {
        console.warn('Error al notificar al admin:', notifyError);
      }

      setBiz((prev) => prev ? ({ ...prev, status: 'review' }) : null);
      setUiState(prev => ({ ...prev, msg: 'Negocio enviado a revision. Te notificaremos cuando sea aprobado.' }));
    } catch (error) {
      console.error('Error al enviar a revision:', error);
      setUiState(prev => ({ ...prev, msg: 'Error al enviar. Intenta nuevamente.' }));
    } finally {
      setUiState(prev => ({ ...prev, submitting: false }));
    }
  }

  async function handleUpgradeByTransfer(targetPlan: 'featured' | 'sponsor' = 'sponsor') {
    if (!id || !biz || !user) return;
    if (!receiptState.file) {
      setUiState(prev => ({ ...prev, msg: 'Adjunta tu comprobante de pago.' }));
      return;
    }
    setUiState(prev => ({ ...prev, upgradeBusy: true, msg: 'Procesando y subiendo comprobante...' }));
    try {
      let base64Data: string;
      
      // Si es imagen, comprimir antes de enviar
      if (receiptState.file.type.startsWith('image/')) {
        console.log('[DashboardEditor] Comprimiendo imagen...', { 
          originalSize: receiptState.file.size, 
          type: receiptState.file.type 
        });
        base64Data = await compressImage(receiptState.file);
        const compressedSize = Math.ceil((base64Data.length * 3) / 4);
        console.log('[DashboardEditor] Imagen comprimida', { 
          originalSize: receiptState.file.size, 
          compressedSize,
          reduction: `${((1 - compressedSize / receiptState.file.size) * 100).toFixed(1)}%`
        });
      } else {
        // Para PDFs, convertir directamente
        console.log('[DashboardEditor] Convirtiendo PDF a base64...', { 
          size: receiptState.file.size 
        });
        const buffer = await receiptState.file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }
      
      const token = await user.getIdToken();
      const res = await fetch('/api/businesses/upload-transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: id,
          plan: targetPlan,
          paymentMethod: 'transfer',
          notes: receiptState.notes,
          fileName: receiptState.file.name,
          fileType: receiptState.file.type || 'application/octet-stream',
          fileData: base64Data,
        }),
      });

      const data = await res.json().catch(() => ({ error: 'Error de servidor' }));
      if (!res.ok) {
        if (res.status === 413) {
          throw new Error('El archivo es demasiado grande. Intenta con un archivo más pequeño (máx 3MB).');
        }
        if (res.status === 401) {
          throw new Error('Sesión expirada. Por favor, cierra sesión y vuelve a iniciar.');
        }
        if (res.status === 500) {
          throw new Error('Error del servidor. Intenta de nuevo en unos momentos.');
        }
        throw new Error(data.error || 'No pudimos subir el comprobante');
      }

      setBiz((prev) => prev ? ({
        ...prev,
        planPaymentMethod: 'transfer',
        paymentStatus: (prev.paymentStatus || 'pending') as Business['paymentStatus'],
      }) : null);
      setReceiptState({ file: null, notes: '', plan: 'sponsor' });
      setUiState(prev => ({ ...prev, msg: '✅ Comprobante enviado exitosamente. Validaremos el pago y activaremos tu plan en breve.' }));
      
      // Limpiar mensaje de éxito después de 8 segundos
      setTimeout(() => {
        setUiState(prev => ({ ...prev, msg: '' }));
      }, 8000);
    } catch (error) {
      console.error('transfer upload error', error);
      setUiState(prev => ({ ...prev, msg: error instanceof Error ? error.message : 'No pudimos registrar tu comprobante' }));
    } finally {
      setUiState(prev => ({ ...prev, upgradeBusy: false }));
    }
  }

  if (authLoading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <p className="text-gray-500">Cargando...</p>
      </main>
    );
  }

  return (
    <>
      {/* Toast Notification - Aparece arriba */}
      {showToast && uiState.msg && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 transition-all duration-300 ${
          showToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}>
          <div className={`p-4 rounded-xl shadow-2xl border-2 backdrop-blur-sm ${
            uiState.msg.includes('Error') || uiState.msg.includes('No pudimos') || uiState.msg.includes('demasiado grande') || uiState.msg.includes('expirada') || uiState.msg.includes('servidor')
              ? 'bg-red-50/95 text-red-900 border-red-300'
              : uiState.msg.includes('✅') || uiState.msg.includes('exitosamente') || uiState.msg.includes('Validaremos') || uiState.msg.includes('Guardado')
              ? 'bg-green-50/95 text-green-900 border-green-300'
              : 'bg-blue-50/95 text-blue-900 border-blue-300'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">
                {uiState.msg.includes('Error') ? '❌' : uiState.msg.includes('✅') ? '✅' : 'ℹ️'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{uiState.msg}</p>
              </div>
              <button
                onClick={() => {
                  setShowToast(false);
                  setTimeout(() => setUiState(prev => ({ ...prev, msg: '' })), 300);
                }}
                className="flex-shrink-0 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast para proceso de carga */}
      {uiState.upgradeBusy && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4">
          <div className="p-4 rounded-xl shadow-2xl border-2 bg-blue-50/95 text-blue-900 border-blue-300 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 flex-shrink-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Procesando comprobante...</p>
                <p className="text-xs text-blue-700">Esto puede tardar unos momentos</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Botón flotante de guardar */}
      {biz && userCanEdit && (
        <button
          onClick={save}
          disabled={uiState.busy}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[9999] px-4 sm:px-6 py-3 sm:py-4 bg-[#38761D] text-white rounded-full shadow-2xl hover:bg-[#2d5a15] transition-all hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 sm:gap-3 group"
        >
          {uiState.busy ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white flex-shrink-0"></div>
              <span className="font-semibold text-sm sm:text-base whitespace-nowrap">Guardando...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-semibold text-sm sm:text-base hidden xs:inline whitespace-nowrap">Guardar cambios</span>
              <span className="font-semibold text-sm xs:hidden">Guardar</span>
            </>
          )}
        </button>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-32">
      {!biz ? (
        <p className="text-gray-500">Cargando...</p>
      ) : !userCanEdit ? (
        <p className="text-red-600">No tienes permisos para editar este negocio.</p>
      ) : (
        <>
          {/* Hero */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Editor de negocio</p>
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-gray-900 break-words">{form.name || 'Sin nombre'}</h1>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                    {biz.plan ? biz.plan.toUpperCase() : 'FREE'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Estado: {biz.status || 'draft'}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200 animate-pulse">
                      ● Cambios sin guardar
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-sm text-gray-600">{user?.email || biz.ownerEmail || 'Sesion iniciada'}</p>
                  {lastSaved && !hasUnsavedChanges && (
                    <p className="text-xs text-gray-500">
                      ✓ Guardado hace {Math.round((Date.now() - lastSaved.getTime()) / 60000)} min
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NUEVO: Banner de Estado con Sistema Dual */}
          {biz && businessState && (
            <div className="mb-6">
              <BusinessStatusBanner
                business={{
                  businessStatus: businessState.businessStatus || 'draft',
                  applicationStatus: businessState.applicationStatus || 'submitted',
                  completionPercent: businessState.completionPercent || 0,
                  missingFields: businessState.missingFields || [],
                  isPublishReady: businessState.isPublishReady || false,
                  adminNotes: businessState.adminNotes || '',
                  rejectionReason: businessState.rejectionReason || '',
                }}
                onPublish={handleRequestPublish}
              />
            </div>
          )}
          
          {/* Loading state mientras se carga el negocio */}
          {!biz && !uiState.msg && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-blue-800">Cargando información del negocio...</p>
              </div>
            </div>
          )}

          {/* Información adicional del perfil (mantener para referencia) */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-6">

            <div className="flex flex-wrap gap-2 w-full md:w-auto mt-4">
              <button
                onClick={() => {
                  if (biz.id) {
                    window.open(`/negocios/${biz.id}`, '_blank');
                  }
                }}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-xs sm:text-sm font-medium flex-1 sm:flex-initial"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden sm:inline">Vista previa</span>
                <span className="sm:hidden">Preview</span>
              </button>
              {(biz.status === 'draft' || biz.status === 'rejected') && (
                <button
                  onClick={submitForReview}
                  disabled={uiState.submitting}
                  className="px-3 sm:px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-xs sm:text-sm font-semibold disabled:opacity-60 flex-1 sm:flex-initial"
                >
                  <span className="hidden sm:inline">{uiState.submitting ? 'Enviando...' : 'Enviar a revision'}</span>
                  <span className="sm:hidden">{uiState.submitting ? 'Enviando...' : 'Revisar'}</span>
                </button>
              )}
              <button
                onClick={save}
                disabled={uiState.busy}
                className="px-3 sm:px-4 py-2 bg-[#38761D] text-white rounded-lg hover:bg-[#2d5a15] transition text-xs sm:text-sm font-semibold disabled:opacity-60 flex-1 sm:flex-initial"
              >
                <span className="hidden sm:inline">{uiState.busy ? 'Guardando...' : 'Guardar cambios'}</span>
                <span className="sm:hidden">{uiState.busy ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Principal */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Información básica</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del negocio <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`border rounded-lg px-3 py-2 w-full ${validationErrors.name ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="Nombre del negocio"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoría <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`border rounded-lg px-3 py-2 w-full ${validationErrors.category ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                    >
                      <option value="">Selecciona una categoría</option>
                    <option value="Restaurante">Restaurante</option>
                    <option value="Cafetería">Cafetería</option>
                    <option value="Panadería">Panadería</option>
                    <option value="Comida Rápida">Comida Rápida</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Comercio">Comercio</option>
                    <option value="Tecnología">Tecnología</option>
                    <option value="Salud y Belleza">Salud y Belleza</option>
                    <option value="Educación">Educación</option>
                    <option value="Entretenimiento">Entretenimiento</option>
                    <option value="Deportes">Deportes</option>
                    <option value="Automotriz">Automotriz</option>
                    <option value="Construcción">Construcción</option>
                    <option value="Profesional">Profesional</option>
                    <option value="Otro">Otro</option>
                    </select>
                    {validationErrors.category && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Colonia <span className="text-red-500">*</span>
                    </label>
                    <select
                      className={`border rounded-lg px-3 py-2 w-full ${validationErrors.colonia ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      value={form.colonia}
                      onChange={(e) => setForm({ ...form, colonia: e.target.value })}
                    >
                      <option value="">Selecciona una colonia</option>
                      {YAJALON_COLONIAS.map((colonia) => (
                        <option key={colonia} value={colonia}>
                          {colonia}
                        </option>
                      ))}
                    </select>
                    {validationErrors.colonia && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.colonia}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción <span className="text-red-500">*</span>
                    <span className="text-gray-500 text-xs ml-2">(Mínimo 20 caracteres)</span>
                  </label>
                  <textarea
                    className={`border rounded-lg px-3 py-2 w-full ${validationErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                    rows={3}
                    placeholder="Descripción breve de tu negocio"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {validationErrors.description ? (
                      <p className="text-red-500 text-xs">{validationErrors.description}</p>
                    ) : (
                      <p className="text-gray-500 text-xs">{form.description.length} / 20 caracteres</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Contacto y redes</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono <span className="text-red-500">*</span>
                    </label>
                    <input
                      className={`border rounded-lg px-3 py-2 w-full ${validationErrors.phone ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="9191234567"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                    {validationErrors.phone && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp
                    </label>
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      placeholder="9191234567"
                      value={form.WhatsApp}
                      onChange={(e) => setForm({ ...form, WhatsApp: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Facebook
                    </label>
                    <input
                      className="border border-gray-300 rounded-lg px-3 py-2 w-full"
                      placeholder="https://facebook.com/tunegocio"
                      value={form.Facebook}
                      onChange={(e) => setForm({ ...form, Facebook: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚚</span>
                  <h2 className="text-lg font-semibold text-gray-900">Opciones de envío</h2>
                </div>
                
                <div className="space-y-4">
                  {/* Checkbox principal de envío */}
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={form.hasEnvio}
                      onChange={(e) => {
                        setForm({ 
                          ...form, 
                          hasEnvio: e.target.checked,
                          // Si desactiva envío, resetear campos
                          envioCost: e.target.checked ? form.envioCost : 'free',
                          envioInfo: e.target.checked ? form.envioInfo : ''
                        });
                      }}
                      className="w-5 h-5 text-[#38761D] rounded focus:ring-[#38761D] mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">Ofrezco servicio de envío a domicilio</span>
                      <p className="text-sm text-gray-600 mt-1">Marca esta opción si entregas productos o servicios</p>
                    </div>
                  </label>

                  {/* Opciones adicionales cuando está activado */}
                  {form.hasEnvio && (
                    <div className="ml-8 space-y-4 pl-4 border-l-2 border-emerald-200">
                      {/* Costo de envío */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Costo del envío
                        </label>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="envioCost"
                              value="free"
                              checked={form.envioCost === 'free'}
                              onChange={(e) => setForm({ ...form, envioCost: e.target.value })}
                              className="w-4 h-4 text-[#38761D] focus:ring-[#38761D]"
                            />
                            <span className="text-sm font-medium text-gray-900">🎁 Gratis</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="envioCost"
                              value="paid"
                              checked={form.envioCost === 'paid'}
                              onChange={(e) => setForm({ ...form, envioCost: e.target.value })}
                              className="w-4 h-4 text-[#38761D] focus:ring-[#38761D]"
                            />
                            <span className="text-sm font-medium text-gray-900">💵 Tiene costo</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="envioCost"
                              value="varies"
                              checked={form.envioCost === 'varies'}
                              onChange={(e) => setForm({ ...form, envioCost: e.target.value })}
                              className="w-4 h-4 text-[#38761D] focus:ring-[#38761D]"
                            />
                            <span className="text-sm font-medium text-gray-900">📍 Depende de la ubicación</span>
                          </label>
                        </div>
                      </div>

                      {/* Información adicional del envío */}
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Información adicional (opcional)
                        </label>
                        <textarea
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
                          rows={3}
                          placeholder="Ej: Envío gratis en compras mayores a $500, Costo $30 dentro de la ciudad, Zona de cobertura: centro y colonias cercanas"
                          value={form.envioInfo}
                          onChange={(e) => setForm({ ...form, envioInfo: e.target.value })}
                        />
                        <p className="text-xs text-gray-500">
                          💡 Tip: Menciona zonas de cobertura, tiempo de entrega, o condiciones especiales
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Vista previa */}
                {form.hasEnvio && (
                  <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-900 mb-1">Vista previa para clientes:</p>
                    <div className="flex items-start gap-2 text-sm text-emerald-800">
                      <span className="text-lg">🚚</span>
                      <div>
                        <p className="font-medium">
                          Servicio de envío disponible
                          {form.envioCost === 'free' && ' - Gratis'}
                          {form.envioCost === 'paid' && ' - Con costo'}
                          {form.envioCost === 'varies' && ' - Costo según ubicación'}
                        </p>
                        {form.envioInfo && (
                          <p className="text-xs mt-1 text-emerald-700">{form.envioInfo}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Ubicación</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Escribe tu dirección o referencia. El mapa es opcional.
                    </p>
                  </div>
                </div>
                <AddressPicker value={addr} onChange={handleAddressChange} />
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Horarios</h2>
                
                {/* Acciones rápidas de horarios */}
                <div className="flex flex-wrap gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-900 font-medium w-full mb-1">Acciones rápidas:</p>
                  <button
                    type="button"
                    onClick={() => {
                      const newSchedule = { ...schedule };
                      ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(day => {
                        newSchedule[day] = { open: true, start: '09:00', end: '18:00' };
                      });
                      setSchedule(newSchedule);
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition"
                  >
                    L-V: 9:00-18:00
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const lunesHours = schedule.lunes;
                      const newSchedule = { ...schedule };
                      ['martes', 'miercoles', 'jueves', 'viernes'].forEach(day => {
                        newSchedule[day] = { ...lunesHours };
                      });
                      setSchedule(newSchedule);
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition"
                  >
                    Copiar lunes a L-V
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const lunesHours = schedule.lunes;
                      const newSchedule = { ...schedule };
                      Object.keys(newSchedule).forEach(day => {
                        newSchedule[day] = { ...lunesHours };
                      });
                      setSchedule(newSchedule);
                    }}
                    className="px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition"
                  >
                    Copiar lunes a todos
                  </button>
                </div>

                <div className="overflow-x-auto -mx-2 px-2">
                  <div className="space-y-3 bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200">
                    {Object.entries(schedule).map(([day, hours]) => (
                      <div key={day} className="flex items-center gap-2 sm:gap-3">
                        <div className="w-20 sm:w-24 flex-shrink-0">
                          <label className="flex items-center gap-1 sm:gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={hours.open}
                              onChange={(e) =>
                                setSchedule({
                                  ...schedule,
                                  [day]: { ...hours, open: e.target.checked },
                                })
                              }
                              className="w-4 h-4 text-[#38761D] rounded focus:ring-[#38761D]"
                            />
                            <span className="text-xs sm:text-sm font-medium capitalize">{day}</span>
                          </label>
                        </div>

                        {hours.open ? (
                          <div className="flex gap-1 sm:gap-2 flex-1">
                            <input
                              type="time"
                              value={hours.start}
                              onChange={(e) =>
                                setSchedule({
                                  ...schedule,
                                  [day]: { ...hours, start: e.target.value },
                                })
                              }
                              className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm flex-1 min-w-0"
                            />
                            <span className="text-gray-500 self-center text-xs sm:text-sm">-</span>
                            <input
                              type="time"
                              value={hours.end}
                              onChange={(e) =>
                                setSchedule({
                                  ...schedule,
                                  [day]: { ...hours, end: e.target.value },
                                })
                              }
                              className="border rounded px-1 sm:px-2 py-1 text-xs sm:text-sm flex-1 min-w-0"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Cerrado</span>
                        )}
                      </div>
                    ))}
                    <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-300">
                      Desmarca los dias que permaneces cerrado.
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Galería</h2>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {biz.plan === 'free' ? '📷 Plan Gratuito: Logo + Portada (obligatoria) + Sin galería adicional' :
                     biz.plan === 'featured' ? 'Plan Destacado: Logo + Banner + hasta 2 fotos' : 
                     biz.plan === 'sponsor' ? 'Plan Patrocinado: Logo + Banner + hasta 10 fotos' : 
                     'Galeria de imagenes'}
                  </p>
                  <ImageUploader
                    businessId={id!}
                    images={(biz.images || []).filter((img): img is { url: string; publicId: string } => Boolean(img.url && img.publicId))}
                    onChange={(imgs) => setBiz((b) => b ? ({ ...b, images: imgs }) : null)}
                    plan={biz.plan}
                  />
                </div>
              </div>

              {/* Logo y Banner - Solo para planes Featured y Sponsor */}
              {(biz.plan === 'featured' || biz.plan === 'sponsor') && (
                <>
                  {/* Sección de Logo */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🎨</span>
                      <h2 className="text-lg font-semibold text-gray-900">Logo del negocio</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        biz.plan === 'featured' 
                          ? 'bg-amber-100 text-amber-700 border-amber-300' 
                          : 'bg-purple-100 text-purple-700 border-purple-300'
                      }`}>
                        Incluido en tu plan
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Tu logo aparece en las tarjetas de tu negocio y mejora el reconocimiento de marca
                    </p>
                    <LogoUploader
                      businessId={id!}
                      logoUrl={biz.logoUrl || null}
                      logoPublicId={biz.logoPublicId || null}
                      onChange={(url, publicId) => setBiz((b) => b ? ({ ...b, logoUrl: url, logoPublicId: publicId }) : null)}
                    />
                  </div>

                  {/* Sección de Banner/Cover */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🖼️</span>
                      <h2 className="text-lg font-semibold text-gray-900">Banner de portada</h2>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        biz.plan === 'featured' 
                          ? 'bg-amber-100 text-amber-700 border-amber-300' 
                          : 'bg-purple-100 text-purple-700 border-purple-300'
                      }`}>
                        Incluido en tu plan
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {biz.plan === 'sponsor' 
                        ? 'Banner destacado que aparece en tu tarjeta premium con diseño exclusivo' 
                        : 'Banner que aparece en la parte superior de tu perfil de negocio'}
                    </p>
                    <CoverUploader
                      businessId={id!}
                      coverUrl={biz.coverUrl || null}
                      coverPublicId={biz.coverPublicId || null}
                      onChange={(url, publicId) => setBiz((b) => b ? ({ ...b, coverUrl: url, coverPublicId: publicId }) : null)}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Lateral */}
            <div className="space-y-4">
              {biz.status === 'draft' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 space-y-2">
                  <h3 className="font-semibold text-yellow-900">Borrador</h3>
                  <p className="text-sm text-yellow-800">Completa la informacion y envia a revision para publicar.</p>
                  <button
                    onClick={submitForReview}
                    disabled={uiState.submitting}
                    className="w-full px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition text-sm font-semibold disabled:opacity-60"
                  >
                    {uiState.submitting ? 'Enviando...' : 'Enviar a revision'}
                  </button>
                </div>
              )}

              {/* Sistema avanzado de upgrade con escasez artificial */}
              {biz.plan === 'free' && biz.category && (
                <div className="space-y-6">
                  {/* Badge de escasez mostrando disponibilidad */}
                  <ScarcityBadge 
                    categoryId={biz.category}
                    currentPlan={biz.plan || 'free'}
                    targetPlan="featured"
                    variant="card"
                    showWaitlist={true}
                  />
                  
                  {/* Componente de upsell con features bloqueadas */}
                  <FeatureUpsell 
                    feature="analytics"
                    currentPlan="free"
                    variant="card"
                  />
                  
                  <FeatureUpsell 
                    feature="gallery"
                    currentPlan="free"
                    variant="banner"
                  />
                </div>
              )}

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-4" data-payment-section>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span>💎</span> Planes y precios
                </h3>
                
                <PaymentInfo
                  businessId={id!}
                  plan={biz.plan}
                  nextPaymentDate={biz.nextPaymentDate}
                  lastPaymentDate={biz.lastPaymentDate}
                  paymentStatus={biz.paymentStatus}
                  isActive={biz.isActive}
                  disabledReason={biz.disabledReason}
                />

                {/* Tarjetas de planes con precios */}
                {biz.plan === 'free' && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm text-gray-600 font-medium">Elige el plan perfecto para tu negocio:</p>
                    
                    {/* Plan Destacado */}
                    <div className="relative overflow-hidden border-2 border-blue-300 rounded-xl p-4 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-base sm:text-lg font-bold text-blue-900">⭐ Plan Destacado</h4>
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">POPULAR</span>
                          </div>
                          <p className="text-xs sm:text-sm text-blue-700">Aparece en sección destacada</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-bold text-blue-900">$99</p>
                          <p className="text-[10px] sm:text-xs text-blue-600">por mes</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-sm text-blue-900">
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Aparece en sección destacada del home</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Badge premium dorado</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Hasta 10 imágenes en galería</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Reportes básicos de visitas</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Prioridad en búsquedas</span>
                        </div>
                      </div>
                    </div>

                    {/* Plan Patrocinado */}
                    <div className="relative overflow-hidden border-2 border-purple-400 rounded-xl p-4 bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 hover:shadow-lg transition-shadow">
                      <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                        PREMIUM MAX
                      </div>
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-base sm:text-lg font-bold text-purple-900">🚀 Plan Patrocinado</h4>
                          </div>
                          <p className="text-xs sm:text-sm text-purple-700">Máxima visibilidad garantizada</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-bold text-purple-900">$199</p>
                          <p className="text-[10px] sm:text-xs text-purple-600">por mes</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-sm text-purple-900">
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="font-semibold flex-1">Todo lo del plan Destacado +</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Aparece SIEMPRE en la parte superior</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Badge VIP con animación</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Imágenes ILIMITADAS en galería</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Logo y portada personalizada</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Reportes completos + analíticas avanzadas</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-600 flex-shrink-0">✓</span>
                          <span className="flex-1">Soporte prioritario</span>
                        </div>
                      </div>
                      
                      <div className="mt-3 p-2 bg-white/60 rounded-lg border border-purple-200">
                        <p className="text-[10px] sm:text-xs text-purple-900 font-semibold text-center">
                          🔥 Ideal para negocios que buscan dominar su sector
                        </p>
                      </div>
                    </div>

                    {/* Garantía y beneficios */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-xl">🎁</span>
                        <div className="flex-1 text-xs text-green-900">
                          <p className="font-bold mb-1">✓ Sin permanencia - Cancela cuando quieras</p>
                          <p>✓ Activación inmediata tras validar tu pago</p>
                          <p>✓ Soporte por WhatsApp y email</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-50 text-purple-700 border border-purple-200 inline-block">
                      Pago por transferencia o sucursal
                    </span>
                    <p className="text-xs sm:text-sm text-gray-700">Envía tu comprobante y activaremos el plan al validarlo.</p>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-semibold text-gray-700">
                      Plan a activar
                      <select
                        value={receiptState.plan}
                        onChange={(e) => setReceiptState(prev => ({ ...prev, plan: e.target.value as 'featured' | 'sponsor' }))}
                        className="mt-1 w-full rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        <option value="featured">Destacado</option>
                        <option value="sponsor">Patrocinado</option>
                      </select>
                    </label>

                    <label className="text-xs font-semibold text-gray-700">
                      Comprobante (PDF/JPG/PNG)
                      <span className="ml-1 text-gray-500 font-normal">(Imágenes se comprimen automáticamente)</span>
                      <div className="mt-1 flex flex-col gap-2">
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => setReceiptState(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                          className="text-xs sm:text-sm w-full file:mr-2 sm:file:mr-4 file:py-2 file:px-2 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 file:cursor-pointer"
                        />
                        {receiptState.file && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 sm:p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="flex-1 truncate font-medium break-all">{receiptState.file.name}</span>
                            </div>
                            <div className="flex items-center gap-2 justify-between sm:justify-end flex-shrink-0">
                              <span className="text-emerald-600 font-semibold whitespace-nowrap">{(receiptState.file.size / 1024).toFixed(0)} KB</span>
                              {receiptState.file.type.startsWith('image/') && (
                                <span className="text-emerald-600 text-[10px] whitespace-nowrap">📷 Se comprimirá</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </label>

                    <textarea
                      className="rounded border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      rows={2}
                      placeholder="Notas adicionales (opcional)"
                      value={receiptState.notes}
                      onChange={(e) => setReceiptState(prev => ({ ...prev, notes: e.target.value }))}
                    />

                    <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                      <button
                        onClick={() => handleUpgradeByTransfer(receiptState.plan)}
                        disabled={uiState.upgradeBusy || !receiptState.file}
                        className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 border-2 text-white rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-md hover:shadow-lg"
                      >
                        {uiState.upgradeBusy ? (
                          <>
                            <svg className="animate-spin h-4 w-4 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="whitespace-nowrap">Subiendo...</span>
                          </>
                        ) : (
                          <>
                            <BsBank className="flex-shrink-0" />
                            <span className="hidden sm:inline whitespace-nowrap">Enviar comprobante (transferencia/sucursal)</span>
                            <span className="sm:hidden whitespace-nowrap">Enviar comprobante</span>
                          </>
                        )}
                      </button>
                      {receiptState.file && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 px-2 py-1 bg-gray-50 border border-dashed border-gray-200 rounded w-full sm:w-auto min-w-0">
                          <BsUpload className="flex-shrink-0" />
                          <span className="truncate flex-1 min-w-0">{receiptState.file.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200 rounded-lg p-3 break-words">
                      <p className="font-semibold text-gray-800 mb-2">Datos para transferencia:</p>
                      <div className="space-y-1">
                        <p><span className="font-medium text-gray-700">Entidad:</span> NU MEXICO</p>
                        <p><span className="font-medium text-gray-700">CLABE:</span> <span className="break-all font-mono text-[11px]">638180010198636464</span></p>
                        <p><span className="font-medium text-gray-700">Cuenta:</span> <span className="break-all font-mono text-[11px]">01019863646</span></p>
                        <p><span className="font-medium text-gray-700">Beneficiario:</span> Oscar Alexis Gonzalez Perez</p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="font-medium text-gray-700 mb-1">Envía tu comprobante:</p>
                        <p className="break-words">📧 Email: <span className="break-all font-mono text-[11px] text-blue-600">al36xiz@gmail.com</span></p>
                        <p className="break-words mt-1">📱 WhatsApp: <span className="break-all font-mono text-[11px] text-green-600">+52 919 156 5865</span></p>
                        <p className="mt-2 text-gray-500">Activaremos tu plan al validar el pago.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-5 space-y-3">
                <h3 className="text-base font-semibold text-gray-900">Estado</h3>
                <p className="text-sm text-gray-600">Propietario: {biz.ownerEmail || user?.email || 'Sesion'}</p>
                <p className="text-sm text-gray-600">ID: {biz.id}</p>
                
                {/* Indicador de carga */}
                {uiState.upgradeBusy && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
                    <div className="flex-shrink-0">
                      <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Subiendo comprobante...</p>
                      <p className="text-xs text-blue-700 mt-1">Por favor espera, esto puede tomar unos segundos</p>
                    </div>
                  </div>
                )}
                
                {/* Mensajes de estado */}
                {!uiState.upgradeBusy && uiState.msg && (
                  <div className={`p-4 rounded-lg text-sm font-medium transition-all duration-300 animate-[slideDown_0.3s_ease-out] ${
                    uiState.msg.includes('Error') || uiState.msg.includes('No pudimos') || uiState.msg.includes('demasiado grande') || uiState.msg.includes('expirada') || uiState.msg.includes('servidor')
                      ? 'bg-red-50 text-red-800 border-2 border-red-300 shadow-sm'
                      : uiState.msg.includes('✅') || uiState.msg.includes('exitosamente') || uiState.msg.includes('Validaremos')
                      ? 'bg-green-50 text-green-800 border-2 border-green-300 shadow-sm'
                      : 'bg-blue-50 text-blue-800 border-2 border-blue-300 shadow-sm'
                  }`}>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 text-lg">
                        {uiState.msg.includes('Error') || uiState.msg.includes('No pudimos') ? '❌' : 
                         uiState.msg.includes('✅') || uiState.msg.includes('exitosamente') ? '✅' : 'ℹ️'}
                      </span>
                      <p className="flex-1">{uiState.msg}</p>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => signOut(auth)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                  >
                    Cerrar sesion
                  </button>
                  {(form.plan === 'featured' || form.plan === 'sponsor') && (
                    <button
                      onClick={() => router.push(`/dashboard/${id}/reportes`)}
                      className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                    >
                      Ver reportes
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
    </>
  );
}
