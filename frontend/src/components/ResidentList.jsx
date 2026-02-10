import { useEffect, useState } from 'react';
import api from '../api';
import { Trash2, Edit, Search, User, ChevronDown, ChevronUp, Users, Building2 } from 'lucide-react';

export default function ResidentList({ userRole, onEdit }) {
  const [residents, setResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchResidents = async (search = '') => {
    setLoading(true);
    try {
      const query = search ? `?search=${search}` : '';
      const response = await api.get(`/residents/${query}`);
      setResidents(response.data);
    } catch (error) {
      console.error('Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResidents(); }, []);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    fetchResidents(e.target.value);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resident?')) return;
    try {
      await api.delete(`/residents/${id}`);
      fetchResidents(searchTerm);
    } catch (error) {
      alert('Failed to delete.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const toggleRow = (id) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="bg-white border-2 border-gray-300 shadow-lg">
      {/* GOVERNMENT HEADER */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-6 py-4 border-b-4 border-yellow-500">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="text-yellow-400" size={28} />
          <div>
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">
              Resident Master List
            </h2>
            <p className="text-xs text-blue-200">Barangay Information Management System</p>
          </div>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="bg-gray-100 px-6 py-4 border-b-2 border-gray-300">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white border-2 border-blue-800 px-4 py-2 rounded">
              <span className="text-xs text-gray-600 uppercase font-semibold">Total Records</span>
              <div className="text-2xl font-bold text-blue-900">{residents.length}</div>
            </div>
          </div>
          
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Search resident by name..." 
              value={searchTerm}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-400 rounded focus:outline-none focus:border-blue-800 focus:ring-2 focus:ring-blue-200 font-medium"
            />
            <Search className="absolute left-3 top-3 text-gray-500" size={18} />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-gray-700 to-gray-800 text-white border-b-2 border-gray-900">
              <th className="w-8 py-3 px-3"></th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Name & Occupation</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Birthdate</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Sex</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Address</th>
              <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Sector</th>
              <th className="py-3 px-4 text-center text-xs font-bold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-500 border-b">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
                    <span className="font-medium">Loading resident records...</span>
                  </div>
                </td>
              </tr>
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12 text-gray-500 italic border-b bg-gray-50">
                  No residents found in the database.
                </td>
              </tr>
            ) : (
              residents.map((r, index) => (
                <>
                  <tr 
                    key={r.id} 
                    className={`border-b border-gray-200 transition-colors cursor-pointer ${
                      expandedRow === r.id 
                        ? 'bg-blue-50 border-l-4 border-l-blue-800' 
                        : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                    } ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => toggleRow(r.id)}
                  >
                    <td className="pl-3 text-gray-500">
                      {expandedRow === r.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-gray-900 text-sm uppercase">
                        {r.last_name}, {r.first_name} {r.ext_name || ''}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {r.middle_name}
                      </div>
                      <div className="text-xs text-blue-800 font-semibold mt-1 uppercase">
                        {r.occupation || "NO OCCUPATION"}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700 font-medium">{formatDate(r.birthdate)}</td>
                    <td className="py-4 px-4 text-sm text-gray-700 font-semibold">{r.sex}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      <div className="font-medium">{r.house_no} {r.purok}</div>
                      <div className="text-xs text-gray-500 uppercase">{r.barangay}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 border border-blue-800 text-xs font-bold bg-blue-50 text-blue-900 uppercase tracking-wide">
                        {r.sector_summary || "NONE"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        {userRole === 'admin' ? (
                          <>
                            <button 
                              onClick={() => onEdit(r)} 
                              className="p-2 text-white bg-blue-800 hover:bg-blue-900 border border-blue-900 transition-colors" 
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(r.id)} 
                              className="p-2 text-white bg-red-700 hover:bg-red-800 border border-red-900 transition-colors" 
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-600 bg-gray-200 px-3 py-1.5 border border-gray-400 font-semibold uppercase">
                            View Only
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedRow === r.id && (
                    <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-blue-200">
                      <td colSpan="7" className="p-6 pl-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                          {/* LEFT COLUMN */}
                          <div className="bg-white border-2 border-gray-300 p-4 shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-800 uppercase text-xs tracking-wider flex items-center gap-2">
                              <User size={16} className="text-blue-800" />
                              Personal Information
                            </h4>
                            <div className="space-y-2 text-gray-700">
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                <div>
                                  <span className="text-xs text-gray-500 uppercase font-semibold block">Civil Status</span>
                                  <span className="font-medium">{r.civil_status}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 uppercase font-semibold block">Contact No. +63</span>
                                  <span className="font-medium">{r.contact_no || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-gray-500 uppercase font-semibold block">Precinct No.</span>
                                  <span className="font-medium">{r.precinct_no || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {(r.civil_status === 'Married' || r.civil_status === 'Live-in Partner') && (
                              <div className="mt-4 p-3 bg-blue-100 border-l-4 border-blue-800">
                                <div className="text-xs text-gray-600 uppercase font-semibold mb-1">Spouse Information</div>
                                <div className="font-bold text-blue-900 uppercase text-sm">
                                  {r.spouse_first_name} {r.spouse_middle_name} {r.spouse_last_name} {r.spouse_ext_name}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* RIGHT COLUMN */}
                          <div className="bg-white border-2 border-gray-300 p-4 shadow-sm">
                            <h4 className="font-bold text-gray-800 mb-3 pb-2 border-b-2 border-blue-800 uppercase text-xs tracking-wider flex items-center gap-2">
                              <Users size={16} className="text-blue-800" />
                              Family Members
                            </h4>
                            {r.family_members && r.family_members.length > 0 ? (
                              <ul className="space-y-2">
                                {r.family_members.map((fm, idx) => (
                                  <li key={idx} className="flex items-start gap-2 pb-2 border-b border-gray-200 last:border-0">
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900 uppercase text-sm">
                                        {fm.first_name} {fm.last_name}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-0.5">
                                        <span className="inline-block bg-gray-200 px-2 py-0.5 border border-gray-400 font-medium uppercase">
                                          {fm.relationship}
                                        </span>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-center py-4">
                                <p className="text-gray-400 italic text-sm">No family members on record.</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="bg-gray-100 px-6 py-3 border-t-2 border-gray-300">
        <p className="text-xs text-gray-600 text-center">
          Official Document • Barangay Management System • For Official Use Only
        </p>
      </div>
    </div>
  );
}