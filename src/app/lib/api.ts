export async function postToERP(data: unknown) {
  const res = await fetch("https://fake-erp.com/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("ERP 전송 실패");
  }

  return res.json();
}
