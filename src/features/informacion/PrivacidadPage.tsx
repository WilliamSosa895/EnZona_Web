import { useSesion } from '@/auth/useSesion';
import { BarraSuperior } from '@/ui';
import { Apartado } from './Apartado';
import estilos from './Informacion.module.css';

/** Aviso de privacidad (LFPDPPP). Se puede consultar sin sesión, desde el registro. */
export default function PrivacidadPage() {
  const { autenticado } = useSesion();
  return (
    <>
      <BarraSuperior titulo="Privacidad" volver={autenticado ? true : undefined} />
      <div className={estilos.contenido}>
        <Apartado titulo="Aviso de privacidad">
          EnZona, como responsable del tratamiento de tus datos personales, hace de tu conocimiento que la información
          que nos proporcionas se trata conforme a la Ley Federal de Protección de Datos Personales en Posesión de los
          Particulares.
        </Apartado>
        <Apartado titulo="Qué datos recabamos">
          Nombre, correo electrónico, teléfono (opcional) y CURP. También registramos los eventos a los que asistes y
          los accesos validados, porque son necesarios para emitir y verificar tus boletos. Si lo autorizas, usamos tu
          ubicación solo para mostrarte los eventos cercanos; no la guardamos.
        </Apartado>
        <Apartado titulo="Para qué los usamos">
          Para identificarte de forma única y reducir el fraude de boletos, para entregarte tus boletos y avisarte de
          cambios o cancelaciones, y para llevar el control de aforo de los eventos. No vendemos tus datos ni los
          compartimos con fines publicitarios.
        </Apartado>
        <Apartado titulo="Cómo los protegemos">
          Tu CURP se almacena cifrado y tu contraseña como un hash irreversible. No guardamos los datos de tu tarjeta:
          los pagos los procesa una pasarela externa y nosotros solo conservamos una referencia que no permite
          reconstruirla.
        </Apartado>
        <Apartado titulo="Tus derechos ARCO">
          Puedes solicitar el Acceso, Rectificación, Cancelación u Oposición al tratamiento de tus datos escribiendo a
          privacidad@enzona.mx. Atenderemos tu solicitud en un plazo máximo de 20 días hábiles. Considera que la
          cancelación de tus datos puede impedir la validación de boletos ya emitidos a tu nombre.
        </Apartado>
        <Apartado titulo="Cambios a este aviso">
          Si modificamos este aviso te lo notificaremos dentro de la aplicación antes de que los cambios entren en
          vigor.
        </Apartado>
      </div>
    </>
  );
}
