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
  localStorage.removeItem("usuario");
}

function getAuthHeaders() {
  const token = getStoredToken();
  const headers = { "x-api-key": API_KEY, "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/* =========================
   FETCH SEGURO
========================= */
async function fetchSeguro(url, options = {}) {
  const config = {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) },
  };

  const res = await fetch(url, config);

  if (res.status === 401 || res.status === 403) {
    clearTokens();
    throw new Error("Sesión expirada o no autorizada");
  }

  return res;
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
    if (themeIcon) themeIcon.textContent = "☀️";
    if (themeText) themeText.textContent = "Claro";
    localStorage.setItem("theme", "dark");
  } else {
    body.setAttribute("data-theme", "light");
    if (themeIcon) themeIcon.textContent = "🌙";
    if (themeText) themeText.textContent = "Oscuro";
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
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      if (errorEl) errorEl.textContent = data.error || "Credenciales incorrectas";
      return;
    }

    // Guardar token y usuario según rol
    if (data.rol === "admin") {
      localStorage.setItem("admin_token", data.token);
      localStorage.setItem("usuario", JSON.stringify(data));
      window.location.href = `${BACKEND_URL}/private/admin.html?token=${data.token}`;
    } else if (data.rol === "empleado") {
      localStorage.setItem("empleado_token", data.token);
      window.location.href = `${BACKEND_URL}/private/empleado.html`;
    } else if (data.rol === "cliente") {
      localStorage.setItem("cliente_token", data.token);
      window.location.href = `${BACKEND_URL}/app/index.html`;
    } else {
      if (errorEl) errorEl.textContent = "Acceso no autorizado";
    }
  } catch (err) {
    console.error(err);
    if (errorEl) errorEl.textContent = "Error conectando con el servidor";
  }
}

/* =========================
   VERIFICAR TOKEN EN CARGA
========================= */
async function verificarToken() {
  const token = getStoredToken();
  if (!token) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/verify`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    if (!res.ok) clearTokens();
  } catch {
    console.log("No se pudo verificar token");
  }
}

/* =========================
   CLIENTES - VARIABLES GLOBALES
========================= */
let clientesContainer;
let clientesGlobal = [];
let paginaActual = 1;
const clientesPorPagina = 6;
let filtroBusqueda = "";
let clienteEditandoId = null;

/* =========================
   CLIENTES - FUNCIONES
========================= */
async function cargarClientes() {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes`);
    if (!res.ok) throw new Error("Error cargando clientes");

    const clientes = await res.json();
    clientesGlobal = Array.isArray(clientes) ? clientes : [];
    renderClientes();
  } catch (err) {
    console.error("Error cargando clientes:", err);
    if (clientesContainer) clientesContainer.innerHTML = "<p>Error cargando clientes</p>";
  }
}

function renderClientes() {
  if (!clientesContainer) return;

  let filtrados = clientesGlobal.filter(c =>
    c.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
    (c.usuario?.email || "").toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  const inicio = (paginaActual - 1) * clientesPorPagina;
  const fin = inicio + clientesPorPagina;
  const clientesPagina = filtrados.slice(inicio, fin);

  if (!clientesPagina.length) {
    clientesContainer.innerHTML = "<p>No hay clientes</p>";
    return;
  }

  clientesContainer.innerHTML = clientesPagina.map(c => `
    <div class="cliente-card">
      <h3>${c.nombre}</h3>
      <p>Email: ${c.usuario?.email || '-'}</p>
      <p>Tel: ${c.telefono || '-'}</p>
      <p>Dirección: ${c.direccion || '-'}</p>
      <p>Notas: ${c.notas || '-'}</p>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button onclick="editarCliente(${c.id})">Editar</button>
        <button onclick="eliminarCliente(${c.id})">Eliminar</button>
      </div>
    </div>
  `).join("");

  renderPaginacion(filtrados.length);
}

function renderPaginacion(total) {
  const totalPaginas = Math.ceil(total / clientesPorPagina);
  let html = `<div style="margin-top:20px; display:flex; gap:8px;">`;
  for (let i = 1; i <= totalPaginas; i++) {
    html += `<button style="${i === paginaActual ? 'font-weight:bold;' : ''}" onclick="cambiarPagina(${i})">${i}</button>`;
  }
  html += `</div>`;
  clientesContainer.innerHTML += html;
}

function cambiarPagina(pagina) {
  paginaActual = pagina;
  renderClientes();
}

async function editarCliente(id) {
  const cliente = clientesGlobal.find(c => c.id === id);
  if (!cliente) return;
  console.log("Editar cliente:", cliente);
  // Aquí se puede abrir un modal para edición si se desea
}

async function eliminarCliente(id) {
  if (!confirm("¿Seguro que quieres eliminar este cliente?")) return;

  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error eliminando cliente");
    cargarClientes();
  } catch (err) {
    console.error(err);
    alert("Error eliminando cliente");
  }
}

/* =========================
   INICIALIZACIÓN DOM
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  const navbar = document.getElementById("navbar");
  const empresaBtn = document.getElementById("empresa-btn");
  const themeToggleBtn = document.getElementById("theme-toggle");
  const closeLoginBtn = document.getElementById("close-login");
  const loginForm = document.querySelector(".login-form");

  clientesContainer = document.getElementById("clientesContainer");
  const buscador = document.getElementById("buscadorClientes");

  // ---- Tema guardado ----
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

  // ---- Verificar token existente ----
  await verificarToken();

  // ---- Eventos ----
  empresaBtn?.addEventListener("click", openEmpresaModal);
  themeToggleBtn?.addEventListener("click", toggleTheme);
  closeLoginBtn?.addEventListener("click", closeEmpresaModal);
  loginForm?.addEventListener("submit", loginEmpresa);
  buscador?.addEventListener("input", (e) => {
    filtroBusqueda = e.target.value;
    paginaActual = 1;
    renderClientes();
  });

  // ---- Navbar scroll ----
  window.addEventListener("scroll", () => {
    if (!navbar) return;
    navbar.classList.toggle("scrolled", window.scrollY > 50);
  });

  // ---- Cerrar modal clic fuera ----
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("empresa-modal");
    if (event.target === modal) closeEmpresaModal();
  });

  // ---- Scroll animations ----
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -100px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, observerOptions);
  const fadeElements = document.querySelectorAll(".feature-card, .partner-card, .roadmap-item");
  fadeElements.forEach((el) => {
    el.classList.add("fade-in");
    observer.observe(el);
  });

  // ---- Smooth scroll ----
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute("href"));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  // ---- Cargar clientes automáticamente si existe contenedor ----
  if (clientesContainer) cargarClientes();
});
