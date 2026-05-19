// Extract PDF pages as images using canvas
const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

// Minimal canvas polyfill for Node.js
const { createCanvas, Image } = require('canvas');

const filePath = 'C:\\Users\\Dell\\Desktop\\استكشاف المعرفة د.زيد قريطم.pdf';
const outputDir = 'C:\\Users\\Dell\\Desktop\\pdf-pages';
const data = new Uint8Array(fs.readFileSync(filePath));

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

(async () => {
  try {
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    console.log('Total pages:', doc.numPages);
    
    // Extract first 15 pages as images
    for (let i = 1; i <= Math.min(doc.numPages, 15); i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2x for better quality
      
      const canvas = createCanvas(viewport.width, viewport.height);
      const ctx = canvas.getContext('2d');
      
      await page.render({ canvasContext: ctx, viewport }).promise;
      
      const imgPath = path.join(outputDir, `page-${String(i).padStart(2, '0')}.png`);
      const buf = canvas.toBuffer('image/png');
      fs.writeFileSync(imgPath, buf);
      console.log(`Saved page ${i} -> ${imgPath} (${Math.round(buf.length/1024)}KB)`);
    }
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  }
})();
