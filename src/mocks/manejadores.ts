/*
 * API SIMULADA con Mock Service Worker. Reproduce el contrato de la API de EnZona (rutas, códigos de estado,
 * Problem Details con `codigo`, paginación por cabeceras e Idempotency-Key) para las pruebas automáticas y el
 * modo demostración. Las reglas de negocio reales viven en la API; aquí solo se imitan las necesarias.
 */
import { http, HttpResponse, type DefaultBodyType } from 'msw';
import { env } from '@/config/env';
import type { Asiento, Boleto, Evento, EventoSolicitud, Orden, PoliticaCancelacion, Rol } from '@/api/tipos';
import { crearBase, type BaseSimulada, type EventoSimulado, type OrdenSimulada, type UsuarioSimulado } from './datos';

/** Código fijo de verificación en la API simulada (la real lo envía por correo o lo escribe en la bitácora). */
export const CODIGO_DEMO = '123456';

let db: BaseSimulada = crearBase();

/** Reinicia los datos (entre pruebas). */
export function reiniciarBase(): BaseSimulada {
  db = crearBase();
  return db;
}

export const base = () => db;

/** Serializa la base (modo demostración) para que sobreviva a una recarga de la pestaña. */
export function exportarBase(): string {
  return JSON.stringify({ ...db, sesiones: [...db.sesiones] });
}

/** Restaura una base exportada; si el contenido no es válido conserva la base inicial. */
export function importarBase(texto: string | null): void {
  if (!texto) return;
  try {
    const datos = JSON.parse(texto) as Omit<BaseSimulada, 'sesiones'> & { sesiones: [string, number][] };
    db = { ...datos, sesiones: new Map(datos.sesiones) };
  } catch {
    db = crearBase();
  }
}

const api = (ruta: string) => `${env.apiUrl}/api${ruta}`;
const ahoraIso = () => new Date().toISOString();

function problema(status: number, codigo: string, detail: string, errores?: { campo: string; mensaje: string }[]) {
  return HttpResponse.json(
    { status, codigo, detail, title: 'Error', errores, timestamp: ahoraIso() },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );
}

function usuarioDe(request: Request): UsuarioSimulado | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const id = db.sesiones.get(token);
  const usuario = db.usuarios.find((u) => u.id === id);
  return usuario && usuario.estado === 'ACTIVO' ? usuario : null;
}

const noAutenticado = () => problema(401, 'NO_AUTENTICADO', 'Se requiere iniciar sesión');
const prohibido = () => problema(403, 'ACCESO_DENEGADO', 'No tienes permiso para realizar esta acción');
const noEncontrado = () => problema(404, 'NO_ENCONTRADO', 'El recurso no existe');

const tiene = (u: UsuarioSimulado, ...roles: Rol[]) => u.roles.some((r) => roles.includes(r));

function aEvento(e: EventoSimulado, detalle: boolean, distanciaKm: number | null = null): Evento {
  const disponibles = e.tipos.reduce((s, t) => s + t.disponibles, 0);
  const precios = e.tipos.map((t) => Number(t.precio));
  const { tipos, asientos: _a, validadores: _v, ...resto } = e;
  return {
    ...resto,
    disponibles,
    precioDesde: (precios.length ? Math.min(...precios) : 0).toFixed(2),
    distanciaKm,
    tiposBoleto: detalle ? tipos.map((t) => ({ ...t })) : null,
  };
}

