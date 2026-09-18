# Propuesta Fase 2 — Módulo de Grupos
### Plataforma In Move — Centro de Evaluación y Rendimiento

| | |
|---|---|
| **Cliente** | In Move — Centro de Evaluación y Rendimiento (@inmovecs) |
| **Preparado por** | Diego Cumbe |
| **Fecha** | 2026-09-18 |
| **Versión** | 2.1 |
| **Vigencia** | 30 días |

---

## 1. Qué incluye esta fase

Hoy el "grupo" es apenas **una etiqueta de texto** sobre el deportista. Sirve para clasificar, pero no es una entidad real: no tiene cupo, ni tabla de posiciones, ni ficha propia, ni control de qué información sale.

Esta fase lo convierte en un módulo administrable, en **dos cortes**:

| Corte | Entregable | Tiempo |
|---|---|---|
| **C1** | **Administración de grupos** — grupos como entidad real, con tipo, sede, cupo, logo y color. | 1.5 sem |
| **C2** | **Visibilidad y ficha grupal** — matriz de qué se ve y dónde, + ficha grupal en pantalla y PDF. | 1.5 sem |
| — | **Estabilización y pruebas de regresión** — verificar que nada de la Fase 1 se rompió. **Incluida sin costo.** | 0.5 sem |

**Duración total: 3 – 3.5 semanas.**

> **Rankings, roles y usuarios con login quedan fuera de esta fase** (ver sección 5). Es deliberado: son las partes más costosas, y **el módulo de grupos queda funcionando completo sin ellas**. Esta fase entrega el cimiento; lo demás se suma después, cuando el centro ya esté usando los grupos.

---

## 2. Alcance por corte

### C1 · Administración de grupos

Se crea la entidad **Grupo**, con:

- Nombre, descripción, logo y color propio (se refleja en la ficha grupal).
- **Tipo** de grupo: running, fútbol, ciclismo, gimnasio, colegio…
- **Sede o ciudad** (ej. Garzón).
- **Cupo máximo** de deportistas y estado (activo / inactivo / archivado).
- Fechas de inicio y cierre del ciclo.

**Administración:** crear y editar grupos, asignar y retirar deportistas, filtrar por tipo y sede.

**Membresías:** un deportista puede pertenecer a más de un grupo, y se guarda el histórico de entradas y salidas. Si alguien sale del grupo en junio, sus mediciones de marzo siguen contando para el ranking de ese periodo, pero no aparece en la tabla actual.

**Migración:** los grupos que hoy existen como texto se convierten en grupos reales, sin perder ningún dato.

#### Flags extensibles — la clave para crecer

En lugar de programar cada variante, los grupos se etiquetan con **flags administrables desde el panel**, reutilizando el mecanismo de catálogos que ya funciona hoy:

| Flag | Valores iniciales | Para qué sirve |
|---|---|---|
| `disciplina` | running, fútbol, ciclismo, funcional | Define qué indicadores son relevantes y cómo se arma el ranking. |
| `sede` | Garzón | Permite abrir Neiva, Pitalito, Bogotá… **sin tocar código**. |
| `modalidad` | presencial, remoto, mixto | Clasificación operativa. |

El día que In Move abra un segundo grupo de running en otra ciudad, o un grupo de ciclismo en Garzón, **se crea desde el panel en dos minutos**. No hay que llamarme, ni cotizar, ni desplegar nada.


---

### C2 · Visibilidad y ficha grupal

#### Cómo llega la ficha al dueño del grupo

Como los usuarios con login quedan para la Fase 3, el dueño del grupo recibe su ficha grupal **por enlace compartible** — exactamente el mismo mecanismo que ya funciona hoy para la ficha individual, y que el centro ya sabe usar.

El enlace muestra únicamente lo que la matriz de visibilidad permita. **No hay acceso al panel, ni a otros grupos, ni a datos que no estén autorizados.**

#### Matriz de visibilidad

Este es el corazón de la fase: **el dueño del grupo no debe ver todo lo que ve el deportista.** Hay datos de salud —composición corporal, limitaciones articulares, observaciones clínicas— que no deben circular sin control. Más aún con menores de edad.

Se configura desde el panel de administración. Propuesta de valores por defecto:

