"use client";

import { useState } from "react";
import { RadarPerfil, type Cap } from "./RadarPerfil";
import {
  Sexo, Nivel, EscalaDef,
  escalaGrasa, escalaFcReposo, escalaSitReach,
  clasificarGrasa, clasificarFcReposo, clasificarSitAndReach,
} from "@/lib/escalas";
import { Snapshot, HISTORIAL_DEMO, fechaCorta, CAPS_HIST } from "@/lib/historial";

const HEX: Record<Nivel, string> = { rojo: "#e5484d", amarillo: "#e0a63e", verde: "#2fa84f", azul: "#3b82f6" };

/** Barra de rango: segmentos de color + marcador de la posición del deportista */
function ScaleBar({ def, value, etiqueta }: { def: EscalaDef; value: number | null; etiqueta: string | null }) {
  const span = def.max - def.min;
  const pos = value == null ? null : Math.max(0, Math.min(100, ((value - def.min) / span) * 100));
  let prev = def.min;
  return (
    <div className="sb">
      <div className="sb-head">
        <span className="sb-title">{def.titulo}</span>
        {value == null ? (
          <span className="sb-badge empty">Sin dato</span>
        ) : (
          <span className="sb-badge" style={{ color: "#0b0e11", background: etiquetaColor(def, value) }}>
            {value}{def.unidad} · {etiqueta}
          </span>
        )}
      </div>
      <div className="sb-track">
        {def.bandas.map((b, i) => {
          const w = ((b.to - prev) / span) * 100;
          const seg = (
            <div key={i} className="sb-seg" style={{ width: `${w}%`, background: HEX[b.nivel] }}>
              <span className="sb-seg-lbl">{b.label}</span>
            </div>
          );
          prev = b.to;
          return seg;
        })}
        {pos != null && (
          <div className="sb-marker" style={{ left: `${pos}%` }}>
            <span className="sb-marker-val">{value}</span>
          </div>
        )}
      </div>
      <div className="sb-ticks">
        <span>{def.min}{def.unidad}</span>
        <span>{def.max}{def.unidad}</span>
      </div>
    </div>
  );
}

function etiquetaColor(def: EscalaDef, value: number): string {
  let prev = def.min;
  for (const b of def.bandas) {
    if (value <= b.to) return HEX[b.nivel];
    prev = b.to;
  }
  return HEX[def.bandas[def.bandas.length - 1].nivel];
}