function distancia(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

const terminado = (e: EventoSimulado) =>
  new Date(e.fechaHoraFin ?? new Date(new Date(e.fechaHoraInicio).getTime() + 6 * 3_600_000).toISOString()) <
  new Date();

function paginar<T>(lista: T[], url: URL) {
  const pagina = Math.max(0, Number(url.searchParams.get('page') ?? 0));
  const tamano = Math.min(100, Math.max(1, Number(url.searchParams.get('size') ?? 20)));
  const elementos = lista.slice(pagina * tamano, pagina * tamano + tamano);
  return HttpResponse.json(elementos as DefaultBodyType, {
    headers: {
      'X-Total-Count': String(lista.length),
      'X-Page': String(pagina),
      'X-Page-Size': String(tamano),
      'X-Total-Pages': String(Math.max(1, Math.ceil(lista.length / tamano))),
    },
  });
}

/** Firma simulada (la real es HMAC-SHA256 en el servidor). */
function firmar(codigo: string): string {
  let h = 2166136261;
  for (const c of `enzona:${codigo}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return (h.toString(36) + codigo.split('').reverse().join('') + 'SimuladoQR')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, 24);
}

const siguiente = () => ++db.secuencia;

/** Emite N boletos (uno por asiento si el evento es numerado) y ocupa los asientos. */
function emitirBoletos(
  e: EventoSimulado,
  tipo: EventoSimulado['tipos'][number],
  ordenId: number,
  usuarioId: number,
  asientos: number[],
  cantidad: number,
): Boleto[] {
  const emitidos: Boleto[] = Array.from({ length: cantidad }, (_, i) => {
    const asiento = e.requiereAsiento ? e.asientos.find((a) => a.id === asientos[i]) : undefined;
    if (asiento) asiento.estado = 'OCUPADO';
    const id = siguiente();
    const codigo = `EZ-${String(id).padStart(4, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const firma = firmar(codigo);
    return {
      id,
      ordenId,
      eventoId: e.id,
      tipoBoletoId: tipo.id,
      asientoId: asiento?.id ?? null,
      codigo,
      firma,
      contenidoQr: `${codigo}.${firma}`,
      estado: 'VALIDO',
      fechaEmision: ahoraIso(),
      fechaUso: null,
      eventoNombre: e.nombre,
      fechaHoraInicio: e.fechaHoraInicio,
      lugar: e.lugar,
      tipoNombre: tipo.nombre,
      asientoEtiqueta: asiento?.etiqueta ?? null,
    };
  });
  emitidos.forEach((b) => db.boletos.push({ ...b, usuarioId }));
  return emitidos;
}

/** Segundos que tarda la pasarela simulada en confirmar un pago pendiente (el webhook de la API real). */
const ESPERA_WEBHOOK_MS = 6_000;

/**
 * Imita el webhook y la tarea programada de la API: `tok_pendiente` se aprueba a los pocos segundos y
 * `tok_error` (pasarela sin respuesta) se cancela al vencer la orden, liberando el cupo y los asientos.
 */
function resolverPendiente(o: OrdenSimulada): void {
  if (o.estadoOrden !== 'PENDIENTE' || !o.pendiente) return;
  const e = db.eventos.find((x) => x.id === o.eventoId);
  const tipo = e?.tipos.find((t) => t.id === o.pendiente?.tipoId);
  if (!e || !tipo) return;
  const { cantidad, asientosIds, token, creadaEn } = o.pendiente;
  if (token === 'tok_pendiente' && Date.now() - creadaEn >= ESPERA_WEBHOOK_MS) {
    o.boletos = emitirBoletos(e, tipo, o.ordenId, o.usuarioId, asientosIds, cantidad);
    Object.assign(o, { estadoOrden: 'PAGADA', estadoPago: 'APROBADO', expiraEn: null, mensaje: null });
    delete o.pendiente;
  } else if (o.expiraEn && Date.now() >= new Date(o.expiraEn).getTime()) {
    tipo.disponibles += cantidad;
    for (const id of asientosIds) {
      const a = e.asientos.find((x) => x.id === id);
      if (a?.estado === 'RESERVADO') a.estado = 'DISPONIBLE';
    }
    Object.assign(o, {
      estadoOrden: 'CANCELADA',
      mensaje: 'La pasarela no confirmó el pago a tiempo. No se realizó ningún cargo.',
    });
    delete o.pendiente;
  }
}

function cuerpoInvalido(errores: { campo: string; mensaje: string }[]) {
  return problema(400, 'VALIDACION', 'Los datos enviados no son válidos', errores);
}

// ---------------------------------------------------------------- identidad

const identidad = [
  http.post(api('/auth/registro'), async ({ request }) => {
    const d = (await request.json()) as Record<string, unknown>;
    const errores = [];
    if (!d.nombre) errores.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio' });
    if (!d.correo) errores.push({ campo: 'correo', mensaje: 'El correo es obligatorio' });
    if (d.aceptaAvisoPrivacidad !== true)
      errores.push({ campo: 'aceptaAvisoPrivacidad', mensaje: 'Debes aceptar el aviso de privacidad' });
    if (errores.length) return cuerpoInvalido(errores);
    const correo = String(d.correo).toLowerCase();
    if (db.usuarios.some((u) => u.correo === correo))
      return problema(409, 'CORREO_REGISTRADO', 'El correo ya está registrado');
    if (db.usuarios.some((u) => u.curp === String(d.curp).toUpperCase()))
      return problema(409, 'CURP_REGISTRADO', 'El CURP ya está registrado');
    const usuario: UsuarioSimulado = {
      id: siguiente(),
      nombre: String(d.nombre),
      correo,
      telefono: (d.telefono as string) || null,
      curp: String(d.curp).toUpperCase(),
      contrasena: String(d.contrasena),
      estado: 'PENDIENTE',
      roles: d.organizador ? ['ASISTENTE', 'ORGANIZADOR'] : ['ASISTENTE'],
      correoVerificado: false,
      telefonoVerificado: false,
      fechaRegistro: ahoraIso(),
      codigo: CODIGO_DEMO,
    };
    db.usuarios.push(usuario);
    console.info(`[API simulada] Código de verificación para ${correo}: ${CODIGO_DEMO}`);
    return HttpResponse.json(
      {
        usuarioId: usuario.id,
        correo,
        estado: 'PENDIENTE',
        verificacionesPendientes: usuario.telefono ? ['CORREO', 'TELEFONO'] : ['CORREO'],
      },
      { status: 201 },
    );
  }),

  http.post(api('/auth/verificacion'), async ({ request }) => {
    const { correo, codigo, canal } = (await request.json()) as { correo: string; codigo: string; canal?: string };
    const u = db.usuarios.find((x) => x.correo === String(correo).toLowerCase());
    if (!u || codigo !== CODIGO_DEMO)
      return problema(400, 'CODIGO_VERIFICACION_INVALIDO', 'El código de verificación no es válido');
    if (canal === 'TELEFONO') u.telefonoVerificado = true;
    else u.correoVerificado = true;
    const pendientes = [
      ...(u.correoVerificado ? [] : ['CORREO']),
      ...(u.telefono && !u.telefonoVerificado ? ['TELEFONO'] : []),
    ];
    if (pendientes.length === 0 && u.estado === 'PENDIENTE') u.estado = 'ACTIVO';
    return HttpResponse.json({
      estado: u.estado,
      correoVerificado: u.correoVerificado,
      telefonoVerificado: u.telefonoVerificado,
      verificacionesPendientes: pendientes,
    });
  }),

  http.post(api('/auth/verificacion/reenvio'), () => new HttpResponse(null, { status: 202 })),

  http.post(api('/auth/sesion'), async ({ request }) => {
    const { identificador, contrasena } = (await request.json()) as { identificador: string; contrasena: string };
    const id = String(identificador).trim().toLowerCase();
    const u = db.usuarios.find((x) => x.correo === id || x.curp.toLowerCase() === id);
    if (!u || u.contrasena !== contrasena) return problema(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
    if (u.estado === 'PENDIENTE') return problema(403, 'CUENTA_PENDIENTE', 'La cuenta aún no está verificada');
    if (u.estado === 'BLOQUEADO') return problema(403, 'CUENTA_BLOQUEADA', 'La cuenta está bloqueada');
    const token = `simulado.${u.id}.${Math.random().toString(36).slice(2)}`;
    db.sesiones.set(token, u.id);
    return HttpResponse.json({
      token,
      tipo: 'Bearer',
      expiraEnSegundos: 3600,
      expiraEn: new Date(Date.now() + 3_600_000).toISOString(),
      usuario: { id: u.id, nombre: u.nombre, correo: u.correo, roles: u.roles },
    });
  }),

  http.get(api('/usuarios/me'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const { contrasena: _c, curp: _p, codigo: _o, ...perfil } = u;
    return HttpResponse.json(perfil);
  }),

  http.put(api('/usuarios/me'), async ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const { nombre, telefono } = (await request.json()) as { nombre: string; telefono: string | null };
    if (!nombre?.trim()) return cuerpoInvalido([{ campo: 'nombre', mensaje: 'El nombre es obligatorio' }]);
    if (telefono !== u.telefono) u.telefonoVerificado = false;
    u.nombre = nombre.trim();
    u.telefono = telefono || null;
    const { contrasena: _c, curp: _p, codigo: _o, ...perfil } = u;
    return HttpResponse.json(perfil);
  }),

  http.put(api('/usuarios/me/contrasena'), async ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const { actual, nueva } = (await request.json()) as { actual: string; nueva: string };
    if (actual !== u.contrasena) return problema(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas');
    u.contrasena = nueva;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(api('/usuarios/me/roles/organizador'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    if (!u.roles.includes('ORGANIZADOR')) u.roles = [...u.roles, 'ORGANIZADOR'];
    return HttpResponse.json({ id: u.id, nombre: u.nombre, correo: u.correo, roles: u.roles });
  }),

  http.delete(api('/usuarios/me/roles/organizador'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const vigentes = db.eventos.some((e) => e.organizadorId === u.id && e.estado === 'PUBLICADO' && !terminado(e));
    if (vigentes || u.roles.length === 1)
      return problema(409, 'ROL_EN_USO', 'No es posible quitar el rol mientras tenga eventos vigentes');
    u.roles = u.roles.filter((r) => r !== 'ORGANIZADOR');
    return HttpResponse.json({ id: u.id, nombre: u.nombre, correo: u.correo, roles: u.roles });
  }),
];

// ---------------------------------------------------------------- eventos

function validarEvento(d: EventoSolicitud): Response | null {
  const errores = [];
  if (!d.nombre?.trim()) errores.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio' });
  if (!d.lugar?.trim()) errores.push({ campo: 'lugar', mensaje: 'El lugar es obligatorio' });
  if (!d.fechaHoraInicio || new Date(d.fechaHoraInicio) <= new Date())
    errores.push({ campo: 'fechaHoraInicio', mensaje: 'La fecha de inicio debe ser futura' });
  if (!d.aforo || d.aforo < 1) errores.push({ campo: 'aforo', mensaje: 'El aforo debe ser de al menos 1' });
  if (errores.length) return cuerpoInvalido(errores);
  if ((d.latitud === null) !== (d.longitud === null))
    return problema(422, 'REGLA_NEGOCIO', 'La latitud y la longitud van juntas');
  if (d.publicar && d.latitud === null)
    return problema(422, 'REGLA_NEGOCIO', 'Para publicar el evento hacen falta sus coordenadas');
  if (d.esDePago) {
    if (!d.tiposBoleto?.length)
      return problema(422, 'REGLA_NEGOCIO', 'Un evento de pago necesita al menos un tipo de boleto');
    if (d.tiposBoleto.some((t) => !(t.precio > 0)))
      return problema(422, 'REGLA_NEGOCIO', 'Cada tipo de boleto de pago necesita un precio mayor a 0');
    if (d.tiposBoleto.reduce((s, t) => s + t.cantidad, 0) > d.aforo)
      return problema(422, 'REGLA_NEGOCIO', 'La suma de boletos supera el aforo del evento');
  }
  if (d.requiereAsiento && d.secciones) {
    const total = d.secciones.reduce((s, x) => s + x.filas * x.asientosPorFila, 0);
    if (total !== d.aforo)
      return problema(422, 'REGLA_NEGOCIO', `El total de asientos (${total}) debe ser igual al aforo (${d.aforo})`);
  }
  return null;
}

function construirAsientos(d: EventoSolicitud): Asiento[] {
  const lista: Asiento[] = [];
  for (const s of d.secciones ?? []) {
    for (let f = 0; f < s.filas; f++) {
      const fila = String.fromCharCode(65 + f);
      for (let n = 1; n <= s.asientosPorFila; n++)
        lista.push({
          id: siguiente(),
          seccion: s.nombre,
          fila,
          numero: String(n),
          estado: 'DISPONIBLE',
          etiqueta: `${s.nombre} · Fila ${fila} · Asiento ${n}`,
        });
    }
  }
  return lista;
}

function boletosVigentes(eventoId: number) {
  return db.boletos.filter((b) => b.eventoId === eventoId && (b.estado === 'VALIDO' || b.estado === 'USADO'));
}

const eventos = [
  http.get(api('/categorias'), () => HttpResponse.json(db.categorias)),

  http.get(api('/eventos'), ({ request }) => {
    const url = new URL(request.url);
    const p = url.searchParams;
    const q = p.get('q')?.toLowerCase();
    const lat = p.get('lat') ? Number(p.get('lat')) : null;
    const lng = p.get('lng') ? Number(p.get('lng')) : null;
    if ((lat === null) !== (lng === null)) return problema(422, 'REGLA_NEGOCIO', 'lat y lng van juntas');
    const radio = Number(p.get('radioKm') ?? 15);
    let lista = db.eventos
      .filter((e) => e.estado === 'PUBLICADO' && !terminado(e))
      .filter((e) => !q || [e.nombre, e.descripcion ?? '', e.lugar].some((t) => t.toLowerCase().includes(q)))
      .filter((e) => !p.get('categoriaId') || e.categoriaId === Number(p.get('categoriaId')))
      .filter((e) => !p.get('esDePago') || String(e.esDePago) === p.get('esDePago'))
      .filter((e) => !p.get('desde') || new Date(e.fechaHoraInicio) >= new Date(p.get('desde')!))
      .filter((e) => !p.get('hasta') || new Date(e.fechaHoraInicio) <= new Date(p.get('hasta')!));
    let resultado: Evento[];
    if (lat !== null && lng !== null) {
      resultado = lista
        .filter((e) => e.latitud !== null && e.longitud !== null)
        .map((e) => aEvento(e, false, distancia(lat, lng, e.latitud!, e.longitud!)))
        .filter((e) => (e.distanciaKm ?? 0) <= radio)
        .sort((a, b) => a.distanciaKm! - b.distanciaKm! || a.fechaHoraInicio.localeCompare(b.fechaHoraInicio));
    } else {
      const ciudad = p.get('ciudad')?.toLowerCase();
      if (ciudad) lista = lista.filter((e) => (e.ciudad ?? '').toLowerCase() === ciudad);
      resultado = lista
        .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio))
        .map((e) => aEvento(e, false));
    }
    return paginar(resultado, url);
  }),

  http.get(api('/eventos/:id'), ({ request, params }) => {
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    const u = usuarioDe(request);
    if (e.estado === 'BORRADOR' && !(u && (u.id === e.organizadorId || tiene(u, 'ADMIN')))) return noEncontrado();
    return HttpResponse.json(aEvento(e, true));
  }),

  http.get(api('/organizador/eventos'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    if (!tiene(u, 'ORGANIZADOR')) return prohibido();
    return HttpResponse.json(
      db.eventos
        .filter((e) => e.organizadorId === u.id)
        .sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio))
        .map((e) => aEvento(e, false)),
    );
  }),

  http.post(api('/eventos'), async ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    if (!tiene(u, 'ORGANIZADOR')) return prohibido();
    const d = (await request.json()) as EventoSolicitud;
    const error = validarEvento(d);
    if (error) return error;
    const id = siguiente();
    const tipos = d.esDePago
      ? d.tiposBoleto!.map((t) => ({
          id: siguiente(),
          nombre: t.nombre,
          precio: t.precio.toFixed(2),
          cantidadTotal: t.cantidad,
          disponibles: t.cantidad,
        }))
      : [{ id: siguiente(), nombre: 'General', precio: '0.00', cantidadTotal: d.aforo, disponibles: d.aforo }];
    const categoria = db.categorias.find((c) => c.id === d.categoriaId);
    const nuevo: EventoSimulado = {
      id,
      organizadorId: u.id,
      nombre: d.nombre.trim(),
      descripcion: d.descripcion,
      lugar: d.lugar.trim(),
      direccion: d.direccion,
      ciudad: d.ciudad || 'Orizaba',
      latitud: d.latitud,
      longitud: d.longitud,
      categoriaId: categoria?.id ?? null,
      categoria: categoria?.nombre ?? null,
      fechaHoraInicio: d.fechaHoraInicio,
      fechaHoraFin: d.fechaHoraFin,
      esDePago: d.esDePago,
      requiereAsiento: d.requiereAsiento,
      aforo: d.aforo,
      estado: d.publicar ? 'PUBLICADO' : 'BORRADOR',
      fechaCancelacion: null,
      motivoCancelacion: null,
      tipos,
      asientos: d.requiereAsiento ? construirAsientos(d) : [],
      validadores: [],
    };
    db.eventos.push(nuevo);
    return HttpResponse.json(aEvento(nuevo, true), { status: 201, headers: { Location: `/api/eventos/${id}` } });
  }),

  http.put(api('/eventos/:id'), async ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id) return prohibido();
    if (e.estado === 'CANCELADO' || e.estado === 'REALIZADO')
      return problema(409, 'ESTADO_INVALIDO', 'La operación no es posible en el estado actual');
    const d = (await request.json()) as EventoSolicitud;
    const error = validarEvento({ ...d, publicar: d.publicar || e.estado === 'PUBLICADO' });
    if (error) return error;
    const vendidos = boletosVigentes(e.id).length;
    if (d.aforo < vendidos)
      return problema(
        409,
        'POLITICA_MODIFICACION',
        `El aforo no puede ser menor a los ${vendidos} boletos ya emitidos`,
      );
    if (e.estado === 'PUBLICADO' && (d.esDePago !== e.esDePago || d.requiereAsiento !== e.requiereAsiento))
      return problema(409, 'POLITICA_MODIFICACION', 'En un evento publicado no cambia la modalidad');
    const categoria = db.categorias.find((c) => c.id === d.categoriaId);
    Object.assign(e, {
      nombre: d.nombre.trim(),
      descripcion: d.descripcion,
      lugar: d.lugar.trim(),
      direccion: d.direccion,
      ciudad: d.ciudad || e.ciudad,
      latitud: d.latitud,
      longitud: d.longitud,
      categoriaId: categoria?.id ?? null,
      categoria: categoria?.nombre ?? null,
      fechaHoraInicio: d.fechaHoraInicio,
      fechaHoraFin: d.fechaHoraFin,
      aforo: d.aforo,
      esDePago: d.esDePago,
      requiereAsiento: d.requiereAsiento,
    });
    if (d.esDePago && d.tiposBoleto) {
      e.tipos = d.tiposBoleto.map((t) => {
        const previo = e.tipos.find((x) => x.id === t.id);
        const vendidosTipo = previo ? previo.cantidadTotal - previo.disponibles : 0;
        return {
          id: previo?.id ?? siguiente(),
          nombre: t.nombre,
          precio: t.precio.toFixed(2),
          cantidadTotal: t.cantidad,
          disponibles: t.cantidad - vendidosTipo,
        };
      });
    } else if (!d.esDePago) {
      const t = e.tipos[0];
      const vendidosTipo = t ? t.cantidadTotal - t.disponibles : 0;
      e.tipos = [
        {
          id: t?.id ?? siguiente(),
          nombre: 'General',
          precio: '0.00',
          cantidadTotal: d.aforo,
          disponibles: d.aforo - vendidosTipo,
        },
      ];
    }
    if (d.requiereAsiento && d.secciones && vendidos === 0) e.asientos = construirAsientos(d);
    if (d.publicar && e.estado === 'BORRADOR') e.estado = 'PUBLICADO';
    return HttpResponse.json(aEvento(e, true));
  }),

  http.post(api('/eventos/:id/publicacion'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id) return prohibido();
    if (e.estado !== 'BORRADOR') return problema(409, 'ESTADO_INVALIDO', 'El evento ya está publicado');
    if (e.latitud === null)
      return problema(422, 'REGLA_NEGOCIO', 'Para publicar el evento hacen falta sus coordenadas');
    e.estado = 'PUBLICADO';
    return HttpResponse.json(aEvento(e, true));
  }),

  http.get(api('/eventos/:id/asientos'), ({ request, params }) => {
    if (!usuarioDe(request)) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    return HttpResponse.json(e.asientos);
  }),

  http.get(api('/eventos/:id/validadores'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id && !tiene(u, 'ADMIN')) return prohibido();
    return HttpResponse.json(
      e.validadores
        .map((id) => db.usuarios.find((x) => x.id === id)!)
        .map((x) => ({ usuarioId: x.id, nombre: x.nombre, correo: x.correo })),
    );
  }),

  http.post(api('/eventos/:id/validadores'), async ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id && !tiene(u, 'ADMIN')) return prohibido();
    const { correo } = (await request.json()) as { correo: string };
    const v = db.usuarios.find((x) => x.correo === String(correo).trim().toLowerCase());
    if (!v) return problema(404, 'NO_ENCONTRADO', 'No existe una cuenta con ese correo');
    if (v.estado !== 'ACTIVO') return problema(422, 'REGLA_NEGOCIO', 'La cuenta no está activa');
    if (!v.roles.includes('VALIDADOR')) v.roles = [...v.roles, 'VALIDADOR'];
    if (!e.validadores.includes(v.id)) e.validadores.push(v.id);
    return HttpResponse.json({ usuarioId: v.id, nombre: v.nombre, correo: v.correo }, { status: 201 });
  }),

  http.delete(api('/eventos/:id/validadores/:usuarioId'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id && !tiene(u, 'ADMIN')) return prohibido();
    e.validadores = e.validadores.filter((id) => id !== Number(params.usuarioId));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/eventos/:id/politica-cancelacion'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id && !tiene(u, 'ADMIN')) return prohibido();
    return HttpResponse.json(politica(e, e.organizadorId !== u.id));
  }),

  http.post(api('/eventos/:id/cancelacion'), async ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    const administrativa = e.organizadorId !== u.id;
    if (administrativa && !tiene(u, 'ADMIN')) return prohibido();
    const p = politica(e, administrativa);
    if (!p.permitida)
      return problema(409, 'EVENTO_NO_CANCELABLE', p.motivoBloqueo ?? 'El evento ya no puede cancelarse');
    const { motivo } = ((await request.json().catch(() => ({}))) ?? {}) as { motivo?: string | null };
    if (administrativa && !motivo?.trim())
      return problema(422, 'MOTIVO_REQUERIDO', 'Se requiere el motivo de la cancelación');
    const afectados = boletosVigentes(e.id).filter((b) => b.estado === 'VALIDO');
    afectados.forEach((b) => (b.estado = 'CANCELADO'));
    e.estado = 'CANCELADO';
    e.fechaCancelacion = ahoraIso();
    e.motivoCancelacion = motivo?.trim() || null;
    return HttpResponse.json({
      eventoId: e.id,
      importeReembolsado: p.reembolso,
      comision: '0.00',
      boletosAnulados: afectados.length,
      asistentesNotificados: new Set(afectados.map((b) => b.usuarioId)).size,
      canceladoPor: u.id,
      fechaCancelacion: e.fechaCancelacion,
    });
  }),

  http.get(api('/eventos/:id/reportes'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const e = db.eventos.find((x) => x.id === Number(params.id));
    if (!e) return noEncontrado();
    if (e.organizadorId !== u.id && !tiene(u, 'ADMIN')) return prohibido();
    const vigentes = boletosVigentes(e.id);
    const pagadas = db.ordenes.filter((o) => o.eventoId === e.id && o.estadoOrden === 'PAGADA');
    const ingresos = pagadas.reduce((s, o) => s + Number(o.total), 0);
    const disponibles = e.tipos.reduce((s, t) => s + t.disponibles, 0);
    return HttpResponse.json({
      eventoId: e.id,
      evento: e.nombre,
      estado: e.estado,
      aforo: e.aforo,
      disponibles,
      boletosEmitidos: vigentes.length,
      accesosValidados: vigentes.filter((b) => b.estado === 'USADO').length,
      accesosRechazados: db.validaciones.filter((v) => v.eventoId === e.id && v.resultado === 'RECHAZADO').length,
      boletosCancelados: db.boletos.filter((b) => b.eventoId === e.id && b.estado === 'CANCELADO').length,
      ingresos: ingresos.toFixed(2),
      reembolsado: '0.00',
      ocupacion: e.aforo ? Math.round(((e.aforo - disponibles) / e.aforo) * 1000) / 10 : 0,
      porTipo: e.tipos.map((t) => ({
        tipoBoletoId: t.id,
        nombre: t.nombre,
        precio: t.precio,
        cantidadTotal: t.cantidadTotal,
        disponibles: t.disponibles,
        emitidos: vigentes.filter((b) => b.tipoBoletoId === t.id).length,
        ingresos: (vigentes.filter((b) => b.tipoBoletoId === t.id).length * Number(t.precio)).toFixed(2),
      })),
    });
  }),
];

