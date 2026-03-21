"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildOrderWhatsappUrl,
  formatOrderCurrency,
  sanitizeWhatsappValue,
} from "../lib/orderWhatsApp";
import { trackBusinessInteraction, trackCTA } from "../lib/telemetry";
import type { OrderItem, Product, ProductsApiResponse } from "../types/product";

type Props = {
  businessId: string;
  businessName: string;
  businessCategory?: string;
};

const buildCartKey = (productId: string) => productId;

export default function RestaurantOrderExperience({
  businessId,
  businessName,
  businessCategory,
}: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [cart, setCart] = useState<Record<string, OrderItem>>({});
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setIsLoading(true);
      setError("");
      setProducts([]);
      setOpenCategories([]);
      setCart({});
      setCustomerName("");
      setDeliveryAddress("");
      setCheckoutError("");

      try {
        const response = await fetch(`/api/products/${encodeURIComponent(businessId)}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        const payload = (await response.json()) as ProductsApiResponse;

        if (!response.ok) {
          throw new Error(payload.error || "No pudimos cargar el menu.");
        }

        setProducts(Array.isArray(payload.products) ? payload.products : []);
      } catch (fetchError: any) {
        if (fetchError?.name === "AbortError") return;
        setError(fetchError?.message || "No pudimos cargar el menu.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();
    return () => controller.abort();
  }, [businessId]);

  useEffect(() => {
    if (!isCheckoutOpen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCheckoutOpen]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();

    for (const product of products) {
      const category = sanitizeWhatsappValue(product.categoria_platillo || "General") || "General";
      const bucket = groups.get(category) ?? [];
      bucket.push(product);
      groups.set(category, bucket);
    }

    return Array.from(groups.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }, [products]);

  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const totalItems = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const totalAmount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0),
    [cartItems]
  );

  const checkoutUrl = useMemo(
    () =>
      buildOrderWhatsappUrl({
        restaurantName: businessName,
        items: cartItems,
        customerName,
        deliveryAddress,
      }),
    [businessName, cartItems, customerName, deliveryAddress]
  );

  const toggleCategory = (category: string) => {
    setOpenCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

  const updateQuantity = (product: Product, nextQuantity: number) => {
    const cartKey = buildCartKey(product.id);
    setCheckoutError("");
    setCart((current) => {
      if (nextQuantity <= 0) {
        const nextCart = { ...current };
        delete nextCart[cartKey];
        return nextCart;
      }

      return {
        ...current,
        [cartKey]: {
          id: product.id,
          nombre: product.nombre,
          precio: product.precio,
          quantity: nextQuantity,
        },
      };
    });
  };

  const addToCart = (product: Product) => {
    const currentQuantity = cart[buildCartKey(product.id)]?.quantity ?? 0;
    updateQuantity(product, currentQuantity + 1);
    trackBusinessInteraction(
      "order_item_added" as any,
      businessId,
      businessName,
      businessCategory,
      { productId: product.id, productName: product.nombre }
    );
  };

  const removeFromCart = (product: Product) => {
    const currentQuantity = cart[buildCartKey(product.id)]?.quantity ?? 0;
    updateQuantity(product, currentQuantity - 1);
  };

  const handleOpenCheckout = () => {
    setCheckoutError("");
    setIsCheckoutOpen(true);
  };

  const handleSubmitOrder = () => {
    if (cartItems.length === 0) {
      setCheckoutError("Agrega al menos un producto al carrito.");
      return;
    }
    if (!sanitizeWhatsappValue(customerName)) {
      setCheckoutError("Escribe tu nombre para continuar.");
      return;
    }
    if (!sanitizeWhatsappValue(deliveryAddress)) {
      setCheckoutError("Escribe tu direccion de entrega.");
      return;
    }
    if (!checkoutUrl) {
      setCheckoutError("No pudimos generar el enlace de WhatsApp.");
      return;
    }

    setCheckoutError("");
    trackCTA("whatsapp", businessId, businessName);
    trackBusinessInteraction(
      "order_checkout_clicked" as any,
      businessId,
      businessName,
      businessCategory,
      { totalItems, totalAmount }
    );
    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <section
        id="pedido-section"
        className="rounded-[28px] border border-orange-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
      >
        <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-4 py-5 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
            Menu digital
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Explora el menu por categorias</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                Vista mobile-first con acordeon, acciones tactiles y checkout ligero por WhatsApp.
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {groupedProducts.length} categorias
            </span>
          </div>
        </div>

        <div className="px-3 py-4 sm:px-4">
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5"
                >
                  <div className="h-4 w-40 rounded bg-slate-200" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!isLoading && !error && groupedProducts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <p className="text-base font-semibold text-slate-900">Este negocio aun no tiene productos cargados.</p>
              <p className="mt-2 text-sm text-slate-500">
                Cuando el menu este disponible, aqui aparecera organizado por categorias.
              </p>
            </div>
          )}

          {!isLoading && !error && groupedProducts.length > 0 && (
            <div className="space-y-3">
              {groupedProducts.map(({ category, items }) => {
                const isOpen = openCategories.includes(category);

                return (
                  <section
                    key={category}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-orange-50 active:scale-[0.99]"
                    >
                      <div>
                        <p className="text-base font-semibold text-slate-900">{category}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">
                          {items.length} {items.length === 1 ? "producto" : "productos"}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition ${
                          isOpen ? "rotate-180 bg-orange-100 text-orange-700" : ""
                        }`}
                        aria-hidden="true"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-3 py-3">
                        {items.map((product) => {
                          const quantity = cart[buildCartKey(product.id)]?.quantity ?? 0;

                          return (
                            <article
                              key={product.id}
                              className="rounded-2xl border border-white bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)]"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                  <h3 className="text-base font-semibold text-slate-900">{product.nombre}</h3>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {formatOrderCurrency(product.precio)}
                                  </p>
                                </div>

                                {quantity > 0 ? (
                                  <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50">
                                    <button
                                      type="button"
                                      onClick={() => removeFromCart(product)}
                                      className="px-3 py-2 text-lg font-semibold text-orange-700 transition hover:text-orange-900"
                                      aria-label={`Quitar ${product.nombre}`}
                                    >
                                      -
                                    </button>
                                    <span className="min-w-9 px-2 text-center text-sm font-semibold text-slate-900">
                                      {quantity}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => addToCart(product)}
                                      className="px-3 py-2 text-lg font-semibold text-orange-700 transition hover:text-orange-900"
                                      aria-label={`Agregar ${product.nombre}`}
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => addToCart(product)}
                                    className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98]"
                                  >
                                    Agregar
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {totalItems > 0 && (
        <button
          type="button"
          onClick={handleOpenCheckout}
          className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-between gap-3 rounded-2xl bg-slate-950 px-4 py-4 text-left text-white shadow-[0_20px_40px_rgba(15,23,42,0.35)] transition hover:bg-slate-900 md:inset-x-auto md:right-6 md:min-w-[360px] md:left-auto"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/70">Pedido en curso</p>
            <p className="truncate text-base font-semibold">
              Ver Carrito ({totalItems}) - {formatOrderCurrency(totalAmount)}
            </p>
          </div>
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-orange-500 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </span>
        </button>
      )}

      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setIsCheckoutOpen(false)}
            aria-label="Cerrar checkout"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[80vh] md:w-full md:max-w-xl md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px]">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-600">
                  Checkout
                </p>
                <h3 className="text-lg font-semibold text-slate-900">Resumen del pedido</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Cerrar"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[calc(88vh-73px)] overflow-y-auto px-4 py-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{businessName}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {totalItems} {totalItems === 1 ? "articulo" : "articulos"} seleccionados
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-900">
                    {formatOrderCurrency(totalAmount)}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.nombre}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.quantity} x {formatOrderCurrency(item.precio)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {formatOrderCurrency(item.quantity * item.precio)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">Nombre</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) => {
                      setCustomerName(event.target.value);
                      setCheckoutError("");
                    }}
                    placeholder="Tu nombre"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Direccion de entrega
                  </span>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(event) => {
                      setDeliveryAddress(event.target.value);
                      setCheckoutError("");
                    }}
                    placeholder="Calle, colonia y referencia"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>

                {checkoutError && (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {checkoutError}
                  </p>
                )}

                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">Mensaje listo para WhatsApp</p>
                  <p className="mt-1">
                    Incluye el resumen del pedido, tu nombre y la direccion capturada en este checkout.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-4 py-4">
              <button
                type="button"
                onClick={handleSubmitOrder}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 font-semibold text-white transition hover:bg-[#128C7E]"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Enviar pedido por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
