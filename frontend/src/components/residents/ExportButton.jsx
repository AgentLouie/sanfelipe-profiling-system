import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || "https://sanfelipe-profiling-system-production.up.railway.app";

export default function ExportButton({ barangay }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    const token = localStorage.getItem('token') || localStorage.getItem('access_token');
    if (!token) {
        toast.error("Please log in again.");
        setLoading(false);
        return;
    }

    try {
      const params = new URLSearchParams();
      if (barangay && barangay !== "All Barangays") {
        params.append('barangay', barangay);
      }

      const response = await fetch(`${API_URL}/export/excel?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Export failed.");
      }

      if (!response.ok) throw new Error("Server error.");

      const disposition = response.headers.get('Content-Disposition');
      let filename = "SanFelipe_Report.xlsx"; 

      if (disposition && disposition.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/["']/g, "").trim();
      } else {
        const safeName = barangay ? barangay.replace(/\s+/g, '_') : 'All';
        filename = `SanFelipe_Households_${safeName}.xlsx`;
      }

      const blob = await response.blob(); 
      
      if (!blob || blob.size === 0) {
          throw new Error("File is empty or failed to download.");
      }

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Downloaded: ${filename}`);

    } catch (error) {
      console.error("Export Error:", error);
      toast.error(error.message || "Failed to download.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={handleExport} 
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm shadow-rose-200"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        {loading ? "Generating..." : "Export to Excel"}
      </button>
    </>
  );
}