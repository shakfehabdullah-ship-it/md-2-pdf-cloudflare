// ── i18n: Arabic / English translations ─────────────────────────────────────
const LANG_KEY = "md2pdf_lang";

const translations = {
  ar: {
    // Header
    "title": "محول Markdown إلى PDF - دعم RTL",
    "docs_link": "📚 توثيق API",
    "history_link": "📋 السجلات",
    "login_btn": "🔑 تسجيل الدخول",
    "h1": "📄 محول Markdown إلى PDF",
    "subtitle": "مع دعم كامل للغة العربية والاتجاه من اليمين لليسار",
    "dir_label": "📐 اتجاه النص:",
    "dir_rtl": "◀️ RTL",
    "dir_hybrid": "🔀 هجين",
    "dir_ltr": "▶️ LTR",
    "dir_rtl_title": "من اليمين لليسار",
    "dir_hybrid_title": "هجين - عربي RTL + أكواد LTR",
    "dir_ltr_title": "من اليسار لليمين",

    // Auth modal
    "auth_login_tab": "تسجيل الدخول",
    "auth_register_tab": "إنشاء حساب",
    "auth_email_ph": "البريد الإلكتروني",
    "auth_password_ph": "كلمة المرور",
    "auth_username_ph": "اسم المستخدم",
    "auth_password6_ph": "كلمة المرور (6 أحرف+)",
    "auth_login_btn": "دخول",
    "auth_register_btn": "إنشاء حساب",
    "auth_or": "أو",
    "auth_guest_btn": "👤 المتابعة كضيف",
    "auth_guest_note": "سيتم حفظ سجلاتك على المتصفح فقط. لن تُحذف إلا إذا طلبت ذلك.",

    // Input section
    "input_h2": "✍️ الإدخال",
    "clear_btn": "🗑️ مسح",
    "sample_btn": "📝 نموذج",
    "tab_write": "كتابة نص",
    "tab_upload": "رفع ملف",
    "textarea_ph": "اكتب نص Markdown هنا... أو الصق محتوى ملف .md",
    "select_files": "📁 اختيار ملفات",
    "upload_hint": "أو اسحب ملفات Markdown هنا (يمكنك رفع عدة ملفات)",
    "uploaded_files": "📄 الملفات المرفوعة",
    "clear_all": "🗑️ مسح الكل",
    "filename_label": "اسم الملف الناتج:",
    "filename_default": "مستندي",
    "filename_ph": "اسم الملف",

    // Preview section
    "preview_h2": "👁️ المعاينة",
    "preview_btn": "🔄 تحديث المعاينة",
    "preview_placeholder": "👆 اكتب نص Markdown أو ارفع ملف لرؤية المعاينة",

    // Export
    "convert_btn": "📥 تحويل إلى PDF",
    "explore_docs": "📚 استكشف توثيق API الكامل",

    // Help
    "help_summary": "💡 دليل Markdown السريع",
    "help_h3": "تنسيقات أساسية:",
    "help_li1": "# عنوان 1 - عنوان كبير",
    "help_li2": "## عنوان 2 - عنوان متوسط",
    "help_li3": "**نص عريض** - نص عريض",
    "help_li4": "*نص مائل* - نص مائل",
    "help_li5": "- عنصر في القائمة - قائمة نقطية",
    "help_li6": "[رابط](URL) - رابط",
    "help_li7": "`كود` - كود مضمن",
  },
  en: {
    // Header
    "title": "Markdown to PDF Converter - RTL Support",
    "docs_link": "📚 API Docs",
    "history_link": "📋 History",
    "login_btn": "🔑 Login",
    "h1": "📄 Markdown to PDF Converter",
    "subtitle": "Full Arabic language and RTL support",
    "dir_label": "📐 Text Direction:",
    "dir_rtl": "◀️ RTL",
    "dir_hybrid": "🔀 Hybrid",
    "dir_ltr": "▶️ LTR",
    "dir_rtl_title": "Right to Left",
    "dir_hybrid_title": "Hybrid - Arabic RTL + Code LTR",
    "dir_ltr_title": "Left to Right",

    // Auth modal
    "auth_login_tab": "Login",
    "auth_register_tab": "Sign Up",
    "auth_email_ph": "Email address",
    "auth_password_ph": "Password",
    "auth_username_ph": "Username",
    "auth_password6_ph": "Password (6+ chars)",
    "auth_login_btn": "Login",
    "auth_register_btn": "Sign Up",
    "auth_or": "or",
    "auth_guest_btn": "👤 Continue as Guest",
    "auth_guest_note": "Your records will be saved in your browser only. They won't be deleted unless you request it.",

    // Input section
    "input_h2": "✍️ Input",
    "clear_btn": "🗑️ Clear",
    "sample_btn": "📝 Sample",
    "tab_write": "Write Text",
    "tab_upload": "Upload File",
    "textarea_ph": "Type your Markdown here... or paste .md file content",
    "select_files": "📁 Select Files",
    "upload_hint": "Or drag Markdown files here (you can upload multiple files)",
    "uploaded_files": "📄 Uploaded Files",
    "clear_all": "🗑️ Clear All",
    "filename_label": "Output filename:",
    "filename_default": "my-document",
    "filename_ph": "Filename",

    // Preview section
    "preview_h2": "👁️ Preview",
    "preview_btn": "🔄 Refresh Preview",
    "preview_placeholder": "👆 Type Markdown or upload a file to see the preview",

    // Export
    "convert_btn": "📥 Convert to PDF",
    "explore_docs": "📚 Explore Full API Documentation",

    // Help
    "help_summary": "💡 Quick Markdown Guide",
    "help_h3": "Basic formatting:",
    "help_li1": "# Heading 1 - Large heading",
    "help_li2": "## Heading 2 - Medium heading",
    "help_li3": "**bold text** - bold text",
    "help_li4": "*italic text* - italic text",
    "help_li5": "- list item - bullet list",
    "help_li6": "[link](URL) - hyperlink",
    "help_li7": "`code` - inline code",
  }
};

