import ChatList from "../../../components/chat/ChatList";

export default function OwnerChatPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Chat globali</h1>
        <p className="text-sm text-muted">L&apos;owner puo intervenire in qualsiasi chat.</p>
      </div>
      <ChatList basePath="owner" />
    </section>
  );
}
