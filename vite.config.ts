
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vercel上のAPI_KEYをブラウザ側のprocess.env.API_KEYとして利用可能にする
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
});