function getCurrentLang() {
  return localStorage.getItem(LANG_KEY) || "ar";
}

function setLanguage(lang) {
  localStorage.setItem(LANG_KEY, lang);
  const menu = document.getElementById("langMenu");
  if (menu) menu.hidden = true;
  const t = translations[lang] || translations.ar;

  // Update html attributes
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  // Update all elements with data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (t[key] !== undefined) {
      el.innerHTML = t[key];
    }
  });

  // Update placeholders
  document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    const key = el.getAttribute("data-i18n-ph");
    if (t[key] !== undefined) {
      el.placeholder = t[key];
    }
  });

  // Update values (for inputs with default values)
  document.querySelectorAll("[data-i18n-val]").forEach((el) => {
    const key = el.getAttribute("data-i18n-val");
    if (t[key] !== undefined) {
      el.value = t[key];
    }
  });

  // Update titles
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (t[key] !== undefined) {
      el.title = t[key];
    }
  });

  // Update document title
  document.title = t.title;

  // Explicitly update explore docs link (fallback)
  const exploreLink = document.getElementById("exploreDocsLink");
  if (exploreLink) exploreLink.innerHTML = t.explore_docs;

  // Update lang label and dropdown active state
  const langLabel = document.getElementById("langLabel");
  if (langLabel) {
    langLabel.textContent = lang === "ar" ? "العربية" : "English";
  }
  document.querySelectorAll(".lang-dropdown-menu button").forEach((btn) => {
    const isActive = btn.getAttribute("data-lang") === lang;
    btn.style.fontWeight = isActive ? "bold" : "normal";
    btn.style.background = isActive ? "#e8f0fe" : "";
  });

  // Update textarea direction
  const textarea = document.getElementById("markdownInput");
  if (textarea) {
    textarea.dir = lang === "ar" ? "rtl" : "ltr";
  }

  // Update direction buttons to match language
  const dirBtns = document.querySelectorAll(".dir-btn");
  dirBtns.forEach((b) => b.classList.remove("active"));
  const targetDir = lang === "ar" ? "rtl" : "ltr";
  const activeBtn = document.querySelector(`.dir-btn[data-dir="${targetDir}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  // Update currentDirection if app.js uses it
  if (typeof currentDirection !== "undefined") {
    currentDirection = targetDir;
  }
  if (typeof window !== "undefined") {
    window.currentDirection = targetDir;
  }

  // Refresh auth UI labels
  if (typeof updateAuthUI === "function") {
    updateAuthUI();
  }
}

function toggleLanguage() {
  const current = getCurrentLang();
  setLanguage(current === "ar" ? "en" : "ar");
}

window.toggleLanguage = toggleLanguage;
window.setLanguage = setLanguage;
window.getCurrentLang = getCurrentLang;

window.toggleLangMenu = function() {
  const menu = document.getElementById("langMenu");
  if (menu) menu.hidden = !menu.hidden;
};

// Close lang menu when clicking outside
document.addEventListener("click", (e) => {
  const menu = document.getElementById("langMenu");
  const dropdown = document.querySelector(".lang-dropdown");
  if (menu && !menu.hidden && dropdown && !dropdown.contains(e.target)) {
    menu.hidden = true;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  setLanguage(getCurrentLang());
});
