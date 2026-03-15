<template>
  <div class="editor">

    <!-- ── Panel izquierdo: Biblioteca ────────────────────────────── -->
    <aside class="library-panel">
      <div class="panel-header">
        <h2><i class="fas fa-music"></i> Biblioteca</h2>
        <div class="library-actions">
          <button class="icon-btn" @click="newSong" title="Nueva canción/anuncio">
            <i class="fas fa-plus"></i>
          </button>
          <button class="icon-btn" @click="importJson" title="Importar JSON">
            <i class="fas fa-file-import"></i>
          </button>
          <button class="icon-btn" @click="exportJson" title="Exportar JSON">
            <i class="fas fa-file-export"></i>
          </button>
          <button class="icon-btn icon-btn--projector" @click="openProjectorWindow" title="Abrir proyector">
            <i class="fas fa-tv"></i>
          </button>
        </div>
      </div>

      <!-- Buscador -->
      <div class="search-box">
        <i class="fas fa-search"></i>
        <input
          v-model="searchQuery"
          @input="filterSongs"
          placeholder="Buscar título o contenido..."
        />
      </div>

      <!-- Lista de canciones -->
      <ul class="song-list">
        <li
          v-for="s in filteredSongs"
          :key="s.id"
          :class="{ selected: editSong && editSong.id === s.id }"
          @click="select(songs.findIndex((x) => x.id === s.id))"
        >
          <div class="song-item">
            <i class="fas fa-music"    v-if="s.type === 'song'"></i>
            <i class="fas fa-bullhorn" v-else></i>
            <span class="song-title">{{ s.title }}</span>
          </div>
        </li>
        <li v-if="filteredSongs.length === 0" class="empty-list">
          No se encontraron canciones
        </li>
      </ul>

      <!-- Selector de fondo y gestor de videos -->
      <BgSection
        :bgMode="bgMode"
        :bgVideoList="bgVideoList"
        :activeVideoId="activeVideoId"
        :uploadingVideo="uploadingVideo"
        @set-preset="setPreset"
        @video-upload="onVideoUpload"
        @select-video="selectVideo"
        @delete-video="deleteVideo"
      />
    </aside>

    <!-- ── Panel derecho: Editor de canción ───────────────────────── -->
    <main class="editor-panel" v-if="editSong">
      <div class="panel-header">
        <h2>
          <i class="fas fa-edit"></i>
          {{ editSong.id && songs.some(s => s.id === editSong.id) ? "Editar" : "Nueva" }} canción
        </h2>
        <div class="editor-actions">
          <button class="btn primary" @click="save" :disabled="saving">
            <i class="fas fa-save"></i>
            {{ saving ? "Guardando..." : "Guardar" }}
          </button>
          <button class="btn danger" v-if="songs.some(s => s.id === editSong.id)" @click="deleteSong">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn secondary" @click="openProjectorWindow">
            <i class="fas fa-external-link-alt"></i> Abrir proyector
          </button>
        </div>
      </div>

      <!-- Zona de edición (borde cyan) -->
      <div class="edit-zone">
        <div class="zone-label"><i class="fas fa-pen"></i> Editor</div>
        <div class="form-grid">
          <div class="form-group">
            <label><i class="fas fa-heading"></i> Título</label>
            <input v-model="editSong.title" type="text" placeholder="Título de la canción" />
          </div>
          <div class="form-group">
            <label><i class="fas fa-tag"></i> Tipo</label>
            <select v-model="editSong.type">
              <option value="song">Canción</option>
              <option value="announcement">Anuncio</option>
            </select>
          </div>
        </div>
        <div class="form-group full-width">
          <label>
            <i class="fas fa-align-left"></i> Letra
            <span class="label-hint">— separa slides con <code>---</code></span>
          </label>
          <textarea
            v-model="editSong.text"
            rows="10"
            placeholder="Escribe aquí la letra...&#10;&#10;---&#10;&#10;Siguiente slide"
          ></textarea>
        </div>
      </div>

      <!-- Lista de slides (borde violeta) -->
      <SlidesPreview
        :slides="parsedSlides"
        :activeIndex="currentSlideIndex"
        :uppercase="editSong.uppercase || false"
        @goto="gotoFromList"
      />
    </main>

    <!-- Estado vacío cuando no hay canción seleccionada -->
    <main class="editor-panel empty-state" v-else>
      <i class="fas fa-chevron-left"></i>
      <p>Selecciona una canción de la biblioteca<br />o crea una nueva.</p>
    </main>

    <!-- Miniatura flotante del proyector -->
    <MiniPreview
      :visible="projectorOpen"
      :songTitle="projectorSong ? projectorSong.title : 'Proyector vacío'"
      :slideIndex="projectorSlideIndex"
      :totalSlides="projectorParsedSlides.length"
      :slideHtml="projectorSlideHtml"
      :bgMode="bgMode"
      :miniVideoUrl="miniVideoUrl"
      :fontSize="miniPreviewFontSize"
      :canPrev="projectorSlideIndex > 0"
      :canNext="projectorSlideIndex < projectorParsedSlides.length - 1"
      @prev="previewPrev"
      @next="previewNext"
      @clear="clearProjector"
      @open-projector="openProjectorWindow"
    />

    <!-- Notificación de guardado -->
    <transition name="fade">
      <div v-if="showSavedNotification" class="saved-notification">
        <i class="fas fa-check-circle"></i> ¡Guardado!
      </div>
    </transition>

  </div>
