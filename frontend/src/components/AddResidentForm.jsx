import { useState, useEffect } from 'react';
import api from '../api';
import { X, Plus, Trash } from 'lucide-react';

export default function AddResidentForm({ onSuccess, onCancel, residentToEdit }) {
  // 1. STATE: Form Data
  const [formData, setFormData] = useState({
    last_name: '', first_name: '', middle_name: '', ext_name: '',
    house_no: '', purok: '', barangay: '',
    birthdate: '', sex: '', civil_status: '',
    religion: '', occupation: '', precinct_no: '', contact_no: '',
    spouse_last_name: '', spouse_first_name: '', spouse_middle_name: '', spouse_ext_name: '',
    sector_ids: [],
    family_members: []
  });

  // 2. STATE: Dynamic Options (Empty at start)
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [purokOptions, setPurokOptions] = useState([]);
  const [sectorOptions, setSectorOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 3. FETCH DATA FROM DB (The "Dynamic" Part)
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        // We ask the backend for the lists
        const [bRes, pRes, sRes] = await Promise.all([
          api.get('/barangays/'),
          api.get('/puroks/'),
          api.get('/sectors/')
        ]);

        // We save the real data into state
        setBarangayOptions(bRes.data);
        setPurokOptions(pRes.data);
        setSectorOptions(sRes.data);
      } catch (err) {
        console.error("Error loading dropdown options:", err);
        alert("Failed to load Barangays or Puroks. Please check backend.");
      }
    };
    fetchOptions();
  }, []);

  // 4. PRE-FILL FORM (If Editing)
  useEffect(() => {
    if (residentToEdit) {
      setFormData({
        ...residentToEdit,
        birthdate: residentToEdit.birthdate ? residentToEdit.birthdate.split('T')[0] : '',
        // Map sectors objects to just their IDs for the checkboxes
        sector_ids: residentToEdit.sectors ? residentToEdit.sectors.map(s => s.id) : [],
        family_members: residentToEdit.family_members || []
      });
    }
  }, [residentToEdit]);

  // --- HANDLERS ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSectorChange = (e) => {
    const sectorId = parseInt(e.target.value);
    if (!sectorId) return;

    setFormData(prev => {
      if (prev.sector_ids.includes(sectorId)) {
        // Uncheck: Remove ID
        return { ...prev, sector_ids: prev.sector_ids.filter(id => id !== sectorId) };
      } else {
        // Check: Add ID
        return { ...prev, sector_ids: [...prev.sector_ids, sectorId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (residentToEdit) {
        await api.put(`/residents/${residentToEdit.id}`, formData);
        alert("Resident Updated!");
      } else {
        await api.post('/residents/', formData);
        alert("Resident Added!");
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Error saving data. Please check all fields.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
      
      {/* 1. PERSONAL INFO */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="text-blue-800 font-bold mb-4 text-sm uppercase tracking-wide">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
          <input name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
          <input name="middle_name" placeholder="Middle Name" value={formData.middle_name} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
          <input name="ext_name" placeholder="Ext (Jr/Sr)" value={formData.ext_name} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required />
          
          <select name="sex" value={formData.sex} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required>
            <option value="">Select Sex</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>

          <select name="civil_status" value={formData.civil_status} onChange={handleChange} className="p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" required>
            <option value="">Select Civil Status</option>
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widow/er">Widow/er</option>
            <option value="Separated">Separated</option>
            <option value="Live-in Partner">Live-in Partner</option>
          </select>
        </div>
        
        {/* SPOUSE INFO (Only shows if Married/Live-in) */}
        {(formData.civil_status === 'Married' || formData.civil_status === 'Live-in Partner') && (
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-100">
             <label className="text-xs font-bold text-blue-600 mb-2 block">SPOUSE / PARTNER NAME</label>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input name="spouse_last_name" placeholder="Spouse Last Name" value={formData.spouse_last_name} onChange={handleChange} className="p-2 border rounded text-sm" />
                <input name="spouse_first_name" placeholder="Spouse First Name" value={formData.spouse_first_name} onChange={handleChange} className="p-2 border rounded text-sm" />
                <input name="spouse_middle_name" placeholder="Spouse Middle Name" value={formData.spouse_middle_name} onChange={handleChange} className="p-2 border rounded text-sm" />
                <input name="spouse_ext_name" placeholder="Ext" value={formData.spouse_ext_name} onChange={handleChange} className="p-2 border rounded text-sm" />
             </div>
          </div>
        )}
      </div>

      {/* 2. ADDRESS (Dynamic Dropdowns) */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="text-blue-800 font-bold mb-4 text-sm uppercase tracking-wide">Address & Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input name="house_no" placeholder="House No." value={formData.house_no} onChange={handleChange} className="p-2 border rounded" />
          
          {/* DYNAMIC PUROK DROPDOWN */}
          <select name="purok" value={formData.purok} onChange={handleChange} className="p-2 border rounded" required>
            <option value="">Select Purok/Sitio</option>
            {purokOptions.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          {/* DYNAMIC BARANGAY DROPDOWN */}
          <select name="barangay" value={formData.barangay} onChange={handleChange} className="p-2 border rounded" required>
            <option value="">Select Barangay</option>
            {barangayOptions.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
           <input name="contact_no" placeholder="Contact Number" value={formData.contact_no} onChange={handleChange} className="p-2 border rounded" />
           <input name="occupation" placeholder="Occupation" value={formData.occupation} onChange={handleChange} className="p-2 border rounded" />
           <input name="religion" placeholder="Religion" value={formData.religion} onChange={handleChange} className="p-2 border rounded" />
        </div>
      </div>

      {/* 3. SECTORS (Dynamic Checkboxes) */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="text-blue-800 font-bold mb-4 text-sm uppercase tracking-wide">Sectors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {sectorOptions.map((s) => (
            <label key={s.id} className="flex items-center space-x-2 text-sm bg-white p-2 rounded border hover:bg-blue-50 cursor-pointer">
              <input 
                type="checkbox" 
                value={s.id}
                checked={formData.sector_ids.includes(s.id)}
                onChange={handleSectorChange}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">{s.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 4. BUTTONS */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button 
          type="button" 
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 flex items-center gap-2"
        >
          <X size={18} /> Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 shadow flex items-center gap-2"
        >
          {loading ? "Saving..." : (residentToEdit ? "Update Record" : "Save Resident")}
        </button>
      </div>
    </form>
  );
}