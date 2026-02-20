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
   ELEMENTOS DOM (se asignan después)
========================= */
let listaPedidosTabla,
  totalPedidosEl,
  recibidosEl,
  preparacionEl,
  listosEl,
  estadoFiltro,
  clientesContainer,
  clienteDetalleContainer;

let clientesGlobal = [];
let paginaActual = 1;
const clientesPorPagina = 6;
let filtroBusqueda = "";
let clienteEditandoId = null;

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

  const diaNumero = document.getElementById("diaNumero");
  const diaSemana = document.getElementById("diaSemana");
  const mes = document.getElementById("mes");
  const horaActual = document.getElementById("horaActual");

  if (!diaNumero) return;

  diaNumero.textContent = String(now.getDate()).padStart(2,"0");
  diaSemana.textContent = diasSemana[now.getDay()];
  mes.textContent = meses[now.getMonth()];
  horaActual.textContent =
    String(now.getHours()).padStart(2,"0") + ":" +
    String(now.getMinutes()).padStart(2,"0") + ":" +
    String(now.getSeconds()).padStart(2,"0");
}

setInterval(actualizarPanelFechaHora, 1000);

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
  if (!listaPedidosTabla) return;

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

  document.querySelectorAll(".estado-select").forEach(select => {
    select.addEventListener("change", async (e) => {
      const pedidoId = e.target.dataset.id;
      const nuevoEstado = e.target.value;
      try {
        await fetchSeguro(`${BACKEND_URL}/api/admin/pedidos/${pedidoId}`, {
          method: "PUT",
          body: JSON.stringify({ estado: nuevoEstado })
        });
        cargarPedidos();
      } catch (err) {
        console.error(err);
        alert("Error actualizando estado");
      }
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (!confirm("¿Seguro que quieres eliminar este pedido?")) return;
      try {
        await fetchSeguro(`${BACKEND_URL}/api/admin/pedidos/${id}`, { method: "DELETE" });
        cargarPedidos();
      } catch (err) {
        console.error(err);
        alert("Error eliminando pedido");
      }
    });
  });
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
    if (!adminData?.empresa?.id) return;

    const res = await fetchSeguro(
      `${BACKEND_URL}/api/admin/pedidos?empresaId=${adminData.empresa.id}`
    );

    if (!res.ok) throw new Error("Error pedidos");

    const pedidos = await res.json();

    const filtro = estadoFiltro?.value;
    const pedidosFiltrados =
      !filtro || filtro === "todos"
        ? pedidos
        : pedidos.filter(p => p.estado === filtro);

    renderTablaPedidos(pedidosFiltrados);
    actualizarTarjetas(pedidos);

  } catch (err) {
    console.error("Error cargando pedidos:", err);
  }
}

/* =========================
   PANEL DE HERRAMIENTAS CLIENTES
========================= */
function abrirBarraHerramientasClientes() {
  const barra = document.getElementById("barra-herramientas-clientes");
  if (!barra) return;

  barra.style.display = barra.style.display === "flex" ? "none" : "flex";
}

function crearClienteDesdeBarra() {
  // Reset modal
  clienteEditandoId = null;
  document.getElementById("nuevoNombre").value = "";
  document.getElementById("nuevoEmail").value = "";
  document.getElementById("nuevoTelefono").value = "";
  document.getElementById("nuevoDireccion").value = "";
  document.getElementById("nuevoNotas").value = "";

  document.getElementById("btnSubmitCliente").textContent = "Crear Cliente";
  document.getElementById("modalCrearCliente").style.display = "flex";
}

/* =========================
   INICIALIZACIÓN PANEL CLIENTES
========================= */
document.addEventListener("DOMContentLoaded", () => {
  const btnAbrirBarraClientes = document.getElementById("btn-sidebar-clientes");
  const btnAñadirCliente = document.getElementById("btn-crear-cliente-barra");

  btnAbrirBarraClientes?.addEventListener("click", abrirBarraHerramientasClientes);
  btnAñadirCliente?.addEventListener("click", crearClienteDesdeBarra);
});


