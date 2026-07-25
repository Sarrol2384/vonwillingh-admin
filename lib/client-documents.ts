export type ClientDocumentType = "service_agreement" | "discovery_brief";

export type AgreementContent = {
  agreement_date?: string;
  project_title?: string;
  project_description?: string;
  scope?: string;
  deliverables?: string;
  go_live_date?: string;
  timeline_notes?: string;
  total_fee?: string;
  deposit?: string;
  balance?: string;
  payment_terms_days?: string;
  payment_notes?: string;
  exclusions?: string;
  acceptance_name?: string;
  acceptance_date?: string;
};

export type DiscoveryBriefContent = {
  meeting_date?: string;
  prepared_by?: string;
  client_attendees?: string;
  vonwillingh_attendees?: string;
  project_title?: string;
  how_found?: string;
  industry?: string;
  contact_role?: string;
  existing_website?: string;
  social_media?: string;
  competitors?: string;
  business_summary?: string;
  custom_app_problem?: string;
  other_systems?: string;
  primary_goal?: string;
  target_audience?: string;
  success_metric?: string;
  why_now?: string;
  brand_colours?: string;
  style_words?: string;
  sites_like?: string;
  sites_dislike?: string;
  page_count?: string;
  homepage_message?: string;
  domain?: string;
  go_live_date?: string;
  deadline?: string;
  decision_makers?: string;
  meeting_notes?: string;
  next_steps?: string;
};

export type ClientDocumentContent = AgreementContent | DiscoveryBriefContent;

export const CLIENT_DOCUMENT_TYPE_LABELS: Record<ClientDocumentType, string> = {
  service_agreement: "Service Agreement",
  discovery_brief: "Discovery Brief",
};

export function clientDocumentTypeFromParam(
  value: string | null | undefined,
): ClientDocumentType | null {
  if (value === "service_agreement" || value === "discovery_brief") {
    return value;
  }
  return null;
}

export function defaultAgreementContent(
  clientName: string,
  projectTitle: string,
): AgreementContent {
  return {
    agreement_date: new Date().toISOString().slice(0, 10),
    project_title: projectTitle,
    project_description: "",
    scope: "",
    deliverables: "",
    go_live_date: "",
    timeline_notes: "",
    total_fee: "",
    deposit: "50% deposit to commence work",
    balance: "50% on completion",
    payment_terms_days: "14",
    payment_notes: "",
    exclusions: "Third-party subscriptions, stock photography, and content writing unless quoted separately.",
    acceptance_name: clientName,
    acceptance_date: "",
  };
}

export function defaultDiscoveryBriefContent(
  client: {
    name: string;
    business_name: string;
    notes: string;
  },
  companyContact: string,
): DiscoveryBriefContent {
  const tradingName = client.business_name?.trim() || client.name;
  return {
    meeting_date: new Date().toISOString().slice(0, 10),
    prepared_by: companyContact,
    client_attendees: client.name,
    project_title: tradingName,
    business_summary: client.notes || "",
    decision_makers: client.name,
  };
}

export function parseClientDocumentContent(
  type: ClientDocumentType,
  raw: unknown,
): ClientDocumentContent {
  if (!raw || typeof raw !== "object") {
    return type === "service_agreement"
      ? defaultAgreementContent("", "")
      : defaultDiscoveryBriefContent({ name: "", business_name: "", notes: "" }, "");
  }
  return raw as ClientDocumentContent;
}
