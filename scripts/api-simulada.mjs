// API simulada de EnZona_Api SOLO para verificar la web en local cuando Aiven/Render no responden.
// Reproduce el contrato documentado (rutas, cuerpos, errores problem+json, idempotencia). No es parte del proyecto.
import http from "node:http";
import crypto from "node:crypto";

const PUERTO = Number(process.env.PUERTO ?? 8099);
const TZ = "-06:00";
const fecha = (d, h) => `2026-12-${String(d).padStart(2, "0")}T${h}:00${TZ}`;

const usuarios = [
  { id: 1, nombre: "Ana Asistente", correo: "asistente@uv.mx", roles: ["ASISTENTE"], estado: "ACTIVO", correoVerificado: true, telefonoVerificado: false, fechaRegistro: "2026-09-01T10:00:00-06:00", telefono: null },
  { id: 2, nombre: "Nancy Cruz", correo: "organizador@uv.mx", roles: ["ASISTENTE", "ORGANIZADOR"], estado: "ACTIVO", correoVerificado: true, fechaRegistro: "2026-09-01T10:00:00-06:00", telefono: "2721234567" },
  { id: 3, nombre: "Luis Puerta", correo: "validador@uv.mx", roles: ["ASISTENTE", "VALIDADOR"], estado: "ACTIVO", correoVerificado: true, fechaRegistro: "2026-09-02T10:00:00-06:00", telefono: null },
  { id: 4, nombre: "Admin EnZona", correo: "admin@uv.mx", roles: ["ASISTENTE", "ADMIN"], estado: "ACTIVO", correoVerificado: true, fechaRegistro: "2026-09-01T09:00:00-06:00", telefono: null },
  { id: 5, nombre: "Pedro Pendiente", correo: "pendiente@uv.mx", roles: ["ASISTENTE"], estado: "PENDIENTE", correoVerificado: false, fechaRegistro: "2026-11-01T09:00:00-06:00", telefono: null },
];
const categorias = [
  { id: 1, nombre: "Música" }, { id: 2, nombre: "Deportivo" }, { id: 3, nombre: "Cultural" }, { id: 4, nombre: "Taller" }, { id: 5, nombre: "Gastronómico" }, { id: 6, nombre: "Académico" }, { id: 7, nombre: "Otro" },
];
const eventos = [
  { id: 1, organizadorId: 2, nombre: "Feria del libro de Orizaba", descripcion: "Editoriales locales, presentaciones y talleres de lectura para toda la familia.", lugar: "Palacio de Hierro", direccion: "Poniente 2 s/n, Centro", ciudad: "Orizaba", latitud: 18.8509, longitud: -97.1033, categoriaId: 3, categoria: "Cultural", fechaHoraInicio: fecha(12, "10:00"), fechaHoraFin: fecha(12, "18:00"), esDePago: false, requiereAsiento: false, aforo: 120, disponibles: 118, precioDesde: "0.00", estado: "PUBLICADO", imagenUrl: null, tipos: [{ id: 1, nombre: "Entrada general", precio: "0.00", cantidadTotal: 120, disponibles: 118 }] },
  { id: 2, organizadorId: 2, nombre: "Noche de jazz en el Foro", descripcion: "Cuarteto local, entrada con asiento numerado.", lugar: "Foro Cultural Orizaba", direccion: "Sur 5 120, Centro, Orizaba", ciudad: "Orizaba", latitud: 18.8506, longitud: -97.1003, categoriaId: 1, categoria: "Música", fechaHoraInicio: fecha(19, "20:00"), fechaHoraFin: fecha(19, "23:00"), esDePago: true, requiereAsiento: true, aforo: 50, disponibles: 48, precioDesde: "180.00", estado: "PUBLICADO", imagenUrl: null, tipos: [{ id: 2, nombre: "Platea", precio: "180.00", cantidadTotal: 30, disponibles: 28 }, { id: 3, nombre: "Preferente", precio: "250.00", cantidadTotal: 20, disponibles: 20 }] },
  { id: 3, organizadorId: 2, nombre: "Taller de fotografía nocturna", descripcion: "Técnica de larga exposición en el Cerro del Borrego. Trae tripié.", lugar: "Cerro del Borrego", direccion: "Acceso por Norte 18", ciudad: "Orizaba", latitud: 18.8572, longitud: -97.1081, categoriaId: 4, categoria: "Taller", fechaHoraInicio: fecha(22, "19:00"), fechaHoraFin: null, esDePago: true, requiereAsiento: false, aforo: 20, disponibles: 20, precioDesde: "150.00", estado: "PUBLICADO", imagenUrl: null, tipos: [{ id: 4, nombre: "General", precio: "150.00", cantidadTotal: 20, disponibles: 20 }] },
  { id: 4, organizadorId: 2, nombre: "Torneo de ajedrez universitario", descripcion: "Sistema suizo a 5 rondas.", lugar: "Facultad de Negocios y Tecnologías", direccion: "Campus Orizaba, UV", ciudad: "Orizaba", latitud: 18.862, longitud: -97.11, categoriaId: 6, categoria: "Académico", fechaHoraInicio: fecha(28, "09:00"), fechaHoraFin: null, esDePago: false, requiereAsiento: false, aforo: 64, disponibles: 64, precioDesde: "0.00", estado: "BORRADOR", imagenUrl: null, tipos: [{ id: 5, nombre: "Entrada general", precio: "0.00", cantidadTotal: 64, disponibles: 64 }] },
];
const asientos = [];
let asientoId = 1;
for (const [seccion, filas, porFila] of [["Platea", 5, 10]]) {
  for (let f = 0; f < filas; f += 1) {
    const fila = String.fromCharCode(65 + f);
    for (let n = 1; n <= porFila; n += 1) {
      asientos.push({ id: asientoId++, eventoId: 2, seccion, fila, numero: String(n), estado: "DISPONIBLE", etiqueta: `${seccion} · Fila ${fila} · Asiento ${n}` });
    }
  }
}
asientos[0].estado = "OCUPADO";
asientos[1].estado = "OCUPADO";

