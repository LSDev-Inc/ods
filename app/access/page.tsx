import Link from "next/link";
import { PageContainer } from "../../components/layout/PageContainer";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";

export default function AccessPage() {
  return (
    <main className="min-h-screen">
      <PageContainer>
        <section className="py-16">
          <Card>
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-muted">Accesso riservato</p>
              <h1 className="text-3xl font-semibold">Scegli il tuo ruolo</h1>
              <p className="text-sm text-muted">
                Seleziona il percorso corretto per accedere ai canali protetti.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <Card className="bg-white/5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl font-semibold text-fog">
                    U
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">User</p>
                    <p className="mt-2 text-sm text-muted">
                      Crea una richiesta e comunica in modo cifrato con il team.
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Button asChild>
                      <Link href="/auth/user/login">Login User</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/auth/user/register">Registrazione</Link>
                    </Button>
                  </div>
                </div>
              </Card>
              <Card className="bg-white/5">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl font-semibold text-fog">
                    A
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin</p>
                    <p className="mt-2 text-sm text-muted">
                      Gestisci le richieste e le chat assegnate.
                    </p>
                  </div>
                  <div className="mt-4 flex justify-center">
                    <Button asChild>
                      <Link href="/auth/admin/login">Login Admin</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </Card>
        </section>
      </PageContainer>
    </main>
  );
}
