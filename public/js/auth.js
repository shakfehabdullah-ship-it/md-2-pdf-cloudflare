const AUTH_KEY = "md2pdf_auth_token";
const USER_KEY = "md2pdf_user";
const GUEST_KEY = "md2pdf_guest_session";
const GUEST_HISTORY_KEY = "md2pdf_guest_history";

function authT(key) {
  const lang = (typeof getCurrentLang === "function") ? getCurrentLang() : "ar";
  const t = {
    ar: {
      login: "🔑 تسجيل الدخول",
      guest: "👤 ضيف - تسجيل الدخول",
      logout: "تسجيل الخروج",
      loginTab: "تسجيل الدخول",
      registerTab: "إنشاء حساب",
      guestBtn: "👤 المتابعة كضيف",
      guestNote: "سيتم حفظ سجلاتك على المتصفح فقط. لن تُحذف إلا إذا طلبت ذلك.",
    },
    en: {
      login: "🔑 Login",
      guest: "👤 Guest - Login",
      logout: "Logout",
      loginTab: "Login",
      registerTab: "Sign Up",
      guestBtn: "👤 Continue as Guest",
      guestNote: "Your records will be saved in your browser only.",
    }
  };
  return (t[lang] && t[lang][key]) || t.ar[key] || key;
}

function getAuthState() {
  const token = localStorage.getItem(AUTH_KEY);
  const user = JSON.parse(localStorage.getItem(USER_KEY) || "null");
  const guestId = localStorage.getItem(GUEST_KEY);

  return {
    isLoggedIn: !!token,
    isGuest: !token && !!guestId,
    token,
    user,
    guestId,
  };
}

async function login(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem(AUTH_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    updateAuthUI();
  }
  return data;
}

async function register(username, email, password) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (data.success) {
    localStorage.setItem(AUTH_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    updateAuthUI();
  }
  return data;
}

async function continueAsGuest() {
  let guestId = localStorage.getItem(GUEST_KEY);
  if (!guestId) {
    const res = await fetch("/api/auth/guest", { method: "POST" });
    const data = await res.json();
    guestId = data.guestSessionId;
    localStorage.setItem(GUEST_KEY, guestId);
  }
  updateAuthUI();
  closeAuthModal();
}

function saveGuestRecord(record) {
  const history = JSON.parse(localStorage.getItem(GUEST_HISTORY_KEY) || "[]");
  history.unshift({
    ...record,
    id: Date.now(),
    timestamp: new Date().toISOString(),
  });
  if (history.length > 100) history.pop();
  localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(history));
}

function updateAuthUI() {
  const state = getAuthState();
  const authBtn = document.getElementById("authBtn");
  const authModal = document.getElementById("authModal");

  if (!authBtn) return;

  // Remove any existing logout btn
  const existingLogout = document.getElementById("logoutBtn");
  if (existingLogout) existingLogout.remove();

  if (state.isLoggedIn) {
    const name = state.user?.displayName || state.user?.username || "مستخدم";
    authBtn.innerHTML = `👤 ${name} ▾`;
    authBtn.classList.add("logged-in");
    authBtn.classList.remove("guest");
    authBtn.style.color = "#6b7280";
    authBtn.onclick = toggleUserMenu;

    if (!document.getElementById("userMenu")) {
      const menu = document.createElement("div");
      menu.id = "userMenu";
      menu.className = "user-dropdown-menu";
      menu.hidden = true;
      menu.innerHTML = `<button onclick="logout()" class="user-dropdown-item">${authT("logout")}</button>`;
      authBtn.parentNode.style.position = "relative";
      authBtn.parentNode.appendChild(menu);
    }
  } else if (state.isGuest) {
    const oldMenu = document.getElementById("userMenu");
    if (oldMenu) oldMenu.remove();
    authBtn.innerHTML = authT("guest");
    authBtn.classList.add("guest");
    authBtn.classList.remove("logged-in");
    authBtn.onclick = toggleAuthModal;
  } else {
    const oldMenu2 = document.getElementById("userMenu");
    if (oldMenu2) oldMenu2.remove();
    authBtn.innerHTML = authT("login");
    authBtn.classList.remove("logged-in", "guest");
    authBtn.onclick = toggleAuthModal;
  }
}

