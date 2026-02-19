import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../api/api";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔒 Security States
  const [attempts, setAttempts] = useState(0);
  const [lockTime, setLockTime] = useState(0);

  const navigate = useNavigate();

  // ⏳ Countdown timer effect
  useEffect(() => {
    let timer;

    if (lockTime > 0) {
      timer = setInterval(() => {
        setLockTime(prev => prev - 1);
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [lockTime]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔒 Prevent login if locked
    if (lockTime > 0) {
      setError(`Too many attempts. Try again in ${lockTime}s.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await api.post('/token', formData);

      // ✅ Success → Reset attempts
      setAttempts(0);
      setLockTime(0);

      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('role', response.data.role);

      onLogin(response.data.role);
      navigate('/dashboard/overview', { replace: true });

    } catch (err) {
      console.error(err);

      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (err.response?.status === 401) {
        setError("Invalid username or password.");
      } else if (err.response?.status === 403) {
        setError("Access temporarily blocked. Please wait.");
      } else {
        setError("Login failed. Please try again.");
      }

      // 🔒 Lock after 5 failed attempts
      if (newAttempts >= 5) {
        setLockTime(30);      // 30 seconds lock
        setAttempts(0);       // reset attempts
        setError("Too many failed attempts. Locked for 30 seconds.");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden font-sans bg-stone-900">

      {/* Background */}
      <div 
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage: "url('/hero.jpg')", 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/95 via-stone-900/90 to-black/80 backdrop-blur-[4px]"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-5xl bg-stone-900/40 rounded-[2rem] shadow-xl overflow-hidden backdrop-blur-xl border border-white/10 flex flex-col lg:flex-row">

        {/* Left Side */}
        <div className="lg:w-5/12 p-10 flex flex-col justify-between text-white bg-gradient-to-b from-white/5 to-black/20">
          <div>
            <div className="flex items-center gap-5 mb-12">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 p-2">
                <img src="/san_felipe_seal.png" alt="San Felipe Seal" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-black">LGU San Felipe</h1>
                <p className="text-rose-300 text-xs font-bold uppercase tracking-[0.2em] mt-1.5">Zambales</p>
              </div>
            </div>

            <h2 className="text-4xl font-black leading-tight">
              Resident <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">
                Profiling System
              </span>
            </h2>
          </div>

          <div className="mt-16 flex items-center gap-2 text-stone-400">
            <ShieldCheck size={16} />
            <p className="text-xs font-medium tracking-wide">Authorized Personnel Only</p>
          </div>
        </div>

        {/* Right Side */}
        <div className="lg:w-7/12 bg-white p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
              <p className="text-gray-500 mt-2">Enter your credentials to access the registry.</p>
            </div>

            {/* 🔒 Lock Countdown Message */}
            {lockTime > 0 && (
              <div className="mb-6 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 text-sm font-bold">
                Account locked. Try again in {lockTime} seconds.
              </div>
            )}

            {error && lockTime === 0 && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3">
                <Lock size={16} className="text-red-600 mt-0.5" />
                <p className="text-sm text-red-800 font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Username */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 ml-1 tracking-wider">Username</label>
                <div className="relative flex items-center mt-1">
                  <User className="absolute left-4 h-5 w-5 text-gray-400" />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 ml-1 tracking-wider">Password</label>
                <div className="relative flex items-center mt-1">
                  <Lock className="absolute left-4 h-5 w-5 text-gray-400" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-gray-400 hover:text-rose-600"
                  >
                    {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                disabled={loading || lockTime > 0}
                className="w-full mt-6 bg-stone-900 hover:bg-stone-800 text-white font-bold py-4 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>{lockTime > 0 ? `Locked (${lockTime}s)` : "Secure Login"}</span>
                    {lockTime === 0 && <ArrowRight size={18} />}
                  </>
                )}
              </button>

            </form>

          </div>
        </div>

      </div>
    </div>
  );
}
