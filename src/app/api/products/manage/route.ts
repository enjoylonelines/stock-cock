import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

async function manage(request: Request, deleting: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json();
    const { data, error } = deleting
      ? await supabase.rpc("archive_product", { p_id: body.product_id })
      : await supabase.rpc("register_product", { p_form: body });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "제품 정보를 확인해주세요." }, { status: 400 });
  }
}
export async function POST(request: Request) {
  return manage(request, false);
}
export async function DELETE(request: Request) {
  return manage(request, true);
}
