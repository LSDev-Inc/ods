import { NextRequest } from "next/server";
import { dbConnect } from "../../../db/connection";
import { Category } from "../../../db/models";
import { getSessionFromRequest } from "../../../lib/auth/request";
import { encryptDate, encryptString } from "../../../lib/crypto/data";
import { serializeCategory } from "../../../lib/categories/serializer";
import { jsonError, jsonOk } from "../../../lib/http";
import { categoryCreateSchema } from "../../../lib/validators";

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) return jsonError("Non autorizzato", 401);

  await dbConnect();
  const categories = await Category.find({}).lean();
  const serialized = await Promise.all(categories.map((category) => serializeCategory(category)));
  return jsonOk(serialized);
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  const created = await Category.create({
    name: await encryptString(parsed.data.name.trim()),
    createdAt: await encryptDate(new Date())
  });

  return jsonOk({ id: String(created._id) }, 201);
}
