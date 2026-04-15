import OwnerDangerZone from "../../../components/owner/OwnerDangerZone";

export default function OwnerSecurePage() {
  return (
    <section className="pb-16 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Sezione riservata</h1>
        <p className="mt-2 text-sm text-muted">
          Accesso esclusivo owner. Richiede la tua passphrase per azioni irreversibili.
        </p>
      </div>
      <OwnerDangerZone />
    </section>
  );
}
