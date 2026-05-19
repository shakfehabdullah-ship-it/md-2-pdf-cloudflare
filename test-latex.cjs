const body = JSON.stringify({
  markdown: [
    '### معادلات رياضية',
    '',
    'معادلة داخل السطر: $E = mc^2$',
    '',
    'معادلة عرضية:',
    '$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$',
    '',
    'متتابعة حسابية: $a_n = a_1 + (n-1)d$',
    '',
    'مصفوفة:',
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
    const s = j.html.indexOf('<div class="content">');
    const e = j.html.indexOf('</div>\n  </div>');
    console.log('=== CONTENT ===');
    console.log(j.html.substring(s, e + 7));
    
    // Check for katex
    const hasKatex = j.html.includes('class="katex"');
    const hasMathDisplay = j.html.includes('class="math-display"');
    const hasKatexError = j.html.includes('katex-error');
    console.log('\n=== CHECKS ===');
    console.log('katex rendered:', hasKatex);
    console.log('math-display:', hasMathDisplay);
    console.log('katex-error:', hasKatexError);
  });
});
req.write(body);
req.end();
