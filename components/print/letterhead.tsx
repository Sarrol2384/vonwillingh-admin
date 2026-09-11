import type { CompanySettings } from "@/lib/supabase/types";
import "@/app/letterhead.css";

/**
 * Brand letterhead header — page 1 only (in document flow).
 * Visual matches the official VonWillingh Online letterhead template.
 */
export function LetterheadHeader({ company }: { company: CompanySettings }) {
  return (
    <header className="letterhead-header" aria-label="Letterhead">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/letterhead-header.png"
        alt={company.company_name}
        className="letterhead-header-img"
      />
    </header>
  );
}

/**
 * Brand letterhead footer — every printed page (fixed in print) + screen preview.
 * Includes contact strip and photo panels from the official template.
 */
export function LetterheadFooter({ company }: { company: CompanySettings }) {
  return (
    <footer className="letterhead-footer" aria-label="Letterhead footer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/letterhead-footer.png"
        alt={`${company.company_name} contact details`}
        className="letterhead-footer-img"
      />
    </footer>
  );
}
