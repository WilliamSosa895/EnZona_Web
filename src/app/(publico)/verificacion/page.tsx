import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RUTAS } from "@/lib/rutas";
import { FormularioVerificacion } from "@/features/auth/FormularioVerificacion";

export const metadata: Metadata = { title: "Verifica tu cuenta" };

export default async function PaginaVerificacion({ searchParams }: { searchParams: Promise<{ correo?: string }> }) {
  const { correo } = await searchParams;
  if (!correo) redirect(RUTAS.registro);
  return <FormularioVerificacion correo={correo} />;
}
