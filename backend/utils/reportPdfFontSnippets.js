/**
 * PDF report typography: Linux/Railway Chromium often has no "Times New Roman".
 * Tinos (Google Fonts, OFL) loads over HTTPS so Puppeteer renders a consistent Times-like face.
 */
const HEAD_FONT_LINKS = `
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
`;

const FONT_STACK = "'Tinos', 'Times New Roman', 'Liberation Serif', 'Times', serif";

module.exports = { HEAD_FONT_LINKS, FONT_STACK };
