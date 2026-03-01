import { useState, useEffect } from 'react';
import api from '../../api/api';
import { 
  X, Plus, Trash2, User, Users, MapPin, Briefcase, Heart, Save, Phone, 
  Fingerprint, FileText, ChevronDown, Check, AlertCircle, Loader2 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import Cropper from "react-easy-crop";

// --- REUSABLE COMPONENTS ---

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

async function getCroppedImg(imageSrc, croppedAreaPixels) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const file = new File([blob], "profile.jpg", {
        type: "image/jpeg",
      });
      resolve(file);
    }, "image/jpeg");
  });
}

const SectionHeader = ({ icon: Icon, title, colorClass = "text-slate-600" }) => (
  <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
    <div className={`p-2 rounded-xl bg-white border border-slate-100 shadow-sm ${colorClass}`}>
      <Icon size={18} strokeWidth={2} />
    </div>
    <div>
      <h3 className="font-normal text-slate-700 tracking-tight">{title}</h3>
    </div>
  </div>
);

const SelectGroup = ({ label, name, value, onChange, options, required = false, disabled = false, placeholder, className = "" }) => (
  <div className="space-y-1.5 w-full">
    <label className="flex items-center text-[11px] font-normal text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      <select 
        name={name} 
        value={value || ''} 
        onChange={onChange} 
        required={required} 
        disabled={disabled}
        className={`
          w-full px-4 py-3 border rounded-xl
          text-sm font-normal appearance-none outline-none transition-all cursor-pointer
          ${className}
          ${disabled 
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
            : 'bg-slate-50 text-slate-800 border-slate-200 focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-50 hover:border-slate-300'
          }
        `}
      >
        <option value="" disabled className="text-slate-400">
          {placeholder || (disabled ? "System Assigned" : "Select Option")}
        </option>
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.name || opt.id : opt;
          const key = typeof opt === 'object' ? opt.id || opt.name : opt;
          return <option key={key} value={val}>{val}</option>
        })}
      </select>
      <ChevronDown
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        size={16}
      />
    </div>
  </div>
);

const InputGroup = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  className = ""
}) => (
  <div className={`flex flex-col gap-1.5 w-full ${className}`}>
    <label className="flex items-center text-[11px] font-normal text-slate-400 uppercase tracking-wider">
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </label>

    <input
      type={type}
      name={name}
      value={value || ""}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      className={`
        w-full px-4 py-3
        bg-slate-50 border border-slate-200 rounded-xl
        text-sm font-normal text-slate-800 placeholder:text-slate-300
        focus:bg-white focus:border-red-400 focus:ring-4 focus:ring-red-50 hover:border-slate-300
        outline-none transition-all
        ${type === "date" ? "uppercase tracking-wide" : "uppercase"}
      `}
    />
  </div>
);


// --- INITIAL STATE ---
const getInitialFormState = () => ({
  last_name: '', first_name: '', middle_name: '', ext_name: '',
  house_no: '', purok: '', barangay: '',
  birthdate: '', sex: '', civil_status: '',
  religion: '',
  occupation: '', precinct_no: '', contact_no: '',
  spouse_last_name: '', spouse_first_name: '', spouse_middle_name: '', spouse_ext_name: '',
  sector_ids: [], family_members: [], other_sector_details: '' 
});

