import { BarraSuperior } from '@/ui';
import { Apartado } from './Apartado';
import estilos from './Informacion.module.css';

export default function LegalPage() {
  return (
    <>
      <BarraSuperior titulo="Legal" volver />
      <div className={estilos.contenido}>
        <Apartado titulo="Términos y condiciones de uso">
          Al crear una cuenta aceptas usar EnZona de buena fe: proporcionar información veraz, no suplantar a otras
          personas y no intentar duplicar, falsificar o revender boletos.
        </Apartado>
        <Apartado titulo="Transparencia de precios">
          El importe que ves antes de pagar es el importe final. EnZona no añade cargos en pasos posteriores ni aplica
          tarifas que varíen según la demanda, conforme a las disposiciones vigentes de la Procuraduría Federal del
          Consumidor.
        </Apartado>
        <Apartado titulo="Papel de EnZona en la venta">
          EnZona es la plataforma que conecta a organizadores y asistentes. El responsable del evento, de su realización
          y de sus condiciones es siempre el organizador. Los cobros los procesa una pasarela externa; EnZona no
          custodia los fondos.
        </Apartado>
        <Apartado titulo="Reembolsos">
          Si un evento se cancela, los boletos se anulan y el reembolso se inicia automáticamente por la misma vía del
          pago. Para cambios o cancelaciones por parte del asistente aplica la política que defina cada organizador.
        </Apartado>
        <Apartado titulo="Boletos y accesos">
          Cada boleto es único, está firmado digitalmente y solo puede utilizarse una vez. Compartir tu código implica
          el riesgo de que otra persona lo use antes que tú; en ese caso el acceso te será negado.
        </Apartado>
        <Apartado titulo="Proyecto académico">
          Esta versión de EnZona es un piloto desarrollado en la Facultad de Negocios y Tecnologías de la Universidad
          Veracruzana. Los pagos que se procesan en este entorno son simulados.
        </Apartado>
      </div>
    </>
  );
}
