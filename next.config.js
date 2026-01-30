/** @type {import('next').NextConfig} */
const nextConfig = {
  // La configuración 'api' solo funciona en Pages Router
  // En App Router, configura el bodyParser por ruta en route.ts con:
  // export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }
  
  images: {
    // Permitir imágenes remotas (fbcdn y otros comunes)
    remotePatterns: [
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.fna.fbcdn.net' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: '**.ggpht.com' },
      { protocol: 'https', hostname: '**.cloudfront.net' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.imgur.com' },
      { protocol: 'https', hostname: '**.pinimg.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'external-content.duckduckgo.com' },
      { protocol: 'https', hostname: 'storage.googleapis.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

module.exports = nextConfig;
