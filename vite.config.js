import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // base './' es requerido para Electron — genera rutas relativas en el build
  // (sin esto, Electron no encuentra los assets al cargar desde file://)
  base: './',
  server: {
    // host: true  ← descomenta para acceso desde otros dispositivos en dev
  },
})
