interface Props {
  level: string;
  score: number;
}

export default function PriorityBadge({
  level,
  score,
}: Props) {

  let color =
    "bg-green-100 text-green-700";

  if (level === "Medium")
    color =
      "bg-yellow-100 text-yellow-700";

  if (level === "High")
    color =
      "bg-orange-100 text-orange-700";

  if (level === "Critical")
    color =
      "bg-red-100 text-red-700";

  return (
    <span
      className={`px-3 py-1 rounded-full font-semibold ${color}`}
    >
      {level} ({score})
    </span>
  );
}