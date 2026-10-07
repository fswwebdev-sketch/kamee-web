/**
 * Mock respons Google Fonts untuk build tanpa internet (CI / sandbox).
 * Dipakai lewat env NEXT_FONT_GOOGLE_MOCKED_RESPONSES (fitur resmi next/font untuk pengujian):
 *   npm run build:offline
 * Berkas font diambil dari @fontsource (subset latin), jadi hasil tampilan identik.
 */
const path = require('node:path');

const FILES = {
  Montserrat: (w) => require.resolve(`@fontsource/montserrat/files/montserrat-latin-${w}-normal.woff2`),
};
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

function css(url) {
  const params = new URL(url).searchParams;
  const display = params.get('display') || 'swap';
  return params.getAll('family').map((spec) => {
    const [family, axes = ''] = spec.split(':');
    const name = family.replace(/\+/g, ' ');
    const weights = (axes.split('@')[1] || '400').split(';');
    return weights.map((w) => `/* latin */
@font-face {
  font-family: '${name}';
  font-style: normal;
  font-weight: ${w};
  font-display: ${display};
  src: url(${path.resolve(FILES[name](w))}) format('woff2');
  unicode-range: ${LATIN};
}`).join('\n');
  }).join('\n');
}

module.exports = new Proxy({}, { get: (_, url) => (typeof url === 'string' && url.startsWith('http') ? css(url) : undefined) });
