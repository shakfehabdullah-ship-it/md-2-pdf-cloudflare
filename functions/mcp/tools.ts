// ── MCP Tools definitions ───────────────────────────────────────────────────
// Central place where MCP tools are registered. Each tool wraps the existing
// converter engine / D1 models so AI agents can drive md-2-pdf remotely.
//
// Spec: https://modelcontextprotocol.io  ·  https://developers.cloudflare.com/agents/model-context-protocol/

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  convertMarkdownToPdf,
  parseMarkdown,
  markdownToHtml,
} from "../engine/converter.js";
import { DocumentModel } from "../db/models/document.js";
import type { Env } from "../types/env.js";

// Reusable Zod schemas -------------------------------------------------------
const conversionOptionsSchema = {
  pageSize: z
    .enum(["A4", "Letter", "Legal"])
    .optional()
    .describe("Output page size (default A4)"),
  orientation: z
    .enum(["portrait", "landscape"])
    .optional()
    .describe("Page orientation (default portrait)"),
  direction: z
    .enum(["rtl", "ltr", "hybrid"])
    .optional()
    .describe(
      "Text direction. rtl = Arabic/Hebrew base, ltr = Latin base, hybrid = auto per paragraph"
    ),
  rtl: z
    .boolean()
    .optional()
    .describe("Legacy flag – sets direction=rtl. Prefer the `direction` param."),
  fontSize: z.number().int().min(8).max(24).optional().describe("Body font size in px (default 10)"),
  fontFamily: z
    .string()
    .optional()
    .describe("CSS font-family for body text"),
  margin: z
    .object({
      top: z.string().optional(),
      right: z.string().optional(),
      bottom: z.string().optional(),
      left: z.string().optional(),
    })
    .optional()
    .describe("Page margins as CSS lengths, e.g. { top: '20mm' }"),
  headerTemplate: z.string().optional().describe("Puppeteer header HTML template"),
  footerTemplate: z.string().optional().describe("Puppeteer footer HTML template"),
  css: z
    .string()
    .optional()
    .describe("Extra CSS appended to the document <style> block"),
  theme: z.string().optional().describe("Theme key stored in document history"),
};

// Helpers --------------------------------------------------------------------

