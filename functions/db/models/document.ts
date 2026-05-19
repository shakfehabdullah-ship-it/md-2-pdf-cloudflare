import type { D1Database } from "@cloudflare/workers-types";

export interface DocumentRecord {
  id: number;
  user_id: number | null;
  guest_session_id: string | null;
  title: string | null;
  filename: string;
  markdown_content: string;
  markdown_size: number;
  pdf_size: number | null;
  pdf_generated: boolean;
  theme: string;
  page_size: string;
  orientation: string;
  created_at: string;
  updated_at: string;
}

export const DocumentModel = {
  async create(db: D1Database, data: Omit<DocumentRecord, "id" | "created_at" | "updated_at">) {
    return db
      .prepare(
        `INSERT INTO documents (user_id, guest_session_id, title, filename,
          markdown_content, markdown_size, pdf_size, pdf_generated, theme,
          page_size, orientation)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.user_id,
        data.guest_session_id,
        data.title,
        data.filename,
        data.markdown_content,
        data.markdown_size,
        data.pdf_size,
        data.pdf_generated ? 1 : 0,
        data.theme,
        data.page_size,
        data.orientation
      )
      .run();
  },

  async findByUserId(db: D1Database, userId: number, limit = 50, offset = 0) {
    return db
      .prepare(
        `SELECT id, title, filename, markdown_size, pdf_size, pdf_generated,
          theme, created_at, updated_at
         FROM documents WHERE user_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(userId, limit, offset)
      .all();
  },

  async findByGuestSession(db: D1Database, sessionId: string, limit = 50, offset = 0) {
    return db
      .prepare(
        `SELECT id, title, filename, markdown_size, pdf_size, pdf_generated,
          theme, created_at, updated_at
         FROM documents WHERE guest_session_id = ?
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
      )
      .bind(sessionId, limit, offset)
      .all();
  },

  async findById(db: D1Database, id: number) {
    return db.prepare("SELECT * FROM documents WHERE id = ?").bind(id).first();
  },

  async delete(db: D1Database, id: number, userId?: number) {
    if (userId) {
      return db
        .prepare("DELETE FROM documents WHERE id = ? AND user_id = ?")
        .bind(id, userId)
        .run();
    }
    return db.prepare("DELETE FROM documents WHERE id = ?").bind(id).run();
  },

  async search(db: D1Database, query: string, userId?: number) {
    if (userId) {
      return db
        .prepare(
          `SELECT id, title, filename, created_at
           FROM documents WHERE user_id = ? AND (title LIKE ? OR filename LIKE ?)
           ORDER BY created_at DESC LIMIT 20`
        )
        .bind(userId, `%${query}%`, `%${query}%`)
        .all();
    }
    return { results: [] };
  },

  async getStats(db: D1Database, userId?: number) {
    if (userId) {
      return db
        .prepare(
          `SELECT COUNT(*) as total,
            SUM(CASE WHEN pdf_generated = 1 THEN 1 ELSE 0 END) as pdf_count,
            SUM(markdown_size) as total_md_size,
            SUM(pdf_size) as total_pdf_size
           FROM documents WHERE user_id = ?`
        )
        .bind(userId)
        .first();
    }
    return db
      .prepare(
        `SELECT COUNT(*) as total,
          SUM(CASE WHEN pdf_generated = 1 THEN 1 ELSE 0 END) as pdf_count
         FROM documents`
      )
      .first();
  },
};