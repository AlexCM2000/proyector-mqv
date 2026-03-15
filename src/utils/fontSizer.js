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
 * Clamps result to [24, 180] px before applying the user's manual offset.
 *
 * @param {string} slideHtml      - HTML string for the current slide (may contain <br/>).
 * @param {number} [fontAdjust=0] - Manual user offset (from keyboard +/- keys).
 * @returns {number} Font size in px.
 */
export function calcProjectorFontSize(slideHtml, fontAdjust = 0) {
  const lines = (slideHtml || '').split('<br/>').filter(Boolean);
  if (!lines.length) return 80 + fontAdjust;

  const cleanLines = lines.map(stripHtml);
  const maxLen  = Math.max(...cleanLines.map((l) => l.length), 1);
  const numLines = cleanLines.length;

  const vw = window.innerWidth  || 1920;
  const vh = window.innerHeight || 1080;

  // Available area accounting for 8vw / 5vh padding on each side
  const availW = vw * 0.84;
  const availH = vh * 0.88;

  // Each character is ~0.58em wide; line-height is ~1.35
  const fromWidth  = availW / (maxLen  * 0.58);
  const fromHeight = availH / (numLines * 1.35);

  const base = Math.max(24, Math.min(Math.min(fromWidth, fromHeight), 180));
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
