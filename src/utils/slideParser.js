/**
 * Slide parsing utilities.
 *
 * Pure functions — no side effects, no browser API dependencies.
 *
 * Slide format: song text blocks separated by "---" (with optional surrounding
 * whitespace). Each slide's lines are trimmed; blank lines and blank slides
 * are dropped.
 */

/**
 * Parses raw song text into an array of plain-text slide strings.
 * Lines within each slide are joined with "\n".
 *
 * @param {string}  rawText          - The song.text value as stored in localStorage.
 * @param {boolean} [uppercase=false] - Whether to uppercase the output.
 * @returns {string[]} Array of plain-text slide strings (no HTML).
 */
export function parseSlides(rawText, uppercase = false) {
  if (!rawText) return [];

  const normalized = rawText.replace(/\r/g, '').replace(/\\n/g, '\n');
  let slides = normalized
    .split(/\s*---\s*/)
    .map((p) =>
      p.split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n')
    )
    .filter(Boolean);

  if (uppercase) slides = slides.map((s) => s.toUpperCase());
  return slides;
}

/**
 * Converts a plain-text slide string to HTML by replacing newlines with <br/>.
 * This is the only place that generates slide HTML — call it at render time.
 *
 * @param {string} slideText - A single plain-text slide from parseSlides().
 * @returns {string} HTML string safe for v-html.
 */
export function slideToHtml(slideText) {
  if (!slideText) return '';
  return slideText.split('\n').join('<br/>');
}
