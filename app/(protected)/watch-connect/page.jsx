"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import QrScanner from "qr-scanner";

export default function WatchConnect() {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    let scanner;

    const start = async () => {
      console.log("Init scanner...");

      if (!videoRef.current) {
        console.log("videoRef not ready");
        return;
      }

      const QrScanner = (await import("qr-scanner")).default;

      scanner = new QrScanner(
        videoRef.current,
        (result) => {
          if (scannedRef.current) return;
          scannedRef.current = true;

          console.log("SCAN:", result.data);
          handleRedirect(result.data);
        },
        {
          preferredCamera: "environment",
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );

      try {
        await scanner.start();
        console.log("CAMERA STARTED ✅");
      } catch (err) {
        console.error("CAMERA ERROR ❌", err);
      }

      scannerRef.current = scanner;
    };

    start();

    return () => {
      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }
    };
  }, []);

  function handleRedirect(data) {
    try {
      const url = new URL(data);
      router.push(url.pathname + url.search);
    } catch (e) {
      console.error("Invalid QR:", data);
    }
  }

  return (
    <div className="flex">
      {/* <h1 className="mb-6 text-2xl font-bold">Connecter ma montre</h1> */}
      <video
        ref={videoRef}
        className="w-full h-screen bg-black"
        muted
        playsInline
        style={{ minHeight: "screen" }}
      />{" "}
    </div>
  );
}