</template>

<script>
import sample from '../assets/sample-songs.json';

// Utilidades puras
import { parseSlides, slideToHtml }      from '../utils/slideParser.js';
import { calcMiniPreviewFontSize }       from '../utils/fontSizer.js';

// Servicios de persistencia
import { loadSongs, saveSongs }          from '../services/songStorage.js';
import { loadBgPrefs, saveBgPrefs,
         loadVideoList, saveVideoList }  from '../services/bgStorage.js';
import { readVideoFromDB, saveVideoToDB,
         deleteVideoFromDB }             from '../services/mediaDB.js';

// Canal de comunicación con el proyector
import { createChannel, broadcastSongsUpdated, broadcastUpdateSong,
         broadcastDeleteSong, broadcastBgUpdated,
         broadcastControl, broadcastClear,
         broadcastPing }                 from '../services/broadcastService.js';

// Sub-componentes
import BgSection     from '../components/BgSection.vue';
import MiniPreview   from '../components/MiniPreview.vue';
import SlidesPreview from '../components/SlidesPreview.vue';

export default {
  name: 'EditorView',
  components: { BgSection, MiniPreview, SlidesPreview },

  data() {
    return {
      songs:         [],
      filteredSongs: [],
      searchQuery:   '',
      selectedIndex: null,
      editSong:      null,

      // Fondo global (independiente de la canción)
      bgMode:        'dark',
      bgVideoList:   [],        // [{ id, name }]
      activeVideoId: null,
      uploadingVideo:false,
      miniVideoUrl:  null,      // blob URL del video activo para la miniatura

      bc: null,

      currentSlideIndex:  0,    // selección local en la lista del editor
      projectorSongId:    null, // song que el proyector está mostrando realmente
      projectorSlideIndex:0,    // slide real en el proyector

      saving:               false,
      showSavedNotification:false,
      projectorOpen:        false,
      projectorWindow:      null,
      projectorCheckInterval:null,
    };
  },

  // ── Ciclo de vida ──────────────────────────────────────────────────────────

  beforeUnmount() {
    if (this.projectorCheckInterval) clearInterval(this.projectorCheckInterval);
    if (this.miniVideoUrl) URL.revokeObjectURL(this.miniVideoUrl);
    if (this.bc) this.bc.close();
  },

  created() {
    // Cargar canciones
    const stored = loadSongs();
    if (stored !== null) {
      this.songs = stored;
    } else {
      // Primera vez: sembrar con datos de ejemplo
      this.songs = sample;
      this.persist();
    }
    this.filteredSongs = this.songs.slice(0, 10);

    // Cargar fondo global persistente
    const savedBg = loadBgPrefs();
    if (savedBg.mode !== 'image') {          // ignorar modo antiguo ya eliminado
      this.bgMode       = savedBg.mode;
      this.activeVideoId= savedBg.videoId;
      if (savedBg.mode === 'video' && savedBg.videoId) {
        this.loadMiniVideo(savedBg.videoId);
      }
    }
    this.bgVideoList = loadVideoList();

    // BroadcastChannel — comunicación con la ventana del proyector
    this.bc = createChannel((ev) => {
      const msg = ev.data || {};
      switch (msg.type) {
        case 'request_state':
          // El proyector pide la lista completa de canciones
          if (this.bc) this.bc.postMessage({ type: 'state', songs: this.songs });
          break;
        case 'position':
          // El proyector informa su posición actual
          if (msg.id) {
            const idx = msg.index != null ? msg.index : 0;
            this.projectorSongId    = msg.id;
            this.projectorSlideIndex= idx;
            // Sincroniza el editor sólo si coincide con la canción abierta
            if (this.editSong && msg.id === this.editSong.id) {
              this.currentSlideIndex = idx;
            }
          }
          break;
        case 'pong':
          // El proyector confirma que está abierto (respuesta al ping inicial)
          this.projectorOpen = true;
          break;
        case 'projector_closed':
          this.projectorOpen  = false;
          this.projectorWindow= null;
          break;
      }
    });
    // Ping para detectar si ya hay un proyector abierto de una sesión anterior
    broadcastPing(this.bc);
  },

  // ── Computadas ─────────────────────────────────────────────────────────────

  computed: {
    /** Slides en texto plano de la canción que se está editando. */
    parsedSlides() {
      if (!this.editSong) return [];
      return parseSlides(this.editSong.text);
    },

    /** Canción que el proyector está mostrando actualmente. */
    projectorSong() {
      if (!this.projectorSongId) return null;
      return this.songs.find((s) => s.id === this.projectorSongId) || null;
    },

    /** Slides de la canción activa en el proyector. */
    projectorParsedSlides() {
      if (!this.projectorSong) return [];
      return parseSlides(this.projectorSong.text);
    },

    /** HTML del slide que el proyector está mostrando (para la miniatura). */
    projectorSlideHtml() {
      if (!this.projectorParsedSlides.length) return '';
      const idx  = Math.min(this.projectorSlideIndex, this.projectorParsedSlides.length - 1);
      const text = this.projectorSong?.uppercase
        ? this.projectorParsedSlides[idx].toUpperCase()
        : this.projectorParsedSlides[idx];
      return slideToHtml(text);
    },

    /** Tamaño de fuente óptimo para el canvas de la miniatura (204 × 115 px). */
    miniPreviewFontSize() {
      return calcMiniPreviewFontSize(this.projectorSlideHtml);
    },
  },

  // ── Métodos ────────────────────────────────────────────────────────────────

  methods: {

    // ── Gestión de canciones ────────────────────────────────────────────────

    filterSongs() {
      const q = this.searchQuery.toLowerCase().trim();
      if (!q) { this.filteredSongs = this.songs.slice(0, 10); return; }
      const results = [];
      for (const song of this.songs) {
        if (
          (song.title || '').toLowerCase().includes(q) ||
          (song.text  || '').toLowerCase().includes(q)
        ) results.push(song);
        if (results.length >= 20) break;
      }
      this.filteredSongs = results;
    },

    /** Guarda la lista en localStorage, refresca filtros y notifica al proyector. */
    persist() {
      saveSongs(this.songs);
      this.filterSongs();
      broadcastSongsUpdated(this.bc, this.songs);
    },

    select(idx) {
      this.selectedIndex  = idx;
      this.editSong       = JSON.parse(JSON.stringify(this.songs[idx]));
      this.currentSlideIndex = 0;
      // No enviar al proyector — sólo al hacer clic en un slide concreto
    },

    newSong() {
      this.editSong = {
        id: Date.now().toString(),
        title: 'Nueva canción',
        type: 'song',
        text: '',
        uppercase: false,
      };
      this.selectedIndex    = null;
      this.currentSlideIndex= 0;
    },

    save() {
      this.saving = true;
      const idx = this.songs.findIndex((s) => s.id === this.editSong.id);
      if (idx >= 0) this.songs.splice(idx, 1, this.editSong);
      else          this.songs.push(this.editSong);

      this.persist();
      broadcastUpdateSong(this.bc, this.editSong);

      this.showSavedNotification = true;
      setTimeout(() => { this.showSavedNotification = false; this.saving = false; }, 1500);
    },

    deleteSong() {
      if (!confirm(`¿Eliminar "${this.editSong.title}"?`)) return;
      const deletedId = this.editSong.id;
      this.songs      = this.songs.filter((s) => s.id !== deletedId);
      this.editSong   = null;
      this.selectedIndex = null;
      this.persist();
      broadcastDeleteSong(this.bc, deletedId);
    },

    importJson() {
      const inp   = document.createElement('input');
      inp.type    = 'file';
      inp.accept  = '.json';
      inp.onchange = (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(reader.result);
            this.songs = (Array.isArray(parsed) ? parsed : [parsed]).concat(this.songs);
            this.persist();
          } catch (err) { alert('Error al leer el archivo JSON.'); }
        };
        reader.readAsText(f);
      };
      inp.click();
    },

    exportJson() {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(this.songs, null, 2)], { type: 'application/json' })
      );
      const a   = document.createElement('a');
      a.href    = url;
      a.download= 'canciones.json';
      a.click();
      URL.revokeObjectURL(url);
    },

    // ── Proyector — ventana y navegación ───────────────────────────────────

    openProjectorWindow() {
      const id   = this.editSong ? this.editSong.id : '';
      // Construir URL compatible con hash history (browser y Electron/file://)
      // Toma la parte antes del '#' para no duplicar el hash si ya existe
      const base = window.location.href.split('#')[0];
      const url  = base + '#/projector/' + id + '?bare=1';
      this.projectorWindow = window.open(url, 'lyric-projector', 'width=1280,height=720');
      this.projectorOpen   = true;
      // Polling para detectar cierre de la ventana
      if (this.projectorCheckInterval) clearInterval(this.projectorCheckInterval);
      this.projectorCheckInterval = setInterval(() => {
        if (this.projectorWindow && this.projectorWindow.closed) {
          this.projectorOpen          = false;
          this.projectorWindow        = null;
          this.projectorCheckInterval = null;
          clearInterval(this.projectorCheckInterval);
        }
      }, 600);
    },

    /**
     * Hace clic en un slide de la lista: lo envía al proyector y actualiza
     * la miniatura de inmediato sin esperar la respuesta (actualización optimista).
     */
    gotoFromList(i) {
      this.currentSlideIndex = i;
      if (!this.editSong) return;
      this.projectorSongId    = this.editSong.id;
      this.projectorSlideIndex= i;
      broadcastControl(this.bc, this.editSong.id, 'goto', i);
    },

    clearProjector() {
      broadcastClear(this.bc);
      this.projectorSongId    = null;
      this.projectorSlideIndex= 0;
      this.currentSlideIndex  = 0;
    },

    previewPrev() {
      if (this.projectorSlideIndex > 0) {
        const newIdx = this.projectorSlideIndex - 1;
        this.projectorSlideIndex = newIdx;
        broadcastControl(this.bc, this.projectorSongId, 'goto', newIdx);
      }
    },

    previewNext() {
      if (this.projectorSlideIndex < this.projectorParsedSlides.length - 1) {
        const newIdx = this.projectorSlideIndex + 1;
        this.projectorSlideIndex = newIdx;
        broadcastControl(this.bc, this.projectorSongId, 'goto', newIdx);
      }
    },

    // ── Fondo global ───────────────────────────────────────────────────────

    setPreset(mode) {
      this.bgMode = mode;
      saveBgPrefs({ mode, videoId: this.activeVideoId });
      broadcastBgUpdated(this.bc, mode, this.activeVideoId);
    },

    async onVideoUpload(file) {
      if (!file) return;
      this.uploadingVideo = true;
      try {
        const id     = 'video_' + Date.now();
        const buffer = await file.arrayBuffer();
        await saveVideoToDB(id, buffer);
        this.bgVideoList.push({ id, name: file.name });
        saveVideoList(this.bgVideoList);
        this.selectVideo(id);
      } catch (e) {
        alert('Error al cargar el video.');
      } finally {
        this.uploadingVideo = false;
      }
    },

    selectVideo(id) {
      this.activeVideoId = id;
      this.bgMode        = 'video';
      saveBgPrefs({ mode: 'video', videoId: id });
      broadcastBgUpdated(this.bc, 'video', id);
      this.loadMiniVideo(id);
    },

    async deleteVideo(id) {
      this.bgVideoList = this.bgVideoList.filter((v) => v.id !== id);
      saveVideoList(this.bgVideoList);
      await deleteVideoFromDB(id);

      if (this.activeVideoId === id) {
        if (this.bgVideoList.length > 0) {
          this.selectVideo(this.bgVideoList[0].id);
        } else {
          this.activeVideoId = null;
          this.bgMode        = 'dark';
          saveBgPrefs({ mode: 'dark', videoId: null });
          broadcastBgUpdated(this.bc, 'dark', null);
          if (this.miniVideoUrl) { URL.revokeObjectURL(this.miniVideoUrl); this.miniVideoUrl = null; }
        }
      }
    },

    /** Carga el video activo desde IndexedDB y crea un blob URL para la miniatura. */
    loadMiniVideo(id) {
      if (!id) {
        if (this.miniVideoUrl) { URL.revokeObjectURL(this.miniVideoUrl); this.miniVideoUrl = null; }
        return;
      }
      readVideoFromDB(id).then((buffer) => {
        if (!buffer) return;
        if (this.miniVideoUrl) URL.revokeObjectURL(this.miniVideoUrl);
        this.miniVideoUrl = URL.createObjectURL(new Blob([buffer], { type: 'video/mp4' }));
      }).catch(() => {});
    },
  },
};
</script>

