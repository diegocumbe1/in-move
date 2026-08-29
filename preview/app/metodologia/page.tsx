"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Config, DEFAULT_CONFIG, loadConfig } from "@/lib/config";
import {
  MOORE,
  MADURACION_EDAD_VALIDA,
  edadBiologica,
  maturityOffset,
  type Sexo,
} from "@/lib/escalas";

/** Caso que se sigue paso a paso a lo largo de la explicación. */
const CASO = { nombre: "Mateo", sexo: "M" as Sexo, edad: 13.0, estatura: 156 };

/** Mismos años, distinta estatura: muestra la dispersión madurativa real. */
const COMPARATIVA: { nombre: string; sexo: Sexo; edad: number; estatura: number }[] = [
  { nombre: "Andrés", sexo: "M", edad: 13.0, estatura: 143 },
  { nombre: "Mateo", sexo: "M", edad: 13.0, estatura: 156 },
  { nombre: "Samuel", sexo: "M", edad: 13.0, estatura: 178 },
];

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(2);
// Espacio fino como separador: dentro de una fórmula un punto se leería como decimal.
const miles = (v: number) => v.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Signo menos tipográfico (U+2212), para que no se mezcle con el guion corto. */
const m = (v: number) => String(v).replace("-", "−");

/** Clasifica la distancia entre edad biológica y cronológica. */
function lectura(dif: number) {
  if (dif > 1) return { cls: "adelante", arrow: "↑", txt: "Adelantado" };
  if (dif < -1) return { cls: "detras", arrow: "↓", txt: "Va detrás" };
  return { cls: "en-tiempo", arrow: "=", txt: "En tiempo" };
}