export default function AddResidentForm({ onSuccess, onCancel, residentToEdit }) {
  const [formData, setFormData] = useState(getInitialFormState());
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [purokOptions, setPurokOptions] = useState([]);
  const [sectorOptions, setSectorOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const userRole = localStorage.getItem('role') || 'staff'; 

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [bRes, pRes, sRes] = await Promise.all([
          api.get('/barangays/'), api.get('/puroks/'), api.get('/sectors/')
        ]);
        setBarangayOptions(bRes.data);
        setPurokOptions(pRes.data);
        setSectorOptions(sRes.data);
      } catch (err) { toast.error("System Error: Failed to load form options."); }
    };
    fetchOptions();
  }, []);

  // --- POPULATE EDIT DATA ---
  useEffect(() => {
    if (residentToEdit && barangayOptions.length && purokOptions.length) {

      const normalizeSelect = (value, options) => {
        if (!value) return '';
        const cleaned = value.toLowerCase().trim();
        const match = options.find(opt => {
          const optionValue = (opt.name || opt).toLowerCase().trim();
          return (
            optionValue === cleaned ||
            optionValue.replace("purok", "").trim() === cleaned.replace("purok", "").trim()
          );
        });
        return match ? (match.name || match) : '';
      };

      const normalizeSex = (value) => {
        if (!value) return '';
        const v = value.toLowerCase().trim();
        if (v === 'm' || v === 'male') return 'Male';
        if (v === 'f' || v === 'female') return 'Female';
        return '';
      };

      const normalizeCivilStatus = (value) => {
        if (!value) return '';
        const v = value.toLowerCase().trim();
        if (v === 'single') return 'Single';
        if (v === 'married') return 'Married';
        if (v === 'widowed') return 'Widowed';
        if (v.includes('live')) return 'Live-in Partner';
        return '';
      };

      setFormData({
        ...getInitialFormState(),
        ...residentToEdit,
        birthdate: residentToEdit.birthdate
          ? residentToEdit.birthdate.split("T")[0]
          : "",
        sex: normalizeSex(residentToEdit.sex),
        civil_status: normalizeCivilStatus(residentToEdit.civil_status),
        barangay: normalizeSelect(residentToEdit.barangay, barangayOptions),
        purok: normalizeSelect(residentToEdit.purok, purokOptions),
        sector_ids: residentToEdit.sectors
          ? residentToEdit.sectors.map((s) => s.id)
          : [],
        family_members: residentToEdit.family_members || [],
      });

      if (residentToEdit.photo_url) {
        setPhotoPreview(residentToEdit.photo_url);
      } else {
        setPhotoPreview(null);
      }
    }
  }, [residentToEdit, barangayOptions, purokOptions]);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      if (name === "civil_status" && value !== "Married" && value !== "Live-in Partner") {
        newState.spouse_last_name = '';
        newState.spouse_first_name = '';
        newState.spouse_middle_name = '';
        newState.spouse_ext_name = '';
      }
      return newState;
    });
  };

  const handleSectorToggle = (id) => {
    setFormData(prev => ({
      ...prev,
      sector_ids: prev.sector_ids.includes(id) 
        ? prev.sector_ids.filter(sid => sid !== id) 
        : [...prev.sector_ids, id]
    }));
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      family_members: [...prev.family_members, { first_name: '', last_name: '', relationship: '' }]
    }));
  };

  const handleFamilyChange = (index, field, value) => {
    const updated = [...formData.family_members];
    updated[index][field] = value;
    setFormData({ ...formData, family_members: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;

      if (residentToEdit) {
        response = await api.put(`/residents/${residentToEdit.id}`, formData);

        if (photoFile) {
          const form = new FormData();
          form.append("file", photoFile);
          await api.post(
            `/residents/${residentToEdit.id}/upload-photo`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }

        toast.success("Resident Record Updated.");
        setTimeout(onSuccess, 1000);

      } else {
        response = await api.post('/residents/', formData);
        const newResident = response.data;

        if (photoFile && newResident?.id) {
          const form = new FormData();
          form.append("file", photoFile);
          await api.post(
            `/residents/${newResident.id}/upload-photo`,
            form,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
        }

        toast.success("New Resident Registered.");

        setTimeout(() => {
          setFormData(getInitialFormState());
          setPhotoFile(null);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setLoading(false);
          onSuccess();
        }, 1000);
      }

    } catch (err) {
      if (err.response?.data?.detail) {
        toast.error(err.response.data.detail);
      } else {
        toast.error("Registration failed.");
      }
      setLoading(false);
    }
  };

  const isOtherSelected = sectorOptions.find(s => s.name.toLowerCase().includes('other') && formData.sector_ids.includes(s.id));

  return (
    <div className="max-w-6xl mx-auto pb-32 animate-in fade-in duration-300 font-sans text-slate-800"> 
      <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#fff', borderRadius: '12px', fontSize: '14px' } }} />
      
      {/* HEADER */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm">
             {residentToEdit ? <FileText size={24} strokeWidth={1.5} /> : <User size={24} strokeWidth={1.5} />}
          </div>
          <div>
            <h1 className="text-2xl font-medium text-slate-800 tracking-tight">
              {residentToEdit ? "Update Resident Profile" : "Resident Registration"}
            </h1>
            <p className="text-sm font-normal text-slate-400 mt-1">
              {residentToEdit ? "Modify existing resident data and records." : "Enter details to register a new resident into the system."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* --- PERSONAL INFO --- */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 md:px-8 py-6">
             <SectionHeader icon={User} title="Personal Information" colorClass="text-blue-600" />
             
            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <InputGroup label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} required placeholder="DELA CRUZ" className="lg:col-span-1" />
                <InputGroup label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} required placeholder="JUAN" className="lg:col-span-1" />
                <InputGroup label="Middle Name" name="middle_name" value={formData.middle_name} onChange={handleChange} placeholder="SANTOS" />
                <InputGroup label="Suffix" name="ext_name" value={formData.ext_name} onChange={handleChange} placeholder="JR, SR, III" />
              </div>
              
              {/* PHOTO UPLOAD SECTION */}
              <div>
                <label className="text-[11px] font-normal text-slate-400 uppercase tracking-wider block mb-3">
                  Resident Photo
                </label>
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Resident Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-slate-300" strokeWidth={1.5} />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => {
                          setImageSrc(reader.result);
                          setCropModalOpen(true);
                        };
                      }}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-normal file:bg-slate-100 file:text-slate-600 hover:file:bg-slate-200 transition-colors cursor-pointer"
                    />
                    <p className="text-xs text-slate-400 mt-2 font-normal">Recommended: Square image, max 5MB.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <InputGroup label="Date of Birth" name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} required />
                <SelectGroup label="Sex" name="sex" value={formData.sex} onChange={handleChange} options={['Male', 'Female']} required placeholder="Select Gender" />
                <SelectGroup label="Civil Status" name="civil_status" value={formData.civil_status} onChange={handleChange} options={['Single', 'Married', 'Widowed', 'Live-in Partner']} required placeholder="Select Status" />
                <InputGroup label="Religion" name="religion" value={formData.religion} onChange={handleChange} placeholder="ROMAN CATHOLIC" />
              </div>

              {/* SPOUSE SECTION */}
              {(formData.civil_status === 'Married' || formData.civil_status === 'Live-in Partner') && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 mb-5 text-slate-400">
                    <Heart size={16} className="text-red-400" strokeWidth={2} />
                    <span className="text-[11px] font-normal uppercase tracking-wider">Spouse / Partner Details</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <InputGroup label="Spouse Last Name" name="spouse_last_name" value={formData.spouse_last_name} onChange={handleChange} />
                    <InputGroup label="Spouse First Name" name="spouse_first_name" value={formData.spouse_first_name} onChange={handleChange} />
                    <InputGroup label="Spouse Middle Name" name="spouse_middle_name" value={formData.spouse_middle_name} onChange={handleChange} />
                    <InputGroup label="Suffix" name="spouse_ext_name" value={formData.spouse_ext_name} onChange={handleChange} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-slate-100 pt-6">
                <InputGroup label="Occupation / Profession" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="E.G. FARMER, EMPLOYEE" />
                <InputGroup label="Mobile Number" name="contact_no" value={formData.contact_no} onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); setFormData(prev => ({ ...prev, contact_no: val })); }} placeholder="09XXXXXXXXX" />
                <InputGroup label="Precinct / Voter ID" name="precinct_no" value={formData.precinct_no} onChange={handleChange} placeholder="OPTIONAL" />
              </div>
            </div>
          </div>
        </div>

        {/* --- ADDRESS --- */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="px-6 md:px-8 py-6">
             <SectionHeader icon={MapPin} title="Residency & Location" colorClass="text-emerald-600" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <InputGroup label="House No. / Street" name="house_no" value={formData.house_no} onChange={handleChange} placeholder="House No. / Street Name" />
              <SelectGroup label="Purok / Zone" name="purok" value={formData.purok} onChange={handleChange} options={purokOptions} required placeholder="Select Purok" />
              <SelectGroup 
                label="Barangay"
                name="barangay" 
                value={formData.barangay} 
                onChange={handleChange} 
                options={barangayOptions} 
                required={userRole === 'admin'} 
                disabled={userRole !== 'admin'} 
                placeholder={userRole === 'admin' ? "Select Barangay" : "Auto-Assigned"}
              />
            </div>
          </div>
        </div>

        {/* --- SECTORS --- */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
           <div className="px-6 md:px-8 py-6">
             <SectionHeader icon={Briefcase} title="Sectoral Classification" colorClass="text-purple-600" />
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
               {sectorOptions.map((s) => (
                 <label 
                   key={s.id} 
                   className={`
                     flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all h-28 text-center select-none
                     ${formData.sector_ids.includes(s.id) 
                       ? 'bg-slate-900 border-slate-900 text-white shadow-md transform scale-[1.02]' 
                       : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                     }
                   `}
                 >
                   <input type="checkbox" className="hidden" checked={formData.sector_ids.includes(s.id)} onChange={() => handleSectorToggle(s.id)} />
                   {formData.sector_ids.includes(s.id) ? <Check size={24} className="text-white" strokeWidth={2} /> : <div className="w-5 h-5 rounded-md border-2 border-slate-200"></div>}
                   <span className="text-xs font-normal uppercase tracking-wide leading-tight">{s.name}</span>
                 </label>
               ))}
             </div>
             {isOtherSelected && (
               <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
                 <InputGroup label="Please Specify Other Sector" name="other_sector_details" value={formData.other_sector_details} onChange={handleChange} placeholder="Enter Details" />
               </div>
             )}
           </div>
        </div>

        {/* --- FAMILY MEMBERS --- */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
           <div className="px-6 md:px-8 py-6">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
               <div className="flex-1">
                 <SectionHeader icon={Fingerprint} title="Household Members" colorClass="text-amber-600" />
               </div>
               <button type="button" onClick={addFamilyMember} className="flex items-center justify-center gap-2 text-xs font-normal uppercase tracking-wider bg-slate-100 text-slate-600 px-5 py-2.5 rounded-xl hover:bg-slate-200 transition-colors shadow-sm -mt-8 sm:mt-0">
                  <Plus size={16} strokeWidth={2} /> Add Member
               </button>
             </div>
             
             <div className="space-y-4">
               {formData.family_members.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                     <Users size={32} className="mx-auto text-slate-300 mb-3" strokeWidth={1.5} />
                     <p className="text-sm font-normal text-slate-400">No additional household members listed.</p>
                  </div>
               )}
               {formData.family_members.map((member, index) => (
                 <div key={index} className="flex flex-col md:flex-row gap-4 p-5 bg-slate-50 border border-slate-200 rounded-2xl relative items-end animate-in fade-in duration-300">
                   <div className="flex-1 w-full">
                      <InputGroup label="First Name" value={member.first_name} onChange={(e) => handleFamilyChange(index, 'first_name', e.target.value)} placeholder="Given Name" />
                   </div>
                   <div className="flex-1 w-full">
                      <InputGroup label="Last Name" value={member.last_name} onChange={(e) => handleFamilyChange(index, 'last_name', e.target.value)} placeholder="Surname" />
                   </div>
                   <div className="flex-1 w-full">
                      <SelectGroup label="Relationship" value={member.relationship} onChange={(e) => handleFamilyChange(index, 'relationship', e.target.value)} options={['Son', 'Daughter', 'Mother', 'Father', 'Sibling', 'Grandparent', 'Grandchild']} placeholder="Select Relation" />
                   </div>
                   <button type="button" onClick={() => setFormData({...formData, family_members: formData.family_members.filter((_, i) => i !== index)})} className="p-3 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-xl transition-colors shrink-0" title="Remove Member">
                      <Trash2 size={18} strokeWidth={2} />
                   </button>
                 </div>
               ))}
             </div>
           </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="fixed bottom-0 left-0 lg:left-[280px] right-0 p-5 bg-white/90 backdrop-blur-md border-t border-slate-200 flex items-center justify-between z-40 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
           <div className="hidden md:flex items-center gap-2.5 text-sm text-slate-400 font-normal px-4">
             <AlertCircle size={18} className="text-blue-400" strokeWidth={2} />
             <span>Please verify all data before saving to the registry.</span>
           </div>
           <div className="flex gap-3 w-full md:w-auto">
              <button type="button" onClick={onCancel} className="flex-1 md:flex-none px-6 py-3 text-sm font-normal text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors shadow-sm">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 md:flex-none px-8 py-3 bg-red-600 text-white rounded-xl text-sm font-normal shadow-sm hover:bg-red-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} strokeWidth={2} />}
                {loading ? "Processing..." : (residentToEdit ? "Update Record" : "Save Registry")}
              </button>
           </div>
        </div>
      </form>
      
      {/* CROP MODAL */}
      {cropModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-medium text-slate-800 mb-4">Crop Photo</h3>
            
            <div className="relative w-full h-[300px] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                objectFit="contain"
                restrictPosition={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(croppedArea, croppedPixels) =>
                  setCroppedAreaPixels(croppedPixels)
                }
              />
            </div>

            <div className="mt-6 mb-2">
              <label className="text-[11px] font-normal text-slate-400 uppercase tracking-wider">Zoom Adjust</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(e.target.value)}
                className="w-full mt-2 accent-red-600"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCropModalOpen(false)}
                className="px-5 py-2.5 text-sm font-normal text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const croppedImage = await getCroppedImg(
                    imageSrc,
                    croppedAreaPixels
                  );

                  setPhotoFile(croppedImage);
                  setPhotoPreview(URL.createObjectURL(croppedImage));

                  setCropModalOpen(false);
                }}
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-normal rounded-xl hover:bg-slate-800 transition-colors"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}