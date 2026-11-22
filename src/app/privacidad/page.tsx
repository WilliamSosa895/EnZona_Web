import type { Metadata } from "next";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TituloPagina } from "@/components/ui/Estados";

export const metadata: Metadata = { title: "Aviso de privacidad" };

export default function PaginaPrivacidad() {
  return (
    <Cascaron ancho="angosto">
      <TituloPagina titulo="Aviso de privacidad" subtitulo="Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)." />
      <div className="prose-enzona mt-6 flex flex-col gap-5 text-[17px] leading-relaxed text-gris-texto">
        <Seccion titulo="Responsable">
          EnZona, plataforma de descubrimiento y boletaje de eventos locales en Orizaba, Veracruz, es responsable del tratamiento de tus datos personales.
        </Seccion>
        <Seccion titulo="Datos que recabamos">
          Nombre, correo electrónico, teléfono (opcional) y CURP. La CURP se utiliza únicamente como dato de verificación de identidad y se almacena cifrada; nunca se muestra en la aplicación ni se comparte con terceros. Tu ubicación se usa solo en el momento en que tocas «Cerca de mí» y no se guarda ningún historial.
        </Seccion>
        <Seccion titulo="Finalidades">
          Crear y verificar tu cuenta, emitir y validar tus boletos, enviarte por correo tus boletos y los avisos sobre cambios o cancelaciones de los eventos a los que asistes, y mostrarte eventos cercanos cuando tú lo pidas.
        </Seccion>
        <Seccion titulo="Datos de pago">
          EnZona no almacena números de tarjeta ni códigos de seguridad. Los cobros los procesa una pasarela de pago externa que entrega un token de un solo uso.
        </Seccion>
        <Seccion titulo="Derechos ARCO">
          Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición, así como revocar tu consentimiento, escribiendo a soporte@enzona.mx desde el correo registrado en tu cuenta. Responderemos en los plazos que marca la ley.
        </Seccion>
        <Seccion titulo="Cambios al aviso">
          Cualquier cambio se publicará en esta misma página y, si es sustancial, te lo avisaremos por correo.
        </Seccion>
      </div>
    </Cascaron>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xl font-semibold text-tinta">{titulo}</h2>
      <p>{children}</p>
    </section>
  );
}
