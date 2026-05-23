import { NextRequest } from "next/server";
import { dbConnect } from "../../../../db/connection";
import { Category, Product } from "../../../../db/models";
import { getSessionFromRequest } from "../../../../lib/auth/request";
import { encryptString } from "../../../../lib/crypto/data";
import { jsonError, jsonOk } from "../../../../lib/http";
import { categoryUpdateSchema } from "../../../../lib/validators";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  const body = await request.json().catch(() => null);
  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Dati non validi", 400);

  await dbConnect();
  const category = await Category.findById(id);
  if (!category) return jsonError("Categoria non trovata", 404);

  category.name = await encryptString(parsed.data.name.trim());
  await category.save();

  return jsonOk({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionFromRequest(request);
  if (!session || (session.role !== "admin" && session.role !== "owner")) {
    return jsonError("Non autorizzato", 401);
  }

  await dbConnect();
  const category = await Category.findById(id);
  if (!category) return jsonError("Categoria non trovata", 404);

  await Product.updateMany({ categoryId: category._id }, { $set: { categoryId: null } });
  await category.deleteOne();

  return jsonOk({ ok: true });
}