| Bloque de información | Ficha privada<br>(deportista/acudiente) | Ficha grupal<br>(dueño del grupo) | Enlace público |
|---|---|---|---|
| Nombre y foto | Ve | Ve | Ve |
| Documento y fecha de nacimiento | Ve | **No ve** (solo edad) | No ve |
| Rendimiento — CMJ, sprint, agilidad, fuerza | Ve | Ve | Ve |
| Antropometría — % grasa, masa, peso | Ve | 🔶 *Solo promedio del grupo* | No ve |
| ROM y asimetrías | Ve | 🔶 *Solo semáforo* | No ve |
| Flexibilidad | Ve | 🔶 *Solo semáforo* | No ve |
| Observaciones y plan de trabajo | Ve | **No ve** | No ve |
| Alertas de riesgo | Ve | 🔶 *Conteo sin nombre* | No ve |

🔶 = **configurable** por grupo: se puede subir a "ve" o bajar a "no ve", dejando registro de quién lo cambió y cuándo.

> **Esto no es solo una funcionalidad, es una protección.** Cubre la responsabilidad del centro frente a la Ley 1581 (Habeas Data) y frente a los acudientes de menores. Si mañana un padre pregunta "¿quién vio el porcentaje de grasa de mi hija?", hay una respuesta.

#### La ficha grupal

Documento en pantalla y en PDF, con el mismo motor de impresión que ya funciona (sin costo adicional de librerías):

1. **Portada** — logo y color del grupo, sede, periodo, número de deportistas.
2. **Composición** — distribución por sexo, edad y categoría.
3. **Promedios** por indicador, comparados contra la norma de referencia.
4. **Semáforo grupal** — % de deportistas en zona baja / media / óptima.
5. **Evolución** — Δ% por indicador entre dos periodos. *El argumento de venta del entrenador ante su gente.*
6. **Alertas** — según lo que la matriz permita.

> **Nota:** la tabla de posiciones de la ficha grupal llega con la **Fase 3**. En esta fase la ficha grupal entrega composición, promedios, semáforo grupal y evolución — que es lo que el dueño del grupo necesita para mostrarle resultados a su gente.

---

## 3. Límites de plan y control de costo

Techo configurable, visible en el panel:

| Límite | Propuesto | Razón |
|---|---|---|
| Grupos activos | **8** | Mantiene el consumo dentro del plan económico de base de datos. |
| Deportistas por grupo | **40** | ~320 deportistas en total. |
| Peso máximo por foto | **1 MB** | El almacenamiento de imágenes es el costo que más rápido crece. |
| Retención de cortes de ranking | **24 periodos** | Histórico suficiente sin inflar la base. |

**Aviso al 80% de uso** y bloqueo suave al 100%: no se crean más grupos hasta ampliar el plan. Nada se borra de forma automática.

Esto protege al centro de una factura sorpresa de infraestructura, y deja el terreno listo para vender planes por tamaño de grupo más adelante.

---

## 4. Por qué esta fase cuesta lo que cuesta

La Fase 1 se construyó sobre **campo verde**: no había nada que romper. La Fase 2 se construye **sobre un sistema en producción, con datos reales y con enlaces de fichas ya compartidos con deportistas**.

| | Fase 1 | Fase 2 |
|---|---|---|
| Datos existentes | Ninguno | Deportistas y fichas reales del centro |
| Enlaces ya entregados | Ninguno | **Fichas compartidas que no pueden dejar de funcionar** |
| Si algo sale mal | Se corrige y ya | Se afecta la operación diaria del centro |
| Migración de datos | No aplica | **Obligatoria y sin pérdida** |

Buena parte del esfuerzo de esta fase **no produce pantallas nuevas**. Produce garantías: migrar los grupos-texto sin perder una sola ficha, que cada enlace ya compartido siga abriendo igual, verificar después de cada cambio que ficha, PDF, comparación e histórico siguen intactos, y poder volver atrás si algo falla.

> **En Fase 1 pagaste por construir. En Fase 2 pagas por construir y además garantizar que lo que ya usas a diario no se rompa.**

**Y lo que habilita:** la Fase 1 hizo al centro más eficiente — se acabó el papel. La Fase 2 le abre **una línea de ingreso**: pasar de vender valoraciones individuales a vender servicio a grupos, con un entregable propio que el dueño del grupo puede mostrarle a su gente.

