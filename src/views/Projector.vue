<template>
  <div class="projector" ref="root">

    <!-- Fondo sólido o degradado -->
    <div class="bg" :style="bgStyle"></div>

    <!-- Video de fondo en loop (sólo en modo video) -->
    <video
      v-if="globalBg.mode === 'video' && bgVideoUrl"
      class="bg-video"
      :src="bgVideoUrl"
      autoplay
      loop
      muted
      playsinline
    ></video>

    <!-- Slide activo con transición secuencial (sale → entra sin solapamiento) -->
    <div class="slide-wrap" v-if="slides.length">
      <transition name="proj-fade" mode="out-in">
        <div
          class="slide"
          :key="index"
          :style="{ fontSize: (slideFontSizes[index] || 80) + 'px' }"
        >
          <div class="slide-inner" v-html="slides[index]"></div>
        </div>
      </transition>
    </div>

    <!-- Pantalla en blanco — hint sutil cuando no hay canción (sólo fuera de bare mode) -->
    <div v-if="!slides.length && !bareMode" class="no-song">
      <i class="fas fa-circle-dot"></i>
      <p>Proyector listo</p>
    </div>

    <!-- Contador de slides (esquina inferior derecha) -->
    <div class="slide-counter" v-if="!bareMode && slides.length">
      <span>{{ index + 1 }} / {{ slides.length }}</span>
      <span v-if="playing" class="playing-dot"><i class="fas fa-play"></i></span>
    </div>

    <!-- Overlay de apagado (tecla B) -->
    <transition name="blackout-fade">
      <div v-if="blackoutMode" class="blackout-overlay">
        <i class="fas fa-eye-slash"></i>
      </div>
    </transition>

  </div>
</template>

<script>
// Utilidades puras
import { parseSlides, slideToHtml }   from '../utils/slideParser.js';
import { calcSongFontSizes }          from '../utils/fontSizer.js';

// Servicios de persistencia
import { loadSongs }                  from '../services/songStorage.js';
import { loadBgPrefs, saveBgPrefs }   from '../services/bgStorage.js';
import { readVideoFromDB }            from '../services/mediaDB.js';

// Canal de comunicación con el editor
import { createChannel, broadcastPong, broadcastPosition,
         broadcastProjectorClosed,
         broadcastState }             from '../services/broadcastService.js';

