import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Loader2, ShieldAlert, Printer, ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";

const IdField = ({ label, value, width, valueClassName = "" }) => (
  <div className="flex flex-col" style={{ width }}>
    <div className="pb-1 text-center flex items-end justify-center min-h-[32px]">
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

// =========================
// Canvas helpers
// =========================

function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error("Missing image src"));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, maxWidth) {
  const content = String(text || "").trim();
  if (!content) return [" "];

  const words = content.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [" "];
}

// Match DOM preview size proportions
const DOM_W = 648;
const DOM_H = 408;

// 2x export for sharper PDF
const CW = 1296;
const CH = 816;

const SX = CW / DOM_W;
const SY = CH / DOM_H;
const SCALE_AVG = (SX + SY) / 2;

const X = (n) => n * SX;
const Y = (n) => n * SY;
const FS = (n) => Math.round(n * SCALE_AVG);

// =========================
// FRONT canvas
// =========================

async function drawFront(resident, formattedBirthdate, fullName, bgUrl, logoUrl) {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);

  // Background image
  try {
    const bg = await loadImage(bgUrl);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bg, 0, 0, CW, CH);
    ctx.restore();
  } catch (_) {}

  // Watermark
  try {
    const logo = await loadImage(logoUrl);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.drawImage(logo, X(648 - 40 - 420), Y((408 - 420) / 2), X(420), Y(420));
    ctx.restore();
  } catch (_) {}

  // Red diagonal banner
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(CW, 0);
  ctx.lineTo(X(466.56), 0); // 72% of 648
  ctx.lineTo(0, Y(257.04)); // 63% of 408
  ctx.closePath();
  ctx.fillStyle = "#cc0000";
  ctx.fill();
  ctx.restore();

  // Inner white border
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = X(1);
  ctx.strokeRect(X(10), Y(10), X(648 - 20), Y(408 - 20));

  // Seal
  try {
  const logo = await loadImage(logoUrl);
  const lx = X(24);
  const ly = Y(24);
  const lw = X(88);
  const lh = Y(88);

  ctx.save();
  ctx.beginPath();
  ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(logo, lx, ly, lw, lh);
  ctx.restore();
} catch (_) {}

  // Titles - match website more closely
ctx.save();
ctx.textAlign = "center";
ctx.fillStyle = "#d40000";
ctx.strokeStyle = "#ffffff";
ctx.lineJoin = "round";
ctx.lineCap = "round";

ctx.lineWidth = X(1.8);

// top line
ctx.font = `900 ${FS(36)}px Barlow, Arial Black, sans-serif`;
ctx.strokeText("SAN FELIPE", CW / 2, Y(48));
ctx.fillText("SAN FELIPE", CW / 2, Y(48));

// second line
ctx.font = `900 ${FS(34)}px Barlow, Arial Black, sans-serif`;
ctx.strokeText("RESIDENT ID CARD", CW / 2, Y(84));
ctx.fillText("RESIDENT ID CARD", CW / 2, Y(84));

ctx.restore();

  // Photo
  const px = X(95), py = Y(140), pw = X(155), ph = Y(180);
  ctx.fillStyle = "#efefef";
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = X(3);
  ctx.strokeRect(px, py, pw, ph);

  if (resident.photo_url) {
    try {
      const photo = await loadImage(resident.photo_url);
      ctx.drawImage(photo, px, py, pw, ph);
    } catch (_) {}
  } else {
    ctx.fillStyle = "#888";
    ctx.font = `bold ${FS(12)}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText("NO PHOTO", px + pw / 2, py + ph / 2);
  }

  // Resident label
  ctx.fillStyle = "#000";
  ctx.font = `900 ${FS(28)}px Arial Black, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("RESIDENT", px + pw / 2, Y(356));

  function drawField(label, value, x, y, w, valueFs = 16, labelFs = 13) {
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.font = `bold ${FS(valueFs)}px Arial, sans-serif`;

    const lines = wrapText(ctx, String(value || "").toUpperCase(), w - X(8));
    const lineHeight = FS(valueFs) + Y(2);
    lines.forEach((line, i) => {
      ctx.fillText(line, x + w / 2, y + i * lineHeight);
    });

    ctx.fillStyle = "#222";
    ctx.font = `500 ${FS(labelFs)}px Arial, sans-serif`;
    ctx.fillText(label, x + w / 2, y + lineHeight * lines.length + Y(16));
  }

  const fx = X(320);
  const fw = X(648 - 320 - 40);
  let fy = Y(145);

  drawField("Last Name, First Name, M.I", fullName, fx, fy, fw, 17, 13);
  fy += Y(72);

  const col1 = fw * 0.22;
  const col2 = fw * 0.42;
  const col3 = fw * 0.36;

  drawField("Sex", resident.sex || "", fx, fy, col1, 16, 13);
  drawField("Date of Birth", formattedBirthdate || "", fx + col1, fy, col2, 15, 13);
  drawField("Civil Status", resident.civil_status || "", fx + col1 + col2, fy, col3, 16, 13);

  fy += Y(66);
  drawField("Contact No.", resident.contact_no || "", fx, fy, fw * 0.48, 16, 13);

  return canvas;
}

