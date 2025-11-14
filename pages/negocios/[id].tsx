import Link from "next/link";
import Head from "next/head";
import type { GetServerSideProps, NextPage } from "next";
import { fetchBusinesses } from "../../lib/server/businessData";
import BusinessDetailView from "../../components/BusinessDetailView";
import type { Business } from "../../types/business";

interface PageProps {
  business: Business;
}

const BusinessDetailPage: NextPage<PageProps> = ({ business }) => {
  const ldLocalBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    address: business.address,
    telephone: business.phone || undefined,
    priceRange: business.price || "MXN",
    ...(business.WhatsApp ? { contactPoint: [{ "@type": "ContactPoint", contactType: "WhatsApp", telephone: business.WhatsApp }] } : {}),
    ...(typeof business.rating === "number" && business.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: business.rating.toFixed(1),
            reviewCount: 1,
          },
        }
      : {}),
  };

  return (
    <>
      <Head>
        <title>{business.name} | Directorio Yajalon</title>
        <meta
          name="description"
          content={`Informacion de ${business.name}. Conoce su galeria, contacto, resenas y ubicacion en Yajalon.`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldLocalBusiness) }}
        />
      </Head>
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 text-gray-800">
        <section className="max-w-5xl mx-auto px-6 py-10 space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/negocios"
              aria-label="Volver al directorio"
              className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full transition hover:bg-[#38761D]/10 hover:text-[#2f5a1a]"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                &larr;
              </span>
              <span>Directorio</span>
            </Link>
            <span className="text-xs text-gray-500">ID: {business.id}</span>
          </div>
          <BusinessDetailView business={business} />
        </section>
      </main>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params }) => {
  const rawId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params?.id[0] : "";
  const id = decodeURIComponent(rawId || "");
  if (!id) return { notFound: true };

  const businesses = await fetchBusinesses();
  const business = businesses.find((item) => item.id === id);
  if (!business) return { notFound: true };

  return {
    props: {
      business,
    },
  };
};

export default BusinessDetailPage;

