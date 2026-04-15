import { PageContainer } from "../../../../components/layout/PageContainer";
import { Card } from "../../../../components/ui/card";
import LoginForm from "../../../../components/auth/LoginForm";

export default function UserLoginPage() {
  return (
    <main className="min-h-screen">
      <PageContainer>
        <section className="py-16">
          <Card className="max-w-lg">
            <h1 className="text-2xl font-semibold">Login User</h1>
            <p className="mt-2 text-sm text-muted">Accesso in due passaggi con chiavi locali.</p>
            <div className="mt-6">
              <LoginForm role="user" />
            </div>
          </Card>
        </section>
      </PageContainer>
    </main>
  );
}
