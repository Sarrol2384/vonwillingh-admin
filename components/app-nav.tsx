"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Settings,
  Users,
  FileMinus2,
} from "lucide-react";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
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

function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type");

  return (
    <nav className="flex-1 space-y-0.5 p-2">
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
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-background font-medium text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppNav() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="no-print flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo.png"
            alt="VonWillingh Online"
            className="h-16 w-auto"
          />
        </Link>
        <p className="mt-2 text-xs text-muted-foreground">Invoices & Quotes</p>
      </div>
      <Suspense fallback={<div className="flex-1 p-2" />}>
        <NavLinks />
      </Suspense>
      <div className="border-t border-sidebar-border p-2">
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
    </aside>
  );
}
