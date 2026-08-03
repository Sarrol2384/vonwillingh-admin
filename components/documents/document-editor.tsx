"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createDocument,
  updateDocument,
} from "@/lib/actions/documents";
import { statusesForType, DOCUMENT_TYPE_LABELS } from "@/lib/documents";
import {
  calcDocumentTotals,
  calcLineTotals,
  DEFAULT_VAT_RATE,
  formatZar,
  todayIsoDate,
} from "@/lib/money";
import type {
  CatalogItem,
  Client,
  Document,
  DocumentLine,
  DocumentStatus,
  DocumentType,
} from "@/lib/supabase/types";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type LineDraft = {
  key: string;
  description: string;
  qty: string;
  unit_price: string;
  vat_rate: string;
  done_date: string;
};

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    qty: "1",
    unit_price: "0",
    vat_rate: String(DEFAULT_VAT_RATE),
    done_date: "",
  };
}

function toDraft(lines: DocumentLine[]): LineDraft[] {
  if (!lines.length) {
    return [emptyLine()];
  }
  return [...lines]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((line) => ({
      key: line.id,
      description: line.description,
      qty: String(line.qty),
      unit_price: String(line.unit_price),
      vat_rate: String(line.vat_rate),
      done_date: line.done_date ?? "",
    }));
}