function politica(e: EventoSimulado, administrativa: boolean): PoliticaCancelacion {
  const cobrado = db.ordenes
    .filter((o) => o.eventoId === e.id && o.estadoOrden === 'PAGADA')
    .reduce((s, o) => s + Number(o.total), 0);
  if (e.estado === 'CANCELADO' || e.estado === 'REALIZADO')
    return {
      permitida: false,
      tipo: null,
      importeCobrado: cobrado.toFixed(2),
      comision: '0.00',
      reembolso: '0.00',
      boletosAfectados: 0,
      motivoBloqueo: `El evento ya está ${e.estado}`,
    };
  if (new Date(e.fechaHoraInicio) <= new Date())
    return {
      permitida: false,
      tipo: null,
      importeCobrado: cobrado.toFixed(2),
      comision: '0.00',
      reembolso: '0.00',
      boletosAfectados: 0,
      motivoBloqueo: 'El evento ya inició; solo puede marcarse como finalizado',
    };
  const tipo = administrativa
    ? 'ADMINISTRATIVA'
    : e.estado === 'BORRADOR'
      ? 'BORRADOR'
      : !e.esDePago
        ? 'GRATUITO'
        : cobrado === 0
          ? 'DE_PAGO_SIN_VENTAS'
          : 'DE_PAGO_CON_VENTAS';
  return {
    permitida: true,
    tipo,
    importeCobrado: cobrado.toFixed(2),
    comision: '0.00',
    reembolso: cobrado.toFixed(2),
    boletosAfectados: boletosVigentes(e.id).filter((b) => b.estado === 'VALIDO').length,
    motivoBloqueo: null,
  };
}

