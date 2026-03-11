import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Loader2, ShieldAlert, Printer, ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";

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

const DOM_W = 648;
const DOM_H = 408;
const CW = 1296;
const CH = 816;

const SX = CW / DOM_W;
const SY = CH / DOM_H;
const SCALE_AVG = (SX + SY) / 2;

const X = (n) => n * SX;
const Y = (n) => n * SY;
const FS = (n) => Math.round(n * SCALE_AVG);

const FONT_FAMILY = "Barlow, Arial, sans-serif";
const FONT_BLACK = "900";
const FONT_BOLD = "700";
const FONT_MEDIUM = "500";

async function drawFront(resident, formattedBirthdate, fullName, bgUrl, logoUrl) {
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) throw new Error("Canvas context not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);

  try {
    const bg = await loadImage(bgUrl);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bg, 0, 0, CW, CH);
    ctx.restore();
  } catch (_) {}

  try {
    const logo = await loadImage(logoUrl);
    ctx.save();
    ctx.globalAlpha = 0.12;

    const wmW = X(420);
    const wmH = Y(420);
    const wmX = CW - wmW + X(55);
    const wmY = CH - wmH + Y(70);

    ctx.drawImage(logo, wmX, wmY, wmW, wmH);
    ctx.restore();
  } catch (_) {}

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(CW, 0);
  ctx.lineTo(X(466.56), 0);
  ctx.lineTo(0, Y(257.04));
  ctx.closePath();
  ctx.fillStyle = "#cc0000";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = X(1);
  ctx.strokeRect(X(10), Y(10), X(648 - 20), Y(408 - 20));

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

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#d40000";
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = X(1.8);

  ctx.font = `${FONT_BLACK} ${FS(36)}px ${FONT_FAMILY}`;
  ctx.strokeText("SAN FELIPE", CW / 2, Y(48));
  ctx.fillText("SAN FELIPE", CW / 2, Y(48));

  ctx.font = `${FONT_BLACK} ${FS(34)}px ${FONT_FAMILY}`;
  ctx.strokeText("RESIDENT ID CARD", CW / 2, Y(84));
  ctx.fillText("RESIDENT ID CARD", CW / 2, Y(84));
  ctx.restore();

  const px = X(95);
  const py = Y(140);
  const pw = X(155);
  const ph = Y(180);

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
    ctx.font = `${FONT_BOLD} ${FS(12)}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("NO PHOTO", px + pw / 2, py + ph / 2);
  }

  ctx.fillStyle = "#000";
  ctx.font = `${FONT_BLACK} ${FS(28)}px ${FONT_FAMILY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("RESIDENT", px + pw / 2, Y(356));

  function drawField(label, value, x, y, w, valueFs = 16, labelFs = 13, opts = {}) {
  const {
    boxH = 24,
    labelGap = 6,
    nowrap = false,
  } = opts;

  const safeValue = String(value || "").trim() || " ";
  const innerWidth = w - X(8);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  ctx.font = `${FONT_BOLD} ${FS(valueFs)}px ${FONT_FAMILY}`;

  const lines = nowrap ? [safeValue] : wrapText(ctx, safeValue, innerWidth);
  const lineHeight = Math.round(FS(valueFs) * 1.02);

  // value sits near bottom of its box
  const firstBaseline =
    y + Y(boxH) - Y(2) - (lines.length - 1) * lineHeight;

  lines.forEach((line, i) => {
    ctx.fillText(line, x + w / 2, firstBaseline + i * lineHeight);
  });

  ctx.fillStyle = "#222";
  ctx.font = `${FONT_MEDIUM} ${FS(labelFs)}px ${FONT_FAMILY}`;
  ctx.fillText(label, x + w / 2, y + Y(boxH + labelGap) + FS(labelFs));

  ctx.restore();
}

    const fx = X(320);
    const fw = X(648 - 320 - 40);

    const col1 = fw * 0.22;
    const col2 = fw * 0.42;
    const col3 = fw * 0.36;

    // tighter row positions to match your target image
    const row1Y = Y(138);
    const row2Y = Y(212);
    const row3Y = Y(276);

    drawField("Last Name, First Name, M.I", fullName, fx, row1Y, fw, 17, 13, {
    boxH: 26,
    labelGap: 4,
    });

    drawField("Sex", resident.sex || "", fx, row2Y, col1, 16, 13, {
    boxH: 22,
    labelGap: 4,
    });

    drawField(
    "Date of Birth",
    formattedBirthdate || "",
    fx + col1,
    row2Y,
    col2,
    15,
    13,
    {
        boxH: 22,
        labelGap: 4,
    }
    );

    drawField(
    "Civil Status",
    (resident.civil_status || "").replace("Live-in Partner", "Live-in Partner"),
    fx + col1 + col2,
    row2Y,
    col3,
    15,
    13,
    {
        boxH: 22,
        labelGap: 4,
        nowrap: true,
    }
    );

    drawField("Contact No.", resident.contact_no || "", fx, row3Y, fw * 0.48, 16, 13, {
    boxH: 24,
    labelGap: 4,
    });

  return canvas;
}

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
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) throw new Error("Canvas context not available");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CW, CH);

  try {
    const bg = await loadImage(bgUrl);
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.drawImage(bg, 0, 0, CW, CH);
    ctx.restore();
  } catch (_) {}

  try {
    const logo = await loadImage(logoUrl);
    ctx.save();
    ctx.globalAlpha = 0.12;

    const wmW = X(420);
    const wmH = Y(420);
    const wmX = CW - wmW + X(55);
    const wmY = CH - wmH + Y(70);

    ctx.drawImage(logo, wmX, wmY, wmW, wmH);
    ctx.restore();
  } catch (_) {}

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(X(648 * 0.7), 0);
  ctx.lineTo(0, Y(408 * 0.6));
  ctx.closePath();
  ctx.fillStyle = "#cc0000";
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = X(1);
  ctx.strokeRect(X(10), Y(10), X(648 - 20), Y(408 - 20));

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

  const leftX = X(120);
  let topY = Y(190);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${FONT_MEDIUM} ${FS(16)}px ${FONT_FAMILY}`;
  ctx.fillText("In Case of Emergency", leftX, topY);
  topY += Y(28);

  function drawEmergencyBlock(value, y, valueFs = 14, maxWidth = 235) {
    const val = String(value || " ").toUpperCase();
    ctx.fillStyle = "#000";
    ctx.font = `${FONT_BOLD} ${FS(valueFs)}px ${FONT_FAMILY}`;
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

  const rx = X(648 - 34 - 285);
  const ry = Y(60);

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${FONT_BLACK} ${FS(22)}px ${FONT_FAMILY}`;

  const idY = ry + Y(30);
  const label = "ID NUMBER:";
  ctx.fillText(label, rx, idY);

  const labelWidth = ctx.measureText(label).width;
  ctx.fillText(resident.resident_code || "—", rx + labelWidth + X(8), idY);

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

  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.font = `${FONT_MEDIUM} ${FS(11)}px ${FONT_FAMILY}`;
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

