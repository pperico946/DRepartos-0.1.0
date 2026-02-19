/* =========================
   CONFIGURACIÓN BACKEND
========================= */
const BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3003"
    : "https://drepartos.onrender.com";

/* =========================
   TOKEN DESDE URL
========================= */
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("token");

if (tokenFromUrl) {
  localStorage.setItem("admin_token", tokenFromUrl);
}

let adminToken = localStorage.getItem("admin_token");
let adminData = JSON.parse(localStorage.getItem("usuario") || "null");

function cerrarSesion() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("usuario");
  window.location.href = "/";
}

if (!adminToken) cerrarSesion();

/* =========================
   DOM READY
========================= */
document.addEventListener("DOMContentLoaded", () => {

  // Añadir token al CSS
  document.querySelectorAll("link[rel='stylesheet']").forEach(link => {
    if (!link.href.includes("token=")) {
      link.href = link.href.split("?")[0] + `?token=${adminToken}`;
    }
  });

  // Logo empresa
  const empresaLogo = document.getElementById("empresa-logo");
  if (empresaLogo && empresaLogo.src && !empresaLogo.src.includes("token=")) {
    empresaLogo.src = empresaLogo.src.split("?")[0] + `?token=${adminToken}`;
  }

  // Botón crear cliente (SIN inline JS)
  const btnCrear = document.getElementById("btnCrearCliente");
  if (btnCrear) {
    btnCrear.addEventListener("click", crearCliente);
  }

});

/* =========================
   ELEMENTOS DOM
========================= */
const listaPedidosTabla = document.getElementById("pedidosTabla");
const totalPedidosEl = document.getElementById("totalPedidos");
const recibidosEl = document.getElementById("recibidos");
const preparacionEl = document.getElementById("preparacion");
const listosEl = document.getElementById("listos");
const estadoFiltro = document.getElementById("estadoFiltro");
const clientesContainer = document.getElementById("clientesContainer");
const clienteDetalleContainer = document.getElementById("clienteDetalle"); // ✅ FIX AQUÍ

