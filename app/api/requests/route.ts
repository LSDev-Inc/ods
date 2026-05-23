import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../lib/http";
import { requestSchema } from "../../../lib/validators";
import { dbConnect } from "../../../db/connection";
import { Product, Request, User } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import {
  decryptDateToISOString,
  decryptNumber,
  decryptString,
  encryptDate,
  encryptNumber,
  encryptString
} from "../../../lib/crypto/data";

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
        products: await Promise.all(
          (req.products ?? []).map(async (item: any) => ({
            productId: String(item.productId ?? ""),
            optionId: item.optionId ? String(item.optionId) : null,
            quantity: item.quantity ?? 0,
            optionName: await decryptString(item.optionName ?? ""),
            optionQuantity: await decryptString(item.optionQuantity ?? ""),
            unitPrice: await decryptNumber(item.unitPrice ?? 0)
          }))
        ),
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

  const productIds = Array.from(new Set(parsed.data.products.map((item) => item.productId)));
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  if (products.length !== productIds.length) {
    return jsonError("Prodotti non validi", 400);
  }
  const productMap = new Map(products.map((product) => [String(product._id), product]));
  const requestProducts = [];
  let computedTotal = 0;

  for (const item of parsed.data.products) {
    const product = productMap.get(item.productId);
    if (!product) return jsonError("Prodotti non validi", 400);

    const options = Array.isArray(product.options) ? product.options : [];
    const option = item.optionId
      ? options.find((candidate: any) => String(candidate?._id ?? "") === item.optionId)
      : null;

    if (item.optionId && !option) {
      return jsonError("Quantita prodotto non valida", 400);
    }

    const unitPrice = option
      ? await decryptNumber(option.price ?? 0)
      : await decryptNumber(product.price ?? 0);
    const optionName = option
      ? await decryptString(option.name ?? "")
      : await decryptString(product.name ?? "");
    const optionQuantity = option ? await decryptString(option.quantity ?? "") : "";

    computedTotal += unitPrice * item.quantity;
    requestProducts.push({
      productId: item.productId,
      optionId: option ? String(option._id) : null,
      quantity: item.quantity,
      optionName: await encryptString(optionName),
      optionQuantity: await encryptString(optionQuantity),
      unitPrice: await encryptNumber(unitPrice)
    });
  }

  const doc = await Request.create({
    userId: session.sub,
    products: requestProducts,
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