// ---------------------------------------------------------------- boletaje

const boletaje = [
  http.post(api('/ordenes'), async ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const clave = request.headers.get('Idempotency-Key');
    if (!clave || !/^[A-Za-z0-9_-]{8,64}$/.test(clave))
      return problema(400, 'SOLICITUD_INVALIDA', 'La cabecera Idempotency-Key es obligatoria');
    const previa = db.ordenes.find((o) => o.clave === clave && o.usuarioId === u.id);
    if (previa) {
      const { usuarioId: _u, clave: _c, pendiente: _p, ...orden } = previa;
      return HttpResponse.json(orden, { status: 200 });
    }
    const d = (await request.json()) as {
      eventoId: number;
      tipoBoletoId: number | null;
      cantidad: number;
      asientosIds: number[];
      metodo: string;
      tokenPago: string | null;
    };
    const e = db.eventos.find((x) => x.id === d.eventoId);
    if (!e) return noEncontrado();
    if (e.estado !== 'PUBLICADO' || new Date(e.fechaHoraInicio) <= new Date())
      return problema(409, 'ESTADO_INVALIDO', 'El evento no admite compras en su estado actual');
    if (d.metodo === 'OXXO' || d.metodo === 'SPEI')
      return problema(422, 'METODO_PAGO_NO_SOPORTADO', 'El método de pago aún no está disponible');
    const tipo = d.tipoBoletoId
      ? e.tipos.find((t) => t.id === d.tipoBoletoId)
      : e.tipos.length === 1
        ? e.tipos[0]
        : undefined;
    if (!tipo) return problema(422, 'REGLA_NEGOCIO', 'Elige un tipo de boleto');
    if (!e.esDePago) {
      if (d.cantidad !== 1)
        return problema(422, 'REGLA_NEGOCIO', 'En eventos gratuitos se confirma un lugar por persona');
      if (db.boletos.some((b) => b.eventoId === e.id && b.usuarioId === u.id && b.estado !== 'CANCELADO'))
        return problema(409, 'CONFIRMACION_DUPLICADA', 'Ya confirmaste tu asistencia a este evento');
    } else if (d.metodo !== 'TARJETA' || !d.tokenPago) {
      return problema(422, 'REGLA_NEGOCIO', 'Los eventos de pago se cobran con tarjeta');
    }
    if (d.cantidad > 10) return problema(422, 'REGLA_NEGOCIO', 'Máximo 10 boletos por orden');
    if (tipo.disponibles < d.cantidad)
      return problema(409, 'AFORO_AGOTADO', 'No hay lugares suficientes para esta compra');
    const asientos = d.asientosIds ?? [];
    if (e.requiereAsiento) {
      if (asientos.length !== d.cantidad || new Set(asientos).size !== asientos.length)
        return problema(422, 'REGLA_NEGOCIO', 'Elige un asiento distinto por boleto');
      if (asientos.some((id) => e.asientos.find((a) => a.id === id)?.estado !== 'DISPONIBLE'))
        return problema(409, 'ASIENTO_NO_DISPONIBLE', 'Uno o más asientos ya no están disponibles');
    }
    const ordenId = siguiente();
    const total = (Number(tipo.precio) * d.cantidad).toFixed(2);
    const base = {
      ordenId,
      eventoId: e.id,
      total,
      moneda: 'MXN',
      referenciaPago: null as string | null,
      expiraEn: null as string | null,
      mensaje: null as string | null,
    };

    if (e.esDePago && d.tokenPago === 'tok_rechazado') {
      const orden: Orden = {
        ...base,
        estadoOrden: 'CANCELADA',
        estadoPago: 'RECHAZADO',
        mensaje: 'La pasarela rechazó el pago. No se realizó ningún cargo.',
        boletos: [],
      };
      db.ordenes.push({ ...orden, usuarioId: u.id, clave });
      return HttpResponse.json(orden, { status: 201 });
    }
    if (e.esDePago && (d.tokenPago === 'tok_pendiente' || d.tokenPago === 'tok_error')) {
      // Igual que la API: el cupo y los asientos quedan apartados mientras la pasarela confirma.
      tipo.disponibles -= d.cantidad;
      for (const id of asientos) {
        const a = e.asientos.find((x) => x.id === id);
        if (a) a.estado = 'RESERVADO';
      }
      const orden: Orden = {
        ...base,
        estadoOrden: 'PENDIENTE',
        estadoPago: null,
        referenciaPago: d.tokenPago === 'tok_error' ? null : `sbx_${ordenId}`,
        expiraEn: new Date(Date.now() + 15 * 60_000).toISOString(),
        mensaje: 'Esperando la confirmación de la pasarela.',
        boletos: [],
      };
      db.ordenes.push({
        ...orden,
        usuarioId: u.id,
        clave,
        pendiente: {
          tipoId: tipo.id,
          cantidad: d.cantidad,
          asientosIds: asientos,
          token: d.tokenPago,
          creadaEn: Date.now(),
        },
      });
      return HttpResponse.json(orden, { status: 201 });
    }
    tipo.disponibles -= d.cantidad;
    const emitidos = emitirBoletos(e, tipo, ordenId, u.id, asientos, d.cantidad);
    const orden: Orden = {
      ...base,
      estadoOrden: 'PAGADA',
      estadoPago: e.esDePago ? 'APROBADO' : null,
      referenciaPago: e.esDePago ? `sbx_${ordenId}` : null,
      boletos: emitidos,
    };
    db.ordenes.push({ ...orden, usuarioId: u.id, clave });
    return HttpResponse.json(orden, { status: 201 });
  }),

  http.get(api('/ordenes/:id'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const o = db.ordenes.find((x) => x.ordenId === Number(params.id));
    if (!o || (o.usuarioId !== u.id && !tiene(u, 'ADMIN'))) return noEncontrado();
    resolverPendiente(o);
    const { usuarioId: _u, clave: _c, pendiente: _p, ...orden } = o;
    return HttpResponse.json({
      ...orden,
      boletos: db.boletos.filter((b) => b.ordenId === o.ordenId).map(({ usuarioId: _x, ...b }) => b),
    });
  }),

  http.get(api('/boletos'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    return HttpResponse.json(
      db.boletos
        .filter((b) => b.usuarioId === u.id)
        .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision) || b.id - a.id)
        .map(({ usuarioId: _x, ...b }) => b),
    );
  }),

  http.get(api('/boletos/:id'), ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const b = db.boletos.find((x) => x.id === Number(params.id) && x.usuarioId === u.id);
    if (!b) return noEncontrado();
    const { usuarioId: _x, ...boleto } = b;
    return HttpResponse.json(boleto);
  }),
];

