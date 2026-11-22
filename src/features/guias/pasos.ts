import type { PasoGuia } from './contexto';

/*
 * Textos de las guías de la primera vez. Son los de la app Android (HomeScreen, EventDetailScreen,
 * SeatMapScreen, TicketDetailScreen, OrganizerHomeScreen, EventStatsScreen y EventFormScreen), con los ajustes
 * propios de la web: «tu equipo» en lugar de «tu teléfono», la pantalla encendida en lugar del brillo y el
 * reembolso del 100 % sin comisión que aplica la API.
 */

export const PASOS_INICIO: PasoGuia[] = [
  {
    titulo: '¡Hola! Bienvenido a EnZona',
    texto:
      'Esta es tu pantalla de inicio. Aquí aparecen los eventos que hay cerca de ti. Te enseñamos en un momento cómo funciona, ¿va?',
  },
  {
    objetivo: 'inicio_zona',
    titulo: 'Esta es tu ciudad',
    texto: 'Te mostramos los eventos de esta ciudad. Si vas a otra, toca aquí y cámbiala.',
  },
  {
    objetivo: 'inicio_busqueda',
    titulo: '¿Buscas algo en especial?',
    texto: 'Escribe aquí el nombre del evento o del lugar. La lista se va acortando mientras escribes.',
  },
  {
    objetivo: 'inicio_filtros',
    titulo: 'Estos botones son filtros',
    texto:
      'Toca «Gratis» para ver solo eventos sin costo, «Fecha» para elegir un día, y así. «Cerca de mí» pone primero los más cercanos (te pedirá permiso para usar tu ubicación). Puedes usar varios a la vez.',
  },
  {
    objetivo: 'inicio_evento',
    titulo: 'Cada tarjeta es un evento',
    texto: 'Toca una para ver de qué trata, dónde es (con mapa) y conseguir tu lugar.',
  },
  {
    objetivo: 'nav_/boletos',
    titulo: 'Aquí guardas tus boletos',
    texto:
      'Cuando consigas un lugar, tu boleto aparece en «Mis boletos». Lo abres y muestras el código en la entrada. ¡Eso es todo!',
  },
];

export function pasosDetalle(opciones: {
  conTipos: boolean;
  /** En la web los eventos gratuitos no tienen selector de cantidad: se aparta un lugar por persona. */
  conCantidad: boolean;
  esDePago: boolean;
  requiereAsiento: boolean;
}): PasoGuia[] {
  const pasos: PasoGuia[] = [];
  if (opciones.conTipos)
    pasos.push({
      objetivo: 'detalle_tipos',
      titulo: 'Elige tu tipo de boleto',
      texto: 'Hay varios tipos, cada uno con su precio. Revísalos y toca el que quieras.',
    });
  if (opciones.conCantidad)
    pasos.push({
      objetivo: 'detalle_cantidad',
      titulo: '¿Cuántos boletos quieres?',
      texto: 'Usa + y − para elegir la cantidad. ¿Vas con amigos? Cada quien tendrá su propio boleto con su código.',
    });
  pasos.push({
    objetivo: 'detalle_accion',
    titulo: opciones.esDePago ? 'Con este botón compras' : 'Con este botón apartas tu lugar',
    texto: opciones.requiereAsiento
      ? 'Este evento tiene asientos numerados. Al tocar el botón verás el plano del lugar para escoger dónde sentarte.'
      : opciones.esDePago
        ? 'Te lleva a pagar con tu tarjeta. Lo que ves aquí es lo que pagas, sin cargos escondidos.'
        : 'Este evento es gratis. Toca el botón y listo: tu boleto queda en «Mis boletos». Solo se aparta un lugar por persona.',
  });
  return pasos;
}

export const PASOS_ASIENTOS: PasoGuia[] = [
  {
    objetivo: 'asientos_leyenda',
    titulo: 'Los colores te dicen qué asientos hay',
    texto: 'Verde: está libre. Gris: ya lo tomó alguien. Naranja: es el que tú elegiste.',
  },
  {
    objetivo: 'asientos_plano',
    titulo: 'Este es el plano del lugar',
    texto:
      'El escenario está arriba, así que las primeras filas son las más cercanas. Toca un asiento verde para elegirlo. ¿Te arrepientes? Tócalo otra vez y se quita.',
  },
  {
    objetivo: 'asientos_zoom',
    titulo: '¿Se ve muy pequeño?',
    texto: 'Con estos botones haces los asientos más grandes o más chicos para verlos mejor.',
  },
  {
    objetivo: 'asientos_por_numero',
    titulo: '¿Ya sabes cuál quieres?',
    texto:
      'Si conoces el número de tu asiento, por ejemplo C7, tócalo aquí y escríbelo. Te ahorras buscarlo en el plano.',
  },
  {
    objetivo: 'asientos_continuar',
    titulo: 'Cuando termines, toca aquí',
    texto:
      'Ojo: el asiento se aparta hasta que confirmes o pagues. Si alguien lo gana antes, te avisamos para que elijas otro.',
  },
];

