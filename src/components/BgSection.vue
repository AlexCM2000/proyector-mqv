<template>
  <!-- Sección de fondo global en el panel de biblioteca -->
  <div class="bg-section">
    <h3><i class="fas fa-image"></i> Fondo del proyector</h3>

    <!-- Presets: Oscuro / Degradado / Video -->
    <div class="bg-presets">
      <button :class="{ active: bgMode === 'dark' }" @click="$emit('set-preset', 'dark')">
        <i class="fas fa-moon"></i> Oscuro
      </button>
      <button :class="{ active: bgMode === 'gradient' }" @click="$emit('set-preset', 'gradient')">
        <i class="fas fa-water"></i> Degradado
      </button>
      <button :class="{ active: bgMode === 'video' }" @click="$emit('set-preset', 'video')">
        <i class="fas fa-video"></i> Video
      </button>
    </div>

    <!-- Zona de video (visible sólo en modo video) -->
    <div v-if="bgMode === 'video'" class="video-upload-area">
      <!-- Input oculto — disparado por el botón -->
      <input
        type="file"
        accept="video/mp4,video/webm"
        ref="videoInput"
        @change="onFileChange"
        style="display:none"
      />
      <button class="btn-upload-video" @click="$refs.videoInput.click()" :disabled="uploadingVideo">
        <i :class="uploadingVideo ? 'fas fa-spinner fa-spin' : 'fas fa-upload'"></i>
        {{ uploadingVideo ? 'Cargando...' : 'Agregar video' }}
      </button>

      <!-- Lista de videos guardados -->
      <div v-if="bgVideoList.length" class="video-list">
        <div
          v-for="v in bgVideoList"
          :key="v.id"
          class="video-list-item"
          :class="{ active: v.id === activeVideoId }"
        >
          <button class="video-select-btn" @click="$emit('select-video', v.id)" :title="v.name">
            <i class="fas fa-circle-play" v-if="v.id === activeVideoId"></i>
            <i class="fas fa-film" v-else></i>
            <span class="video-item-name">{{ v.name }}</span>
          </button>
          <button class="video-delete-btn" @click="$emit('delete-video', v.id)" title="Eliminar">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <span v-else class="video-hint-empty">Sin videos cargados</span>
    </div>

    <p class="bg-hint">El fondo se mantiene al cambiar canción o slide.</p>
  </div>
</template>

<script>
/**
 * BgSection — Background preset selector and video list manager.
 *
 * Props:
 *   bgMode       {string}        — current mode: 'dark' | 'gradient' | 'video'
 *   bgVideoList  {Array}         — [{ id, name }] list of uploaded videos
 *   activeVideoId {string|null}  — id of the currently active video
 *   uploadingVideo {boolean}     — true while a file upload is in progress
 *
 * Emits:
 *   set-preset(mode)   — user selected a background preset
 *   video-upload(file) — user chose a video file (File object, not the event)
 *   select-video(id)   — user clicked a video in the list
 *   delete-video(id)   — user clicked delete on a video
 */
export default {
  name: 'BgSection',
  props: {
    bgMode:        { type: String,  required: true },
    bgVideoList:   { type: Array,   default: () => [] },
    activeVideoId: { type: String,  default: null },
    uploadingVideo:{ type: Boolean, default: false },
  },
  emits: ['set-preset', 'video-upload', 'select-video', 'delete-video'],
  methods: {
    onFileChange(event) {
      const file = event.target.files[0];
      if (file) this.$emit('video-upload', file);
      // Reset input so the same file can be re-selected if needed
      event.target.value = '';
    },
  },
};
</script>

<style scoped>
.bg-section {
  padding: 0.8rem;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.bg-section h3 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.6rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bg-presets {
  display: flex;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.bg-presets button {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.4rem 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.bg-presets button.active {
  background: rgba(6, 182, 212, 0.15);
  border-color: var(--accent);
  color: var(--accent);
}

.bg-presets button:hover:not(.active) {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-light);
}

.video-upload-area {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}

.btn-upload-video {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  background: var(--bg-card);
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 0.5rem;
  color: var(--text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-upload-video:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(6, 182, 212, 0.06);
}

.btn-upload-video:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Video list */
.video-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.video-list-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 6px;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}

.video-list-item.active {
  border-color: rgba(6, 182, 212, 0.3);
  background: rgba(6, 182, 212, 0.06);
}

.video-select-btn {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0.3rem 0.4rem;
  text-align: left;
  border-radius: 5px;
  transition: color 0.15s;
  font-family: inherit;
  min-width: 0;
}

.video-list-item.active .video-select-btn {
  color: var(--accent);
}

.video-select-btn:hover {
  color: var(--text-light);
}

.video-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
  flex-shrink: 0;
  transition: color 0.15s;
}

.video-delete-btn:hover {
  color: var(--danger);
}

.video-hint-empty {
  font-size: 0.72rem;
  color: var(--text-muted);
  opacity: 0.6;
  text-align: center;
}

.bg-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.3;
}
</style>
