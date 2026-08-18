import { XMLParser } from "fast-xml-parser";
import { db, uid, now } from "./db";
import type { Connector, SourceItem } from "./types";

/**
 * Ingestion RSS 2.0 et Atom. Les entrées sont dédupliquées par GUID sur
 * (connecteur, guid) : re-parcourir un flux ne recrée jamais de doublon.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  trimValues: true,
});

type ParsedEntry = {
  guid: string;
  title: string;
  url: string | null;
  summary: string | null;
  publishedAt: number | null;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

/** Retire le balisage et normalise les espaces d'un résumé HTML. */
function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDate(value: unknown): number | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

/** Extrait le lien d'une entrée Atom : on privilégie rel="alternate". */
function atomLink(entry: Record<string, unknown>): string | null {
  const links = asArray(entry.link as Record<string, unknown> | Record<string, unknown>[] | undefined);
  if (links.length === 0) return null;

  const alternate =
    links.find((link) => link?.["@_rel"] === "alternate") ??
    links.find((link) => !link?.["@_rel"]) ??
    links[0];

  const href = alternate?.["@_href"];
  return typeof href === "string" ? href : null;
}

type XmlNode = Record<string, unknown>;

function node(value: unknown): XmlNode | undefined {
  return value && typeof value === "object" ? (value as XmlNode) : undefined;
}

export function parseFeed(xml: string): { title: string; entries: ParsedEntry[] } {
  const parsed = parser.parse(xml) as XmlNode;

  // RSS 2.0
  const channel = node(node(parsed.rss)?.channel);
  if (channel) {
    const entries = asArray(node(channel) ? (channel.item as XmlNode | XmlNode[]) : undefined).map(
      (item): ParsedEntry => {
        const link = text(item.link) || null;
        return {
          guid: text(item.guid) || link || text(item.title),
          title: stripHtml(text(item.title)) || "Sans titre",
          url: link,
          summary: stripHtml(text(item.description) || text(item["content:encoded"])) || null,
          publishedAt: parseDate(item.pubDate),
        };
      },
    );
    return { title: stripHtml(text(channel.title)) || "Flux RSS", entries };
  }

  // Atom
  const feed = node(parsed.feed);
  if (feed) {
    const entries = asArray(feed.entry as XmlNode | XmlNode[]).map((entry): ParsedEntry => {
      const link = atomLink(entry);
      return {
        guid: text(entry.id) || link || text(entry.title),
        title: stripHtml(text(entry.title)) || "Sans titre",
        url: link,
        summary: stripHtml(text(entry.summary) || text(entry.content)) || null,
        publishedAt: parseDate(entry.updated) ?? parseDate(entry.published),
      };
    });
    return { title: stripHtml(text(feed.title)) || "Flux Atom", entries };
  }

  throw new Error("Format de flux non reconnu : ni RSS 2.0 ni Atom.");
}

export async function fetchFeed(url: string) {
  const response = await fetch(url, {
    headers: { "User-Agent": "LONTSI/1.0 (+https://lontsi.app)", Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) throw new Error(`Flux injoignable (HTTP ${response.status})`);
  return parseFeed(await response.text());
}

/**
 * Récupère un connecteur et enregistre les entrées inédites.
 * Retourne les nouveaux éléments, dans l'ordre de publication.
 */
export async function ingestConnector(connector: Connector): Promise<SourceItem[]> {
  try {
    const feed = await fetchFeed(connector.url);
    const insert = db().prepare(
      `INSERT OR IGNORE INTO source_items
        (id, connector_id, guid, title, url, summary, published_at, processed, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    );

    const inserted: string[] = [];
    const transaction = db().transaction((entries: ParsedEntry[]) => {
      for (const entry of entries) {
        const id = uid("itm");
        const result = insert.run(
          id,
          connector.id,
          entry.guid,
          entry.title,
          entry.url,
          entry.summary,
          entry.publishedAt,
          now(),
        );
        if (result.changes > 0) inserted.push(id);
      }
    });
    transaction(feed.entries);

    db()
      .prepare(`UPDATE connectors SET last_fetched_at = ?, last_error = NULL WHERE id = ?`)
      .run(now(), connector.id);

    if (inserted.length === 0) return [];

    const placeholders = inserted.map(() => "?").join(",");
    return db()
      .prepare(
        `SELECT * FROM source_items WHERE id IN (${placeholders})
         ORDER BY COALESCE(published_at, created_at) ASC`,
      )
      .all(...inserted) as SourceItem[];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    db()
      .prepare(`UPDATE connectors SET last_fetched_at = ?, last_error = ? WHERE id = ?`)
      .run(now(), message, connector.id);
    throw error;
  }
}