const firmar = (codigo) => crypto.createHmac("sha256", "clave-de-prueba").update(codigo).digest("hex").slice(0, 32);
const nuevoCodigo = () => "EZ" + crypto.randomBytes(9).toString("base64url").slice(0, 16);
const ordenes = [];
const boletos = [];
let ordenId = 1;
let boletoId = 1;
const idempotencia = new Map();
const sesiones = new Map();
const validaciones = [];

function emitir(usuarioId, eventoId, tipoId, cantidad, asientosIds, metodo) {
  const evento = eventos.find((e) => e.id === eventoId);
  const tipo = evento.tipos.find((t) => t.id === tipoId) ?? evento.tipos[0];
  const total = (Number(tipo.precio) * cantidad).toFixed(2);
  const orden = { ordenId: ordenId++, eventoId, estadoOrden: "PAGADA", estadoPago: metodo === "GRATIS" ? null : "APROBADO", total, moneda: "MXN", referenciaPago: metodo === "GRATIS" ? null : `SIM-${Date.now()}`, boletos: [], usuarioId };
  for (let i = 0; i < cantidad; i += 1) {
    const codigo = nuevoCodigo();
    const asiento = asientosIds[i] ? asientos.find((a) => a.id === asientosIds[i]) : null;
    if (asiento) asiento.estado = "OCUPADO";
    const boleto = { id: boletoId++, ordenId: orden.ordenId, eventoId, tipoBoletoId: tipo.id, asientoId: asiento?.id ?? null, codigo, firma: firmar(codigo), contenidoQr: `${codigo}.${firmar(codigo)}`, estado: "VALIDO", fechaEmision: new Date().toISOString(), fechaUso: null, eventoNombre: evento.nombre, fechaHoraInicio: evento.fechaHoraInicio, lugar: evento.lugar, tipoNombre: tipo.nombre, asientoEtiqueta: asiento?.etiqueta ?? null, usuarioId };
    boletos.push(boleto);
    orden.boletos.push(boleto);
  }
  tipo.disponibles -= cantidad;
  evento.disponibles -= cantidad;
  ordenes.push(orden);
  return orden;
}
// Compra de muestra para que Mis boletos tenga contenido
emitir(1, 2, 2, 2, [3, 4], "TARJETA");
boletos[0].estado = "USADO";
boletos[0].fechaUso = new Date().toISOString();

