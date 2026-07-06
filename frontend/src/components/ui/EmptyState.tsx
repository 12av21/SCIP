import { Inbox } from "lucide-react";

interface Props {
  title: string;
  description: string;
}

export default function EmptyState({
  title,
  description,
}: Props) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">

      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">

        <Inbox
          size={36}
          className="text-slate-400"
        />

      </div>

      <h2 className="text-2xl font-bold">
        {title}
      </h2>

      <p className="mx-auto mt-3 max-w-md text-slate-500">
        {description}
      </p>

    </div>
  );
}