const API = window.COMPAI_CONFIG.API_BASE_URL;
const token = sessionStorage.getItem("compai.admin.token");
if (!token) location.replace("/admin-login/");

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 401 || response.status === 403) {
    sessionStorage.removeItem("compai.admin.token");
    location.replace("/admin-login/");
    throw new Error("Sesión vencida");
  }
  if (!response.ok) throw new Error("No se pudo cargar la información");
  if (response.status === 204) return null;
  return response.json();
}

const formatDate = (value) =>
  value ? new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Sin conexión";

const formatDayLabel = (isoDate) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit" }).format(date);
};

const metric = (label, value, foot) =>
  `<article class="metric"><div class="metric-label">${label}</div><div class="metric-value">${value}</div><div class="metric-foot">${foot}</div></article>`;

const reportEstadoLabel = { pendiente: "Pendiente", en_revision: "En revisión", resuelto: "Resuelto" };

function renderChart(registrosPorDia) {
  const container = document.getElementById("chart-registros");
  const max = Math.max(1, ...registrosPorDia.map((item) => item.cantidad));
  container.innerHTML = registrosPorDia
    .map((item) => {
      const heightPct = Math.round((item.cantidad / max) * 100);
      return `<div class="chart-bar-col" title="${item.cantidad} registro(s) el ${formatDayLabel(item.fecha)}">
        <div class="chart-bar" style="height:${Math.max(heightPct, item.cantidad > 0 ? 6 : 2)}%"></div>
        <span class="chart-bar-value">${item.cantidad || ""}</span>
        <span class="chart-bar-label">${formatDayLabel(item.fecha)}</span>
      </div>`;
    })
    .join("");
}

