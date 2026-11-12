import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();

  return (
    <div className="flex min-h-screen w-full min-w-0 flex-col md:flex-row">
      <Suspense
        fallback={
          <>
            <div className="h-14 border-b border-sidebar-border bg-sidebar md:hidden" />
            <aside className="hidden w-56 shrink-0 border-r bg-sidebar md:block" />
          </>
        }
      >
        <AppNav />
      </Suspense>
      <main className="min-w-0 flex-1">
        <div className="mx-auto min-w-0 max-w-6xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
