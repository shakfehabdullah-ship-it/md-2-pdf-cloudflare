let currentMarkdown = '';
let currentFilename = 'مستندي';
let isServerRunning = false;
let previewDebounceTimer = null;
let isPreviewLoading = false;

let markdownInput, preview, previewBtn, convertBtn, clearBtn, loadSampleBtn;
let fileInput, selectFileBtn, filenameInput, statusMessage, uploadArea;

// LaTeX is rendered server-side by the API — no client-side rendering needed

function initializeElements() {
  markdownInput = document.getElementById('markdownInput');
  preview = document.getElementById('preview');
  previewBtn = document.getElementById('previewBtn');
  convertBtn = document.getElementById('convertBtn');
  clearBtn = document.getElementById('clearBtn');
  loadSampleBtn = document.getElementById('loadSampleBtn');
  fileInput = document.getElementById('fileInput');
  selectFileBtn = document.getElementById('selectFileBtn');
  filenameInput = document.getElementById('filename');
  statusMessage = document.getElementById('statusMessage');
  uploadArea = document.querySelector('.upload-area');
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const tabName = btn.getAttribute('data-tab');
      const tabContent = document.getElementById(tabName + 'Tab');
      if (tabContent) {
        tabContent.classList.add('active');
      }
    });
  });
}

const sampleMarkdown = `# 📄 محول Markdown إلى PDF

أداة احترافية لتحويل **Markdown** إلى **PDF** مع دعم كامل للغة العربية.

---

## ✅ المميزات

| الميزة | الحالة |
|--------|--------|
| دعم RTL | ✅ مدعوم |
| المعاينة | ✅ مدعومة |
| التصدير PDF | ✅ مدعوم |
| LaTeX | ✅ مدعوم |
| أكواد البرمجة | ✅ مدعومة |
| PlantUML | ✅ مدعوم |

---

## 📝 التنسيقات الأساسية

يمكنك كتابة نص **عريض** أو *مائل* أو ***كلاهما***.

> هذا نص مقتبس. يمكنك استخدامه لتأكيد نقطة هامة.

### القوائم

1. عنصر مرقم أول
2. عنصر مرقم ثاني
   - عنصر فرعي
   - عنصر فرعي آخر

### الروابط والصور

[اضغط هنا لزيارة الموقع](https://example.com)

![صورة تجريبية](https://i.pinimg.com/1200x/be/6a/c2/be6ac28912b20c5172b3b4ec1d94140c.jpg)

---

## 📐 معادلات رياضية (LaTeX)

معادلة أينشتاين: $E = mc^2$

معادلة عرضية:
$$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$

مصفوفة:
$$A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$

---

## 💻 أكواد البرمجة

### JavaScript
\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
console.log(fibonacci(10)); // 55
\`\`\`

### Python
\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))  # 120
\`\`\`

### CSS
\`\`\`css
.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    direction: rtl;
}
\`\`\`

### SQL
\`\`\`sql
SELECT name, email FROM users
WHERE active = true
ORDER BY name;
\`\`\`

### JSON
\`\`\`json
{
    "name": "محول Markdown",
    "version": "2.0",
    "rtl": true
}
\`\`\`

كود مضمن: \`const x = 5 + 3;\`

---

## 📊 مخططات PlantUML

### مخطط تسلسلي
\`\`\`plantuml
@startuml
actor المستخدم
participant "الخادم" as Server
database "قاعدة البيانات" as DB

المستخدم -> Server : طلب تحويل PDF
Server -> DB : حفظ المستند
DB --> Server : تم الحفظ
Server --> المستخدم : PDF جاهز
@enduml
\`\`\`

### مخطط فئات
\`\`\`plantuml
@startuml
class محولPDF {
  +تحويل(markdown): PDF
  +معاينة(markdown): HTML
}
class الخادم {
  +بدء()
  +إيقاف()
}
class قاعدةالبيانات {
  +حفظ(مستند)
  +بحث(id): مستند
}
الخادم --> محولPDF : يستخدم
الخادم --> قاعدةالبيانات : يتصل
@enduml
\`\`\`

### مخطط تدفق
\`\`\`plantuml
@startuml
start
:إدخال نص Markdown;
:تحليل النص;
if (يحتوي كود؟) then (نعم)
  :تلوين الكود;
endif
:إنشاء HTML;
:تحويل إلى PDF;
:تحميل الملف;
stop
@enduml
\`\`\`

---

**جرب الآن!** ✅ عدّل هذا النص أو اكتب خاصك وشاهد النتيجة.`;

