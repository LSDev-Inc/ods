import { notFound } from "next/navigation";
import ChatRoom from "../../../../components/chat/ChatRoom";
import { dbConnect } from "../../../../db/connection";
import { Chat, Request, User, Product } from "../../../../db/models";
import { snapshotProduct } from "../../../../lib/products/serializer";
import { resolveMediaRef } from "../../../../lib/media";
import { decryptString } from "../../../../lib/crypto/data";

export default async function OwnerChatRoomPage({
  params
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  await dbConnect();
  const chat = await Chat.findById(chatId).lean();
  if (!chat || Array.isArray(chat)) return notFound();

  const requestDoc = await Request.findById(chat.requestId).lean();
  if (!requestDoc || Array.isArray(requestDoc)) return notFound();

  const productIds = requestDoc.products.map((p: any) => p.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p: any) => [String(p._id), p]));

  const user = await User.findById(chat.userId).lean();
  if (!user || Array.isArray(user)) return notFound();
  const username = await decryptString(user.username);

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
        <p className="text-sm text-muted">Accesso owner, puoi intervenire ovunque.</p>
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
        returnHref="/owner/chat"
      />
    </section>
  );
}
