import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Эксперт по диагностике РАС', short_name: 'РАС·Эксперт', start_url: '/me', display: 'standalone',
    background_color: '#f5f7f6', theme_color: '#0f6e66', lang: 'ru',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