document.addEventListener('DOMContentLoaded', () => {
  initializeElements();
  initTabs();
  initEventListeners();
  checkServerStatus();
  restoreFromHistory();

  setTimeout(() => {
    if (!currentMarkdown) {
      loadSample();
    }
  }, 500);

  if (filenameInput) {
    filenameInput.addEventListener('input', () => {
      currentFilename = filenameInput.value || 'مستندي';
    });
  }
});

function restoreFromHistory() {
  const restoreMd = localStorage.getItem('md2pdf_restore_md');
  const restoreFilename = localStorage.getItem('md2pdf_restore_filename');

  if (restoreMd && markdownInput) {
    markdownInput.value = restoreMd;
    currentMarkdown = restoreMd;
    if (filenameInput && restoreFilename) {
      filenameInput.value = restoreFilename;
      currentFilename = restoreFilename;
    }
    localStorage.removeItem('md2pdf_restore_md');
    localStorage.removeItem('md2pdf_restore_filename');
    updatePreview();
  }
}

async function checkServerStatus() {
  try {
    const response = await fetch('/api/health');
    isServerRunning = response.ok;
  } catch (error) {
    isServerRunning = false;
    showStatus('⚠️ الخادم لا يستجيب', 'error');
  }
}

function loadSample() {
  if (!markdownInput) return;
  markdownInput.value = sampleMarkdown;
  currentMarkdown = sampleMarkdown;
  if (filenameInput) filenameInput.value = 'نموذج';
  currentFilename = 'نموذج';
  updatePreview();
}

/**
 * Extract body content from a full HTML document string.
 * The server returns a complete HTML page — we only need the <body> content
 * for the preview to avoid polluting the main page with embedded styles.
 */
function extractBodyContent(fullHtml) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, 'text/html');
    const bodyContent = doc.body;
    if (bodyContent) {
      // Don't transfer <style> tags from server HTML into preview
      // Preview has its own CSS from code-highlight.css and style.css
      // Server styles are only needed for PDF generation
      const source = bodyContent.querySelector('.content') || bodyContent;
      return source.innerHTML;
    }
  } catch (e) {
    // Fallback: return raw HTML
  }
  return fullHtml;
}

function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

async function updatePreview() {
  if (!preview || !markdownInput) return;
  if (isPreviewLoading) return;

  const markdown = markdownInput.value.trim();

  if (!markdown) {
    preview.innerHTML = `
      <div class="placeholder">
        <p>👆 اكتب نص Markdown أو ارفع ملف لرؤية المعاينة</p>
      </div>
    `;
    return;
  }

  try {
    isPreviewLoading = true;
    showStatus('🔄 جاري تحديث المعاينة...', 'loading');

    const response = await fetch('/api/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ markdown }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      // Extract body content to avoid injecting full <html>/<head> into a <div>
      preview.innerHTML = extractBodyContent(data.html);
      currentMarkdown = markdown;

      // Add copy buttons to code blocks
      addCodeCopyButtons();

      // LaTeX is already rendered server-side in the HTML

      if (typeof currentTheme !== 'undefined') {
        updatePreviewTheme(currentTheme);
      }

      showStatus('✅ تم تحديث المعاينة', 'success');
      setTimeout(() => hideStatus(), 2000);
    } else {
      throw new Error(data.error || 'فشل المعاينة');
    }
  } catch (error) {
    preview.innerHTML = `
      <div class="placeholder">
        <p>❌ حدث خطأ: ${error.message}</p>
        <p style="font-size: 0.9em; margin-top: 10px;">تأكد من أن الخادم يعمل على المنفذ 3000</p>
      </div>
    `;
    showStatus(`❌ ${error.message}`, 'error');
  } finally {
    isPreviewLoading = false;
  }
}

