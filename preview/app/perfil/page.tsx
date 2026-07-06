import Link from "next/link";
import { GraficasPanel } from "@/components/GraficasPanel";
import { DEMO_PERFIL } from "@/components/RadarPerfil";

export default function PerfilPage() {
  return (
    <>
      <header className="topbar">
        <div className="logo">IN<br />MOVE</div>
        <div>
          <h1>Perfil de rendimiento</h1>
          <div className="sub">In Move · Centro de Rendimiento</div>
        </div>
        <div className="spacer" />
        <Link href="/" className="pill" style={{ textDecoration: "none", color: "#fff" }}>← Volver a la ficha</Link>
      </header>

      <main className="app">
        <section className="card" style={{ padding: 0, overflow: "hidden", border: "none", background: "transparent" }}>
          <GraficasPanel perfil={DEMO_PERFIL} sexo="M" grasa={15} fcReposo={58} sitReach={30} />
        </section>
      </main>
    </>
  );
}
