import React, { useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';

interface SubmitResponse {
  ok: boolean;
  submitted?: boolean;
  notified?: boolean;
}

export default function BusinessOnboardingForm() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState({
    businessName: '',
    category: '',
    whatsapp: '',
    address: '',
    description: '',
  });
  const [statusMsg, setStatusMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const adminWhats = process.env.NEXT_PUBLIC_ADMIN_WHATSAPP || '';

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.uid) {
      setStatusMsg('Debes iniciar sesión con Google para enviar la solicitud.');
      return;
    }

    const summary =
      `Solicitud de publicación\n` +
      `Nombre negocio: ${form.businessName}\nCategoría: ${form.category}\nDirección: ${form.address}\nWhatsApp: ${form.whatsapp}\n` +
      `Descripción: ${form.description}\nUsuario: ${user.email}`;

    setStatusMsg('Enviando solicitud...');
    setSubmitting(true);

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/businesses/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mode: 'application',
          formData: {
            businessName: form.businessName,
            category: form.category,
            whatsapp: form.whatsapp,
            address: form.address,
            description: form.description,
            email: user.email || '',
            displayName: user.displayName || '',
          },
        }),
      });
      const result: SubmitResponse | null = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error((result as any)?.error || 'Error en el servidor');
      }

      if (result?.submitted) {
        const msg = encodeURIComponent(summary);
        const phone = adminWhats.replace(/[^0-9]/g, '');
        if (phone) {
          window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
        }
        setStatusMsg(
          result.notified
            ? '¡Solicitud enviada! Nuestro equipo ya fue notificado.'
            : '¡Solicitud enviada! Te contactaremos por WhatsApp.'
        );
      } else {
        setStatusMsg('Progreso guardado.');
      }
    } catch (error) {
      console.error(error);
      setStatusMsg('Error al enviar la solicitud. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <input
        className="border rounded px-3 py-2"
        placeholder="Nombre del negocio"
        required
        value={form.businessName}
        onChange={(e) => setForm({ ...form, businessName: e.target.value })}
      />
      <input
        className="border rounded px-3 py-2"
        placeholder="Categoría"
        required
        value={form.category}
        onChange={(e) => setForm({ ...form, category: e.target.value })}
      />
      <input
        className="border rounded px-3 py-2"
        placeholder="WhatsApp"
        value={form.whatsapp}
        onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
      />
      <input
        className="border rounded px-3 py-2 md:col-span-2"
        placeholder="Dirección"
        value={form.address}
        onChange={(e) => setForm({ ...form, address: e.target.value })}
      />
      <textarea
        className="border rounded px-3 py-2 md:col-span-2"
        placeholder="Descripción"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <div className="md:col-span-2 flex items-center gap-2">
        <button
          type="submit"
          className="px-4 py-2 bg-[#38761D] text-white rounded"
          disabled={submitting}
        >
          {submitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
        <span className="text-sm text-gray-600">{statusMsg}</span>
      </div>
    </form>
  );
}
