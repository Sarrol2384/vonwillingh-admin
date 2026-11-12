"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  FileSignature,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Users,
  FileMinus2,
  Scale,
  ScrollText,
  Wallet,
  X,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/balances", label: "Balances", icon: Scale },
  { href: "/statements", label: "Statements", icon: ScrollText },
  { href: "/contracts", label: "Contracts", icon: FileSignature },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/items", label: "Items", icon: Package },
  { href: "/documents?type=quote", label: "Quotes", icon: FileText, type: "quote" },
  {
    href: "/documents?type=invoice",
    label: "Invoices",
    icon: Receipt,
    type: "invoice",
  },
  {
    href: "/documents?type=credit_note",
    label: "Credit notes",
    icon: FileMinus2,
    type: "credit_note",
  },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
      {links.map((link) => {
        let active = false;
        if (link.href === "/dashboard") {
          active = pathname === "/dashboard";
        } else if ("type" in link && link.type) {
          active = pathname.startsWith("/documents") && currentType === link.type;
        } else {
          active = pathname.startsWith(link.href);
        }

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({
  onNavigate,
  showClose,
}: {
  onNavigate?: () => void;
  showClose?: boolean;
}) {
  return (
    <div className="border-b border-sidebar-border p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="VonWillingh Online"
            className="h-16 w-auto"
          />
        </Link>
        {showClose ? (
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Close menu"
            autoFocus
            onClick={onNavigate}
          >
            <X />
          </Button>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Billing, contracts & payments
      </p>
    </div>
  );
}

function SidebarPanel({ onNavigate, showClose }: { onNavigate?: () => void; showClose?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    onNavigate?.();
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Brand onNavigate={onNavigate} showClose={showClose} />
      <Suspense fallback={<div className="flex-1 p-2" />}>
        <NavLinks onNavigate={onNavigate} />
      </Suspense>
      <div
        className={cn(
          "border-t border-sidebar-border p-2",
          showClose && "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const routeKey = `${pathname}?${search}`;
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === routeKey;

  function closeMenu() {
    setOpenPath(null);
  }

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenPath(null);
    }

    const desktop = window.matchMedia("(min-width: 768px)");
    function onDesktopChange() {
      if (desktop.matches) setOpenPath(null);
    }

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktopChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktopChange);
    };
  }, [open]);

  return (
    <>
      <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-2 py-2 text-sidebar-foreground md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpenPath(routeKey)}
        >
          <Menu />
        </Button>
        <Link href="/dashboard" className="flex min-w-0 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="VonWillingh Online"
            className="h-10 w-auto"
          />
        </Link>
      </header>

      {open ? (
        <div className="no-print fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            aria-hidden="true"
            onClick={closeMenu}
          />
          <aside
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="relative flex h-full w-64 max-w-[85vw] flex-col overflow-y-auto bg-sidebar text-sidebar-foreground shadow-xl"
          >
            <SidebarPanel showClose onNavigate={closeMenu} />
          </aside>
        </div>
      ) : null}

      <aside className="no-print hidden w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <SidebarPanel />
      </aside>
    </>
  );
}
