# Vue Lyric Projector - Ready

Versión corregida y lista para ejecutar. Incluye @vitejs/plugin-vue y vite.config.js.

## Requisitos
- Node.js v16+ (recomendado)
- npm

## Comandos para levantar el proyecto (en la raíz del proyecto):
```bash
# instalar dependencias (ejecutar una vez)
npm install

# ejecutar en modo desarrollo (Vite)
npm run dev

# construir para producción
npm run build

# previsualizar la build
npm run preview
```

Si quieres exponer la app a tu red (por ejemplo para proyectarla desde otro dispositivo), ejecuta con host:
```bash
# en Linux / macOS / Windows PowerShell
# (habilita acceso en red)
npx vite --host
```

Atajos dentro de la app (pantalla de proyección):
- ArrowRight / ArrowLeft: siguiente / anterior slide
- Espacio: reproducir/pausar auto-advance
- F: fullscreen
- B: blackout
- + / - : aumentar / reducir tamaño de letra

Si al arrancar Vite sigues viendo el error `Install @vitejs/plugin-vue to handle .vue files`, asegúrate de haber corrido `npm install` y que `vite`, `@vitejs/plugin-vue` y `@vue/compiler-sfc` estén en `node_modules`.