---

## 5. Qué queda para después

Se separan a propósito: son las partes más costosas, y **el módulo de grupos funciona completo sin ellas**. Cada una se contrata cuando el centro la necesite, con la misma tarifa preferencial.

### Fase 3 — Rankings y tablas de posiciones

Motor configurable por indicador (CMJ, sprint 30 m, 5-10-5, % grasa, IMC, fuerza o score compuesto), con dirección, población (grupo / sede / global) y normalización por sexo y edad. Tabla con posición, valor, percentil, semáforo y movimiento frente a la medición anterior. Cortes por periodo para "campeón del mes" y evolución histórica.

**Referencia:** ~26 h · ~$780.000 de valor de mercado.

*Por qué puede esperar:* el ranking es un incentivo, no una necesidad operativa. Primero el centro necesita administrar los grupos y poder entregarle algo al dueño; comparar deportistas entre sí viene después, y gana valor cuando ya hay varias mediciones acumuladas.

### Fase 4 — Roles y usuarios con login

| Incluye | Por qué puede esperar |
|---|---|
| **Usuarios con login** para dueños de grupo y evaluadores | En Fase 2 la ficha grupal llega por enlace compartible, que ya funciona. |
| **Roles y permisos** (super admin, evaluador, dueño de grupo) | Hoy un solo admin cubre la operación del centro. |
| **Blindaje de accesos por rol** en cada acción del sistema | Solo se vuelve necesario cuando entran usuarios externos al panel. |
| **Migración de usuarios** y auditoría de accesos | Depende de lo anterior. |

**Referencia:** ~40 h · ~$1.200.000 de valor de mercado.

> **Por qué es lo más caro de todo:** hoy la aplicación asume "un solo admin" y la conexión a base de datos es directa, sin reglas de fila. Introducir roles obliga a **revisar y blindar cada acción del sistema, una por una**. Es trabajo que no se ve en pantalla, y es el que más responsabilidad carga.

---

## 6. Qué no incluye

- Aplicación móvil nativa — sigue siendo web responsive, tablet-first.
- Envío automático por WhatsApp o correo.
- Cobros, pasarela de pago o facturación a los grupos.
- Auto-registro del deportista — sigue registrando el staff.
- Monitoreo de carga sRPE / ACWR y zonas de FC.
- Importación masiva desde Excel.
- Chat, notificaciones push o calendario de entrenamientos.

Cualquiera se puede sumar; se cotiza aparte.

---

## 7. Inversión

### Referencia de valor

| Corte | Esfuerzo | Valor de mercado |
|---|---|---|
| C1 — Administración de grupos | 34 h | $1.020.000 |
| C2 — Visibilidad y ficha grupal | 30 h | $900.000 |
| **Subtotal facturable** | **64 h** | **$1.920.000** |
| Estabilización y pruebas de regresión | 12 h | ~~$360.000~~ **No se cobra** |
| **Total entregado** | **76 h** | **$2.280.000** |

*Tarifa de referencia: $30.000 / hora.*

### Valor acordado

> ## **$680.000 COP**
> **65% de descuento** sobre el trabajo facturable.
> Contando la estabilización que no se cobra, el descuento real es del **70%**.

### Forma de pago — 2 cuotas

Con dos cortes y tres semanas no hay un hito intermedio que justifique una tercera cuota, así que el pago se simplifica:

| Cuota | Cuándo | % | Valor |
|---|---|---|---|
| **1 — Anticipo** | **Antes de iniciar.** Reserva la agenda. | 40% | **$272.000** |
| **2 — Entrega** | Al cierre de **C2** + estabilización: desplegado y capacitado. | 60% | **$408.000** |

**Sobre el anticipo:** es la única condición nueva, y es la que hace viable el compromiso. El desarrollo **no se agenda** sin él. Es lo que garantiza que las semanas queden bloqueadas para este proyecto y no compitiendo con otros. Aun subiendo al 40%, **el primer pago en pesos es menor** que en un esquema de tres cuotas sobre un alcance mayor.

### Comparación con la Fase 1

