import { MdNotificationsNone } from 'react-icons/md';
import { BarraSuperior, EstadoVacio } from '@/ui';

/**
 * Notificaciones (NotificacionesScreen en Android). La API de EnZona no tiene un centro de notificaciones: envía
 * por correo el boleto con su QR, los recordatorios y los cambios o cancelaciones. La pantalla lo explica.
 */
export default function NotificacionesPage() {
  return (
    <>
      <BarraSuperior titulo="Notificaciones" volver />
      <EstadoVacio
        icono={<MdNotificationsNone size={56} />}
        titulo="Tus avisos llegan por correo"
        texto="EnZona te envía al correo el boleto con su QR, los recordatorios y cualquier cambio o cancelación de tus eventos. Revisa tu bandeja (y la carpeta de no deseados)."
      />
    </>
  );
}
