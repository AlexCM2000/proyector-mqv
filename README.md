# Proyector MQV

Proyector de letras para presentaciones. Permite mostrar slides de canciones o anuncios en una segunda pantalla desde un editor web, con soporte de fondo en video, transiciones y control en tiempo real.

---

## Requisitos de desarrollo

- **Node.js v20+** (recomendado v20 LTS)
- **npm v10+**
- Conexión a internet solo para el primer `npm install` (descarga Electron ~142 MB)

---

## Comandos principales

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Modo desarrollo en navegador (Vite dev server)
npm run dev

# 3. Probar como app de escritorio (sin generar instalador)
npm run electron:dev

# 4. Generar el ZIP distribuible para Windows
npm run dist
```

---

## Atajos de teclado — ventana del Proyector

| Tecla | Acción |
|-------|--------|
| `→` / `↓` | Siguiente slide |
| `←` / `↑` | Slide anterior |
| `Espacio` | Auto-avance (4 s/slide) |
| `+` / `-` | Aumentar / reducir tamaño de letra |
| `0` | Restablecer tamaño de letra |
| `F` | Pantalla completa |
| `B` | Blackout (apagar pantalla) |
| `F5` / `Ctrl+R` | Recargar ventana |

---

## Cómo se configuró Electron

La app corre como aplicación de escritorio con **Electron**. A continuación se explica qué se hizo y por qué, para que puedas entenderlo o replicarlo.

### Archivos clave de Electron

| Archivo | Propósito |
|---|---|
| `electron/main.js` | Proceso principal: abre la ventana del editor y gestiona la ventana del proyector |
| `vite.config.js` | `base: './'` — genera rutas relativas para que funcione con `file://` |
| `src/main.js` | `createWebHashHistory()` — el router usa el hash (`#`) en vez de rutas del servidor |

### Por qué esos cambios fueron necesarios

**1. `base: './'` en Vite**
Sin esto, Vite genera rutas absolutas (`/assets/index.js`). En Electron la app se carga desde `file:///ruta/dist/index.html` y las rutas absolutas no funcionan. Con `base: './'` las rutas son relativas y funcionan en cualquier ubicación.

**2. `createWebHashHistory()` en el router**
`createWebHistory()` requiere un servidor HTTP para manejar rutas como `/projector/123`. Con `file://` el servidor no existe. `createWebHashHistory()` pone todo después del `#` (ej: `index.html#/projector/123`) y funciona sin servidor.

**3. URL del proyector construida desde `window.location.href`**
El editor abre el proyector con `window.open()`. La URL se construye así:
```js
const base = window.location.href.split('#')[0]
const url  = base + '#/projector/' + id + '?bare=1'
// → file:///ruta/dist/index.html#/projector/123?bare=1
```
Esto funciona tanto en el navegador como en Electron.

**4. `this.$route.query.bare` en el Proyector**
Con hash history, `window.location.search` queda vacío. El parámetro `?bare=1` viaja dentro del hash, así que se lee desde Vue Router: `this.$route.query.bare`.

**5. `setWindowOpenHandler` en el proceso principal**
Electron bloquea `window.open()` por seguridad. `setWindowOpenHandler` lo permite explícitamente y configura la ventana del proyector (sin barra de menú, tamaño específico).

**6. `signAndEditExecutable: false`**
Deshabilita la firma del ejecutable. Sin esto, `electron-builder` intenta descargar y usar `winCodeSign`, que falla en Windows sin permisos de Modo Desarrollador.

---

## Cómo generar una nueva versión distribuible

Sigue estos pasos cada vez que hagas cambios y quieras un nuevo `.zip` para distribuir:

### Paso 1 — Hacer los cambios en el código

Edita los archivos en `src/` normalmente.

### Paso 2 — Probar que funciona

```bash
npm run electron:dev
```

Esto hace un build y abre la app en Electron. Verifica que todo funcione correctamente antes de distribuir.

### Paso 3 — Subir los cambios a GitHub

```bash
git add .
git commit -m "descripción del cambio"
git push
```

### Paso 4 — Generar el ZIP

```bash
npm run dist
```

El archivo queda en:
```
release/Proyector MQV-X.X.X-win.zip
```

### Paso 5 — Distribuir

Comparte el `.zip` por USB, Google Drive, WhatsApp, etc.

En la PC de destino:
1. Extraer el `.zip` en cualquier carpeta
2. Ejecutar `Proyector MQV.exe`
3. No requiere instalar Node.js ni ningún programa adicional

---

## Estructura del proyecto

```
├── electron/
│   └── main.js          ← Proceso principal de Electron
├── src/
│   ├── main.js          ← Entrada de Vue (router con hash history)
│   ├── styles.css       ← Variables CSS globales + reset
│   ├── views/
│   │   ├── Editor.vue   ← Interfaz del editor (panel izquierdo + derecho)
│   │   └── Projector.vue← Pantalla del proyector
│   ├── components/
│   │   ├── BgSection.vue    ← Selector de fondo y gestor de videos
│   │   ├── MiniPreview.vue  ← Miniatura flotante del proyector
│   │   └── SlidesPreview.vue← Lista de slides con clic-para-proyectar
│   ├── services/
│   │   ├── broadcastService.js ← BroadcastChannel (comunicación entre ventanas)
│   │   ├── mediaDB.js          ← IndexedDB (almacenamiento de videos)
│   │   ├── bgStorage.js        ← localStorage para preferencias de fondo
│   │   └── songStorage.js      ← localStorage para canciones
│   └── utils/
│       ├── storageKeys.js  ← Claves de localStorage/IndexedDB centralizadas
│       ├── slideParser.js  ← Parseo de texto a slides (función pura)
│       └── fontSizer.js    ← Cálculo automático de tamaño de fuente
├── dist/                ← Build de Vite (generado, no editar)
├── release/             ← ZIP distribuible (generado, no subir a git)
├── vite.config.js       ← Configuración de Vite (base: './' requerido)
└── package.json         ← Scripts y configuración de electron-builder
```

---

## Separación de datos (persistencia)

| Dato | Dónde se guarda | Clave |
|---|---|---|
| Canciones | localStorage | `lyric_songs_v1` |
| Modo de fondo + video activo | localStorage | `lyric_bg_v1` |
| Lista de videos (nombre + id) | localStorage | `lyric_bg_videos` |
| Archivos de video (.mp4) | IndexedDB | `lyric_projector_db` → store `media` |

> Los datos se guardan por perfil de Windows. Si distribuyes el `.zip` a otra PC, las canciones y videos no se transfieren — cada instalación empieza limpia.
