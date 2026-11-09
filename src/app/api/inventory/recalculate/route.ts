import { NextResponse } from "next/server";

// Posted records must remain intact. Corrections use the posting RPC.
export async function POST() {
  return NextResponse.json({ error: "확정 이력의 삭제·재계산은 중단됐습니다. 정정·취소 또는 재고 조정을 사용해주세요." }, { status: 410 });
}
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