/** Pull an auth subject out of the MCP `_meta` bag (or headers) on a tool call. */
function extractAuth(
  extra: any
): { userId?: number; guestSessionId?: string } {
  const meta = extra?._meta ?? {};
  // Allow either { auth: { token } } / { auth: { guestSessionId } } or flat fields.
  const auth = meta.auth ?? meta;
  const token: string | undefined = auth.token ?? auth.bearerToken;
  const guest: string | undefined = auth.guestSessionId ?? auth.guest;

  if (token) {
    // Lightweight decode of JWT payload to extract userId (no Buffer needed – Workers-safe).
    try {
      const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(
        atob(part)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const payload = JSON.parse(json);
      if (payload?.userId) {
        return { userId: Number(payload.userId) };
      }
    } catch {
      /* ignore – fall through */
    }
  }
  if (guest) return { guestSessionId: guest };
  return {};
}

// ── Build the server ─────────────────────────────────────────────────────────

export function createMcpServer(env: Env): McpServer {
  const server = new McpServer({
    name: "md-2-pdf",
    version: "2.1.0",
  });

  // ── Tool: convert-markdown-to-pdf ─────────────────────────────────────────
  server.tool(
    "convert-markdown-to-pdf",
    "Convert Markdown text into a styled PDF. Supports frontmatter (title/author/subject/keywords/date), GitHub-Dark-Dimmed code highlighting, KaTeX math ($...$ and $$...$$), PlantUML diagrams, and Arabic/RTL layouts. Returns the PDF as base64 so the agent can write it to disk or stream it onward.",
    {
      markdown: z
        .string()
        .min(1)
        .describe("Markdown source text (required). Frontmatter is honoured."),
      filename: z
        .string()
        .optional()
        .describe("Suggested output filename (cosmetic – returned in metadata only)"),
      saveToHistory: z
        .boolean()
        .optional()
        .describe(
          "If true AND auth is provided, persist the conversion in document history. Default false."
        ),
      ...conversionOptionsSchema,
    },
    async (args, extra) => {
      const { markdown, filename, saveToHistory = false, ...options } = args;

      // Merge frontmatter title into options if supplied standalone.
      const result = await convertMarkdownToPdf(
        markdown,
        options as any,
        env.RENDER_PDF_URL
      );

      if (!result.success) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `PDF conversion failed: ${result.error ?? "unknown error"}`,
            },
          ],
        };
      }

      // Optional history persistence.
      if (saveToHistory) {
        const { userId, guestSessionId } = extractAuth(extra);
        if ((userId || guestSessionId) && env.DB) {
          try {
            await DocumentModel.create(env.DB, {
              user_id: userId ?? null,
              guest_session_id: guestSessionId ?? null,
              title: result.metadata.title || "Untitled",
              filename: filename ?? `${result.metadata.title || "document"}.pdf`,
              markdown_content: markdown,
              markdown_size: new TextEncoder().encode(markdown).length,
              pdf_size: result.pdfBase64
                ? atob(result.pdfBase64).length
                : 0,
              pdf_generated: true,
              theme: (options as any).theme || "default",
              page_size: (options as any).pageSize || "A4",
              orientation: (options as any).orientation || "portrait",
            });
          } catch {
            /* history is best-effort */
          }
        }
      }

      const suggestedName = filename ?? `${result.metadata.title || "document"}.pdf`;

      // Return the PDF base64 as a single text block. Agents know how to decode
      // base64 and write the bytes to disk, pipe to a printer, or upload. Splitting
      // into two blocks (preamble + payload) keeps the payload easy to slice out.
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ok: true,
                filename: suggestedName,
                mimeType: "application/pdf",
                encoding: "base64",
                sizeBytes: result.pdfBase64
                  ? Math.floor((result.pdfBase64.length * 3) / 4)
                  : 0,
                metadata: result.metadata,
                payload: result.pdfBase64,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── Tool: parse-markdown ──────────────────────────────────────────────────
  server.tool(
    "parse-markdown",
    "Parse Markdown into styled HTML + extract its frontmatter metadata. Performs no network PDF rendering, so it is fast and side-effect free. Useful when an agent wants to inspect or transform the document before committing to a PDF.",
    {
      markdown: z.string().min(1).describe("Markdown source text (required)"),
      ...conversionOptionsSchema,
    },
    async (args) => {
      const { markdown, ...options } = args;
      const { metadata, content } = parseMarkdown(markdown);
      const html = markdownToHtml(content, metadata, options as any);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                metadata,
                htmlLength: html.length,
              },
              null,
              2
            ),
          },
          {
            type: "text",
            text: html,
          },
        ],
      };
    }
  );

  // ── Tool: list-documents ──────────────────────────────────────────────────
  server.tool(
    "list-documents",
    "List previously converted documents for the authenticated user or guest session. Requires auth (`_meta.auth.token` for JWT or `_meta.auth.guestSessionId` for guest).",
    {
      limit: z.number().int().min(1).max(200).optional().describe("Max items (default 50)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset (default 0)"),
      search: z
        .string()
        .optional()
        .describe("Optional substring search against document titles"),
    },
    async (args, extra) => {
      const { userId, guestSessionId } = extractAuth(extra);
      if (!userId && !guestSessionId) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Authentication required. Pass `_meta.auth.token` (JWT) or `_meta.auth.guestSessionId`.",
            },
          ],
        };
      }
      const limit = args.limit ?? 50;
      const offset = args.offset ?? 0;
      let documents: any[];
      if (userId) {
        const res = args.search
          ? await DocumentModel.search(env.DB, args.search, userId)
          : await DocumentModel.findByUserId(env.DB, userId, limit, offset);
        // D1 helpers return either a D1Result (has .results) or already an array-shaped object.
        documents = (res as any)?.results ?? (res as any) ?? [];
      } else {
        const res: any = await DocumentModel.findByGuestSession(
          env.DB,
          guestSessionId!,
          limit,
          offset
        );
        documents = res?.results ?? res ?? [];
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, count: documents.length, documents },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ── Tool: get-document ────────────────────────────────────────────────────
  server.tool(
    "get-document",
    "Fetch a single stored document (markdown content + metadata) by its numeric ID. Does NOT require auth (documents are keyed by ID) – the caller is responsible for knowing which IDs it owns.",
    {
      id: z.number().int().positive().describe("Document ID (required)"),
    },
    async (args) => {
      const doc = await DocumentModel.findById(env.DB, args.id);
      if (!doc) {
        return {
          isError: true,
          content: [{ type: "text", text: `Document ${args.id} not found` }],
        };
      }
      return {
        content: [
          { type: "text", text: JSON.stringify({ success: true, document: doc }, null, 2) },
        ],
      };
    }
  );

  // ── Tool: create-guest-session ────────────────────────────────────────────
  server.tool(
    "create-guest-session",
    "Create an anonymous guest session UUID. Use the returned `guestSessionId` as `_meta.auth.guestSessionId` on subsequent tool calls to persist conversion history without registering a full account.",
    {},
    async () => {
      const guestSessionId = crypto.randomUUID();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                guestSessionId,
                usage:
                  "Pass this value as `_meta.auth.guestSessionId` on convert-markdown-to-pdf (with saveToHistory=true) or list-documents.",
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}
