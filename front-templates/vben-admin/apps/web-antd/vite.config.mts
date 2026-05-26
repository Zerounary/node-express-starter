import { defineConfig } from '@vben/vite-config';
import path from 'node:path';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      base: './',
      resolve: {
        alias: {
          '@shared': path.resolve(__dirname, '../../../../shared'),
        },
      },
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            // target: 'http://localhost:5320/api',
            target: 'http://localhost:80/api',
            ws: true,
          },
        },
      },
    },
  };
});
