interface Props {
  color?: "blue" | "green" | "yellow" | "red";
  children: React.ReactNode;
}

export default function Badge({
  color = "blue",
  children,
}: Props) {
  const colors = {
    blue:
      "bg-blue-100 text-blue-700",

    green:
      "bg-green-100 text-green-700",

    yellow:
      "bg-yellow-100 text-yellow-700",

    red:
      "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`
        rounded-full
        px-3
        py-1
        text-xs
        font-semibold
        ${colors[color]}
      `}
    >
      {children}
    </span>
  );
}