import fs from "fs/promises";
import path from "path";

const FILE_PATH = path.join(
  process.cwd(),
  "data",
  "complaints.json"
);

export async function getComplaints() {
  try {
    const data = await fs.readFile(
      FILE_PATH,
      "utf-8"
    );

    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveComplaint(
  complaint: any
) {
  const complaints =
    await getComplaints();

  complaints.push(complaint);

  await fs.writeFile(
    FILE_PATH,
    JSON.stringify(
      complaints,
      null,
      2
    )
  );
}
export async function updateComplaintStatus(
id: string,
status: string
) {
const complaints =
await getComplaints();

const updated = complaints.map(
(item: any) =>
item.id === id
? { ...item, status }
: item
);

await fs.writeFile(
FILE_PATH,
JSON.stringify(
updated,
null,
2
)
);

return updated;
}
