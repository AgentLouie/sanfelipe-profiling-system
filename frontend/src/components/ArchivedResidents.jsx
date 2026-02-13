import { useEffect, useState } from 'react';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { RotateCcw, Archive, Loader2, UserX, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ArchivedResidents() {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchArchived = async () => {
    try {
      const res = await api.get('/residents/archived');
      setResidents(res.data); 
    } catch (err) {
      toast.error("Failed to load archived residents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchived();
  }, []);

  const handleRestore = async (id) => {
    setRestoringId(id);
    try {
      await api.put(`/residents/${id}/restore`);
      toast.success("Resident restored successfully!");
      
      setResidents(prev => prev.filter(r => r.id !== id));
      
      if (currentData.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (err) {
      toast.error("Restore failed.");
    } finally {
      setRestoringId(null);
    }
  };

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(residents.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = residents.slice(indexOfFirstItem, indexOfLastItem);

  const handlePrevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3 text-red-600 animate-pulse">
        <Loader2 size={32} className="animate-spin" />
        <span className="text-xs font-bold uppercase tracking-widest">Loading Archives...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: { border: '1px solid #fee2e2', color: '#991b1b' }
        }} 
      />

      {/* HEADER */}
      <div className="flex items-center gap-3 pb-4 border-b border-red-200">
        <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-md shadow-red-200">
          <Archive size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-red-700">
            Archived Residents
          </h1>
          <p className="text-xs font-medium text-stone-500">
            View and restore previously removed records
          </p>
        </div>
      </div>

      {/* CONTENT */}
      {residents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-red-50/30 border-2 border-dashed border-red-200 rounded-2xl text-center">
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-red-400 mb-4 shadow-sm border border-red-100">
            <UserX size={28} />
          </div>
          <p className="text-stone-600 font-bold">No archived residents found.</p>
          <p className="text-xs text-stone-400 mt-1">When items are removed, they will appear here.</p>
        </div>
      ) : (
        <>
          {/* LIST */}
          <div className="grid grid-cols-1 gap-3">
            {currentData.map((r) => (
              <div 
                key={r.id} 
                className="group bg-white border border-red-100 rounded-xl p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 shadow-sm hover:shadow-lg hover:shadow-red-50 hover:border-red-300 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold text-sm border border-red-100 group-hover:bg-red-600 group-hover:text-white transition-all">
                     {r.first_name[0]}{r.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-stone-800 group-hover:text-red-700 transition-colors">
                      {r.last_name}, {r.first_name}
                    </p>
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wide bg-red-50 border border-red-100 inline-block px-2 py-0.5 rounded-md mt-1">
                      {r.barangay}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(r.id)}
                  disabled={restoringId === r.id}
                  className="
                    flex items-center justify-center gap-2 px-6 py-2.5 
                    text-sm font-bold text-white 
                    bg-red-600 hover:bg-red-700
                    rounded-xl shadow-md shadow-red-100 
                    transform active:scale-95 transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {restoringId === r.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  {restoringId === r.id ? "Restoring..." : "Restore Member"}
                </button>
              </div>
            ))}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-6 border-t border-red-100">
              <p className="text-xs font-bold text-stone-400">
                Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, residents.length)} of {residents.length}
              </p>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-600 transition-all"
                >
                  <ChevronLeft size={18} />
                </button>
                
                <div className="bg-red-50 px-4 py-1.5 rounded-lg border border-red-100">
                   <span className="text-xs font-bold text-red-700">
                    {currentPage} / {totalPages}
                  </span>
                </div>

                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-red-600 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}