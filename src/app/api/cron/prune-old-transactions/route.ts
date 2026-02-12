import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PRUNE_DAYS = 90;
const CRON_SECRET_HEADER = "x-cron-secret";

/**
 * 90일 지난 입출고 내역 삭제 (외부 Cron용)
 *
 * 호출: POST /api/cron/prune-old-transactions
 * 헤더: x-cron-secret: <CRON_SECRET 값>
 *
 * 1) 환경 변수: .env.local / Vercel 등에 CRON_SECRET=랜덤문자열 설정
 * 2) cron-job.org: 매일 03:00, POST, Header "x-cron-secret": "<CRON_SECRET>"
 * 3) GitHub Actions 예시:
 *    - .github/workflows/prune.yml
 *    - schedule: "0 18 * * *"  # UTC 18:00 = 한국 03:00
 *    - run: curl -X POST -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" https://your-app.vercel.app/api/cron/prune-old-transactions
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 501 }
    );
  }

  const received = request.headers.get(CRON_SECRET_HEADER);
  if (received !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PRUNE_DAYS);
    const cutoffIso = cutoff.toISOString();

    // 1. 90일 지난 transaction_id 목록
    const { data: oldTxIds, error: selectError } = await supabase
      .from("transactions")
      .select("id")
      .lt("created_at", cutoffIso);

    if (selectError) {
      console.error("[prune-old-transactions] select error", selectError);
      return NextResponse.json(
        { error: "Select failed", detail: selectError.message },
        { status: 500 }
      );
    }

    const ids = (oldTxIds ?? []).map((r) => r.id);
    if (ids.length === 0) {
      return NextResponse.json({
        success: true,
        deleted: { transactions: 0, transaction_items: 0 },
      });
    }

    // 2. transaction_items 먼저 삭제
    const { error: deleteItemsError } = await supabase
      .from("transaction_items")
      .delete()
      .in("transaction_id", ids);

    if (deleteItemsError) {
      console.error("[prune-old-transactions] delete items error", deleteItemsError);
      return NextResponse.json(
        { error: "Delete transaction_items failed", detail: deleteItemsError.message },
        { status: 500 }
      );
    }

    // 3. transactions 삭제 (user_activity_read는 DB CASCADE로 자동 삭제)
    const { error: deleteTxError } = await supabase
      .from("transactions")
      .delete()
      .in("id", ids);

    if (deleteTxError) {
      console.error("[prune-old-transactions] delete transactions error", deleteTxError);
      return NextResponse.json(
        { error: "Delete transactions failed", detail: deleteTxError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: { transactions: ids.length },
    });
  } catch (err) {
    console.error("[prune-old-transactions]", err);
    return NextResponse.json(
      { error: "Internal error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