export default {
  name: 'ProjectorView',
  props: ['id'],

  data() {
    return {
      allSongs:    [],
      song:        null,
      slides:      [],   // strings HTML (con <br/>) listos para v-html
      index:       0,
      playing:     false,
      timer:       null,
      fontAdjust:  0,    // offset manual acumulado con las teclas +/-
      blackoutMode:false,
      bc:          null,
      bareMode:    false,
      globalBg:    { mode: 'dark' },
      bgVideoUrl:  null, // blob URL del video activo
    };
  },

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  created() {
    // Detectar modo bare (?bare=1) — sin hints, pantalla limpia
    // Usamos $route.query porque con hash history los query params van dentro
    // del hash y window.location.search queda vacío en Electron
    this.bareMode = this.$route?.query?.bare === '1';

    // Restaurar fondo global
    const savedBg = loadBgPrefs();
    this.globalBg = { mode: savedBg.mode };
    if (savedBg.mode === 'video' && savedBg.videoId) {
      this.loadBgVideo(savedBg.videoId);
    }

    // Cargar lista de canciones
    this.allSongs = loadSongs() || [];
    this.selectSongById(this.id);

    // BroadcastChannel — recibe comandos del editor
    this.bc = createChannel((ev) => {
      const msg = ev.data || {};
      switch (msg.type) {

        case 'update_song':
          this.handleUpdateSong(msg.song);
          break;

        case 'delete_song':
          this.handleDeleteSong(msg.id);
          break;

        case 'songs_updated':
          this.handleSongsUpdated(msg.songs);
          break;

        case 'state':
          // El editor envió la lista completa de canciones
          this.allSongs = msg.songs || [];
          if (this.song) {
            const updated = this.allSongs.find((s) => s.id === this.song.id);
            if (updated) {
              const oldIdx = this.index;
              this.song    = { ...updated };
              this.prepareSlides();
              this.index   = Math.min(oldIdx, Math.max(0, this.slides.length - 1));
            } else {
              this.song   = null;
              this.slides = [];
            }
          }
          break;

        case 'bg_updated':
          this.globalBg = { mode: msg.mode || 'dark' };
          saveBgPrefs({ mode: msg.mode, videoId: msg.videoId });
          if (msg.mode === 'video') {
            this.loadBgVideo(msg.videoId);
          } else {
            if (this.bgVideoUrl) { URL.revokeObjectURL(this.bgVideoUrl); this.bgVideoUrl = null; }
          }
          break;

        case 'control':
          // Si el targetId es diferente a la canción cargada, cargarla primero
          if (msg.targetId && (!this.song || this.song.id !== msg.targetId)) {
            const target = this.allSongs.find((s) => s.id === msg.targetId);
            if (!target) break;
            this.song = { ...target };
            this.prepareSlides();
            this.fontAdjust = 0;
          }
          if      (msg.action === 'next') this.next();
          else if (msg.action === 'prev') this.prev();
          else if (msg.action === 'goto' && typeof msg.index === 'number') {
            if (msg.index >= 0 && msg.index < this.slides.length) {
              this.index = msg.index;
              this.reportPosition();
            }
          }
          break;

        case 'request_state':
          broadcastState(this.bc, this.allSongs);
          break;

        case 'clear':
          this.song   = null;
          this.slides = [];
          this.index  = 0;
          break;

        case 'ping':
          // El editor pregunta si el proyector está abierto
          broadcastPong(this.bc);
          break;
      }
    });

    // Anunciar al editor que esta ventana acaba de abrirse
    broadcastState(this.bc, this.allSongs);
    broadcastPong(this.bc);

    window.addEventListener('keydown', this.onKey);
  },

  mounted() {
    if (!this.bareMode) return;

    // Bare mode: pantalla completa al primer clic + ocultar cursor tras inactividad
    const requestFullscreen = () => {
      try {
        if (this.$refs.root?.requestFullscreen) this.$refs.root.requestFullscreen();
      } catch (e) {}
    };
    window.addEventListener('click', requestFullscreen, { once: true });

    let hideTimer = null;
    const hideCursor = () => (document.documentElement.style.cursor = 'none');
    const showCursor = () => (document.documentElement.style.cursor = '');
    const resetHide  = () => {
      showCursor();
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(hideCursor, 2000);
    };
    window.addEventListener('mousemove', resetHide);
    resetHide();
  },

  beforeUnmount() {
    window.removeEventListener('keydown', this.onKey);
    if (this.timer) clearInterval(this.timer);
    if (this.bgVideoUrl) URL.revokeObjectURL(this.bgVideoUrl);
    broadcastProjectorClosed(this.bc);
    if (this.bc) this.bc.close();
  },

  // ── Computadas ─────────────────────────────────────────────────────────────

  computed: {

    /**
     * Tamaños de fuente por slide con suavizado anti-saltos.
     * Recalcula cuando cambia slides[], fontAdjust, o el índice activo.
     */
    slideFontSizes() {
      return calcSongFontSizes(this.slides, this.fontAdjust);
    },

    bgStyle() {
      if (this.blackoutMode) return { background: '#000' };
      const { mode } = this.globalBg;
      if (mode === 'gradient')
        return { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #06b6d4 100%)' };
      if (mode === 'video')
        return { background: '#000' }; // el <video> cubre el fondo
      return { background: 'linear-gradient(180deg, #0f172a 0%, #1e1e2f 100%)' };
    },
  },

  // ── Métodos ────────────────────────────────────────────────────────────────

  methods: {

    // ── Video de fondo ──────────────────────────────────────────────────────

    /** Carga el video desde IndexedDB y crea un blob URL local para este tab. */
    loadBgVideo(videoId) {
      if (!videoId) return;
      readVideoFromDB(videoId).then((buffer) => {
        if (!buffer) return;
        if (this.bgVideoUrl) URL.revokeObjectURL(this.bgVideoUrl);
        this.bgVideoUrl = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' }));
      }).catch(() => {});
    },

    // ── Gestión de canción activa ───────────────────────────────────────────

    selectSongById(id) {
      const found = this.allSongs.find((s) => s.id === id);
      if (found) this.setCurrentSong(found);
      else { this.song = null; this.slides = []; }
    },

    setCurrentSong(song) {
      this.song       = { ...song };
      this.prepareSlides();
      this.index      = 0;
      this.fontAdjust = 0;
      this.reportPosition();
    },

    /** Convierte song.text en el array this.slides (strings HTML con <br/>). */
    prepareSlides() {
      this.slides = [];
      if (!this.song) return;
      const plain = parseSlides(this.song.text, this.song.uppercase);
      this.slides = plain.map(slideToHtml);
    },

    handleUpdateSong(updatedSong) {
      const idx = this.allSongs.findIndex((s) => s.id === updatedSong.id);
      if (idx >= 0) this.allSongs.splice(idx, 1, updatedSong);
      else          this.allSongs.push(updatedSong);

      if (this.song && this.song.id === updatedSong.id) {
        const oldIndex = this.index;
        this.song = { ...updatedSong };
        this.prepareSlides();
        this.index = Math.min(oldIndex, Math.max(0, this.slides.length - 1));
        this.reportPosition();
      }
    },

    handleDeleteSong(id) {
      this.allSongs = this.allSongs.filter((s) => s.id !== id);
      if (this.song && this.song.id === id) { this.song = null; this.slides = []; }
    },

    handleSongsUpdated(newSongs) {
      this.allSongs = newSongs || [];
      if (this.song) {
        const stillThere = this.allSongs.find((s) => s.id === this.song.id);
        if (stillThere) {
          const oldIndex = this.index;
          this.song = { ...stillThere };
          this.prepareSlides();
          this.index = Math.min(oldIndex, Math.max(0, this.slides.length - 1));
        } else {
          // La canción activa fue eliminada — quedarse en blanco
          this.song   = null;
          this.slides = [];
        }
      }
    },

    // ── Navegación de slides ───────────────────────────────────────────────

    next() {
      if (this.index < this.slides.length - 1) { this.index++; this.reportPosition(); }
    },

    prev() {
      if (this.index > 0) { this.index--; this.reportPosition(); }
    },

    reportPosition() {
      if (this.song) broadcastPosition(this.bc, this.song.id, this.index);
    },

    // ── Controles de pantalla ──────────────────────────────────────────────

    toggleFull() {
      const el = this.$refs.root;
      if (!document.fullscreenElement) el.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
    },

    blackout() { this.blackoutMode = !this.blackoutMode; },

    /**
     * Atajos de teclado:
     *   →/↓       siguiente slide
     *   ←/↑       slide anterior
     *   Espacio   reproducción automática (4 s/slide)
     *   +/=       aumentar tamaño de fuente (+4 px)
     *   -         reducir tamaño de fuente (-4 px, mín -60)
     *   0         resetear tamaño de fuente
     *   B         apagar/encender pantalla (blackout)
     *   F         pantalla completa
     */
    onKey(e) {
      if      (e.key === 'ArrowRight' || e.key === 'ArrowDown')  this.next();
      else if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')    this.prev();
      else if (e.key === ' ') {
        e.preventDefault();
        if (this.playing) {
          clearInterval(this.timer); this.timer = null; this.playing = false;
        } else {
          this.playing = true;
          this.timer   = setInterval(() => {
            if (this.index < this.slides.length - 1) { this.index++; this.reportPosition(); }
            else { clearInterval(this.timer); this.timer = null; this.playing = false; }
          }, 4000);
        }
      }
      else if (e.key === '+' || e.key === '=') this.fontAdjust += 4;
      else if (e.key === '-')  this.fontAdjust = Math.max(-60, this.fontAdjust - 4);
      else if (e.key === '0')  this.fontAdjust = 0;
      else if (e.key.toLowerCase() === 'b') this.blackout();
      else if (e.key.toLowerCase() === 'f') this.toggleFull();
    },
  },
};
</script>

<style scoped>
:root, html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #0f172a;
}

