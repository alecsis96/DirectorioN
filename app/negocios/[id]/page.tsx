import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import BusinessDetailView from '../../../components/BusinessDetailView';
import type { Business } from '../../../types/business';
import { getAdminFirestore } from '../../../lib/server/firebaseAdmin';
import { fetchBusinesses } from '../../../lib/server/businessData';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function fetchBusinessById(id: string): Promise<Business | null> {
  const db = getAdminFirestore();
  const snapshot = await db.doc(`businesses/${id}`).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data() as Business & { status?: string };
  if (data.status && data.status !== 'approved' && data.status !== 'draft') return null;
  return { id, ...JSON.parse(JSON.stringify(data)) };
}

export async function generateStaticParams() {
  const db = getAdminFirestore();
  const snapshot = await db.collection('businesses').where('status', '==', 'approved').get();
  return snapshot.docs.map((doc) => ({ id: doc.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const business = await fetchBusinessById(decodedId);
  if (!business) {
    return {
      title: 'Negocio no encontrado',
      description: 'Este negocio no está disponible.',
    };
  }
  const images =
    business.images?.map((item) => item?.url).filter((url): url is string => Boolean(url)) || [];

  return {
    title: `${business.name} | Directorio Yajalon`,
    description:
      business.description ||
      `Información de ${business.name}. Conoce su galería, contacto, reseñas y ubicación en Yajalón.`,
    openGraph: {
      title: `${business.name} | Directorio Yajalon`,
      description:
        business.description ||
        `Información de ${business.name}. Conoce su galería, contacto, reseñas y ubicación en Yajalón.`,
      ...(images.length ? { images } : {}),
    },
  };
}

export default async function BusinessDetailAppPage({ params }: PageProps) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  let business = await fetchBusinessById(decodedId);
  if (!business) {
    const all = await fetchBusinesses();
    const fallback = all.find((item) => item.id === decodedId);
    business = fallback ?? null;
  }
  if (!business) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800">
      <section className="max-w-5xl mx-auto px-6 py-10 pb-24 md:pb-10 space-y-6">
        <BusinessDetailView business={business} />
      </section>
    </main>
  );
}
