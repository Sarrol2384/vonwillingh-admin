"use client";

import { Download } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DownloadWordButton({
  kind,
  id,
  label = "Download Word",
  className,
}: {
  kind: string;
  id: string;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={`/api/export/docx/${kind}/${id}`}
      download
      className={cn(buttonVariants({ variant: "outline", size: "default" }), className)}
    >
      <Download className="mr-1 h-4 w-4" />
      {label}
    </a>
  );
}
