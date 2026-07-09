import { LeadDetailClient } from "@/components/leads/lead-detail-client";

export default async function LeadDetailPage({ params }: PageProps<"/leads/[id]">) {
  const { id } = await params;
  return <LeadDetailClient id={id} />;
}