// ---------------------------------------------------------------- validación y administración

const otros = [
  http.post(api('/validaciones'), async ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    const { eventoId, qr } = (await request.json()) as { eventoId: number; qr: string };
    const e = db.eventos.find((x) => x.id === Number(eventoId));
    if (!e) return noEncontrado();
    const permitido = tiene(u, 'ADMIN') || e.organizadorId === u.id || e.validadores.includes(u.id);
    if (!permitido) return prohibido();
    const rechazo = (motivo: string, mensaje: string, codigo: string | null = null) => {
      const r = {
        resultado: 'RECHAZADO' as const,
        motivo: motivo as never,
        mensaje,
        codigo,
        tipoBoleto: null,
        asiento: null,
        fechaUso: null,
      };
      db.validaciones.push({ ...r, eventoId: e.id });
      return HttpResponse.json(r);
    };
    const m = String(qr)
      .trim()
      .match(/^([A-Za-z0-9_-]{4,80})\.([A-Za-z0-9_-]{16,128})$/);
    if (!m) return rechazo('FORMATO_INVALIDO', 'El código no es un boleto de EnZona');
    const b = db.boletos.find((x) => x.codigo === m[1]);
    if (!b) return rechazo('BOLETO_INEXISTENTE', 'El boleto no existe');
    if (b.firma !== m[2]) return rechazo('FIRMA_INVALIDA', 'Boleto falso: la firma no coincide', b.codigo);
    if (b.eventoId !== e.id) return rechazo('OTRO_EVENTO', 'El boleto es de otro evento', b.codigo);
    if (e.estado === 'CANCELADO') return rechazo('EVENTO_CANCELADO', 'Evento cancelado', b.codigo);
    if (b.estado === 'USADO') return rechazo('YA_UTILIZADO', 'El boleto ya fue utilizado', b.codigo);
    if (b.estado === 'CANCELADO') return rechazo('CANCELADO', 'El boleto está cancelado', b.codigo);
    b.estado = 'USADO';
    b.fechaUso = ahoraIso();
    const r = {
      resultado: 'PERMITIDO' as const,
      motivo: null,
      mensaje: 'Acceso permitido',
      codigo: b.codigo,
      tipoBoleto: b.tipoNombre,
      asiento: b.asientoEtiqueta,
      fechaUso: b.fechaUso,
    };
    db.validaciones.push({ ...r, eventoId: e.id });
    return HttpResponse.json(r);
  }),

  http.get(api('/admin/usuarios'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    if (!tiene(u, 'ADMIN')) return prohibido();
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.toLowerCase();
    const estado = url.searchParams.get('estado');
    const lista = db.usuarios
      .filter((x) => !estado || x.estado === estado)
      .filter((x) => !q || x.nombre.toLowerCase().includes(q) || x.correo.includes(q))
      .map((x) => ({
        id: x.id,
        nombre: x.nombre,
        correo: x.correo,
        telefono: x.telefono,
        estado: x.estado,
        correoVerificado: x.correoVerificado,
        roles: x.roles,
        fechaRegistro: x.fechaRegistro,
      }));
    return paginar(lista, url);
  }),

  http.patch(api('/admin/usuarios/:id/estado'), async ({ request, params }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    if (!tiene(u, 'ADMIN')) return prohibido();
    const objetivo = db.usuarios.find((x) => x.id === Number(params.id));
    if (!objetivo) return noEncontrado();
    if (objetivo.id === u.id) return problema(422, 'REGLA_NEGOCIO', 'No puedes cambiar el estado de tu propia cuenta');
    const { estado } = (await request.json()) as { estado: 'ACTIVO' | 'BLOQUEADO' };
    objetivo.estado = estado;
    return HttpResponse.json({
      id: objetivo.id,
      nombre: objetivo.nombre,
      correo: objetivo.correo,
      telefono: objetivo.telefono,
      estado: objetivo.estado,
      correoVerificado: objetivo.correoVerificado,
      roles: objetivo.roles,
      fechaRegistro: objetivo.fechaRegistro,
    });
  }),

  http.get(api('/admin/eventos'), ({ request }) => {
    const u = usuarioDe(request);
    if (!u) return noAutenticado();
    if (!tiene(u, 'ADMIN')) return prohibido();
    const url = new URL(request.url);
    const estado = url.searchParams.get('estado');
    const lista = db.eventos
      .filter((e) => !estado || e.estado === estado)
      .sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio))
      .map((e) => aEvento(e, false));
    return paginar(lista, url);
  }),
];

export const manejadores = [...identidad, ...eventos, ...boletaje, ...otros];
