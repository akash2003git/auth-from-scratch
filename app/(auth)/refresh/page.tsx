import { Suspense } from "react";
import { RefreshSession } from "@/components/auth/refresh-session";

function RefreshFallback() {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-sm text-muted-foreground"
    >
      Refreshing session...
    </p>
  );
}

export default function RefreshPage() {
  return (
    <div className="flex w-full justify-center">
      <Suspense fallback={<RefreshFallback />}>
        <RefreshSession />
      </Suspense>
    </div>
  );
}