function renderDispositivos(dispositivos) {
  const body = document.getElementById("dispositivos-body");
  document.getElementById("dispositivos-count").textContent = `${dispositivos.length} vinculado(s)`;
  body.textContent = "";
  if (!dispositivos.length) {
    body.innerHTML = '<tr><td colspan="5" class="empty">Todavía no hay equipos vinculados a ninguna cuenta.</td></tr>';
    return;
  }
  dispositivos.forEach((device) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${device.apiKey}</td>
      <td>${device.usuarioNombre}</td>
      <td><span class="status ${device.enLinea ? "active" : "inactive"}">${device.enLinea ? "En línea" : "Sin señal"}</span></td>
      <td>${formatDate(device.ultimaLectura)}</td>
      <td>${formatDate(device.vinculadoEn)}</td>
    `;
    body.append(row);
  });
}

async function renderReportes() {
  const filter = document.getElementById("reportes-filter").value;
  const list = document.getElementById("reportes-list");
  list.innerHTML = '<div class="loading">Cargando reportes…</div>';
  try {
    const reportes = await request(`/admin/reportes?estado=${filter}`);
    list.textContent = "";
    if (!reportes.length) {
      list.innerHTML = '<div class="empty">No hay reportes para este filtro.</div>';
      return;
    }
    reportes.forEach((reporte) => {
      const item = document.createElement("div");
      item.className = "report-item";
      item.innerHTML = `
        <div class="report-item-head">
          <div>
            <span class="report-tag">${reporte.categoria}</span>
            <strong>${reporte.usuarioNombre}</strong>
          </div>
          <span class="report-date">${formatDate(reporte.creadoEn)}</span>
        </div>
        <p class="report-desc">${reporte.descripcion}</p>
        <div class="report-actions">
          <select class="filter report-status" data-id="${reporte.id}">
            ${Object.entries(reportEstadoLabel)
              .map(([value, label]) => `<option value="${value}" ${value === reporte.estado ? "selected" : ""}>${label}</option>`)
              .join("")}
          </select>
        </div>
      `;
      list.append(item);
    });
    list.querySelectorAll(".report-status").forEach((select) => {
      select.onchange = async () => {
        select.disabled = true;
        try {
          await request(`/admin/reportes/${select.dataset.id}`, {
            method: "PATCH",
            body: JSON.stringify({ estado: select.value })
          });
          renderReportes();
        } finally {
          select.disabled = false;
        }
      };
    });
  } catch (error) {
    list.innerHTML = `<div class="form-error show">${error.message}</div>`;
  }
}

async function load() {
  const filter = document.getElementById("status-filter").value;
  try {
    const data = await request(`/admin/dashboard?estado=${filter}`);

    document.getElementById("metrics").innerHTML = [
      metric("Total de usuarios", data.totalUsuarios, `${data.activosUltimos7Dias} activos últimos 7 días`),
      metric("Usuarios activos", data.usuariosActivos, "Cuentas habilitadas"),
      metric("Dispositivos en línea", `${data.dispositivosEnLinea}/${data.dispositivos.length}`, "Equipos IoT enviando datos ahora"),
      metric("Reportes pendientes", data.reportesPendientes, `${data.reportesEnviados} enviados en total`),
      metric("Uso general", data.totalTareas + data.totalComidas + data.totalRutinas, `${data.totalLecturasSensores} lecturas de sensores`)
    ].join("");

    renderChart(data.registrosPorDia);
    renderDispositivos(data.dispositivos);

    const users = document.getElementById("users");
    users.textContent = "";
    data.usuarios.forEach((user) => {
      const row = document.createElement("tr");
      const name = document.createElement("td");
      const button = document.createElement("button");
      button.className = "user-button";
      button.textContent = user.nombre;
      button.onclick = () => openUser(user.id);
      name.append(button);
      const statusCell = document.createElement("td");
      statusCell.innerHTML = `<span class="status ${user.estado === "activo" ? "active" : "inactive"}">${user.estado}</span>`;
      const usage = document.createElement("td");
      usage.textContent = user.estadoUso.replace("_", " ");
      const last = document.createElement("td");
      last.textContent = formatDate(user.ultimaConexion);
      row.append(name, statusCell, usage, last);
      users.append(row);
    });
    if (!data.usuarios.length) users.innerHTML = '<tr><td colspan="4" class="empty">No hay usuarios para este filtro.</td></tr>';

    const alerts = document.getElementById("alerts");
    alerts.textContent = "";
    data.alertas.forEach((item) => {
      const box = document.createElement("div");
      box.className = `alert ${item.level}`;
      const title = document.createElement("strong");
      const message = document.createElement("p");
      title.textContent = item.title;
      message.textContent = item.message;
      box.append(title, message);
      alerts.append(box);
    });

    document.getElementById("updated").textContent = `Última actualización: ${new Date().toLocaleTimeString("es-PE")}`;
  } catch (error) {
    document.getElementById("metrics").innerHTML = `<div class="form-error show">${error.message}</div>`;
  }
}

async function openUser(id) {
  const user = await request(`/admin/users/${id}`);
  document.getElementById("detail-name").textContent = user.nombre;
  document.getElementById("detail-meta").textContent = `${user.correo} · ${user.estado} · última conexión: ${formatDate(user.ultimaConexion)}`;
  const values = [
    ["Cursos", user.cursos],
    ["Tareas", user.tareas],
    ["Completadas", user.tareasCompletadas],
    ["Comidas", user.comidasRegistradas],
    ["Rutinas", user.rutinasRegistradas],
    ["Reportes", user.reportesEnviados]
  ];
  document.getElementById("detail-stats").innerHTML = values
    .map(([label, value]) => `<div class="detail-stat"><b>${value}</b><span>${label}</span></div>`)
    .join("");
  document.getElementById("detail-overlay").classList.add("open");
}

document.querySelectorAll(".side-link").forEach((link) => {
  link.onclick = () => {
    document.querySelectorAll(".side-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
  };
});

document.getElementById("status-filter").onchange = load;
document.getElementById("reportes-filter").onchange = renderReportes;
document.getElementById("refresh").onclick = () => {
  load();
  renderReportes();
};
document.getElementById("logout").onclick = () => {
  sessionStorage.removeItem("compai.admin.token");
  location.replace("/admin-login/");
};
document.getElementById("detail-close").onclick = () => document.getElementById("detail-overlay").classList.remove("open");
document.getElementById("detail-overlay").onclick = (event) => {
  if (event.target.id === "detail-overlay") event.currentTarget.classList.remove("open");
};

load();
renderReportes();
