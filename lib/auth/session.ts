import { SignJWT, jwtVerify } from "jose";
import { env } from "../env";

export type Role = "owner" | "admin" | "user";

export type SessionPayload = {
  sub: string;
  role: Role;
  username: string;
};

const sessionTtlSeconds = 60 * 60 * 24 * 7;
const stepTtlSeconds = 60 * 5;
const accessTtlSeconds = 60 * 15;

export const cookieNames = {
  session: "shadow_session",
  step: "shadow_step",
  access: "shadow_access"
};

function getSecret() {
  return new TextEncoder().encode(env.authSecret());
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${sessionTtlSeconds}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
  return payload;
}

export async function signStepToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${stepTtlSeconds}s`)
    .sign(getSecret());
}

export async function verifyStepToken(token: string) {
  const { payload } = await jwtVerify<SessionPayload>(token, getSecret());
  return payload;
}

export async function signAccessToken() {
  return new SignJWT({ type: "access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${accessTtlSeconds}s`)
    .sign(getSecret());
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload?.type === "access";
}