async function convertToPdf() {
  if (!markdownInput) return;

  const markdown = markdownInput.value.trim();

  if (!markdown) {
    showStatus('⚠️ الرجاء إدخال نص Markdown أولاً', 'error');
    return;
  }

  const filename = filenameInput ? filenameInput.value.trim() : 'مستندي';
  const finalFilename = filename || 'مستندي';

  try {
    showStatus('⏳ جاري إنشاء PDF...', 'loading');
    if (convertBtn) convertBtn.disabled = true;

    const themeCss = typeof getThemeCss === 'function'
      ? getThemeCss(currentTheme || 'blue')
      : '';

    const convertOptions = {
      title: finalFilename,
      rtl: true,
      css: themeCss,
      theme: currentTheme || 'blue',
    };

    // ── STEP 1: Try server-side PDF (Puppeteer via Browser Rendering) ──
    let serverPdfOk = false;
    try {
      const headers = { 'Content-Type': 'application/json' };
      const state = typeof getAuthState === 'function' ? getAuthState() : {};
      if (state.isGuest && state.guestSession) {
        headers['x-guest-session'] = state.guestSession;
      }

      const convertResponse = await fetch('/api/convert', {
        method: 'POST',
        headers,
        body: JSON.stringify({ markdown, options: convertOptions }),
      });

      if (convertResponse.ok) {
        const convertData = await convertResponse.json();
        if (convertData.success && convertData.pdf) {
          const binaryStr = atob(convertData.pdf);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${finalFilename}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          serverPdfOk = true;
          showStatus('✅ تم إنشاء PDF بنجاح!', 'success');
          setTimeout(() => hideStatus(), 5000);
        }
      } else if (convertResponse.status === 429) {
        console.log('Server PDF rate-limited, falling back to client-side...');
      }
    } catch (serverErr) {
      console.log('Server PDF failed, falling back to client-side:', serverErr.message);
    }

    // ── STEP 2: Client-side fallback using iframe + html2pdf ──
    if (!serverPdfOk) {
      showStatus('⏳ جاري إنشاء PDF (جانب العميل)...', 'loading');

      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown, options: convertOptions }),
      });

      if (!parseResponse.ok) throw new Error('فشل في تحليل النص');
      const parseData = await parseResponse.json();
      if (!parseData.success) throw new Error(parseData.error || 'فشل في التحليل');

      const fullHtml = parseData.html;
      const safeFilename = finalFilename.replace(/'/g, "\\'");

      // Inject html2pdf + auto-PDF script into the full HTML document
      const pdfScriptTag = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
<script>
  window.addEventListener('load', async () => {
    try {
      // Wait for fonts and external resources
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 1200));

      // Ensure code blocks preserve whitespace for html2canvas
      document.querySelectorAll('pre').forEach(pre => {
        pre.style.whiteSpace = 'pre';
        pre.style.overflow = 'visible';
      });

      const opt = {
        margin: [10, 10, 15, 10],
        filename: '${safeFilename}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          width: 794,
          windowWidth: 794,
          scrollY: 0,
          onclone: function(clonedDoc) {
            // Ensure code blocks render correctly in the clone
            clonedDoc.querySelectorAll('pre').forEach(pre => {
              pre.style.whiteSpace = 'pre';
              pre.style.overflow = 'visible';
            });
            clonedDoc.querySelectorAll('.plantuml-diagram img').forEach(img => {
              img.style.display = 'block';
            });
          }
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(document.body).save();
    } catch (e) {
      console.error('Client PDF error:', e);
    }
  });