// =========================
// BACK canvas
// =========================

async function drawBack(
  resident,
  emergencyName,
  emergencyContactNo,
  emergencyAddress,
  qrSrc,
  bgUrl,
  logoUrl
) {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);

  // Background image
  try {
    const bg = await loadImage(bgUrl);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bg, 0, 0, CW, CH);
    ctx.restore();
  } catch (_) {}

  // Watermark
  try {
    const logo = await loadImage(logoUrl);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.drawImage(logo, X(648 - 40 - 420), Y((408 - 420) / 2), X(420), Y(420));
    ctx.restore();
  } catch (_) {}

  // Red triangle
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(X(648 * 0.7), 0);
  ctx.lineTo(0, Y(408 * 0.6));
  ctx.closePath();
  ctx.fillStyle = "#cc0000";
  ctx.fill();
  ctx.restore();

  // Inner border
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = X(1);
  ctx.strokeRect(X(10), Y(10), X(648 - 20), Y(408 - 20));

  // Seal
  try {
  const logo = await loadImage(logoUrl);
  const lx = X(24);
  const ly = Y(24);
  const lw = X(88);
  const lh = Y(88);

  ctx.save();
  ctx.beginPath();
  ctx.arc(lx + lw / 2, ly + lh / 2, Math.min(lw, lh) / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(logo, lx, ly, lw, lh);
  ctx.restore();
} catch (_) {}

  // Emergency section
  const leftX = X(120);
  let topY = Y(190);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.font = `500 ${FS(16)}px Arial, sans-serif`;
  ctx.fillText("In Case of Emergency", leftX, topY);
  topY += Y(28);

  function drawEmergencyBlock(value, y, valueFs = 14, maxWidth = 235) {
  const val = String(value || " ").toUpperCase();
  ctx.fillStyle = "#000";
  ctx.font = `bold ${FS(valueFs)}px Arial, sans-serif`;
  const lines = wrapText(ctx, val, X(maxWidth));
  const lineHeight = FS(valueFs) + Y(3);

  lines.forEach((line, i) => {
    ctx.fillText(line, leftX, y + i * lineHeight);
  });

  return y + lines.length * lineHeight + Y(14);
  }

  topY = drawEmergencyBlock(emergencyName, topY, 14, 210);
  topY = drawEmergencyBlock(emergencyContactNo, topY, 14, 210);
  drawEmergencyBlock(emergencyAddress, topY, 13, 210);

  // Right section
  const rx = X(648 - 34 - 285);
  let ry = Y(60);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.font = `900 ${FS(22)}px Arial Black, sans-serif`;

  const idY = ry + Y(30);
  const label = "ID NUMBER:";
  ctx.fillText(label, rx, idY);

  const labelWidth = ctx.measureText(label).width;
  ctx.fillText(resident.resident_code || "—", rx + labelWidth + X(8), idY);

  // QR
  const qx = X(648 - 34 - 245);
  const qy = Y(135);
  const qw = X(245);
  const qh = Y(205);

  ctx.fillStyle = "#efefef";
  ctx.fillRect(qx, qy, qw, qh);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = X(3);
  ctx.strokeRect(qx, qy, qw, qh);

  if (qrSrc) {
    try {
      const qr = await loadImage(qrSrc);
      ctx.drawImage(qr, qx + X(8), qy + Y(8), qw - X(16), qh - Y(16));
    } catch (_) {}
  }

  // Caption
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.font = `500 ${FS(11)}px Arial, sans-serif`;
  ctx.fillText(
    "This QR Code contains verified resident data.",
    qx + qw / 2,
    qy + qh + Y(20)
  );
  ctx.fillText(
    "Scan using authorized LGU devices only.",
    qx + qw / 2,
    qy + qh + Y(35)
  );

  return canvas;
}

// =========================
// Component
// =========================