export function DocumentEditor({
  mode,
  documentType,
  clients,
  catalogItems = [],
  document,
  lines = [],
  defaultDueOrValid,
}: {
  mode: "create" | "edit";
  documentType: DocumentType;
  clients: Client[];
  catalogItems?: CatalogItem[];
  document?: Document;
  lines?: DocumentLine[];
  defaultDueOrValid?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type] = useState<DocumentType>(document?.type ?? documentType);
  const [clientId, setClientId] = useState(document?.client_id ?? "");
  const [status, setStatus] = useState<DocumentStatus>(
    document?.status ?? "draft",
  );
  const [issueDate, setIssueDate] = useState(
    document?.issue_date ?? todayIsoDate(),
  );
  const [dueOrValid, setDueOrValid] = useState(
    documentType === "invoice" || document?.type === "invoice"
      ? ""
      : (document?.due_or_valid_until ?? defaultDueOrValid ?? ""),
  );
  const [notes, setNotes] = useState(document?.notes ?? "");
  const [lineItems, setLineItems] = useState<LineDraft[]>(() => toDraft(lines));
  const [catalogPick, setCatalogPick] = useState("");

  const totals = useMemo(() => {
    return calcDocumentTotals(
      lineItems.map((l) => ({
        qty: Number(l.qty) || 0,
        unit_price: Number(l.unit_price) || 0,
        vat_rate: 0,
      })),
    );
  }, [lineItems]);

  const statusOptions = statusesForType(type);
  const activeCatalog = catalogItems.filter((item) => item.active);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLineItems((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLineItems((prev) => [...prev, emptyLine()]);
  }

  function addFromCatalog(itemId: string) {
    const item = activeCatalog.find((entry) => entry.id === itemId);
    if (!item) return;

    setLineItems((prev) => {
      const blankIndex = prev.findIndex(
        (line) => !line.description.trim() && Number(line.unit_price) === 0,
      );
      const nextLine: LineDraft = {
        key: crypto.randomUUID(),
        description: item.name,
        qty: "1",
        unit_price: String(item.unit_price),
        vat_rate: String(DEFAULT_VAT_RATE),
        done_date: "",
      };
      if (blankIndex >= 0) {
        return prev.map((line, index) =>
          index === blankIndex
            ? {
                ...line,
                description: item.name,
                unit_price: String(item.unit_price),
              }
            : line,
        );
      }
      return [...prev, nextLine];
    });
    setCatalogPick("");
  }

  function removeLine(key: string) {
    setLineItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((l) => l.key !== key),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    if (lineItems.some((l) => !l.description.trim())) {
      toast.error("Each line needs a description");
      return;
    }

    const formData = new FormData();
    formData.set("type", type);
    formData.set("client_id", clientId);
    formData.set("status", status);
    formData.set("issue_date", issueDate);
    formData.set(
      "due_or_valid_until",
      type === "invoice" ? "" : dueOrValid,
    );
    formData.set("notes", notes);
    formData.set(
      "lines",
      JSON.stringify(
        lineItems.map((l, index) => ({
          description: l.description.trim(),
          qty: Number(l.qty) || 0,
          unit_price: Number(l.unit_price) || 0,
          vat_rate: 0,
          sort_order: index,
          done_date: l.done_date.trim() || null,
        })),
      ),
    );

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createDocument(formData)
          : await updateDocument(document!.id, formData);

      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      if (mode === "edit") {
        toast.success("Document saved");
        router.refresh();
      }
    });
  }

  const dueLabel = type === "quote" ? "Valid until" : "Date";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Type</Label>
          <Input value={DOCUMENT_TYPE_LABELS[type]} disabled />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client_id">Client</Label>
          <select
            id="client_id"
            className={selectClassName}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.business_name?.trim()
                  ? `${c.business_name} (${c.name})`
                  : c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className={selectClassName}
            value={status}
            onChange={(e) => setStatus(e.target.value as DocumentStatus)}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="issue_date">Issue date</Label>
          <Input
            id="issue_date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
        </div>
        {type !== "invoice" ? (
          <div className="space-y-2">
            <Label htmlFor="due_or_valid_until">{dueLabel}</Label>
            <Input
              id="due_or_valid_until"
              type="date"
              value={dueOrValid}
              onChange={(e) => setDueOrValid(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>Line items</Label>
          <div className="flex flex-wrap items-center gap-2">
            {activeCatalog.length ? (
              <select
                className={`${selectClassName} w-auto min-w-[12rem]`}
                value={catalogPick}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) addFromCatalog(value);
                }}
                aria-label="Select catalog item"
              >
                <option value="">Select item…</option>
                {activeCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatZar(Number(item.unit_price))}
                  </option>
                ))}
              </select>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="mr-1 h-4 w-4" />
              Add line
            </Button>
          </div>
        </div>
        {!activeCatalog.length ? (
          <p className="text-xs text-muted-foreground">
            Tip: add reusable items under Items to pick them here with prices.
          </p>
        ) : null}
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-2 font-medium">Description</th>
                <th className="w-36 p-2 font-medium">Done</th>
                <th className="w-24 p-2 font-medium">Qty</th>
                <th className="w-32 p-2 font-medium">Unit price</th>
                <th className="w-32 p-2 font-medium text-right">Amount</th>
                <th className="w-10 p-2" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((line) => {
                const lineTotal = calcLineTotals({
                  qty: Number(line.qty) || 0,
                  unit_price: Number(line.unit_price) || 0,
                  vat_rate: 0,
                });
                return (
                  <tr key={line.key} className="border-t">
                    <td className="p-2">
                      <Input
                        value={line.description}
                        onChange={(e) =>
                          updateLine(line.key, { description: e.target.value })
                        }
                        placeholder="Service or product"
                        required
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={line.done_date}
                        onChange={(e) =>
                          updateLine(line.key, { done_date: e.target.value })
                        }
                        aria-label="Done date"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        value={line.qty}
                        onChange={(e) =>
                          updateLine(line.key, { qty: e.target.value })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.unit_price}
                        onChange={(e) =>
                          updateLine(line.key, { unit_price: e.target.value })
                        }
                      />
                    </td>
                    <td className="p-2 text-right tabular-nums">
                      {formatZar(lineTotal.line_excl)}
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeLine(line.key)}
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Payment terms, project notes…"
          />
        </div>
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between border-t-0 pt-0 text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatZar(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !clients.length}>
          {pending
            ? "Saving…"
            : mode === "create"
              ? `Create ${DOCUMENT_TYPE_LABELS[type].toLowerCase()}`
              : "Save changes"}
        </Button>
        {!clients.length && (
          <p className="text-sm text-destructive">
            Add a client before creating documents.
          </p>
        )}
      </div>
    </form>
  );
}
