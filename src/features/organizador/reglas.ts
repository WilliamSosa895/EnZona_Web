import type { EventoDto, EventoSolicitudDto, SeccionDto, TipoBoletoSolicitudDto } from "@/lib/api/tipos";
import { aCampos, aIso } from "@/lib/fecha";

/*
 * Reglas del formulario de evento (RF-08, RF-13), las mismas que aplica la API:
 *  - de pago: al menos un tipo con precio > 0 y la suma de cantidades ≤ aforo;
 *  - gratuito: sin tipos (la API crea «General» a precio 0 con el aforo);
 *  - con asiento: secciones (filas ≤ 26, asientos por fila ≤ 200) y aforo = total de asientos;
 *  - publicar exige coordenadas y fecha futura; un borrador no;
 *  - en un evento publicado no cambia la modalidad; con boletos no cambia el plano.
 */

export interface TipoFormulario {
  id: number | null;
  nombre: string;
  precio: string;
  cantidad: string;
}

export interface SeccionFormulario {
  nombre: string;
  filas: string;
  asientosPorFila: string;
}

export interface ValoresEvento {
  nombre: string;
  descripcion: string;
  lugar: string;
  direccion: string;
  ciudad: string;
  categoriaId: string;
  fechaInicio: string;
  horaInicio: string;
  conFin: boolean;
  fechaFin: string;
  horaFin: string;
  latitud: number | null;
  longitud: number | null;
  esDePago: boolean;
  aforo: string;
  tipos: TipoFormulario[];
  requiereAsiento: boolean;
  secciones: SeccionFormulario[];
}

export const MAX_FILAS = 26;
export const MAX_ASIENTOS_POR_FILA = 200;
export const MAX_AFORO = 100_000;

export function valoresVacios(): ValoresEvento {
  return {
    nombre: "",
    descripcion: "",
    lugar: "",
    direccion: "",
    ciudad: "Orizaba",
    categoriaId: "",
    fechaInicio: "",
    horaInicio: "19:00",
    conFin: false,
    fechaFin: "",
    horaFin: "",
    latitud: null,
    longitud: null,
    esDePago: false,
    aforo: "100",
    tipos: [{ id: null, nombre: "General", precio: "", cantidad: "" }],
    requiereAsiento: false,
    secciones: [{ nombre: "Platea", filas: "5", asientosPorFila: "10" }],
  };
}

export function valoresDesdeEvento(evento: EventoDto): ValoresEvento {
  const inicio = aCampos(evento.fechaHoraInicio);
  const fin = aCampos(evento.fechaHoraFin);
  return {
    nombre: evento.nombre,
    descripcion: evento.descripcion ?? "",
    lugar: evento.lugar,
    direccion: evento.direccion ?? "",
    ciudad: evento.ciudad ?? "Orizaba",
    categoriaId: evento.categoriaId ? String(evento.categoriaId) : "",
    fechaInicio: inicio.fecha,
    horaInicio: inicio.hora,
    conFin: Boolean(evento.fechaHoraFin),
    fechaFin: fin.fecha,
    horaFin: fin.hora,
    latitud: evento.latitud ?? null,
    longitud: evento.longitud ?? null,
    esDePago: evento.esDePago,
    aforo: String(evento.aforo),
    tipos:
      evento.esDePago && evento.tiposBoleto && evento.tiposBoleto.length > 0
        ? evento.tiposBoleto.map((tipo) => ({
            id: tipo.id,
            nombre: tipo.nombre,
            precio: tipo.precio ?? "",
            cantidad: String(tipo.cantidadTotal ?? ""),
          }))
        : [{ id: null, nombre: "General", precio: "", cantidad: "" }],
    requiereAsiento: evento.requiereAsiento,
    secciones: [{ nombre: "Platea", filas: "5", asientosPorFila: "10" }],
  };
}

export function totalAsientos(secciones: SeccionFormulario[]): number {
  let total = 0;
  for (const seccion of secciones) {
    const filas = Number.parseInt(seccion.filas, 10) || 0;
    const porFila = Number.parseInt(seccion.asientosPorFila, 10) || 0;
    total += filas * porFila;
  }
  return total;
}

export function sumaCantidades(tipos: TipoFormulario[]): number {
  let total = 0;
  for (const tipo of tipos) total += Number.parseInt(tipo.cantidad, 10) || 0;
  return total;
}

export type ErroresEvento = Partial<Record<keyof ValoresEvento | "tipos" | "secciones" | "general", string>>;

