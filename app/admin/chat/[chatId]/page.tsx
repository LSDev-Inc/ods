import Link from "next/link";
import { notFound } from "next/navigation";
import ChatRoom from "../../../../components/chat/ChatRoom";
import { Card } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { getSession } from "../../../../lib/auth/rbac";
import { dbConnect } from "../../../../db/connection";
import { Chat, Request, User, Product } from "../../../../db/models";
import { snapshotProduct } from "../../../../lib/products/serializer";
import { resolveMediaRef } from "../../../../lib/media";
import { decryptString } from "../../../../lib/crypto/data";

export default async function AdminChatRoomPage({
  params
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const session = await getSession();
  if (!session) return notFound();

  await dbConnect();
  const chat = await Chat.findById(chatId).lean();
  if (!chat || Array.isArray(chat)) return notFound();

  if (session.role === "admin" && chat.lockedToAdminId?.toString() !== session.sub) {
    return notFound();
  }

  const requestDoc = await Request.findById(chat.requestId).lean();
  if (!requestDoc || Array.isArray(requestDoc)) return notFound();

  const productIds = requestDoc.products.map((p: any) => p.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p: any) => [String(p._id), p]));

  const user = await User.findById(chat.userId).lean();
  if (!user || Array.isArray(user)) return notFound();
  const username = await decryptString(user.username);

  if (requestDoc.status !== "accepted") {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Chat non attiva</h2>
        <p className="mt-2 text-sm text-muted">La richiesta non e stata accettata.</p>
        <div className="mt-4">
          <Button asChild size="sm">
            <Link href="/admin">Vai alle richieste</Link>
          </Button>
        </div>
      </Card>
    );
  }

  const requestProducts = await Promise.all(
    requestDoc.products.map(async (p: any) => {
      const prod = productMap.get(p.productId.toString() as string) as any;
      const snapshot = await snapshotProduct(prod);
      const imageUrl = resolveMediaRef(snapshot.imageRef).url ?? "";
      return {
        id: p.productId.toString(),
        name: snapshot.name,
        imageUrl,
        price: snapshot.price,
        quantity: p.quantity
      };
    })
  );

  return (
    <section className="pb-16">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Chat con {username}</h1>
        <p className="text-sm text-muted">
          Solo l&apos;admin assegnato e l&apos;owner possono inviare messaggi.
        </p>
      </div>
      <ChatRoom
        chatId={String(chat._id)}
        counterpartId={String(user._id)}
        counterpartPublicKey={user.publicKey}
        canSend={requestDoc.status === "accepted"}
        requestInfo={{
          products: requestProducts,
          customMessageCiphertext: requestDoc.customMessageCiphertext,
          customMessageIv: requestDoc.customMessageIv,
          customMessageEncryptedSymKey: requestDoc.customMessageEncryptedSymKey
        }}
        returnHref="/admin/chat"
      />
    </section>
  );
}
