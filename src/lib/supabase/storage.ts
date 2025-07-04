import { supabase } from "../supabase";

export async function uploadProductImage(file: File): Promise<string> {
  try {
    // 현재 세션 확인
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("인증이 필요합니다.");
    }

    // 파일 이름 생성 (중복 방지를 위해 타임스탬프 추가)
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `product-images/${fileName}`;

    // Supabase Storage에 파일 업로드
    const { data, error } = await supabase.storage.from("product-images").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      throw error;
    }

    return filePath;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw error;
  }
}

// 서명된 URL 생성 함수
export async function getSignedUrl(filePath: string): Promise<string> {
  try {
    // 현재 세션 확인
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("인증이 필요합니다.");
    }

    const { data, error } = await supabase.storage.from("product-images").createSignedUrl(filePath, 3600); // 1시간 동안 유효한 URL 생성

    if (error) {
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw error;
  }
}

// 이미지 삭제 함수
export async function deleteProductImage(filePath: string): Promise<void> {
  try {
    // 현재 세션 확인
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("인증이 필요합니다.");
    }

    const { error } = await supabase.storage.from("product-images").remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
}
