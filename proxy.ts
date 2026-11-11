import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  // Public routes are decided in updateSession: /, /login, /invoice/*,
  // /api/billing/*, and /api/payfast/* (PayFast ITN).
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ok.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
