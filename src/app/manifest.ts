import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VayuX - Air Quality Intelligence',
    short_name: 'VayuX',
    description: 'Two-Way Weather-Chemistry Coupled Forecasting Platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#06b6d4',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}