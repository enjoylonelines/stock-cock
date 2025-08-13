import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

// SKU 생성 함수
function getInitials(str: string) {
  const CHO = [
    "G",
    "GG",
    "N",
    "D",
    "DD",
    "R",
    "M",
    "B",
    "BB",
    "S",
    "SS",
    "NG",
    "J",
    "JJ",
    "CH",
    "K",
    "T",
    "P",
    "H",
    "W",
    "WW",
    "A",
    "E",
    "I",
    "O",
    "U",
    "Y",
    "K",
    "M",
    "P",
    "S",
    "T",
    "W",
    "Y",
  ];
  let result = "";
  for (const char of str) {
    const code = char.charCodeAt(0) - 44032;
    if (code >= 0 && code <= 11171) {
      result += CHO[Math.floor(code / 588)];
    } else if (/[a-zA-Z0-9]/.test(char)) {
      result += char.toUpperCase();
    }
    // 기타 문자는 무시
  }
  return result;
}

export function generateSKU(productName: string, weight: number) {
  const initials = getInitials(productName);
  return `${initials}-${weight}`;
}

// 고유한 파일명 생성 함수
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop();
  return `${timestamp}-${random}.${extension}`;
}
