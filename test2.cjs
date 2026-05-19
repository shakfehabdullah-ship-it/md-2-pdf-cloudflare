const body = JSON.stringify({
  markdown: [
    '### Math Test',
    '',
    'Inline: $x^2$',
    '',
    'Display:',
    '$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$',
    '',
    'Matrix:',
    '$$A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$',
  ].join('\n')
});

const http = require('https');
const opts = {
  hostname: 'md-2-pdf.pages.dev',
  path: '/api/parse',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};

const req = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    const html = j.html;
    
    // Extract just the content between <div class="content"> and its closing </div>
    const startTag = '<div class="content">';
    const s = html.indexOf(startTag);
    if (s === -1) { console.log('NO CONTENT DIV'); return; }
    
    const content = html.substring(s + startTag.length);
    // Find matching closing </div> - look for the last one before </body>
    const endBody = content.indexOf('</body>');
    const contentEnd = content.lastIndexOf('</div>', endBody);
    
    console.log('=== RENDERED CONTENT ===');
    console.log(content.substring(0, contentEnd));
    
    console.log('\n=== STATS ===');
    console.log('Has katex class:', html.includes('class="katex"'));
    console.log('Has math-display:', html.includes('class="math-display"'));
    console.log('Has katex-error:', html.includes('class="katex-error"'));
    
    // Find errors
    const errorRe = /class="katex-error"[^>]*>([^<]*)</g;
    let m;
    while ((m = errorRe.exec(html)) !== null) {
      console.log('KATEX ERROR:', m[1].substring(0, 100));
    }
  });
});
req.write(body);
req.end();
