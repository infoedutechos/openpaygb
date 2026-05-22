import { Suspense } from "react";
import TuitionHubBottomNav from "@/components/hub/TuitionHubBottomNav";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-28">
      {children}
      <Suspense fallback={null}>
        <TuitionHubBottomNav />
      </Suspense>
    </div>
  );
}
