import React, { useState, useEffect } from "react";
import { propuestasAPI } from "../services/api";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../styles.css";
import {
  faBell,
  faCheckCircle,
  faMapMarkerAlt,
  faCalendarAlt,
  faExclamationTriangle,
  faTrash,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

const NotificacionesMasivas = () => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [filtroZona, setFiltroZona] = useState("Todas");

  const [formulario, setFormulario] = useState({
    titulo: "",
    mensaje: "",
    zona: "Centro",
    tipo: "alerta",
    prioridad: "normal",
  });

  const zonas = [
    "Centro",
    "Tarqui",
    "Litoral",
    "Los Esteros",
    "Jocay",
    "Todas",
  ];

  const tipos = [
    { valor: "alerta", etiqueta: "🚨 Alerta Urgente" },
    { valor: "evento", etiqueta: "📅 Evento" },
    { valor: "corte", etiqueta: "⚡ Corte de Servicio" },
    { valor: "informacion", etiqueta: "ℹ️ Información General" },
  ];

  const prioridades = [
    { valor: "baja", etiqueta: "Baja", color: "info" },
    { valor: "normal", etiqueta: "Normal", color: "warning" },
    { valor: "alta", etiqueta: "Alta", color: "danger" },
  ];

  useEffect(() => {
    cargarNotificaciones();
  }, []);

  const cargarNotificaciones = async () => {
    try {
      setLoading(true);
      const data = await propuestasAPI.getAll();
      // Accedemos a la base de datos para obtener notificaciones masivas
      // Por ahora usamos localStorage como almacenamiento
      const notifsLocales =
        JSON.parse(localStorage.getItem("notificacionesMasivas")) || [];
      setNotificaciones(notifsLocales);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const enviarNotificacion = async () => {
    // Validar
    if (!formulario.titulo.trim() || !formulario.mensaje.trim()) {
      Swal.fire("Error", "El título y mensaje son obligatorios", "error");
      return;
    }

    try {
      // Obtener ciudadanos de la zona
      const ciudadanosZona = await obtenerCiudadanosPorZona(formulario.zona);

      const nuevaNotificacion = {
        id: Date.now().toString(),
        titulo: formulario.titulo,
        mensaje: formulario.mensaje,
        zona: formulario.zona,
        tipo: formulario.tipo,
        prioridad: formulario.prioridad,
        createdAt: new Date().toLocaleString("es-EC"),
        enviado: true,
        ciudadanosAfectados: ciudadanosZona.length,
        ciudadanos: ciudadanosZona,
        leidos: 0,
      };

      // Guardar en localStorage
      const notificacionesActuales =
        JSON.parse(localStorage.getItem("notificacionesMasivas")) || [];
      notificacionesActuales.push(nuevaNotificacion);
      localStorage.setItem(
        "notificacionesMasivas",
        JSON.stringify(notificacionesActuales)
      );

      // Notificar a cada ciudadano
      await notificarCiudadanos(nuevaNotificacion, ciudadanosZona);

      // Notificar a todos los tabs/ventanas que actualicen notificaciones
      localStorage.setItem("notificationsUpdated", Date.now().toString());

      Swal.fire({
        icon: "success",
        title: "¡Notificación enviada!",
        text: `Se notificó a ${ciudadanosZona.length} ciudadano(s)`,
        confirmButtonColor: "#3b82f6",
      });

      // Reset formulario
      setFormulario({
        titulo: "",
        mensaje: "",
        zona: "Centro",
        tipo: "alerta",
        prioridad: "normal",
      });
      setMostrarFormulario(false);
      cargarNotificaciones();
    } catch (error) {
      console.error("Error enviando notificación:", error);
      Swal.fire("Error", "No se pudo enviar la notificación", "error");
    }
  };

  const obtenerCiudadanosPorZona = async (zona) => {
    try {
      // Obtener datos de la API - USUARIOS registrados
      const response = await fetch("http://localhost:3001/usuarios");
      const usuarios = await response.json();

      // Filtrar solo ciudadanos (no admins)
      const ciudadanos = usuarios.filter(
        (u) => u.rol === "ciudadano" && u.email !== "admin@manta.gob.ec"
      );

      if (zona === "Todas") {
        return ciudadanos;
      }

      // Filtrar por zona (buscar en nombre o dirección)
      return ciudadanos.filter((u) => {
        const direccionCompleta = (
          (u.nombre || "") +
          " " +
          (u.direccion || "")
        ).toLowerCase();
        return direccionCompleta.includes(zona.toLowerCase());
      });
    } catch (error) {
      console.error("Error obteniendo ciudadanos:", error);
      return [];
    }
  };

  const notificarCiudadanos = async (notificacion, ciudadanos) => {
    // Guardar cada notificación en la tabla de notificaciones del servidor
    for (const ciudadano of ciudadanos) {
      const notifParaEnviar = {
        id: `${notificacion.id}_${ciudadano.id}`,
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        tipo: notificacion.tipo,
        destinatario: ciudadano.id, // Usar el ID del usuario como destinatario
        meta: null,
        leido: false,
        createdAt: new Date().toISOString(),
        ciudadanoNombre: ciudadano.nombre,
        ciudadanoId: ciudadano.id,
      };

      try {
        // Guardar en json-server
        const response = await fetch("http://localhost:3001/notificaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(notifParaEnviar),
        });
        if (!response.ok) {
          console.error("Error guardando notificación:", response);
        }
      } catch (error) {
        console.error("Error enviando notificación a:", ciudadano.email, error);
      }
    }
  };

  const eliminarNotificacion = async (id) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar notificación?",
      text: "Esta acción no se puede deshacer",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
    });

    if (confirm.isConfirmed) {
      const notificacionesActuales = notificaciones.filter((n) => n.id !== id);
      localStorage.setItem(
        "notificacionesMasivas",
        JSON.stringify(notificacionesActuales)
      );
      cargarNotificaciones();
      Swal.fire("Eliminada", "La notificación ha sido eliminada", "success");
    }
  };

  const verDetalles = (notificacion) => {
    Swal.fire({
      title: notificacion.titulo,
      html: `
        <div style="text-align: left; margin: 1rem 0;">
          <p><strong>Zona:</strong> ${notificacion.zona}</p>
          <p><strong>Tipo:</strong> ${getTipoLabel(notificacion.tipo)}</p>
          <p><strong>Prioridad:</strong> <span style="color: ${getPrioridadColor(
            notificacion.prioridad
          )}">${getPrioridadLabel(notificacion.prioridad)}</span></p>
          <p><strong>Ciudadanos notificados:</strong> ${
            notificacion.ciudadanosAfectados
          }</p>
          <p><strong>Enviado:</strong> ${notificacion.createdAt}</p>
          <hr />
          <p><strong>Mensaje:</strong></p>
          <p>${notificacion.mensaje}</p>
        </div>
      `,
      confirmButtonColor: "#3b82f6",
      confirmButtonText: "Cerrar",
    });
  };

  const getTipoLabel = (tipo) => {
    const t = tipos.find((x) => x.valor === tipo);
    return t ? t.etiqueta : tipo;
  };

  const getPrioridadLabel = (prioridad) => {
    const p = prioridades.find((x) => x.valor === prioridad);
    return p ? p.etiqueta : prioridad;
  };

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case "baja":
        return "#3b82f6";
      case "normal":
        return "#f59e0b";
      case "alta":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const notificacionesFiltradas =
    filtroZona === "Todas"
      ? notificaciones
      : notificaciones.filter((n) => n.zona === filtroZona);

  return (
    <div className="notificaciones-masivas-container">
      <div className="notif-header">
        <div className="notif-title">
          <FontAwesomeIcon icon={faBell} />
          <h1>Notificaciones Masivas</h1>
        </div>
        <button
          className="btn-crear-notif"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? "Cancelar" : "+ Nueva Notificación"}
        </button>
      </div>

      {/* Formulario */}
      {mostrarFormulario && (
        <div className="notif-form-container">
          <div className="notif-form">
            <h2>Redactar Notificación Masiva</h2>

            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                name="titulo"
                value={formulario.titulo}
                onChange={handleInputChange}
                placeholder="Ej: Corte de energía en Tarqui"
                maxLength="100"
              />
              <small>{formulario.titulo.length}/100</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Zona a notificar *</label>
                <select
                  name="zona"
                  value={formulario.zona}
                  onChange={handleInputChange}
                >
                  {zonas.map((zona) => (
                    <option key={zona} value={zona}>
                      {zona}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de notificación</label>
                <select
                  name="tipo"
                  value={formulario.tipo}
                  onChange={handleInputChange}
                >
                  {tipos.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Prioridad</label>
                <select
                  name="prioridad"
                  value={formulario.prioridad}
                  onChange={handleInputChange}
                >
                  {prioridades.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Mensaje *</label>
              <textarea
                name="mensaje"
                value={formulario.mensaje}
                onChange={handleInputChange}
                placeholder="Escribe el mensaje que recibirán los ciudadanos..."
                maxLength="500"
                rows="6"
              />
              <small>{formulario.mensaje.length}/500</small>
            </div>

            <button className="btn-enviar-notif" onClick={enviarNotificacion}>
              <FontAwesomeIcon icon={faBell} /> Enviar a {formulario.zona}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="notif-filtros">
        <label>Filtrar por zona:</label>
        <div className="filtros-buttons">
          {zonas.map((zona) => (
            <button
              key={zona}
              className={`filtro-btn ${filtroZona === zona ? "activo" : ""}`}
              onClick={() => setFiltroZona(zona)}
            >
              {zona}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de notificaciones */}
      <div className="notif-lista">
        {loading ? (
          <p className="loading">Cargando notificaciones...</p>
        ) : notificacionesFiltradas.length > 0 ? (
          notificacionesFiltradas.map((notif) => (
            <div
              key={notif.id}
              className={`notif-card notif-${notif.tipo} prioridad-${notif.prioridad}`}
            >
              <div className="notif-card-header">
                <div className="notif-info-header">
                  <FontAwesomeIcon icon={faBell} className="notif-icon" />
                  <div>
                    <h3>{notif.titulo}</h3>
                    <div className="notif-meta">
                      <span className="notif-zona">
                        <FontAwesomeIcon icon={faMapMarkerAlt} />
                        {notif.zona}
                      </span>
                      <span className="notif-fecha">
                        <FontAwesomeIcon icon={faCalendarAlt} />
                        {notif.createdAt}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`badge-prioridad prioridad-${notif.prioridad}`}
                >
                  {getPrioridadLabel(notif.prioridad)}
                </span>
              </div>

              <div className="notif-card-body">
                <p className="notif-mensaje">{notif.mensaje}</p>
              </div>

              <div className="notif-card-footer">
                <div className="notif-stats">
                  <span className="stat">
                    <FontAwesomeIcon icon={faCheckCircle} />
                    {notif.ciudadanosAfectados} ciudadanos notificados
                  </span>
                </div>
                <div className="notif-actions">
                  <button
                    className="btn-ver"
                    onClick={() => verDetalles(notif)}
                    title="Ver detalles"
                  >
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button
                    className="btn-eliminar"
                    onClick={() => eliminarNotificacion(notif.id)}
                    title="Eliminar notificación"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="notif-empty">
            <FontAwesomeIcon icon={faBell} />
            <p>No hay notificaciones</p>
            <small>Crea una nueva notificación masiva</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificacionesMasivas;
