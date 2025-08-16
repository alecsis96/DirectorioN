import React, { useState } from "react";

export default function ReviewSection({ businesses }: any) {
  const [reviews, setReviews] = useState([]);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [selected, setSelected] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (!selected || !text) return;
    setReviews([...reviews, { negocio: selected, texto: text, rating }]);
    setText("");
    setRating(5);
    setSelected("");
  };

  return (
    <div className="my-8">
      <h3 className="text-lg font-bold text-[#38761D] mb-2">Reseñas y calificaciones</h3>
      <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2 mb-4">
        <select value={selected} onChange={e => setSelected(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Selecciona negocio</option>
          {businesses.map((b: any, idx: number) => (
            <option key={idx} value={b.Nombre}>{b.Nombre}</option>
          ))}
        </select>
        <input type="number" min={1} max={5} value={rating} onChange={e => setRating(Number(e.target.value))} className="border rounded px-2 py-1 w-16" />
        <input type="text" value={text} onChange={e => setText(e.target.value)} placeholder="Escribe tu reseña" className="border rounded px-2 py-1 flex-1" />
        <button type="submit" className="bg-[#38761D] text-white px-4 py-1 rounded">Enviar</button>
      </form>
      <div className="space-y-2">
        {reviews.map((r, idx) => (
          <div key={idx} className="bg-gray-50 border rounded p-2">
            <span className="font-semibold">{r.negocio}</span> - {"★".repeat(r.rating)}<br />
            <span>{r.texto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
