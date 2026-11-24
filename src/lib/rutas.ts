/** Rutas de la web (equivalente de `Rutas` en MainActivity.kt). */
export const RUTAS = Object.freeze({
  inicio: "/",
  notificaciones: "/notificaciones",
  login: "/login",
  loginPersonal: "/login?acceso=personal",
  registro: "/registro",
  verificacion: (correo: string) => `/verificacion?correo=${encodeURIComponent(correo)}`,
  recuperar: "/recuperar-contrasena",
  evento: (id: number | string) => `/evento/${id}`,
  asientos: (eventoId: number | string, tipoId: number | string | null, cantidad: number) =>
    `/evento/${eventoId}/asientos?tipo=${tipoId ?? 0}&cantidad=${cantidad}`,
  pago: (
    eventoId: number | string,
    tipoId: number | string | null,
    cantidad: number,
    asientos: number[] = [],
  ) =>
    `/evento/${eventoId}/pago?tipo=${tipoId ?? 0}&cantidad=${cantidad}${
      asientos.length > 0 ? `&asientos=${asientos.join("-")}` : ""
    }`,
  orden: (id: number | string) => `/orden/${id}`,
  misBoletos: "/mis-boletos",
  boleto: (id: number | string) => `/boleto/${id}`,
  cuenta: "/cuenta",
  editarDatos: "/cuenta/datos",
  seguridad: "/cuenta/seguridad",
  ayuda: "/cuenta/ayuda",
  privacidad: "/privacidad",
  legal: "/legal",
  misEventos: "/mis-eventos",
  nuevoEvento: "/mis-eventos/nuevo",
  panelEvento: (id: number | string) => `/mis-eventos/${id}`,
  editarEvento: (id: number | string) => `/mis-eventos/${id}/editar`,
  escanear: "/escanear",
  admin: "/admin",
  adminUsuarios: "/admin/usuarios",
  adminEventos: "/admin/eventos",
});

/** Rutas que exigen sesión. El resto es público (catálogo y detalle). */
export const PREFIJOS_PROTEGIDOS = [
  "/mis-boletos",
  "/boleto",
  "/orden",
  "/cuenta",
  "/mis-eventos",
  "/escanear",
  "/admin",
];

/** Dentro del detalle, asientos y pago exigen sesión. */
export const SUFIJOS_PROTEGIDOS_DE_EVENTO = ["/asientos", "/pago"];
