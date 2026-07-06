"use client";

import { useState } from "react";

export type Cap = {
  cap: string;
  score: number | null; // null = aún no capturado
  team: number;
  raw: string;
  detail: string;
};

export const DEMO_PERFIL: Cap[] = [
  { cap: "Fuerza máxima", score: 82, team: 70, raw: "95 kg", detail: "Sentadilla 1RM" },
  { cap: "Velocidad punta", score: 74, team: 68, raw: "27.4 km/h", detail: "Sprint 10 m" },
  { cap: "Resistencia", score: 63, team: 66, raw: "52 ml/kg", detail: "VO₂máx" },
  { cap: "Altura de salto", score: 78, team: 61, raw: "42 cm", detail: "CMJ" },
];

const cx = 220, cy = 212, R = 150;
const angles = [-90, 0, 90, 180].map((d) => (d * Math.PI) / 180);
const pt = (i: number, v: number): [number, number] => {
  const r = (R * v) / 100;
  return [cx + r * Math.cos(angles[i]), cy + r * Math.sin(angles[i])];
};

const anchors = ["middle", "start", "middle", "end"] as const;
const offs: [number, number][] = [[0, -20], [16, 0], [0, 26], [-16, 0]];

export function RadarPerfil({ data = DEMO_PERFIL }: { data?: Cap[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const polyOf = (key: "score" | "team") =>
    data.map((m, i) => pt(i, (m[key] ?? 0) as number).join(",")).join(" ");

  return (
    <div className="rp">
      <style>{css}</style>

      <div className="rp-head">
        <span className="rp-eyebrow">Perfil de rendimiento · en vivo</span>
        <div className="rp-legend">
          <span className="rp-lg"><i className="sw athlete" />Atleta</span>
          <span className="rp-lg"><i className="sw ref" />Prom. equipo</span>
        </div>
      </div>

      <div className="rp-board">
        {/* RADAR */}
        <div className="rp-card">
          <svg viewBox="0 0 440 452" role="img" aria-label="Radar del perfil físico del atleta.">
            <defs>
              <filter id="rpglow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {[25, 50, 75, 100].map((lvl) => (
              <polygon key={lvl} className={"ring" + (lvl === 100 ? " outer" : "")}
                points={data.map((_, i) => pt(i, lvl).join(",")).join(" ")} />
            ))}
            {data.map((_, i) => {
              const [x, y] = pt(i, 100);
              return <line key={i} className="axis-line" x1={cx} y1={cy} x2={x} y2={y} />;
            })}
            {[25, 50, 75, 100].map((lvl) => {
              const [x, y] = pt(0, lvl);
              return <text key={lvl} className="tick" x={x + 6} y={y + 3}>{lvl}</text>;
            })}

            <polygon className="poly-ref" points={polyOf("team")} />
            <polygon className="poly-athlete" points={polyOf("score")} />

            {data.map((m, i) => {
              if (m.score == null) return null;
              const [x, y] = pt(i, m.score);
              return (
                <g key={i}>
                  <circle className="vtx" cx={x} cy={y} r={4.5} />
                  <circle cx={x} cy={y} r={18} fill="transparent" style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
                </g>
              );
            })}

            {data.map((m, i) => {
              const [x, y] = pt(i, 100);
              const [ox, oy] = offs[i];
              return (
                <g key={i}>
                  <text className="axis-label" x={x + ox} y={y + oy} textAnchor={anchors[i]}>{m.cap}</text>
                  <text className="axis-sub" x={x + ox} y={y + oy + 14} textAnchor={anchors[i]}>
                    {m.score == null ? "—" : `${m.score} /100`}
                  </text>
                </g>
              );
            })}

            {hover !== null && data[hover].score != null && (() => {
              const m = data[hover];
              const [x, y] = pt(hover, m.score as number);
              const d = (m.score as number) - m.team, up = d >= 0;
              const w = 158, h = 52;
              const tx = Math.min(Math.max(x - w / 2, 4), 440 - w - 4);
              const ty = y - h - 14 < 4 ? y + 14 : y - h - 14;
              return (
                <g pointerEvents="none">
                  <rect className="tip-box" x={tx} y={ty} width={w} height={h} rx={9} />
                  <text className="tip-cap" x={tx + 12} y={ty + 18}>{m.cap}</text>
                  <text className="tip-row" x={tx + 12} y={ty + 34}>Atleta {m.score} · {m.raw}</text>
                  <text className="tip-row" x={tx + 12} y={ty + 47}>
                    Δ <tspan fill={up ? "#3ddc84" : "#e66767"}>{up ? "+" : ""}{d}</tspan> vs equipo
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>

        {/* TILES */}
        <div className="rp-card">
          <div className="rp-tiles">
            {data.map((m, i) => {
              const has = m.score != null;
              const d = has ? (m.score as number) - m.team : 0, up = d >= 0;
              return (
                <div key={i} className={"tile" + (hover === i ? " hot" : "") + (has ? "" : " empty")}
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                  <div className="cap">{m.cap}</div>
                  <div className="val">{has ? m.score : "—"}<small> /100</small></div>
                  <div className="raw">{has ? `${m.raw} · ${m.detail}` : `Sin dato · ${m.detail}`}</div>
                  {has && (
                    <div className={"delta " + (up ? "up" : "down")}>{up ? "▲" : "▼"} {up ? "+" : ""}{d} vs equipo</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rp-foot">
        <p className="rp-note">Los ejes se calculan en vivo desde los campos de rendimiento de la ficha (1RM, sprint 10 m, VO₂máx, CMJ), normalizados a 0–100. Escribe valores arriba y observa el radar.</p>
        <button className="rp-tbtn" aria-expanded={showTable} onClick={() => setShowTable((s) => !s)}>
          {showTable ? "Ocultar tabla" : "Ver tabla"}
        </button>
      </div>

      {showTable && (
        <table className="rp-data">
          <thead><tr><th>Capacidad</th><th>Medida</th><th>Atleta</th><th>Equipo</th><th>Δ</th></tr></thead>
          <tbody>
            {data.map((m, i) => {
              const has = m.score != null;
              const d = has ? (m.score as number) - m.team : 0, up = d >= 0;
              return (
                <tr key={i}>
                  <td>{m.cap}</td><td>{has ? m.raw : "—"}</td><td>{has ? m.score : "—"}</td><td>{m.team}</td>
                  <td className={has ? (up ? "up" : "down") : ""}>{has ? `${up ? "+" : ""}${d}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

const css = `
.rp{--surface:#101519;--ink:#f4f6f8;--ink2:#a8b0b8;--muted:#6b7480;--accent:#22b06a;--glow:#3ddc84;
  --accent-fill:rgba(34,176,106,.20);--ref:#8b939e;--ref-fill:rgba(139,147,158,.08);--up:#3ddc84;--down:#e66767;
  --border:rgba(255,255,255,.08);
  background:radial-gradient(700px 400px at 80% -10%,rgba(34,176,106,.12),transparent 60%),#0b0e11;
  color:var(--ink);border-radius:18px;padding:20px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}
.rp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
.rp-eyebrow{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--glow);font-weight:700;}
.rp-legend{display:flex;gap:16px;}
.rp-lg{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--ink2);font-weight:600;}
.rp .sw{width:20px;height:3px;border-radius:2px;}
.rp .sw.athlete{background:var(--accent);box-shadow:0 0 8px var(--glow);}
.rp .sw.ref{background:var(--ref);}
.rp-board{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;}
@media(max-width:760px){.rp-board{grid-template-columns:1fr;}}
.rp-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;}
.rp svg{display:block;width:100%;height:auto;overflow:visible;}
.rp .ring{fill:none;stroke:rgba(255,255,255,.09);stroke-width:1;}
.rp .ring.outer{stroke:rgba(255,255,255,.16);}
.rp .axis-line{stroke:#202830;stroke-width:1;}
.rp .tick{fill:var(--muted);font-size:9px;}
.rp .axis-label{fill:var(--ink);font-size:12.5px;font-weight:700;}
.rp .axis-sub{fill:var(--muted);font-size:10.5px;}
.rp .poly-ref{fill:var(--ref-fill);stroke:var(--ref);stroke-width:1.6;stroke-dasharray:4 4;}
.rp .poly-athlete{fill:var(--accent-fill);stroke:var(--accent);stroke-width:2.4;filter:url(#rpglow);transition:all .35s ease;}
.rp .vtx{fill:var(--glow);stroke:var(--surface);stroke-width:2;}
.rp .tip-box{fill:#05070a;stroke:var(--border);}
.rp .tip-cap{fill:var(--glow);font-size:12px;font-weight:700;}
.rp .tip-row{fill:var(--ink2);font-size:11px;}
.rp-tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.rp .tile{border:1px solid var(--border);border-radius:12px;padding:13px 14px;transition:border-color .15s,transform .15s;
  background:linear-gradient(180deg,rgba(255,255,255,.02),transparent);}
.rp .tile.hot{border-color:var(--accent);transform:translateY(-2px);}
.rp .tile.empty{opacity:.55;}
.rp .tile .cap{font-size:11px;color:var(--ink2);font-weight:600;display:flex;align-items:center;gap:6px;}
.rp .tile .cap::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--accent);}
.rp .tile .val{font-size:30px;font-weight:800;letter-spacing:-1px;margin-top:6px;line-height:1;}
.rp .tile .val small{font-size:13px;font-weight:600;color:var(--muted);}
.rp .tile .raw{font-size:11.5px;color:var(--muted);margin-top:4px;}
.rp .delta{font-size:12px;font-weight:700;margin-top:8px;}
.rp .delta.up{color:var(--up);}.rp .delta.down{color:var(--down);}
.rp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;flex-wrap:wrap;}
.rp-note{font-size:11.5px;color:var(--muted);max-width:560px;margin:0;}
.rp-tbtn{background:var(--surface);color:var(--ink2);border:1px solid var(--border);border-radius:9px;
  padding:8px 13px;font-size:12px;font-weight:600;cursor:pointer;}
.rp-tbtn:hover{color:var(--ink);border-color:var(--accent);}
.rp-data{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px;color:var(--ink);}
.rp-data th,.rp-data td{text-align:right;padding:9px 10px;border-bottom:1px solid var(--border);}
.rp-data th:first-child,.rp-data td:first-child{text-align:left;}
.rp-data thead th{color:var(--muted);font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.6px;}
.rp-data .up{color:var(--up);}.rp-data .down{color:var(--down);}
`;
