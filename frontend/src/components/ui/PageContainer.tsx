import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function PageContainer({
  children,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-[1700px] space-y-8 p-8">
      {children}
    </div>
  );
}