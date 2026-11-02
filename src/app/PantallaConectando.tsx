import estilos from './PantallaConectando.module.css';

/*
 * Geometría de AnimacionConexion.kt (app Android) en un lienzo de 200 × 200: el centro del pin está a 0.42 del
 * lado, el radio es 0.33 y la punta llega a 0.96. Las fases (contorno, disco, boleto, nombre y salida) y su
 * duración de 2.8 s viven en el CSS para que el navegador las anime sin JavaScript.
 */
const LADO = 200;
const CENTRO = { x: LADO / 2, y: LADO * 0.42 };
const RADIO = LADO * 0.33;
const PUNTA_Y = LADO * 0.96;
const GROSOR = LADO * 0.055;
const RADIO_ANILLO = RADIO * 0.8;
const MUESCA_DISCO = RADIO * 0.13;
/** Mitad del ángulo (grados) que abarca la punta sobre el círculo. */
const APERTURA = 48;

function puntoEnCirculo(grados: number) {
  const rad = (grados * Math.PI) / 180;
  return { x: CENTRO.x + RADIO * Math.cos(rad), y: CENTRO.y + RADIO * Math.sin(rad) };
}

// Empieza en la punta, sube por la derecha, rodea el círculo por arriba y vuelve por la izquierda.
const derecha = puntoEnCirculo(90 - APERTURA);
const izquierda = puntoEnCirculo(90 + APERTURA);
const CAMINO_PIN =
  `M${CENTRO.x} ${PUNTA_Y}L${derecha.x.toFixed(2)} ${derecha.y.toFixed(2)}` +
  `A${RADIO} ${RADIO} 0 1 0 ${izquierda.x.toFixed(2)} ${izquierda.y.toFixed(2)}Z`;

// Boleto blanco con muescas en los extremos, girado −35° como en Android.
const BOLETO = { ancho: RADIO * 1.25, alto: RADIO * 0.62 };
const BOLETO_X = CENTRO.x - BOLETO.ancho / 2;
const BOLETO_Y = CENTRO.y - BOLETO.alto / 2;
const ESQUINA = BOLETO.alto * 0.16;
const MUESCA_BOLETO = BOLETO.alto * 0.19;
const GROSOR_BOLETO = LADO * 0.012;

function circulo(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function rectanguloRedondeado(x: number, y: number, ancho: number, alto: number, r: number) {
  return (
    `M${x + r} ${y}H${x + ancho - r}A${r} ${r} 0 0 1 ${x + ancho} ${y + r}V${y + alto - r}` +
    `A${r} ${r} 0 0 1 ${x + ancho - r} ${y + alto}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + alto - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

const CONTORNO_BOLETO = rectanguloRedondeado(BOLETO_X, BOLETO_Y, BOLETO.ancho, BOLETO.alto, ESQUINA);
const FORMA_BOLETO =
  CONTORNO_BOLETO +
  circulo(BOLETO_X, CENTRO.y, MUESCA_BOLETO) +
  circulo(BOLETO_X + BOLETO.ancho, CENTRO.y, MUESCA_BOLETO);
const PERFORACIONES = [-0.28, 0.28].map((dx) => CENTRO.x + BOLETO.ancho * dx);

/**
 * Pantalla de espera al abrir EnZona con una sesión guardada (PantallaConectando de Android): el logo se arma
 * por partes sobre azul claro mientras se comprueba la sesión con la API. Con «reducir movimiento» se muestra
 * el logo completo, sin animación.
 */
export function PantallaConectando({ texto = 'Conectando con EnZona…' }: { texto?: string }) {
  return (
    <div className={estilos.pantalla} role="status" aria-live="polite">
      <div className={estilos.ciclo} aria-hidden="true">
        <svg className={estilos.logo} viewBox={`0 0 ${LADO} ${LADO}`} width={LADO} height={LADO} focusable="false">
          <defs>
            <clipPath id="enzona-conexion-boleto">
              <path d={CONTORNO_BOLETO} />
            </clipPath>
          </defs>
          <path className={estilos.contorno} d={CAMINO_PIN} pathLength={1} strokeWidth={GROSOR} />
          <circle
            className={estilos.anillo}
            cx={CENTRO.x}
            cy={CENTRO.y}
            r={RADIO_ANILLO}
            pathLength={1}
            strokeWidth={GROSOR * 0.45}
            transform={`rotate(-90 ${CENTRO.x} ${CENTRO.y})`}
          />
          <g className={estilos.disco}>
            <circle cx={CENTRO.x} cy={CENTRO.y} r={RADIO_ANILLO} fillOpacity={0.92} />
            <circle cx={CENTRO.x - RADIO_ANILLO} cy={CENTRO.y} r={MUESCA_DISCO} />
            <circle cx={CENTRO.x + RADIO_ANILLO} cy={CENTRO.y} r={MUESCA_DISCO} />
          </g>
          <g transform={`rotate(-35 ${CENTRO.x} ${CENTRO.y})`}>
            <g className={estilos.boleto}>
              <g clipPath="url(#enzona-conexion-boleto)">
                <path className={estilos.boletoForma} d={FORMA_BOLETO} strokeWidth={GROSOR_BOLETO * 2} />
              </g>
              {PERFORACIONES.map((x) => (
                <path
                  key={x}
                  className={estilos.perforacion}
                  d={`M${x} ${BOLETO_Y + BOLETO.alto * 0.16}V${BOLETO_Y + BOLETO.alto * 0.84}`}
                  strokeWidth={GROSOR_BOLETO}
                  strokeDasharray={`${GROSOR_BOLETO * 2.2} ${GROSOR_BOLETO * 2.2}`}
                />
              ))}
            </g>
          </g>
        </svg>
        <p className={estilos.nombre}>
          <span className={estilos.en}>En</span>
          <span className={estilos.zona}>Zona</span>
        </p>
      </div>
      <p className={estilos.texto}>{texto}</p>
    </div>
  );
}
