import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/features/**/reglas.ts", "src/features/**/filtros.ts", "src/features/**/estadisticas.ts", "src/features/validacion/almacen.ts"],
      exclude: ["src/lib/api/servidor.ts", "src/lib/api/navegador.ts", "src/lib/sesion/servidor.ts"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
