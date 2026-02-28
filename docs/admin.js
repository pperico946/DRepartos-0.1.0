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

     cargarDatosEmpresa();

  } catch (err) {
    console.error("Error al verificar token:", err);
    localStorage.removeItem("admin_token");
    window.location.href = "/";
  }
}

verificarAcceso();

async function cargarDatosEmpresa() {
  try {
    const usuarioData = localStorage.getItem("usuario");
    if (usuarioData) {
      const usuario = JSON.parse(usuarioData);
      const logoUrl = usuario?.empresa?.logo_url;
      const logoEl  = document.getElementById("empresa-logo");
      if (logoEl) {
        if (logoUrl) {
          logoEl.src    = logoUrl;
          logoEl.alt    = usuario?.empresa?.nombre || "Logo empresa";
          logoEl.onerror = () => { logoEl.style.display = "none"; };
        } else {
          logoEl.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ No se pudieron cargar datos de empresa:", err);
  }
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
          <th>ID Pedido</th>
          <th>Cliente</th>          
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
    const clienteUuid  = p.cliente_uuid
      ? p.cliente_uuid.split("-")[0].toUpperCase()  // ej: "E5CFFD94"
      : "—";
    const clienteNombre = p.cliente_nombre || "Cliente desconocido";
    html += `
      <tr class="${p.estado}">
        <td>
          <span style="
            font-family: monospace;
            font-size: 0.8rem;
            color: var(--accent-primary);
            background: rgba(0,180,216,0.1);
            padding: 2px 6px;
            border-radius: 4px;
          ">#${p.id}</span>
        </td>
        <td>
          <!-- ✅ AÑADIDO: nombre + UUID corto del cliente -->
          <div>
            <strong style="display:block; font-size:0.9rem;">
              ${clienteNombre}
            </strong>
            <span style="
              font-family: monospace;
              font-size: 0.72rem;
              color: var(--text-secondary);
            ">${clienteUuid}</span>
          </div>
        </td>
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

/* =========================
   RENDER CLIENTES
========================= */
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

  clienteContainer.innerHTML = `
    <div class="cliente-grid">
      ${clientePagina.map(c => `
        <div class="cliente-card" data-cliente-id="${c.id}">
          <div class="cliente-info-grid">
            <div class="cliente-info-item">
              <span>Nombre</span>
              <strong>${c.nombre}</strong>
            </div>
            <div class="cliente-info-item">
              <span>Email</span>
              <strong>${c.email || '-'}</strong>
            </div>
            <div class="cliente-info-item">
              <span>Teléfono</span>
              <strong>${c.telefono || '-'}</strong>
            </div>
            ${c.direccion ? `
              <div class="cliente-info-item">
                <span>Dirección</span>
                <strong>${c.direccion}</strong>
              </div>
            ` : ''}
            ${c.link_acceso ? `
              <div class="cliente-info-item">
                <span>Link de Acceso</span>
                <a href="${c.link_acceso}" target="_blank" style="color: var(--accent-primary); word-break: break-all; font-size: 0.85rem;">🔗 Acceso directo</a>
              </div>
            ` : ''}
          </div>
          <div class="cliente-acciones">
            <button class="btn-ver-detalle" data-id="${c.id}">
              👁️ Ver Detalle
            </button>
            <button class="btn-editar" data-id="${c.id}">
              ✏️ Editar
            </button>
            <button class="btn-eliminar-cliente" data-id="${c.id}">
              🗑️ Eliminar
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

document.querySelectorAll('.cliente-card').forEach(card => {
  const clienteId = String(card.dataset.clienteId); // ← era parseInt
  
  card.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;
    abrirVistaCliente(clienteId);
  });
});

document.querySelectorAll('.btn-ver-detalle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = String(btn.dataset.id); // ← era parseInt
    abrirVistaCliente(id);
  });
});

document.querySelectorAll('.btn-editar').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = String(btn.dataset.id); // ← era parseInt
    editarCliente(id);
  });
});

document.querySelectorAll('.btn-eliminar-cliente').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = String(btn.dataset.id); // ← era parseInt
    eliminarCliente(id);
  });
});

  renderPaginacion(filtrados.length);
}

/* =========================
   PAGINACIÓN
========================= */
function renderPaginacion(total) {
  const totalPaginas = Math.ceil(total / clientePorPagina);
  if (totalPaginas <= 1) return;

  let html = `<div class="paginacion">`;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `
      <button 
        class="btn-pagina ${i === paginaActual ? 'active' : ''}" 
        data-pagina="${i}">
        ${i}
      </button>
    `;
  }

  html += `</div>`;
  clienteContainer.innerHTML += html;

  document.querySelectorAll('.btn-pagina').forEach(btn => {
    btn.addEventListener('click', () => {
      const pagina = parseInt(btn.dataset.pagina);
      cambiarPagina(pagina);
    });
  });
}

function cambiarPagina(pagina) {
  paginaActual = pagina;
  renderCliente();
}

/* =========================
   VER DETALLE CLIENTE
========================= */
async function abrirVistaCliente(clienteId) {
  try {
    console.log("👁️ Abriendo detalle del cliente:", clienteId);
    
    const cliente = clienteGlobal.find(c => c.id === clienteId);
    if (!cliente) {
      alert("Cliente no encontrado");
      return;
    }

    console.log("✅ Cliente obtenido:", cliente);

    if (clienteDetalleContainer) {
      clienteDetalleContainer.style.display = "block";
      
      clienteDetalleContainer.innerHTML = `
        <div class="cliente-detalle-card">
          <div class="detalle-header">
            <h2>📋 ${cliente.nombre}</h2>
            <button class="btn-cerrar-detalle">✕ Cerrar</button>
          </div>
          
          <div class="cliente-info-grid">
            <div class="cliente-info-item">
              <span>Email</span>
              <strong>${cliente.email || '-'}</strong>
            </div>
            <div class="cliente-info-item">
              <span>Teléfono</span>
              <strong>${cliente.telefono || '-'}</strong>
            </div>
            ${cliente.direccion ? `
              <div class="cliente-info-item">
                <span>Dirección</span>
                <strong>${cliente.direccion}</strong>
              </div>
            ` : ''}
            ${cliente.notas ? `
              <div class="cliente-info-item">
                <span>Notas</span>
                <strong>${cliente.notas}</strong>
              </div>
            ` : ''}
            ${cliente.link_acceso ? `
              <div class="cliente-info-item">
                <span>Link de Acceso</span>
                <a href="${cliente.link_acceso}" target="_blank" style="color:var(--accent-primary); word-break: break-all;">
                  🔗 ${cliente.link_acceso}
                </a>
              </div>
            ` : ''}
            <div class="cliente-info-item">
              <span>Fecha de Registro</span>
              <strong>${formatFecha(cliente.created_at)}</strong>
            </div>
          </div>

          <div class="detalle-pedidos">
            <h3>📦 Últimos Pedidos</h3>
            <div id="pedidosCliente" class="pedidos-loading">Cargando pedidos...</div>
          </div>
        </div>
      `;

      document.querySelector('.btn-cerrar-detalle').addEventListener('click', () => {
        clienteDetalleContainer.style.display = "none";
      });

      cargarPedidosCliente(cliente.usuario_id);
    }

  } catch (err) {
    console.error("❌ Error abriendo detalle:", err);
    alert("Error al cargar detalle del cliente");
  }
}

/* =========================
   CARGAR PEDIDOS DE UN CLIENTE
========================= */
async function cargarPedidosCliente(usuarioId) {
  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/pedidos`);
    if (!res.ok) throw new Error("Error cargando pedidos");

    const pedidos = await res.json();
    
    const pedidosCliente = pedidos.filter(p => p.cliente_id === usuarioId);

    const container = document.getElementById("pedidosCliente");
    
    if (!container) return;

    if (!pedidosCliente.length) {
      container.innerHTML = "<p style='color: var(--text-secondary); padding: 1rem;'>Este cliente no tiene pedidos aún</p>";
      return;
    }

    container.innerHTML = `
      <div class="tabla-pedidos-mini">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Pedido</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${pedidosCliente.slice(0, 10).map(p => {
              const estadoEmoji = {
                'recibido': '📥',
                'procesando': '⚙️',
                'enviado': '🚚',
                'entregado': '✅',
                'cancelado': '❌'
              };
              
              const estadoColor = {
                'recibido': 'var(--success)',
                'procesando': 'var(--warning)',
                'enviado': 'var(--info)',
                'entregado': 'var(--success)',
                'cancelado': 'var(--danger)'
              };

              return `
                <tr>
                  <td style="white-space: nowrap;">${formatFecha(p.fecha)}</td>
                  <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${p.pedido_final}</td>
                  <td>
                    <span style="
                      padding: 4px 10px; 
                      border-radius: 6px; 
                      font-size: 0.8rem; 
                      font-weight: 600;
                      background: ${estadoColor[p.estado]}22;
                      color: ${estadoColor[p.estado]};
                      white-space: nowrap;
                    ">
                      ${estadoEmoji[p.estado]} ${p.estado}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      ${pedidosCliente.length > 10 ? `<p style="text-align: center; margin-top: 1rem; color: var(--text-secondary); font-size: 0.85rem;">Mostrando 10 de ${pedidosCliente.length} pedidos</p>` : ''}
    `;

  } catch (err) {
    console.error("❌ Error cargando pedidos del cliente:", err);
    const container = document.getElementById("pedidosCliente");
    if (container) container.innerHTML = "<p style='color: var(--danger);'>Error cargando pedidos</p>";
  }
}

/* =========================
   EDITAR CLIENTE
========================= */
async function editarCliente(id) {
  console.log("✏️ Editando cliente:", id);
  
  const cliente = clienteGlobal.find(c => c.id === id);
  if (!cliente) {
    console.error("❌ Cliente no encontrado");
    alert("Cliente no encontrado");
    return;
  }

  clienteEditandoId = id;

  const modal = document.getElementById("modalCrearCliente");
  
  document.getElementById("nuevoNombre").value = cliente.nombre;
  document.getElementById("nuevoEmail").value = cliente.email || "";
  document.getElementById("nuevoEmail").disabled = true;
  document.getElementById("nuevoTelefono").value = cliente.telefono || "";
  document.getElementById("nuevoDireccion").value = cliente.direccion || "";
  document.getElementById("nuevoNotas").value = cliente.notas || "";
  
  document.getElementById("tituloModalCliente").textContent = "✏️ Editar Cliente";
  document.getElementById("btnSubmitCliente").textContent = "Guardar Cambios";
  
  modal.style.display = "flex";
}

/* =========================
   ELIMINAR CLIENTE
========================= */
async function eliminarCliente(id) {
  console.log("🗑️ Eliminando cliente:", id);
  
  if (!confirm("¿Seguro que quieres eliminar este cliente? Esta acción no se puede deshacer.")) return;

  try {
    const res = await fetchSeguro(`${BACKEND_URL}/api/admin/cliente/${id}`, { 
      method: "DELETE" 
    });
    
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || "Error eliminando");
    }
    
    console.log("✅ Cliente eliminado");
    alert("✅ Cliente eliminado correctamente");
    
    if (clienteDetalleContainer && clienteDetalleContainer.style.display === "block") {
      clienteDetalleContainer.style.display = "none";
    }
    
    cargarCliente();
    
  } catch (err) {
    console.error("❌ Error eliminando cliente:", err);
    alert("❌ Error eliminando cliente: " + err.message);
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
    clienteEditandoId = null;
    form.reset();
    document.getElementById("nuevoEmail").disabled = false;
    document.getElementById("tituloModalCliente").textContent = "➕ Crear Nuevo Cliente";
    document.getElementById("btnSubmitCliente").textContent = "Crear Cliente";
    modal.style.display = "flex";
  });

  cerrarBtn?.addEventListener("click", () => {
    modal.style.display = "none";
    form.reset();
    clienteEditandoId = null;
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      form.reset();
      clienteEditandoId = null;
    }
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

    const btnSubmit = document.getElementById("btnSubmitCliente");
    const textoOriginal = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Guardando...";

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
        
        alert("✅ Cliente actualizado correctamente");
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

  // ✅ El link ahora usa el UUID del cliente, no un token aleatorio
  const infoHtml = `
    <div class="modal-info-cliente">
      <div class="modal-info-content">
        <h3>✅ Cliente Creado Exitosamente</h3>
        <div class="info-item">
          <span>Contraseña Temporal:</span>
          <code>${data.passwordTemporal}</code>
        </div>
        <div class="info-item">
          <span>Link de Acceso (UUID):</span>
          <a href="${data.linkAcceso}" target="_blank"
             style="word-break: break-all;">
            ${data.linkAcceso}
          </a>
        </div>
        <div class="info-item" style="margin-top:0.5rem;">
          <button
            onclick="navigator.clipboard.writeText('${data.linkAcceso}')
              .then(() => this.textContent = '✅ Copiado!')
              .catch(() => this.textContent = '❌ Error')"
            class="btn-copiar-link">
            📋 Copiar link
          </button>
        </div>
        <button
          onclick="this.closest('.modal-info-cliente').remove()"
          class="btn-cerrar-info">
          Entendido
        </button>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML("beforeend", infoHtml);
}

      modal.style.display = "none";
      form.reset();
      cargarCliente();
      
    } catch (err) {
      console.error("❌ Error guardando cliente:", err);
      alert("❌ Error guardando cliente: " + err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = textoOriginal;
    }
  });

  /* =========================
   NAVEGACIÓN SIDEBAR
  ========================= */
  document.querySelectorAll(".sidebar li").forEach(item => {
    item.addEventListener("click", () => {
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
  setInterval(cargarPedidos, 30000);
});