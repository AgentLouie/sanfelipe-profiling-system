// src/components/AddResidentForm.jsx
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import api from '../api';

export default function AddResidentForm({ onSuccess, onCancel }) {
  const { register, control, handleSubmit, reset } = useForm({
    defaultValues: {
      family_members: [],
      sector_ids: [],
      other_sector_details: "",
      civil_status: "Single"
    }
  });

  const selectedSectorIds = useWatch({ control, name: "sector_ids" }) || [];
  const civilStatus = useWatch({ control, name: "civil_status" });
  const showSpouseField = ["Married", "Live-in Partner"].includes(civilStatus);

  const [barangayOptions, setBarangayOptions] = useState([]);
  const [purokOptions, setPurokOptions] = useState([]);
  const [relationshipOptions, setRelationshipOptions] = useState([]);
  const [sectorOptions, setSectorOptions] = useState([]);
  const [othersSectorId, setOthersSectorId] = useState(null);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [barangayRes, purokRes, relationshipRes, sectorRes] = await Promise.all([
          api.get('/barangays/'),
          api.get('/puroks/'),
          api.get('/relationships/'),
          api.get('/sectors/')
        ]);
        setBarangayOptions(barangayRes.data);
        setPurokOptions(purokRes.data);
        setRelationshipOptions(relationshipRes.data);
        setSectorOptions(sectorRes.data);
        const others = sectorRes.data.find(s => s.name === "Others");
        if (others) setOthersSectorId(others.id);
      } catch (error) {
        console.error("Error fetching options:", error);
      }
    };
    fetchOptions();
  }, []);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "family_members"
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        sector_ids: data.sector_ids ? data.sector_ids.map(id => parseInt(id)) : [],
        // Clean up optional fields
        house_no: data.house_no || null,
        precinct_no: data.precinct_no || null,
        religion: data.religion || null,
        occupation: data.occupation || null,
        spouse_last_name: data.spouse_last_name || null,
        spouse_first_name: data.spouse_first_name || null,
        spouse_middle_name: data.spouse_middle_name || null,
        spouse_ext_name: data.spouse_ext_name || null,
        ext_name: data.ext_name || null
      };

      await api.post('/residents/', payload);
      reset(); 
      onSuccess(); 
      alert("Resident added successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to save. Is the backend running?");
    }
  };

  const isOthersSelected = othersSectorId && selectedSectorIds.includes(String(othersSectorId));

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-gray-800">
      
      {/* SECTION 1: NAME */}
      <div className="bg-gray-50 p-3 rounded border border-gray-200">
        <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase">I. Name</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Last Name</label>
            <input {...register("last_name", { required: true })} className="w-full p-2 border rounded border-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">First Name</label>
            <input {...register("first_name", { required: true })} className="w-full p-2 border rounded border-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Middle Name</label>
            <input {...register("middle_name")} className="w-full p-2 border rounded border-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Ext Name (Jr/Sr)</label>
            <input {...register("ext_name")} className="w-full p-2 border rounded border-gray-300" />
          </div>
        </div>
      </div>

      {/* SECTION 2: ADDRESS */}
      <div className="bg-gray-50 p-3 rounded border border-gray-200">
        <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase">II. Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">House No. / Street</label>
            <input {...register("house_no")} className="w-full p-2 border rounded border-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Purok / Sitio</label>
            <select {...register("purok", { required: true })} className="w-full p-2 border rounded border-gray-300">
              <option value="">Select...</option>
              {purokOptions.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Barangay</label>
            <select {...register("barangay", { required: true })} className="w-full p-2 border rounded border-gray-300">
              <option value="">Select...</option>
              {barangayOptions.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: DEMOGRAPHICS & STATUS */}
      <div className="bg-gray-50 p-3 rounded border border-gray-200">
        <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase">III. Personal Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Birthdate</label>
            <input type="date" {...register("birthdate", { required: true })} className="w-full p-2 border rounded border-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Sex</label>
            <select {...register("sex")} className="w-full p-2 border rounded border-gray-300">
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Precinct No.</label>
            <input {...register("precinct_no")} className="w-full p-2 border rounded border-gray-300" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Civil Status</label>
            <select {...register("civil_status")} className="w-full p-2 border rounded border-gray-300">
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Occupation</label>
            <input {...register("occupation")} className="w-full p-2 border rounded border-gray-300" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase">Contact No.</label>
            <input {...register("contact_no")} className="w-full p-2 border rounded border-gray-300" />
          </div>
        </div>
      </div>

      {/* SECTION 4: SPOUSE / PARTNER (Hidden unless Married/Partner) */}
      {showSpouseField && (
        <div className="bg-blue-50 p-3 rounded border border-blue-200">
          <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase">IV. Spouse / Partner</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase">Spouse Last Name</label>
              <input {...register("spouse_last_name")} className="w-full p-2 border rounded border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase">Spouse First Name</label>
              <input {...register("spouse_first_name")} className="w-full p-2 border rounded border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase">Spouse Middle Name</label>
              <input {...register("spouse_middle_name")} className="w-full p-2 border rounded border-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-700 uppercase">Ext (Jr/Sr)</label>
              <input {...register("spouse_ext_name")} className="w-full p-2 border rounded border-blue-300" />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: SECTORS */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-bold text-blue-800 mb-2 uppercase">V. Sectors / Membership</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {sectorOptions.map((sector) => (
            <label key={sector.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
              <input type="checkbox" value={sector.id} {...register("sector_ids")} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" /> 
              <span className="text-sm">{sector.name}</span>
            </label>
          ))}
        </div>
        {isOthersSelected && (
          <div className="mt-3">
            <label className="block text-xs font-bold text-gray-500 uppercase">Please specify "Others":</label>
            <input {...register("other_sector_details", { required: isOthersSelected })} className="w-full p-2 border rounded border-gray-300 bg-yellow-50" />
          </div>
        )}
      </div>

      {/* SECTION 6: FAMILY MEMBERS */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold text-blue-800 uppercase">VI. Family Members</h3>
          <button type="button" onClick={() => append({ last_name: '', first_name: '', relationship: '' })} className="text-sm text-blue-600 flex items-center hover:underline">
            <Plus size={16} /> Add Member
          </button>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end mb-2 bg-gray-50 p-2 rounded">
             <div className="flex-1">
                <input {...register(`family_members.${index}.first_name`)} placeholder="First Name" className="w-full p-2 border rounded text-sm" />
             </div>
             <div className="flex-1">
                <input {...register(`family_members.${index}.last_name`)} placeholder="Last Name" className="w-full p-2 border rounded text-sm" />
             </div>
             <div className="w-32">
                <select {...register(`family_members.${index}.relationship`)} className="w-full p-2 border rounded text-sm">
                  <option value="">Relation...</option>
                  {relationshipOptions.map((rel) => <option key={rel.id} value={rel.name}>{rel.name}</option>)}
                </select>
             </div>
             <button type="button" onClick={() => remove(index)} className="text-red-500 p-2"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Resident</button>
      </div>
    </form>
  );
}