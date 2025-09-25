import React, { useState } from "react";

export default function RegisterForm() {
  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    ubicacion: "",
    horario: "",
    categoria: "",
    precio: "",
    descripcion: "",
    contacto: ""
  });
  const [enviado, setEnviado] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEnviado(true);
    // Aquí podrías enviar el formulario a tu correo o Google Sheet
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-[#38761D] mb-4">¿Quieres registrar tu negocio?</h3>
      {enviado ? (
        <div className="text-green-700 font-semibold">¡Solicitud enviada! Nos pondremos en contacto contigo.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre del negocio" className="border rounded px-3 py-2 w-full" required />
          <input type="text" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" className="border rounded px-3 py-2 w-full" required />
          <input type="text" name="ubicacion" value={form.ubicacion} onChange={handleChange} placeholder="Ubicación" className="border rounded px-3 py-2 w-full" required />
          <input type="text" name="horario" value={form.horario} onChange={handleChange} placeholder="Horario" className="border rounded px-3 py-2 w-full" />
          <input type="text" name="categoria" value={form.categoria} onChange={handleChange} placeholder="Categoría" className="border rounded px-3 py-2 w-full" />
          <input type="text" name="precio" value={form.precio} onChange={handleChange} placeholder="Precio" className="border rounded px-3 py-2 w-full" />
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} placeholder="Descripción" className="border rounded px-3 py-2 w-full" />
          <input type="text" name="contacto" value={form.contacto} onChange={handleChange} placeholder="Correo o WhatsApp de contacto" className="border rounded px-3 py-2 w-full" />
          <button type="submit" className="bg-[#38761D] text-white px-4 py-2 rounded w-full">Enviar solicitud</button>
        </form>
      )}
    </div>
  );
}