<style scoped>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.editor {
  display: flex;
  height: 100vh;
  background: var(--bg-dark);
  color: var(--text-light);
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
}

/* ── Panel izquierdo ────────────────────────────────────────────── */
.library-panel {
  width: 280px;
  min-width: 240px;
  background: var(--bg-panel);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.8rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.panel-header h2 {
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-light);
}

.library-actions { display: flex; gap: 0.3rem; }

.icon-btn {
  background: none;
  border: 1px solid transparent;
  color: var(--text-muted);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.35rem 0.45rem;
  border-radius: 6px;
  transition: all 0.15s;
}
.icon-btn:hover {
  color: var(--accent);
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.3);
}
.icon-btn--projector {
  color: var(--accent);
  border-color: rgba(6, 182, 212, 0.25);
  background: rgba(6, 182, 212, 0.08);
}
.icon-btn--projector:hover {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--accent);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.search-box i     { color: var(--text-muted); font-size: 0.85rem; }
.search-box input {
  flex: 1;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 0.4rem 0.8rem;
  color: var(--text-light);
  outline: none;
  font-size: 0.85rem;
  transition: border-color 0.2s;
}
.search-box input:focus { border-color: var(--accent); }

.song-list {
  flex: 1;
  list-style: none;
  overflow-y: auto;
  padding: 0.4rem;
}
.song-list::-webkit-scrollbar       { width: 4px; }
.song-list::-webkit-scrollbar-track { background: transparent; }
.song-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

