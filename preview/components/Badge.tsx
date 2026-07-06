import { Clasificacion } from "@/lib/escalas";

export function Badge({ c }: { c: Clasificacion | null }) {
  if (!c) return <span className="badge vacio">—</span>;
  return <span className={`badge ${c.nivel}`}>{c.etiqueta}</span>;
}
