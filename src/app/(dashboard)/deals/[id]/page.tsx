import { DealDetailClient } from "@/components/deals/deal-detail-client";

export default async function DealDetailPage({ params }: PageProps<"/deals/[id]">) {
  const { id } = await params;
  return <DealDetailClient id={id} />;
}
