import type {
  Installation,
  InstallationRepository,
  ReadContext,
  WriteContext,
} from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface InstallationRow {
  created_at: number;
  id: string;
}

export class SqliteInstallationRepository implements InstallationRepository {
  create(context: WriteContext, installation: Installation): void {
    requireSqliteConnection(context)
      .prepare<[string, number]>("INSERT INTO installations (id, created_at) VALUES (?, ?)")
      .run(installation.id, installation.createdAt);
  }

  findFirst(context: ReadContext): Installation | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[], InstallationRow>(
        "SELECT id, created_at FROM installations ORDER BY created_at ASC LIMIT 1",
      )
      .get();
    return row ? { createdAt: row.created_at, id: row.id } : undefined;
  }

  findById(context: ReadContext, id: string): Installation | undefined {
    const row = requireSqliteConnection(context)
      .prepare<[string], InstallationRow>(
        "SELECT id, created_at FROM installations WHERE id = ? LIMIT 1",
      )
      .get(id);
    return row ? { createdAt: row.created_at, id: row.id } : undefined;
  }
}
