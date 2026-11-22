import type { Metadata } from "next";
import { FormularioRecuperacion } from "@/features/auth/FormularioRecuperacion";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return <FormularioRecuperacion />;
}