window.toggleUserMenu = function() {
  const menu = document.getElementById("userMenu");
  if (menu) menu.hidden = !menu.hidden;
};

// Close user menu when clicking outside
document.addEventListener("click", (e) => {
  const menu = document.getElementById("userMenu");
  const authBtn = document.getElementById("authBtn");
  if (menu && !menu.hidden && authBtn && !authBtn.contains(e.target) && !menu.contains(e.target)) {
    menu.hidden = true;
  }
});

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  updateAuthUI();
  window.location.reload();
}

function clearGuestData() {
  if (
    confirm(
      "هل أنت متأكد من حذف جميع سجلاتك المحلية؟ لا يمكن التراجع."
    )
  ) {
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(GUEST_HISTORY_KEY);
    updateAuthUI();
  }
}

function toggleAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.hidden = !modal.hidden;
  if (!modal.hidden) {
    updateAuthModalContent();
  }
}

function updateAuthModalContent() {
  const state = getAuthState();
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const authTabs = document.querySelector(".auth-tabs");
  const divider = document.querySelector(".auth-divider");
  const guestBtn = modal.querySelector(".btn-secondary");
  const guestNote = document.querySelector(".guest-note");

  // Remove existing logged-in panel if any
  const existingPanel = document.getElementById("loggedInPanel");
  if (existingPanel) existingPanel.remove();

  if (state.isLoggedIn) {
    // Hide forms, show user info + logout
    if (loginForm) loginForm.hidden = true;
    if (registerForm) registerForm.hidden = true;
    if (authTabs) authTabs.style.display = "none";
    if (divider) divider.style.display = "none";
    if (guestNote) guestNote.style.display = "none";

    const name = state.user?.displayName || state.user?.username || "مستخدم";
    const email = state.user?.email || "";

    const panel = document.createElement("div");
    panel.id = "loggedInPanel";
    panel.className = "auth-form";
    panel.style.display = "block";
    panel.innerHTML = `
      <div style="text-align:center; padding:1.5em 0;">
        <div style="font-size:3em; margin-bottom:0.5em;">👤</div>
        <h3 style="margin:0 0 0.25em;">${name}</h3>
        <p style="color:#6b7280; margin:0 0 1.5em;">${email}</p>
        <button class="btn btn-danger btn-large" onclick="logout()">تسجيل الخروج</button>
      </div>
    `;

    const modalContent = document.querySelector("#authModal .modal-content");
    modalContent.insertBefore(panel, authTabs);
  } else {
    // Show forms
    if (authTabs) authTabs.style.display = "";
    if (loginForm) loginForm.hidden = false;
    if (registerForm) registerForm.hidden = true;
    if (divider) divider.style.display = "";
    if (guestNote) guestNote.style.display = "";
  }
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.hidden = true;
  }
}

function initAuthTabs() {
  const tabs = document.querySelectorAll(".auth-tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".auth-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".auth-form")
        .forEach((f) => (f.hidden = true));
      tab.classList.add("active");
      const tabName = tab.getAttribute("data-tab");
      const form = document.getElementById(tabName + "Form");
      if (form) form.hidden = false;
    });
  });
}

function initAuthForms() {
  const loginForm = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = loginForm.querySelectorAll("input");
      const email = inputs[0].value;
      const password = inputs[1].value;
      const data = await login(email, password);
      if (data.success) {
        closeAuthModal();
      } else {
        alert(data.error || "خطأ في تسجيل الدخول");
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const inputs = registerForm.querySelectorAll("input");
      const username = inputs[0].value;
      const email = inputs[1].value;
      const password = inputs[2].value;
      const data = await register(username, email, password);
      if (data.success) {
        closeAuthModal();
      } else {
        alert(data.error || "خطأ في التسجيل");
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateAuthUI();
  initAuthTabs();
  initAuthForms();
});
