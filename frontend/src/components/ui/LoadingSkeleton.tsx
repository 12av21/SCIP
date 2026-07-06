export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">

      <div className="h-10 w-72 rounded-xl bg-slate-200" />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-40 rounded-3xl bg-slate-200"
          />
        ))}

      </div>

      <div className="h-96 rounded-3xl bg-slate-200" />

    </div>
  );
}