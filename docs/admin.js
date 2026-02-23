/* =========================
   CONFIGURACIÓN BACKEND
========================= */
let listaPedidosTabla,
  totalPedidosEl,
  recibidosEl,
  preparacionEl,
  listosEl,
  estadoFiltro,
  clienteContainer,
  clienteDetalleContainer;

let clienteGlobal = [];
let paginaActual = 1;
let filtroBusqueda = "";
let clienteEditandoId = null;

const clientePorPagina = 6;
const BACKEND_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3003"
    : "https://drepartos.onrender.com";

// ==========================
// TOKEN DESDE URL
// ==========================
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("token");

if (tokenFromUrl) {
  localStorage.setItem("admin_token", tokenFromUrl);
  window.history.replaceState({}, document.title, "/private/admin.html");
}

const adminToken = localStorage.getItem("admin_token");

// ==========================
// UTILIDADES FETCH PROTEGIDO
// ==========================
function getAuthHeaders() {
  const token = localStorage.getItem("admin_token");
  
  if (!token) {
    console.error("No hay token disponible");
    window.location.href = "/";
    throw new Error("No hay token de autenticación");
  }

  return {
    "Authorization": `Bearer ${token}`,
    "x-api-key": "DRepartos090399202687yu654op987xyz",
    "Content-Type": "application/json"
  };
}

async function fetchSeguro(url, options = {}) {
  const config = {
    ...options,
    headers: { ...getAuthHeaders(), ...(options.headers || {}) }
  };

  const res = await fetch(url, config);

  if (res.status === 401 || res.status === 403) {
    console.error("Token inválido o expirado");
    localStorage.removeItem("admin_token");
    alert("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
    window.location.href = "/";
    throw new Error("Token inválido");
  }

  return res;
}

// Verificar token al cargar
async function verificarAcceso() {
  const token = localStorage.getItem("admin_token");
  
  if (!token) {
    console.warn("No hay token, redirigiendo al login");
    window.location.href = "/";
    return;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "x-api-key": "DRepartos090399202687yu654op987xyz"
      }
    });

    if (!res.ok) {
      console.error("Token inválido al verificar acceso");
      localStorage.removeItem("admin_token");
      window.location.href = "/";
      return;
    }

  } catch (err) {
    console.error("Error al verificar token:", err);
    localStorage.removeItem("admin_token");
    window.location.href = "/";
  }
}

verificarAcceso();

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
        <td><div class="texto-original">${p.texto_original}</div></td>
        <td><div class="texto-original">${p.pedido_final}</div></td>
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
          method: "PATCH",
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
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/pedidos`);

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
   CARGAR CLIENTES
========================= */
async function cargarCliente() {
  try {
    console.log("📥 Cargando clientes...");
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/cliente`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Error response:", errorText);
      throw new Error("Error cliente");
    }

    const clientes = await res.json();
    console.log("✅ Clientes recibidos:", clientes);

    if (!Array.isArray(clientes)) {
      console.error("❌ La respuesta no es un array");
      return;
    }

    clienteGlobal = clientes;
    renderCliente();

  } catch (err) {
    console.error("❌ Error cargando clientes:", err);
    if (clienteContainer) {
      clienteContainer.innerHTML = `<p style="color: #ef4444;">Error cargando clientes: ${err.message}</p>`;
    }
  }
}

function renderCliente() {
  if (!clienteContainer) return;

  let filtrados = clienteGlobal.filter(c =>
    c.nombre.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(filtroBusqueda.toLowerCase())
  );

  const totalCliente = document.getElementById("totalCliente");
  if (totalCliente) totalCliente.innerText = filtrados.length;

  const inicio = (paginaActual - 1) * clientePorPagina;
  const fin = inicio + clientePorPagina;
  const clientePagina = filtrados.slice(inicio, fin);

  if (!clientePagina.length) {
    clienteContainer.innerHTML = "<p>No hay clientes</p>";
    return;
  }

  clienteContainer.innerHTML = clientePagina.map(c => `
    <div class="cliente-card">
      <h3>${c.nombre}</h3>
      <p><strong>Email:</strong> ${c.email || '-'}</p>
      <p><strong>Teléfono:</strong> ${c.telefono || '-'}</p>
      ${c.link_acceso ? `<p><small><strong>Link:</strong> <a href="${c.link_acceso}" target="_blank" style="color: var(--accent-primary);">Acceso directo</a></small></p>` : ''}
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn-editar" data-id="${c.id}">Editar</button>
        <button class="btn-eliminar-cliente" data-id="${c.id}">Eliminar</button>
      </div>
    </div>
  `).join("");

  document.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", () => {
      editarCliente(Number(btn.dataset.id));
    });
  });

  document.querySelectorAll(".btn-eliminar-cliente").forEach(btn => {
    btn.addEventListener("click", () => {
      eliminarCliente(Number(btn.dataset.id));
    });
  });

  renderPaginacion(filtrados.length);
}

function renderPaginacion(total) {
  const totalPaginas = Math.ceil(total / clientePorPagina);
  let html = `<div style="margin-top:20px; display:flex; gap:8px; justify-content:center;">`;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `
      <button 
        style="padding:8px 12px; border-radius:6px; cursor:pointer; ${i === paginaActual ? 'background:var(--accent-primary); color:white; font-weight:bold;' : 'background:var(--bg-secondary); color:var(--text-primary);'}" 
        onclick="cambiarPagina(${i})">
        ${i}
      </button>
    `;
  }

  html += `</div>`;
  clienteContainer.innerHTML += html;
}

