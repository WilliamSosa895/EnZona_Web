/*
 * Qué partes de la app respalda EnZona_Api. Lo que no se soporta no se
 * muestra: la web no ofrece acciones que el servidor va a rechazar.
 *
 * Mismo criterio que `RepositorioRemoto.capacidades` en la app Android
 * (docs/notas_api_enzona.md, «Lo que la API no implementa»).
 */
export const CAPACIDADES = Object.freeze({
  /** `metodoPagoId` responde 422: el cobro usa un token de un solo uso. */
  metodosGuardados: false,
  /** OXXO y SPEI responden 422 METODO_PAGO_NO_SOPORTADO. */
  pagosDiferidos: false,
  /** Los avisos van por correo; no hay centro de notificaciones. */
  notificaciones: false,
  /** La API reembolsa el 100 % y no cobra comisión al organizador. */
  cargosOrganizador: false,
  /** Los roles se obtienen al registrarse, activarse o ser designado; el admin no los edita. */
  rolesPorAdministrador: false,
  /** Una tarea del servidor marca los eventos terminados. */
  marcarRealizado: false,
  /** Sin proveedor de SMS: el registro no pide teléfono. */
  verificacionPorTelefono: false,
});

/** Tokens de la pasarela simulada (`PAYMENT_PROVIDER=sandbox`). */
export const TOKENS_SANDBOX = Object.freeze({
  aprobado: "tok_aprobado",
  rechazado: "tok_rechazado",
});

/** Ciudad por defecto del área de estudio (RNF-11). */
export const CIUDAD_POR_DEFECTO = "Orizaba";
export const CENTRO_ORIZABA = Object.freeze({ latitud: 18.851, longitud: -97.1 });
/** Radio de «Cerca de mí» que usa la app (la API admite hasta EVENT_MAX_RADIUS_KM). */
export const RADIO_CERCA_KM = 50;
/** Boletos por orden que admite la API (`ORDER_MAX_TICKETS`). */
export const MAX_BOLETOS_POR_ORDEN = 10;
/** Segundos entre reenvíos del código de verificación. */
export const SEGUNDOS_REENVIO = 60;
