let currentMarkdown = '';
let currentFilename = 'مستندي';
let isServerRunning = false;
let previewDebounceTimer = null;
let isPreviewLoading = false;
let currentDirection = 'rtl'; // rtl | ltr | hybrid
let uploadedFiles = []; // [{name, content}]
let activeFileIndex = 0;

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
  initDirectionButtons();
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

  // Save current file content
  saveCurrentFile();

  const filesToConvert = uploadedFiles.length > 0
    ? uploadedFiles
    : [{ name: filenameInput ? filenameInput.value.trim() || 'مستندي' : 'مستندي', content: markdownInput.value.trim() }];

  // Validate
  const emptyFiles = filesToConvert.filter(f => !f.content.trim());
  if (emptyFiles.length === filesToConvert.length) {
    showStatus('⚠️ الرجاء إدخال نص Markdown أولاً', 'error');
    return;
  }

  const validFiles = filesToConvert.filter(f => f.content.trim());

  try {
    if (convertBtn) convertBtn.disabled = true;
    showStatus(`⏳ جاري إنشاء PDF لـ ${validFiles.length} ملف...`, 'loading');

    const themeCss = typeof getThemeCss === 'function'
      ? getThemeCss(currentTheme || 'blue')
      : '';

    let successCount = 0;

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const convertOptions = {
        title: file.name,
        rtl: currentDirection === 'rtl' || currentDirection === 'hybrid',
        direction: currentDirection,
        css: themeCss,
        theme: currentTheme || 'blue',
      };

      showStatus(`⏳ جاري إنشاء PDF (${i + 1}/${validFiles.length}): ${file.name}...`, 'loading');

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
          body: JSON.stringify({ markdown: file.content, options: convertOptions }),
        });

        if (convertResponse.ok) {
          const convertData = await convertResponse.json();
          if (convertData.success && convertData.pdf) {
            const binaryStr = atob(convertData.pdf);
            const bytes = new Uint8Array(binaryStr.length);
            for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);

            const blob = new Blob([bytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${file.name}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            serverPdfOk = true;
            successCount++;

            // Small delay between downloads so browser doesn't block them
            if (validFiles.length > 1) await new Promise(r => setTimeout(r, 800));
          }
        }
      } catch (serverErr) {
        console.log(`Server PDF failed for ${file.name}:`, serverErr.message);
      }

      // Fallback: client-side
      if (!serverPdfOk) {
        await convertSingleFileClientSide(file, convertOptions);
        successCount++;
        if (validFiles.length > 1) await new Promise(r => setTimeout(r, 800));
      }
    }

    showStatus(`✅ تم إنشاء ${successCount} ملف PDF بنجاح!`, 'success');
    setTimeout(() => hideStatus(), 5000);

    // Save to history
    const state = typeof getAuthState === 'function' ? getAuthState() : {};
    if (typeof saveGuestRecord === 'function' && state.isGuest) {
      for (const file of validFiles) {
        saveGuestRecord({
          title: file.name,
          filename: `${file.name}.pdf`,
          markdown_content: file.content,
          markdown_size: file.content.length,
          theme: currentTheme || 'blue',
        });
      }
    }
  } catch (error) {
    console.error('PDF generation error:', error);
    showStatus(`❌ ${error.message}`, 'error');
  } finally {
    if (convertBtn) convertBtn.disabled = false;
  }
}

