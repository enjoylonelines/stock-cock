"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

export default function BarcodeScanner({ onScan }: { onScan: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastScannedRef = useRef<string>("");
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const codeReaderRef = useRef<BrowserMultiFormatReader | undefined>(undefined);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 컴포넌트가 언마운트될 때 카메라 정리
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "camera" as PermissionName });

      if (permissionStatus.state === "granted") {
        return true;
      }

      if (permissionStatus.state === "prompt") {
        // 권한 요청 다이얼로그 표시
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        return true;
      }

      return false;
    } catch (error) {
      console.error("권한 확인 중 오류:", error);
      return false;
    }
  };

  const startScanning = async () => {
    try {
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) {
        console.log("카메라 권한이 필요합니다.");
        return;
      }

      // 카메라 스트림 획득
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // 후면 카메라 우선
      });

      streamRef.current = stream;

      if (!videoRef.current) return;

      // 비디오 요소에 스트림 연결
      videoRef.current.srcObject = stream;

      // 바코드 리더 초기화 및 스캔 시작
      codeReaderRef.current = new BrowserMultiFormatReader();
      codeReaderRef.current.decodeFromVideoDevice(null, videoRef.current, (result) => {
        if (result) {
          const scannedCode = result.getText();

          // 이전에 스캔한 코드와 같고, 1초가 지나지 않았다면 무시
          if (scannedCode === lastScannedRef.current) {
            return;
          }

          // 이전 타이머가 있다면 클리어
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // 현재 스캔한 코드 저장
          lastScannedRef.current = scannedCode;

          // 스캔 결과 전달
          onScan(scannedCode);

          // 1초 후에 lastScannedRef 초기화
          timeoutRef.current = setTimeout(() => {
            lastScannedRef.current = "";
          }, 1000);
        }
      });

      setIsScanning(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        console.log("카메라 권한이 거부되었습니다.");
      } else {
        console.error("카메라 시작 중 오류:", error);
      }
    }
  };

  const stopScanning = () => {
    // 스트림 정리
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // 비디오 요소 정리
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // 바코드 리더 정리
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }

    // 타이머 정리
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setIsScanning(false);
  };

  return (
    <div>
      <video
        ref={videoRef}
        style={{
          width: "100%",
          border: "1px solid #ccc",
          display: isScanning ? "block" : "none",
        }}
        autoPlay
        playsInline // iOS 지원을 위해 추가
      />
      <button
        onClick={isScanning ? stopScanning : startScanning}
        style={{
          marginTop: "10px",
          padding: "10px 20px",
          cursor: "pointer",
          backgroundColor: isScanning ? "#ff4444" : "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "4px",
        }}
      >
        {isScanning ? "카메라 끄기" : "카메라 켜기"}
      </button>
    </div>
  );
}