.song-list li {
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
  margin-bottom: 2px;
}
.song-list li:hover         { background: rgba(255, 255, 255, 0.05); }
.song-list li.selected      { background: rgba(6, 182, 212, 0.15); border-left: 3px solid var(--accent); }

.song-item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.7rem;
}
.song-item i { width: 1rem; color: var(--text-muted); font-size: 0.85rem; flex-shrink: 0; }
.song-list li.selected .song-item i { color: var(--accent); }
.song-title { font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.empty-list { padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; }

/* ── Panel derecho ──────────────────────────────────────────────── */
.editor-panel {
  flex: 1;
  background: var(--bg-dark);
  padding: 1.2rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
.editor-panel::-webkit-scrollbar       { width: 5px; }
.editor-panel::-webkit-scrollbar-track { background: transparent; }
.editor-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

.editor-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.editor-panel .panel-header h2 { font-size: 1.1rem; font-weight: 600; }
.editor-actions { display: flex; gap: 0.5rem; align-items: center; }

.btn {
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.15s;
  font-weight: 500;
  font-family: inherit;
}
.btn.primary               { background: var(--accent); color: #0f172a; font-weight: 600; }
.btn.primary:hover:not(:disabled) { background: var(--accent-hover); }
.btn.danger                { background: transparent; color: var(--danger); border: 1px solid rgba(239,68,68,0.4); }
.btn.danger:hover          { background: rgba(239,68,68,0.12); }
.btn.secondary             { background: var(--bg-card); color: var(--text-light); border: 1px solid var(--border); }
.btn.secondary:hover       { background: var(--bg-panel); border-color: var(--accent); }
.btn:disabled              { opacity: 0.4; cursor: not-allowed; }

/* Zona de edición (borde cyan) */
.edit-zone {
  background: #0f2033;
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-left: 3px solid var(--accent);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.zone-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.1rem;
}

.form-grid { display: grid; grid-template-columns: 1fr auto; gap: 0.8rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group label {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.label-hint       { font-weight: 400; opacity: 0.7; font-size: 0.75rem; }
.label-hint code  {
  background: var(--bg-card);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.78rem;
  border: 1px solid var(--border);
}

.form-group input,
.form-group select,
.form-group textarea {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  color: var(--text-light);
  outline: none;
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}
.form-group textarea {
  resize: vertical;
  min-height: 160px;
  line-height: 1.5;
  font-size: 0.85rem;
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.12);
}
.form-group select  { cursor: pointer; }
.form-group.full-width { grid-column: span 2; }

/* Estado vacío */
.editor-panel.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text-muted);
  gap: 1rem;
  text-align: center;
  line-height: 1.6;
}
.editor-panel.empty-state i { font-size: 3rem; opacity: 0.15; }
.editor-panel.empty-state p { font-size: 1rem; }

/* Notificación de guardado */
.saved-notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: var(--success);
  color: #0f172a;
  font-weight: 600;
  padding: 0.7rem 1.4rem;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  z-index: 1000;
  font-size: 0.9rem;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from,   .fade-leave-to     { opacity: 0; transform: translateY(8px); }

/* ── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .editor { flex-direction: column; }
  .library-panel { width: 100%; height: 45vh; border-right: none; border-bottom: 1px solid var(--border); }
  .editor-panel  { height: 55vh; }
  .form-grid     { grid-template-columns: 1fr; }
  .form-group.full-width { grid-column: span 1; }
  .editor-actions { flex-wrap: wrap; }
}
</style>
