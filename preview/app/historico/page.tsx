"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_DEPORTISTAS, GRUPOS, fmtCodigo } from "@/lib/mockData";
import { GraficasPanel } from "@/components/GraficasPanel";
import { DEFAULT_CONFIG } from "@/lib/config";
import { fechaCorta } from "@/lib/historial";
import { edadDesde } from "@/lib/escalas";
import type { Cap } from "@/components/RadarPerfil";

export default function HistoricoPage() {
  const [grupo, setGrupo] = useState("Todos");
  const [selId, setSelId] = useState<string | null>(null);

  const lista = grupo === "Todos" ? MOCK_DEPORTISTAS : MOCK_DEPORTISTAS.filter((d) => d.grupo === grupo);
  const sel = MOCK_DEPORTISTAS.find((d) => d.id === selId) || null;

  const nuevaFichaHref = (d?: (typeof MOCK_DEPORTISTAS)[number]) =>
    d ? `/?doc=${d.documento}&nombre=${encodeURIComponent(d.nombre)}&sexo=${d.sexo}&nac=${d.fechaNac}` : "/";

  const perfilDe = (d: (typeof MOCK_DEPORTISTAS)[number]): Cap[] => {
    const v = d.valoraciones[d.valoraciones.length - 1];
    const e = DEFAULT_CONFIG.equipo;
    return [
      { cap: "Fuerza máxima", score: v.fuerza, team: e.fuerza, raw: "", detail: "Sentadilla 1RM" },
      { cap: "Velocidad punta", score: v.velocidad, team: e.velocidad, raw: "", detail: "Sprint 10 m" },
      { cap: "Resistencia", score: v.resistencia, team: e.resistencia, raw: "", detail: "VO₂máx" },
      { cap: "Altura de salto", score: v.salto, team: e.salto, raw: "", detail: "CMJ" },
    ];
  };

  return (
    <>
      <header className="topbar">
        <div className="logo">IN<br />MOVE</div>
        <div>
          <h1>Histórico de deportistas</h1>
          <div className="sub">In Move · {MOCK_DEPORTISTAS.length} deportistas registrados</div>
        </div>
        <div className="spacer" />
        <Link href="/ajustes" className="pill" style={{ textDecoration: "none", color: "#fff", marginRight: 8 }}>⚙️ Ajustes</Link>
        <Link href="/" className="pill" style={{ textDecoration: "none", color: "#fff" }}>＋ Nueva ficha</Link>
      </header>

      <main className="app">
        {/* Filtro por grupo */}
        <div className="grupo-filtro">
          {GRUPOS.map((g) => (
            <button key={g} className={"chip-btn" + (grupo === g ? " active" : "")} onClick={() => setGrupo(g)}>{g}</button>
          ))}
        </div>

        {/* Tabla de deportistas */}
        <section className="card" style={{ overflowX: "auto" }}>
          <table className="hist-table">
            <thead>
              <tr>
                <th>Deportista</th><th>Grupo</th><th>Edad</th>
                <th>Valoraciones</th><th>Última</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((d) => {
                const ult = d.valoraciones[d.valoraciones.length - 1];
                return (
                  <tr key={d.id} className={selId === d.id ? "sel" : ""}>
                    <td>
                      <div className="dep-nombre">{d.nombre}</div>
                      <div className="dep-cod">Cód. {fmtCodigo(d.codigo)}</div>
                    </td>
                    <td><span className="grupo-tag">{d.grupo}</span></td>
                    <td>{edadDesde(d.fechaNac)} años</td>
                    <td>{d.valoraciones.length}</td>
                    <td>{fechaCorta(ult.fecha)}</td>
                    <td>
                      <div className="acciones">
                        <button className="btn-sm primary" onClick={() => setSelId(selId === d.id ? null : d.id)}>
                          {selId === d.id ? "Ocultar" : "Ver fichas"}
                        </button>
                        <Link href={nuevaFichaHref(d)} className="btn-sm ghost">Nueva ficha</Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {/* Detalle del deportista seleccionado */}
        {sel && (
          <section className="card" style={{ padding: 0, overflow: "hidden", border: "none", background: "transparent" }}>
            <div className="detalle-head">
              <div>
                <div className="detalle-nombre">{sel.nombre}</div>
                <div className="detalle-meta">{sel.grupo} · {edadDesde(sel.fechaNac)} años · Cód. {fmtCodigo(sel.codigo)} · {sel.valoraciones.length} valoraciones</div>
              </div>
              <Link href={nuevaFichaHref(sel)} className="btn btn-primary" style={{ textDecoration: "none" }}>＋ Nueva ficha</Link>
            </div>
            <GraficasPanel
              perfil={perfilDe(sel)}
              sexo={sel.sexo}
              grasa={sel.valoraciones[sel.valoraciones.length - 1].grasa}
              fcReposo={sel.valoraciones[sel.valoraciones.length - 1].fcReposo}
              sitReach={sel.valoraciones[sel.valoraciones.length - 1].sitReach}
              historial={sel.valoraciones}
            />
          </section>
        )}
      </main>
    </>
  );
}
