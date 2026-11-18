import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SendWhatsAppButton } from "@/components/documents/send-whatsapp-button";
import {
  documentTypeFromParam,
  DOCUMENT_TYPE_LABELS,
} from "@/lib/documents";
import { formatDate, formatZar } from "@/lib/money";
import { remainingByInvoice } from "@/lib/payments";
import { publicInvoiceUrl } from "@/lib/public-url";
import {
  invoiceWhatsAppButtonState,
  otherUnpaidForWhatsApp,
  type WhatsAppClientInvoice,
} from "@/lib/whatsapp";
import { LinkButton } from "@/components/ui/link-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DocumentStatusBadge,
  DocumentTypeBadge,
} from "@/components/documents/status-badge";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type: typeParam } = await searchParams;
  const type = documentTypeFromParam(typeParam);
  const { supabase } = await requireUser();

  let query = supabase
    .from("documents")
    .select("*, clients(name, business_name, phone)")
    .order("issue_date", { ascending: false });

  if (type) {
    query = query.eq("type", type);
  }

  const [{ data: documents }, { data: settings }, { data: paymentRows }] =
    await Promise.all([
      query,
      supabase
        .from("company_settings")
        .select("company_name, contact_name")
        .limit(1)
        .maybeSingle(),
      supabase.from("payments").select("amount, document_id"),
    ]);

  const balances = remainingByInvoice(
    (documents ?? []).filter((doc) => doc.type === "invoice"),
    paymentRows ?? [],
  );

  const title = type ? DOCUMENT_TYPE_LABELS[type] + "s" : "Documents";
  const newHref = type
    ? `/documents/new?type=${type}`
    : "/documents/new?type=invoice";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {type
              ? `All ${DOCUMENT_TYPE_LABELS[type].toLowerCase()}s`
              : "All quotes, invoices, and credit notes"}
          </p>
        </div>
        <LinkButton href={newHref}>
          New {type ? DOCUMENT_TYPE_LABELS[type].toLowerCase() : "invoice"}
        </LinkButton>
      </div>

      {!documents?.length ? (
        <p className="text-sm text-muted-foreground">
          No documents yet.{" "}
          <Link href={newHref} className="underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              {!type ? <TableHead>Type</TableHead> : null}
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const client = doc.clients as {
                name: string;
                business_name: string;
                phone?: string;
              } | null;
              const clientLabel =
                client?.business_name?.trim() || client?.name || "—";
              const clientInvoices: WhatsAppClientInvoice[] = (
                documents ?? []
              )
                .filter(
                  (row) =>
                    row.client_id === doc.client_id && row.type === "invoice",
                )
                .map((row) => ({
                  id: row.id,
                  type: row.type,
                  status: row.status,
                  number: row.number,
                  issueDate: row.issue_date,
                  dueDate: row.due_or_valid_until,
                  balance: balances.get(row.id) ?? 0,
                  viewUrl: row.public_token
                    ? publicInvoiceUrl(row.public_token)
                    : null,
                  hasPublicToken: Boolean(row.public_token),
                }));
              const others = otherUnpaidForWhatsApp(doc.id, clientInvoices);
              const whatsapp =
                doc.type === "invoice" && doc.status !== "void"
                  ? invoiceWhatsAppButtonState({
                      clientName: client?.name,
                      businessName: client?.business_name,
                      phone: client?.phone,
                      number: doc.number,
                      total: doc.total,
                      balance: balances.get(doc.id) ?? 0,
                      issueDate: doc.issue_date,
                      dueDate: doc.due_or_valid_until,
                      companyName: settings?.company_name,
                      senderName: settings?.contact_name,
                      viewUrl: doc.public_token
                        ? publicInvoiceUrl(doc.public_token)
                        : null,
                      otherInvoices: others.invoices,
                      hasPublicToken: Boolean(doc.public_token),
                      otherTokensReady: others.tokensReady,
                    })
                  : null;
              return (
              <TableRow key={doc.id}>
                <TableCell className="whitespace-normal">
                  <div className="flex flex-col items-start gap-1">
                    <Link
                      href={`/documents/${doc.id}`}
                      className="font-medium whitespace-nowrap hover:underline"
                    >
                      {doc.number}
                    </Link>
                    {whatsapp ? (
                          <SendWhatsAppButton
                            documentId={doc.id}
                            href={whatsapp.href}
                            settled={whatsapp.settled}
                            hint={whatsapp.hint}
                            className="h-auto max-w-[8.75rem] whitespace-normal py-1.5 text-left sm:h-8 sm:max-w-none sm:whitespace-nowrap sm:py-0"
                          />
                    ) : null}
                  </div>
                </TableCell>
                {!type ? (
                  <TableCell>
                    <DocumentTypeBadge type={doc.type} />
                  </TableCell>
                ) : null}
                <TableCell>{clientLabel}</TableCell>
                <TableCell>{formatDate(doc.issue_date)}</TableCell>
                <TableCell>
                  <DocumentStatusBadge status={doc.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatZar(Number(doc.total))}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
