import { CalendarDays, Sparkles } from "lucide-react";

export default function PageHeader() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 rounded-3xl text-white p-8 mb-8 shadow-xl">

      <div className="flex justify-between items-start flex-wrap gap-6">

        <div>

          <h1 className="text-4xl font-bold">
            Welcome Back 👋
          </h1>

          <p className="mt-3 text-blue-100 text-lg">
            Smart Community Intelligence Platform
          </p>

          <div className="flex items-center gap-2 mt-6 text-blue-100">

            <CalendarDays size={18} />

            <span>{today}</span>

          </div>

        </div>

        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-5">

          <div className="flex items-center gap-3">

            <Sparkles />

            <div>

              <p className="font-semibold">
                AI Status
              </p>

              <p className="text-sm text-blue-100">
                Community monitoring active
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}