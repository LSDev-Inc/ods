import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../lib/http";
import { requestSchema } from "../../../lib/validators";
import { dbConnect } from "../../../db/connection";
import { Product, Request, User } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import { decryptDateToISOString, decryptNumber, decryptString, encryptDate, encryptNumber } from "../../../lib/crypto/data";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  await dbConnect();

  if (session.role === "user") {
    const requests = await Request.find({ userId: session.sub }).lean();
    return jsonOk(
      await Promise.all(
        requests.map(async (req) => ({
          id: String(req._id),
          status: req.status,
          totalPrice: await decryptNumber(req.totalPrice ?? 0),
          assignedAdminId: req.assignedAdminId?.toString() ?? null,
          createdAt: await decryptDateToISOString(req.createdAt)
        }))
      )
    );
  }

  const pending = await Request.find({ status: "pending" }).lean();
  const userIds = pending.map((req) => req.userId);
  const users = await User.find({ _id: { $in: userIds } }).lean();
  const userEntries = await Promise.all(
    users.map(async (u) => [String(u._id), await decryptString(u.username)] as const)
  );
  const userMap = new Map(userEntries);

  return jsonOk(
    await Promise.all(
      pending.map(async (req) => ({
        id: String(req._id),
        userId: String(req.userId),
        username: userMap.get(req.userId.toString()) ?? "user",
        status: req.status,
        totalPrice: await decryptNumber(req.totalPrice ?? 0),
        customMessageCiphertext: req.customMessageCiphertext,
        customMessageIv: req.customMessageIv,
        customMessageEncryptedSymKey: req.customMessageEncryptedSymKey,
        createdAt: await decryptDateToISOString(req.createdAt)
      }))
    )
  );
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || session.role !== "user") return jsonError("Non autorizzato", 401);

  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();

  // Impedisci richieste multiple in parallelo per lo stesso utente
  const existingPending = await Request.findOne({
    userId: session.sub,
    status: "pending"
  }).lean();
  if (existingPending) {
    return jsonError("Hai gia una richiesta in attesa. Attendi che venga gestita.", 409);
  }

  const productIds = parsed.data.products.map((item) => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  if (products.length !== productIds.length) {
    return jsonError("Prodotti non validi", 400);
  }
  const priceEntries = await Promise.all(
    products.map(async (product) => [
      String(product._id),
      await decryptNumber(product.price ?? 0)
    ] as const)
  );
  const priceMap = new Map(priceEntries);
  const computedTotal = parsed.data.products.reduce((sum, item) => {
    const price = priceMap.get(item.productId) ?? 0;
    return sum + price * item.quantity;
  }, 0);

  const doc = await Request.create({
    userId: session.sub,
    products: parsed.data.products,
    totalPrice: await encryptNumber(computedTotal),
    customMessageCiphertext: parsed.data.customMessageCiphertext,
    customMessageIv: parsed.data.customMessageIv,
    customMessageEncryptedSymKey: parsed.data.customMessageEncryptedSymKey,
    status: "pending",
    assignedAdminId: null,
    createdAt: await encryptDate(new Date())
  });

  return jsonOk({ id: String(doc._id) }, 201);
}