.projector {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fondo con transición suave al cambiar modo */
.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-size: cover;
  background-position: center;
  transition: background 1s ease;
}

/* Video de fondo en loop */
.bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 1;
}

/* Contenedor de slides centrado */
.slide-wrap {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Un solo slide visible a la vez */
.slide {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 2vh 4vw;
  box-sizing: border-box;
  position: absolute;
}

/* Transición secuencial: primero sale el slide anterior, luego entra el nuevo */
.proj-fade-leave-active { transition: opacity 0.2s ease; }
.proj-fade-enter-active { transition: opacity 0.4s ease; }
.proj-fade-enter-from,
.proj-fade-leave-to     { opacity: 0; }

.slide-inner {
  text-align: center;
  text-shadow: 0 2px 20px rgba(0,0,0,0.9), 0 1px 6px rgba(0,0,0,0.8);
  line-height: 1.25;
  font-weight: 700;
  color: #ffffff;
  word-break: break-word;
  width: 100%;
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  letter-spacing: 0.02em;
}

/* Hint cuando el proyector está vacío (no en bare mode) */
.no-song {
  position: relative;
  z-index: 2;
  text-align: center;
  color: rgba(255, 255, 255, 0.18);
  font-size: 0.95rem;
  font-family: "Segoe UI", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  letter-spacing: 0.05em;
}
.no-song i { font-size: 1rem; opacity: 0.5; animation: pulse 2.5s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 0.6; }
}

/* Contador de slides (esquina inferior derecha) */
.slide-counter {
  position: fixed;
  bottom: 1.2rem;
  right: 1.5rem;
  z-index: 10;
  background: rgba(0,0,0,0.55);
  color: rgba(255,255,255,0.75);
  padding: 0.3rem 0.9rem;
  border-radius: 20px;
  font-size: 0.85rem;
  font-family: "Segoe UI", sans-serif;
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.playing-dot { color: #06b6d4; font-size: 0.7rem; }

/* Overlay de apagado */
.blackout-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.15);
  font-size: 4rem;
}
.blackout-fade-enter-active,
.blackout-fade-leave-active { transition: opacity 0.4s ease; }
.blackout-fade-enter-from,
.blackout-fade-leave-to     { opacity: 0; }
</style>
