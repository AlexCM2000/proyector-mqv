<template>
  <!-- Lista de slides con clic para enviar al proyector -->
  <div class="slides-section">
    <h3>
      <i class="fas fa-list"></i> Slides ({{ slides.length }})
    </h3>

    <div v-if="slides.length === 0" class="empty-slides">
      <i class="fas fa-file-alt"></i>
      <p>Escribe la letra arriba y separa los slides con <code>---</code></p>
    </div>

    <ol v-else class="slides-list">
      <li
        v-for="(s, i) in slides"
        :key="i"
        :class="{ 'slide-active': i === activeIndex }"
        @click="$emit('goto', i)"
        :title="'Ir al slide ' + (i + 1)"
      >
        <div class="slide-item">
          <span class="slide-num">{{ i + 1 }}</span>
          <div class="slide-text">{{ uppercase ? s.toUpperCase() : s }}</div>
          <i class="fas fa-arrow-right slide-goto-icon"></i>
        </div>
      </li>
    </ol>
  </div>
</template>

<script>
/**
 * SlidesPreview — Clickable slide list in the editor panel.
 *
 * Renders the parsed slides of the song being edited. Clicking a slide
 * emits 'goto' with the slide index so the parent can send it to the projector.
 *
 * Props:
 *   slides      {string[]} — plain-text slides from parseSlides()
 *   activeIndex {number}   — currently active slide index (highlighted)
 *   uppercase   {boolean}  — whether to display text in uppercase
 *
 * Emits:
 *   goto(index) — user clicked on a slide
 */
export default {
  name: 'SlidesPreview',
  props: {
    slides:      { type: Array,   default: () => [] },
    activeIndex: { type: Number,  default: 0 },
    uppercase:   { type: Boolean, default: false },
  },
  emits: ['goto'],
};
</script>

<style scoped>
.slides-section {
  background: #150d27;
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-left: 3px solid #8b5cf6;
}

.slides-section h3 {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
  color: #a78bfa;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.slides-list {
  list-style: none;
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0;
}

.slides-list::-webkit-scrollbar       { width: 4px; }
.slides-list::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.3);
  border-radius: 2px;
}

.slide-item {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.7rem 0.8rem;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.15);
  background: rgba(139, 92, 246, 0.05);
  transition: all 0.15s;
}

.slide-item:hover {
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.12);
}

li.slide-active .slide-item {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.18);
}

.slide-num {
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  min-width: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 700;
  flex-shrink: 0;
  margin-top: 1px;
}

li.slide-active .slide-num {
  background: #8b5cf6;
  color: #fff;
}

.slide-text {
  font-size: 0.88rem;
  line-height: 1.55;
  white-space: pre-line;
  flex: 1;
  color: #cbd5e1;
}

li.slide-active .slide-text { color: #fff; }

.slide-goto-icon {
  color: var(--text-muted);
  font-size: 0.75rem;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.slide-item:hover .slide-goto-icon {
  opacity: 1;
  color: #a78bfa;
}

.empty-slides {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.empty-slides i    { font-size: 2rem; opacity: 0.3; }
.empty-slides code {
  background: var(--bg-card);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  font-size: 0.85rem;
}
</style>
