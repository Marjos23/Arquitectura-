import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { propuestasAPI } from "../services/api";
import Swal from "sweetalert2";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "../styles.css";
import {
  faLightbulb,
  faThumbsUp,
  faThumbsDown,
  faComment,
  faCheckCircle,
  faClock,
  faChartBar,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";

const Propuestas = () => {
  const navigate = useNavigate();
  const [propuestas, setPropuestas] = useState([]);
  const [form, setForm] = useState({
    titulo: "",
    descripcion: "",
    categoria: "Infraestructura",
  });
  const [filter, setFilter] = useState("approved");
  const [loading, setLoading] = useState(false);
  const [votosUsuario, setVotosUsuario] = useState({});

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const loadVotosUsuario = () => {
    const votos =
      JSON.parse(
        localStorage.getItem(
          `votos_propuestas_${currentUser?.id || currentUser?.email}`
        )
      ) || {};
    setVotosUsuario(votos);
  };

  useEffect(() => {
    loadPropuestas();
    loadVotosUsuario();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "dataUpdated") {
        loadPropuestas();
        Swal.fire({
          icon: "info",
          title: "Actualización",
          text: "Se han aplicado cambios recientes. Lista actualizada.",
          timer: 1600,
          showConfirmButton: false,
        });
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const loadPropuestas = async () => {
    try {
      setLoading(true);
      const data = await propuestasAPI.getAll();
      setPropuestas(data);
    } catch (error) {
      console.error("Error cargando propuestas:", error);
      alert(
        "Error al cargar propuestas. Asegúrate de que el servidor esté corriendo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.titulo.trim() || !form.descripcion.trim()) {
      Swal.fire("Error", "Por favor completa todos los campos", "warning");
      return;
    }

    try {
      await propuestasAPI.create(form);
      setForm({ titulo: "", descripcion: "", categoria: "Infraestructura" });

      Swal.fire({
        icon: "success",
        title: "¡Propuesta Enviada!",
        text: "Tu propuesta será revisada por la administración.",
        confirmButtonColor: "#2c5282",
      });

      loadPropuestas();
    } catch (error) {
      console.error("Error creando propuesta:", error);
      Swal.fire("Error", "No se pudo crear la propuesta", "error");
    }
  };

  const vote = async (id, type) => {
    // Verificar si el usuario ya votó en esta propuesta
    if (votosUsuario[id]) {
      Swal.fire({
        icon: "warning",
        title: "Ya votaste",
        text: `Ya votaste ${
          votosUsuario[id] === "yes" ? "a favor" : "en contra"
        } en esta propuesta. Solo puedes votar una vez.`,
        confirmButtonColor: "#2c5282",
      });
      return;
    }

    try {
      await propuestasAPI.vote(id, type);

      // Guardar el voto en localStorage
      const nuevosVotos = { ...votosUsuario, [id]: type };
      localStorage.setItem(
        `votos_propuestas_${currentUser?.id || currentUser?.email}`,
        JSON.stringify(nuevosVotos)
      );
      setVotosUsuario(nuevosVotos);

      Swal.fire({
        icon: "success",
        title: "¡Voto Registrado!",
        text: `Has votado ${type === "yes" ? "a favor" : "en contra"}`,
        timer: 1500,
        showConfirmButton: false,
      });

      loadPropuestas();
    } catch (error) {
      console.error("Error votando:", error);
      Swal.fire("Error", "No se pudo registrar tu voto", "error");
    }
  };

  const addComment = async (id, text) => {
    if (!text.trim()) {
      Swal.fire("Error", "El comentario no puede estar vacío", "warning");
      return;
    }

    try {
      await propuestasAPI.addComment(id, text);
      Swal.fire({
        icon: "success",
        title: "Comentario agregado",
        timer: 1200,
        showConfirmButton: false,
      });
      loadPropuestas();
    } catch (error) {
      console.error("Error agregando comentario:", error);
      Swal.fire("Error", "No se pudo agregar el comentario", "error");
    }
  };

  const yaVoto = (propuestaId) => {
    return votosUsuario[propuestaId] !== undefined;
  };

  const tipoVoto = (propuestaId) => {
    return votosUsuario[propuestaId];
  };

  const visible = propuestas.filter((p) => {
    if (filter === "all") return true;
    if (filter === "approved") return p.approved;
    if (filter === "pending") return !p.approved;
    return true;
  });

  return (
    <div className="propuestas-page-modern">
      {/* Hero Section */}
      <div className="propuestas-hero">
        <div className="propuestas-hero-content">
          <div className="propuestas-hero-icon">
            <FontAwesomeIcon icon={faLightbulb} />
          </div>
          <h1>Propuestas Ciudadanas</h1>
          <p>
            Comparte tus ideas para mejorar Manta. Tu voz construye nuestra
            ciudad.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="propuestas-form-container">
        <div className="propuestas-form-card">
          <h2>
            <FontAwesomeIcon icon={faLightbulb} /> Crea una Nueva Propuesta
          </h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Título de la Propuesta</label>
              <input
                type="text"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                placeholder="Ej: Mejora de iluminación en Parque Central"
                required
              />
            </div>

            <div className="form-group">
              <label>Descripción Detallada</label>
              <textarea
                name="descripcion"
                value={form.descripcion}
                onChange={handleChange}
                placeholder="Describe tu propuesta en detalle..."
                rows="5"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoría</label>
              <select
                name="categoria"
                value={form.categoria}
                onChange={handleChange}
              >
                <option value="Infraestructura">Infraestructura</option>
                <option value="Educación">Educación</option>
                <option value="Salud">Salud</option>
                <option value="Medio Ambiente">Medio Ambiente</option>
                <option value="Cultura">Cultura</option>
                <option value="Deportes">Deportes</option>
                <option value="Seguridad">Seguridad</option>
                <option value="Otro">Otro</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-propuesta-submit"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Propuesta"}
            </button>
          </form>
        </div>
      </div>

      {/* Filter Section */}
      <div className="propuestas-filter-section">
        <div className="filter-header">
          <h2>
            <FontAwesomeIcon icon={faFilter} /> Filtrar Propuestas
          </h2>
        </div>
        <div className="filter-buttons">
          <button
            className={
              filter === "approved" ? "filter-btn active" : "filter-btn"
            }
            onClick={() => setFilter("approved")}
          >
            <FontAwesomeIcon icon={faCheckCircle} /> Aprobadas
          </button>
          <button
            className={
              filter === "pending" ? "filter-btn active" : "filter-btn"
            }
            onClick={() => setFilter("pending")}
          >
            <FontAwesomeIcon icon={faClock} /> Pendientes
          </button>
          <button
            className={filter === "all" ? "filter-btn active" : "filter-btn"}
            onClick={() => setFilter("all")}
          >
            <FontAwesomeIcon icon={faChartBar} /> Todas
          </button>
        </div>
      </div>

      {/* Propuestas Grid */}
      <div className="propuestas-grid-modern">
        {visible.length === 0 ? (
          <div className="no-propuestas">
            <FontAwesomeIcon icon={faLightbulb} />
            <p>No hay propuestas en esta categoría</p>
          </div>
        ) : (
          visible.map((p) => {
            const totalVotos = (p.votesYes || 0) + (p.votesNo || 0);
            const porcentajeAFavor =
              totalVotos > 0
                ? Math.round(((p.votesYes || 0) / totalVotos) * 100)
                : 0;
            const porcentajeEnContra =
              totalVotos > 0
                ? Math.round(((p.votesNo || 0) / totalVotos) * 100)
                : 0;
            const yaVotado = yaVoto(p.id);
            const miVoto = tipoVoto(p.id);

            return (
              <div key={p.id} className="propuesta-card-modern">
                {/* Header con estado */}
                <div className="propuesta-card-header">
                  <div className="propuesta-titulo-section">
                    <h3>{p.titulo}</h3>
                    <span
                      className={`propuesta-badge ${
                        p.approved ? "aprobada" : "pendiente"
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={p.approved ? faCheckCircle : faClock}
                      />
                      {p.approved ? " Aprobada" : " Pendiente"}
                    </span>
                  </div>
                  {p.categoria && (
                    <span className="propuesta-categoria">{p.categoria}</span>
                  )}
                </div>

                {/* Descripción */}
                <div className="propuesta-card-body">
                  <p>{p.descripcion}</p>
                  <small className="propuesta-fecha">
                    Creada: {p.createdAt}
                  </small>
                </div>

                {/* Sección de Votación - Solo para aprobadas */}
                {p.approved && (
                  <div className="propuesta-vote-section">
                    <div className="vote-stats">
                      <div className="vote-stat-item favor">
                        <FontAwesomeIcon icon={faThumbsUp} />
                        <span>{p.votesYes || 0}</span>
                      </div>
                      <div className="vote-stat-item contra">
                        <FontAwesomeIcon icon={faThumbsDown} />
                        <span>{p.votesNo || 0}</span>
                      </div>
                      <div className="vote-total">
                        Total: {totalVotos} votos
                      </div>
                    </div>

                    {/* Progress Bars */}
                    {totalVotos > 0 && (
                      <div className="vote-progress-container">
                        <div className="vote-progress-row">
                          <span className="vote-label">A Favor</span>
                          <div className="vote-progress-bar">
                            <div
                              className="vote-progress-fill favor"
                              style={{ width: `${porcentajeAFavor}%` }}
                            >
                              {porcentajeAFavor}%
                            </div>
                          </div>
                        </div>
                        <div className="vote-progress-row">
                          <span className="vote-label">En Contra</span>
                          <div className="vote-progress-bar">
                            <div
                              className="vote-progress-fill contra"
                              style={{ width: `${porcentajeEnContra}%` }}
                            >
                              {porcentajeEnContra}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vote Badge o Buttons */}
                    {yaVotado ? (
                      <div
                        className={`ya-votaste-badge ${
                          miVoto === "yes" ? "favor" : "contra"
                        }`}
                      >
                        <FontAwesomeIcon
                          icon={miVoto === "yes" ? faThumbsUp : faThumbsDown}
                        />
                        Ya votaste:{" "}
                        {miVoto === "yes" ? "✓ A Favor" : "✗ En Contra"}
                      </div>
                    ) : (
                      <div className="vote-buttons">
                        <button
                          onClick={() => vote(p.id, "yes")}
                          className="btn-vote favor"
                        >
                          <FontAwesomeIcon icon={faThumbsUp} /> A Favor
                        </button>
                        <button
                          onClick={() => vote(p.id, "no")}
                          className="btn-vote contra"
                        >
                          <FontAwesomeIcon icon={faThumbsDown} /> En Contra
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Comments Section */}
                <div className="propuesta-comments-section">
                  <div className="comments-header">
                    <FontAwesomeIcon icon={faComment} />
                    <span>Comentarios ({p.comments?.length || 0})</span>
                  </div>

                  <div className="comments-list">
                    {p.comments?.length > 0 ? (
                      p.comments.slice(0, 2).map((c, idx) => (
                        <div key={idx} className="comment-item">
                          <div className="comment-text">{c.text}</div>
                          <small className="comment-date">{c.date}</small>
                        </div>
                      ))
                    ) : (
                      <p className="no-comments">Sin comentarios aún</p>
                    )}
                  </div>

                  {p.comments?.length > 2 && (
                    <button
                      className="btn-ver-foro"
                      onClick={() => navigate(`/propuestas/${p.id}`)}
                    >
                      Ver Foro de Discusión ({p.comments.length - 2} más)
                    </button>
                  )}

                  {p.comments?.length <= 2 && p.comments?.length > 0 && (
                    <button
                      className="btn-ver-foro"
                      onClick={() => navigate(`/propuestas/${p.id}`)}
                    >
                      Ver Foro Completo
                    </button>
                  )}

                  {p.comments?.length === 0 && (
                    <button
                      className="btn-ver-foro"
                      onClick={() => navigate(`/propuestas/${p.id}`)}
                    >
                      Participar en Discusión
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Propuestas;
