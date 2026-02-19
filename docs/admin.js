/* =========================
   CONFIGURACIÓN BACKEND
========================= */
const BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3003"
    : "https://drepartos.onrender.com";

/* =========================
   TOKEN DESDE URL (IMPORTANTE)
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

if (!adminToken) {
  cerrarSesion();
}


document.addEventListener("DOMContentLoaded", () => {
  // Añadir token al CSS si no lo tiene
  document.querySelectorAll("link[rel='stylesheet']").forEach(link => {
    if (!link.href.includes("token=")) {
      link.href = link.href.split("?")[0] + `?token=${adminToken}`;
    }
  });

  // Añadir token al logo si existe
  const empresaLogo = document.getElementById("empresa-logo");
  if (empresaLogo && empresaLogo.src && !empresaLogo.src.includes("token=")) {
    empresaLogo.src = empresaLogo.src.split("?")[0] + `?token=${adminToken}`;
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
const empresaLogo = document.getElementById("empresa-logo");
const clientesContainer = document.getElementById("clientesContainer");
const clienteDetalleContainer = document.getElementById("clienteDetalleContainer");

/* =========================
   HELPER FETCH SEGURO
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
   CONFIGURAR UI EMPRESA
========================= */
if (adminData?.empresa) {
  if (empresaLogo) {
    empresaLogo.src =
      (adminData.empresa.logo_url || "logo-empresa.png") +
      `?token=${adminToken}`;
  }

  document.body.style.setProperty(
    "--color-primario",
    adminData.empresa.color_primario || "#1e40af"
  );
}

/* =========================
   FECHA Y HORA
========================= */
function actualizarPanelFechaHora() {
  const now = new Date();
  const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const meses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  const diaNumero = String(now.getDate()).padStart(2,"0");
  const diaSemana = diasSemana[now.getDay()];
  const mes = meses[now.getMonth()];
  const hora =
    String(now.getHours()).padStart(2,"0") + ":" +
    String(now.getMinutes()).padStart(2,"0") + ":" +
    String(now.getSeconds()).padStart(2,"0");

  document.getElementById("diaNumero").textContent = diaNumero;
  document.getElementById("diaSemana").textContent = diaSemana;
  document.getElementById("mes").textContent = mes;
  document.getElementById("horaActual").textContent = hora;
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
  if (!pedidos || pedidos.length === 0) {
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
    select.addEventListener("change", async () => {
      try {
        await fetchSeguro(
          `${BACKEND_URL}/api/admin/pedidos/${select.dataset.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ estado: select.value })
          }
        );
        cargarPedidos();
      } catch (err) {
        console.error(err);
      }
    });
  });

  document.querySelectorAll(".btn-eliminar").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Deseas eliminar este pedido?")) return;

      try {
        await fetchSeguro(
          `${BACKEND_URL}/api/admin/pedidos/${btn.dataset.id}`,
          { method: "DELETE" }
        );
        cargarPedidos();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

/* =========================
   TARJETAS RESUMEN
========================= */
function actualizarTarjetas(pedidos) {
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
    if (!adminData?.empresa?.id) {
      cerrarSesion();
      return;
    }

    const params = new URLSearchParams({
      empresaId: adminData.empresa.id
    });

    const res = await fetchSeguro(
      `${BACKEND_URL}/api/admin/pedidos?${params}`
    );

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
    listaPedidosTabla.innerHTML = "<p>Error cargando pedidos</p>";
  }
}

estadoFiltro?.addEventListener("change", cargarPedidos);

/* =========================
   CARGAR CLIENTES
========================= */
async function cargarClientes() {
  const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes`);
  const clientes = await res.json();

  const contenedor = document.getElementById("clientesContainer");
  const totalClientesEl = document.getElementById("totalClientes");

  totalClientesEl.textContent = clientes.length;

  if (!clientes.length) {
    contenedor.innerHTML = "<p>No hay clientes registrados</p>";
    return;
  }

  contenedor.innerHTML = clientes.map(c => `
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
}


function crearCliente() {
  alert("Aquí abrirá el formulario para crear cliente (lo implementamos ahora si quieres)");
}


/* =========================
   VISTA DETALLE CLIENTE
========================= */
async function abrirVistaCliente(clienteId) {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/clientes/${clienteId}`);
    const cliente = await res.json();

    // Historial de pedidos del cliente
    const pedidosRes = await fetchSeguro(`${BACKEND_URL}/api/admin/pedidos?empresaId=${adminData.empresa.id}&rol=cliente&usuarioId=${cliente.usuario_id}`);
    const pedidos = await pedidosRes.json();

    clienteDetalleContainer.innerHTML = `
      <div class="cliente-detalle">
        <h2>${cliente.nombre}</h2>
        <img src="${cliente.empresa.logo_url || 'logo-empresa.png'}" class="cliente-logo-detalle"/>
        <p>Email: ${cliente.usuario.email}</p>
        <p>Tel: ${cliente.telefono || '-'}</p>
        <p>Ref: ${cliente.ref_code}</p>
        ${cliente.notas ? `<p>Notas: ${cliente.notas}</p>` : ''}
        <h3>Historial de Pedidos</h3>
        <ul>
          ${pedidos.map(p => `<li>${formatFecha(p.fecha)} - ${p.pedido_final} [${p.estado}]</li>`).join('')}
        </ul>
      </div>
    `;
  } catch (err) {
    console.error("Error cargando detalle cliente:", err);
    clienteDetalleContainer.innerHTML = "<p>Error cargando información del cliente</p>";
  }
}

/* =========================
   INICIALIZAR
========================= */
cargarPedidos();
setInterval(cargarPedidos, 10000);

// Cargar clientes al inicio
cargarClientes();
setInterval(cargarClientes, 15000); // cada 15 segundos
