let currentTheme = "blue";

function initThemes() {
  const dots = document.querySelectorAll(".theme-dot");

  const savedTheme = localStorage.getItem("md2pdf-theme");
  if (savedTheme) {
    currentTheme = savedTheme;
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateActiveDot(currentTheme);
  }

  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const theme = dot.getAttribute("data-theme");
      setTheme(theme);
    });
  });
}

function setTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  updateActiveDot(theme);
  localStorage.setItem("md2pdf-theme", theme);
  updatePreviewTheme(theme);
}

function updateActiveDot(theme) {
  document
    .querySelectorAll(".theme-dot")
    .forEach((d) => d.classList.remove("active"));
  document
    .querySelector(`.theme-dot[data-theme="${theme}"]`)
    ?.classList.add("active");
}

function updatePreviewTheme(theme) {
  const preview = document.getElementById("preview");
  if (!preview) return;

  preview.setAttribute("data-theme", theme);

  const themes = {
    blue:   { primary: "#3498db", light: "#ebf5fb", hover: "#d6eaf8" },
    red:    { primary: "#e74c3c", light: "#fdedec", hover: "#fadbd8" },
    green:  { primary: "#27ae60", light: "#eafaf1", hover: "#d5f5e3" },
    purple: { primary: "#9b59b6", light: "#f5eef8", hover: "#ebdef0" },
    gold:   { primary: "#f39c12", light: "#fef9e7", hover: "#fdebd0" },
  };

  const t = themes[theme] || themes.blue;

  // Code block colors per theme (tinted background matching theme color)
  const codeThemes = {
    blue:   { bg: "#0f1923", header: "#0d1520", border: "#1a3a5c" },
    red:    { bg: "#200d0d", header: "#1a0a0a", border: "#5c1b1b" },
    green:  { bg: "#0d1f12", header: "#0a1a0d", border: "#1b5c22" },
    purple: { bg: "#1a0f20", header: "#150a1a", border: "#3b1b5c" },
    gold:   { bg: "#201a0d", header: "#1a150a", border: "#5c4a1b" },
  };
  const c = codeThemes[theme] || codeThemes.blue;

  // Remove old override
  const old = document.getElementById("theme-preview-override");
  if (old) old.remove();

  // Inject override styles with !important to beat embedded converter styles
  const style = document.createElement("style");
  style.id = "theme-preview-override";
  style.textContent = `
    :root { --primary: ${t.primary} !important; }
    #preview th { background: ${t.primary} !important; color: #fff !important; }
    #preview tr:nth-child(even) { background: ${t.light} !important; }
    #preview tr:hover { background: ${t.hover} !important; }
    #preview h1 { border-bottom-color: ${t.primary} !important; color: ${t.primary} !important; }
    #preview h2, #preview h3 { color: ${t.primary} !important; }
    #preview blockquote { border-right-color: ${t.primary} !important; background: ${t.light} !important; }
    #preview a { color: ${t.primary} !important; }
    #preview hr { background: linear-gradient(to left, transparent, ${t.primary}, transparent) !important; }
    #preview .cover-page h1 { color: ${t.primary} !important; }
    #preview .cover-page .divider { background: ${t.primary} !important; }
    #preview code:not(pre code) { background: ${t.light} !important; color: ${t.primary} !important; border-color: ${t.primary}33 !important; }
    #preview pre, #preview .preview-content pre { background: ${c.bg} !important; border-color: ${c.border} !important; }
    #preview .code-block-wrapper, #preview .preview-content .code-block-wrapper { border-color: ${c.border} !important; }
    #preview .code-block-header, #preview .preview-content .code-block-header { background: ${c.header} !important; border-color: ${c.border} !important; }
    #preview .code-block-lang, #preview .preview-content .code-block-lang { color: ${t.primary}99 !important; }
    #preview .code-block-copy, #preview .preview-content .code-block-copy { color: ${t.primary}77 !important; border-color: ${c.border} !important; }
    #preview .code-block-copy:hover, #preview .preview-content .code-block-copy:hover { background: ${c.bg} !important; color: ${t.primary} !important; }
    #preview .plantuml-header { background: ${c.header} !important; border-color: ${c.border} !important; }
    #preview .plantuml-label { color: ${t.primary}99 !important; }
    #preview .plantuml-diagram { border-color: ${c.border} !important; }
  `;
  document.head.appendChild(style);
}

function getThemeCss(theme) {
  const themes = {
    blue:   { primary: "#3498db", light: "#ebf5fb", hover: "#d6eaf8" },
    red:    { primary: "#e74c3c", light: "#fdedec", hover: "#fadbd8" },
    green:  { primary: "#27ae60", light: "#eafaf1", hover: "#d5f5e3" },
    purple: { primary: "#9b59b6", light: "#f5eef8", hover: "#ebdef0" },
    gold:   { primary: "#f39c12", light: "#fef9e7", hover: "#fdebd0" },
  };

  const t = themes[theme] || themes.blue;

  return `
    th { background: ${t.primary} !important; }
    tr:nth-child(even) { background: ${t.light} !important; }
    tr:hover { background: ${t.hover} !important; }
    h1 { border-bottom-color: ${t.primary} !important; color: ${t.primary} !important; }
    .cover-page h1 { color: ${t.primary} !important; }
    .cover-page .divider { background: ${t.primary} !important; }
    blockquote { border-right-color: ${t.primary} !important; background: ${t.light} !important; }
    a { color: ${t.primary} !important; }
    hr { background: linear-gradient(to left, transparent, ${t.primary}, transparent) !important; }
  `;
}

document.addEventListener("DOMContentLoaded", initThemes);
