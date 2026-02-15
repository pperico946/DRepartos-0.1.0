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
   VARIABLES GLOBALES
---------------------- */
const loginForm = document.querySelector(".login-form");
const empresaBtn = document.getElementById("empresa-btn");
const navbar = document.getElementById("navbar");

/* ----------------------
   THEME TOGGLE
---------------------- */
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

// Load saved theme
document.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme") || "dark";
  document.body.setAttribute("data-theme", savedTheme);
  const themeIcon = document.getElementById("theme-icon");
  const themeText = document.getElementById("theme-text");

  if (savedTheme === "dark") {
    themeIcon.textContent = "☀️";
    themeText.textContent = "Claro";
  } else {
    themeIcon.textContent = "🌙";
    themeText.textContent = "Oscuro";
  }

  // Validar token contra backend (no contra la ruta local)
  const token =
    localStorage.getItem("admin_token") ||
    localStorage.getItem("empleado_token") ||
    localStorage.getItem("cliente_token");

  if (!token) return;

  fetch(`${BACKEND_URL}/api/verify`, {
    headers: { Authorization: token }
  }).then((res) => {
    if (res.status === 403 || res.status === 401) {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("empleado_token");
      localStorage.removeItem("cliente_token");
    }
  }).catch(() => {
    console.log("No se pudo verificar token");
  });
});

/* ----------------------
   NAVBAR SCROLL
---------------------- */
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) {
    navbar?.classList.add("scrolled");
  } else {
    navbar?.classList.remove("scrolled");
  }
});

/* ----------------------
   MODAL ACCESO EMPRESA
---------------------- */
function openEmpresaModal() {
  document.getElementById("empresa-modal").style.display = "flex";
}

function closeEmpresaModal() {
  document.getElementById("empresa-modal").style.display = "none";
  const errorEl = document.getElementById("empresa-error");
  if (errorEl) errorEl.textContent = "";
}

// Close modal when clicking outside
window.addEventListener("click", (event) => {
  const modal = document.getElementById("empresa-modal");
  if (event.target === modal) closeEmpresaModal();
});

/* ----------------------
   LOGIN EMPRESA
---------------------- */
async function loginEmpresa(event) {
  event.preventDefault();

  const email = document.getElementById("empresa-email").value.trim();
  const password = document.getElementById("empresa-password").value.trim();
  const errorEl = document.getElementById("empresa-error");

  if (!email || !password) {
    errorEl.textContent = "Introduce usuario y contraseña";
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || "Error en login";
      return;
    }

    // Guardar token según rol y redirigir correctamente en GitHub Pages
    if (data.rol === "admin") {
      localStorage.setItem("admin_token", data.token);
      window.location.href = "admin.html";
    } else if (data.rol === "empleado") {
      localStorage.setItem("empleado_token", data.token);
      window.location.href = "empleado.html";
    } else if (data.rol === "cliente") {
      localStorage.setItem("cliente_token", data.token);
      window.location.href = "app/index.html";
    } else {
      errorEl.textContent = "Acceso no autorizado";
    }
  } catch (err) {
    console.error(err);
    errorEl.textContent = "Error conectando con el servidor";
  }
}

if (loginForm) loginForm.addEventListener("submit", loginEmpresa);

/* ----------------------
   BOTÓN ACCESO EMPRESA
---------------------- */
if (empresaBtn) {
  empresaBtn.style.padding = "0.5rem 1rem";
  empresaBtn.style.fontSize = "0.9rem";
  empresaBtn.style.borderRadius = "30px";
  empresaBtn.style.cursor = "pointer";
  empresaBtn.style.display = "inline-flex";
  empresaBtn.style.alignItems = "center";
}

/* ----------------------
   SCROLL ANIMATIONS
---------------------- */
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -100px 0px"
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, observerOptions);

document.addEventListener("DOMContentLoaded", () => {
  const fadeElements = document.querySelectorAll(
    ".feature-card, .partner-card, .roadmap-item"
  );
  fadeElements.forEach((el) => {
    el.classList.add("fade-in");
    observer.observe(el);
  });
});

/* ----------------------
   SMOOTH SCROLL
---------------------- */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target)
      target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
