"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/user/provider";
import { Loader2 } from "lucide-react";

export default function GatePage() {
  const router = useRouter();
  const { user, ready } = useCurrentUser();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? "/home" : "/onboarding");
  }, [ready, user, router]);

  return (
    <main className="flex min-h-svh items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </main>
  );
}
