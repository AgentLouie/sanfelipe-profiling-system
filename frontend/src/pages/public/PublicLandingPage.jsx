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
  Fingerprint,
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
  <div className="relative overflow-hidden rounded-2xl bg-white border border-red-950/10 shadow-sm">
    <div className="h-[3px] w-full bg-red-950/20" />
    <div className="p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] rounded-xl bg-red-950/10 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-20 rounded bg-red-950/10" />
          <div className="h-4 w-36 rounded bg-red-950/10" />
          <div className="h-3 w-24 rounded bg-red-950/10" />
        </div>
      </div>
      <div className="h-9 w-full rounded-xl bg-red-950/10" />
      <div className="h-10 w-full rounded-xl bg-red-950/10" />
    </div>
  </div>
);

/* ─── Resident Card ─────────────────────────────────────────────── */
const ResidentCard = ({ resident, onOpen, index }) => (
  <div
    className="group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-red-950/10"
    style={{ animationDelay: `${index * 60}ms` }}
  >
    <div className="h-[3px] w-full bg-gradient-to-r from-red-950 via-red-800 to-red-700" />

    <div
      className="absolute inset-0 opacity-[0.025] pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, #450a0a 1px, transparent 0)",
        backgroundSize: "20px 20px",
      }}
    />

    <div className="relative p-6">
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <div className="h-[72px] w-[72px] rounded-xl overflow-hidden border-2 border-red-950/10 bg-red-950/5 shadow-inner">
            {resident.photo_url ? (
              <img src={resident.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-red-900/20">
                <User size={28} />
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-900 shadow-sm">
            <BadgeCheck size={12} className="text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-800 mb-0.5">
            Verified Resident
          </p>
          <h3 className="text-base font-black text-slate-900 leading-tight truncate">
            {resident.last_name}, {resident.first_name}
          </h3>
          <p className="mt-1 font-mono text-[11px] font-semibold text-red-900 bg-red-950/5 rounded-md px-2 py-0.5 inline-block">
            {resident.resident_code}
          </p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-red-950/5 px-3 py-2.5">
        <MapPin size={13} className="shrink-0 text-red-900" />
        <span className="text-xs font-semibold text-red-950 truncate">
          {resident.barangay} · {formatPurok(resident.purok)}
        </span>
      </div>

      <button
        onClick={() => onOpen(resident.resident_code)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-900 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-red-950 hover:gap-3 active:scale-[0.98]"
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
        ? "bg-red-900 text-white shadow-sm shadow-red-950/30"
        : "bg-white border border-red-900/20 text-red-900 hover:bg-red-950/5 hover:border-red-900/40"
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
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 350);
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
    <div className="min-h-screen bg-red-950/5 font-sans text-slate-900">

      {/* ── Official Banner ── */}
      <div className="bg-red-950 py-2 text-center text-[11px] font-semibold tracking-[0.12em] uppercase text-red-300">
        <span className="inline-flex items-center gap-2">
          <ShieldCheck size={12} className="text-red-400" />
          Official Public Verification · Municipality of San Felipe
        </span>
      </div>

      {/* ── Hero Header ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-red-800">
        <div className="pointer-events-none absolute -top-32 -right-32 h-[480px] w-[480px] rounded-full bg-red-800 opacity-20" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-red-950 opacity-40" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-red-800 opacity-10" />

        <div className="relative mx-auto max-w-5xl px-6 py-16 md:py-20">
          <div className="mx-auto max-w-3xl">

            {/* Logo + Org */}
            <div className="flex flex-col items-center gap-4 mb-8">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-white opacity-10 scale-110" />
                <img
                  src="/san_felipe_seal.png"
                  alt="Seal"
                  className="relative h-20 w-20 rounded-full border-2 border-white/20 bg-white/10 shadow-lg p-1.5 object-contain backdrop-blur-sm"
                />
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-red-300">
                <Building2 size={13} />
                Municipality of San Felipe
              </div>
            </div>

            {/* Headline */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-black tracking-tight text-white md:text-[52px] leading-[1.1] drop-shadow-sm">
                Resident Verification
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-red-200 md:text-[15px] opacity-70">
                Search and verify official resident records.
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <div
                className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                  focused ? "shadow-[0_0_0_3px_rgba(255,255,255,0.2)]" : "shadow-md"
                }`}
              />
              <div className="relative flex items-center bg-white rounded-2xl overflow-hidden">
                <div className="flex items-center pl-5 pr-3 shrink-0">
                  {loading ? (
                    <Loader2 size={18} className="animate-spin text-red-900" />
                  ) : (
                    <Search
                      size={18}
                      className={`transition-colors ${focused ? "text-red-900" : "text-red-300"}`}
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
                  className="h-[54px] flex-1 bg-transparent pr-5 text-[15px] text-slate-900 outline-none placeholder:text-red-200"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="mr-3 shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-800 hover:text-red-950 hover:bg-red-950/5 transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Hint */}
            <p className="mt-4 text-center text-xs text-red-300 opacity-70">
              <ScanLine size={12} className="inline mr-1.5 text-red-400" />
              Use the resident's complete name for accurate results.
            </p>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 40" className="w-full fill-red-950/5" preserveAspectRatio="none" height="40">
            <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" />
          </svg>
        </div>
      </header>

      {/* ── Results ── */}
      <main className="mx-auto max-w-6xl px-6 py-10">

        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl bg-white border border-red-950/10 px-5 py-3 shadow-sm animate-pulse">
              <div className="h-3 w-40 rounded bg-red-950/10" />
              <div className="h-3 w-16 rounded bg-red-950/10" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          </div>

        ) : !query.trim() ? (
          <div className="rounded-2xl bg-white border border-red-950/10 py-20 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/5 text-red-900/20">
              <UserSearch size={32} />
            </div>
            <h2 className="text-base font-bold text-slate-700">Ready to Verify</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto">
              Enter a resident name or code above to begin verification.
            </p>
          </div>

        ) : results.length > 0 ? (
          <div className="space-y-6">

            {/* Result meta row */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white border border-red-950/10 px-5 py-3 shadow-sm">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-bold text-red-900">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, results.length)}
                </span>{" "}
                of <span className="font-bold text-red-900">{results.length}</span> records
              </p>
              <div className="flex items-center gap-2">
                {pageLoading && <Loader2 size={13} className="animate-spin text-red-800" />}
                <p className="text-xs font-semibold text-red-800/40 uppercase tracking-wider">
                  Page {currentPage} / {totalPages}
                </p>
              </div>
            </div>

            {/* Grid — dim + skeleton while page is changing */}
            {pageLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedResults.map((r, i) => (
                  <ResidentCard
                    key={r.resident_code}
                    resident={r}
                    index={i}
                    onOpen={(code) => navigate(`/public/id/${code}`)}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                <PaginationButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  loading={pageLoading && false}
                >
                  <ChevronLeft size={15} />
                </PaginationButton>

                {pageNumbers[0] > 1 && (
                  <>
                    <PaginationButton onClick={() => handlePageChange(1)} active={currentPage === 1} loading={pageLoading && currentPage !== 1}>
                      1
                    </PaginationButton>
                    {pageNumbers[0] > 2 && <span className="px-1 text-red-900/30 text-sm">···</span>}
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
                      <span className="px-1 text-red-900/30 text-sm">···</span>
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
                  <ChevronRight size={15} />
                </PaginationButton>
              </div>
            )}
          </div>

        ) : (
          <div className="rounded-2xl bg-white border border-red-950/10 p-16 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-950/5 text-red-900/20">
              <Search size={26} />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Records Found</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-xs mx-auto">
              Check the spelling or try searching with the resident code instead.
            </p>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-10 border-t border-red-950/10 bg-white py-6 text-center">
        <p className="text-xs text-red-900/30">
          © {new Date().getFullYear()} Municipality of San Felipe · All resident data is protected under applicable privacy laws.
        </p>
      </footer>
    </div>
  );
}