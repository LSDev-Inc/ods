import Link from "next/link";
import AnimatedCard from "../../components/AnimatedCard";
import { Button } from "../../components/ui/button";
import RequestQueue from "../../components/admin/RequestQueue";

export default function OwnerDashboardPage() {
  return (
    <section className="pb-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <AnimatedCard className="flex flex-col justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Owner Control</p>
            <h1 className="mt-3 text-3xl font-semibold">Direzione completa del catalogo.</h1>
            <p className="mt-3 text-sm text-muted">
              L&apos;owner puo gestire admin, prodotti e intervenire in ogni chat.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/owner/admins">Gestisci admin</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/owner/products">Gestisci prodotti</Link>
            </Button>
          </div>
        </AnimatedCard>
        <AnimatedCard className="space-y-4">
          <h2 className="text-lg font-semibold">Stato piattaforma</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted">Canali cifrati</p>
              <p className="mt-2 text-xl font-semibold">Attivi</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-muted">Team operativo</p>
              <p className="mt-2 text-xl font-semibold">Sincronizzato</p>
            </div>
          </div>
        </AnimatedCard>
      </div>

      <div className="mt-12 mb-6">
        <h2 className="text-2xl font-semibold">Richieste in attesa</h2>
        <p className="text-sm text-muted">
          L&apos;owner puo accettare o rifiutare le richieste per attivare le chat.
        </p>
      </div>
      <RequestQueue />
    </section>
  );
}