/** Validación previa al envío. `publicar` exige además coordenadas. */
export function validarEvento(valores: ValoresEvento, publicar: boolean, hoy: string): ErroresEvento {
  const errores: ErroresEvento = {};
  if (valores.nombre.trim().length < 3) errores.nombre = "Escribe el nombre del evento.";
  if (valores.nombre.trim().length > 160) errores.nombre = "Máximo 160 caracteres.";
  if (valores.descripcion.length > 5000) errores.descripcion = "Máximo 5000 caracteres.";
  if (valores.lugar.trim().length < 2) errores.lugar = "Escribe la sede.";
  if (valores.direccion.length > 240) errores.direccion = "Máximo 240 caracteres.";
  if (!valores.fechaInicio) errores.fechaInicio = "Elige la fecha de inicio.";
  else if (valores.fechaInicio < hoy) errores.fechaInicio = "La fecha de inicio no puede ser anterior a hoy.";
  if (!/^\d{2}:\d{2}$/.test(valores.horaInicio)) errores.horaInicio = "Elige la hora de inicio.";
  if (valores.conFin) {
    if (!valores.fechaFin) errores.fechaFin = "Elige la fecha de fin o quítala.";
    else if (valores.fechaFin < valores.fechaInicio) errores.fechaFin = "La fecha de fin no puede ser anterior a la de inicio.";
    if (!/^\d{2}:\d{2}$/.test(valores.horaFin)) errores.horaFin = "Elige la hora de fin.";
    else if (valores.fechaFin === valores.fechaInicio && valores.horaFin <= valores.horaInicio) {
      errores.horaFin = "La hora de fin debe ser posterior a la de inicio.";
    }
  }
  if (publicar && (valores.latitud == null || valores.longitud == null)) {
    errores.latitud = "Para publicar, fija la ubicación en el mapa.";
  }

  const aforo = valores.requiereAsiento ? totalAsientos(valores.secciones) : Number.parseInt(valores.aforo, 10);
  if (!Number.isInteger(aforo) || aforo < 1) errores.aforo = "El aforo debe ser al menos 1.";
  else if (aforo > MAX_AFORO) errores.aforo = `El aforo máximo es ${MAX_AFORO.toLocaleString("es-MX")}.`;

  if (valores.esDePago) {
    if (valores.tipos.length === 0) errores.tipos = "Agrega al menos un tipo de boleto.";
    for (const tipo of valores.tipos) {
      const precio = Number.parseFloat(tipo.precio);
      const cantidad = Number.parseInt(tipo.cantidad, 10);
      if (!tipo.nombre.trim()) errores.tipos = "Cada tipo necesita un nombre.";
      else if (!Number.isFinite(precio) || precio <= 0) errores.tipos = `El precio de «${tipo.nombre}» debe ser mayor que 0.`;
      else if (!Number.isInteger(cantidad) || cantidad < 1) errores.tipos = `La cantidad de «${tipo.nombre}» debe ser al menos 1.`;
    }
    if (!errores.tipos && Number.isInteger(aforo) && sumaCantidades(valores.tipos) > aforo) {
      errores.tipos = `La suma de boletos (${sumaCantidades(valores.tipos)}) no puede superar el aforo (${aforo}).`;
    }
  }

  if (valores.requiereAsiento) {
    if (valores.secciones.length === 0) errores.secciones = "Agrega al menos una sección.";
    for (const seccion of valores.secciones) {
      const filas = Number.parseInt(seccion.filas, 10);
      const porFila = Number.parseInt(seccion.asientosPorFila, 10);
      if (!seccion.nombre.trim()) errores.secciones = "Cada sección necesita un nombre.";
      else if (!Number.isInteger(filas) || filas < 1 || filas > MAX_FILAS) errores.secciones = `Las filas de «${seccion.nombre}» van de 1 a ${MAX_FILAS}.`;
      else if (!Number.isInteger(porFila) || porFila < 1 || porFila > MAX_ASIENTOS_POR_FILA) {
        errores.secciones = `Los asientos por fila de «${seccion.nombre}» van de 1 a ${MAX_ASIENTOS_POR_FILA}.`;
      }
    }
  }
  return errores;
}

/** Convierte los valores del formulario al cuerpo de la API. */
export function aSolicitud(valores: ValoresEvento, publicar: boolean, enviarSecciones: boolean): EventoSolicitudDto {
  const aforo = valores.requiereAsiento ? totalAsientos(valores.secciones) : Number.parseInt(valores.aforo, 10);
  const tipos: TipoBoletoSolicitudDto[] | null = valores.esDePago
    ? valores.tipos.map((tipo) => ({
        id: tipo.id,
        nombre: tipo.nombre.trim(),
        precio: Math.round(Number.parseFloat(tipo.precio) * 100) / 100,
        cantidad: Number.parseInt(tipo.cantidad, 10),
      }))
    : null;
  const secciones: SeccionDto[] | null =
    valores.requiereAsiento && enviarSecciones
      ? valores.secciones.map((seccion) => ({
          nombre: seccion.nombre.trim(),
          filas: Number.parseInt(seccion.filas, 10),
          asientosPorFila: Number.parseInt(seccion.asientosPorFila, 10),
        }))
      : null;
  const categoriaId = Number.parseInt(valores.categoriaId, 10);
  return {
    nombre: valores.nombre.trim(),
    descripcion: valores.descripcion.trim() || null,
    lugar: valores.lugar.trim(),
    direccion: valores.direccion.trim() || null,
    ciudad: valores.ciudad.trim() || "Orizaba",
    latitud: valores.latitud,
    longitud: valores.longitud,
    categoriaId: Number.isInteger(categoriaId) && categoriaId > 0 ? categoriaId : null,
    fechaHoraInicio: aIso(valores.fechaInicio, valores.horaInicio),
    fechaHoraFin: valores.conFin && valores.fechaFin ? aIso(valores.fechaFin, valores.horaFin) : null,
    aforo,
    esDePago: valores.esDePago,
    requiereAsiento: valores.requiereAsiento,
    tiposBoleto: tipos,
    secciones,
    publicar,
  };
}

/** Qué partes del formulario quedan bloqueadas por la política de RF-13. */
export function bloqueosDe(evento: EventoDto | null): { modalidad: boolean; plano: boolean; precios: boolean } {
  if (!evento) return { modalidad: false, plano: false, precios: false };
  const publicado = evento.estado === "PUBLICADO";
  const tieneBoletos = evento.disponibles < evento.aforo;
  return { modalidad: publicado, plano: tieneBoletos, precios: tieneBoletos };
}
