import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import api from "../../api/api";

export default function QRScanner() {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const [resident, setResident] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();

    const startScanner = async () => {
      try {
        const controls = await codeReader.decodeFromConstraints(
            {
            video: {
                facingMode: { ideal: "environment" } // force back camera
            }
            },
            videoRef.current,
            async (result) => {
            if (result) {
                const scannedCode = result.getText();

                try {
                const response = await api.get(
                    `/residents/code/${scannedCode}`
                );

                setResident(response.data);

                // ✅ STOP CAMERA
                if (controlsRef.current) {
                    controlsRef.current.stop();
                }

                } catch (e) {
                setError("Resident not found or unauthorized");
                }
            }
            }
        );

        // 🔥 THIS LINE IS IMPORTANT
        controlsRef.current = controls;

        } catch (err) {
        console.error(err);
        setError("Camera error. Please allow camera access.");
        }
    };

    startScanner();

    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
      }
    };
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Scan Resident QR</h2>

      <video
        ref={videoRef}
        className="w-full rounded-lg"
        muted
        playsInline
        />

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {resident && (
        <div className="mt-6 p-4 border rounded-lg bg-white shadow">
          <h3 className="text-xl font-bold">
            {resident.first_name} {resident.last_name}
          </h3>
          <p>Barangay: {resident.barangay}</p>
          <p>Purok: {resident.purok}</p>
          <p>Status: {resident.status}</p>
        </div>
      )}
    </div>
  );
}