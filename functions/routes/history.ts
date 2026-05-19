import { Hono } from "hono";
import { DocumentModel } from "../db/models/document.js";
import type { Env } from "../types/env.js";

const history = new Hono<{ Bindings: Env }>();

// List documents for the authenticated user or guest session
history.get("/", async (c) => {
  const userId = c.get("userId") as number | undefined;
  const guestId = c.get("guestSessionId") as string | undefined;
  const limit = Number(c.req.query("limit")) || 50;
  const offset = Number(c.req.query("offset")) || 0;
  const search = c.req.query("search");

  let documents;

  if (userId) {
    documents = search
      ? await DocumentModel.search(c.env.DB, search, userId)
      : await DocumentModel.findByUserId(c.env.DB, userId, limit, offset);
  } else if (guestId) {
    documents = await DocumentModel.findByGuestSession(c.env.DB, guestId, limit, offset);
  } else {
    return c.json({ success: true, documents: [], message: "لا توجد جلسة" });
  }

  return c.json({ success: true, documents });
});

// Get stats summary
history.get("/stats/summary", async (c) => {
  const userId = c.get("userId") as number | undefined;
  const stats = await DocumentModel.getStats(c.env.DB, userId);
  return c.json({ success: true, stats });
});

// Get a single document by ID
history.get("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const doc = await DocumentModel.findById(c.env.DB, id);
  if (!doc) {
    return c.json({ success: false, error: "لم يتم العثور على المستند" }, 404);
  }
  return c.json({ success: true, document: doc });
});

// Delete a document
history.delete("/:id", async (c) => {
  const userId = c.get("userId") as number | undefined;
  const id = Number(c.req.param("id"));
  const result = await DocumentModel.delete(c.env.DB, id, userId);
  return c.json({ success: true, deleted: result.meta.changes > 0 });
});

export default history;