export default function PublicResidentPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get("token");

  const [resident, setResident] = useState(null);
  const [qrImage, setQrImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [renderingPreview, setRenderingPreview] = useState(false);

  const frontPreviewRef = useRef(null);
  const backPreviewRef = useRef(null);

  const logoUrl = "/san_felipe_seal.png";
  const bgUrl = "/sanfe.jpg";

  useEffect(() => {
    if (!code) return;

    if (!token) {
      setResident(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const response = await api.get(`/public/residents/code/${code}/card`, {
          params: { token },
        });
        setResident(response.data);

        const qrResponse = await api.get(`/public/residents/code/${code}/qr`, {
          params: { token },
          responseType: "blob",
        });

        const imageUrl = URL.createObjectURL(qrResponse.data);
        setQrImage(imageUrl);
      } catch (err) {
        console.error("Failed to fetch public resident card", err);
        setResident(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [code, token]);

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

  useEffect(() => {
    let cancelled = false;

    const renderPreview = async () => {
      if (!resident) return;

      setRenderingPreview(true);

      try {
        if (document.fonts) {
          await document.fonts.load("900 36px Barlow");
          await document.fonts.load("900 34px Barlow");
          await document.fonts.load("900 28px Barlow");
          await document.fonts.load("900 22px Barlow");
          await document.fonts.load("700 17px Barlow");
          await document.fonts.load("700 16px Barlow");
          await document.fonts.load("700 15px Barlow");
          await document.fonts.load("700 14px Barlow");
          await document.fonts.load("500 16px Barlow");
          await document.fonts.load("500 13px Barlow");
          await document.fonts.load("500 11px Barlow");
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

        if (cancelled) return;

        const frontEl = frontPreviewRef.current;
        const backEl = backPreviewRef.current;

        if (frontEl) {
          const fctx = frontEl.getContext("2d");
          if (fctx) {
            frontEl.width = CW;
            frontEl.height = CH;
            fctx.clearRect(0, 0, CW, CH);
            fctx.drawImage(frontCanvas, 0, 0);
          }
        }

        if (backEl) {
          const bctx = backEl.getContext("2d");
          if (bctx) {
            backEl.width = CW;
            backEl.height = CH;
            bctx.clearRect(0, 0, CW, CH);
            bctx.drawImage(backCanvas, 0, 0);
          }
        }
      } catch (err) {
        console.error("Preview render failed:", err);
      } finally {
        if (!cancelled) setRenderingPreview(false);
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
    };
  }, [
    resident,
    qrImage,
    formattedBirthdate,
    fullName,
    emergencyName,
    emergencyContactNo,
    emergencyAddress,
    bgUrl,
    logoUrl,
  ]);

  const handleDownloadPDF = async () => {
    if (!resident) return;

    setDownloadingPdf(true);
    try {
      if (document.fonts) {
        await document.fonts.load("900 36px Barlow");
        await document.fonts.load("900 34px Barlow");
        await document.fonts.load("900 28px Barlow");
        await document.fonts.load("900 22px Barlow");
        await document.fonts.load("700 17px Barlow");
        await document.fonts.load("700 16px Barlow");
        await document.fonts.load("700 15px Barlow");
        await document.fonts.load("700 14px Barlow");
        await document.fonts.load("500 16px Barlow");
        await document.fonts.load("500 13px Barlow");
        await document.fonts.load("500 11px Barlow");
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
        format: [CARD_H, CARD_W],
        compress: true,
      });

      pdf.addImage(frontCanvas.toDataURL("image/png"), "PNG", 0, 0, CARD_W, CARD_H);
      pdf.addPage([CARD_H, CARD_W], "landscape");
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
            The requested registry ID is invalid, unauthorized, or has been removed from the
            system.
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

          #qr-print-area > .print-canvas-wrap {
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
            background: white !important;
          }

          #qr-print-area > .print-canvas-wrap:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }

          .print-canvas {
            width: 648px !important;
            height: 408px !important;
            display: block !important;
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

      {renderingPreview && (
        <div className="mb-4 flex items-center gap-2 text-stone-600 text-sm font-semibold print:hidden">
          <Loader2 size={16} className="animate-spin" />
          Rendering preview...
        </div>
      )}

      <div
        id="qr-print-area"
        className="flex flex-col gap-8 items-center print:gap-0 print:flex-col"
      >
        <div className="print-canvas-wrap rounded-2xl overflow-hidden shadow-2xl border border-stone-400 bg-white print:rounded-none print:shadow-none print:border-0">
          <canvas
            ref={frontPreviewRef}
            className="print-canvas block w-[648px] h-[408px]"
          />
        </div>

        <div className="print-canvas-wrap rounded-2xl overflow-hidden shadow-2xl border border-stone-400 bg-white print:rounded-none print:shadow-none print:border-0">
          <canvas
            ref={backPreviewRef}
            className="print-canvas block w-[648px] h-[408px]"
          />
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