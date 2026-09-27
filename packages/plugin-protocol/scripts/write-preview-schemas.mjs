import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PluginPackageIntegritySchema,
  PluginPackageManifestSchema,
  PluginSourceManifestSchema,
} from "../dist/index.js";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaDirectory = path.join(packageRoot, "schemas");
const documents = [
  ["plugin-source-v1-preview.json", PluginSourceManifestSchema],
  ["plugin-package-manifest-v1-preview.json", PluginPackageManifestSchema],
  ["plugin-package-integrity-v1-preview.json", PluginPackageIntegritySchema],
];

function removeNestedIds(value, root = true) {
  if (Array.isArray(value)) return value.map((item) => removeNestedIds(item, false));
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => root || key !== "$id")
      .map(([key, item]) => [key, removeNestedIds(item, false)]),
  );
}

await mkdir(schemaDirectory, { recursive: true });
for (const [fileName, schema] of documents) {
  const document = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    ...removeNestedIds(schema),
  };
  await writeFile(
    path.join(schemaDirectory, fileName),
    `${JSON.stringify(document, null, 2)}\n`,
    "utf8",
  );
}
