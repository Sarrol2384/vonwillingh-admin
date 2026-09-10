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
  createContract,
  deleteContract,
  updateContract,
} from "@/lib/actions/contracts";
import {
  BILLING_CADENCE_LABELS,
  CONTRACT_STATUS_LABELS,
} from "@/lib/payments";
import {
  calcDocumentTotals,
  formatZar,
  todayIsoDate,
} from "@/lib/money";
import type {
  CatalogItem,
  Client,
  Contract,
  ContractLine,
} from "@/lib/supabase/types";

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type LineDraft = {
  key: string;
  description: string;
  qty: string;
  unit_price: string;
};

function emptyLine(): LineDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    qty: "1",
    unit_price: "0",
  };
}

function toDraft(lines: ContractLine[]): LineDraft[] {
  if (!lines.length) return [emptyLine()];
  return [...lines]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((line) => ({
      key: line.id,
      description: line.description,
      qty: String(line.qty),
      unit_price: String(line.unit_price),
    }));
}

export function ContractForm({
  mode,
  clients,
  catalogItems = [],
  contract,
  lines = [],
  defaultClientId,
}: {
  mode: "create" | "edit";
  clients: Client[];
  catalogItems?: CatalogItem[];
  contract?: Contract;
  lines?: ContractLine[];
  defaultClientId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(
    contract?.client_id ?? defaultClientId ?? "",
  );
  const [status, setStatus] = useState(contract?.status ?? "draft");
  const [cadence, setCadence] = useState(contract?.cadence ?? "monthly");
  const [autoSend, setAutoSend] = useState(contract?.auto_send ?? true);
  const [lineItems, setLineItems] = useState<LineDraft[]>(() => toDraft(lines));
  const [catalogPick, setCatalogPick] = useState("");

  const totals = useMemo(
    () =>
      calcDocumentTotals(
        lineItems.map((line) => ({
          qty: Number(line.qty) || 0,
          unit_price: Number(line.unit_price) || 0,
          vat_rate: 0,
        })),
      ),
    [lineItems],
  );

  const activeCatalog = catalogItems.filter((item) => item.active);

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLineItems((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!clientId) {
      toast.error("Select a client");
      return;
    }
    if (lineItems.some((line) => !line.description.trim())) {
      toast.error("Each line needs a description");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("client_id", clientId);
    formData.set("status", status);
    formData.set("cadence", cadence);
    formData.set("auto_send", autoSend ? "true" : "false");
    formData.set(
      "lines",
      JSON.stringify(
        lineItems.map((line, index) => ({
          description: line.description.trim(),
          qty: Number(line.qty) || 0,
          unit_price: Number(line.unit_price) || 0,
          sort_order: index,
        })),
      ),
    );

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createContract(formData)
          : await updateContract(contract!.id, formData);

      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
        return;
      }
      if (mode === "edit") {
        toast.success("Contract saved");
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!contract) return;
    if (!confirm(`Delete contract "${contract.title}"?`)) return;
    startTransition(async () => {
      const result = await deleteContract(contract.id);
      if (result && "ok" in result && !result.ok) {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={contract?.title}
            placeholder="e.g. Business Email hosting"
            required
          />
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
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.business_name?.trim()
                  ? `${client.business_name} (${client.name})`
                  : client.name}
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
            onChange={(e) =>
              setStatus(e.target.value as Contract["status"])
            }
          >
            {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cadence">Billing cadence</Label>
          <select
            id="cadence"
            className={selectClassName}
            value={cadence}
            onChange={(e) =>
              setCadence(e.target.value as Contract["cadence"])
            }
          >
            {Object.entries(BILLING_CADENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="start_date">Start date</Label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            defaultValue={contract?.start_date ?? todayIsoDate()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next_bill_on">Next bill on</Label>
          <Input
            id="next_bill_on"
            name="next_bill_on"
            type="date"
            defaultValue={
              contract?.next_bill_on ?? contract?.start_date ?? todayIsoDate()
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End date (optional)</Label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            defaultValue={contract?.end_date ?? ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_terms_days">Payment terms (days)</Label>
          <Input
            id="payment_terms_days"
            name="payment_terms_days"
            type="number"
            min={0}
            placeholder="Company default"
            defaultValue={contract?.payment_terms_days ?? ""}
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
            />
            Auto-email invoice via Brevo when billed
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label>Recurring line items</Label>
          <div className="flex flex-wrap items-center gap-2">
            {activeCatalog.length ? (
              <select
                className={`${selectClassName} w-auto min-w-[12rem]`}
                value={catalogPick}
                onChange={(e) => {
                  if (e.target.value) addFromCatalog(e.target.value);
                }}
              >
                <option value="">Select item…</option>
                {activeCatalog.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatZar(Number(item.unit_price))}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLineItems((prev) => [...prev, emptyLine()])}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add line
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2 font-medium">Description</th>
                <th className="px-3 py-2 font-medium w-24">Qty</th>
                <th className="px-3 py-2 font-medium w-32">Unit price</th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {lineItems.map((line) => (
                <tr key={line.key} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <Input
                      value={line.description}
                      onChange={(e) =>
                        updateLine(line.key, { description: e.target.value })
                      }
                      required
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0.001"
                      step="any"
                      value={line.qty}
                      onChange={(e) =>
                        updateLine(line.key, { qty: e.target.value })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setLineItems((prev) =>
                          prev.length <= 1
                            ? prev
                            : prev.filter((entry) => entry.key !== line.key),
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-right text-sm font-medium">
          Recurring total: {formatZar(totals.total)}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={contract?.notes}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create contract" : "Save contract"}
        </Button>
        {mode === "edit" ? (
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
