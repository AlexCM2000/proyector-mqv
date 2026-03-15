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
 * Calculates the optimal font size in px for a full-screen projector slide.
 * Accounts for viewport size and slide content length/line count.
 *
 * Calibración contra el CSS de Projector.vue:
 *   - .slide padding:    5vh 8vw  → availW = vw*0.84, availH = vh*0.90
 *   - .slide-inner line-height: 1.25  → factor de altura por línea = 1.25
 *   - font-family: Segoe UI bold → ancho promedio por carácter ≈ 0.52em
 *   - max cap 220px: permite texto grande en slides cortos (1-3 palabras)
 *
 * @param {string} slideHtml      - HTML string del slide actual (puede contener <br/>).
 * @param {number} [fontAdjust=0] - Offset manual del usuario (teclas +/-).
 * @returns {number} Tamaño de fuente en px.
 */
export function calcProjectorFontSize(slideHtml, fontAdjust = 0) {
  const lines = (slideHtml || '').split('<br/>').filter(Boolean);
  if (!lines.length) return 100 + fontAdjust;

  const cleanLines = lines.map(stripHtml);
  const maxLen  = Math.max(...cleanLines.map((l) => l.length), 1);
  const numLines = cleanLines.length;

  const vw = window.innerWidth  || 1920;
  const vh = window.innerHeight || 1080;

  // Área disponible: padding 8vw a cada lado, 5vh arriba y abajo
  const availW = vw * 0.84;
  const availH = vh * 0.90;

  // Segoe UI bold ≈ 0.52em por carácter; line-height real = 1.25
  const fromWidth  = availW / (maxLen  * 0.52);
  const fromHeight = availH / (numLines * 1.25);

  // Mín 28px (siempre legible), máx 220px (slides de 1-2 palabras)
  const base = Math.max(28, Math.min(Math.min(fromWidth, fromHeight), 220));
  return Math.round(base) + fontAdjust;
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