export default function ResidentQRPage() {
  const { code } = useParams();
  const navigate = useNavigate();

  const [resident, setResident] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const emergencyName = useMemo(() => resident?.emergency_name || " ", [resident]);
  const emergencyContactNo = useMemo(() => resident?.emergency_contact_no || " ", [resident]);
  const emergencyAddress = useMemo(() => resident?.emergency_address || " ", [resident]);

  const handleDownloadPDF = async () => {
    if (!resident) return;

    setDownloadingPdf(true);
    try {
      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      const [frontCanvas, backCanvas] = await Promise.all([
        drawFront(resident, formattedBirthdate, fullName, bgUrl, logoUrl),
        drawBack(
          resident,
          emergencyName,
          emergencyContactNo,
          emergencyAddress,
          qrImage,
          bgUrl,
          logoUrl
        ),
      ]);

      const CARD_W = 3.375;
      const CARD_H = 2.125;

      const pdf = new jsPDF({
      orientation: "landscape",
      unit: "in",
      format: [CARD_W, CARD_H],
      compress: true,
    });

    pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W, CARD_H);
    pdf.addPage([CARD_W, CARD_H], "landscape");
    pdf.addImage(backCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W, CARD_H);

      pdf.save(`ResidentID_${resident?.resident_code || "card"}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

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
          <div className="absolute inset-0 z-0">
            <img
              src={bgUrl}
              alt=""
              className="w-full h-full object-cover grayscale-[40%] brightness-110"
              style={{ opacity: 0.3 }}
            />
          </div>

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

          <div
            className="absolute inset-0 z-10"
            style={{ filter: "drop-shadow(0px 6px 8px rgba(0,0,0,0.35))" }}
          >
            <div
              className="absolute inset-0 bg-[#cc0000]"
              style={{ clipPath: "polygon(0 0, 100% 0, 72% 0, 0 63%)" }}
            />
          </div>

          <div className="absolute inset-[10px] border border-white/80 z-10" />

          <img
            src={logoUrl}
            alt="San Felipe Seal"
            className="absolute top-6 left-6 w-[88px] h-[88px] z-20 drop-shadow-md rounded-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

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

          <div className="absolute top-[145px] left-[320px] right-[40px] flex flex-col gap-5 z-20">
            <IdField
              label="Last Name, First Name, M.I"
              value={fullName}
              width="100%"
              valueClassName="text-[17px]"
            />

            <div className="flex gap-4 w-full">
              <IdField label="Sex" value={resident.sex} width="22%" />
              <IdField
                label="Date of Birth"
                value={formattedBirthdate}
                width="42%"
                valueClassName="text-[15px]"
              />
              <IdField label="Civil Status" value={resident.civil_status} width="36%" />
            </div>

            <div className="flex w-full">
              <IdField label="Contact No." value={resident.contact_no} width="48%" />
            </div>
          </div>
        </div>

        {/* BACK */}
        <div className="id-card relative w-[648px] h-[408px] rounded-2xl overflow-hidden shadow-2xl border border-stone-400 bg-white flex-shrink-0 print:w-[3.375in] print:h-[2.125in] print:rounded-none print:shadow-none print:border-0 print:break-inside-avoid">
          <div className="absolute inset-0 z-0">
            <img
              src={bgUrl}
              alt=""
              className="w-full h-full object-cover grayscale-[40%] brightness-110"
              style={{ opacity: 0.3 }}
            />
          </div>

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

          <div
            className="absolute inset-0 z-10"
            style={{ filter: "drop-shadow(0px 6px 8px rgba(0,0,0,0.35))" }}
          >
            <div
              className="absolute inset-0 bg-[#cc0000]"
              style={{ clipPath: "polygon(0 0, 70% 0, 0 60%)" }}
            />
          </div>

          <div className="absolute inset-[10px] border border-white/80 z-10" />

          <img
            src={logoUrl}
            alt="San Felipe Seal"
            className="absolute top-6 left-6 w-[88px] h-[88px] z-20 drop-shadow-md rounded-full"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />

          <div className="absolute top-[190px] left-[90px] w-[235px] z-20">
            <p className="text-black text-[16px] font-medium text-left mb-3">
              In Case of Emergency
            </p>

            <div className="mb-3">
              <p className="text-black text-[14px] font-bold leading-tight break-words w-full uppercase">
                {emergencyName || "\u00A0"}
              </p>
            </div>

            <div className="mb-3">
              <p className="text-black text-[14px] font-bold leading-tight break-words w-full">
                {emergencyContactNo || "\u00A0"}
              </p>
            </div>

            <div>
              <p className="text-black text-[13px] font-bold leading-tight break-words w-full uppercase">
                {emergencyAddress || "\u00A0"}
              </p>
            </div>
          </div>

          <div className="absolute top-[60px] right-[34px] flex flex-col items-center z-20 w-[285px]">
            <div className="w-full mb-3 flex items-center gap-3 justify-start">
              <p className="text-black font-black text-[24px] uppercase tracking-wide leading-none whitespace-nowrap">
                ID NUMBER:
              </p>
              <p className="text-black font-black text-[24px] tracking-wide leading-none whitespace-nowrap">
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
          onClick={handleDownloadPDF}
          disabled={downloadingPdf}
          className="flex items-center gap-2 px-6 py-3 bg-stone-800 text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-stone-900 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {downloadingPdf ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download size={18} />
              Download PDF
            </>
          )}
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