async function convertSingleFileClientSide(file, convertOptions) {
  const parseResponse = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markdown: file.content, options: convertOptions }),
  });

  if (!parseResponse.ok) throw new Error('فشل في تحليل النص');
  const parseData = await parseResponse.json();
  if (!parseData.success) throw new Error(parseData.error || 'فشل في التحليل');

  const fullHtml = parseData.html;
  const safeFilename = file.name.replace(/'/g, "\\'");

  const pdfScriptTag = `
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js"><\/script>
<script>
  window.addEventListener('load', async () => {
    try {
      await document.fonts.ready;
      await new Promise(r => setTimeout(r, 1200));
      document.querySelectorAll('pre').forEach(pre => {
        pre.style.whiteSpace = 'pre';
        pre.style.overflow = 'visible';
      });
      const opt = {
        margin: [10, 10, 15, 10],
        filename: '${safeFilename}.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, width: 794, windowWidth: 794, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };
      await html2pdf().set(opt).from(document.body).save();
    } catch (e) { console.error('Client PDF error:', e); }
  });
<\/script>`;

  const modifiedHtml = fullHtml.replace('</body>', pdfScriptTag + '</body>');
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed; top:0; left:0; width:800px; height:1200px; opacity:0; z-index:-9999; border:none;';
  iframe.srcdoc = modifiedHtml;
  document.body.appendChild(iframe);
  setTimeout(() => { if (iframe.parentNode) iframe.parentNode.removeChild(iframe); }, 30000);
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
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  let loadCount = 0;
  files.forEach((file, idx) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const name = file.name.replace(/\.[^/.]+$/, '');
      uploadedFiles.push({ name, content });
      loadCount++;

      if (loadCount === files.length) {
        // All files loaded
        activeFileIndex = 0;
        renderFilePages();
        loadFileToEditor(0);
        showStatus(`✅ تم تحميل ${files.length} ملف${files.length > 1 ? 'ات' : ''}`, 'success');
        setTimeout(() => hideStatus(), 3000);
      }
    };
    reader.onerror = () => {
      loadCount++;
      showStatus(`❌ فشل قراءة: ${file.name}`, 'error');
    };
    reader.readAsText(file);
  });

  // Reset input so same files can be re-selected
  event.target.value = '';
}

function renderFilePages() {
  const container = document.getElementById('filePages');
  const nav = document.getElementById('filePagesNav');
  if (!container || !nav) return;

  if (uploadedFiles.length === 0) {
    container.hidden = true;
    return;
  }

  container.hidden = false;
  nav.innerHTML = '';

  uploadedFiles.forEach((file, idx) => {
    const btn = document.createElement('button');
    btn.className = 'file-page-btn' + (idx === activeFileIndex ? ' active' : '');
    btn.innerHTML = `<span class="page-num">${idx + 1}</span> ${file.name}`;
    btn.title = file.name;
    btn.addEventListener('click', () => {
      saveCurrentFile();
      activeFileIndex = idx;
      loadFileToEditor(idx);
      renderFilePages();
    });
    nav.appendChild(btn);
  });
}

function loadFileToEditor(idx) {
  if (!uploadedFiles[idx] || !markdownInput || !filenameInput) return;
  const file = uploadedFiles[idx];
  markdownInput.value = file.content;
  currentMarkdown = file.content;
  filenameInput.value = file.name;
  currentFilename = file.name;
  updatePreview();
}

function saveCurrentFile() {
  if (uploadedFiles.length === 0 || !markdownInput) return;
  uploadedFiles[activeFileIndex].content = markdownInput.value;
}

function clearAllFiles() {
  uploadedFiles = [];
  activeFileIndex = 0;
  if (markdownInput) markdownInput.value = '';
  if (filenameInput) filenameInput.value = 'مستندي';
  currentMarkdown = '';
  currentFilename = 'مستندي';
  renderFilePages();
  updatePreview();
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

    // Also add to uploadedFiles
    uploadedFiles = [{ name, content }];
    activeFileIndex = 0;
    renderFilePages();

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

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const validFiles = files.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return ['md', 'markdown', 'txt'].includes(ext);
    });

    if (validFiles.length === 0) {
      showStatus('⚠️ الرجاء اختيار ملفات Markdown (.md)', 'error');
      return;
    }

    let loadCount = 0;
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target.result;
        const name = file.name.replace(/\.[^/.]+$/, '');
        uploadedFiles.push({ name, content });
        loadCount++;

        if (loadCount === validFiles.length) {
          activeFileIndex = 0;
          renderFilePages();
          loadFileToEditor(0);
          showStatus(`✅ تم تحميل ${validFiles.length} ملف${validFiles.length > 1 ? 'ات' : ''}`, 'success');
          setTimeout(() => hideStatus(), 3000);
        }
      };
      reader.readAsText(file);
    });
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

function initDirectionButtons() {
  const dirBtns = document.querySelectorAll('.dir-btn');
  dirBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dirBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentDirection = btn.getAttribute('data-dir');

      // Update textarea direction
      if (markdownInput) {
        if (currentDirection === 'rtl') {
          markdownInput.dir = 'rtl';
        } else if (currentDirection === 'ltr') {
          markdownInput.dir = 'ltr';
        } else {
          markdownInput.dir = 'auto';
        }
      }

      // Update preview if there's content
      if (currentMarkdown) {
        updatePreview();
      }
    });
  });
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

  // Clear all files button
  const clearFilesBtn = document.getElementById('clearFilesBtn');
  if (clearFilesBtn) {
    clearFilesBtn.addEventListener('click', clearAllFiles);
  }
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
