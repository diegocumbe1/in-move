"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/Badge";
import {
  saveValoracion, getByDocumento, toSnapshot, nuevoId,
  type ValoracionGuardada,
} from "@/lib/store";
import { fechaCorta, type Snapshot } from "@/lib/historial";
import {
  Sexo,
  clasificarGrasa,
  clasificarFcReposo,
  clasificarSitAndReach,
  asimetria,
  edadDesde,
  edadDecimal,
  edadBiologica,
  scoreFuerza,
  scoreSalto,
  scoreResistencia,
  scoreVelocidad,
  kmhDesde10m,
} from "@/lib/escalas";
import { type Cap } from "@/components/RadarPerfil";
import { GraficasPanel } from "@/components/GraficasPanel";

// helper: convierte texto de input a número o null
const n = (s: string): number | null => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export default function FichaPage() {
  const [sexo, setSexo] = useState<Sexo>("M");
  const [fechaNac, setFechaNac] = useState("2011-04-29");
  const [nombre, setNombre] = useState("Daniel Peña");
  const [documento, setDocumento] = useState("1114572691");
  const [fechaValoracion, setFechaValoracion] = useState(new Date().toISOString().slice(0, 10));
  const [observaciones, setObservaciones] = useState("");
  const [historial, setHistorial] = useState<Snapshot[]>([]);
  const [savedMsg, setSavedMsg] = useState("");
  const [estatura, setEstatura] = useState("");
  const [grasa, setGrasa] = useState("");
  const [fcReposo, setFcReposo] = useState("");
  const [sitReach, setSitReach] = useState("");

  // ROM (izq/der)
  const [hombroFlexIzq, setHombroFlexIzq] = useState("");
  const [hombroFlexDer, setHombroFlexDer] = useState("");
  const [caderaIzq, setCaderaIzq] = useState("");
  const [caderaDer, setCaderaDer] = useState("");

  // Rendimiento (alimenta el radar en vivo)
  const [cmj, setCmj] = useState("");
  const [vel10, setVel10] = useState("");
  const [sent1rm, setSent1rm] = useState("");
  const [vo2, setVo2] = useState("");

  const edad = edadDesde(fechaNac);
  const bio = edadBiologica(sexo, edadDecimal(fechaNac), n(estatura));

  const kmh = kmhDesde10m(n(vel10));
  const perfil: Cap[] = [
    { cap: "Fuerza máxima", score: scoreFuerza(n(sent1rm)), team: 70, raw: n(sent1rm) != null ? `${n(sent1rm)} kg` : "", detail: "Sentadilla 1RM" },
    { cap: "Velocidad punta", score: scoreVelocidad(n(vel10)), team: 68, raw: kmh != null ? `${kmh.toFixed(1)} km/h` : "", detail: "Sprint 10 m" },
    { cap: "Resistencia", score: scoreResistencia(n(vo2)), team: 66, raw: n(vo2) != null ? `${n(vo2)} ml/kg` : "", detail: "VO₂máx" },
    { cap: "Altura de salto", score: scoreSalto(n(cmj)), team: 61, raw: n(cmj) != null ? `${n(cmj)} cm` : "", detail: "CMJ" },
  ];

  // Prefill desde el histórico (?doc=&nombre=&sexo=&nac=)
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("doc")) setDocumento(q.get("doc")!);
    if (q.get("nombre")) setNombre(q.get("nombre")!);
    if (q.get("sexo") === "M" || q.get("sexo") === "F") setSexo(q.get("sexo") as Sexo);
    if (q.get("nac")) setFechaNac(q.get("nac")!);
  }, []);

  // Cargar historial guardado de este deportista
  useEffect(() => {
    setHistorial(getByDocumento(documento).map(toSnapshot));
  }, [documento]);

  function guardarValoracion() {
    if (!documento.trim()) { setSavedMsg("Falta el documento de identidad."); return; }
    const v: ValoracionGuardada = {
      id: nuevoId(), documento: documento.trim(), nombre, sexo, fechaNac, fecha: fechaValoracion,
      estatura: n(estatura), grasa: n(grasa), fcReposo: n(fcReposo), sitReach: n(sitReach),
      cmj: n(cmj), vel10: n(vel10), sent1rm: n(sent1rm), vo2: n(vo2), observaciones,
    };
    saveValoracion(v);
    const nuevo = getByDocumento(documento).map(toSnapshot);
    setHistorial(nuevo);
    setSavedMsg(`✅ Guardada (${fechaCorta(fechaValoracion)}) · ${nuevo.length} valoración(es) de este deportista.`);
    setTimeout(() => setSavedMsg(""), 6000);
  }

  return (
    <>
      <header className="topbar">
        <div className="logo">IN<br />MOVE</div>
        <div>
          <h1>Ficha de Valoración</h1>
          <div className="sub">In Move · Centro de Rendimiento</div>
        </div>
        <div className="spacer" />
        <Link href="/historico" className="pill" style={{ textDecoration: "none", color: "#fff", marginRight: 8 }}>📈 Histórico</Link>
        <Link href="/ajustes" className="pill" style={{ textDecoration: "none", color: "#fff", marginRight: 8 }}>⚙️ Ajustes</Link>
        <Link href="/perfil" className="pill" style={{ textDecoration: "none", color: "#fff" }}>📊 Perfil</Link>
      </header>

      <main className="app">
        {/* DATOS DEL DEPORTISTA */}
        <section className="card">
          <h2>Datos del deportista</h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div style={{ width: 120 }}>
              <div className="foto">📷<br />Foto</div>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="grid">
                <div className="field">
                  <label>Nombre del deportista</label>
                  <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Daniel Peña" />
                </div>
                <div className="field">
                  <label>Documento de identidad</label>
                  <input value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="1114572691" />
                </div>
                <div className="field">
                  <label>Fecha de nacimiento</label>
                  <input type="date" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} />
                </div>
                <div className="field">
                  <label>Edad (automática)</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <input value={edad != null ? `${edad} años` : ""} readOnly />
                      <span className="subnote">Cronológica</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        className="bio"
                        readOnly
                        value={bio != null ? `${bio.toFixed(1)} años` : "—"}
                        title="Edad biológica estimada por maduración (Moore). Requiere estatura."
                      />
                      <span className="subnote">Biológica (est.){bio == null ? " · falta estatura" : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="field">
                  <label>Sexo (afecta las escalas)</label>
                  <select value={sexo} onChange={(e) => setSexo(e.target.value as Sexo)}>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="field">
                  <label>Fecha de valoración</label>
                  <input type="date" value={fechaValoracion} onChange={(e) => setFechaValoracion(e.target.value)} />
                </div>
                <div className="field">
                  <label>Código de acceso (generado)</label>
                  <div className="input-row">
                    <span className="codigo">48 27 61 05</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ANTROPOMETRÍA */}
        <section className="card">
          <h2>Indicadores antropométricos</h2>
          <div className="grid-3">
            <div className="field">
              <label>Peso (kg)</label>
              <input inputMode="decimal" placeholder="57.4" />
            </div>
            <div className="field">
              <label>Estatura (cm)</label>
              <input inputMode="decimal" value={estatura} onChange={(e) => setEstatura(e.target.value)} placeholder="162" />
            </div>
            <div className="field">
              <label>% Grasa corporal</label>
              <div className="input-row">
                <input inputMode="decimal" value={grasa} onChange={(e) => setGrasa(e.target.value)} placeholder="ej. 12" />
                <Badge c={clasificarGrasa(sexo, n(grasa))} />
              </div>
            </div>
          </div>
          <p className="hint">Escribe un valor de % grasa y cambia el sexo: la clasificación se ajusta sola.</p>
        </section>

        {/* CARDIOVASCULAR */}
        <section className="card">
          <h2>Control cardiovascular</h2>
          <div className="grid-3">
            <div className="field">
              <label>FC en reposo (ppm)</label>
              <div className="input-row">
                <input inputMode="numeric" value={fcReposo} onChange={(e) => setFcReposo(e.target.value)} placeholder="ej. 58" />
                <Badge c={clasificarFcReposo(n(fcReposo))} />
              </div>
            </div>
            <div className="field">
              <label>FC inicial (ppm)</label>
              <input inputMode="numeric" placeholder="normal 60–90" />
            </div>
            <div className="field">
              <label>FC final (ppm)</label>
              <input inputMode="numeric" placeholder="según intensidad" />
            </div>
          </div>
        </section>

        {/* ROM */}
        <section className="card">
          <h2>Movilidad y flexibilidad (ROM) — grados</h2>
          <div className="rom-row">
            <span className="art">Columna</span>
            <div><span className="rom-lbl">Flexión</span><input className="mini-input" placeholder="76" /></div>
            <div><span className="rom-lbl">Extensión</span><input className="mini-input" placeholder="38" /></div>
            <span />
          </div>
          <div className="rom-row">
            <span className="art">Cadera · Flexión</span>
            <div>
              <span className="rom-lbl">Izquierda</span>
              <input className="mini-input" value={caderaIzq} onChange={(e) => setCaderaIzq(e.target.value)} placeholder="110" />
            </div>
            <div>
              <span className="rom-lbl">Derecha</span>
              <input className="mini-input" value={caderaDer} onChange={(e) => setCaderaDer(e.target.value)} placeholder="120" />
            </div>
            <Badge c={asimetria(n(caderaIzq), n(caderaDer))} />
          </div>
          <div className="rom-row">
            <span className="art">Hombro · Flexión</span>
            <div>
              <span className="rom-lbl">Izquierda</span>
              <input className="mini-input" value={hombroFlexIzq} onChange={(e) => setHombroFlexIzq(e.target.value)} placeholder="159" />
            </div>
            <div>
              <span className="rom-lbl">Derecha</span>
              <input className="mini-input" value={hombroFlexDer} onChange={(e) => setHombroFlexDer(e.target.value)} placeholder="154" />
            </div>
            <Badge c={asimetria(n(hombroFlexIzq), n(hombroFlexDer))} />
          </div>
          <p className="hint">La comparación izquierda–derecha detecta asimetrías automáticamente (antes era texto suelto en Excel).</p>
        </section>

        {/* NEUROMUSCULAR + RENDIMIENTO */}
        <section className="card">
          <h2>Flexibilidad y rendimiento</h2>
          <div className="grid-3">
            <div className="field">
              <label>Sit and Reach (cm)</label>
              <div className="input-row">
                <input inputMode="decimal" value={sitReach} onChange={(e) => setSitReach(e.target.value)} placeholder="ej. 30" />
                <Badge c={clasificarSitAndReach(sexo, n(sitReach))} />
              </div>
            </div>
            <div className="field">
              <label>Salto CMJ (cm)</label>
              <input inputMode="decimal" value={cmj} onChange={(e) => setCmj(e.target.value)} placeholder="ej. 42" />
            </div>
            <div className="field">
              <label>Velocidad 10 m (s)</label>
              <input inputMode="decimal" value={vel10} onChange={(e) => setVel10(e.target.value)} placeholder="ej. 1.9" />
            </div>
            <div className="field">
              <label>Sentadilla 1RM (kg)</label>
              <input inputMode="decimal" value={sent1rm} onChange={(e) => setSent1rm(e.target.value)} placeholder="ej. 95" />
            </div>
            <div className="field">
              <label>Resistencia · VO₂máx (ml/kg)</label>
              <input inputMode="decimal" value={vo2} onChange={(e) => setVo2(e.target.value)} placeholder="ej. 52" />
            </div>
          </div>
        </section>

        {/* GRÁFICAS: Radar · Escalas · Ficha (en vivo) */}
        <section className="card" style={{ padding: 0, overflow: "hidden", border: "none", background: "transparent" }}>
          <GraficasPanel
            perfil={perfil}
            sexo={sexo}
            grasa={n(grasa)}
            fcReposo={n(fcReposo)}
            sitReach={n(sitReach)}
            historial={historial.length ? historial : undefined}
          />
        </section>

        {/* OBSERVACIONES */}
        <section className="card">
          <h2>Observaciones y plan</h2>
          <div className="field">
            <label>Observaciones generales</label>
            <textarea rows={3} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} placeholder="Notas de la valoración…" />
          </div>
        </section>

        <div className="actions">
          <button className="btn btn-primary" onClick={guardarValoracion}>💾 Guardar valoración</button>
          <button className="btn btn-ghost">📄 Generar PDF</button>
          <button className="btn btn-ghost">🔗 Copiar enlace</button>
          {savedMsg && <span className="saved-msg">{savedMsg}</span>}
        </div>
        <p className="hint">
          Preview del corte M1. Los badges de color usan las escalas por defecto (editables desde settings en M3).
        </p>
      </main>
    </>
  );
}
