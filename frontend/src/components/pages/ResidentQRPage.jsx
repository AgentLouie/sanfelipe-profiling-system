import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Loader2, ShieldAlert, Printer, ArrowLeft } from "lucide-react";

const IdField = ({ label, value, width, valueClassName = "" }) => (
  <div className="flex flex-col" style={{ width }}>
    <div className="border-b border-black pb-1 text-center flex items-end justify-center min-h-[32px]">
      <p
        className={`text-black font-bold text-[16px] leading-tight px-1 break-words text-center w-full ${valueClassName}`}
      >
        {value || "\u00A0"}
      </p>
    </div>
    <p className="text-black text-[13px] text-center mt-1 font-medium tracking-wide">
      {label}
    </p>
  </div>
);

export default function ResidentQRPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [resident, setResident] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);

  const logoUrl = "/san_felipe_seal.png";
  const bgUrl = "/sanfe.jpg";

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
        console.error("Failed to fetch QR", err);
        setResident(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code]);

  useEffect(() => {
    return () => {
      if (qrImage) URL.revokeObjectURL(qrImage);
    };
  }, [qrImage]);

  const formattedBirthdate = useMemo(() => {
    if (!resident?.birthdate) return " ";
    const date = new Date(resident.birthdate);
    if (isNaN(date.getTime())) return resident.birthdate;
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  }, [resident]);

  const fullName = useMemo(() => {
    if (!resident) return "";
    return `${resident.last_name || ""}, ${resident.first_name || ""}${
      resident.middle_name ? `, ${resident.middle_name.charAt(0)}.` : ""
    }`;
  }, [resident]);

  const emergencyContact = useMemo(() => {
    return (
      resident?.emergency_name ||
      resident?.emergency_contact_no ||
      resident?.emergency_address ||
      " "
    );
  }, [resident]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-stone-100 font-sans">
        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center">
          <Loader2 size={36} className="text-rose-700 animate-spin mb-4" />
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
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center max-w-md shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-700 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight mb-2">
            Record Not Found
          </h2>
          <p className="text-sm text-stone-500 font-medium mb-8">
            The requested registry ID is invalid, unauthorized, or has been removed from the system.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-stone-900 text-white text-sm font-semibold rounded-xl hover:bg-stone-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-200 p-6 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700;800;900&display=swap');

        .id-card {
          font-family: 'Barlow', sans-serif;
        }

        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
          }

          @page {
            size: 3.375in 2.125in;
            margin: 0;
          }

          body * {
            visibility: hidden !important;
          }

          #qr-print-area,
          #qr-print-area * {
            visibility: visible !important;
          }

          #qr-print-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: auto !important;
            height: auto !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          #qr-print-area > .id-card {
            width: 648px !important;
            height: 408px !important;
            zoom: 0.5;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            transform: none !important;
          }

          #qr-print-area > .id-card:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print\\:hidden,
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <p className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6 text-center print:hidden">
        Resident ID Card Preview — Print Both Sides
      </p>

      <div
        id="qr-print-area"
        className="flex flex-col gap-8 items-center print:gap-0 print:flex-col"
      >
        {/* FRONT */}
        <div className="id-card relative w-[648px] h-[408px] rounded-2xl overflow-hidden shadow-2xl border border-stone-400 bg-white flex-shrink-0 print:w-[3.375in] print:h-[2.125in] print:rounded-none print:shadow-none print:border-0 print:break-after-page">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src={bgUrl}
              alt=""
              className="w-full h-full object-cover grayscale-[40%] brightness-110"
              style={{ opacity: 0.3 }}
            />
          </div>

          {/* Watermark */}
          <img
            src={logoUrl}
            alt=""
            className="absolute z-0 pointer-events-none"
            style={{
              width: 420,
              height: 420,
              right: -40,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.12,
            }}
          />

          {/* Red diagonal banner */}
          <div
            className="absolute inset-0 z-10"
            style={{ filter: "drop-shadow(0px 6px 8px rgba(0,0,0,0.35))" }}
          >
            <div
              className="absolute inset-0 bg-[#cc0000]"
              style={{ clipPath: "polygon(0 0, 100% 0, 72% 0, 0 63%)" }}
            />
          </div>

          {/* Inner white border */}
          <div className="absolute inset-[10px] border border-white/80 z-10" />

          {/* Seal */}
          <img
            src={logoUrl}
            alt="San Felipe Seal"
            className="absolute top-6 left-6 w-[88px] h-[88px] z-20 drop-shadow-md rounded-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          {/* Titles */}
          <div className="absolute top-[14px] left-1/2 -translate-x-1/2 z-20 text-center leading-none w-full pointer-events-none">
            <h1
              className="text-[42px] font-black uppercase tracking-wide text-[#d40000]"
              style={{
                WebkitTextStroke: "2px white",
                textShadow: "0 3px 6px rgba(0,0,0,0.4)",
                lineHeight: "0.92",
              }}
            >
              SAN FELIPE
            </h1>
            <h2
              className="mt-[-4px] text-[40px] font-black uppercase tracking-wide text-[#d40000]"
              style={{
                WebkitTextStroke: "2px white",
                textShadow: "0 3px 6px rgba(0,0,0,0.4)",
                lineHeight: "0.92",
              }}
            >
              RESIDENT ID CARD
            </h2>
          </div>

          {/* Photo */}
          <div className="absolute top-[140px] left-[95px] flex flex-col items-center z-20">
            <div className="w-[155px] h-[180px] bg-[#efefef] border-[3px] border-black flex items-center justify-center overflow-hidden">
              {resident.photo_url ? (
                <img
                  src={resident.photo_url}
                  alt="Resident"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-stone-400 font-bold text-sm">NO PHOTO</span>
              )}
            </div>
            <p className="text-black font-black text-[28px] mt-3 tracking-wide uppercase">
              Resident
            </p>
          </div>

          {/* Fields */}
          <div className="absolute top-[145px] left-[320px] right-[40px] flex flex-col gap-5 z-20">
            <IdField
              label="Last Name, First Name, M.I"
              value={fullName}
              width="100%"
              valueClassName="text-[17px]"
            />

            <div className="flex gap-4 w-full">
              <IdField label="Sex" value={resident.sex} width="22%" />
              <IdField label="Date of Birth" value={formattedBirthdate} width="42%" valueClassName="text-[15px]" />
              <IdField label="Civil Status" value={resident.civil_status} width="36%" />
            </div>

            <div className="flex w-full">
              <IdField label="Contact No." value={resident.contact_no} width="48%" />
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="id-card relative w-[648px] h-[408px] rounded-2xl overflow-hidden shadow-2xl border border-stone-400 bg-white flex-shrink-0 print:w-[3.375in] print:h-[2.125in] print:rounded-none print:shadow-none print:border-0 print:break-inside-avoid">
          {/* Background */}
          <div className="absolute inset-0 z-0">
            <img
              src={bgUrl}
              alt=""
              className="w-full h-full object-cover grayscale-[40%] brightness-110"
              style={{ opacity: 0.3 }}
            />
          </div>

          {/* Watermark */}
          <img
            src={logoUrl}
            alt=""
            className="absolute z-0 pointer-events-none"
            style={{
              width: 420,
              height: 420,
              right: -40,
              top: "50%",
              transform: "translateY(-50%)",
              opacity: 0.12,
            }}
          />

          {/* Red triangle banner */}
          <div
            className="absolute inset-0 z-10"
            style={{ filter: "drop-shadow(0px 6px 8px rgba(0,0,0,0.35))" }}
          >
            <div
              className="absolute inset-0 bg-[#cc0000]"
              style={{ clipPath: "polygon(0 0, 70% 0, 0 60%)" }}
            />
          </div>

          {/* Inner white border */}
          <div className="absolute inset-[10px] border border-white/80 z-10" />

          {/* Seal */}
          <img
            src={logoUrl}
            alt="San Felipe Seal"
            className="absolute top-6 left-6 w-[88px] h-[88px] z-20 drop-shadow-md rounded-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          {/* Emergency contact */}
          <div className="absolute top-[190px] left-[35px] w-[235px] z-20">
            <p className="text-black text-[16px] font-medium text-left mb-2">
              Incase of Emergency
            </p>
            <div className="mb-2">
              <p className="text-[11px] text-black font-medium">Contact Number</p>
              <div className="border-b border-black min-h-[22px] flex items-end">
                <p className="text-black text-[14px] font-bold leading-tight break-words w-full">
                  {resident.emergency_contact_no || "\u00A0"}
                </p>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div className="absolute top-[30px] right-[34px] flex flex-col items-center z-20 w-[285px]">
            <div className="w-full mb-2">
              <p className="text-black font-black text-[24px] uppercase tracking-wide leading-none">
                ID NUMBER:
              </p>
              <p className="text-black font-black text-[20px] tracking-wide mt-2">
                {resident.resident_code || "—"}
              </p>
            </div>

            <div className="w-[245px] h-[205px] bg-[#efefef] border-[3px] border-black flex items-center justify-center p-2 mb-3">
              {qrImage ? (
                <img src={qrImage} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <Loader2 className="animate-spin text-stone-300 w-10 h-10" />
              )}
            </div>

            <p className="text-black text-[11px] leading-[1.15] text-center font-medium tracking-wide w-[260px]">
              This QR Code contains verified resident data.
              <br />
              Scan using authorized LGU devices only.
            </p>
          </div>
        </div>
      </div>

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