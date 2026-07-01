interface Props {
  status: string;
}

export default function StatusBadge({
  status,
}: Props) {

  const colors: Record<string, string> = {
    Pending:
      "bg-yellow-100 text-yellow-700",

    Resolved:
      "bg-green-100 text-green-700",

    "In Progress":
      "bg-blue-100 text-blue-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm ${
        colors[status] ||
        "bg-gray-100"
      }`}
    >
      {status}
    </span>
  );
}