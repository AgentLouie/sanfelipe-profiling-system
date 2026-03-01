import { useState } from "react";
import api from "../../api/api";
import { 
  Search, ScanLine, Loader2, ShieldCheck, 
  User, Calendar, Heart, Briefcase, Phone, 
  MapPin, Users, ShieldAlert 
} from "lucide-react";

export default function QRScanner() {
  const [input, setInput] = useState("");
  const [resident, setResident] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const logoUrl = "/san_felipe_seal.png";

  const handleScan = async (value) => {
    if (!value) return;

    setLoading(true);
    setError(false);

    try {
      const response = await api.get(`/residents/code/${value}`);
      setResident(response.data);
    } catch (err) {
      console.error("Resident not found");
      setResident(null);
      setError(true);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans pb-12">
      <div className="max-w-4xl mx-auto px-4 py-12">

        {/* --- HEADER --- */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-200 shadow-sm p-1">
            <img
              src={logoUrl}
              alt="Municipality Seal"
              className="w-full h-full object-contain rounded-full"
              onError={(e) => (e.target.style.display = 'none')}
            />
          </div>
          <h1 className="text-3xl font-medium text-stone-800 tracking-tight">
            Identity Verification
          </h1>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-rose-700">
            <ShieldCheck size={16} />
            <p className="text-[11px] font-normal uppercase tracking-widest">
              Authorized Personnel Only
            </p>
          </div>
        </div>

        {/* --- INPUT SECTION --- */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm mb-8 animate-in fade-in duration-500">
          <label className="flex items-center gap-2 text-[11px] font-normal uppercase text-stone-400 mb-3 tracking-wider">
            <ScanLine size={16} className="text-rose-600" />
            Scan QR Code or Enter Registry ID
          </label>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute left-4 top-3.5 text-stone-400">
                <Search size={18} strokeWidth={2} />
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleScan(input);
                }}
                placeholder="Awaiting input..."
                className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-sm font-normal text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-rose-600 focus:ring-4 focus:ring-rose-100 focus:bg-white transition-all uppercase tracking-wide shadow-sm"
                autoFocus
              />
            </div>
            <button
              onClick={() => handleScan(input)}
              disabled={loading || !input}
              className="px-8 py-3 bg-stone-900 text-white text-sm font-medium uppercase tracking-wider rounded-xl hover:bg-stone-800 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : "Verify"}
            </button>
          </div>

          {/* ERROR STATE */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in zoom-in-95 duration-200 shadow-sm">
              <ShieldAlert size={18} />
              <p className="text-sm font-normal">No resident found matching this ID. Please try again.</p>
            </div>
          )}
        </div>

        {/* --- LOADING OVERLAY --- */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 animate-in fade-in">
            <Loader2 size={40} className="animate-spin text-rose-600 mb-4" strokeWidth={2} />
            <p className="text-xs font-normal text-stone-400 uppercase tracking-widest">
              Accessing Database...
            </p>
          </div>
        )}

        {/* --- RESULT CARD --- */}
        {resident && !loading && (
          <div className="bg-white border border-stone-200 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
            
            {/* CARD HEADER */}
            <div className="bg-rose-700 text-white px-6 md:px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-medium uppercase tracking-tight text-white drop-shadow-sm">
                  {resident.last_name}, {resident.first_name} {resident.middle_name || ''}
                </h2>
                <div className="flex items-center gap-2 mt-1.5 text-rose-100">
                  <MapPin size={14} />
                  <p className="text-xs font-normal uppercase tracking-wider">
                    {resident.barangay} – Purok {resident.purok}
                  </p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-lg inline-block text-center md:text-right">
                <p className="text-[10px] font-normal text-rose-200 uppercase tracking-widest mb-0.5">Registry ID</p>
                <p className="text-sm font-mono font-normal text-white tracking-widest">{resident.resident_code}</p>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col-reverse md:flex-row gap-8">
                
                {/* DATA GRID */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <Field icon={Calendar} label="Birthdate" value={resident.birthdate} />
                  <Field icon={Heart} label="Civil Status" value={resident.civil_status} />
                  <Field icon={User} label="Religion" value={resident.religion} />
                  <Field icon={Briefcase} label="Occupation" value={resident.occupation} />
                  <Field icon={Phone} label="Contact No." value={resident.contact_no} />
                  <Field icon={MapPin} label="Precinct No." value={resident.precinct_no} />

                  <div className="sm:col-span-2 bg-stone-50 p-4 rounded-xl border border-stone-200 shadow-sm">
                    <Field icon={ShieldCheck} label="Designated Sector" value={resident.sector_summary} highlight />
                  </div>
                </div>

                {/* PHOTO */}
                <div className="flex justify-center md:justify-end flex-shrink-0">
                  <div className="w-40 h-40 md:w-48 md:h-48 rounded-2xl border-4 border-stone-200 shadow-md overflow-hidden bg-stone-50 flex items-center justify-center p-1">
                    {resident.photo_url ? (
                      <img
                        src={resident.photo_url}
                        alt="Resident"
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="text-center">
                        <User size={32} className="mx-auto text-stone-300 mb-2" strokeWidth={1.5} />
                        <span className="text-[10px] font-normal text-stone-400 uppercase tracking-widest">No Photo</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* FAMILY SECTION */}
              <div className="mt-10 border-t border-stone-200 pt-8 space-y-8">
                
                {/* SPOUSE */}
                {(resident.spouse_first_name || resident.spouse_last_name) && (
                  <div>
                    <h3 className="flex items-center gap-2 text-[11px] font-normal uppercase tracking-widest text-stone-400 mb-4">
                      <Heart size={14} className="text-rose-500" />
                      Legal Spouse
                    </h3>
                    <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 inline-block min-w-[250px] shadow-sm">
                      <p className="text-sm font-normal text-stone-800 uppercase">
                        {resident.spouse_last_name}, {resident.spouse_first_name} {resident.spouse_middle_name || ""}
                      </p>
                    </div>
                  </div>
                )}

                {/* DEPENDENTS / MEMBERS */}
                {resident.family_members && resident.family_members.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-[11px] font-normal uppercase tracking-widest text-stone-400 mb-4">
                      <Users size={14} className="text-blue-500" />
                      Household Members
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {resident.family_members.map((member, index) => (
                        <div key={index} className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm hover:border-stone-300 transition-colors">
                          <p className="text-sm font-normal text-stone-800 uppercase tracking-tight">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-[10px] font-normal text-stone-400 uppercase tracking-wider mt-0.5">
                            {member.relationship}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* Reusable Field Component */
function Field({ label, value, icon: Icon, highlight = false }) {
  return (
    <div>
      <span className="flex items-center gap-1.5 text-[10px] font-normal uppercase text-stone-400 tracking-wider mb-1">
        {Icon && <Icon size={12} className={highlight ? "text-rose-600" : ""} strokeWidth={2} />}
        {label}
      </span>
      <p className={`text-sm font-normal uppercase ${highlight ? 'text-rose-700' : 'text-stone-800'}`}>
        {value || "N/A"}
      </p>
    </div>
  );
}