const publico = (e) => { const { tipos, ...resto } = e; return { ...resto, tiposBoleto: tipos }; };
const problema = (res, status, codigo, detail, extra = {}) => {
  res.writeHead(status, { "content-type": "application/problem+json" });
  res.end(JSON.stringify({ status, title: codigo, detail, codigo, timestamp: new Date().toISOString(), ...extra }));
};
const json = (res, status, cuerpo, cabeceras = {}) => {
  res.writeHead(status, { "content-type": "application/json", ...cabeceras });
  res.end(cuerpo === undefined ? "" : JSON.stringify(cuerpo));
};
const lista = (res, elementos) => json(res, 200, elementos, { "x-total-count": String(elementos.length), "x-page": "0", "x-page-size": "100", "x-total-pages": "1" });

const leerCuerpo = (req) => new Promise((resolver) => { let datos = ""; req.on("data", (c) => (datos += c)); req.on("end", () => { try { resolver(datos ? JSON.parse(datos) : {}); } catch { resolver({}); } }); });

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PUERTO}`);
  const ruta = url.pathname;
  const metodo = req.method;
  const token = (req.headers.authorization ?? "").replace("Bearer ", "");
  const usuario = sesiones.get(token) ?? null;
  const exigir = () => { if (!usuario) { problema(res, 401, "NO_AUTENTICADO", "Inicia sesión."); return false; } return true; };
  const cuerpo = metodo === "GET" ? {} : await leerCuerpo(req);
  console.log(metodo, ruta + url.search, usuario ? `(${usuario.correo})` : "");

  if (ruta === "/actuator/health") return json(res, 200, { status: "UP" });
  if (ruta === "/api/categorias") return json(res, 200, categorias);

  if (ruta === "/api/auth/sesion" && metodo === "POST") {
    const u = usuarios.find((x) => x.correo === cuerpo.identificador || x.correo?.toUpperCase() === cuerpo.identificador);
    if (!u || cuerpo.contrasena !== "enzona123") return problema(res, 401, "CREDENCIALES_INVALIDAS", "Correo, CURP o contraseña incorrectos.");
    if (u.estado === "PENDIENTE") return problema(res, 403, "CUENTA_PENDIENTE", "La cuenta no ha terminado su verificación.");
    if (u.estado === "BLOQUEADO") return problema(res, 403, "CUENTA_BLOQUEADA", "Cuenta bloqueada.");
    const t = crypto.randomBytes(24).toString("hex");
    sesiones.set(t, u);
    return json(res, 200, { token: t, tipo: "Bearer", expiraEnSegundos: 3600, usuario: { id: u.id, nombre: u.nombre, correo: u.correo, roles: u.roles } });
  }
  if (ruta === "/api/auth/registro" && metodo === "POST") {
    if (usuarios.some((u) => u.correo === cuerpo.correo)) return problema(res, 409, "CORREO_REGISTRADO", "Ese correo ya tiene cuenta.");
    const u = { id: usuarios.length + 1, nombre: cuerpo.nombre, correo: cuerpo.correo, roles: cuerpo.organizador ? ["ASISTENTE", "ORGANIZADOR"] : ["ASISTENTE"], estado: "PENDIENTE", correoVerificado: false, fechaRegistro: new Date().toISOString(), telefono: null };
    usuarios.push(u);
    console.log("[DEV] Código de verificación para", u.correo, ": 123456");
    return json(res, 201, { usuarioId: u.id, correo: u.correo, estado: "PENDIENTE", verificacionesPendientes: ["CORREO"] });
  }
  if (ruta === "/api/auth/verificacion" && metodo === "POST") {
    const u = usuarios.find((x) => x.correo === cuerpo.correo);
    if (!u || cuerpo.codigo !== "123456") return problema(res, 400, "CODIGO_VERIFICACION_INVALIDO", "El código no coincide.");
    u.estado = "ACTIVO"; u.correoVerificado = true;
    return json(res, 200, { estado: "ACTIVO", correoVerificado: true, telefonoVerificado: false, verificacionesPendientes: [] });
  }
  if (ruta === "/api/auth/verificacion/reenvio" || ruta === "/api/auth/contrasena/recuperacion") return json(res, 202);
  if (ruta === "/api/auth/contrasena/restablecimiento") return cuerpo.codigo === "123456" ? json(res, 204) : problema(res, 400, "CODIGO_VERIFICACION_INVALIDO", "El código no coincide.");

  if (ruta === "/api/usuarios/me") {
    if (!exigir()) return;
    if (metodo === "PUT") { usuario.nombre = cuerpo.nombre ?? usuario.nombre; usuario.telefono = cuerpo.telefono ?? null; }
    return json(res, 200, usuario);
  }
  if (ruta === "/api/usuarios/me/contrasena") { if (!exigir()) return; return cuerpo.actual === "enzona123" ? json(res, 204) : problema(res, 401, "CREDENCIALES_INVALIDAS", "La contraseña actual no es correcta."); }
  if (ruta === "/api/usuarios/me/roles/organizador") {
    if (!exigir()) return;
    if (metodo === "POST" && !usuario.roles.includes("ORGANIZADOR")) usuario.roles.push("ORGANIZADOR");
    if (metodo === "DELETE") {
      if (eventos.some((e) => e.organizadorId === usuario.id && e.estado === "PUBLICADO")) return problema(res, 409, "ROL_EN_USO", "Tienes eventos publicados vigentes.");
      usuario.roles = usuario.roles.filter((r) => r !== "ORGANIZADOR");
    }
    return json(res, 200, usuario);
  }

  if (ruta === "/api/eventos" && metodo === "GET") {
    let resultado = eventos.filter((e) => e.estado === "PUBLICADO");
    const q = url.searchParams.get("q")?.toLowerCase();
    if (q) resultado = resultado.filter((e) => `${e.nombre} ${e.descripcion} ${e.lugar}`.toLowerCase().includes(q));
    const cat = url.searchParams.get("categoriaId");
    if (cat) resultado = resultado.filter((e) => String(e.categoriaId) === cat);
    const pago = url.searchParams.get("esDePago");
    if (pago) resultado = resultado.filter((e) => String(e.esDePago) === pago);
    const ciudad = url.searchParams.get("ciudad");
    if (ciudad) resultado = resultado.filter((e) => e.ciudad.toLowerCase() === ciudad.toLowerCase());
    const lat = Number(url.searchParams.get("lat")), lng = Number(url.searchParams.get("lng"));
    if (url.searchParams.has("lat")) {
      resultado = resultado.map((e) => ({ ...e, distanciaKm: Math.round(Math.hypot((e.latitud - lat) * 111, (e.longitud - lng) * 105) * 100) / 100 })).sort((a, b) => a.distanciaKm - b.distanciaKm);
    }
    return lista(res, resultado.map(publico));
  }
  if (ruta === "/api/eventos" && metodo === "POST") {
    if (!exigir()) return;
    const id = eventos.length + 1;
    const tipos = cuerpo.esDePago ? (cuerpo.tiposBoleto ?? []).map((t, i) => ({ id: 100 + id * 10 + i, nombre: t.nombre, precio: Number(t.precio).toFixed(2), cantidadTotal: t.cantidad, disponibles: t.cantidad })) : [{ id: 100 + id * 10, nombre: "Entrada general", precio: "0.00", cantidadTotal: cuerpo.aforo, disponibles: cuerpo.aforo }];
    const e = { id, organizadorId: usuario.id, ...cuerpo, categoria: categorias.find((c) => c.id === cuerpo.categoriaId)?.nombre ?? null, disponibles: cuerpo.aforo, precioDesde: tipos[0]?.precio ?? "0.00", estado: cuerpo.publicar ? "PUBLICADO" : "BORRADOR", imagenUrl: null, tipos };
    delete e.tiposBoleto; delete e.secciones; delete e.publicar;
    eventos.push(e);
    return json(res, 201, publico(e), { location: `/api/eventos/${id}` });
  }
  const m = ruta.match(/^\/api\/eventos\/(\d+)(\/.*)?$/);
  if (m) {
    const evento = eventos.find((e) => e.id === Number(m[1]));
    if (!evento) return problema(res, 404, "NO_ENCONTRADO", "No existe el evento.");
    const sub = m[2] ?? "";
    if (sub === "" && metodo === "GET") { if (evento.estado === "BORRADOR" && !(usuario && (usuario.id === evento.organizadorId || usuario.roles.includes("ADMIN")))) return problema(res, 404, "NO_ENCONTRADO", "No existe el evento."); return json(res, 200, publico(evento)); }
    if (sub === "" && metodo === "PUT") { if (!exigir()) return; Object.assign(evento, { nombre: cuerpo.nombre, descripcion: cuerpo.descripcion, lugar: cuerpo.lugar, direccion: cuerpo.direccion, latitud: cuerpo.latitud, longitud: cuerpo.longitud, fechaHoraInicio: cuerpo.fechaHoraInicio, fechaHoraFin: cuerpo.fechaHoraFin, categoriaId: cuerpo.categoriaId, categoria: categorias.find((c) => c.id === cuerpo.categoriaId)?.nombre ?? evento.categoria }); return json(res, 200, publico(evento)); }
    if (sub === "/asientos") { if (!exigir()) return; return json(res, 200, asientos.filter((a) => a.eventoId === evento.id)); }
    if (sub === "/publicacion") { if (!exigir()) return; if (evento.latitud == null) return problema(res, 422, "REGLA_NEGOCIO", "Fija la ubicación para publicar."); evento.estado = "PUBLICADO"; return json(res, 200, publico(evento)); }
    if (sub === "/validadores") { if (!exigir()) return; if (metodo === "POST") { const u = usuarios.find((x) => x.correo === cuerpo.correo); if (!u) return problema(res, 404, "NO_ENCONTRADO", "No hay una cuenta con ese correo."); if (!u.roles.includes("VALIDADOR")) u.roles.push("VALIDADOR"); evento.validadores = [...(evento.validadores ?? []), { usuarioId: u.id, nombre: u.nombre, correo: u.correo }]; return json(res, 201, evento.validadores.at(-1)); } return json(res, 200, evento.validadores ?? (evento.id === 2 ? [{ usuarioId: 3, nombre: "Luis Puerta", correo: "validador@uv.mx" }] : [])); }
    if (sub.startsWith("/validadores/") && metodo === "DELETE") { evento.validadores = (evento.validadores ?? []).filter((v) => v.usuarioId !== Number(sub.split("/")[2])); return json(res, 204); }
    if (sub === "/politica-cancelacion") { if (!exigir()) return; const pagadas = ordenes.filter((o) => o.eventoId === evento.id && o.estadoOrden === "PAGADA"); const cobrado = pagadas.reduce((s, o) => s + Number(o.total), 0); const vigentes = boletos.filter((b) => b.eventoId === evento.id && (b.estado === "VALIDO" || b.estado === "USADO")).length; const tipo = evento.estado === "BORRADOR" ? "BORRADOR" : !evento.esDePago ? "GRATUITO" : cobrado === 0 ? "DE_PAGO_SIN_VENTAS" : "DE_PAGO_CON_VENTAS"; return json(res, 200, { permitida: evento.estado !== "CANCELADO", tipo, importeCobrado: cobrado.toFixed(2), comision: "0.00", reembolso: cobrado.toFixed(2), boletosAfectados: vigentes, motivoBloqueo: evento.estado === "CANCELADO" ? "El evento ya está cancelado." : null }); }
    if (sub === "/cancelacion") { if (!exigir()) return; if (usuario.roles.includes("ADMIN") && usuario.id !== evento.organizadorId && !cuerpo.motivo) return problema(res, 422, "MOTIVO_REQUERIDO", "Escribe el motivo."); evento.estado = "CANCELADO"; evento.motivoCancelacion = cuerpo.motivo ?? null; evento.fechaCancelacion = new Date().toISOString(); let anulados = 0; for (const b of boletos) if (b.eventoId === evento.id && b.estado !== "CANCELADO") { b.estado = "CANCELADO"; anulados += 1; } return json(res, 200, { eventoId: evento.id, importeReembolsado: "360.00", comision: "0.00", boletosAnulados: anulados, asistentesNotificados: 1, canceladoPor: usuario.id, fechaCancelacion: evento.fechaCancelacion }); }
    if (sub === "/reportes") { if (!exigir()) return; const emitidos = boletos.filter((b) => b.eventoId === evento.id && b.estado !== "CANCELADO"); const validados = emitidos.filter((b) => b.estado === "USADO").length; const ingresos = ordenes.filter((o) => o.eventoId === evento.id && o.estadoOrden === "PAGADA").reduce((s, o) => s + Number(o.total), 0); return json(res, 200, { eventoId: evento.id, evento: evento.nombre, estado: evento.estado, aforo: evento.aforo, disponibles: evento.disponibles, boletosEmitidos: emitidos.length, accesosValidados: validados, accesosRechazados: validaciones.filter((v) => v.eventoId === evento.id && v.resultado === "RECHAZADO").length, boletosCancelados: boletos.filter((b) => b.eventoId === evento.id && b.estado === "CANCELADO").length, ingresos: ingresos.toFixed(2), reembolsado: "0.00", ocupacion: (evento.aforo - evento.disponibles) / evento.aforo, porTipo: evento.tipos.map((t) => ({ tipoBoletoId: t.id, nombre: t.nombre, precio: t.precio, cantidadTotal: t.cantidadTotal, vendidos: t.cantidadTotal - t.disponibles, disponibles: t.disponibles, ingresos: ((t.cantidadTotal - t.disponibles) * Number(t.precio)).toFixed(2) })) }); }
    if (sub === "/manifiesto") { if (!exigir()) return; const b = boletos.filter((x) => x.eventoId === evento.id && (x.estado === "VALIDO" || x.estado === "USADO")); return json(res, 200, { eventoId: evento.id, evento: evento.nombre, generadoEn: new Date().toISOString(), total: b.length, boletos: b.map((x) => ({ codigo: x.codigo, firma: x.firma, estado: x.estado, tipoBoleto: x.tipoNombre, asiento: x.asientoEtiqueta })) }); }
    if (sub === "/imagen") { if (!exigir()) return; evento.imagenUrl = metodo === "DELETE" ? null : "/api/imagenes/portada-demo.jpg"; return json(res, 200, publico(evento)); }
  }
  if (ruta === "/api/organizador/eventos") { if (!exigir()) return; return json(res, 200, eventos.filter((e) => e.organizadorId === usuario.id).map(publico)); }

  if (ruta === "/api/ordenes" && metodo === "POST") {
    if (!exigir()) return;
    const clave = req.headers["idempotency-key"];
    if (!clave || !/^[A-Za-z0-9_-]{8,64}$/.test(clave)) return problema(res, 400, "SOLICITUD_INVALIDA", "Falta Idempotency-Key.");
    if (idempotencia.has(clave)) return json(res, 200, idempotencia.get(clave));
    const evento = eventos.find((e) => e.id === cuerpo.eventoId);
    if (!evento) return problema(res, 404, "NO_ENCONTRADO", "No existe el evento.");
    if (evento.estado !== "PUBLICADO") return problema(res, 409, "ESTADO_INVALIDO", "El evento no está publicado.");
    const cantidad = Number(cuerpo.cantidad);
    if (!evento.esDePago && boletos.some((b) => b.eventoId === evento.id && b.usuarioId === usuario.id && b.estado !== "CANCELADO")) return problema(res, 409, "CONFIRMACION_DUPLICADA", "Ya confirmaste tu asistencia.");
    const tipo = evento.tipos.find((t) => t.id === cuerpo.tipoBoletoId) ?? evento.tipos[0];
    if (tipo.disponibles < cantidad || evento.disponibles < cantidad) return problema(res, 409, "AFORO_AGOTADO", "No hay lugares suficientes para esta compra.");
    if (evento.requiereAsiento) {
      const ids = cuerpo.asientosIds ?? [];
      if (ids.length !== cantidad) return problema(res, 422, "REGLA_NEGOCIO", "Faltan asientos.");
      if (ids.some((id) => asientos.find((a) => a.id === id)?.estado !== "DISPONIBLE")) return problema(res, 409, "ASIENTO_NO_DISPONIBLE", "Otro comprador tomó uno de los asientos.");
    }
    if (cuerpo.metodo === "OXXO" || cuerpo.metodo === "SPEI" || cuerpo.metodoPagoId) return problema(res, 422, "METODO_PAGO_NO_SOPORTADO", "Método no disponible.");
    if (cuerpo.metodo === "TARJETA" && cuerpo.tokenPago === "tok_error") {
      return problema(res, 503, "SERVICIO_EXTERNO_NO_DISPONIBLE", "La pasarela de pago no respondió. Intenta de nuevo.");
    }
    if (cuerpo.metodo === "TARJETA" && cuerpo.tokenPago === "tok_pendiente") {
      const pendiente = { ordenId: ordenId++, eventoId: evento.id, estadoOrden: "PENDIENTE", estadoPago: null, total: (Number(tipo.precio) * cantidad).toFixed(2), moneda: "MXN", referenciaPago: `SIM-P-${Date.now()}`, expiraEn: new Date(Date.now() + 10 * 60_000).toISOString(), mensaje: "La pasarela confirmara el pago en unos segundos.", boletos: [], usuarioId: usuario.id, pendienteDesde: Date.now(), tipoId: tipo.id, cantidad, asientosIds: cuerpo.asientosIds ?? [] };
      ordenes.push(pendiente);
      idempotencia.set(clave, pendiente);
      const { usuarioId, pendienteDesde, tipoId, cantidad: c, asientosIds, ...salida } = pendiente;
      return json(res, 201, salida);
    }
    if (cuerpo.metodo === "TARJETA" && cuerpo.tokenPago === "tok_rechazado") {
      const rechazada = { ordenId: ordenId++, eventoId: evento.id, estadoOrden: "CANCELADA", estadoPago: "RECHAZADO", total: (Number(tipo.precio) * cantidad).toFixed(2), moneda: "MXN", referenciaPago: `SIM-R-${Date.now()}`, mensaje: "El banco rechazó el pago.", boletos: [] };
      idempotencia.set(clave, rechazada);
      return json(res, 201, rechazada);
    }
    const orden = emitir(usuario.id, evento.id, tipo.id, cantidad, cuerpo.asientosIds ?? [], cuerpo.metodo);
    const { usuarioId, ...salida } = orden;
    idempotencia.set(clave, salida);
    return json(res, 201, salida, { location: `/api/ordenes/${orden.ordenId}` });
  }
  const mo = ruta.match(/^\/api\/ordenes\/(\d+)$/);
  if (mo) {
    if (!exigir()) return;
    const o = ordenes.find((x) => x.ordenId === Number(mo[1]));
    if (!o || (o.usuarioId !== usuario.id && !usuario.roles.includes("ADMIN"))) return problema(res, 404, "NO_ENCONTRADO", "No existe la orden.");
    if (o.estadoOrden === "PENDIENTE" && o.pendienteDesde && Date.now() - o.pendienteDesde > 12_000) {
      // SIMULACION del aviso de la pasarela: la orden pasa a PAGADA y se emiten los boletos.
      const confirmada = emitir(o.usuarioId, o.eventoId, o.tipoId, o.cantidad, o.asientosIds, "TARJETA");
      confirmada.ordenId = o.ordenId;
      for (const b of confirmada.boletos) b.ordenId = o.ordenId;
      ordenes.splice(ordenes.indexOf(o), 1);
      ordenes.splice(ordenes.indexOf(confirmada), 1, confirmada);
      const { usuarioId: u2, ...salida2 } = confirmada;
      return json(res, 200, salida2);
    }
    const { usuarioId, pendienteDesde, tipoId, cantidad, asientosIds, ...salida } = o;
    return json(res, 200, salida);
  }
  if (ruta === "/api/boletos") { if (!exigir()) return; return json(res, 200, boletos.filter((b) => b.usuarioId === usuario.id).slice().reverse()); }
  const mb = ruta.match(/^\/api\/boletos\/(\d+)$/);
  if (mb) { if (!exigir()) return; const b = boletos.find((x) => x.id === Number(mb[1])); if (!b || b.usuarioId !== usuario.id) return problema(res, 404, "NO_ENCONTRADO", "No existe el boleto."); return json(res, 200, b); }

  if (ruta === "/api/validaciones" && metodo === "POST") {
    if (!exigir()) return;
    const [codigo, firma] = String(cuerpo.qr ?? "").split(".");
    const responder = (resultado, motivo, mensaje, b) => { validaciones.push({ eventoId: cuerpo.eventoId, resultado }); return json(res, 200, { resultado, motivo, mensaje, codigo: b?.codigo ?? codigo ?? null, tipoBoleto: b?.tipoNombre ?? null, asiento: b?.asientoEtiqueta ?? null, fechaUso: b?.fechaUso ?? null }); };
    if (!codigo || !firma) return responder("RECHAZADO", "FORMATO_INVALIDO", "El código no tiene el formato de un boleto.");
    const b = boletos.find((x) => x.codigo === codigo);
    if (!b) return responder("RECHAZADO", "BOLETO_INEXISTENTE", "El boleto no existe.");
    if (b.firma !== firma) return responder("RECHAZADO", "FIRMA_INVALIDA", "La firma del boleto no coincide.");
    if (b.eventoId !== cuerpo.eventoId) return responder("RECHAZADO", "OTRO_EVENTO", "El boleto es de otro evento.", b);
    if (b.estado === "USADO") return responder("RECHAZADO", "YA_UTILIZADO", "Este boleto ya dio acceso.", b);
    if (b.estado !== "VALIDO") return responder("RECHAZADO", "CANCELADO", "Boleto cancelado.", b);
    b.estado = "USADO"; b.fechaUso = new Date().toISOString();
    return responder("PERMITIDO", null, "Acceso permitido", b);
  }
  if (ruta === "/api/validaciones/sincronizar") { if (!exigir()) return; const resultados = (cuerpo.registros ?? []).map((r) => { const b = boletos.find((x) => x.contenidoQr === r.qr); if (!b) return { qr: r.qr, fechaHora: r.fechaHora, resultado: "RECHAZADO", motivo: "BOLETO_INEXISTENTE", conflicto: false, duplicado: false }; if (b.estado === "USADO") return { qr: r.qr, fechaHora: r.fechaHora, resultado: "RECHAZADO", motivo: "YA_UTILIZADO", conflicto: true, duplicado: false }; b.estado = "USADO"; b.fechaUso = r.fechaHora; return { qr: r.qr, fechaHora: r.fechaHora, resultado: "PERMITIDO", motivo: null, conflicto: false, duplicado: false }; }); return json(res, 200, { procesados: resultados.length, permitidos: resultados.filter((r) => r.resultado === "PERMITIDO").length, rechazados: resultados.filter((r) => r.resultado === "RECHAZADO").length, conflictos: resultados.filter((r) => r.conflicto).length, resultados }); }

  if (ruta === "/api/admin/usuarios") { if (!exigir()) return; let r = usuarios; const q = url.searchParams.get("q")?.toLowerCase(); if (q) r = r.filter((u) => `${u.nombre} ${u.correo}`.toLowerCase().includes(q)); const estado = url.searchParams.get("estado"); if (estado) r = r.filter((u) => u.estado === estado); return lista(res, r); }
  const mu = ruta.match(/^\/api\/admin\/usuarios\/(\d+)\/estado$/);
  if (mu) { if (!exigir()) return; const u = usuarios.find((x) => x.id === Number(mu[1])); if (!u) return problema(res, 404, "NO_ENCONTRADO", "No existe."); if (u.id === usuario.id) return problema(res, 422, "REGLA_NEGOCIO", "No puedes cambiar tu propia cuenta."); u.estado = cuerpo.estado; return json(res, 200, u); }
  if (ruta === "/api/admin/eventos") { if (!exigir()) return; const estado = url.searchParams.get("estado"); return lista(res, eventos.filter((e) => !estado || e.estado === estado).map(publico)); }

  problema(res, 404, "NO_ENCONTRADO", `Sin ruta ${metodo} ${ruta}`);
});

servidor.listen(PUERTO, () => console.log(`API simulada en http://localhost:${PUERTO}`));
