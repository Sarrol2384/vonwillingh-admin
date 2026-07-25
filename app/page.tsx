import Link from "next/link";
import { ShaderBackground } from "@/components/effects/shader-background";
import { LinkButton } from "@/components/ui/link-button";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden p-6">
      <ShaderBackground
        hue={220}
        speed={0.3}
        intensity={0.95}
        interactive
        overlayClassName="from-background/40 via-background/55 to-background/70"
      />
      <div className="relative z-10 flex flex-col items-center gap-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="VonWillingh Online" className="h-24 w-auto" />
        <h1 className="text-3xl font-semibold tracking-tight">VonWillingh Admin</h1>
        <p className="max-w-md text-muted-foreground">
          Clients, quotes, invoices, agreements — with Word export built in.
        </p>
        <LinkButton href="/login" size="lg">
          Go to sign in
        </LinkButton>
        <Link
          href="/demo/shader"
          className="text-sm text-muted-foreground underline hover:text-foreground"
        >
          Preview background effect
        </Link>
      </div>
    </div>
  );
}
