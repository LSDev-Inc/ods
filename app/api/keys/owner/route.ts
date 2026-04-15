import { dbConnect } from "../../../../db/connection";
import { User } from "../../../../db/models";
import { jsonError, jsonOk } from "../../../../lib/http";

export async function GET() {
  await dbConnect();
  const owner = await User.findOne({ role: "owner" }).lean();
  if (!owner || Array.isArray(owner)) return jsonError("Owner non trovato", 404);
  return jsonOk({ publicKey: owner.publicKey, userId: String(owner._id) });
}
