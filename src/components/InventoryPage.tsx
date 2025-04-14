"use client";

import { useState } from "react";
import BarcodeScanner from "./BarcodeScanner";

export default function InventoryPage() {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<null | {
    name: string;
    stock: number;
  }>(null);

  const handleScan = async (code: string) => {
    setBarcode(code);

    // ERP API 호출 (재고 조회)
    const res = await fetch("/api/inventory/get-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemCode: code }),
    });
    const data = await res.json();
    console.log(data);
    setProduct(data);
  };

  return (
    <div>
      <h2>바코드 스캔</h2>
      <BarcodeScanner onScan={handleScan} />

      {barcode && <p>스캔된 바코드: {barcode}</p>}
      {product && (
        <div>
          <h3>제품 정보</h3>
          <p>이름: {product.name}</p>
          <p>재고: {product.stock}개</p>
        </div>
      )}
    </div>
  );
}
