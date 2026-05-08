import type { Metadata } from "next";
import ClientsClient from "./ClientsClient";

export const metadata: Metadata = {
  title: "Clients",
  description:
    "Saved clients with travel history. Re-book your top customers in one tap.",
  alternates: { canonical: "/clients" },
};

export default function ClientsPage() {
  return <ClientsClient />;
}
