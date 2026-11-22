import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import { Cascaron } from "@/components/navegacion/Cascaron";
import { TalonBoleto, enlaceCorreo, textoEstadoBoleto } from "@/components/boletos/TalonBoleto";
import { Aviso } from "@/components/ui/Superficies";
import { ErrorEnZona } from "@/lib/api/errores";
import { boletoKDeN } from "@/lib/formato";
import { RUTAS } from "@/lib/rutas";
import { exigirSesion } from "@/lib/sesion/servidor";
import { agruparPorOrden, boleto as obtenerBoleto, eventoDeBoleto, misBoletos, posicionEnOrden } from "@/features/boletos/api";
import { cn } from "@/lib/cn";
import { PantallaEncendida } from "@/features/boletos/PantallaEncendida";

export const metadata: Metadata = { title: "Tu boleto" };

/*
 * Tu boleto (RF-12): talón con QR, «Boleto k de N» con anterior/siguiente
 * dentro de la misma orden y «Enviar con mi app de correo». El QR es el
 * `contenidoQr` que firma la API; la web solo lo dibuja.
 */
export default async function PaginaBoleto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await exigirSesion(RUTAS.boleto(id));

  const [boleto, todos] = await Promise.all([
    obtenerBoleto(id).catch((error: unknown) => {
      if (error instanceof ErrorEnZona && error.estado === 404) notFound();
      throw error;
    }),
    misBoletos().catch(() => []),
  ]);
  const evento = await eventoDeBoleto(boleto.eventoId);
  const grupos = agruparPorOrden(todos.length > 0 ? todos : [boleto]);
  const hermanos = grupos.get(boleto.ordenId) ?? [boleto];
  const posicion = posicionEnOrden(boleto, grupos);
  const anterior = hermanos[posicion.k - 2];
  const siguiente = hermanos[posicion.k];
  const estado = textoEstadoBoleto(boleto, evento);

  return (
    <Cascaron ancho="angosto">
      <div className="mb-4 flex items-center gap-2">
        <Link href={RUTAS.misBoletos} aria-label="Volver a mis boletos" className="flex size-11 items-center justify-center rounded-pildora text-tinta hover:bg-superficie-alta">
          <ArrowLeft className="size-6" />
        </Link>
        <h1 className="text-[2rem] font-bold tracking-tight text-tinta">Tu boleto</h1>
      </div>

      {hermanos.length > 1 ? (
        <nav aria-label="Boletos de esta orden" className="mb-4 flex items-center justify-between">
          <EnlaceVecino href={anterior ? RUTAS.boleto(anterior.id) : null} etiqueta="Boleto anterior">
            <ArrowLeft className="size-5" aria-hidden="true" />
          </EnlaceVecino>
          <span className="text-lg font-semibold text-tinta">{boletoKDeN(posicion.k, posicion.n)}</span>
          <EnlaceVecino href={siguiente ? RUTAS.boleto(siguiente.id) : null} etiqueta="Boleto siguiente">
            <ArrowRight className="size-5" aria-hidden="true" />
          </EnlaceVecino>
        </nav>
      ) : null}

      <div className="flex flex-col gap-5">
        <TalonBoleto boleto={boleto} evento={evento} posicion={hermanos.length > 1 ? posicion : undefined} />
        <Aviso tono={estado.tono}>{estado.texto}</Aviso>
        <PantallaEncendida activo={boleto.estado === "VALIDO" && evento?.estado !== "CANCELADO"} />
        <a
          href={enlaceCorreo(boleto, evento)}
          className="inline-flex h-control w-full items-center justify-center gap-2 rounded-pildora border border-gris-suave px-5 text-[15px] font-medium text-tinta hover:bg-superficie-alta"
        >
          <Mail className="size-5" aria-hidden="true" />
          Enviar con mi app de correo
        </a>
        <p className="text-center text-sm text-gris-texto">
          La API también te envió este boleto por correo al comprarlo. Si no lo ves, revisa la carpeta de no deseados.
        </p>
      </div>
    </Cascaron>
  );
}

function EnlaceVecino({ href, etiqueta, children }: { href: string | null; etiqueta: string; children: React.ReactNode }) {
  const clase = "flex size-12 items-center justify-center rounded-full";
  if (!href) {
    return (
      <span aria-disabled="true" className={cn(clase, "bg-superficie-alta text-gris-suave")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={etiqueta} className={cn(clase, "bg-tinte-50 text-marino hover:bg-tinte-100")}>
      {children}
    </Link>
  );
}
