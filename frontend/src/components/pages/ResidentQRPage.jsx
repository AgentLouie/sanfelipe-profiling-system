import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Loader2, ShieldAlert, Printer, ArrowLeft } from "lucide-react";

export default function ResidentQRPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [resident, setResident] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const logoUrl = "/san_felipe_seal.png";

  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        const response = await api.get(`/residents/code/${code}`);
        setResident(response.data);

        const qrResponse = await api.get(`/residents/code/${code}/qr`, {
          responseType: "blob",
        });
        const imageUrl = URL.createObjectURL(qrResponse.data);
        setQrImage(imageUrl);
      } catch (err) {
        console.error("Failed to fetch QR");
        setResident(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code]);

  // Cleanup created blob URL
  useEffect(() => {
    return () => {
      if (qrImage) URL.revokeObjectURL(qrImage);
    };
  }, [qrImage]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 font-sans">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center animate-in zoom-in-95 duration-300">
          <Loader2 size={36} className="text-rose-600 animate-spin mb-4" />
          <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">
            Retrieving Registry Record...
          </p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 font-sans p-6">
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-md shadow-sm animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight mb-2">
            Record Not Found
          </h2>
          <p className="text-sm text-stone-500 font-medium mb-8">
            The requested registry ID is invalid, unauthorized, or has been
            removed from the system.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors shadow-sm"
          >
            <ArrowLeft size={16} />
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  const CardHeader = ({ isFront = true }) => (
    <div className="bg-rose-700 text-white py-4 px-5 flex items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm p-0.5 flex-shrink-0">
        <img
          src={logoUrl}
          alt="San Felipe Seal"
          className="w-full h-full object-contain rounded-full"
          onError={(e) => (e.target.style.display = "none")}
        />
      </div>
      {isFront && (
        <div className="text-left">
          <h1 className="text-[11px] font-black uppercase tracking-widest leading-tight text-white drop-shadow-sm">
            Municipality of San Felipe
          </h1>
          <p className="text-[8px] font-bold tracking-widest text-rose-200 uppercase mt-0.5 drop-shadow-sm">
            Zambales · Resident Registry
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-100 p-6 font-sans">
      {/* REQUIRED GLOBALS: Print Margins & Hiding Outer Layout */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          @page { size: 3.5in 5in; margin: 0; }
          body * { visibility: hidden; }
          #qr-print-area, #qr-print-area * { visibility: visible; }
          html, body { background: white !important; }
        }
      `}</style>

      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6 text-center print:hidden">
        Resident ID Card Preview — Print Both Sides
      </p>

      {/* BOTH CARDS CONTAINER */}
      {/* FIXES:
          - md:items-stretch to force equal height in row layout
          - items-center (mobile) for nicer centering
      */}
      <div
        id="qr-print-area"
        className="flex flex-col md:flex-row gap-8 items-center md:items-stretch justify-center w-full
                   print:absolute print:top-0 print:left-0 print:m-0 print:p-0 print:w-[3.5in] print:flex-col print:gap-0"
      >
        {/* ── FRONT SIDE ── */}
        {/* FIXES:
            - md:h-[520px] to make both cards equal height on desktop preview
            - print:h-[5in] still controls printing
        */}
        <div className="bg-white rounded-2xl w-[320px] md:h-[520px] shadow-xl border border-stone-300 overflow-hidden flex flex-col box-border
                        print:w-[3.5in] print:h-[5in] print:shadow-none print:border print:border-stone-300 print:rounded-2xl print:break-inside-avoid print:break-after-page print:flex-shrink-0">
          <CardHeader isFront={true} />

          <div className="px-6 pt-6 pb-6 text-center flex-1 flex flex-col items-center">
            {/* PHOTO */}
            <div className="mb-5 relative">
              <div className="absolute inset-0 bg-stone-100 rounded-2xl transform rotate-3 scale-105 border border-stone-200"></div>
              {resident.photo_url ? (
                <img
                  src={resident.photo_url}
                  alt="Resident"
                  className="relative w-32 h-32 object-cover rounded-2xl shadow-sm border border-stone-200 bg-white"
                />
              ) : (
                <div className="relative w-32 h-32 rounded-2xl border border-stone-200 bg-stone-50 flex items-center justify-center text-[10px] font-bold text-stone-400 uppercase tracking-wider shadow-sm">
                  No Photo
                </div>
              )}
            </div>

            {/* NAME */}
            <h2 className="text-xl font-black uppercase text-stone-900 tracking-tight leading-tight">
              {resident.last_name}, {resident.first_name}
              {resident.middle_name && (
                <>
                  <br />
                  <span className="text-sm font-bold text-stone-600 tracking-normal">
                    {resident.middle_name}
                  </span>
                </>
              )}
            </h2>

            {/* DETAILS */}
            <div className="w-full border-t border-stone-200 mt-5 pt-4 space-y-3 text-left">
              <div>
                <span className="block text-[9px] font-bold text-rose-700 uppercase tracking-widest mb-0.5">
                  Registered Address
                </span>
                <p className="text-xs font-bold text-stone-800 uppercase leading-snug">
                  {resident.barangay} – Purok {resident.purok}
                </p>
              </div>

              {resident.birthdate && (
                <div>
                  <span className="block text-[9px] font-bold text-rose-700 uppercase tracking-widest mb-0.5">
                    Date of Birth
                  </span>
                  <p className="text-xs font-bold text-stone-800">
                    {resident.birthdate}
                  </p>
                </div>
              )}

              {resident.sector_summary && (
                <div>
                  <span className="block text-[9px] font-bold text-rose-700 uppercase tracking-widest mb-0.5">
                    Classification
                  </span>
                  <p className="text-xs font-bold text-stone-800 uppercase">
                    {resident.sector_summary}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-stone-100 text-center py-2 border-t border-stone-200 print:bg-stone-100">
            <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">
              Official Identification Card
            </p>
          </div>
        </div>

        {/* ── BACK SIDE ── */}
        {/* FIXES:
            - md:h-[520px] matches front
            - normalize padding to pt-6 pb-6 (same as front)
            - remove justify-center to prevent vertical drift; use flex-1 + mt-auto patterns instead
        */}
        <div className="bg-white rounded-2xl w-[320px] md:h-[520px] shadow-xl border border-stone-300 overflow-hidden flex flex-col box-border
                        print:w-[3.5in] print:h-[5in] print:shadow-none print:border print:border-stone-300 print:rounded-2xl print:break-inside-avoid print:flex-shrink-0">
          <CardHeader isFront={false} />

          <div className="px-6 pt-6 pb-6 text-center flex-1 flex flex-col items-center">
            {/* INSTRUCTIONS */}
            <div className="mb-6">
              <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest leading-relaxed px-4">
                This QR Code contains verified resident data. Scan using
                authorized LGU devices only.
              </p>
            </div>

            {/* QR CODE */}
            <div className="w-48 h-48 bg-white p-3 rounded-2xl border-2 border-stone-200 shadow-sm flex items-center justify-center">
              {qrImage ? (
                <img
                  src={qrImage}
                  alt="QR Code"
                  className="w-full h-full mix-blend-multiply"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin text-stone-300" />
                  <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                    Loading
                  </span>
                </div>
              )}
            </div>

            {/* REGISTRY ID */}
            <div className="w-full mt-6">
              <span className="block text-[9px] font-bold text-rose-700 uppercase tracking-widest mb-1.5">
                Registry ID Number
              </span>
              <div className="bg-stone-100 border border-stone-200 rounded-xl py-2 px-4 inline-block shadow-sm">
                <p className="text-sm font-mono font-bold tracking-widest text-stone-900">
                  {resident.resident_code}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-stone-100 text-center py-2 border-t border-stone-200 print:bg-stone-100">
            <p className="text-[8px] font-bold text-stone-500 uppercase tracking-widest">
              Official Identification Card
            </p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS (Hidden on Print) */}
      <div className="mt-10 flex flex-wrap justify-center gap-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-6 py-3 bg-rose-700 text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-rose-800 transition-colors shadow-sm"
        >
          <Printer size={18} />
          Print ID Card
        </button>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-6 py-3 bg-white text-stone-700 text-sm font-bold uppercase tracking-wider rounded-xl border border-stone-300 hover:bg-stone-50 transition-colors shadow-sm"
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>
    </div>
  );
}