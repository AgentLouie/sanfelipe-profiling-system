import { useEffect, useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
  Building2,
  ScanLine,
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

const ITEMS_PER_PAGE = 6;

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

/* ─── Skeleton Card ─────────────────────────────────────────────── */
const SkeletonCard = () => (
  <div className="relative overflow-hidden rounded-2xl bg-white border border-red-100 shadow-sm">
    <div className="h-1 w-full bg-red-100" />
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] rounded-xl bg-red-50 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-20 rounded bg-red-50" />
          <div className="h-4 w-36 rounded bg-red-50" />
          <div className="h-3 w-24 rounded bg-red-50" />
        </div>
      </div>
      <div className="h-9 w-full rounded-xl bg-red-50" />
      <div className="h-10 w-full rounded-xl bg-red-50" />
    </div>
  </div>
);

/* ─── Resident Card ─────────────────────────────────────────────── */
const ResidentCard = ({ resident, onOpen, index }) => (
  <div
    className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl hover:shadow-red-900/5 transition-all duration-300 hover:-translate-y-1 border border-red-100"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    {/* Premium vibrant top border */}
    <div className="h-1 w-full bg-gradient-to-r from-red-900 via-red-800 to-red-600" />

    <div className="relative p-6">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-[72px] w-[72px] rounded-xl overflow-hidden border border-red-100 bg-red-50 shadow-inner">
            {resident.photo_url ? (
              <img src={resident.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-red-200">
                <User size={28} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-700 shadow-sm ring-2 ring-white">
            <BadgeCheck size={12} className="text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-700 mb-0.5">
            Verified Resident
          </p>
          <h3 className="text-base font-bold text-slate-800 leading-tight truncate">
            {resident.last_name}, {resident.first_name}
          </h3>
          <p className="mt-1 font-mono text-[11px] font-semibold text-red-800 bg-red-50 border border-red-100 rounded-md px-2 py-0.5 inline-block">
            {resident.resident_code}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-50/50 border border-red-50 px-3 py-2.5">
        <MapPin size={13} className="shrink-0 text-red-700" />
        <span className="text-xs font-semibold text-slate-600 truncate">
          {resident.barangay} · {formatPurok(resident.purok)}
        </span>
      </div>

      <button
        onClick={() => onOpen(resident.resident_code)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-red-800 hover:shadow-md hover:shadow-red-900/20 hover:gap-3 active:scale-[0.98]"
      >
        View Digital ID
        <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  </div>
);

/* ─── Pagination Button ─────────────────────────────────────────── */
const PaginationButton = ({ children, active = false, disabled = false, onClick, loading = false }) => (
  <button
    onClick={onClick}
    disabled={disabled || loading}
    className={`flex h-9 min-w-[36px] items-center justify-center rounded-lg px-3 text-sm font-semibold transition-all duration-150 ${
      active
        ? "bg-red-900 text-white shadow-md shadow-red-900/20"
        : "bg-white border border-red-100 text-red-800 hover:bg-red-50 hover:border-red-200"
    } ${disabled || loading ? "cursor-not-allowed opacity-40" : ""}`}
  >
    {loading ? <Loader2 size={13} className="animate-spin" /> : children}
  </button>
);

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function PublicLandingPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [focused, setFocused] = useState(false);

  const [unlockModal, setUnlockModal] = useState({
    open: false,
    residentCode: "",
  });
  const [birthdate, setBirthdate] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    if (!query.trim()) {
      setResults([]);
      setCurrentPage(1);
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
        setCurrentPage(1);
      } catch (err) {
        if (err.name !== "CanceledError") {
          setResults([]);
          setCurrentPage(1);
        }
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handlePageChange = (newPage) => {
    if (newPage === currentPage) return;
    setPageLoading(true);
    setTimeout(() => {
      setCurrentPage(newPage);
      setPageLoading(false);
    }, 350);
  };

  const openUnlockModal = (code) => {
    setUnlockModal({ open: true, residentCode: code });
    setBirthdate("");
    setUnlockError("");
  };

  const handleUnlock = async () => {
    if (!unlockModal.residentCode || !birthdate) return;

    setUnlocking(true);
    setUnlockError("");

    try {
      const { data } = await api.post("/public/residents/unlock", {
        resident_code: unlockModal.residentCode,
        birthdate,
      });

      navigate(`/public/id/${unlockModal.residentCode}?token=${data.access_token}`);
    } catch (err) {
      console.error("Unlock failed", err);
      setUnlockError("Invalid birthdate or access denied.");
    } finally {
      setUnlocking(false);
    }
  };

  const totalPages = Math.ceil(results.length / ITEMS_PER_PAGE);
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return results.slice(start, start + ITEMS_PER_PAGE);
  }, [results, currentPage]);

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, 5];
    if (currentPage >= totalPages - 2)
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  return (
    <div className="min-h-screen bg-[#faf8f8] font-sans text-slate-800">

      {/* ── Official Banner ── */}
      <div className="bg-red-950 py-2.5 text-center text-[11px] font-bold tracking-[0.15em] uppercase text-red-100/90 shadow-sm relative z-10">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={14} className="text-red-400" />
          Official Public Verification · Municipality of San Felipe
        </span>
      </div>

      {/* ── Hero Header ── */}
      <header className="relative overflow-hidden">
        {/* Background: Municipal Hall photo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.jpg')" }}
        />
        {/* Premium blended red overlay */}
        <div className="absolute inset-0 bg-red-950/60 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/90 via-red-900/40 to-transparent" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">

            {/* Logo + Org */}
            <div className="flex flex-col items-center gap-5 mb-8">
              <img
                src="/san_felipe_seal.png"
                alt="Municipality Seal"
                className="h-24 w-24 object-contain drop-shadow-2xl rounded-full"
              />
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-red-200">
                <Building2 size={14} />
                Municipality of San Felipe
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold tracking-tight text-white md:text-[52px] leading-[1.1] drop-shadow-md">
                Resident Verification
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-red-100/80 md:text-[16px]">
                Search and verify official resident records.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative group max-w-2xl mx-auto">
              <div
                className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                  focused ? "shadow-[0_8px_30px_rgb(153,27,27,0.2)]" : "shadow-xl"
                }`}
              />
              <div
                className={`relative flex items-center bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden border transition-colors duration-300 ${
                  focused ? "border-red-700" : "border-transparent"
                }`}
              >
                <div className="flex items-center pl-5 pr-3 shrink-0">
                  {loading ? (
                    <Loader2 size={20} className="animate-spin text-red-800" />
                  ) : (
                    <Search
                      size={20}
                      className={`transition-colors ${focused ? "text-red-800" : "text-slate-400"}`}
                    />
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Search by full name or resident code…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="h-[60px] flex-1 bg-transparent pr-5 text-[16px] text-slate-800 outline-none placeholder:text-slate-400 font-medium"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="mr-3 shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-red-800 hover:text-red-950 hover:bg-red-50 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Hint */}
            <p className="mt-5 text-center text-xs font-medium text-red-200/60 drop-shadow-sm">
              <ScanLine size={13} className="inline mr-1.5 text-red-400" />
              Use the resident's complete name for accurate results.
            </p>
          </div>
        </div>

        {/* Wave divider - matching the slightly off-white body background */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 40" className="w-full fill-[#faf8f8]" preserveAspectRatio="none" height="40">
            <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" />
          </svg>
        </div>
      </header>

      {/* ── Results ── */}
      <main className="mx-auto max-w-6xl px-6 py-12">

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl bg-white border border-red-100 px-5 py-4 shadow-sm animate-pulse">
              <div className="h-4 w-48 rounded bg-red-50" />
              <div className="h-4 w-20 rounded bg-red-50" />
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>

        ) : !query.trim() ? (
          <div className="rounded-3xl bg-white border border-red-100 py-24 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-300 border border-red-100/50">
              <UserSearch size={32} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Ready to Verify</h2>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
              Enter a resident name or code above to begin verification.
            </p>
          </div>

        ) : results.length > 0 ? (
          <div className="space-y-6">

            {/* Result meta row */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white border border-red-100 px-5 py-4 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, results.length)}
                </span>{" "}
                of <span className="font-bold text-slate-800">{results.length}</span> records
              </p>
              <div className="flex items-center gap-2">
                {pageLoading && <Loader2 size={14} className="animate-spin text-red-800" />}
                <p className="text-xs font-bold text-red-800/60 uppercase tracking-wider">
                  Page {currentPage} / {totalPages}
                </p>
              </div>
            </div>

            {/* Grid — dim + skeleton while page is changing */}
            {pageLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedResults.map((r, i) => (
                  <ResidentCard
                    key={r.resident_code}
                    resident={r}
                    index={i}
                    onOpen={(code) => openUnlockModal(code)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-6">
                <PaginationButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </PaginationButton>

                {pageNumbers[0] > 1 && (
                  <>
                    <PaginationButton onClick={() => handlePageChange(1)} active={currentPage === 1} loading={pageLoading && currentPage !== 1}>
                      1
                    </PaginationButton>
                    {pageNumbers[0] > 2 && <span className="px-1 text-red-200 text-sm">···</span>}
                  </>
                )}

                {pageNumbers.map((page) => (
                  <PaginationButton
                    key={page}
                    onClick={() => handlePageChange(page)}
                    active={currentPage === page}
                    loading={pageLoading && currentPage === page}
                  >
                    {page}
                  </PaginationButton>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                      <span className="px-1 text-red-200 text-sm">···</span>
                    )}
                    <PaginationButton
                      onClick={() => handlePageChange(totalPages)}
                      active={currentPage === totalPages}
                      loading={pageLoading && currentPage === totalPages}
                    >
                      {totalPages}
                    </PaginationButton>
                  </>
                )}

                <PaginationButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </PaginationButton>
              </div>
            )}
          </div>

        ) : (
          <div className="rounded-3xl bg-white border border-red-100 p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-300 border border-red-100/50">
              <Search size={26} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Records Found</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-xs mx-auto">
              Check the spelling or try searching with the resident code instead.
            </p>
          </div>
        )}
      </main>

      {/* ── Unlock Modal ── */}
      {unlockModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl shadow-black/20 border border-red-100">
            <h3 className="text-xl font-extrabold text-slate-800 mb-2">
              Verify Digital ID
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Enter the resident&apos;s birthdate to access the digital ID.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-red-800 mb-2">
                  Resident Code
                </label>
                <input
                  type="text"
                  value={unlockModal.residentCode}
                  disabled
                  className="w-full rounded-xl border border-red-100 bg-red-50/50 px-4 py-3.5 text-sm font-semibold text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-red-800 mb-2">
                  Birthdate
                </label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full rounded-xl border border-red-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 outline-none focus:border-red-700 focus:ring-1 focus:ring-red-700 transition-shadow"
                />
              </div>

              {unlockError && (
                <p className="text-sm text-red-600 font-semibold">{unlockError}</p>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setUnlockModal({ open: false, residentCode: "" });
                  setBirthdate("");
                  setUnlockError("");
                }}
                className="flex-1 rounded-xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-900 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleUnlock}
                disabled={unlocking || !birthdate}
                className="flex-1 rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-white hover:bg-red-800 hover:shadow-md hover:shadow-red-900/20 transition-all disabled:opacity-60 disabled:hover:bg-red-900 disabled:hover:shadow-none"
              >
                {unlocking ? "Verifying..." : "Unlock ID"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="mt-12 border-t border-red-100 bg-white py-8 text-center">
        <p className="text-sm font-medium text-slate-500">
          © {new Date().getFullYear()} Municipality of San Felipe
        </p>
        <p className="text-xs text-slate-400 mt-1">
          All resident data is protected under applicable privacy laws.
        </p>
      </footer>
    </div>
  );
}