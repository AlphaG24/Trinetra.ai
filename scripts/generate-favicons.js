const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const srcImage = path.join(publicDir, 'trident.png');

async function generateThemeAwareFavicon() {
  console.log('Creating theme-aware SVG favicon...');

  // Step 1: Read white trident, trim it
  const whiteTrimmed = await sharp(srcImage)
    .trim()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Step 2: Invert to black, trim it
  const blackTrimmed = await sharp(srcImage)
    .negate({ alpha: false })
    .trim()
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Step 3: Convert both to base64
  const whiteBase64 = whiteTrimmed.toString('base64');
  const blackBase64 = blackTrimmed.toString('base64');

  // Step 4: Create SVG with embedded media queries
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <style>
    /* Default: show black icon (for light browser themes) */
    .light-icon { display: inline; }
    .dark-icon { display: none; }

    /* When browser is in dark mode: show white icon */
    @media (prefers-color-scheme: dark) {
      .light-icon { display: none; }
      .dark-icon { display: inline; }
    }
  </style>
  <image class="light-icon" width="512" height="512" href="data:image/png;base64,${blackBase64}"/>
  <image class="dark-icon" width="512" height="512" href="data:image/png;base64,${whiteBase64}"/>
</svg>`;

  // Step 5: Save the SVG
  const svgPath = path.join(publicDir, 'favicon.svg');
  fs.writeFileSync(svgPath, svg, 'utf8');
  console.log('Created public/favicon.svg (theme-aware)');

  // Also update app/icon.svg for Next.js auto-detection
  const appSvgPath = path.join(__dirname, '..', 'app', 'icon.svg');
  fs.writeFileSync(appSvgPath, svg, 'utf8');
  console.log('Created app/icon.svg (theme-aware)');

  console.log('\nDone! The favicon will now:');
  console.log('  - Show BLACK trident on light/white browser themes');
  console.log('  - Show WHITE trident on dark browser themes');
}

generateThemeAwareFavicon().catch(console.error);
