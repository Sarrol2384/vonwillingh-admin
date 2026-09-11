"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { runContractBilling } from "@/lib/billing-run";

export async function runBillingForContract(contractId: string) {
  const { supabase } = await requireUser();
  const result = await runContractBilling(supabase, { contractId });
  revalidatePath("/contracts");
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath("/documents");
  revalidatePath("/dashboard");
  return result;
}
