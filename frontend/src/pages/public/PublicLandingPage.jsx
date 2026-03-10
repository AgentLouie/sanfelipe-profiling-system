import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import {
  Search,
  Loader2,
  MapPin,
  BadgeCheck,
  User,
  ShieldCheck,
  ArrowRight,
  UserSearch,
} from "lucide-react";

const SITIO_TO_PUROK = {
  "Sitio Sagpat": 6,
  "Sitio Tektek": 6,
  "Sitio Cabuyao": 7,
  "Bantay Carmen": 4,
  "Sitio Ticub": 7,
  "Sitio Lalec": 7,
  "Sitio Laoag": 8,
};

const formatPurok = (p) => {
  if (!p) return "-";
  const raw = String(p).trim().replace(/\s+/g, " ");
  const low = raw.toLowerCase();

  if (low.startsWith("purok") || low.includes("(purok")) return raw.toUpperCase();

  if (low.startsWith("sitio") || low.startsWith("bantay")) {
    const key = raw
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
      .join(" ");
    const n = SITIO_TO_PUROK[key];
    return n ? `${key.toUpperCase()} (PUROK ${n})` : key.toUpperCase();
  }

  return /^\d+$/.test(low) ? `PUROK ${raw}`.toUpperCase() : raw.toUpperCase();
};

const ResidentCard = ({ resident, onOpen }) => (
  <div className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/90 p-5 shadow-[0_10px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_60px_rgba(239,68,68,0.15)]">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-rose-400 to-red-400" />

    <div className="flex items-start gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-red-50">
        {resident.photo_url ? (
          <img
            src={resident.photo_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <User size={30} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.15em] text-red-700">
          <BadgeCheck size={12} />
          Verified
        </div>

        <h3 className="truncate text-lg font-black uppercase tracking-tight text-slate-900">
          {resident.last_name}, {resident.first_name}
        </h3>

        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {resident.resident_code}
        </p>
      </div>
    </div>

    <div className="mt-5 border-t border-slate-100 pt-4">
      <div className="flex items-center gap-2 text-slate-500">
        <MapPin size={14} className="text-red-500" />
        <span className="truncate text-xs font-semibold uppercase tracking-wide">
          {resident.barangay} • {formatPurok(resident.purok)}
        </span>
      </div>
    </div>

    <button
      onClick={() => onOpen(resident.resident_code)}
      className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 py-3.5 text-sm font-extrabold uppercase tracking-wide text-white transition-all hover:from-red-600 hover:to-rose-500 active:scale-[0.98]"
    >
      View Digital ID
      <ArrowRight size={16} />
    </button>
  </div>
);

export default function PublicLandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/public/residents/search", {
          params: { q: query },
          signal: controller.signal,
        });
        setResults(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "CanceledError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-slate-100 text-slate-900 selection:bg-red-100">
      <header className="relative overflow-hidden border-b border-slate-200/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.12),transparent_35%)]" />
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-red-100/40 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-rose-100/40 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 md:pb-20 md:pt-20">
          <div className="mx-auto max-w-4xl text-center">
            <img
              src="/san_felipe_seal.png"
              alt="Seal"
              className="mx-auto mb-6 h-24 w-24 rounded-full border border-white/70 bg-white/70 p-2 shadow-lg backdrop-blur-sm"
            />

            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-100 bg-white/80 px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur-sm">
              <ShieldCheck size={14} className="text-red-600" />
              Secure Resident Verification System
            </div>

            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-6xl md:leading-tight">
              Official Resident
              <span className="block bg-gradient-to-r from-red-700 to-rose-500 bg-clip-text text-transparent">
                Digital Portal
              </span>
            </h1>

            <div className="mx-auto mt-10 max-w-3xl">
              <div className="group relative">
                <Search
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-red-600"
                  size={20}
                />
                <input
                  type="text"
                  placeholder="Search by full name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-16 w-full rounded-[1.75rem] border border-white/70 bg-white/90 pl-14 pr-6 text-base font-medium text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.10)] outline-none backdrop-blur-sm transition-all placeholder:text-slate-400 focus:border-red-400 focus:ring-4 focus:ring-red-100"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="animate-spin text-red-600" size={40} />
            <span className="mt-4 text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Syncing Records...
            </span>
          </div>
        ) : !query.trim() ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/60 py-16 text-center shadow-sm backdrop-blur-sm">
            <UserSearch size={44} className="mx-auto mb-4 text-slate-300" />
            <h2 className="text-lg font-black uppercase tracking-wide text-slate-500">
              Ready to Search
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Enter a resident name or code above to begin verification.
            </p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <ResidentCard
                key={r.resident_code}
                resident={r}
                onOpen={(code) => navigate(`/public/id/${code}`)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white/80 p-12 text-center shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Search size={28} />
            </div>
            <h3 className="mt-4 text-xl font-black text-slate-900">No Residents Found</h3>
            <p className="mt-2 text-slate-500">
              Check the spelling or try searching with the resident code instead.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}