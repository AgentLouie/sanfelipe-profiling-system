import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import ResidentList from './components/ResidentList';
import AddResidentForm from './components/AddResidentForm';
import ProtectedRoute from './components/ProtectedRoute';
import { LogOut, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';


function DashboardLayout() {
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userRole, setUserRole] = useState(localStorage.getItem('role'));

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">San Felipe Database</h1>
            <p className="text-xs text-gray-500">Residential Profiling System v1.0</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-blue-700 text-sm">
              <UserCircle size={18} />
              <span className="font-bold capitalize">{userRole} Account</span>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 font-medium text-sm"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>

        {/* CONTENT */}
        {showAddForm ? (
          <div className="bg-white p-6 rounded-lg shadow-lg">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Add New Resident</h2>
             </div>
            <AddResidentForm 
              onSuccess={() => {
                setShowAddForm(false);
                setRefreshTrigger(prev => prev + 1);
              }}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button 
                onClick={() => setShowAddForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 transition flex items-center gap-2"
              >
                + Add Resident
              </button>
            </div>
            <ResidentList key={refreshTrigger} userRole={userRole} />
          </>
        )}
      </div>
    </div>
  );
}

function App() {
  const navigate = useNavigate();

  const handleLoginSuccess = (role) => {
    navigate('/dashboard');
  };

  return (
    <Routes>
      {/* PUBLIC ROUTE: Login */}
      <Route path="/login" element={<Login onLogin={handleLoginSuccess} />} />

      {/* PROTECTED ROUTES: Any route inside here requires a Token */}
      <Route element={<ProtectedRoute />}>
         <Route path="/dashboard" element={<DashboardLayout />} />
         
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;