function cambiarPagina(pagina) {
  paginaActual = pagina;
  renderCliente();
}

/* =========================
   EDITAR CLIENTE
========================= */
async function editarCliente(id) {
  const cliente = clienteGlobal.find(c => c.id === id);
  if (!cliente) return;

  clienteEditandoId = id;

  document.getElementById("nuevoNombre").value = cliente.nombre;
  document.getElementById("nuevoEmail").value = cliente.email || "";
  document.getElementById("nuevoEmail").disabled = true; // No permitir cambiar email
  document.getElementById("nuevoTelefono").value = cliente.telefono || "";
  document.getElementById("nuevoDireccion").value = cliente.direccion || "";
  document.getElementById("nuevoNotas").value = cliente.notas || "";
  
  document.getElementById("tituloModalCliente").textContent = "Editar Cliente";
  document.getElementById("btnSubmitCliente").textContent = "Guardar Cambios";
  document.getElementById("modalCrearCliente").style.display = "flex";
}

/* =========================
   ELIMINAR CLIENTE
========================= */
async function eliminarCliente(id) {
  if (!confirm("¿Seguro que quieres eliminar este cliente?")) return;

  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/cliente/${id}`, { 
      method: "DELETE" 
    });
    
    if (!res.ok) throw new Error("Error eliminando");
    
    alert("Cliente eliminado correctamente");
    cargarCliente();
  } catch (err) {
    console.error("❌ Error eliminando cliente:", err);
    alert("Error eliminando cliente");
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
  clienteContainer = document.getElementById("clienteContainer");
  clienteDetalleContainer = document.getElementById("clienteDetalle");

  actualizarPanelFechaHora();

  estadoFiltro?.addEventListener("change", cargarPedidos);

  const modal = document.getElementById("modalCrearCliente");
  const btnCrear = document.getElementById("btnCrearCliente");
  const cerrarBtn = document.getElementById("cerrarModalCliente");
  const form = document.getElementById("formCrearCliente");
  const buscador = document.getElementById("buscadorCliente");

  buscador?.addEventListener("input", (e) => {
    filtroBusqueda = e.target.value;
    paginaActual = 1;
    renderCliente();
  });

  btnCrear?.addEventListener("click", () => {
    // Resetear form para crear nuevo
    clienteEditandoId = null;
    document.getElementById("nuevoEmail").disabled = false;
    document.getElementById("tituloModalCliente").textContent = "Crear Nuevo Cliente";
    document.getElementById("btnSubmitCliente").textContent = "Crear Cliente";
    modal.style.display = "flex";
  });

  cerrarBtn?.addEventListener("click", () => {
    modal.style.display = "none";
    form.reset();
    clienteEditandoId = null;
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre = document.getElementById("nuevoNombre").value.trim();
    const email = document.getElementById("nuevoEmail").value.trim();
    const telefono = document.getElementById("nuevoTelefono").value.trim();
    const direccion = document.getElementById("nuevoDireccion").value.trim();
    const notas = document.getElementById("nuevoNotas").value.trim();

    if (!nombre || !email) {
      alert("Nombre y email son obligatorios");
      return;
    }

    try {
      if (clienteEditandoId) {
        // EDITAR
        const res = await fetchSeguro(`${BACKEND_URL}/api/admin/cliente/${clienteEditandoId}`, {
          method: "PUT",
          body: JSON.stringify({ nombre, telefono, direccion, notas })
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Error editando cliente");
        }
        
        alert("Cliente actualizado correctamente");
        clienteEditandoId = null;
      } else {
        // CREAR NUEVO
        const res = await fetchSeguro(`${BACKEND_URL}/api/admin/cliente`, {
          method: "POST",
          body: JSON.stringify({ nombre, email, telefono, direccion, notas })
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Error creando cliente");
        }

        const data = await res.json();
        alert(`Cliente creado correctamente.\nContraseña temporal: ${data.passwordTemporal}\nLink de acceso: ${data.linkAcceso}`);
      }

      modal.style.display = "none";
      form.reset();
      cargarCliente();
    } catch (err) {
      console.error("❌ Error guardando cliente:", err);
      alert("Error guardando cliente: " + err.message);
    }
  });

  /* =========================
   NAVEGACIÓN SIDEBAR
  ========================= */
  document.querySelectorAll(".sidebar li").forEach(item => {
    item.addEventListener("click", () => {
      // Quitar active
      document.querySelectorAll(".sidebar li")
        .forEach(li => li.classList.remove("active"));

      item.classList.add("active");

      const seccion = item.dataset.seccion;

      const seccionPedidos = document.getElementById("seccionPedidos");
      const seccionCliente = document.getElementById("seccionCliente");

      if (seccionPedidos) seccionPedidos.style.display = "none";
      if (seccionCliente) seccionCliente.style.display = "none";

      if (seccion === "pedidos") {
        seccionPedidos.style.display = "block";
        document.getElementById("mainTitle").innerHTML =
          "<span>📦</span><span>Gestión de Pedidos</span>";
        cargarPedidos();
      }

      if (seccion === "cliente") {
        seccionCliente.style.display = "block";
        document.getElementById("mainTitle").innerHTML =
          "<span>👥</span><span>Gestión de Clientes</span>";
        cargarCliente();
      }
    });
  });

  // Cargar datos iniciales
  cargarPedidos();
  
  // Actualizar periódicamente
  setInterval(cargarPedidos, 30000); // Cada 30 segundos
});