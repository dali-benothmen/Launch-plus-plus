import type { ReadContext, WriteContext } from "@launchpp/core";
import { requireSqliteConnection } from "./context.js";

interface InstallationSettingsRow {
  developer_mode_enabled: number;
}

export class SqliteInstallationSettingsRepository {
  developerModeEnabled(context: ReadContext, installationId: string): boolean {
    const row = requireSqliteConnection(context)
      .prepare<[string], InstallationSettingsRow>(
        "SELECT developer_mode_enabled FROM installations WHERE id = ? LIMIT 1",
      )
      .get(installationId);
    return row?.developer_mode_enabled === 1;
  }

  setDeveloperModeEnabled(context: WriteContext, installationId: string, enabled: boolean): void {
    const result = requireSqliteConnection(context)
      .prepare<[number, string]>("UPDATE installations SET developer_mode_enabled = ? WHERE id = ?")
      .run(enabled ? 1 : 0, installationId);
    if (result.changes !== 1) throw new Error("Installation settings are unavailable");
  }
}
