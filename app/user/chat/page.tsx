import ChatList from "../../../components/chat/ChatList";
import RequestStatusList from "../../../components/chat/RequestStatusList";

export default function UserChatPage() {
  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Chat</h1>
        <p className="text-sm text-muted">Le chat si attivano dopo l&apos;accettazione della richiesta.</p>
      </div>
      <div className="grid gap-8">
        <div>
          <h2 className="text-lg font-semibold">Richieste</h2>
          <RequestStatusList />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Chat attive</h2>
          <ChatList basePath="user" />
        </div>
      </div>
    </section>
  );
}
