import { normalizeDigits } from "./helpers/contact";
import type { OrderItem } from "../types/product";

export const ORDER_CENTER_WHATSAPP =
  process.env.NEXT_PUBLIC_ORDER_WHATSAPP_NUMBER?.trim() || "5219191565865";

export const formatOrderCurrency = (amount: number) =>
  `$${Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2)}`;

export const sanitizeWhatsappValue = (value: string) =>
  value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function buildOrderWhatsappUrl({
  phone = ORDER_CENTER_WHATSAPP,
  restaurantName,
  items,
  customerName,
  deliveryAddress,
}: {
  phone?: string;
  restaurantName: string;
  items: OrderItem[];
  customerName: string;
  deliveryAddress: string;
}) {
  const normalizedPhone = normalizeDigits(phone);
  if (!normalizedPhone || items.length === 0) return "";

  const totalAmount = items.reduce((sum, item) => sum + item.precio * item.quantity, 0);
  const orderLines = items.flatMap((item) => [
    `${item.quantity}x ${item.nombre} (${formatOrderCurrency(item.quantity * item.precio)})`,
    "",
  ]);

  const message = [
    `Hola YajaGon, quiero hacer un pedido de: ${sanitizeWhatsappValue(restaurantName)}`,
    "",
    "Mi orden:",
    "",
    ...orderLines,
    `Total: ${formatOrderCurrency(totalAmount)}`,
    "",
    "Mis datos:",
    `Nombre: ${sanitizeWhatsappValue(customerName)}`,
    `Direccion: ${sanitizeWhatsappValue(deliveryAddress)}`,
  ].join("\n");

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
