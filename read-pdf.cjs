const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.mjs');

const filePath = 'C:\\Users\\Dell\\Desktop\\استكشاف المعرفة د.زيد قريطم.pdf';
const data = new Uint8Array(fs.readFileSync(filePath));

(async () => {
  try {
    const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
    console.log('Total pages:', doc.numPages);
    
    // Check first page for text and images
    for (let i = 1; i <= 3; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      console.log(`\n=== Page ${i} text items: ${content.items.length} ===`);
      content.items.forEach((item, idx) => {
        if (item.str && item.str.trim()) console.log(`  [${idx}] "${item.str}"`);
      });
      
      // Check operators for images
      const ops = await page.getOperatorList();
      const imgOps = ops.fnArray.filter(fn => fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject);
      console.log(`Image operations on page ${i}: ${imgOps.length}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
