import { PageContainer } from "../../../../components/layout/PageContainer";
import { Card } from "../../../../components/ui/card";
import RegisterForm from "../../../../components/auth/RegisterForm";

export default function UserRegisterPage() {
  return (
    <main className="min-h-screen">
      <PageContainer>
        <section className="py-16">
          <Card className="max-w-lg">
            <h1 className="text-2xl font-semibold">Registrazione User</h1>
            <p className="mt-2 text-sm text-muted">
              Le chiavi vengono generate sul tuo dispositivo e cifrate con password + PIN.
            </p>
            <div className="mt-6">
              <RegisterForm />
            </div>
          </Card>
        </section>
      </PageContainer>
    </main>
  );
}
