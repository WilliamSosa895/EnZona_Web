import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { MarcaJs } from "@/components/ui/Revelar";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EnZona · Eventos cerca de ti",
    template: "%s · EnZona",
  },
  description:
    "Descubre eventos en Orizaba y alrededores, confirma tu asistencia o compra boletos con código QR de un solo uso.",
  applicationName: "EnZona",
  icons: { icon: "/icon.svg" },
};

/** La API en Render puede tardar en despertar: se da margen a las funciones de servidor. */
export const maxDuration = 60;

export const viewport: Viewport = {
  themeColor: "#eef1f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={roboto.variable}>
      <body className="antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-campo focus:bg-marino focus:px-4 focus:py-2 focus:text-blanco"
        >
          Saltar al contenido
        </a>
        <MarcaJs />
        {children}
      </body>
    </html>
  );
}
