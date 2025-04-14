"use client";

import { useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";
import { STOCK } from "../../../types";

export default function InventoryPage() {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState<STOCK | null>(null);

  const handleScan = async (code: string) => {
    setBarcode(code);

    // ERP API 호출 (재고 조회)
    const res = await fetch("/api/get-stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemCode: code }),
    });

    const data = await res.json();
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
