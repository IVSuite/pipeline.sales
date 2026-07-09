import { CustomerDetailClient } from "@/components/customers/customer-detail-client";

export default async function CustomerDetailPage({ params }: PageProps<"/customers/[id]">) {
  const { id } = await params;
  return <CustomerDetailClient id={id} />;
}
