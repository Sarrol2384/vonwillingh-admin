import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { AppShellBackground } from "@/components/effects/app-shell-background";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      <AppShellBackground />
      <Suspense fallback={<aside className="relative z-10 w-56 border-r bg-sidebar/80 backdrop-blur-xl" />}>
        <AppNav />
      </Suspense>
      <main className="relative z-10 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
