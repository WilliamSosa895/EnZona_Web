import { MdMail } from 'react-icons/md';
import { BarraSuperior } from '@/ui';
import { Apartado } from './Apartado';
import estilos from './Informacion.module.css';

export default function AyudaPage() {
  return (
    <>
      <BarraSuperior titulo="¿Necesitas ayuda?" volver />
      <div className={estilos.contenido}>
        <h2 className={estilos.subtitulo}>Preguntas frecuentes</h2>
        <Apartado titulo="No me llegó el boleto por correo">
          Tu boleto siempre está disponible en «Mis boletos», aunque el correo no haya llegado. Revisa también la
          carpeta de correo no deseado.
        </Apartado>
        <Apartado titulo="¿Puedo entrar con una captura de pantalla del QR?">
          Sí. Lo que se valida es el código, no la pantalla donde se muestra. Eso sí: el boleto es de un solo uso, así
          que si alguien más lo escanea antes que tú, ya no podrás entrar con él. No compartas tu código.
        </Apartado>
        <Apartado titulo="El evento se canceló, ¿qué pasa con mi dinero?">
          Cuando un organizador cancela un evento, tus boletos se anulan automáticamente y el reembolso se inicia a
          través de la misma pasarela por la que pagaste. El tiempo de acreditación depende de tu banco.
        </Apartado>
        <Apartado titulo="Me equivoqué de evento o ya no puedo asistir">
          Escríbele al organizador del evento: es quien define su política de cambios. EnZona no permite revender ni
          transferir boletos entre usuarios.
        </Apartado>
        <Apartado titulo="Soy organizador, ¿cómo valido los boletos en la puerta?">
          Desde el panel de tu evento designa como personal de acceso a quien vaya a estar en la entrada. Esa persona
          verá la pestaña «Escanear» en su cuenta. En la aplicación Android, descarguen la lista del evento antes de
          empezar: el escáner funciona aunque no haya señal.
        </Apartado>
        <h2 className={estilos.subtitulo}>Contacto</h2>
        <section className={estilos.apartado}>
          <div className={estilos.contacto}>
            <MdMail aria-hidden="true" />
            <div>
              <strong>
                <a href="mailto:soporte@enzona.mx">soporte@enzona.mx</a>
              </strong>
              <p>Respondemos en menos de 24 horas hábiles</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
