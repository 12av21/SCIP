interface Props {
  level: string;
  score: number;
}

const LEVEL_CLASS: Record<string, string> = {
  Low: "badge badge-resolved",
  Medium: "badge badge-pending",
  High: "badge badge-risk",
  Critical: "badge badge-critical",
};

export default function PriorityBadge({ level, score }: Props) {
  return (
    <span className={LEVEL_CLASS[level] ?? "badge badge-progress"}>
      {level} <span className="mono">({score})</span>
    </span>
  );
}
