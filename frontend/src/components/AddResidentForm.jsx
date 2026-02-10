import { useState, useEffect } from 'react';
import api from '../api';
import { X, Plus, Trash } from 'lucide-react';

export default function AddResidentForm({ onSuccess, onCancel, residentToEdit }) {
  // 1. STATE: Form Data (Removed religion)
  const [formData, setFormData] = useState({
    last_name: '', first_name: '', middle_name: '', ext_name: '',
    house_no: '', purok: '', barangay: '',
    birthdate: '', sex: '', civil_status: '',
    occupation: '', precinct_no: '', contact_no: '', // Religion removed
    spouse_last_name: '', spouse_first_name: '', spouse_middle_name: '', spouse_ext_name: '',
    sector_ids: [],
    family_members: [] 
  });

  const [barangayOptions, setBarangayOptions] = useState([]);
  const [purokOptions, setPurokOptions] = useState([]);
  const [sectorOptions, setSectorOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // 3. FETCH OPTIONS
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [bRes, pRes, sRes] = await Promise.all([
          api.get('/barangays/'),
          api.get('/puroks/'),
          api.get('/sectors/')
        ]);
        setBarangayOptions(bRes.data);
        setPurokOptions(pRes.data);
        setSectorOptions(sRes.data);
      } catch (err) {
        console.error("Error loading options:", err);
      }
    };
    fetchOptions();
  }, []);

  // 4. PRE-FILL IF EDITING
  useEffect(() => {
    if (residentToEdit) {
      setFormData({
        ...residentToEdit,
        birthdate: residentToEdit.birthdate ? residentToEdit.birthdate.split('T')[0] : '',
        sector_ids: residentToEdit.sectors ? residentToEdit.sectors.map(s => s.id) : [],
        family_members: residentToEdit.family_members || []
      });
    }
  }, [residentToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSectorChange = (e) => {
    const sectorId = parseInt(e.target.value);
    if (!sectorId) return;

    setFormData(prev => {
      if (prev.sector_ids.includes(sectorId)) {
        return { ...prev, sector_ids: prev.sector_ids.filter(id => id !== sectorId) };
      } else {
        return { ...prev, sector_ids: [...prev.sector_ids, sectorId] };
      }
    });
  };

  // --- FAMILY MEMBER HANDLERS ---
  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      family_members: [
        ...prev.family_members, 
        { first_name: '', last_name: '', relationship: '', birthdate: '' } 
      ]
    }));
  };

  const removeFamilyMember = (index) => {
    setFormData(prev => ({
      ...prev,
      family_members: prev.family_members.filter((_, i) => i !== index)
    }));
  };

  const handleFamilyChange = (index, field, value) => {
    const updatedMembers = [...formData.family_members];
    updatedMembers[index][field] = value;
    setFormData(prev => ({ ...prev, family_members: updatedMembers }));
  };

  // --- SUBMIT ---
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
      alert("Error saving data. Please check inputs.");
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
          <input name="last_name" placeholder="Last Name" value={formData.last_name} onChange={handleChange} className="p-2 border rounded" required />
          <input name="first_name" placeholder="First Name" value={formData.first_name} onChange={handleChange} className="p-2 border rounded" required />
          <input name="middle_name" placeholder="Middle Name" value={formData.middle_name} onChange={handleChange} className="p-2 border rounded" />
          <input name="ext_name" placeholder="Ext (Jr/Sr)" value={formData.ext_name} onChange={handleChange} className="p-2 border rounded bg-white" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Birthdate</span>
            <input type="date" name="birthdate" value={formData.birthdate} onChange={handleChange} className="p-2 border rounded" required />
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Sex</span>
            <select name="sex" value={formData.sex} onChange={handleChange} className="p-2 border rounded" required>
              <option value="">Select Sex</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1">Civil Status</span>
            <select name="civil_status" value={formData.civil_status} onChange={handleChange} className="p-2 border rounded" required>
              <option value="">Select Civil Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widow/er">Widow/er</option>
              <option value="Separated">Separated</option>
              <option value="Live-in Partner">Live-in Partner</option>
            </select>
          </div>
        </div>
        
        {/* Occupation Row (Religion Removed) */}
        <div className="mt-4">
           <input name="occupation" placeholder="Occupation" value={formData.occupation} onChange={handleChange} className="p-2 border rounded w-full md:w-1/2" />
        </div>

        {/* SPOUSE INFO */}
        {(formData.civil_status === 'Married' || formData.civil_status === 'Live-in Partner') && (
          <div className="mt-6 p-4 bg-blue-50 rounded border border-blue-200">
             <h4 className="text-xs font-bold text-blue-800 mb-3 border-b border-blue-200 pb-2">SPOUSE / PARTNER DETAILS</h4>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <input name="spouse_last_name" placeholder="Spouse Last Name" value={formData.spouse_last_name} onChange={handleChange} className="p-2 border rounded text-sm" />
                <input name="spouse_first_name" placeholder="Spouse First Name" value={formData.spouse_first_name} onChange={handleChange} className="p-2 border rounded text-sm" />
                <input name="spouse_middle_name" placeholder="Spouse Middle Name" value={formData.spouse_middle_name} onChange={handleChange} className="p-2 border rounded text-sm" />
                <input name="spouse_ext_name" placeholder="Ext" value={formData.spouse_ext_name} onChange={handleChange} className="p-2 border rounded text-sm" />
             </div>
          </div>
        )}
      </div>

      {/* 2. FAMILY BACKGROUND */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-blue-800 font-bold text-sm uppercase tracking-wide">Family Members</h3>
          <button type="button" onClick={addFamilyMember} className="text-xs flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
            <Plus size={14} /> Add Member
          </button>
        </div>

        {formData.family_members.length === 0 ? (
          <p className="text-sm text-gray-400 italic text-center py-2">No family members added yet.</p>
        ) : (
          <div className="space-y-3">
            {formData.family_members.map((member, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-2 items-end bg-white p-3 rounded shadow-sm border">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase">First Name</label>
                  <input 
                    placeholder="First Name" 
                    value={member.first_name} 
                    onChange={(e) => handleFamilyChange(index, 'first_name', e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div className="flex-1">
                   <label className="text-[10px] text-gray-500 uppercase">Last Name</label>
                   <input 
                    placeholder="Last Name" 
                    value={member.last_name} 
                    onChange={(e) => handleFamilyChange(index, 'last_name', e.target.value)}
                    className="w-full p-2 border rounded text-sm"
                  />
                </div>
                <div className="w-32">
                   <label className="text-[10px] text-gray-500 uppercase">Relationship</label>
                   <select 
                      value={member.relationship}
                      onChange={(e) => handleFamilyChange(index, 'relationship', e.target.value)}
                      className="w-full p-2 border rounded text-sm"
                   >
                     <option value="">Select...</option>
                     <option value="Son">Son</option>
                     <option value="Daughter">Daughter</option>
                     <option value="Father">Father</option>
                     <option value="Mother">Mother</option>
                     <option value="Sibling">Sibling</option>
                     <option value="Other">Other</option>
                   </select>
                </div>
                <button type="button" onClick={() => removeFamilyMember(index)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                  <Trash size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. ADDRESS */}
      <div className="bg-gray-50 p-4 rounded border border-gray-200">
        <h3 className="text-blue-800 font-bold mb-4 text-sm uppercase tracking-wide">Address & Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input name="house_no" placeholder="House No." value={formData.house_no} onChange={handleChange} className="p-2 border rounded" />
          
          <select name="purok" value={formData.purok} onChange={handleChange} className="p-2 border rounded" required>
            <option value="">Select Purok/Sitio</option>
            {purokOptions.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>

          <select name="barangay" value={formData.barangay} onChange={handleChange} className="p-2 border rounded" required>
            <option value="">Select Barangay</option>
            {barangayOptions.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
           <input name="contact_no" placeholder="Contact Number" value={formData.contact_no} onChange={handleChange} className="p-2 border rounded w-full md:w-1/3" />
        </div>
      </div>

      {/* 4. SECTORS */}
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

      {/* BUTTONS */}
      <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white p-2 shadow-inner">
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