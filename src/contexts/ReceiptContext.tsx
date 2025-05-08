"use client";

import { createContext, useContext, useState } from "react";
import { ReceiptContextType, ReceiptFormData, ReceiptMode } from "@/types/receipt";

const initialFormData: ReceiptFormData = {
  location: "",
  supplier: "",
  products: [],
  memo: "",
};

const ReceiptContext = createContext<ReceiptContextType | null>(null);

interface ReceiptProviderProps {
  children: React.ReactNode;
}

export function ReceiptProvider({ children }: ReceiptProviderProps) {
  const [mode, setMode] = useState<ReceiptMode>("IN");
  const [formData, setFormData] = useState<ReceiptFormData>(initialFormData);

  const setLocation = (location: string) => {
    setFormData((prev) => ({ ...prev, location }));
  };

  const setSupplier = (supplier: string) => {
    setFormData((prev) => ({ ...prev, supplier }));
  };

  const addProduct = (product: ReceiptFormData["products"][0]) => {
    setFormData((prev) => ({
      ...prev,
      products: [...prev.products, product],
    }));
  };

  const removeProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== productId),
    }));
  };

  const updateProduct = (productId: string, data: Partial<ReceiptFormData["products"][0]>) => {
    setFormData((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? { ...p, ...data } : p)),
    }));
  };

  const setMemo = (memo: string) => {
    setFormData((prev) => ({ ...prev, memo }));
  };

  const reset = () => {
    setFormData(initialFormData);
  };

  const submit = async () => {
    try {
      const response = await fetch(`/api/receipts/${mode.toLowerCase()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to submit receipt");
      }

      reset();
    } catch (error) {
      console.error("Error submitting receipt:", error);
      throw error;
    }
  };

  return (
    <ReceiptContext.Provider
      value={{
        mode,
        setMode,
        formData,
        setLocation,
        setSupplier,
        addProduct,
        removeProduct,
        updateProduct,
        setMemo,
        reset,
        submit,
      }}
    >
      {children}
    </ReceiptContext.Provider>
  );
}

export function useReceipt() {
  const context = useContext(ReceiptContext);
  if (!context) {
    throw new Error("useReceipt must be used within a ReceiptProvider");
  }
  return context;
}