/* =========================
   CARGAR CLIENTES
========================= */
async function cargarClientes() {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes`);
    if (!res.ok) throw new Error("Error clientes");

    const clientes = await res.json();

    if (!Array.isArray(clientes)) return;

    clientesGlobal = clientes;
    renderClientes();

  } catch (err) {
    console.error("Error cargando clientes:", err);
  }
}

function renderClientes() {
  if (!clientesContainer) return;

  let filtrados = clientesGlobal.filter(c =>
    c.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
    (c.usuario?.email || "").toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  const totalClientes = document.getElementById("totalClientes");
  if (totalClientes) totalClientes.innerText = filtrados.length;

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
    html += `
      <button style="${i === paginaActual ? 'font-weight:bold;' : ''}" onclick="cambiarPagina(${i})">
        ${i}
      </button>
    `;
  }

  html += `</div>`;
  clientesContainer.innerHTML += html;
}

function cambiarPagina(pagina) {
  paginaActual = pagina;
  renderClientes();
}

/* =========================
   DETALLE CLIENTE
========================= */
async function abrirVistaCliente(clienteId) {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes/${clienteId}`);
    if (!res.ok) throw new Error("Error detalle");

    const cliente = await res.json();

    clienteDetalleContainer.innerHTML = `
      <div class="cliente-detalle">
        <h2>${cliente.nombre}</h2>
        <p>Email: ${cliente.usuario?.email || '-'}</p>
        <p>Tel: ${cliente.telefono || '-'}</p>
        ${cliente.notas ? `<p>Notas: ${cliente.notas}</p>` : ''}
      </div>
    `;
  } catch (err) {
    console.error(err);
  }
}

async function editarCliente(id) {
  const cliente = clientesGlobal.find(c => c.id === id);
  if (!cliente) return;

  clienteEditandoId = id;

  document.getElementById("nuevoNombre").value = cliente.nombre;
  document.getElementById("nuevoEmail").value = cliente.usuario?.email || "";
  document.getElementById("nuevoTelefono").value = cliente.telefono || "";
  document.getElementById("nuevoDireccion").value = cliente.direccion || "";
  document.getElementById("nuevoNotas").value = cliente.notas || "";
  
  document.getElementById("btnSubmitCliente").textContent = "Guardar Cambios";
  document.getElementById("modalCrearCliente").style.display = "flex";
}

async function eliminarCliente(id) {
  if (!confirm("¿Seguro que quieres eliminar este cliente?")) return;

  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Error eliminando");
    cargarClientes();
  } catch (err) {
    console.error(err);
  }
}

/* =========================
   INICIALIZACIÓN GENERAL
========================= */
document.addEventListener("DOMContentLoaded", () => {
  listaPedidosTabla = document.getElementById("pedidosTabla");
  totalPedidosEl = document.getElementById("totalPedidos");
  recibidosEl = document.getElementById("recibidos");
  preparacionEl = document.getElementById("preparacion");
  listosEl = document.getElementById("listos");
  estadoFiltro = document.getElementById("estadoFiltro");
  clientesContainer = document.getElementById("clientesContainer");
  clienteDetalleContainer = document.getElementById("clienteDetalle");

  actualizarPanelFechaHora();

  estadoFiltro?.addEventListener("change", cargarPedidos);

  const modal = document.getElementById("modalCrearCliente");
  const btnCrear = document.getElementById("btnCrearCliente");
  const cerrarBtn = document.getElementById("cerrarModalCliente");
  const form = document.getElementById("formCrearCliente");
  const buscador = document.getElementById("buscadorClientes");

  buscador?.addEventListener("input", (e) => {
    filtroBusqueda = e.target.value;
    paginaActual = 1;
    renderClientes();
  });

  btnCrear?.addEventListener("click", () => modal.style.display = "flex");
  cerrarBtn?.addEventListener("click", () => modal.style.display = "none");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nuevoNombre").value;
    const email = document.getElementById("nuevoEmail").value;
    const telefono = document.getElementById("nuevoTelefono").value;
    const direccion = document.getElementById("nuevoDireccion").value;
    const notas = document.getElementById("nuevoNotas").value;

    try {
      if (clienteEditandoId) {
        const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes/${clienteEditandoId}`, {
          method: "PUT",
          body: JSON.stringify({ nombre, telefono, direccion, notas })
        });
        if (!res.ok) throw new Error("Error editando cliente");
        clienteEditandoId = null;
      } else {
        const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes`, {
          method: "POST",
          body: JSON.stringify({ nombre, email, telefono, direccion, notas, empresaId: adminData.empresa.id })
        });
        if (!res.ok) throw new Error("Error creando cliente");
      }

      modal.style.display = "none";
      form.reset();
      cargarClientes();
    } catch (err) {
      console.error("Error guardando cliente:", err);
      alert("Error guardando cliente");
    }
  });

  cargarPedidos();
  cargarClientes();

  setInterval(cargarPedidos, 10000);
  setInterval(cargarClientes, 15000);
});
