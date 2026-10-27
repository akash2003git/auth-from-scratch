"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type RefreshStatus = "refreshing" | "error";

function safeNext(value: string | null) {
  if (!value) {
    return "/dashboard";
  }

  try {
    const url = new URL(value, window.location.origin);

    if (url.origin !== window.location.origin) {
      return "/dashboard";
    }

    if (url.pathname === "/refresh" || url.pathname.startsWith("/refresh/")) {
      return "/dashboard";
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function RefreshSession() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<RefreshStatus>("refreshing");
  const started = useRef(false);

  const refresh = useCallback(async () => {
    setStatus("refreshing");

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok) {
        setStatus("error");
        return;
      }

      window.location.replace(safeNext(searchParams.get("next")));
    } catch (error) {
      console.error("Session refresh failed", error);
      setStatus("error");
    }
  }, [searchParams]);

  useEffect(() => {
    if (started.current) {
      return;
    }

    started.current = true;
    void refresh();
  }, [refresh]);

  if (status === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 text-center"
      >
        <p className="text-sm text-muted-foreground">
          We couldn&apos;t refresh your session.
        </p>

        <Button type="button" onClick={() => void refresh()}>
          Try again
        </Button>
      </div>
    );
  }

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
