import type { EventoDto } from "@/lib/api/tipos";
import type { PasoGuia } from "./guias";

/*
 * Textos de las guías, copiados de las pantallas de la app Android
 * (HomeScreen, EventDetailScreen, SeatMapScreen, TicketDetailScreen,
 * OrganizerHomeScreen, EventFormScreen y EventStatsScreen).
 */

export const PASOS_INICIO: PasoGuia[] = [
  {
    titulo: "¡Hola! Bienvenido a EnZona",
    texto: "Esta es tu pantalla de inicio. Aquí aparecen los eventos que hay cerca de ti. Te enseñamos en un momento cómo funciona, ¿va?",
  },
  { objetivo: "inicio_zona", titulo: "Esta es tu ciudad", texto: "Te mostramos los eventos de esta ciudad. Si vas a otra, toca aquí y cámbiala." },
  {
    objetivo: "inicio_busqueda",
    titulo: "¿Buscas algo en especial?",
    texto: "Escribe aquí el nombre del evento o del lugar. La lista se va acortando mientras escribes.",
  },
  {
    objetivo: "inicio_filtros",
    titulo: "Estos botones son filtros",
    texto:
      "Toca «Gratis» para ver solo eventos sin costo, «Fecha» para elegir un día, y así. «Cerca de mí» pone primero los más cercanos (te pedirá permiso para usar tu ubicación). Puedes usar varios a la vez.",
  },
  { objetivo: "inicio_evento", titulo: "Cada tarjeta es un evento", texto: "Toca una para ver de qué trata, dónde es (con mapa) y conseguir tu lugar." },
  {
    objetivo: "nav_boletos",
    titulo: "Aquí guardas tus boletos",
    texto: "Cuando consigas un lugar, tu boleto aparece en «Mis boletos». Lo abres y muestras el código en la entrada. ¡Eso es todo!",
  },
];

export function pasosDetalle(evento: Pick<EventoDto, "esDePago" | "requiereAsiento">, mostrarTipos: boolean): PasoGuia[] {
  const pasos: PasoGuia[] = [];
  if (mostrarTipos) {
    pasos.push({
      objetivo: "detalle_tipos",
      titulo: "Elige tu tipo de boleto",
      texto: "Hay varios tipos, cada uno con su precio. Desliza hacia un lado para verlos todos y toca el que quieras.",
    });
  }
  if (evento.esDePago) {
    pasos.push({
      objetivo: "detalle_cantidad",
      titulo: "¿Cuántos boletos quieres?",
      texto: "Usa + y − para elegir la cantidad. ¿Vas con amigos? Cada quien tendrá su propio boleto con su código.",
    });
  }
  pasos.push({
    objetivo: "detalle_accion",
    titulo: evento.esDePago ? "Con este botón compras" : "Con este botón apartas tu lugar",
    texto: evento.requiereAsiento
      ? "Este evento tiene asientos numerados. Al tocar el botón verás el plano del lugar para escoger dónde sentarte."
      : evento.esDePago
        ? "Te lleva a pagar con tu tarjeta. Lo que ves aquí es lo que pagas, sin cargos escondidos."
        : "Este evento es gratis. Toca el botón y listo: tu boleto queda en «Mis boletos». Solo se aparta un lugar por persona.",
  });
  return pasos;
}

export const PASOS_ASIENTOS: PasoGuia[] = [
  {
    objetivo: "asientos_leyenda",
    titulo: "Los colores te dicen qué asientos hay",
    texto: "Verde: está libre. Gris: ya lo tomó alguien. Naranja: es el que tú elegiste.",
  },
  {
    objetivo: "asientos_plano",
    titulo: "Este es el plano del lugar",
    texto:
      "El escenario está arriba, así que las primeras filas son las más cercanas. Toca un asiento verde para elegirlo. ¿Te arrepientes? Tócalo otra vez y se quita.",
  },
  { objetivo: "asientos_zoom", titulo: "¿Se ve muy pequeño?", texto: "Con estos botones haces los asientos más grandes o más chicos para verlos mejor." },
  {
    objetivo: "asientos_por_numero",
    titulo: "¿Ya sabes cuál quieres?",
    texto: "Si conoces el número de tu asiento, por ejemplo C7, tócalo aquí y escríbelo. Te ahorras buscarlo en el plano.",
  },
  {
    objetivo: "asientos_continuar",
    titulo: "Cuando termines, toca aquí",
    texto: "Ojo: el asiento se aparta hasta que confirmes o pagues. Si alguien lo gana antes, te avisamos para que elijas otro.",
  },
];

