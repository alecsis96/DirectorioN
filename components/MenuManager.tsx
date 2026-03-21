'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';

import type { Product, ProductsApiResponse } from '../types/product';

type MenuManagerProps = {
  businessId: string;
};

type ProductFormState = {
  nombre: string;
  descripcion: string;
  precio: string;
  categoria_platillo: string;
};

type ProductMutationResponse = {
  product?: Product;
  message?: string;
  error?: string;
};

const INITIAL_FORM_STATE: ProductFormState = {
  nombre: '',
  descripcion: '',
  precio: '',
  categoria_platillo: '',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(amount);

const buildProductsEndpoint = (businessId: string) =>
  `/api/products/business/${encodeURIComponent(businessId)}?includeUnavailable=true`;

async function readJson<T>(response: Response) {
  const raw = await response.text();
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    return {
      response,
      payload: await readJson<T>(response),
    };
  } catch (requestError: any) {
    if (requestError?.name === 'AbortError') {
      throw new Error('La solicitud tardo demasiado. Intenta de nuevo.');
    }

    throw requestError;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export default function MenuManager({ businessId }: MenuManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductFormState>(INITIAL_FORM_STATE);
  const [formError, setFormError] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [busyProductIds, setBusyProductIds] = useState<string[]>([]);

  useEffect(() => {
    let isActive = true;

    if (!businessId) {
      setProducts([]);
      setIsLoading(false);
      setError('No se proporciono un negocio valido.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    async function loadProducts() {
      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(buildProductsEndpoint(businessId), {
          method: 'GET',
          signal: controller.signal,
          cache: 'no-store',
        });
        const payload = await readJson<ProductsApiResponse & { error?: string }>(response);

        if (!response.ok) {
          throw new Error(payload.error || 'No pudimos cargar el menu.');
        }

        setProducts(Array.isArray(payload.products) ? payload.products : []);
      } catch (fetchError: any) {
        if (!isActive) return;

        if (fetchError?.name === 'AbortError') {
          setError('La carga del menu tardo demasiado. Intenta de nuevo.');
          return;
        }

        setError(fetchError?.message || 'No pudimos cargar el menu.');
      } finally {
        window.clearTimeout(timeoutId);

        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [businessId, reloadKey]);

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();

    for (const product of products) {
      const category = product.categoria_platillo?.trim() || 'General';
      const bucket = groups.get(category) ?? [];
      bucket.push(product);
      groups.set(category, bucket);
    }

    return Array.from(groups.entries())
      .map(([category, items]) => ({
        category,
        items: [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
      }))
      .sort((a, b) => a.category.localeCompare(b.category, 'es'));
  }, [products]);

  const totalProducts = products.length;
  const isCatalogInfraError =
    error.includes('catalogo') ||
    error.includes('Firestore') ||
    error.includes('FIREBASE_SERVICE_ACCOUNT');

  const resetModalState = () => {
    setEditingProduct(null);
    setForm(INITIAL_FORM_STATE);
    setFormError('');
  };

  const openCreateModal = () => {
    resetModalState();
    setFeedbackMessage('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setForm({
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: String(product.precio),
      categoria_platillo: product.categoria_platillo,
    });
    setFormError('');
    setFeedbackMessage('');
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = (force = false) => {
    if (isSaving && !force) return;
    setIsModalOpen(false);
    resetModalState();
  };

  const markProductBusy = (productId: string, isBusy: boolean) => {
    setBusyProductIds((current) =>
      isBusy ? [...new Set([...current, productId])] : current.filter((id) => id !== productId)
    );
  };

  const handleToggleAvailability = async (product: Product) => {
    const nextAvailability = !(product.disponibilidad ?? true);

    setFeedbackMessage('');
    setError('');
    markProductBusy(product.id, true);
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? { ...item, disponibilidad: nextAvailability } : item
      )
    );

    try {
      const { response, payload } = await requestJson<ProductMutationResponse>(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ disponibilidad: nextAvailability }),
        }
      );

      if (!response.ok || !payload.product) {
        throw new Error(payload.error || 'No pudimos actualizar la disponibilidad.');
      }

      setProducts((current) =>
        current.map((item) => (item.id === product.id ? payload.product! : item))
      );
      setReloadKey((current) => current + 1);
      setFeedbackMessage(
        nextAvailability
          ? `"${product.nombre}" ahora esta disponible.`
          : `"${product.nombre}" ahora esta oculto del menu.`
      );
    } catch (toggleError: any) {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, disponibilidad: product.disponibilidad ?? true } : item
        )
      );
      setError(toggleError?.message || 'No pudimos actualizar la disponibilidad.');
    } finally {
      markProductBusy(product.id, false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    const confirmed = window.confirm(`Eliminar "${product.nombre}" del menu?`);
    if (!confirmed) return;

    setFeedbackMessage('');
    setError('');
    markProductBusy(product.id, true);

    try {
      const { response, payload } = await requestJson<ProductMutationResponse>(
        `/api/products/${encodeURIComponent(product.id)}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error(payload.error || 'No pudimos eliminar el producto.');
      }

      setProducts((current) => current.filter((item) => item.id !== product.id));
      setReloadKey((current) => current + 1);
      setFeedbackMessage(payload.message || 'Producto eliminado correctamente.');
    } catch (deleteError: any) {
      setError(deleteError?.message || 'No pudimos eliminar el producto.');
    } finally {
      markProductBusy(product.id, false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nombre = form.nombre.trim();
    const descripcion = form.descripcion.trim();
    const categoria_platillo = form.categoria_platillo.trim() || 'General';
    const precio = Number(form.precio);

    if (!nombre || Number.isNaN(precio)) {
      setFormError('Nombre y precio son obligatorios.');
      return;
    }

    setIsSaving(true);
    setFormError('');
    setError('');
    setFeedbackMessage('');

    const payload = {
      business_id: businessId,
      nombre,
      descripcion,
      precio,
      categoria_platillo,
    };

    const endpoint = editingProduct
      ? `/api/products/${encodeURIComponent(editingProduct.id)}`
      : '/api/products';
    const method = editingProduct ? 'PUT' : 'POST';

    try {
      const { response, payload: data } = await requestJson<ProductMutationResponse>(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok || !data.product) {
        throw new Error(data.error || 'No pudimos guardar el producto.');
      }

      setProducts((current) => {
        if (editingProduct) {
          return current.map((item) => (item.id === data.product!.id ? data.product! : item));
        }

        return [data.product!, ...current];
      });

      setFeedbackMessage(
        editingProduct
          ? `"${data.product.nombre}" fue actualizado.`
          : `"${data.product.nombre}" fue agregado al menu.`
      );
      setReloadKey((current) => current + 1);
      closeModal(true);
    } catch (submitError: any) {
      setFormError(submitError?.message || 'No pudimos guardar el producto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
              Menu del negocio
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-900">Administrador de platillos</h2>
            <p className="mt-2 text-sm text-gray-600">
              Agrega, edita, oculta o elimina productos del menu sin recargar la pagina.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
              {totalProducts} {totalProducts === 1 ? 'platillo' : 'platillos'}
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 active:scale-[0.99]"
            >
              Agregar Nuevo Platillo
            </button>
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {feedbackMessage}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p className="font-semibold text-amber-900">
            {isCatalogInfraError ? 'El catalogo de productos no esta disponible.' : 'No pudimos cargar el menu actual.'}
          </p>
          <p className="mt-1">{error}</p>
          <p className="mt-2 text-amber-900/80">
            {isCatalogInfraError
              ? 'Si esto pasa en produccion, configura FIREBASE_SERVICE_ACCOUNT y valida los permisos de Firestore.'
              : 'Puedes reintentar la carga o crear tu primer producto si este negocio aun no tiene menu.'}
          </p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-3 inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Reintentar carga
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-4 h-16 rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      ) : !error && groupedProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-2xl">
            Menu
          </div>
          <h3 className="mt-4 text-lg font-semibold text-gray-900">Todavia no hay platillos</h3>
          <p className="mt-2 text-sm text-gray-600">
            Comienza agregando productos para construir el menu visible en el perfil del negocio.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Crear primer platillo
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedProducts.map(({ category, items }) => (
            <section
              key={category}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                <h3 className="text-lg font-semibold text-gray-900">{category}</h3>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-gray-400">
                  {items.length} {items.length === 1 ? 'producto' : 'productos'}
                </p>
              </div>

              <div className="divide-y divide-gray-100">
                {items.map((product) => {
                  const isBusy = busyProductIds.includes(product.id);
                  const isAvailable = product.disponibilidad ?? true;

                  return (
                    <article
                      key={product.id}
                      className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-base font-semibold text-gray-900">
                            {product.nombre}
                          </h4>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              isAvailable
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {isAvailable ? 'Disponible' : 'Oculto'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-medium text-gray-600">
                          {formatCurrency(product.precio)}
                        </p>
                        {product.descripcion && (
                          <p className="mt-2 text-sm leading-relaxed text-gray-500">
                            {product.descripcion}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(product)}
                          disabled={isBusy}
                          className={`relative inline-flex h-7 w-14 items-center rounded-full transition ${
                            isAvailable ? 'bg-emerald-500' : 'bg-gray-300'
                          } ${isBusy ? 'cursor-not-allowed opacity-60' : ''}`}
                          aria-label={`Cambiar disponibilidad de ${product.nombre}`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                              isAvailable ? 'translate-x-8' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={isBusy}
                            className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 p-0 sm:items-center sm:p-4">
          <button
            type="button"
            onClick={() => closeModal()}
            className="absolute inset-0 cursor-default"
            aria-label="Cerrar modal"
          />

          <div className="relative z-10 w-full rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
                    {editingProduct ? 'Editar producto' : 'Nuevo producto'}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold text-gray-900">
                    {editingProduct ? editingProduct.nombre : 'Agregar platillo'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => closeModal()}
                  disabled={isSaving}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</span>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, nombre: event.target.value }))
                  }
                  placeholder="Ej. Hamburguesa clasica"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Descripcion o detalles</span>
                <textarea
                  value={form.descripcion}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, descripcion: event.target.value }))
                  }
                  rows={3}
                  placeholder="Ej. Incluye papas y refresco de 355 ml"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Precio</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.precio}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, precio: event.target.value }))
                  }
                  placeholder="0.00"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-gray-700">Categoria</span>
                <input
                  type="text"
                  value={form.categoria_platillo}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      categoria_platillo: event.target.value,
                    }))
                  }
                  placeholder="Ej. Bebidas, Postres, Entradas"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </label>

              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving
                    ? 'Guardando...'
                    : editingProduct
                      ? 'Guardar cambios'
                      : 'Crear platillo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

