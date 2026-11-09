export function canResolveHistory(record: {
  type: string | null;
  transaction_status?: string | null;
  entry_kind?: string | null;
}) {
  return (
    (record.type === "in" || record.type === "out") &&
    record.transaction_status === "posted" &&
    record.entry_kind !== "reversal"
  );
}

export function historyStatusLabel(record: { transaction_status?: string | null; entry_kind?: string | null }) {
  if (record.entry_kind === "reversal") return "역거래";
  if (record.transaction_status === "corrected") return "정정됨";
  if (record.transaction_status === "legacy_cancelled") return "이전 취소 기록";
  if (record.transaction_status === "cancelled") return "취소됨";
  if (record.entry_kind === "replacement") return "정정 거래";
  return "확정";
}