export const PASOS_BOLETO: PasoGuia[] = [
  {
    objetivo: "boleto_qr",
    titulo: "Este es tu boleto",
    texto: "En la entrada, muestra este código en tu pantalla y lo escanean. Sirve una sola vez. El brillo sube solo para que se lea bien.",
  },
  {
    objetivo: "boleto_estado",
    titulo: "Aquí ves cómo está tu boleto",
    texto:
      "Te dice si sigue vigente, si ya lo usaste para entrar o si el evento se canceló. Si se cancela, el reembolso se hace solo; no tienes que hacer nada.",
  },
  {
    objetivo: "boleto_correo",
    titulo: "Por si acaso, mándatelo al correo",
    texto: "Así tendrás tu boleto aunque en el lugar no haya señal o se te acabe la batería.",
  },
];

export function pasosOrganizador(tieneEventos: boolean): PasoGuia[] {
  const pasos: PasoGuia[] = [
    {
      objetivo: "org_metricas",
      titulo: "Este es tu espacio de organizador",
      texto: "De un vistazo ves cuántos eventos tienes publicados, cuánta gente va a ir y cuánto llevas vendido.",
    },
  ];
  if (tieneEventos) {
    pasos.push({
      objetivo: "org_evento",
      titulo: "Toca un evento para administrarlo",
      texto: "Ahí ves cómo van las ventas y las entradas, eliges quién revisa los boletos en la puerta, y puedes editarlo o cancelarlo.",
    });
  }
  pasos.push({
    objetivo: "org_nuevo",
    titulo: "¿Quieres publicar un evento?",
    texto: "Toca «Nuevo evento». Te pedimos una foto, la fecha, el lugar en el mapa y los boletos. En unos minutos está listo.",
  });
  return pasos;
}

export const PASOS_NUEVO_EVENTO: PasoGuia[] = [
  {
    objetivo: "evento_portada",
    titulo: "Ponle una foto (si quieres)",
    texto: "Elige una imagen y acomódala: se encuadra sola en 16:9. Si no pones foto, no pasa nada: se usa un diseño de la categoría.",
  },
  {
    objetivo: "evento_fecha",
    titulo: "¿Cuándo es?",
    texto: "Elige el día en el calendario y la hora en formato de 24 horas. Solo se pueden elegir fechas que todavía no pasan.",
  },
  {
    objetivo: "evento_ubicacion",
    titulo: "¿Dónde es?",
    texto: "Escribe el nombre del lugar y toca el mapa para poner el marcador justo donde es. Sin marcador puedes guardar el evento, pero no publicarlo.",
  },
  {
    objetivo: "evento_pago",
    titulo: "¿Es gratis o se cobra?",
    texto: "Si vas a cobrar, activa esto y pon el precio del boleto. Piénsalo bien: después de crear el evento ya no se puede cambiar.",
  },
  {
    objetivo: "evento_asientos",
    titulo: "¿Hay asientos numerados?",
    texto:
      "Si cada persona tendrá su asiento, activa esto y di cuántas filas hay y cuántos asientos por fila; el plano se arma solo. Si no, solo pon cuántas personas caben.",
  },
  {
    objetivo: "evento_acciones",
    titulo: "Para terminar",
    texto: "«Publicar evento» lo hace visible para todos desde ya. «Guardar como borrador» lo guarda solo para ti, por si quieres terminarlo después.",
  },
];

export function pasosPanel(cancelado: boolean, puedeCancelar: boolean): PasoGuia[] {
  const pasos: PasoGuia[] = [
    {
      objetivo: "panel_metricas",
      titulo: "Así va tu evento",
      texto: "Cuántas personas tienen boleto, cuántas ya entraron y cuánto llevas vendido. Abajo ves qué tan lleno está.",
    },
    { objetivo: "panel_boletos", titulo: "Quién tiene boleto", texto: "Aquí aparece cada boleto vendido o apartado, con su estado: vigente, usado o cancelado." },
    {
      objetivo: "panel_personal",
      titulo: "¿Quién revisa en la puerta?",
      texto:
        "Escribe el correo de la persona que va a escanear los boletos y desígnala como validador. Entrará con su propia cuenta y solo verá este evento.",
    },
  ];
  if (!cancelado) {
    pasos.push({
      objetivo: "panel_editar",
      titulo: "¿Hay que cambiar algo?",
      texto: "Con el lápiz editas el evento: descripción, portada, lugar… Si ya hay boletos vendidos y cambias la fecha, te pedimos confirmarlo.",
    });
  }
  if (puedeCancelar) {
    pasos.push({
      objetivo: "panel_cancelar",
      titulo: "Si tienes que cancelar",
      texto: "Este botón cancela el evento y devuelve el dinero a los asistentes. En eventos de pago se cobra una pequeña comisión; te la mostramos antes de confirmar.",
    });
  }
  return pasos;
}
