"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteClientDocument,
  updateClientDocument,
} from "@/lib/actions/client-documents";
import {
  CLIENT_DOCUMENT_TYPE_LABELS,
  type AgreementContent,
  type DiscoveryBriefContent,
} from "@/lib/client-documents";
import type { Client, ClientDocument, ClientDocumentType } from "@/lib/supabase/types";
import { DownloadWordButton } from "@/components/documents/download-word-button";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Field({
  label,
  name,
  value,
  onChange,
  multiline = false,
  rows = 3,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {multiline ? (
        <Textarea
          id={name}
          name={name}
          rows={rows}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
        />
      ) : (
        <Input
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}
    </div>
  );
}

export function ClientDocumentEditor({
  clientDocument,
  client,
}: {
  clientDocument: ClientDocument;
  client: Client;
}) {
  const [pending, startTransition] = useTransition();
  const initial = useMemo(
    () => (clientDocument.content ?? {}) as Record<string, string>,
    [clientDocument.content],
  );
  const [title, setTitle] = useState(clientDocument.title);
  const [status, setStatus] = useState(clientDocument.status);
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initial).map(([k, v]) => [k, String(v ?? "")]),
    ),
  );

  function updateField(name: string, value: string) {
    setFields((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("client_id", client.id);
    formData.set("type", clientDocument.type);
    formData.set("title", title);
    formData.set("status", status);
    formData.set("content", JSON.stringify(fields));
    startTransition(async () => {
      const result = await updateClientDocument(clientDocument.id, formData);
      if (!result.ok) toast.error(result.error);
      else toast.success("Saved");
    });
  }

  function handleDelete() {
    if (!confirm(`Delete ${title}?`)) return;
    startTransition(async () => {
      const result = await deleteClientDocument(clientDocument.id);
      if (result && "ok" in result && !result.ok) toast.error(result.error);
    });
  }

  const type = clientDocument.type as ClientDocumentType;
  const exportKind = type;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-2">
        <DownloadWordButton kind={exportKind} id={clientDocument.id} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="destructive" disabled={pending} onClick={handleDelete}>
          Delete
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className={selectClassName}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="signed">Signed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Client: {client.business_name?.trim() || client.name} · Type:{" "}
        {CLIENT_DOCUMENT_TYPE_LABELS[type]}
      </p>

      {type === "service_agreement" ? (
        <AgreementFields fields={fields as AgreementContent} onChange={updateField} />
      ) : (
        <DiscoveryBriefFields fields={fields as DiscoveryBriefContent} onChange={updateField} />
      )}
    </form>
  );
}

function AgreementFields({
  fields,
  onChange,
}: {
  fields: AgreementContent;
  onChange: (name: string, value: string) => void;
}) {
  const v = (key: keyof AgreementContent) => fields[key] ?? "";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Agreement date" name="agreement_date" value={v("agreement_date")} onChange={onChange} />
        <Field label="Go-live date" name="go_live_date" value={v("go_live_date")} onChange={onChange} />
      </div>
      <Field label="Project title" name="project_title" value={v("project_title")} onChange={onChange} />
      <Field label="Project description" name="project_description" value={v("project_description")} onChange={onChange} multiline rows={3} />
      <Field label="Scope of work" name="scope" value={v("scope")} onChange={onChange} multiline rows={5} />
      <Field label="Deliverables" name="deliverables" value={v("deliverables")} onChange={onChange} multiline rows={4} />
      <Field label="Timeline notes" name="timeline_notes" value={v("timeline_notes")} onChange={onChange} multiline rows={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Total fee" name="total_fee" value={v("total_fee")} onChange={onChange} />
        <Field label="Deposit" name="deposit" value={v("deposit")} onChange={onChange} />
        <Field label="Balance due" name="balance" value={v("balance")} onChange={onChange} />
        <Field label="Payment terms (days)" name="payment_terms_days" value={v("payment_terms_days")} onChange={onChange} />
      </div>
      <Field label="Payment notes" name="payment_notes" value={v("payment_notes")} onChange={onChange} multiline rows={2} />
      <Field label="Exclusions / out of scope" name="exclusions" value={v("exclusions")} onChange={onChange} multiline rows={3} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Acceptance name" name="acceptance_name" value={v("acceptance_name")} onChange={onChange} />
        <Field label="Acceptance date" name="acceptance_date" value={v("acceptance_date")} onChange={onChange} />
      </div>
    </div>
  );
}

function DiscoveryBriefFields({
  fields,
  onChange,
}: {
  fields: DiscoveryBriefContent;
  onChange: (name: string, value: string) => void;
}) {
  const v = (key: keyof DiscoveryBriefContent) => fields[key] ?? "";
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Meeting date" name="meeting_date" value={v("meeting_date")} onChange={onChange} />
        <Field label="Prepared by" name="prepared_by" value={v("prepared_by")} onChange={onChange} />
        <Field label="Client attendees" name="client_attendees" value={v("client_attendees")} onChange={onChange} />
        <Field label="VonWillingh attendees" name="vonwillingh_attendees" value={v("vonwillingh_attendees")} onChange={onChange} />
      </div>
      <Field label="Project title" name="project_title" value={v("project_title")} onChange={onChange} />
      <Field label="Industry / niche" name="industry" value={v("industry")} onChange={onChange} />
      <Field label="Business summary" name="business_summary" value={v("business_summary")} onChange={onChange} multiline rows={3} />
      <Field label="Existing website" name="existing_website" value={v("existing_website")} onChange={onChange} />
      <Field label="Social media" name="social_media" value={v("social_media")} onChange={onChange} />
      <Field label="Competitors / reference sites" name="competitors" value={v("competitors")} onChange={onChange} multiline rows={2} />
      <Field label="Custom app problem (if applicable)" name="custom_app_problem" value={v("custom_app_problem")} onChange={onChange} multiline rows={3} />
      <Field label="Primary goal" name="primary_goal" value={v("primary_goal")} onChange={onChange} />
      <Field label="Target audience" name="target_audience" value={v("target_audience")} onChange={onChange} />
      <Field label="Success in 3-6 months" name="success_metric" value={v("success_metric")} onChange={onChange} multiline rows={2} />
      <Field label="Why now?" name="why_now" value={v("why_now")} onChange={onChange} multiline rows={2} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand colours" name="brand_colours" value={v("brand_colours")} onChange={onChange} />
        <Field label="Style words" name="style_words" value={v("style_words")} onChange={onChange} />
        <Field label="Sites they like" name="sites_like" value={v("sites_like")} onChange={onChange} />
        <Field label="Sites they dislike" name="sites_dislike" value={v("sites_dislike")} onChange={onChange} />
      </div>
      <Field label="Homepage message" name="homepage_message" value={v("homepage_message")} onChange={onChange} multiline rows={2} />
      <Field label="Domain" name="domain" value={v("domain")} onChange={onChange} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Go-live date" name="go_live_date" value={v("go_live_date")} onChange={onChange} />
        <Field label="Hard deadline" name="deadline" value={v("deadline")} onChange={onChange} />
        <Field label="Decision-makers" name="decision_makers" value={v("decision_makers")} onChange={onChange} />
        <Field label="Estimated page count" name="page_count" value={v("page_count")} onChange={onChange} />
      </div>
      <Field label="Meeting notes" name="meeting_notes" value={v("meeting_notes")} onChange={onChange} multiline rows={5} />
      <Field label="Next steps" name="next_steps" value={v("next_steps")} onChange={onChange} multiline rows={3} />
    </div>
  );
}
