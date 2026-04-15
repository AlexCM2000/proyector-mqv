/**
 * Automatic font-size calculation utilities.
 *
 * Note: calcProjectorFontSize() reads window.innerWidth / window.innerHeight
 * and is therefore browser-only (not unit-testable without mocking window).
 */

/** Strips HTML tags for plain-text length measurement. */
function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, '');
}

/**
 * Calculates the optimal font size in px for a single projector slide.
 *
 * Calibración contra el CSS de Projector.vue:
 *   - .slide padding:          2vh 4vw  → availW = vw*0.92, availH = vh*0.96
 *   - .slide-inner line-height: 1.25
 *   - font-family: Segoe UI bold → ancho promedio por carácter ≈ 0.55em
 *   - cap: 240px (permite tamaño máximo en slides cortos)
 *
 * @param {string} slideHtml      - HTML del slide (puede contener <br/>).
 * @param {number} [fontAdjust=0] - Offset manual del usuario (teclas +/-).
 * @returns {number} Tamaño de fuente en px (sin aplicar fontAdjust interno).
 */
export function calcProjectorFontSize(slideHtml, fontAdjust = 0) {
  const lines = (slideHtml || '').split('<br/>').filter(Boolean);
  if (!lines.length) return 80 + fontAdjust;

  const cleanLines = lines.map(stripHtml);
  const maxLen   = Math.max(...cleanLines.map((l) => l.length), 1);
  const numLines = cleanLines.length;

  const vw = window.innerWidth  || 1920;
  const vh = window.innerHeight || 1080;

  // Área útil descontando padding del .slide (4vw c/lado, 2vh c/lado)
  const availW = vw * 0.92;
  const availH = vh * 0.96;

  // Segoe UI Bold ≈ 0.55em por carácter; line-height 1.25 coincide con CSS
  const fromWidth  = availW / (maxLen  * 0.55);
  const fromHeight = availH / (numLines * 1.25);

  // Mín 28px (siempre legible desde lejos), máx 240px
  const base = Math.max(28, Math.min(Math.min(fromWidth, fromHeight), 240));
  return Math.round(base) + fontAdjust;
}

/**
 * Calcula los tamaños de fuente para TODOS los slides de una canción,
 * aplicando suavizado para evitar saltos bruscos entre slides.
 *
 * Estrategia anti-saltos:
 *   1. Calcula el tamaño ideal de cada slide individualmente.
 *   2. Obtiene el mínimo (slide más exigente) como tamaño base de la canción.
 *   3. Cada slide obtiene: min(ideal_propio, base * 1.45)
 *      → el slide más corto no puede superar 1.45× el más largo.
 *      → variación máxima entre slides: 45% (vs cientos de % antes).
 *
 * @param {string[]} slidesHtml   - Array de HTML strings (uno por slide).
 * @param {number}   [fontAdjust=0] - Offset manual acumulado.
 * @returns {number[]} Array con el tamaño en px de cada slide.
 */
export function calcSongFontSizes(slidesHtml, fontAdjust = 0) {
  if (!slidesHtml || !slidesHtml.length) return [];

  // Tamaño ideal de cada slide (sin fontAdjust para poder comparar)
  const ideals = slidesHtml.map((html) => calcProjectorFontSize(html, 0));

  // El slide más exigente marca el techo máximo de variación
  const minIdeal   = Math.min(...ideals);
  const maxAllowed = Math.round(minIdeal * 1.45);

  // Aplica el límite y suma el ajuste manual del usuario
  return ideals.map((size) => Math.min(size, maxAllowed) + fontAdjust);
}

/**
 * Calculates the font size for the mini floating preview widget.
 * Uses a fixed 204 × 115 px box model (widget width minus padding).
 * Clamps result to [7, 26] px.
 *
 * @param {string} slideHtml - HTML string (may contain <br/>).
 * @returns {number} Font size in px.
 */
export function calcMiniPreviewFontSize(slideHtml) {
  const lines = (slideHtml || '').split('<br/>').filter(Boolean);
  if (!lines.length) return 10;

  const cleanLines = lines.map(stripHtml);
  const maxLen  = Math.max(...cleanLines.map((l) => l.length), 1);
  const numLines = cleanLines.length;

  const fromWidth  = (204 * 0.85) / (maxLen  * 0.58);
  const fromHeight = (115 * 0.82) / (numLines * 1.35);

  return Math.max(7, Math.min(Math.min(fromWidth, fromHeight), 26));
}
