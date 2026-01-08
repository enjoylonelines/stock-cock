"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { memo } from "react";

interface ProductImageUploadProps {
  localPreviewUrl: string | null;
  isUploading: boolean;
  user: { id: string } | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * 제품 이미지 업로드 컴포넌트
 */
export const ProductImageUpload = memo(function ProductImageUpload({
  localPreviewUrl,
  isUploading,
  user,
  onImageChange,
}: ProductImageUploadProps) {
  return (
    <div className="flex flex-col items-center pt-6 pb-2">
      <label className="flex overflow-hidden relative justify-center items-center w-24 h-24 bg-gray-100 rounded-md cursor-pointer">
        {localPreviewUrl ? (
          <Image src={localPreviewUrl} alt="제품 이미지" width={96} height={96} className="object-cover w-full h-full" />
        ) : (
          <span className="text-sm text-center text-gray-400">
            {user ? (
              <>
                사진
                <br />
                추가
              </>
            ) : (
              <>
                로그인이
                <br />
                필요합니다
              </>
            )}
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onImageChange}
          disabled={isUploading || !user}
        />
      </label>
      {isUploading && <span className="mt-2 text-sm text-gray-500">업로드 중...</span>}
    </div>
  );
});

