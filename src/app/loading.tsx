import { IndicadorCarga } from "@/components/ui/Estados";

export default function Cargando() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <IndicadorCarga />
    </div>
  );
}
