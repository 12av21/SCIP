"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveComplaint = saveComplaint;
exports.getComplaints = getComplaints;
const client_1 = require("./client");
const dataset = "scip";
const table = "complaints";
async function saveComplaint(complaint) {
    await client_1.bigquery
        .dataset(dataset)
        .table(table)
        .insert([
        {
            ...complaint,
            created_at: new Date(),
        },
    ]);
}
async function getComplaints() {
    const query = `
    SELECT *
    FROM \`scip-500000.scip.complaints\`
    ORDER BY created_at DESC
  `;
    const [rows] = await client_1.bigquery.query(query);
    return rows;
}
