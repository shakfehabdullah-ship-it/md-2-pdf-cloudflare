import { Hono } from "hono";
import type { Env } from "../types/env.js";
import { UserModel } from "../db/models/user.js";
import { signToken, verifyToken } from "../middleware/auth.js";

const router = new Hono<{ Bindings: Env }>();

router.post("/register", async (c) => {
  try {
    const { username, email, password, displayName } = await c.req.json();
    if (!username || !email || !password) {
      return c.json({ success: false, error: "جميع الحقول مطلوبة" }, 400);
    }
    if (password.length < 6) {
      return c.json({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }, 400);
    }
    const existing = await UserModel.findByEmail(c.env.DB, email);
    if (existing) {
      return c.json({ success: false, error: "البريد مستخدم بالفعل" }, 409);
    }
    await UserModel.create(c.env.DB, username, email, password, displayName);
    const user = (await UserModel.findByEmail(c.env.DB, email))!;
    const token = signToken({ userId: user.id, username: user.username, email: user.email });
    return c.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name } });
  } catch {
    return c.json({ success: false, error: "خطأ في التسجيل" }, 500);
  }
});

router.post("/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    const user = await UserModel.findByEmail(c.env.DB, email);
    if (!user) return c.json({ success: false, error: "بريد أو كلمة مرور خاطئة" }, 401);
    const valid = await UserModel.verifyPassword(user, password);
    if (!valid) return c.json({ success: false, error: "بريد أو كلمة مرور خاطئة" }, 401);
    await UserModel.updateLastLogin(c.env.DB, user.id);
    const token = signToken({ userId: user.id, username: user.username, email: user.email });
    return c.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name } });
  } catch {
    return c.json({ success: false, error: "خطأ في تسجيل الدخول" }, 500);
  }
});

router.post("/guest", (c) => {
  return c.json({ success: true, guestSessionId: crypto.randomUUID(), message: "يمكنك الآن حفظ السجلات." });
});

router.get("/me", async (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) return c.json({ success: true, user: null, isGuest: true });
  const payload = verifyToken(authHeader.slice(7));
  if (!payload) return c.json({ success: true, user: null, isGuest: true });
  const user = await UserModel.findById(c.env.DB, payload.userId);
  if (!user) return c.json({ success: true, user: null, isGuest: true });
  return c.json({ success: true, user: { id: user.id, username: user.username, email: user.email, displayName: user.display_name }, isGuest: false });
});

export default router;