import { Search } from "lucide-react";

interface Props {
  placeholder?: string;
}

export default function SearchInput({
  placeholder = "Search...",
}: Props) {
  return (
    <div className="relative w-full">
      <Search
        className="absolute left-4 top-3 text-slate-400"
        size={18}
      />

      <input
        className="
          w-full
          rounded-xl
          border
          border-slate-200
          bg-white
          py-3
          pl-12
          pr-4
          outline-none
          focus:border-blue-500
        "
        placeholder={placeholder}
      />
    </div>
  );
}