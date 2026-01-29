import HistoryDetail from "../_components/HistoryDetail";

export default async function InventoryHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HistoryDetail transactionId={id} />;
}
