import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../../api/api";
import { Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

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
    <div className="relative min-h-[100dvh] w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 overflow-hidden font-sans bg-stone-950">

      {/* Background */}
      <div 
        className="absolute inset-0 z-0 scale-105"
        style={{
          backgroundImage: "url('/hero.jpg')", 
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-red-950/95 via-stone-900/90 to-black/80 backdrop-blur-sm"></div>
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-5xl bg-stone-900/40 rounded-[2rem] shadow-2xl overflow-hidden backdrop-blur-xl border border-white/10 flex flex-col lg:flex-row">

        {/* Left Side (Branding) */}
        <div className="lg:w-5/12 p-10 lg:p-12 flex flex-col justify-between text-white bg-gradient-to-b from-white/5 to-black/40">
          <div>
            <div className="flex items-center gap-4 mb-12">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-4 border-white/20 p-1 shadow-lg">
                <img src="/san_felipe_seal.png" alt="San Felipe Seal" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">LGU San Felipe</h1>
                <p className="text-red-300 text-[11px] font-black uppercase tracking-[0.25em] mt-1">Zambales</p>
              </div>
            </div>

            <h2 className="text-4xl font-black leading-tight tracking-tight">
              San Felipe <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-600 drop-shadow-sm">
                AS ONE
              </span>
            </h2>
          </div>

          <div className="mt-16 flex items-center gap-2.5 text-stone-300 bg-stone-900/50 w-max px-4 py-2 rounded-xl border border-white/10">
            <ShieldCheck size={18} className="text-red-500" />
            <p className="text-xs font-bold uppercase tracking-widest">Authorized Personnel Only</p>
          </div>
        </div>

        {/* Right Side (Login Form) */}
        <div className="lg:w-7/12 bg-white p-10 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">

            <div className="mb-10">
              <h2 className="text-3xl font-black text-stone-900 tracking-tight">System Login</h2>
              <p className="text-stone-500 font-bold text-sm mt-2">Enter your secure credentials to continue.</p>
            </div>

            {/* 🔒 Lock Countdown Message */}
            {lockTime > 0 && (
              <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-xl flex items-center gap-3 text-orange-800 shadow-sm animate-in zoom-in-95">
                <Lock size={20} />
                <p className="text-sm font-bold tracking-wide">Account locked. Try again in {lockTime}s.</p>
              </div>
            )}

            {/* Error Message */}
            {error && lockTime === 0 && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-center gap-3 text-red-800 shadow-sm animate-in zoom-in-95">
                <AlertCircle size={20} className="text-red-600" />
                <p className="text-sm font-bold tracking-wide">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Username */}
              <div>
                <label className="text-[11px] font-black uppercase text-stone-500 ml-1 tracking-widest">Username</label>
                <div className="relative flex items-center mt-2">
                  <User className="absolute left-4 h-5 w-5 text-stone-400" strokeWidth={2.5} />
                  <input 
                    type="text" 
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-stone-100 border-2 border-stone-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-100 focus:border-red-600 outline-none transition-all font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-semibold text-sm shadow-sm"
                    placeholder="Enter username"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="text-[11px] font-black uppercase text-stone-500 ml-1 tracking-widest">Password</label>
                <div className="relative flex items-center mt-2">
                  <Lock className="absolute left-4 h-5 w-5 text-stone-400" strokeWidth={2.5} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-stone-100 border-2 border-stone-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-red-100 focus:border-red-600 outline-none transition-all font-bold text-stone-900 placeholder:text-stone-400 placeholder:font-semibold text-sm shadow-sm"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 text-stone-400 hover:text-red-600 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={20} strokeWidth={2.5} /> : <Eye size={20} strokeWidth={2.5} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button 
                type="submit"
                disabled={loading || lockTime > 0}
                className="w-full mt-8 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest py-4 rounded-xl disabled:opacity-60 flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-red-600/20 active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>{lockTime > 0 ? `Locked (${lockTime}s)` : "Secure Login"}</span>
                    {lockTime === 0 && <ArrowRight size={18} strokeWidth={3} />}
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