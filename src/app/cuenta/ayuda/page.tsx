import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { Tarjeta } from "@/components/ui/Superficies";
import { RUTAS } from "@/lib/rutas";

export const metadata: Metadata = { title: "Ayuda" };

const PREGUNTAS: { pregunta: string; respuesta: string }[] = [
  {
    pregunta: "¿Cómo recibo mi boleto?",
    respuesta:
      "Al confirmar tu asistencia o pagar, el boleto aparece en «Mis boletos» con su código QR y la API te lo envía por correo. Si no lo ves, revisa la carpeta de correo no deseado.",
  },
  {
    pregunta: "¿Puedo comprar varios boletos?",
    respuesta:
      "Sí. En los eventos de pago eliges la cantidad (hasta la disponibilidad real) y, si el recinto tiene asientos numerados, un asiento por boleto. Cada boleto tiene su propio QR y se valida por separado.",
  },
  {
    pregunta: "¿Qué pasa si mi pago es rechazado?",
    respuesta:
      "No se emite ningún boleto ni se hace ningún cargo. Puedes intentarlo de nuevo con la misma selección; los lugares no se descuentan hasta que el pago se aprueba.",
  },
  {
    pregunta: "¿Guardan los datos de mi tarjeta?",
    respuesta:
      "No. El cobro lo procesa una pasarela externa que genera un token de un solo uso. EnZona nunca recibe ni almacena el número de tu tarjeta ni el CVV.",
  },
  {
    pregunta: "¿Qué pasa si cancelan un evento?",
    respuesta:
      "Tus boletos quedan anulados, recibes un aviso por correo y el reembolso del 100 % se procesa en automático a tu mismo medio de pago.",
  },
  {
    pregunta: "¿El QR funciona sin internet en la puerta?",
    respuesta:
      "Sí. El personal de acceso puede validar tu boleto aunque no tenga señal: compara el código con la lista del evento y sincroniza después. Tu QR solo da acceso una vez.",
  },
  {
    pregunta: "¿Para qué piden mi CURP?",
    respuesta:
      "Es el dato de verificación de identidad del registro. Se guarda cifrada en el servidor y nunca se muestra ni se comparte.",
  },
];

export default function PaginaAyuda() {
  return (
    <Cascaron ancho="angosto">
      <div className="flex items-center gap-2">
        <Link href={RUTAS.cuenta} aria-label="Volver a mi cuenta" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Ayuda</h1>
      </div>
      <div className="mt-6 flex flex-col gap-6">
        <section aria-labelledby="faq" className="flex flex-col gap-2">
          <h2 id="faq" className="px-1 text-xl font-semibold text-tinta">
            Preguntas frecuentes
          </h2>
          <div className="divide-y divide-linea rounded-tarjeta bg-superficie">
            {PREGUNTAS.map((item) => (
              <details key={item.pregunta} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] text-tinta [&::-webkit-details-marker]:hidden">
                  {item.pregunta}
                  <span aria-hidden="true" className="text-profundo transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pt-3 text-[15px] leading-relaxed text-gris-texto">{item.respuesta}</p>
              </details>
            ))}
          </div>
        </section>
        <Tarjeta className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-tinta">Contacto</h2>
          <p className="text-[15px] text-gris-texto">¿No encontraste tu respuesta? Escríbenos y te respondemos por correo.</p>
          <a href="mailto:soporte@enzona.mx" className="flex items-center gap-2 font-medium text-profundo hover:underline">
            <Mail className="size-5" aria-hidden="true" />
            soporte@enzona.mx
          </a>
        </Tarjeta>
      </div>
    </Cascaron>
  );
}
