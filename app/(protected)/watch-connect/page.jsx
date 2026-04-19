"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function WatchConnect() {
  const startedRef = useRef(false);
  const scannerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    let html5QrCode;

    if (startedRef.current) return; // 🛑 bloque double init
    startedRef.current = true;

    const start = async () => {
      const { Html5Qrcode } = await import("html5-qrcode");

      html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        (decodedText) => {
          html5QrCode.stop();
          handleRedirect(decodedText);
        },
      );
    };

    start();

    return () => {
      html5QrCode?.stop().catch(() => {});
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
    <div className="max-w-lg px-4 py-6 mx-auto">
      <h1 className="mb-6 text-2xl font-bold">Connecter ma montre</h1>
      <div id="qr-reader" className="w-full overflow-hidden rounded-xl" />{" "}
    </div>
  );
}