export const PASOS_BOLETO: PasoGuia[] = [
  {
    objetivo: 'boleto_qr',
    titulo: 'Este es tu boleto',
    texto:
      'En la entrada, muestra este código en tu pantalla y lo escanean. Sirve una sola vez. La pantalla se mantiene encendida mientras lo muestras.',
  },
  {
    objetivo: 'boleto_estado',
    titulo: 'Aquí ves cómo está tu boleto',
    texto:
      'Te dice si sigue vigente, si ya lo usaste para entrar o si el evento se canceló. Si se cancela, el reembolso se hace solo; no tienes que hacer nada.',
  },
  {
    objetivo: 'boleto_correo',
    titulo: 'Por si acaso, mándatelo al correo',
    texto: 'Así tendrás tu boleto aunque en el lugar no haya señal o se te acabe la batería.',
  },
];

export function pasosOrganizador(conEventos: boolean): PasoGuia[] {
  const pasos: PasoGuia[] = [
    {
      objetivo: 'org_metricas',
      titulo: 'Este es tu espacio de organizador',
      texto: 'De un vistazo ves cuántos eventos tienes publicados, cuánta gente va a ir y cuánto llevas vendido.',
    },
  ];
  if (conEventos)
    pasos.push({
      objetivo: 'org_evento',
      titulo: 'Toca un evento para administrarlo',
      texto:
        'Ahí ves cómo van las ventas y las entradas, eliges quién revisa los boletos en la puerta, y puedes editarlo o cancelarlo.',
    });
  pasos.push({
    objetivo: 'org_nuevo',
    titulo: '¿Quieres publicar un evento?',
    texto:
      'Toca «Nuevo evento». Te pedimos una foto, la fecha, el lugar en el mapa y los boletos. En unos minutos está listo.',
  });
  return pasos;
}

export function pasosPanel(opciones: { editable: boolean; cancelable: boolean; conPersonal: boolean }): PasoGuia[] {
  const pasos: PasoGuia[] = [
    {
      objetivo: 'panel_metricas',
      titulo: 'Así va tu evento',
      texto:
        'Cuántas personas tienen boleto, cuántas ya entraron y cuánto llevas vendido. Abajo ves qué tan lleno está.',
    },
    {
      objetivo: 'panel_boletos',
      titulo: 'Quién tiene boleto',
      texto: 'Aquí aparece cada boleto vendido o apartado, con su estado: válido o ya usado.',
    },
  ];
  if (opciones.conPersonal)
    pasos.push({
      objetivo: 'panel_personal',
      titulo: '¿Quién revisa en la puerta?',
      texto:
        'Escribe el correo de la persona que va a escanear los boletos y desígnala como validador. Entrará con su propia cuenta y podrá validar este evento.',
    });
  if (opciones.editable)
    pasos.push({
      objetivo: 'panel_editar',
      titulo: '¿Hay que cambiar algo?',
      texto:
        'Con el lápiz editas el evento: descripción, portada, lugar… Si ya hay boletos vendidos y cambias la fecha, te pedimos confirmarlo.',
    });
  if (opciones.cancelable)
    pasos.push({
      objetivo: 'panel_cancelar',
      titulo: 'Si tienes que cancelar',
      texto:
        'Este botón cancela el evento y devuelve el 100 % a los asistentes, sin comisión. Antes de confirmar te mostramos cuánto se reembolsa.',
    });
  return pasos;
}

export const PASOS_NUEVO_EVENTO: PasoGuia[] = [
  {
    objetivo: 'evento_portada',
    titulo: 'Ponle una foto (si quieres)',
    texto:
      'Elige una imagen de tu equipo y acomódala: arrástrala, acércala o gírala. Si no pones foto, no pasa nada: se usa un diseño de la categoría.',
  },
  {
    objetivo: 'evento_fecha',
    titulo: '¿Cuándo es?',
    texto: 'Elige el día y la hora de inicio. Solo se pueden elegir fechas que todavía no pasan.',
  },
  {
    objetivo: 'evento_ubicacion',
    titulo: '¿Dónde es?',
    texto:
      'Escribe el nombre del lugar y toca el mapa para poner el marcador justo donde es. Sin marcador puedes guardar el evento, pero no publicarlo.',
  },
  {
    objetivo: 'evento_pago',
    titulo: '¿Es gratis o se cobra?',
    texto:
      'Si vas a cobrar, activa esto y pon el precio de cada tipo de boleto. Piénsalo bien: cuando el evento se publica ya no se puede cambiar.',
  },
  {
    objetivo: 'evento_asientos',
    titulo: '¿Hay asientos numerados?',
    texto:
      'Si cada persona tendrá su asiento, activa esto y di cuántas filas hay y cuántos asientos por fila; el plano se arma solo. Si no, solo pon cuántas personas caben.',
  },
  {
    objetivo: 'evento_acciones',
    titulo: 'Para terminar',
    texto:
      '«Crear y publicar» lo hace visible para todos desde ya. «Guardar como borrador» lo guarda solo para ti, por si quieres terminarlo después.',
  },
];
