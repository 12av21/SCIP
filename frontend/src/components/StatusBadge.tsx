interface Props {
  status: string;
}

const STATUS_CLASS: Record<string, string> = {
  Pending: "badge badge-pending",
  Resolved: "badge badge-resolved",
  "In Progress": "badge badge-progress",
};

export default function StatusBadge({ status }: Props) {
  return <span className={STATUS_CLASS[status] ?? "badge badge-progress"}>{status}</span>;
}