/* =========================
   FETCH SEGURO
========================= */
async function fetchSeguro(url, options = {}) {
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${adminToken}`,
      ...(options.headers || {})
    }
  };

  const res = await fetch(url, config);

  if (res.status === 401 || res.status === 403) {
    cerrarSesion();
    throw new Error("Sesión expirada");
  }

  return res;
}

/* =========================
   FECHA Y HORA
========================= */
function actualizarPanelFechaHora() {
  const now = new Date();
  const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  document.getElementById("diaNumero").textContent = String(now.getDate()).padStart(2,"0");
  document.getElementById("diaSemana").textContent = diasSemana[now.getDay()];
  document.getElementById("mes").textContent = meses[now.getMonth()];
  document.getElementById("horaActual").textContent =
    String(now.getHours()).padStart(2,"0") + ":" +
    String(now.getMinutes()).padStart(2,"0") + ":" +
    String(now.getSeconds()).padStart(2,"0");
}

setInterval(actualizarPanelFechaHora, 1000);
actualizarPanelFechaHora();

/* =========================
   FORMATEAR FECHA
========================= */
function formatFecha(fechaStr) {
  return new Date(fechaStr).toLocaleString();
}

/* =========================
   RENDER TABLA PEDIDOS
========================= */
function renderTablaPedidos(pedidos) {

  if (!Array.isArray(pedidos) || pedidos.length === 0) {
    listaPedidosTabla.innerHTML = "<p>No hay pedidos</p>";
    return;
  }

  let html = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Fecha</th>
          <th>Texto original</th>
          <th>Pedido final</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
  `;

  pedidos.forEach(p => {
    html += `
      <tr class="${p.estado}">
        <td>${p.id}</td>
        <td>${formatFecha(p.fecha)}</td>
        <td><div>${p.texto_original}</div></td>
        <td><div>${p.pedido_final}</div></td>
        <td>
          <select class="estado-select" data-id="${p.id}">
            <option value="recibido" ${p.estado === "recibido" ? "selected" : ""}>Recibido</option>
            <option value="procesando" ${p.estado === "procesando" ? "selected" : ""}>Procesando</option>
            <option value="enviado" ${p.estado === "enviado" ? "selected" : ""}>Enviado</option>
            <option value="entregado" ${p.estado === "entregado" ? "selected" : ""}>Entregado</option>
            <option value="cancelado" ${p.estado === "cancelado" ? "selected" : ""}>Cancelado</option>
          </select>
        </td>
        <td>
          <button class="btn-eliminar" data-id="${p.id}">Eliminar</button>
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  listaPedidosTabla.innerHTML = html;
}

/* =========================
   TARJETAS RESUMEN
========================= */
function actualizarTarjetas(pedidos) {
  if (!Array.isArray(pedidos)) return;

  totalPedidosEl.textContent = pedidos.length;
  recibidosEl.textContent = pedidos.filter(p => p.estado === "recibido").length;
  preparacionEl.textContent = pedidos.filter(p => p.estado === "procesando").length;
  listosEl.textContent = pedidos.filter(p => p.estado === "enviado").length;
}

/* =========================
   CARGAR PEDIDOS
========================= */
async function cargarPedidos() {
  try {
    if (!adminData?.empresa?.id) return cerrarSesion();

    const res = await fetchSeguro(
      `${BACKEND_URL}/api/admin/pedidos?empresaId=${adminData.empresa.id}`
    );

    if (!res.ok) throw new Error("Error servidor pedidos");

    const pedidos = await res.json();

    if (!Array.isArray(pedidos)) return;

    const filtro = estadoFiltro?.value;
    const pedidosFiltrados =
      !filtro || filtro === "todos"
        ? pedidos
        : pedidos.filter(p => p.estado === filtro);

    renderTablaPedidos(pedidosFiltrados);
    actualizarTarjetas(pedidos);

  } catch (err) {
    console.error("Error cargando pedidos:", err);
    listaPedidosTabla.innerHTML = "<p>Error cargando pedidos</p>";
  }
}

estadoFiltro?.addEventListener("change", cargarPedidos);

/* =========================
   CARGAR CLIENTES
========================= */
async function cargarClientes() {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes`);

    if (!res.ok) throw new Error("Error servidor clientes");

    const clientes = await res.json();

    if (!Array.isArray(clientes)) {
      console.error("Clientes no es array:", clientes);
      clientesContainer.innerHTML = "<p>Error cargando clientes</p>";
      return;
    }

    if (!clientes.length) {
      clientesContainer.innerHTML = "<p>No hay clientes registrados</p>";
      return;
    }

    clientesContainer.innerHTML = clientes.map(c => `
      <div class="cliente-card" data-id="${c.id}">
        <h3>${c.nombre}</h3>
        <p>Email: ${c.usuario?.email || '-'}</p>
        <p>Tel: ${c.telefono || '-'}</p>
        <p>Ref: ${c.ref_code || '-'}</p>
      </div>
    `).join("");

    document.querySelectorAll(".cliente-card").forEach(card => {
      card.addEventListener("click", () => {
        abrirVistaCliente(card.dataset.id);
      });
    });

  } catch (err) {
    console.error("Error cargando clientes:", err);
    clientesContainer.innerHTML = "<p>Error cargando clientes</p>";
  }
}

/* =========================
   CREAR CLIENTE
========================= */
function crearCliente() {
  alert("Formulario crear cliente (lo implementamos después si quieres)");
}

/* =========================
   DETALLE CLIENTE
========================= */
async function abrirVistaCliente(clienteId) {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes/${clienteId}`);

    if (!res.ok) throw new Error("Error detalle cliente");

    const cliente = await res.json();

    const pedidosRes = await fetchSeguro(
      `${BACKEND_URL}/api/admin/pedidos?empresaId=${adminData.empresa.id}&usuarioId=${cliente.usuario_id}`
    );

    const pedidos = await pedidosRes.json();

    clienteDetalleContainer.innerHTML = `
      <div class="cliente-detalle">
        <h2>${cliente.nombre}</h2>
        <p>Email: ${cliente.usuario?.email || '-'}</p>
        <p>Tel: ${cliente.telefono || '-'}</p>
        <p>Ref: ${cliente.ref_code || '-'}</p>
        ${cliente.notas ? `<p>Notas: ${cliente.notas}</p>` : ''}
        <h3>Historial de Pedidos</h3>
        <ul>
          ${
            Array.isArray(pedidos)
              ? pedidos.map(p =>
                  `<li>${formatFecha(p.fecha)} - ${p.pedido_final} [${p.estado}]</li>`
                ).join('')
              : "<li>No hay pedidos</li>"
          }
        </ul>
      </div>
    `;

  } catch (err) {
    console.error("Error detalle cliente:", err);
    clienteDetalleContainer.innerHTML = "<p>Error cargando información del cliente</p>";
  }
}

/* =========================
   INICIALIZAR
========================= */
cargarPedidos();
setInterval(cargarPedidos, 10000);

cargarClientes();
setInterval(cargarClientes, 15000);
