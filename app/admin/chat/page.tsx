import ChatList from "../../../components/chat/ChatList";

export default function AdminChatPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Chat assegnate</h1>
        <p className="text-sm text-muted">Solo le chat accettate sono disponibili.</p>
      </div>
      <ChatList basePath="admin" />
    </section>
  );
}
