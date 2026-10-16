/*
 * Datos de la API SIMULADA (modo demostración y pruebas automáticas). Reproducen la forma de las respuestas
 * de la API real; no son datos reales ni sustituyen a la base de datos. Las fechas se calculan a partir de hoy
 * para que los eventos sigan siendo futuros.
 */
import type {
  Asiento,
  Boleto,
  Categoria,
  EstadoUsuario,
  Evento,
  Orden,
  Rol,
  TipoBoleto,
  ValidacionRespuesta,
} from '@/api/tipos';

export interface UsuarioSimulado {
  id: number;
  nombre: string;
  correo: string;
  telefono: string | null;
  curp: string;
  contrasena: string;
  estado: EstadoUsuario;
  roles: Rol[];
  correoVerificado: boolean;
  telefonoVerificado: boolean;
  fechaRegistro: string;
  codigo: string | null;
}

export interface EventoSimulado extends Omit<Evento, 'tiposBoleto' | 'distanciaKm' | 'disponibles' | 'precioDesde'> {
  tipos: TipoBoleto[];
  asientos: Asiento[];
  validadores: number[];
}

export interface BaseSimulada {
  usuarios: UsuarioSimulado[];
  categorias: Categoria[];
  eventos: EventoSimulado[];
  ordenes: (Orden & { usuarioId: number; clave: string })[];
  boletos: (Boleto & { usuarioId: number })[];
  validaciones: (ValidacionRespuesta & { eventoId: number })[];
  sesiones: Map<string, number>;
  secuencia: number;
}

export const CONTRASENA_DEMO = 'enzona123';

const dos = (n: number) => String(n).padStart(2, '0');

/** ISO con desfase de la Ciudad de México a N días de hoy, a la hora indicada. */
export function fechaRelativa(dias: number, hora: number, minuto = 0): string {
  const base = new Date(Date.now() + dias * 86_400_000);
  const local = new Date(base.getTime() - 6 * 3_600_000);
  return `${local.getUTCFullYear()}-${dos(local.getUTCMonth() + 1)}-${dos(local.getUTCDate())}T${dos(hora)}:${dos(minuto)}:00-06:00`;
}

function mapaDeAsientos(seccion: string, filas: number, porFila: number, primerId: number): Asiento[] {
  const lista: Asiento[] = [];
  let id = primerId;
  for (let f = 0; f < filas; f++) {
    const fila = String.fromCharCode(65 + f);
    for (let n = 1; n <= porFila; n++) {
      lista.push({
        id: id++,
        seccion,
        fila,
        numero: String(n),
        estado: 'DISPONIBLE',
        etiqueta: `${seccion} · Fila ${fila} · Asiento ${n}`,
      });
    }
  }
  return lista;
}

