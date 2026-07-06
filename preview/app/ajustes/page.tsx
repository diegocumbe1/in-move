"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Config, DEFAULT_CONFIG, METODOS_MADURACION, loadConfig, saveConfig } from "@/lib/config";

const clone = (c: Config): Config => JSON.parse(JSON.stringify(c));
const get = (obj: any, path: string[]) => path.reduce((o, k) => o[k], obj);

export default function AjustesPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  const [msg, setMsg] = useState("");

  useEffect(() => setCfg(loadConfig()), []);

  const upd = (path: string[], val: number | string) =>
    setCfg((prev) => {
      const c = clone(prev);
      let o: any = c;
      for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
      o[path[path.length - 1]] = val;
      return c;
    });

  // Campo numérico reutilizable
  const Num = ({ label, unit, path, step = 1 }: { label: React.ReactNode; unit?: string; path: string[]; step?: number }) => (
    <div className="field">
      <label>{label}{unit ? ` (${unit})` : ""}</label>
      <input type="number" step={step} value={get(cfg, path)}
        onChange={(e) => upd(path, e.target.value === "" ? 0 : Number(e.target.value))} />
    </div>
  );

  const guardar = () => { saveConfig(cfg); setMsg("✅ Configuración guardada."); setTimeout(() => setMsg(""), 5000); };
  const restaurar = () => { setCfg(clone(DEFAULT_CONFIG)); setMsg("↩︎ Valores por defecto restaurados (recuerda guardar)."); setTimeout(() => setMsg(""), 5000); };

  return (
    <>
      <header className="topbar">
        <div className="logo">IN<br />MOVE</div>
        <div>
          <h1>Ajustes · Variables del centro</h1>
          <div className="sub">Escalas, rangos y referencias editables por el administrador</div>
        </div>
        <div className="spacer" />
        <Link href="/" className="pill" style={{ textDecoration: "none", color: "#fff" }}>← Volver a la ficha</Link>
      </header>

      <main className="app">
        <div className="banner">
          Estas son <b>todas las variables</b> que hoy usa la plataforma, organizadas por categoría con su valor por defecto.
          El admin las ajusta sin depender del desarrollador. <i>(En este preview los cambios se guardan localmente; conectar a los cálculos es el siguiente paso.)</i>
        </div>

        {/* 1. NORMALIZACIÓN */}
        <section className="card">
          <h2>Normalización de rendimiento (radar 0–100)</h2>
          <p className="hint">Convierte cada medida real en un puntaje 0–100 para el radar. Define el valor que vale 0 y el que vale 100.</p>
          <div className="set-group"><span className="set-sub">Fuerza máxima · Sentadilla 1RM</span>
            <div className="grid"><Num label="Mínimo (0 pts)" unit="kg" path={["normalizacion", "fuerza", "min"]} /><Num label="Máximo (100 pts)" unit="kg" path={["normalizacion", "fuerza", "max"]} /></div>
          </div>
          <div className="set-group"><span className="set-sub">Velocidad punta · 10 m</span>
            <div className="grid"><Num label="Tiempo lento (0 pts)" unit="s" step={0.1} path={["normalizacion", "velocidad", "lento"]} /><Num label="Tiempo rápido (100 pts)" unit="s" step={0.1} path={["normalizacion", "velocidad", "rapido"]} /></div>
          </div>
          <div className="set-group"><span className="set-sub">Resistencia · VO₂máx</span>
            <div className="grid"><Num label="Mínimo (0 pts)" unit="ml/kg" path={["normalizacion", "resistencia", "min"]} /><Num label="Máximo (100 pts)" unit="ml/kg" path={["normalizacion", "resistencia", "max"]} /></div>
          </div>
          <div className="set-group"><span className="set-sub">Altura de salto · CMJ</span>
            <div className="grid"><Num label="Mínimo (0 pts)" unit="cm" path={["normalizacion", "salto", "min"]} /><Num label="Máximo (100 pts)" unit="cm" path={["normalizacion", "salto", "max"]} /></div>
          </div>
        </section>

        {/* 2. EQUIPO */}
        <section className="card">
          <h2>Promedio del equipo (referencia del radar)</h2>
          <p className="hint">La línea gris de comparación en el radar. Puntajes 0–100.</p>
          <div className="grid-3">
            <Num label="Fuerza" path={["equipo", "fuerza"]} />
            <Num label="Velocidad" path={["equipo", "velocidad"]} />
            <Num label="Resistencia" path={["equipo", "resistencia"]} />
            <Num label="Salto" path={["equipo", "salto"]} />
          </div>
        </section>

        {/* 3. % GRASA */}
        <section className="card">
          <h2>Escala · % Grasa corporal</h2>
          <p className="hint">Umbral superior de cada categoría (por encima del último = "Exceso"). Difiere por sexo.</p>
          <div className="set-group"><span className="set-sub">Hombres</span>
            <div className="grid-3">
              <Num label={chip("azul", "Esencial ≤")} path={["grasa", "hombres", "esencial"]} />
              <Num label={chip("verde", "Atleta ≤")} path={["grasa", "hombres", "atleta"]} />
              <Num label={chip("verde", "Saludable ≤")} path={["grasa", "hombres", "saludable"]} />
              <Num label={chip("amarillo", "Aceptable ≤")} path={["grasa", "hombres", "aceptable"]} />
            </div>
          </div>
          <div className="set-group"><span className="set-sub">Mujeres</span>
            <div className="grid-3">
              <Num label={chip("azul", "Esencial ≤")} path={["grasa", "mujeres", "esencial"]} />
              <Num label={chip("verde", "Atleta ≤")} path={["grasa", "mujeres", "atleta"]} />
              <Num label={chip("verde", "Saludable ≤")} path={["grasa", "mujeres", "saludable"]} />
              <Num label={chip("amarillo", "Aceptable ≤")} path={["grasa", "mujeres", "aceptable"]} />
            </div>
          </div>
        </section>

        {/* 4. FC REPOSO */}
        <section className="card">
          <h2>Escala · FC en reposo (ppm)</h2>
          <p className="hint">Umbrales de clasificación cardiovascular en reposo.</p>
          <div className="grid-3">
            <Num label={chip("azul", "Atleta <")} path={["fcReposo", "atleta"]} />
            <Num label={chip("verde", "Buena ≤")} path={["fcReposo", "buena"]} />
            <Num label={chip("amarillo", "Normal ≤")} path={["fcReposo", "normal"]} />
          </div>
          <p className="hint">Por encima de "Normal" = 🔴 Baja condición.</p>
        </section>

        {/* 5. SIT AND REACH */}
        <section className="card">
          <h2>Escala · Sit and Reach (cm)</h2>
          <p className="hint">Flexibilidad. Umbral superior de cada categoría, por sexo.</p>
          <div className="set-group"><span className="set-sub">Hombres</span>
            <div className="grid-3">
              <Num label={chip("rojo", "Bajo <")} path={["sitReach", "hombres", "bajo"]} />
              <Num label={chip("amarillo", "Promedio ≤")} path={["sitReach", "hombres", "promedio"]} />
              <Num label={chip("verde", "Bueno ≤")} path={["sitReach", "hombres", "bueno"]} />
            </div>
          </div>
          <div className="set-group"><span className="set-sub">Mujeres</span>
            <div className="grid-3">
              <Num label={chip("rojo", "Bajo <")} path={["sitReach", "mujeres", "bajo"]} />
              <Num label={chip("amarillo", "Promedio ≤")} path={["sitReach", "mujeres", "promedio"]} />
              <Num label={chip("verde", "Bueno ≤")} path={["sitReach", "mujeres", "bueno"]} />
            </div>
          </div>
        </section>

        {/* 6. MADURACIÓN */}
        <section className="card">
          <h2>Maduración · Edad biológica</h2>
          <p className="hint">Método de estimación y edad media de pico de velocidad de crecimiento (PHV) por sexo.</p>
          <div className="grid-3">
            <div className="field">
              <label>Método</label>
              <select value={cfg.maduracion.metodo} onChange={(e) => upd(["maduracion", "metodo"], e.target.value)}>
                {METODOS_MADURACION.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <Num label="PHV Hombres" unit="años" step={0.1} path={["maduracion", "phvHombres"]} />
            <Num label="PHV Mujeres" unit="años" step={0.1} path={["maduracion", "phvMujeres"]} />
          </div>
        </section>

        {/* 7. ROM + GENERAL */}
        <section className="card">
          <h2>Movilidad y general</h2>
          <div className="grid-3">
            <Num label="Umbral de asimetría ROM" unit="%" path={["rom", "umbralAsimetria"]} />
            <Num label="Longitud del código de acceso" unit="dígitos" path={["general", "longitudCodigo"]} />
          </div>
          <p className="hint">Asimetría izq–der por encima del umbral se marca en amarillo. El código de acceso del deportista.</p>
        </section>

        <div className="actions">
          <button className="btn btn-primary" onClick={guardar}>💾 Guardar configuración</button>
          <button className="btn btn-ghost" onClick={restaurar}>↩︎ Restaurar por defecto</button>
          {msg && <span className="saved-msg">{msg}</span>}
        </div>
      </main>
    </>
  );
}

// Etiqueta con chip de color de la categoría
function chip(nivel: string, text: string) {
  return (
    <span className="chip-lbl"><i className={`chip-dot ${nivel}`} />{text}</span>
  );
}
