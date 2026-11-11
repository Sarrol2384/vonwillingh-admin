"use client";

import { useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { payNowPostPath } from "@/lib/payfast-url";
import { cn } from "@/lib/utils";

export function PayNowButton({
  token,
  search,
}: {
  token: string;
  search: string;
}) {
  const [pending, setPending] = useState(false);
  const started = useRef(false);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (started.current) return;
    started.current = true;

    // A fresh form keeps this click as one full POST. Submitting the form
    // that is already handling this event can be ignored, and disabling its
    // button mid-submit cancels the first click.
    const form = document.createElement("form");
    form.method = "POST";
    form.action = payNowPostPath(token, window.location.search);
    document.body.appendChild(form);
    form.submit();
    setPending(true);
  }

  return (
    <form method="post" action={payNowPostPath(token, search)} onSubmit={onSubmit}>
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ size: "lg" }))}
      >
        {pending ? "Taking you to PayFast…" : "Pay now"}
      </button>
    </form>
  );
}