<\/script>`;

      const modifiedHtml = fullHtml.replace('</body>', pdfScriptTag + '</body>');

      // Use a hidden iframe so the PDF script runs in the correct document context
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed; top:0; left:0; width:800px; height:1200px; opacity:0; z-index:-9999; border:none;';
      iframe.srcdoc = modifiedHtml;
      document.body.appendChild(iframe);

      // Clean up iframe after enough time for PDF generation
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 30000);

      showStatus('✅ يتم إنشاء PDF - سيتم التحميل تلقائياً...', 'success');
      setTimeout(() => hideStatus(), 8000);
    }

    // ── Save to history ──
    const state = typeof getAuthState === 'function' ? getAuthState() : {};
    if (typeof saveGuestRecord === 'function' && state.isGuest) {
      saveGuestRecord({
        title: finalFilename,
        filename: `${finalFilename}.pdf`,
        markdown_content: markdown,
        markdown_size: markdown.length,
        theme: currentTheme || 'blue',
      });
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    showStatus(`❌ ${error.message}`, 'error');
  } finally {
    if (convertBtn) convertBtn.disabled = false;
  }
}

function clearInput() {
  if (!confirm('هل أنت متأكد من مسح كل المحتوى؟')) return;
  if (!markdownInput || !preview || !filenameInput) return;

  markdownInput.value = '';
  currentMarkdown = '';
  preview.innerHTML = `
    <div class="placeholder">
      <p>👆 اكتب نص Markdown أو ارفع ملف لرؤية المعاينة</p>
    </div>
  `;
  filenameInput.value = 'مستندي';
  currentFilename = 'مستندي';
  hideStatus();
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    readFile(file);
  }
}

function readFile(file) {
  if (!markdownInput || !filenameInput) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    const content = e.target.result;
    markdownInput.value = content;
    currentMarkdown = content;

    const name = file.name.replace(/\.[^/.]+$/, '');
    filenameInput.value = name;
    currentFilename = name;

    updatePreview();

    showStatus(`✅ تم تحميل الملف: ${file.name}`, 'success');
    setTimeout(() => hideStatus(), 3000);
  };

  reader.onerror = () => {
    showStatus('❌ فشل قراءة الملف', 'error');
  };

  reader.readAsText(file);
}

function initDragDrop() {
  if (!uploadArea) return;

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');

    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['md', 'markdown', 'txt'].includes(ext)) {
        readFile(file);
      } else {
        showStatus('⚠️ الرجاء اختيار ملف Markdown (.md)', 'error');
      }
    }
  });
}

function showStatus(message, type) {
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;

  if (type === 'success') {
    setTimeout(() => {
      hideStatus();
    }, 5000);
  }
}

function hideStatus() {
  if (!statusMessage) return;
  statusMessage.className = 'status-message';
}

function initEventListeners() {
  if (previewBtn) previewBtn.addEventListener('click', updatePreview);
  if (convertBtn) convertBtn.addEventListener('click', convertToPdf);
  if (clearBtn) clearBtn.addEventListener('click', clearInput);
  if (loadSampleBtn) loadSampleBtn.addEventListener('click', loadSample);

  // Auto-preview with debounce when typing
  if (markdownInput) {
    markdownInput.addEventListener('input', debounce(() => {
      const md = markdownInput.value.trim();
      if (md && md !== currentMarkdown) {
        updatePreview();
      }
    }, 800));
  }

  if (selectFileBtn) {
    selectFileBtn.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      updatePreview();
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      convertToPdf();
    }
  });

  initDragDrop();
}

// Add copy buttons to code blocks in preview
function addCodeCopyButtons() {
  const preview = document.getElementById('preview');
  if (!preview) return;

  const headers = preview.querySelectorAll('.code-block-header');
  headers.forEach(header => {
    if (header.querySelector('.code-block-copy')) return;

    const btn = document.createElement('button');
    btn.className = 'code-block-copy';
    btn.textContent = 'نسخ';
    btn.onclick = () => {
      const wrapper = header.parentElement;
      const code = wrapper.querySelector('code');
      if (!code) return;
      navigator.clipboard.writeText(code.textContent).then(() => {
        btn.textContent = '✓ تم';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'نسخ'; btn.classList.remove('copied'); }, 2000);
      }).catch(() => {
        btn.textContent = '❌';
        setTimeout(() => { btn.textContent = 'نسخ'; }, 2000);
      });
    };
    header.appendChild(btn);
  });
}
