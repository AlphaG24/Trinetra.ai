import { CustomerDatabaseClient } from "@/src/components/customers/CustomerDatabaseClient";

export const metadata = {
  title: "Customer Database | Vaakriti AI",
  description: "Manage client directories, custom tags, import contacts, and track voice call histories.",
};

export default function CustomersPage() {
  return <CustomerDatabaseClient />;
}
