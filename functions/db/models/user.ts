import { D1Database } from "@cloudflare/workers-types";
import bcrypt from "bcryptjs";

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

export const UserModel = {
  async create(
    db: D1Database,
    username: string,
    email: string,
    password: string,
    displayName?: string
  ) {
    const hash = await bcrypt.hash(password, 12);
    return db
      .prepare(
        "INSERT INTO users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)"
      )
      .bind(username, email, hash, displayName || username)
      .run();
  },

  async findByEmail(db: D1Database, email: string): Promise<User | null> {
    return db.prepare("SELECT * FROM users WHERE email = ?").bind(email).first() as Promise<User | null>;
  },

  async findById(db: D1Database, id: number): Promise<User | null> {
    return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first() as Promise<User | null>;
  },

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  },

  async updateLastLogin(db: D1Database, id: number) {
    return db
      .prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?")
      .bind(id)
      .run();
  },
};