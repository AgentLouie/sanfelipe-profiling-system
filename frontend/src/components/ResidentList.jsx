import { useEffect, useState } from 'react';
import api from '../api';
import { Trash2, Edit, Search, User } from 'lucide-react';


export default function ResidentList({ userRole, onEdit }) {
  const [residents, setResidents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Function to fetch residents (with optional search)
  const fetchResidents = async (search = '') => {
    setLoading(true);
    try {
      // If search exists, send ?search=Value, otherwise just fetch all
      const query = search ? `?search=${search}` : '';
      const response = await api.get(`/residents/${query}`);
      setResidents(response.data);
    } catch (error) {
      console.error('Error fetching residents:', error);
      alert('Error loading list. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchResidents();
  }, []);

  // Handle Search Typing
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    fetchResidents(value); // Auto-search as you type
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this resident?')) return;
    try {
      await api.delete(`/residents/${id}`);
      fetchResidents(searchTerm); // Refresh list (keeping search result)
    } catch (error) {
      alert('Failed to delete. You might not have permission.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-blue-600" /> 
            Resident Master List
          </h2>
          <p className="text-sm text-gray-500">
            Total Records: {residents.length}
          </p>
        </div>
        
        {/* SEARCH BAR */}
        <div className="relative w-full md:w-64">
          <input 
            type="text" 
            placeholder="Search by name..." 
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-left divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Age / Sex</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</th>
              <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sector</th>
              <th className="py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500">
                  Loading residents...
                </td>
              </tr>
            ) : residents.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-8 text-gray-500 italic">
                  No residents found matching "{searchTerm}".
                </td>
              </tr>
            ) : (
              residents.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50 transition-colors duration-150">
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{r.last_name}, {r.first_name}</div>
                    <div className="text-xs text-gray-500">{r.middle_name} {r.ext_name}</div>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    {r.birthdate ? (
                      <>
                        {new Date().getFullYear() - new Date(r.birthdate).getFullYear()} yrs
                        <span className="mx-1">•</span>
                        {r.sex}
                      </>
                    ) : "N/A"}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">
                    <div>{r.house_no} {r.purok}</div>
                    <div className="text-xs text-gray-500">{r.barangay}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {r.sector_summary || "None"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center gap-2">
                      
                      {/* ADMIN CONTROLS */}
                      {userRole === 'admin' ? (
                        <>
                          <button 
                            onClick={() => onEdit(r)} // <--- THIS IS THE MAGIC LINE
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition" 
                            title="Edit Resident"
                          >
                            <Edit size={18} />
                          </button>

                          <button 
                            onClick={() => handleDelete(r.id)} 
                            className="p-1 text-red-600 hover:text-red-800 hover:bg-red-100 rounded transition"
                            title="Delete Resident"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      ) : (
                        /* BARANGAY / STAFF VIEW */
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          View Only
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}