export function crearBase(): BaseSimulada {
  const ahora = fechaRelativa(-30, 10);
  const usuario = (id: number, nombre: string, correo: string, roles: Rol[], curp: string): UsuarioSimulado => ({
    id,
    nombre,
    correo,
    telefono: null,
    curp,
    contrasena: CONTRASENA_DEMO,
    estado: 'ACTIVO',
    roles,
    correoVerificado: true,
    telefonoVerificado: false,
    fechaRegistro: ahora,
    codigo: null,
  });

  const jazz = mapaDeAsientos('Platea', 5, 10, 1000);
  // Algunas butacas ya vendidas, para ver el plano con ocupación.
  for (const i of [3, 4, 14, 15, 22]) jazz[i].estado = 'OCUPADO';

  const evento = (
    e: Partial<EventoSimulado> &
      Pick<
        EventoSimulado,
        'id' | 'nombre' | 'lugar' | 'categoriaId' | 'categoria' | 'fechaHoraInicio' | 'aforo' | 'esDePago'
      >,
  ): EventoSimulado => ({
    organizadorId: 2,
    descripcion: null,
    direccion: null,
    ciudad: 'Orizaba',
    latitud: 18.8506,
    longitud: -97.1003,
    fechaHoraFin: null,
    requiereAsiento: false,
    estado: 'PUBLICADO',
    fechaCancelacion: null,
    motivoCancelacion: null,
    tipos: [],
    asientos: [],
    validadores: [3],
    ...e,
  });

  return {
    secuencia: 5000,
    sesiones: new Map(),
    categorias: [
      { id: 1, nombre: 'Música' },
      { id: 2, nombre: 'Deportivo' },
      { id: 3, nombre: 'Cultural' },
      { id: 4, nombre: 'Taller' },
      { id: 5, nombre: 'Gastronómico' },
      { id: 6, nombre: 'Otro' },
    ],
    usuarios: [
      usuario(1, 'Ana Asistente', 'asistente@uv.mx', ['ASISTENTE'], 'PERA000229MDFRRSA1'),
      usuario(2, 'Óscar Organizador', 'organizador@uv.mx', ['ASISTENTE', 'ORGANIZADOR'], 'OAGO950101HVZRRS09'),
      usuario(3, 'Valeria Validadora', 'validador@uv.mx', ['ASISTENTE', 'VALIDADOR'], 'VAVL980312MVZLLL04'),
      usuario(4, 'Administración EnZona', 'admin@uv.mx', ['ADMIN'], 'ADEN900101HVZDNN01'),
    ],
    eventos: [
      evento({
        id: 1,
        nombre: 'Noche de jazz en el Foro',
        descripcion:
          'Cuarteto local con repertorio de standards y composiciones propias. Entrada con asiento numerado.',
        lugar: 'Foro Cultural Orizaba',
        direccion: 'Sur 5 120, Centro',
        categoriaId: 1,
        categoria: 'Música',
        fechaHoraInicio: fechaRelativa(8, 20),
        fechaHoraFin: fechaRelativa(8, 23),
        aforo: 50,
        esDePago: true,
        requiereAsiento: true,
        tipos: [
          { id: 15, nombre: 'Platea', precio: '180.00', cantidadTotal: 30, disponibles: 25 },
          { id: 16, nombre: 'Preferente', precio: '250.00', cantidadTotal: 20, disponibles: 20 },
        ],
        asientos: jazz,
      }),
      evento({
        id: 2,
        nombre: 'Feria del libro universitaria',
        descripcion: 'Editoriales independientes, presentaciones y lecturas en voz alta. Entrada libre con registro.',
        lugar: 'Explanada del Palacio de Hierro',
        direccion: 'Av. Madero Norte s/n, Centro',
        latitud: 18.8512,
        longitud: -97.0998,
        categoriaId: 3,
        categoria: 'Cultural',
        fechaHoraInicio: fechaRelativa(3, 11),
        fechaHoraFin: fechaRelativa(3, 19),
        aforo: 300,
        esDePago: false,
        tipos: [{ id: 20, nombre: 'General', precio: '0.00', cantidadTotal: 300, disponibles: 212 }],
      }),
      evento({
        id: 3,
        nombre: 'Final de la liga amateur de fútbol',
        descripcion: 'Partido final de la temporada. Habrá venta de alimentos en el estadio.',
        lugar: 'Unidad Deportiva Orizaba',
        direccion: 'Oriente 6, Barrio Nuevo',
        latitud: 18.8478,
        longitud: -97.0912,
        categoriaId: 2,
        categoria: 'Deportivo',
        fechaHoraInicio: fechaRelativa(12, 16),
        aforo: 800,
        esDePago: true,
        tipos: [
          { id: 30, nombre: 'General', precio: '60.00', cantidadTotal: 700, disponibles: 640 },
          { id: 31, nombre: 'Palco', precio: '120.00', cantidadTotal: 100, disponibles: 0 },
        ],
      }),
      evento({
        id: 4,
        nombre: 'Taller de fotografía con celular',
        descripcion: 'Composición, luz natural y edición básica. Cupo limitado.',
        lugar: 'Casa de la Cultura',
        direccion: 'Colón Poniente 230, Centro',
        latitud: 18.8495,
        longitud: -97.1031,
        categoriaId: 4,
        categoria: 'Taller',
        fechaHoraInicio: fechaRelativa(5, 17),
        fechaHoraFin: fechaRelativa(5, 20),
        aforo: 20,
        esDePago: true,
        tipos: [{ id: 40, nombre: 'Inscripción', precio: '150.00', cantidadTotal: 20, disponibles: 6 }],
      }),
      evento({
        id: 5,
        nombre: 'Muestra gastronómica de las Altas Montañas',
        descripcion: 'Cocineras tradicionales de la región presentan sus platillos.',
        lugar: 'Parque Castillo',
        latitud: 18.8519,
        longitud: -97.0985,
        categoriaId: 5,
        categoria: 'Gastronómico',
        fechaHoraInicio: fechaRelativa(16, 12),
        aforo: 400,
        esDePago: false,
        tipos: [{ id: 50, nombre: 'General', precio: '0.00', cantidadTotal: 400, disponibles: 400 }],
      }),
      evento({
        id: 6,
        nombre: 'Concierto de rock en Córdoba',
        lugar: 'Teatro Pedro Díaz',
        ciudad: 'Córdoba',
        latitud: 18.8932,
        longitud: -96.9346,
        categoriaId: 1,
        categoria: 'Música',
        fechaHoraInicio: fechaRelativa(20, 21),
        aforo: 200,
        esDePago: true,
        tipos: [{ id: 60, nombre: 'General', precio: '220.00', cantidadTotal: 200, disponibles: 200 }],
      }),
      evento({
        id: 7,
        nombre: 'Torneo de ajedrez rápido (borrador)',
        lugar: 'Biblioteca Municipal',
        latitud: null,
        longitud: null,
        categoriaId: 6,
        categoria: 'Otro',
        fechaHoraInicio: fechaRelativa(25, 10),
        aforo: 40,
        esDePago: false,
        estado: 'BORRADOR',
        tipos: [{ id: 70, nombre: 'General', precio: '0.00', cantidadTotal: 40, disponibles: 40 }],
      }),
    ],
    ordenes: [],
    boletos: [],
    validaciones: [],
  };
}
