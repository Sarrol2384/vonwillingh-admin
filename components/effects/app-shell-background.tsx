"use client";

import { AmbientBackground } from "@/components/effects/ambient-background";
import { ShaderBackground } from "@/components/effects/shader-background";

export function AppShellBackground() {
  return (
    <>
      <AmbientBackground />
      <ShaderBackground
        hue={228}
        speed={0.22}
        intensity={0.55}
        complexity={4}
        interactive
        overlayClassName="from-background/50 via-background/62 to-background/78"
      />
    </>
  );
}
