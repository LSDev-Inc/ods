import Link from "next/link";
import AnimatedCard from "../components/AnimatedCard";
import HiddenAccessTrigger from "../components/HiddenAccessTrigger";
import { Button } from "../components/ui/button";
import { PageContainer } from "../components/layout/PageContainer";

export default async function HomePage() {
  return (
    <main className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="hero-orb orb-1 animate-float-slow" />
        <div className="hero-orb orb-2 animate-float" />
        <div className="hero-orb orb-3 animate-spin-slow" />
        <PageContainer className="relative z-10">
          <section className="py-16 sm:py-24">
            <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
              <p
                className="text-xs uppercase tracking-[0.5em] text-muted animate-fade-up"
                style={{ animationDelay: "40ms" }}
              >
                Cybersecurity Studio
              </p>
              <h1
                className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl animate-fade-up"
                style={{ animationDelay: "120ms" }}
              >
                Esperienze digitali{" "}
                <span className="bg-gradient-to-r from-ember to-cobalt bg-clip-text text-transparent">
                  sicure, eleganti
                </span>{" "}
                e private.
              </h1>
              <p
                className="text-base text-muted sm:text-lg animate-fade-up"
                style={{ animationDelay: "200ms" }}
              >
                Stiamo preparando una piattaforma per testare soluzioni e prodotti in ambito
                cybersecurity con un&apos;esperienza fluida, centrata sulle persone e ottimizzata per
                ogni dispositivo.
              </p>
              <div
                className="flex flex-wrap items-center justify-center gap-4 animate-fade-up"
                style={{ animationDelay: "260ms" }}
              >
                <Button size="lg" className="animate-shimmer bg-gradient-to-r from-ember to-cobalt">
                  Esplora i prodotti
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="#catalogo">Vedi catalogo</Link>
                </Button>
              </div>
              <div
                className="flex flex-wrap items-center justify-center gap-3 text-xs text-muted animate-fade-up"
                style={{ animationDelay: "320ms" }}
              >
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Responsive al 100%
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  sicurezza e privacy integrate
                </span>
                <span className="rounded-full border border-white/10 px-3 py-1">
                  Animazioni leggere e dinamiche
                </span>
              </div>
              <div className="animate-fade-up" style={{ animationDelay: "380ms" }}>
                <HiddenAccessTrigger />
              </div>
            </div>
          </section>

          <section className="py-6">
            <div className="grid gap-6 md:grid-cols-3">
              <AnimatedCard className="animate-fade-up">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Cifratura</p>
                <h2 className="mt-3 text-xl font-semibold">Sicurezza integrata</h2>
                <p className="mt-3 text-sm text-muted">
                I dati degli utenti sono protetti, garantendo la privacy e la sicurezza senza compromettere l&apos;esperienza.
                </p>
              </AnimatedCard>
              <AnimatedCard className="animate-fade-up">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Esperienza</p>
                <h2 className="mt-3 text-xl font-semibold">Centrato su chi usa</h2>
                <p className="mt-3 text-sm text-muted">
                  Layout centrato, leggibile su mobile, tablet e desktop con movimenti controllati
                  e transizioni naturali.
                </p>
              </AnimatedCard>
              <AnimatedCard className="animate-fade-up">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Operativita</p>
                <h2 className="mt-3 text-xl font-semibold">Monitoraggio efficiente</h2>
                <p className="mt-3 text-sm text-muted">
                  Dashboard intuitive e strumenti di monitoraggio per gestire la sicurezza in modo efficace e proattivo.
                </p>
              </AnimatedCard>
            </div>
          </section>

          <footer className="py-10 text-sm text-muted">
            <div className="flex flex-col items-center justify-between gap-3 text-center sm:flex-row">
              <p>Cybersecurity, tutti i diritti riservati.</p>
            </div>
          </footer>
        </PageContainer>
      </div>
    </main>
  );
}
