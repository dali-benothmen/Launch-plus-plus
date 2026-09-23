import type { ReadContext, SearchRepository, SearchResult } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface SearchRow {
  readonly project_id: string;
  readonly resource_id: string;
  readonly resource_type: "project" | "task";
  readonly subtitle: string;
  readonly title: string;
  readonly organization_id: string;
}

function ftsQuery(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => `"${token.replaceAll('"', '""')}"*`)
    .join(" AND ");
}

export class SqliteSearchRepository implements SearchRepository {
  search(
    context: ReadContext,
    input: Readonly<{
      limit: number;
      projectId?: string;
      query: string;
      userId: string;
      organizationId?: string;
    }>,
  ): readonly SearchResult[] {
    const filters = ["member.user_id = ?", "member.state = 'active'", "search_documents MATCH ?"];
    const parameters: Array<number | string> = [input.userId, ftsQuery(input.query)];
    if (input.organizationId) {
      filters.push("search_documents.organization_id = ?");
      parameters.push(input.organizationId);
    }
    if (input.projectId) {
      filters.push("search_documents.project_id = ?");
      parameters.push(input.projectId);
    }
    parameters.push(input.limit);
    return requireSqliteConnection(context)
      .prepare<Array<number | string>, SearchRow>(
        `SELECT search_documents.resource_id, search_documents.resource_type,
                search_documents.organization_id, search_documents.project_id,
                search_documents.title, search_documents.subtitle
         FROM search_documents
         INNER JOIN organization_members member
           ON member.organization_id = search_documents.organization_id
         WHERE ${filters.join(" AND ")}
         ORDER BY bm25(search_documents), search_documents.title COLLATE NOCASE ASC
         LIMIT ?`,
      )
      .all(...parameters)
      .map((row) =>
        Object.freeze({
          kind: row.resource_type,
          projectId: row.project_id,
          resourceId: row.resource_id,
          subtitle: row.subtitle,
          title: row.title,
          organizationId: row.organization_id,
        }),
      );
  }
}
