"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import type { UsuarioDto } from "@/lib/api/tipos";
import { soloFecha } from "@/lib/fecha";
import { Boton } from "@/components/ui/Boton";
import { Dialogo } from "@/components/ui/Dialogo";
import { EstadoVacio } from "@/components/ui/Estados";
import { EtiquetaEstadoUsuario, NOMBRES_ROL } from "@/components/ui/Etiquetas";
import { Aviso } from "@/components/ui/Superficies";
import { cambiarEstadoUsuario } from "./acciones";

/*
 * Usuarios (RF-18): lista con estado, roles (solo lectura: la API no permite
 * editarlos) y la acción de bloquear o activar con confirmación. La propia
 * cuenta no se puede bloquear (la API responde 422).
 */

interface Props {
  usuarios: UsuarioDto[];
  total: number;
  idPropio: number;
  filtroTexto: string;
  filtroEstado: string;
}

export function TablaUsuarios({ usuarios, total, idPropio, filtroTexto, filtroEstado }: Props) {
  const router = useRouter();
  const ruta = usePathname();
  const [texto, setTexto] = useState(filtroTexto);
  const [objetivo, setObjetivo] = useState<UsuarioDto | null>(null);
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null);
  const [pendiente, iniciar] = useTransition();

  const aplicarFiltros = (q: string, estado: string) => {
    const parametros = new URLSearchParams();
    if (q.trim()) parametros.set("q", q.trim());
    if (estado) parametros.set("estado", estado);
    const consulta = parametros.toString();
    router.replace(consulta ? `${ruta}?${consulta}` : ruta);
  };

  const confirmar = () => {
    if (!objetivo) return;
    const nuevoEstado = objetivo.estado === "BLOQUEADO" ? "ACTIVO" : "BLOQUEADO";
    iniciar(async () => {
      const resultado = await cambiarEstadoUsuario(objetivo.id, nuevoEstado);
      setObjetivo(null);
      if (!resultado.ok) {
        setMensaje({ tono: "error", texto: resultado.error });
        return;
      }
      setMensaje({ tono: "exito", texto: `${objetivo.nombre}: cuenta ${nuevoEstado === "ACTIVO" ? "activada" : "bloqueada"}.` });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        onSubmit={(evento) => {
          evento.preventDefault();
          aplicarFiltros(texto, filtroEstado);
        }}
      >
        <label className="relative flex flex-1 items-center">
          <Search className="pointer-events-none absolute left-4 size-5 text-gris-texto" aria-hidden="true" />
          <span className="sr-only">Buscar por nombre o correo</span>
          <input
            type="search"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            placeholder="Buscar por nombre o correo"
            className="h-12 w-full rounded-pildora border border-gris-suave bg-superficie pr-4 pl-12 text-[15px] outline-none placeholder:text-gris-texto focus:border-profundo focus:ring-2 focus:ring-profundo/30"
          />
        </label>
        <label className="flex items-center gap-2 text-[15px] text-tinta">
          <span className="sr-only">Estado</span>
          <select
            value={filtroEstado}
            onChange={(evento) => aplicarFiltros(texto, evento.target.value)}
            className="h-12 cursor-pointer rounded-pildora border border-gris-suave bg-superficie px-4 text-[15px] outline-none focus:border-profundo"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="BLOQUEADO">Bloqueadas</option>
          </select>
        </label>
        <Boton type="submit" variante="contorno">
          Buscar
        </Boton>
      </form>

      <p className="text-[15px] text-gris-texto">{total === 1 ? "1 cuenta" : `${total} cuentas`}</p>
      {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}

      {usuarios.length === 0 ? (
        <EstadoVacio titulo="Ninguna cuenta coincide" descripcion="Prueba con otro nombre, correo o estado." />
      ) : (
        <ul className="divide-y divide-linea rounded-tarjeta bg-superficie">
          {usuarios.map((usuario) => (
            <li key={usuario.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[17px] font-medium text-tinta">
                  {usuario.nombre}
                  {usuario.id === idPropio ? <span className="ml-2 text-sm font-normal text-gris-texto">(tú)</span> : null}
                </p>
                <p className="truncate text-[15px] text-gris-texto">{usuario.correo}</p>
                <p className="mt-1 text-sm text-gris-texto">
                  {(usuario.roles ?? []).map((rol) => NOMBRES_ROL[rol] ?? rol).join(" · ")}
                  {usuario.fechaRegistro ? ` · desde ${soloFecha(usuario.fechaRegistro)}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <EtiquetaEstadoUsuario estado={usuario.estado} />
                {usuario.id !== idPropio && usuario.estado !== "PENDIENTE" ? (
                  <Boton variante={usuario.estado === "BLOQUEADO" ? "contorno" : "peligro"} tamano="compacto" onClick={() => setObjetivo(usuario)}>
                    {usuario.estado === "BLOQUEADO" ? "Activar" : "Bloquear"}
                  </Boton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialogo
        abierto={objetivo !== null}
        onCerrar={() => setObjetivo(null)}
        titulo={objetivo?.estado === "BLOQUEADO" ? "¿Activar esta cuenta?" : "¿Bloquear esta cuenta?"}
        bloqueado={pendiente}
        acciones={
          <>
            <Boton variante="contorno" onClick={() => setObjetivo(null)} disabled={pendiente}>
              Cancelar
            </Boton>
            <Boton variante={objetivo?.estado === "BLOQUEADO" ? "principal" : "peligro"} onClick={confirmar} cargando={pendiente}>
              {objetivo?.estado === "BLOQUEADO" ? "Activar" : "Bloquear"}
            </Boton>
          </>
        }
      >
        <p className="text-lg font-semibold text-tinta">{objetivo?.nombre}</p>
        <p>
          {objetivo?.estado === "BLOQUEADO"
            ? "La persona podrá volver a iniciar sesión de inmediato."
            : "La persona no podrá iniciar sesión ni usar la plataforma. El bloqueo aplica de inmediato aunque tenga una sesión abierta."}
        </p>
      </Dialogo>
    </div>
  );
}
