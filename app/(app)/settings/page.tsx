import { requireUser } from "@/lib/auth";
import { COMPANY_DEFAULTS } from "@/lib/company";
import { SettingsForm } from "@/components/settings/settings-form";
import type { CompanySettings } from "@/lib/supabase/types";

export default async function SettingsPage() {
  const { supabase } = await requireUser();
  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  const company = (settings ?? {
    id: "00000000-0000-0000-0000-000000000001",
    ...COMPANY_DEFAULTS,
    updated_at: new Date().toISOString(),
  }) as CompanySettings;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Company letterhead, bank details, and document numbering.
        </p>
      </div>
      <SettingsForm settings={company} />
    </div>
  );
}
