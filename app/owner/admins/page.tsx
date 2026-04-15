import AdminCreateForm from "../../../components/auth/AdminCreateForm";
import AdminList from "../../../components/admin/AdminList";
import { Card } from "../../../components/ui/card";

export default function OwnerAdminsPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Gestione Admin</h1>
        <p className="text-sm text-muted">Crea e gestisci gli account admin.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card>
          <h2 className="text-lg font-semibold">Nuovo admin</h2>
          <p className="mt-2 text-sm text-muted">Le chiavi vengono cifrate sul client.</p>
          <div className="mt-4">
            <AdminCreateForm />
          </div>
        </Card>
        <AdminList />
      </div>
    </section>
  );
}
