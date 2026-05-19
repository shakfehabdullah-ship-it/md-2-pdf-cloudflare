import { Context, Next } from "hono";
import jwt from "jsonwebtoken";
import type { Env } from "../types/env.js";

// JWT secret from environment or fallback
function getJwtSecret(env: Env): string {
  return env.JWT_SECRET || "md-2-pdf-default-secret-change-in-production";
}

export interface AuthPayload {
  userId: number;
  username: string;
  email: string;
}

export function signToken(payload: AuthPayload, env: Env): string {
  return jwt.sign(payload, getJwtSecret(env), { expiresIn: "7d" });
}

export function verifyToken(token: string, env: Env): AuthPayload | null {
  try {
    return jwt.verify(token, getJwtSecret(env)) as AuthPayload;
  } catch {
    return null;
  }
}

export async function optionalAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyToken(authHeader.slice(7), c.env);
    if (payload) {
      c.set("userId", payload.userId);
      c.set("username", payload.username);
      await next();
      return;
    }
  }

  const guestId = c.req.header("x-guest-session");
  if (guestId) {
    c.set("guestSessionId", guestId);
  }

  await next();
}

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "يجب تسجيل الدخول" }, 401);
  }

  const payload = verifyToken(authHeader.slice(7), c.env);
  if (!payload) {
    return c.json({ success: false, error: "الجلسة منتهية" }, 401);
  }

  c.set("userId", payload.userId);
  c.set("username", payload.username);
  await next();
}