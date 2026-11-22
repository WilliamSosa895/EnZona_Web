import type { IconType } from 'react-icons';
import { MdAdminPanelSettings, MdConfirmationNumber, MdEvent, MdHome, MdPerson, MdQrCodeScanner } from 'react-icons/md';
import type { Rol } from '@/api/tipos';

export interface Destino {
  ruta: string;
  etiqueta: string;
  icono: IconType;
}

/**
 * Pestañas de navegación según los roles de quien inició sesión (destinosDeRol en Android). Quien entra por el
 * acceso del personal (validador, organizador o administración) ve solo su trabajo: «Inicio» y «Mis boletos» son
 * de la experiencia de asistente y se ocultan en esa sesión.
 */
export function destinosDeRol(roles: readonly Rol[], accesoPersonal = false): Destino[] {
  const destinos: Destino[] = [];
  if (roles.includes('ASISTENTE') && !accesoPersonal) {
    destinos.push({ ruta: '/', etiqueta: 'Inicio', icono: MdHome });
    destinos.push({ ruta: '/boletos', etiqueta: 'Mis boletos', icono: MdConfirmationNumber });
  }
  if (roles.includes('ORGANIZADOR')) destinos.push({ ruta: '/organizador', etiqueta: 'Mis eventos', icono: MdEvent });
  if (roles.includes('VALIDADOR')) destinos.push({ ruta: '/validador', etiqueta: 'Escanear', icono: MdQrCodeScanner });
  if (roles.includes('ADMIN')) destinos.push({ ruta: '/admin', etiqueta: 'Admin', icono: MdAdminPanelSettings });
  destinos.push({ ruta: '/perfil', etiqueta: 'Perfil', icono: MdPerson });
  return destinos;
}
