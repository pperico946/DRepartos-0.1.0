/* =========================
   MAIN.JS - FRONTEND DREPARTOS
========================= */

/* ----------------------
   BACKEND DINÁMICO
---------------------- */
const BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3003"
    : "https://drepartos.onrender.com";

/* ----------------------
   🔐 API KEY
---------------------- */
const API_KEY = "DRepartos090399202687yu654op987xyz";

/* =========================
   🔐 UTILIDADES AUTH
========================= */
function getStoredToken() {
  return (
    localStorage.getItem("admin_token") ||
    localStorage.getItem("empleado_token") ||
    localStorage.getItem("cliente_token")
  );
}

function clearTokens() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("empleado_token");
  localStorage.removeItem("cliente_token");
}

function getAuthHeaders() {
  const token = getStoredToken();
  const headers = { "x-api-key": API_KEY };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/* =========================
   THEME TOGGLE
========================= */
function toggleTheme() {
  const body = document.body;
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");
  const currentTheme = body.getAttribute("data-theme");

  if (currentTheme === "light") {
    body.setAttribute("data-theme", "dark");
    themeIcon.textContent = "☀️";
    themeText.textContent = "Claro";
    localStorage.setItem("theme", "dark");
  } else {
    body.setAttribute("data-theme", "light");
    themeIcon.textContent = "🌙";
    themeText.textContent = "Oscuro";
    localStorage.setItem("theme", "light");
  }
}

/* =========================
   MODAL ACCESO EMPRESA
========================= */
function openEmpresaModal() {
  const modal = document.getElementById("empresa-modal");
  if (modal) modal.style.display = "flex";
}

function closeEmpresaModal() {
  const modal = document.getElementById("empresa-modal");
  if (modal) modal.style.display = "none";

  const errorEl = document.getElementById("empresa-error");
  if (errorEl) errorEl.textContent = "";
}

/* =========================
   LOGIN EMPRESA
========================= */
async function loginEmpresa(event) {
  event.preventDefault();

  const email = document.getElementById("empresa-email")?.value.trim();
  const password = document.getElementById("empresa-password")?.value.trim();
  const errorEl = document.getElementById("empresa-error");

  if (!email || !password) {
    if (errorEl) errorEl.textContent = "Introduce usuario y contraseña";
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      if (errorEl)
        errorEl.textContent = data.error || "Credenciales incorrectas";
      return;
    }

    if (data.rol === "admin") {
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data));

      const token = data.token;
      if (!token) {
        if (errorEl) errorEl.textContent = "Error obteniendo token";
        return;
      }

      window.location.href = `${BACKEND_URL}/private/admin.html?token=${token}`;
    }

    else if (data.rol === "empleado") {
      localStorage.setItem("empleado_token", data.token);
      window.location.href = "/empleado.html";
    }

    else if (data.rol === "cliente") {
      localStorage.setItem("cliente_token", data.token);
      window.location.href = "/app/index.html";
    }

    else {
      if (errorEl) errorEl.textContent = "Acceso no autorizado";
    }

  } catch (err) {
    console.error(err);
    if (errorEl)
      errorEl.textContent = "Error conectando con el servidor";
  }
}

/* =========================
   DOM READY
========================= */
document.addEventListener("DOMContentLoaded", async () => {

  const navbar = document.getElementById("navbar");
  const empresaBtn = document.getElementById("empresa-btn");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const closeLoginBtn = document.getElementById("close-login");
  const loginForm = document.getElementById("login-form");

  /* ---- Cargar tema guardado ---- */
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);

  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  if (savedTheme === "dark") {
    if (themeIcon) themeIcon.textContent = "☀️";
    if (themeText) themeText.textContent = "Claro";
  } else {
    if (themeIcon) themeIcon.textContent = "🌙";
    if (themeText) themeText.textContent = "Oscuro";
  }

  /* ---- Verificar token ---- */
  const token = getStoredToken();
  if (token) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/verify`, {
        method: "GET",
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        clearTokens();
        console.log("Token inválido o expirado");
      }
    } catch {
      console.log("No se pudo verificar token");
    }
  }

  /* ---- Eventos botones ---- */
  empresaBtn?.addEventListener("click", openEmpresaModal);
  themeToggleBtn?.addEventListener("click", toggleTheme);
  closeLoginBtn?.addEventListener("click", closeEmpresaModal);
  loginForm?.addEventListener("submit", loginEmpresa);

  /* ---- Navbar Scroll ---- */
  window.addEventListener("scroll", () => {
    if (!navbar) return;
    if (window.scrollY > 50) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
  });

  /* ---- Cerrar modal clic fuera ---- */
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("empresa-modal");
    if (event.target === modal) closeEmpresaModal();
  });

  /* ---- Scroll Animations ---- */
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -100px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting)
        entry.target.classList.add("visible");
    });
  }, observerOptions);

  const fadeElements = document.querySelectorAll(
    ".feature-card, .partner-card, .roadmap-item"
  );

  fadeElements.forEach((el) => {
    el.classList.add("fade-in");
    observer.observe(el);
  });

  /* ---- Smooth Scroll ---- */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(
        this.getAttribute("href")
      );
      if (target)
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    });
  });

});
