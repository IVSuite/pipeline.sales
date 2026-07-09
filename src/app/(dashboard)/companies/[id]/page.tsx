import { CompanyDetailClient } from "@/components/companies/company-detail-client";

export default async function CompanyDetailPage({ params }: PageProps<"/companies/[id]">) {
  const { id } = await params;
  return <CompanyDetailClient id={id} />;
}
