import { Table } from "../../src/index.js";
import { defineShowcase } from "../showcase-definition.js";

function BasicTable() {
  return (
    <Table>
      <thead>
        <tr>
          <th>Project</th>
          <th>Owner</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Website launch</td>
          <td>Maya</td>
          <td>In progress</td>
        </tr>
        <tr>
          <td>Mobile application</td>
          <td>Sam</td>
          <td>Planned</td>
        </tr>
      </tbody>
    </Table>
  );
}

export const tableShowcase = defineShowcase({
  id: "table",
  name: "Table",
  category: "Data display",
  stage: "prod",
  description: "Displays structured records in rows and columns.",
  whenToUse: ["Use a table when users need to scan and compare multiple records."],
  examples: [
    {
      id: "table-basic",
      name: "Basic table",
      preview: BasicTable,
      code: `<Table>\n  <thead>...</thead>\n  <tbody>...</tbody>\n</Table>`,
    },
  ],
  accessibility: ["Use table headings to identify every column."],
});
