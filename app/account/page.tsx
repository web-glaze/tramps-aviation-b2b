import { redirect } from "next/navigation";

/**
 * /account/ has no index of its own — its child segments (payments,
 * invoices, bank-accounts) each have a page. Anyone landing on the
 * bare /account URL gets bounced to the most-used tab.
 */
export default function AccountIndex() {
  redirect("/account/payments");
}
