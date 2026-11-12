import type { Metadata } from "next";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TituloPagina } from "@/components/ui/Estados";

export const metadata: Metadata = { title: "Legal" };

export default function PaginaLegal() {
  return (
    <Cascaron ancho="angosto">
      <TituloPagina titulo="Legal" subtitulo="Política de reembolsos y transparencia de precios." />
      <div className="mt-6 flex flex-col gap-5 text-[17px] leading-relaxed text-gris-texto">
        <section>
          <h2 className="mb-1 text-xl font-semibold text-tinta">Transparencia de precios</h2>
          <p>
            El precio que ves en el detalle del evento es el precio final. No hay cargos por servicio añadidos al final ni tarifas que cambien según la demanda. El total de tu orden es precio unitario × cantidad de boletos, calculado por el servidor a partir del tipo de boleto.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-xl font-semibold text-tinta">Reembolsos</h2>
          <p>
            Si el organizador o la administración cancelan un evento antes de su inicio, todos los boletos quedan anulados y recibes el 100 % de lo pagado en el mismo medio de pago, sin trámite de tu parte. Te avisamos por correo. Un evento que ya comenzó no se cancela ni se reembolsa.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-xl font-semibold text-tinta">Boletos</h2>
          <p>
            Cada boleto es personal e intransferible dentro de la plataforma y da acceso una sola vez. Está firmado digitalmente por el servidor; un QR alterado o copiado se rechaza en la puerta. Puedes mostrar desde tu cuenta los boletos que compraste para tus acompañantes.
          </p>
        </section>
        <section>
          <h2 className="mb-1 text-xl font-semibold text-tinta">Pagos rechazados</h2>
          <p>Un pago rechazado no genera cargo ni boleto. Puedes reintentar; los lugares no se descuentan hasta que el pago se aprueba.</p>
        </section>
      </div>
    </Cascaron>
  );
}