/** Mini-gráfico de tendencia (0–100) para una serie de valoraciones */
function Sparkline({ values, w = 190, h = 42 }: { values: number[]; w?: number; h?: number }) {
  const n = values.length, pad = 5;
  const x = (i: number) => pad + (n === 1 ? 0 : (i / (n - 1)) * (w - 2 * pad));
  const y = (v: number) => pad + (1 - v / 100) * (h - 2 * pad);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const last = values[n - 1];
  const area = `${pad},${h - pad} ${pts} ${x(n - 1)},${h - pad}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="spark" preserveAspectRatio="none">
      <polygon className="spark-area" points={area} />
      <polyline className="spark-line" points={pts} />
      {values.map((v, i) => <circle key={i} className="spark-pt" cx={x(i)} cy={y(v)} r={2} />)}
      <circle className="spark-dot" cx={x(n - 1)} cy={y(last)} r={3.5} />
    </svg>
  );
}

function HistorialView({ data }: { data: Snapshot[] }) {
  const [a, setA] = useState(Math.max(0, data.length - 2));
  const [b, setB] = useState(data.length - 1);
  const A = data[a], B = data[b];

  return (
    <div className="gp-body">
      <div className="gp-h-top">
        <p className="gp-note" style={{ margin: 0 }}>Valoraciones cada ~3 meses. Elige dos fechas para comparar el progreso.</p>
        <div className="gp-h-cmp">
          <select value={a} onChange={(e) => setA(+e.target.value)} aria-label="Fecha inicial">
            {data.map((s, i) => <option key={i} value={i}>{fechaCorta(s.fecha)}</option>)}
          </select>
          <span className="gp-h-vs">vs</span>
          <select value={b} onChange={(e) => setB(+e.target.value)} aria-label="Fecha final">
            {data.map((s, i) => <option key={i} value={i}>{fechaCorta(s.fecha)}</option>)}
          </select>
        </div>
      </div>

      <table className="gp-h-table">
        <thead>
          <tr><th>Capacidad</th><th>{fechaCorta(A.fecha)}</th><th>{fechaCorta(B.fecha)}</th><th>Δ</th></tr>
        </thead>
        <tbody>
          {CAPS_HIST.map((c) => {
            const va = A[c.key], vb = B[c.key], d = vb - va, up = d >= 0;
            return (
              <tr key={c.key}>
                <td>{c.label}</td><td>{va}</td><td>{vb}</td>
                <td className={d === 0 ? "" : up ? "up" : "down"}>{d === 0 ? "=" : `${up ? "▲ +" : "▼ "}${d}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="gp-h-trends">
        {CAPS_HIST.map((c) => {
          const serie = data.map((s) => s[c.key]);
          const d = serie[serie.length - 1] - serie[0], up = d >= 0;
          return (
            <div key={c.key} className="gp-h-trow">
              <div className="gp-h-tlabel">
                <span className="cap">{c.label}</span>
                <span className={"chg " + (up ? "up" : "down")}>{up ? "+" : ""}{d} en {data.length} valoraciones</span>
              </div>
              <Sparkline values={serie} />
              <span className="gp-h-now">{serie[serie.length - 1]}<small>/100</small></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Props = {
  perfil: Cap[];
  sexo: Sexo;
  grasa: number | null;
  fcReposo: number | null;
  sitReach: number | null;
  historial?: Snapshot[];
};

const TABS = [
  { id: "radar", label: "Radar" },
  { id: "escalas", label: "Escalas" },
  { id: "historial", label: "Historial" },
  { id: "ficha", label: "Ficha" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function GraficasPanel({ perfil, sexo, grasa, fcReposo, sitReach, historial = HISTORIAL_DEMO }: Props) {
  const [tab, setTab] = useState<TabId>("radar");

  return (
    <div className="gp">
      <style>{css}</style>

      <div className="gp-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id}
            className={"gp-tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "radar" && <RadarPerfil data={perfil} />}

      {tab === "escalas" && (
        <div className="gp-body">
          <p className="gp-note">Cada barra muestra la escala completa por colores y dónde cae el deportista, para ver de un vistazo qué tan bueno o bajo es el resultado.</p>
          <ScaleBar def={escalaGrasa(sexo)} value={grasa} etiqueta={clasificarGrasa(sexo, grasa)?.etiqueta ?? null} />
          <ScaleBar def={escalaFcReposo()} value={fcReposo} etiqueta={clasificarFcReposo(fcReposo)?.etiqueta ?? null} />
          <ScaleBar def={escalaSitReach(sexo)} value={sitReach} etiqueta={clasificarSitAndReach(sexo, sitReach)?.etiqueta ?? null} />
        </div>
      )}

      {tab === "historial" && <HistorialView data={historial} />}

      {tab === "ficha" && (
        <div className="gp-body">
          <p className="gp-note">Resumen de rendimiento capturado (puntajes 0–100 normalizados).</p>
          <div className="gp-resume">
            {perfil.map((m, i) => {
              const has = m.score != null;
              return (
                <div key={i} className="gp-rrow">
                  <span className="gp-rcap">{m.cap}</span>
                  <span className="gp-rraw">{has ? m.raw : "Sin dato"}</span>
                  <span className={"gp-rscore" + (has ? "" : " empty")}>{has ? `${m.score}/100` : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const css = `
.gp{--surface:#101519;--ink:#f4f6f8;--ink2:#a8b0b8;--muted:#6b7480;--accent:#22b06a;--glow:#3ddc84;--border:rgba(255,255,255,.08);
  background:radial-gradient(700px 400px at 80% -10%,rgba(34,176,106,.10),transparent 60%),#0b0e11;
  border-radius:18px;padding:16px 18px 20px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);}
.gp-tabs{display:inline-flex;gap:4px;background:#0b0e11;border:1px solid var(--border);border-radius:11px;padding:4px;margin-bottom:14px;}
.gp-tab{background:transparent;border:none;color:var(--ink2);font-size:13px;font-weight:700;padding:8px 18px;border-radius:8px;cursor:pointer;}
.gp-tab:hover{color:var(--ink);}
.gp-tab.active{background:var(--accent);color:#062012;}
.gp-tab:focus-visible{outline:2px solid var(--glow);outline-offset:2px;}
.gp-body{padding:2px;}
.gp-note{font-size:12px;color:var(--muted);margin:0 0 16px;max-width:640px;}
/* Scale bar */
.sb{margin-bottom:22px;}
.sb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:10px;}
.sb-title{font-size:13px;font-weight:700;color:var(--ink);}
.sb-badge{font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;white-space:nowrap;}
.sb-badge.empty{background:#1b2229;color:var(--muted);}
.sb-track{position:relative;display:flex;height:26px;border-radius:7px;overflow:hidden;border:1px solid var(--border);}
.sb-seg{position:relative;display:flex;align-items:center;justify-content:center;min-width:0;}
.sb-seg-lbl{font-size:10px;font-weight:700;color:rgba(0,0,0,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 4px;}
.sb-marker{position:absolute;top:-6px;bottom:-6px;width:3px;background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.55),0 0 8px rgba(255,255,255,.6);transform:translateX(-50%);border-radius:2px;}
.sb-marker-val{position:absolute;top:-20px;left:50%;transform:translateX(-50%);background:#fff;color:#0b0e11;font-size:10px;font-weight:800;padding:1px 6px;border-radius:5px;white-space:nowrap;}
.sb-ticks{display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:9px;font-variant-numeric:tabular-nums;}
/* Ficha resume */
.gp-resume{display:flex;flex-direction:column;gap:2px;}
.gp-rrow{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;padding:11px 4px;border-bottom:1px solid var(--border);}
.gp-rcap{font-size:13.5px;font-weight:600;}
.gp-rraw{font-size:12px;color:var(--muted);}
.gp-rscore{font-size:14px;font-weight:800;color:var(--glow);min-width:60px;text-align:right;font-variant-numeric:tabular-nums;}
.gp-rscore.empty{color:var(--muted);}
/* Historial */
.gp-h-top{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:16px;}
.gp-h-cmp{display:flex;align-items:center;gap:8px;}
.gp-h-cmp select{background:#0b0e11;color:var(--ink);border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:13px;font-weight:600;cursor:pointer;}
.gp-h-vs{color:var(--muted);font-size:12px;font-weight:700;}
.gp-h-table{width:100%;border-collapse:collapse;font-size:13px;color:var(--ink);margin-bottom:20px;}
.gp-h-table th,.gp-h-table td{text-align:right;padding:9px 10px;border-bottom:1px solid var(--border);font-variant-numeric:tabular-nums;}
.gp-h-table th:first-child,.gp-h-table td:first-child{text-align:left;}
.gp-h-table thead th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.6px;}
.gp-h-table .up{color:var(--glow);font-weight:700;}.gp-h-table .down{color:#e66767;font-weight:700;}
.gp-h-trends{display:flex;flex-direction:column;gap:4px;}
.gp-h-trow{display:grid;grid-template-columns:1fr 190px auto;gap:14px;align-items:center;padding:10px 4px;border-bottom:1px solid var(--border);}
.gp-h-tlabel{display:flex;flex-direction:column;gap:2px;}
.gp-h-tlabel .cap{font-size:13.5px;font-weight:600;}
.gp-h-tlabel .chg{font-size:11px;font-weight:700;}
.gp-h-tlabel .chg.up{color:var(--glow);}.gp-h-tlabel .chg.down{color:#e66767;}
.spark{width:190px;height:42px;}
.spark-area{fill:rgba(34,176,106,.14);}
.spark-line{fill:none;stroke:var(--accent);stroke-width:2;stroke-linejoin:round;stroke-linecap:round;}
.spark-pt{fill:var(--accent);}
.spark-dot{fill:var(--glow);stroke:#0b0e11;stroke-width:1.5;}
.gp-h-now{font-size:18px;font-weight:800;color:var(--glow);min-width:56px;text-align:right;font-variant-numeric:tabular-nums;}
@media(max-width:640px){.gp-h-trow{grid-template-columns:1fr auto;}.gp-h-trow .spark{grid-column:1/-1;width:100%;}}
`;