export default function MetodologiaPage() {
  const [cfg, setCfg] = useState<Config>(DEFAULT_CONFIG);
  useEffect(() => setCfg(loadConfig()), []);

  // El ejemplo se calcula con las mismas funciones que usa la ficha:
  // si el cálculo cambia, esta página cambia con él.
  const AH = CASO.edad * CASO.estatura;
  const offset = maturityOffset(CASO.sexo, CASO.edad, CASO.estatura)!;
  const bio = edadBiologica(CASO.sexo, CASO.edad, CASO.estatura)!;
  const dif = bio - CASO.edad;
  const lec = lectura(dif);

  const configDistinta = cfg.maduracion.metodo !== "Moore (estatura)";

  return (
    <>
      <header className="topbar">
        <div className="logo">IN<br />MOVE</div>
        <div>
          <h1>Metodología de cálculo</h1>
          <div className="sub">Cómo la plataforma obtiene cada indicador</div>
        </div>
        <div className="spacer" />
        <Link href="/" className="pill" style={{ textDecoration: "none", color: "#fff" }}>← Volver a la ficha</Link>
      </header>

      <main className="app">
        <section className="card" id="edad-biologica">
          <h2>Edad biológica estimada</h2>
          <p className="doc-lead">
            Dos deportistas nacidos el mismo día pueden tener cuerpos con casi dos años de
            diferencia de desarrollo. La ficha estima esa diferencia con dos datos que ya se
            toman en cada valoración: <b>la edad y la estatura</b>.
          </p>

          <div className="doc-pair" style={{ marginTop: 16 }}>
            <div className="doc-pair-card">
              <span className="k">Edad cronológica</span>
              <span className="v">
                Los años que dice el documento. Es exacta, pero no dice nada sobre el
                desarrollo del cuerpo.
              </span>
            </div>
            <div className="doc-pair-card hl">
              <span className="k">Edad biológica</span>
              <span className="v">
                Qué tan avanzado va el cuerpo en su maduración. Es lo que realmente explica la
                fuerza, la velocidad y la talla en un adolescente.
              </span>
            </div>
          </div>

          <p className="doc-p" style={{ marginTop: 14 }}>
            Sin este dato, un chico adelantado parece más talentoso de lo que es y uno tardío
            parece menos. La edad biológica separa <b>madurar antes</b> de <b>rendir mejor</b>.
          </p>
        </section>

        <section className="card">
          <h2>Cómo se aplica, paso a paso</h2>
          <div className="doc-scroll">
            <table className="doc-table">
              <thead>
                <tr>
                  <th className="paso">#</th>
                  <th>Qué hace el sistema</th>
                  <th>Resultado en un caso real</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="paso">1</td>
                  <td>
                    <span className="what">Lee dos datos de la ficha</span>
                    <span className="why">
                      La edad exacta con decimales (calculada desde la fecha de nacimiento) y la
                      estatura en centímetros.
                    </span>
                  </td>
                  <td className="doc-num">
                    {CASO.nombre}, masculino<br />
                    {f1(CASO.edad)} años · {CASO.estatura} cm
                  </td>
                </tr>
                <tr>
                  <td className="paso">2</td>
                  <td>
                    <span className="what">Los multiplica entre sí</span>
                    <span className="why">
                      El producto edad × estatura resume en un solo número cuán mayor es el
                      deportista y cuánto ha crecido ya.
                    </span>
                  </td>
                  <td className="doc-num">
                    {f1(CASO.edad)} × {CASO.estatura} = <span className="doc-out">{miles(AH)}</span>
                  </td>
                </tr>
                <tr>
                  <td className="paso">3</td>
                  <td>
                    <span className="what">Aplica la ecuación de Moore</span>
                    <span className="why">
                      Fórmula validada científicamente, con coeficientes distintos para hombres y
                      mujeres. Devuelve cuántos años faltan (−) o ya pasaron (+) desde el estirón
                      puberal.
                    </span>
                  </td>
                  <td className="doc-num">
                    {m(MOORE[CASO.sexo].intercepto)} + {MOORE[CASO.sexo].pendiente} × {miles(AH)}<br />
                    = <span className="doc-out">{f2(offset)} años</span>
                  </td>
                </tr>
                <tr>
                  <td className="paso">4</td>
                  <td>
                    <span className="what">Suma la referencia de la población</span>
                    <span className="why">
                      El hombre promedio hace su estirón a los {MOORE.M.aphv} años; la mujer, a los{" "}
                      {f1(MOORE.F.aphv)}. Esa referencia convierte el resultado anterior en una edad.
                    </span>
                  </td>
                  <td className="doc-num">
                    {MOORE[CASO.sexo].aphv} + ({f2(offset)})<br />
                    = <span className="doc-out">{f1(bio)} años</span>
                  </td>
                </tr>
                <tr>
                  <td className="paso">5</td>
                  <td>
                    <span className="what">Compara contra la edad del calendario</span>
                    <span className="why">
                      La diferencia entre ambas edades es lo que se interpreta y lo que se muestra
                      en la ficha.
                    </span>
                  </td>
                  <td className="doc-num">
                    {f1(bio)} − {f1(CASO.edad)} = {f2(dif)}<br />
                    <span className={`mat ${lec.cls}`} style={{ marginTop: 6 }}>
                      <span className="arrow">{lec.arrow}</span>{lec.txt}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="hint">
            El cálculo ocurre en el momento en que se escribe la estatura. No requiere una prueba
            adicional, ni tiempo extra del evaluador, ni equipo especial.
          </p>
        </section>

        <section className="card">
          <h2>Las dos fórmulas</h2>
          <div className="doc-formula">
            <div className="row">
              <span className="who">Hombres</span>
              offset = <span className="coef">{m(MOORE.M.intercepto)}</span> +{" "}
              <span className="coef">{MOORE.M.pendiente}</span> × (edad × estatura)
            </div>
            <div className="row">
              <span className="who">Mujeres</span>
              offset = <span className="coef">{m(MOORE.F.intercepto)}</span> +{" "}
              <span className="coef">{MOORE.F.pendiente}</span> × (edad × estatura)
            </div>
            <div className="row">
              <span className="who">Luego</span>
              edad biológica = referencia ({MOORE.M.aphv} H / {f1(MOORE.F.aphv)} M) + offset
            </div>
          </div>
          <p className="doc-cite">
            Fuente: Moore et al. (2015), <i>Enhancing a Somatic Maturity Prediction Model</i>,
            en <i>Medicine &amp; Science in Sports &amp; Exercise</i>. Los coeficientes no están
            ajustados a mano: son los de la publicación original.
          </p>
        </section>

        <section className="card">
          <h2>Tres deportistas de la misma edad</h2>
          <p className="doc-p">
            Los tres tienen <b>{f1(CASO.edad)} años exactos</b>. Lo único que cambia es la estatura.
          </p>
          <div className="doc-scroll">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Deportista</th>
                  <th>Estatura</th>
                  <th>Edad biológica</th>
                  <th>Diferencia</th>
                  <th>Lectura</th>
                </tr>
              </thead>
              <tbody>
                {COMPARATIVA.map((d) => {
                  const b = edadBiologica(d.sexo, d.edad, d.estatura)!;
                  const diff = b - d.edad;
                  const l = lectura(diff);
                  return (
                    <tr key={d.nombre}>
                      <td className="dep-nombre">{d.nombre}</td>
                      <td className="doc-num">{d.estatura} cm</td>
                      <td className="doc-num">{f1(b)} años</td>
                      <td className="doc-num">{f2(diff)}</td>
                      <td>
                        <span className={`mat ${l.cls}`}>
                          <span className="arrow">{l.arrow}</span>{l.txt}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="hint">
            Entre Andrés y Samuel hay{" "}
            <b>
              {f1(
                edadBiologica("M", COMPARATIVA[2].edad, COMPARATIVA[2].estatura)! -
                  edadBiologica("M", COMPARATIVA[0].edad, COMPARATIVA[0].estatura)!
              )}{" "}
              años de desarrollo
            </b>{" "}
            pese a tener la misma edad en el papel. Si entrenan o compiten como iguales, no están
            en igualdad de condiciones.
          </p>
        </section>

        <section className="card">
          <h2>Cómo leer el resultado</h2>
          <div className="doc-scroll">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Diferencia</th>
                  <th>Clasificación</th>
                  <th>Qué significa para el trabajo con ese deportista</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="doc-num">Menor a −1 año</td>
                  <td><span className="mat detras"><span className="arrow">↓</span>Madurador tardío</span></td>
                  <td>
                    Su cuerpo aún no arranca el estirón. Suele quedar fuera de selecciones por
                    tamaño, no por capacidad. Conviene sostenerlo y no descartarlo: muchas veces
                    alcanza y supera a sus compañeros después.
                  </td>
                </tr>
                <tr>
                  <td className="doc-num">Entre −1 y +1 año</td>
                  <td><span className="mat en-tiempo"><span className="arrow">=</span>Normomadurador</span></td>
                  <td>
                    Va al ritmo esperado para su edad. Su rendimiento es una señal razonablemente
                    limpia de su nivel real.
                  </td>
                </tr>
                <tr>
                  <td className="doc-num">Mayor a +1 año</td>
                  <td><span className="mat adelante"><span className="arrow">↑</span>Madurador temprano</span></td>
                  <td>
                    Parte del rendimiento actual viene de la ventaja física, no del talento. Es el
                    perfil que más se sobrevalora en captación y el que más riesgo tiene si se le
                    carga como a un adulto.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="hint">
            Estas tres etiquetas <b>no son un semáforo</b>: ninguna es mejor que otra. Describen en
            qué momento del desarrollo está el deportista, no si está bien o mal.
          </p>
        </section>

        <section className="card">
          <h2>Por qué este método y no otro</h2>
          <div className="doc-scroll">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Método</th>
                  <th>Qué exige</th>
                  <th>Precisión</th>
                  <th>Viabilidad en la ficha</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Moore</b> <span style={{ color: "var(--verde)", fontWeight: 700 }}>(activo)</span></td>
                  <td>Edad y estatura</td>
                  <td className="doc-num">± 0.5 años</td>
                  <td>Ya se capturan hoy. Cero fricción.</td>
                </tr>
                <tr>
                  <td>Mirwald</td>
                  <td>Además, talla sentado</td>
                  <td className="doc-num">± 0.5 años</td>
                  <td>Requiere banco calibrado y es más sensible a errores de medición.</td>
                </tr>
                <tr>
                  <td>Khamis-Roche</td>
                  <td>Además, estatura de ambos padres</td>
                  <td className="doc-num">± 0.5 años</td>
                  <td>Depende de datos que los padres muchas veces no saben con exactitud.</td>
                </tr>
                <tr>
                  <td>Edad ósea</td>
                  <td>Radiografía de muñeca</td>
                  <td className="doc-num">Referencia</td>
                  <td>Es el estándar clínico, pero implica costo, radiación y centro médico.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="doc-p" style={{ marginTop: 12 }}>
            Los tres métodos de campo tienen precisión equivalente. Se eligió Moore porque es el
            único que no agrega un solo paso al trabajo del evaluador.
          </p>

          <div className="set-group">
            <span className="set-sub">Configuración actual del centro</span>
            <div className="doc-cfg">
              <div className="doc-cfg-item">
                <span className="k">Método seleccionado</span>
                <span className="v">{cfg.maduracion.metodo}</span>
              </div>
              <div className="doc-cfg-item">
                <span className="k">PHV referencia hombres</span>
                <span className="v">{f1(cfg.maduracion.phvHombres)} años</span>
              </div>
              <div className="doc-cfg-item">
                <span className="k">PHV referencia mujeres</span>
                <span className="v">{f1(cfg.maduracion.phvMujeres)} años</span>
              </div>
            </div>
            <p className="hint">
              Editable en <Link href="/ajustes" style={{ color: "var(--verde)", fontWeight: 700 }}>Ajustes</Link>.
              En este preview el cálculo está fijo en Moore con {MOORE.M.aphv} / {f1(MOORE.F.aphv)};
              conectar estas variables al cálculo es el siguiente paso.
              {configDistinta && (
                <> <b>Hoy el método guardado en Ajustes ({cfg.maduracion.metodo}) todavía no altera el resultado.</b></>
              )}
            </p>
          </div>
        </section>

        <section className="card">
          <h2>Lo que hay que tener claro</h2>
          <ul className="doc-limits">
            <li>
              <span>
                <span className="k">Es una estimación, no un diagnóstico.</span> El margen de error
                es de aproximadamente medio año. Sirve para decidir cómo agrupar y cómo cargar a un
                deportista, no para emitir un juicio médico.
              </span>
            </li>
            <li>
              <span>
                <span className="k">Solo aplica en edades de crecimiento.</span> La ecuación está
                validada entre los {MADURACION_EDAD_VALIDA.min} y los {MADURACION_EDAD_VALIDA.max}{" "}
                años. En un adulto el número deja de tener significado, porque ya no hay maduración
                que estimar.
              </span>
            </li>
            <li>
              <span>
                <span className="k">Pierde precisión en los extremos.</span> En deportistas muy
                altos o muy bajos para su edad, la estimación tiende a acercarse al promedio y
                subestima la diferencia real.
              </span>
            </li>
            <li>
              <span>
                <span className="k">Necesita la estatura cargada.</span> Si el campo de estatura
                está vacío, la ficha no muestra un valor aproximado: deja el dato en blanco.
                Preferimos un espacio vacío a un número que nadie puede sostener.
              </span>
            </li>
          </ul>
        </section>

        <p className="hint" style={{ marginTop: 18 }}>
          El resto de escalas y rangos que usa la plataforma (% grasa, FC en reposo, Sit and Reach,
          normalización del radar y umbral de asimetría) están documentados con su valor actual en{" "}
          <Link href="/ajustes" style={{ color: "var(--verde)", fontWeight: 700 }}>Ajustes</Link>.
        </p>
      </main>
    </>
  );
}
