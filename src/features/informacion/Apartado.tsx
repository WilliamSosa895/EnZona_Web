import type { ReactNode } from 'react';
import estilos from './Informacion.module.css';

export function Apartado({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={estilos.apartado}>
      <h2>{titulo}</h2>
      <p>{children}</p>
    </section>
  );
}
