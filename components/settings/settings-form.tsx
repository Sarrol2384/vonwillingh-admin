"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanySettings } from "@/lib/actions/settings";
import type { CompanySettings } from "@/lib/supabase/types";

export function SettingsForm({ settings }: { settings: CompanySettings }) {
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCompanySettings(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved");
    });
  }

  return (
    <form
      key={settings.updated_at}
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-8"
    >
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Company identity
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company_name">Company name</Label>
            <Input
              id="company_name"
              name="company_name"
              defaultValue={settings.company_name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_name">Contact name</Label>
            <Input
              id="contact_name"
              name="contact_name"
              defaultValue={settings.contact_name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={settings.email}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" defaultValue={settings.phone} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" defaultValue={settings.website} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              name="address"
              rows={3}
              defaultValue={settings.address}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Registration (optional)
        </h2>
        <p className="text-sm text-muted-foreground">
          Leave blank if you are not VAT registered.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vat_number">VAT number</Label>
            <Input
              id="vat_number"
              name="vat_number"
              defaultValue={settings.vat_number}
              placeholder="Not registered"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registration_number">CIPC / registration</Label>
            <Input
              id="registration_number"
              name="registration_number"
              defaultValue={settings.registration_number}
              placeholder="e.g. 20xx/xxxxxx/xx"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Banking
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bank_name">Bank name</Label>
            <Input
              id="bank_name"
              name="bank_name"
              defaultValue={settings.bank_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_name">Account name</Label>
            <Input
              id="bank_account_name"
              name="bank_account_name"
              defaultValue={settings.bank_account_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_account_number">Account number</Label>
            <Input
              id="bank_account_number"
              name="bank_account_number"
              defaultValue={settings.bank_account_number}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank_branch_code">Branch code</Label>
            <Input
              id="bank_branch_code"
              name="bank_branch_code"
              defaultValue={settings.bank_branch_code}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
          Defaults & numbering
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default_quote_validity_days">
              Quote validity (days)
            </Label>
            <Input
              id="default_quote_validity_days"
              name="default_quote_validity_days"
              type="number"
              min={0}
              defaultValue={settings.default_quote_validity_days}
            />
          </div>
          <input
            type="hidden"
            name="default_payment_terms_days"
            value={settings.default_payment_terms_days}
          />
          <div className="space-y-2">
            <Label htmlFor="quote_prefix">Quote prefix</Label>
            <Input
              id="quote_prefix"
              name="quote_prefix"
              defaultValue={settings.quote_prefix}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoice_prefix">Invoice prefix</Label>
            <Input
              id="invoice_prefix"
              name="invoice_prefix"
              defaultValue={settings.invoice_prefix}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="credit_note_prefix">Credit note prefix</Label>
            <Input
              id="credit_note_prefix"
              name="credit_note_prefix"
              defaultValue={settings.credit_note_prefix}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
