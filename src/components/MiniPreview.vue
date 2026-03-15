<template>
  <!-- Miniatura flotante del proyector — visible sólo cuando el proyector está abierto -->
  <transition name="float-in">
    <div class="preview-float" v-if="visible">

      <!-- Encabezado: título de canción + contador de slide -->
      <div class="preview-float-header">
        <span class="preview-float-title">
          {{ songTitle }}
        </span>
        <span class="preview-float-counter" v-if="totalSlides > 0">
          {{ slideIndex + 1 }} / {{ totalSlides }}
        </span>
      </div>

      <!-- Canvas de la miniatura (16:9) -->
      <div class="mini-projector" :style="bgStyle">
        <!-- Video de fondo en loop -->
        <video
          v-if="bgMode === 'video' && miniVideoUrl"
          class="mini-bg-video"
          :src="miniVideoUrl"
          autoplay
          loop
          muted
          playsinline
        ></video>
        <!-- Texto del slide activo -->
        <div
          v-if="slideHtml"
          class="mini-slide-text"
          v-html="slideHtml"
          :style="{ fontSize: fontSize + 'px' }"
        ></div>
        <!-- Estado vacío -->
        <div v-else class="mini-empty">
          <i class="fas fa-tv"></i>
        </div>
      </div>

      <!-- Controles de navegación -->
      <div class="preview-float-nav">
        <button
          class="preview-nav-btn"
          @click="$emit('prev')"
          :disabled="!canPrev"
          title="Slide anterior"
        ><i class="fas fa-chevron-left"></i></button>
        <button
          class="preview-nav-btn"
          @click="$emit('next')"
          :disabled="!canNext"
          title="Siguiente slide"
        ><i class="fas fa-chevron-right"></i></button>
        <button
          class="preview-nav-btn preview-nav-btn--clear"
          @click="$emit('clear')"
          title="Limpiar proyector"
        ><i class="fas fa-times"></i></button>
        <button
          class="preview-nav-btn preview-nav-btn--open"
          @click="$emit('open-projector')"
          title="Reabrir proyector"
        ><i class="fas fa-external-link-alt"></i></button>
      </div>

    </div>
  </transition>
</template>

<script>
/**
 * MiniPreview — Floating mini projector preview widget.
 *
 * Shows the projector's current state (background + slide text) in a small
 * fixed panel at the bottom-right of the editor. Visible only when the
 * projector window is open.
 *
 * Props:
 *   visible      {boolean}      — show/hide the widget (controlled by projectorOpen)
 *   songTitle    {string}       — title of the song in the projector
 *   slideIndex   {number}       — current slide index (0-based)
 *   totalSlides  {number}       — total number of slides in the current song
 *   slideHtml    {string}       — HTML for the current slide (may contain <br/>)
 *   bgMode       {string}       — 'dark' | 'gradient' | 'video'
 *   miniVideoUrl {string|null}  — blob URL of the active video (for video mode)
 *   fontSize     {number}       — computed font size in px
 *   canPrev      {boolean}
 *   canNext      {boolean}
 *
 * Emits:
 *   prev           — navigate projector to previous slide
 *   next           — navigate projector to next slide
 *   clear          — clear the projector (show blank)
 *   open-projector — reopen or focus the projector window
 */
export default {
  name: 'MiniPreview',
  props: {
    visible:      { type: Boolean, default: false },
    songTitle:    { type: String,  default: 'Proyector vacío' },
    slideIndex:   { type: Number,  default: 0 },
    totalSlides:  { type: Number,  default: 0 },
    slideHtml:    { type: String,  default: '' },
    bgMode:       { type: String,  default: 'dark' },
    miniVideoUrl: { type: String,  default: null },
    fontSize:     { type: Number,  default: 10 },
    canPrev:      { type: Boolean, default: false },
    canNext:      { type: Boolean, default: false },
  },
  emits: ['prev', 'next', 'clear', 'open-projector'],
  computed: {
    bgStyle() {
      if (this.bgMode === 'gradient') {
        return { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #06b6d4 100%)' };
      }
      if (this.bgMode === 'video') {
        return { background: '#000' };
      }
      return { background: 'linear-gradient(180deg, #0f172a 0%, #1e1e2f 100%)' };
    },
  },
};
</script>

<style scoped>
.preview-float {
  position: fixed;
  bottom: 1.2rem;
  right: 1.2rem;
  width: 226px;
  z-index: 200;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  user-select: none;
}

.preview-float-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.45rem 0.6rem;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  gap: 0.4rem;
}

.preview-float-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-float-counter {
  font-size: 0.7rem;
  color: var(--accent);
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.2);
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  flex-shrink: 0;
  font-weight: 600;
}

.mini-projector {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.mini-bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.mini-slide-text {
  position: relative;
  z-index: 1;
  text-align: center;
  color: white;
  font-weight: 700;
  line-height: 1.3;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.9);
  padding: 6px 10px;
  word-break: break-word;
  font-family: "Segoe UI", sans-serif;
  width: 100%;
}

.mini-empty {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.2);
  font-size: 1.2rem;
}

.preview-float-nav {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.5rem;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}

.preview-nav-btn {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-muted);
  border-radius: 6px;
  height: 26px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.72rem;
  padding: 0;
}

.preview-nav-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #0f172a;
  border-color: var(--accent);
}

.preview-nav-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.preview-nav-btn--clear {
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.preview-nav-btn--clear:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.15);
  color: #ef4444;
  border-color: #ef4444;
}

.preview-nav-btn--open {
  color: var(--accent);
  border-color: rgba(6, 182, 212, 0.3);
}

/* Animación de entrada/salida del widget flotante */
.float-in-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.float-in-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.float-in-enter-from,
.float-in-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.97);
}
</style>