| | Fase 1 | Fase 2 |
|---|---|---|
| Valor de mercado | ~$3.000.000 | ~$2.280.000 |
| Valor acordado | $800.000 | **$680.000** |
| Forma de pago | 3 cuotas | 2 cuotas |
| Anticipo | — | **40% al inicio** |
| Riesgo sobre lo existente | Ninguno | **Alto** — se cubre con pruebas de regresión |
| Estabilización | Cobrada | **Incluida sin costo** |
| Soporte incluido | 2 meses | 1 mes + garantía de no-regresión sobre Fase 1 |

> **El precio baja porque baja el alcance, no la dedicación.** Esta fase entrega dos cortes en lugar de cinco, y por eso cuesta menos que la Fase 1. La tarifa preferencial es la misma; lo que cambia es cuánto trabajo se contrata de una vez.

---

## 8. Condiciones

1. **Inicio.** El cronograma corre desde que se cumplen las dos cosas: anticipo del 40% recibido *y* material entregado (sección 9).
2. **Retroalimentación por corte.** 5 días hábiles para revisar cada entrega. Pasado ese plazo sin comentarios, el corte se da por aprobado.
3. **Rondas de ajuste.** 2 incluidas por corte. Ajustes adicionales, o cambios dentro de un corte ya aprobado, se cotizan aparte.
4. **Cambios de alcance.** Cualquier funcionalidad de las secciones 5 y 6 se cotiza y se acuerda por escrito antes de ejecutarse.
5. **Pagos.** Un atraso mayor a 10 días calendario pausa el desarrollo hasta regularizar. La agenda se reprograma según disponibilidad.
6. **Soporte.** 1 mes posterior a la entrega para errores de lo desarrollado en Fase 2. Durante ese mes también se cubre sin costo cualquier fallo en funciones de Fase 1 causado por los cambios de Fase 2.
7. **Infraestructura.** Dominio, base de datos, almacenamiento y hosting los asume el cliente. Los límites de la sección 3 están dimensionados para el plan económico.
8. **Datos personales.** El cliente es responsable de las autorizaciones de tratamiento de datos y de imagen, especialmente de menores. La matriz de visibilidad es la herramienta técnica para cumplirlas; la responsabilidad legal es del centro.
9. **Vigencia.** 30 días desde la fecha del documento.

---

## 9. Qué necesito para arrancar

Sin esto, el corte C1 no puede cerrarse:

- [ ] **Lista de grupos** que existen hoy y cuáles deben quedar activos.
- [ ] **Tipos de grupo y sedes** iniciales — confirmar si "Garzón" es sede o significa otra cosa.
- [ ] **Decisión sobre la matriz de visibilidad.** Especialmente: ¿el dueño del grupo ve el % de grasa individual de sus deportistas, o solo el promedio del grupo?
- [ ] **Confirmación de los límites de plan** de la sección 3.
- [ ] **A quién se le entrega el enlace** de cada ficha grupal.
- [ ] Logo y color de cada grupo, si los tienen.

**Cómo iniciamos:** aprobación → abono del 40% (se bloquea la agenda) → sesión de 45 minutos para cerrar esta lista, principalmente la matriz de visibilidad. C1 arranca el mismo día: la migración y el modelo de grupos no dependen de todo el material.

---

## Anexo — Impacto sobre lo existente

| Componente actual | Impacto en Fase 2 |
|---|---|
| Grupo como texto libre en el deportista | **Migra** a entidad de grupos y tabla de membresías, conservando el valor actual. |
| Catálogos de categorías, grupos, deportes, posiciones | Se **extiende** con los flags de tipo y sede. El mecanismo actual se conserva. |
| Ficha pública por enlace | **No cambia su dirección.** Los enlaces ya compartidos siguen funcionando idénticos. |
| PDF por impresión del navegador | Se **reutiliza** para la ficha grupal. Cero costo adicional de librerías. |
| Escalas y comparación por semáforo | Se **reutilizan** para los agregados y el semáforo grupal. |
| Autenticación de un solo admin | **No se toca en esta fase.** Se amplía en Fase 4. |

**Regla que gobierna toda la fase:** nada de lo que hoy funciona puede dejar de funcionar. Cada corte se entrega verificando primero que la Fase 1 sigue intacta.
