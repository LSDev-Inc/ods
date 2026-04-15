import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "../../../lib/http";
import { dbConnect } from "../../../db/connection";
import { Report } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import { decryptDate, decryptNumber, decryptString } from "../../../lib/crypto/data";
import { resolveMediaRef } from "../../../lib/media";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  await dbConnect();
  const query =
    session.role === "admin"
      ? { userId: { $exists: true } }
      : {}; // owner vede tutti; per ora nessun filtro aggiuntivo

  const reports = await Report.find(query).lean();

  const payload = await Promise.all(
    reports.map(async (report: any) => {
      const createdAtDate = await decryptDate(report.createdAt);
      return {
        id: String(report._id),
        userId: String(report.userId),
        requestId: String(report.requestId),
        chatId: String(report.chatId),
        products: await Promise.all(
          (report.products ?? []).map(
            async (p: {
              productId: unknown;
              name?: string;
              imageUrl?: string;
              quantity: number;
              priceAtSale: unknown;
            }) => {
              const name = await decryptString(p.name ?? "");
              const imageRef = await decryptString(p.imageUrl ?? "");
              const imageUrl = resolveMediaRef(imageRef).url ?? "";
              return {
                productId: String(p.productId),
                name: name || "Prodotto",
                imageUrl,
                quantity: p.quantity,
                priceAtSale: await decryptNumber(p.priceAtSale ?? 0)
              };
            }
          )
        ),
        total: await decryptNumber(report.total ?? 0),
        createdAt: createdAtDate ? createdAtDate.toISOString() : ""
      };
    })
  );

  payload.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return jsonOk(payload);
}
