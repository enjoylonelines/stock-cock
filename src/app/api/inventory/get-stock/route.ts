// 단건 재고조회
import { type NextRequest, NextResponse } from "next/server";

const baseURL = `https://sboapi${process.env.ZONE}.ecount.com/OAPI/V2`;
const today = new Date();
const date =
  today.getFullYear() + String(today.getMonth() + 1).padStart(2, "0") + String(today.getDate()).padStart(2, "0");

// 캐시 저장을 위한 Map 객체 생성
const stockCache = new Map();

export async function POST(req: NextRequest) {
  const { itemCode } = await req.json();

  // 캐시에 데이터가 있으면 바로 반환
  if (stockCache.has(itemCode)) {
    return NextResponse.json(stockCache.get(itemCode));
  }

  const sessionId = "3635363139397c48414e4b4b4937343730:AB-ASBtLO5BqrUxl";
  const apiResponse = await fetch(
    `${baseURL}/InventoryBalance/ViewInventoryBalanceStatus?SESSION_ID=${sessionId}
`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${process.env.API_CERT_KEY}`,
      },
      body: JSON.stringify({
        BASE_DATE: date,
        PROD_CD: itemCode,
      }),
    }
  );

  const data = await apiResponse.json();

  const response = { name: "김치왕만두", stock: data.Data.TotalCnt };

  // 응답 데이터를 캐시에 저장
  stockCache.set(itemCode, response);

  return NextResponse.json(response);
}
