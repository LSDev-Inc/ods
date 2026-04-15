import { Card } from "../../../components/ui/card";
import { getSession } from "../../../lib/auth/rbac";
import UserSecurityForm from "../../../components/user/UserSecurityForm";

export default async function UserProfilePage() {
  const session = await getSession();
  return (
    <section className="pb-16">
      <div className="grid gap-6 md:grid-cols-[1.4fr_1.6fr]">
        <Card>
          <h1 className="text-2xl font-semibold">Profilo</h1>
          <p className="mt-2 text-sm text-muted">Username: {session?.username ?? ""}</p>
          <p className="text-sm text-muted">Ruolo: {session?.role ?? ""}</p>
          <p className="mt-4 text-xs text-muted">
            Le chiavi private restano solo nel tuo browser.
          </p>
        </Card>
        <UserSecurityForm />
      </div>
    </section>
  );
}
