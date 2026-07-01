import { bigquery } from "./client";

const dataset = "scip";
const table = "complaints";

export async function saveComplaint(
  complaint: any
) {
  await bigquery
    .dataset(dataset)
    .table(table)
    .insert([
      {
        ...complaint,
        created_at: new Date(),
      },
    ]);
}

export async function getComplaints() {
  const query = `
    SELECT *
    FROM \`scip-500000.scip.complaints\`
    ORDER BY created_at DESC
  `;

  const [rows] = await bigquery.query(query);

  return rows;
}