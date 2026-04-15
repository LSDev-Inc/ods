import Link from "next/link";
import RequestQueue from "../../components/admin/RequestQueue";
import AnimatedCard from "../../components/AnimatedCard";
import { Button } from "../../components/ui/button";

export default function AdminDashboardPage() {
  return (
    <section className="pb-16">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <AnimatedCard className="flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Console Admin</p>
            <h1 className="mt-3 text-3xl font-semibold">Controllo operativo in tempo reale.</h1>
            <p className="mt-3 text-sm text-muted">
              Gestisci richieste, sblocca chat e mantieni il flusso protetto.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/admin/products">Gestisci prodotti</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/chat">Apri chat</Link>
            </Button>
          </div>
        </AnimatedCard>
        <AnimatedCard className="space-y-4">
          <h2 className="text-lg font-semibold">Indicatori rapidi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted">Stato canali</p>
              <p className="mt-2 text-xl font-semibold">Protetto</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted">Coda richieste</p>
              <p className="mt-2 text-xl font-semibold">Monitorata</p>
            </div>
          </div>
        </AnimatedCard>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Richieste in attesa</h2>
        <p className="text-sm text-muted">
          Accetta una richiesta per sbloccare la chat dedicata.
        </p>
      </div>
      <RequestQueue />
    </section>
  );
}
