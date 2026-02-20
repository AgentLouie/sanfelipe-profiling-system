import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, BarcodeFormat } from "@zxing/browser";
import { DecodeHintType } from "@zxing/library";
import api from "../../api/api";

export default function QRScanner() {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);

  const [resident, setResident] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    startScanner();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  const startScanner = async () => {
    setError("");
    setResident(null);

    try {
      // 🔥 Restrict to QR only (faster)
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
      ]);

      const codeReader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 300, // scan every 300ms
      });

      const controls = await codeReader.decodeFromConstraints(
        {
          video: {
            facingMode: { ideal: "environment" }, // back camera
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
        },
        videoRef.current,
        async (result) => {
          if (result) {
            const scannedCode = result.getText();

            // 🔥 Stop camera immediately
            if (controlsRef.current) {
              controlsRef.current.stop();
            }

            setLoading(true);

            try {
              const response = await api.get(
                `/residents/code/${scannedCode}`
              );

              setResident(response.data);
              setError("");
            } catch (err) {
              setError("Resident not found or unauthorized");
            }

            setLoading(false);
          }
        }
      );

      controlsRef.current = controls;

    } catch (err) {
      console.error(err);
      setError("Camera error. Please allow camera access.");
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Scan Resident QR</h2>

      <div className="bg-white p-4 rounded-xl shadow">
        <video
          ref={videoRef}
          className="w-full rounded-lg"
          muted
          playsInline
        />
      </div>

      {loading && (
        <p className="mt-4 text-blue-600 font-medium">
          Verifying resident...
        </p>
      )}

      {error && (
        <p className="mt-4 text-red-600 font-medium">
          {error}
        </p>
      )}

      {resident && (
        <div className="mt-6 bg-white p-6 rounded-xl shadow">
          <h3 className="text-xl font-bold mb-2">
            {resident.first_name} {resident.last_name}
          </h3>
          <p><strong>Barangay:</strong> {resident.barangay}</p>
          <p><strong>Purok:</strong> {resident.purok}</p>
          <p><strong>Status:</strong> {resident.status}</p>
        </div>
      )}
    </div>
  );
}