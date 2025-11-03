/**
 * Formulario simplificado de registro público de negocios
 * Solo solicita datos mínimos: dueño, negocio y contacto básico
 * La solicitud se guarda en 'applications' con status 'pending'
 */
import React, { useState } from "react";
import { auth, db, signInWithGoogle } from "../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Categorías predefinidas para el selector
const CATEGORIAS = [
  "Restaurante",
  "Cafetería",
  "Tienda",
  "Servicios",
  "Belleza y spa",
  "Tecnología",
  "Educación",
  "Salud",
  "Entretenimiento",
  "Otro"
];

export default function RegisterForm() {
  // Estado del formulario con campos mínimos
  const [form, setForm] = useState({
    ownerName: "",
    ownerEmail: "",
    businessName: "",
    category: "",
    phone: "",
    WhatsApp: ""
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);

  // Detectar usuario autenticado
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Pre-llenar campos si el usuario ya está autenticado
        setForm(prev => ({
          ...prev,
          ownerName: currentUser.displayName || prev.ownerName,
          ownerEmail: currentUser.email || prev.ownerEmail
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  // Manejar cambios en los campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Validar formulario antes de enviar
  const validateForm = (): boolean => {
    if (!form.ownerName.trim()) {
      setError("El nombre del propietario es requerido");
      return false;
    }
    if (!form.ownerEmail.trim() || !form.ownerEmail.includes('@')) {
      setError("Se requiere un email válido");
      return false;
    }
    if (!form.businessName.trim()) {
      setError("El nombre del negocio es requerido");
      return false;
    }
    if (!form.phone.trim() && !form.WhatsApp.trim()) {
      setError("Debes proporcionar al menos un teléfono o WhatsApp");
      return false;
    }
    return true;
  };

  // Enviar solicitud a Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validar campos
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Crear documento en la colección 'applications'
      const applicationData = {
        // Información del dueño
        uid: user?.uid || null,
        ownerId: user?.uid || null,
        
        // Datos del formulario
        formData: {
          ownerName: form.ownerName.trim(),
          ownerEmail: form.ownerEmail.trim().toLowerCase(),
          businessName: form.businessName.trim(),
          category: form.category || "Otro",
          phone: form.phone.trim(),
          whatsapp: form.WhatsApp.trim(),
        },
        
        // Estado y metadatos
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Guardar en Firestore
      await addDoc(collection(db, "applications"), applicationData);

      // Éxito: limpiar formulario y mostrar mensaje
      setSuccess(true);
      setForm({
        ownerName: user?.displayName || "",
        ownerEmail: user?.email || "",
        businessName: "",
        category: "",
        phone: "",
        WhatsApp: ""
      });

      // Ocultar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(false), 5000);

    } catch (err: any) {
      console.error("Error al enviar solicitud:", err);
      setError("Hubo un error al enviar tu solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <h3 className="text-2xl font-bold text-[#38761D] mb-2">
        ¿Quieres registrar tu negocio?
      </h3>
      <p className="text-gray-600 text-sm mb-4">
        Completa estos datos básicos y nos pondremos en contacto contigo
      </p>

      {/* Mensaje de éxito */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          ✅ ¡Solicitud enviada correctamente! Nos pondremos en contacto pronto.
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {/* Botón de inicio de sesión opcional */}
      {!user && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800 mb-2">
            💡 Inicia sesión para acelerar el proceso
          </p>
          <button
            type="button"
            onClick={signInWithGoogle}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
          >
            Iniciar sesión con Google
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nombre del propietario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu nombre <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="ownerName"
            value={form.ownerName}
            onChange={handleChange}
            placeholder="Ej: Juan Pérez"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Email del propietario */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tu email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="ownerEmail"
            value={form.ownerEmail}
            onChange={handleChange}
            placeholder="Ej: juan@email.com"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Nombre del negocio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del negocio <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            placeholder="Ej: Restaurante El Sabor"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría (opcional)
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            disabled={loading}
          >
            <option value="">Selecciona una categoría</option>
            {CATEGORIAS.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Ej: 9991234567"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            disabled={loading}
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            type="tel"
            name="WhatsApp"
            value={form.WhatsApp}
            onChange={handleChange}
            placeholder="Ej: 5219991234567"
            className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:ring-2 focus:ring-[#38761D] focus:border-transparent"
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            Incluye código de país: 521 + número
          </p>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#38761D] hover:bg-green-700"
          }`}
        >
          {loading ? "Enviando..." : "Enviar solicitud"}
        </button>
      </form>

      <p className="text-xs text-gray-500 text-center mt-4">
        Al enviar, aceptas que nos comuniquemos contigo para verificar tu negocio
      </p>
    </div>
  );
}

