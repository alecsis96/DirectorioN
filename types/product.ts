export type Product = {
  id: string;
  business_id: string;
  nombre: string;
  precio: number;
  categoria_platillo: string;
  disponibilidad?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type OrderItem = {
  id: string;
  nombre: string;
  precio: number;
  quantity: number;
};

export type ProductsApiResponse = {
  products: Product[];
  error?: string;
};
