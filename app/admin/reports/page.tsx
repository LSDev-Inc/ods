import ChatReports from "../../../components/chat/ChatReports";

export default function AdminReportsPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Resoconti</h1>
        <p className="text-sm text-muted">Panoramica delle chat concluse e dei guadagni.</p>
      </div>
      <ChatReports />
    </section>
  );
}

