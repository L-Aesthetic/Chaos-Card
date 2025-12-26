
import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Database, Zap, Lock, Unlock, 
  AlertTriangle, Eye, EyeOff, Save, 
  RefreshCw, CheckCircle, XCircle, 
  Terminal, Activity, MessageSquare, 
  BarChart2, Users, AlertOctagon, 
  Cpu, Globe, Settings, Edit3, Grid,
  Play, Pause, Flame, Search, Check,
  Calendar, CreditCard, X, Crown, Menu,
  LayoutDashboard, MapPin, TrendingUp,
  LogOut, Mail, Key, ArrowUpRight,
  Layers, DollarSign
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, Legend
} from 'recharts';
import { supabase } from '../lib/supabase';
import doomgoLogo from '../assets/chaos-icon.png';

function AdminLogin({ onAuthed }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [err, setErr] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  const signIn = async () => {
    setErr(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) return setErr(error.message);
    onAuthed?.(data?.session);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="text-2xl font-black text-slate-900">DOOMGO Admin</div>
        <div className="text-sm text-slate-500 mt-1">Sign in to continue.</div>

        <div className="mt-6 space-y-3">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
            placeholder="Email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />

          {err && <div className="text-sm text-rose-600 font-bold">{err}</div>}

          <button
            onClick={signIn}
            disabled={loading}
            className="w-full bg-[#6A4DFF] text-white font-bold py-3 rounded-xl disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --------------------
// ADMIN ANALYTICS CONFIG
// --------------------
const TABLES = {
  users: 'profiles',
  boards: 'doomgo_boards',
  purchases: 'doomgo_purchases',
  subEvents: 'doomgo_subscription_events',
};


// Try to read a "region" value from user row (customize this once and you're done)
const getUserRegion = (u) => (
  u?.region || u?.country || u?.country_code || u?.locale || 'Unknown'
);

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const isoDay = (d) => startOfDay(d).toISOString().slice(0, 10); // YYYY-MM-DD

const formatMoney = (cents) => {
  const dollars = (Number(cents || 0) / 100);
  return dollars.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
};

const PRO_PRICE_CENTS = 499; // $4.99

const pad2 = (n) => String(n).padStart(2, "0");

// ISO (stored) -> "YYYY-MM-DDTHH:mm" (for <input type="datetime-local"> in LOCAL time)
const isoToDatetimeLocal = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";

  const yyyy = d.getFullYear();
  const mm = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const min = pad2(d.getMinutes());

  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
};

// "YYYY-MM-DDTHH:mm" (from input, LOCAL time) -> ISO (UTC) for storage
const toIsoFromDatetimeLocal = (value) => {
  const d = new Date(value); // interpreted as LOCAL time
  return isNaN(d.getTime()) ? null : d.toISOString();
};

// measures Supabase latency by doing a tiny query
const measureSupabaseMs = async () => {
  const t0 = performance.now();
  await supabase.from('doomgo_admin_state').select('id', { head: true }).eq('id', 'global');
  return Math.round(performance.now() - t0);
};

// Try to compute chaos score from a board row.
// Preferred: board.chaos_score (0..100). Fallback: average chaosWeight from tiles JSON.
const getBoardChaos = (b) => {
  if (typeof b?.chaos_score === 'number') return b.chaos_score;

  const tiles = b?.tiles || b?.board || b?.data?.tiles;
  if (!Array.isArray(tiles)) return null;

 const weights = tiles
  .map(t => {
    if (typeof t?.chaosWeight === "number") return t.chaosWeight;
    if (typeof t?.confidence === "number") return t.confidence; // ✅ fallback
    return null;
  })
  .filter(v => v !== null);


  if (!weights.length) return null;
  const avg = weights.reduce((a, c) => a + c, 0) / weights.length;
  return Math.round(avg);
};


const getTimeRemaining = (lockDate) => {
  const now = new Date();
  const target = new Date(lockDate);
  const diff = target - now;

  if (diff <= 0) return 'LOCKED';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
};

/**
 * VISUAL IDENTITY - "NEON CLEAN" (OG Style)
 * White/Slate base with Neon Purple/Pink/Blue accents
 */
const COLORS = {
  purple: '#6A4DFF',
  blue: '#4D9BFF',
  lavender: '#A788FF',
  neonPink: '#FF67D2',
  slate900: '#0F172A',
  slate500: '#64748B',
  bg: '#F8FAFC',
};

const ApocalypseLogo = ({ size = 32, className = "" }) => (
  <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
    <div className="absolute inset-0 bg-gradient-to-br from-[#FF67D2] to-[#6A4DFF] rounded-lg opacity-100 shadow-lg shadow-purple-500/20" />
    <Flame size={size * 0.6} className="text-white relative z-10" fill="currentColor" />
    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full border-2 border-[#FF67D2] z-20" />
  </div>
);

/**
 * MOCK DATA GENERATORS
 */
const getGrowthData = (range) => {
  switch(range) {
    case 'Now':
      return Array.from({ length: 12 }, (_, i) => ({
        name: `${(i + 1) * 5}m`,
        new: Math.floor(Math.random() * 50) + 10,
        returning: Math.floor(Math.random() * 100) + 50,
      }));
    case 'Week':
      return [
        { name: 'Mon', new: 1200, returning: 3400 },
        { name: 'Tue', new: 1500, returning: 3800 },
        { name: 'Wed', new: 1100, returning: 3200 },
        { name: 'Thu', new: 1800, returning: 4100 },
        { name: 'Fri', new: 2400, returning: 4800 },
        { name: 'Sat', new: 3100, returning: 5200 },
        { name: 'Sun', new: 3800, returning: 5900 },
      ];
    case 'Month':
      return Array.from({ length: 15 }, (_, i) => ({
        name: `Day ${i * 2 + 1}`,
        new: Math.floor(Math.random() * 500) + 200,
        returning: Math.floor(Math.random() * 1000) + 800,
      }));
    case 'Year':
      return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({
        name: m,
        new: Math.floor(Math.random() * 5000) + 2000,
        returning: Math.floor(Math.random() * 15000) + 8000,
      }));
      case 'All':
  return [
    { name: '2023', new: 12000, returning: 40000 },
    { name: '2024', new: 42000, returning: 120000 },
    { name: '2025', new: 78000, returning: 220000 },
    { name: '2026', new: 124592, returning: 340000 },
  ];
    default:
      return [];
  }
};

const USER_REGION_DATA = [
  { name: 'North America', users: 45200, color: '#6A4DFF' },
  { name: 'Europe', users: 32100, color: '#4D9BFF' },
  { name: 'South America', users: 21500, color: '#FF67D2' },
  { name: 'Asia', users: 15400, color: '#A788FF' },
  { name: 'Oceania', users: 8200, color: '#10B981' },
];

const INITIAL_CANON_DECK = Array.from({ length: 25 }, (_, i) => {
  const w = i === 12 ? 100 : Math.floor(Math.random() * 100);
  return {
    id: i,
    text: i === 12 ? "DOOMGO 2026 (CROWN)" : `Event ${i + 1}: [Placeholder]`,
    category: i === 12 ? "Special" : "General",
    chaosWeight: w,
    confidence: w, // ✅ mirror for client boards
    isLocked: i === 12,
  };
});


const INITIAL_SUGGESTIONS = [
  { id: 101, text: "Billionaire builds actual pyramid", votes: 450, status: 'Pending' },
  { id: 102, text: "Antarctica declares independence", votes: 320, status: 'Pending' },
  { id: 103, text: "Coffee goes extinct", votes: 120, status: 'Rejected' },
];

const INITIAL_USERS = [
  { id: 1, name: 'DoomsdayPrepper', email: 'prep@bunker.com', status: 'Active', region: 'NA', boards: 12 },
  { id: 2, name: 'Sarah_Vibes', email: 'sarah@vibes.com', status: 'Active', region: 'EU', boards: 5 },
  { id: 3, name: 'Bot_Network_01', email: 'bot01@spam.net', status: 'Banned', region: 'RU', boards: 0 },
  { id: 4, name: 'MysticUser', email: 'mystic@oracle.net', status: 'Active', region: 'SA', boards: 34 },
  { id: 5, name: 'Newbie_2025', email: 'hello@new.com', status: 'New', region: 'AS', boards: 1 },
];

/**
 * SHARED COMPONENTS
 */
const Card = ({ children, className = "", title, action }) => (
  <div className={`bg-white border border-slate-100 rounded-2xl shadow-sm ${className}`}>
    {(title || action) && (
      <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
        {title && <h3 className="text-slate-900 font-bold text-lg flex items-center gap-2">{title}</h3>}
        {action}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const Badge = ({ children, type = 'neutral' }) => {
  const styles = {
    neutral: 'bg-slate-100 text-slate-500',
    success: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
    danger: 'bg-rose-50 text-rose-600 border border-rose-100',
    warning: 'bg-amber-50 text-amber-600 border border-amber-100',
    primary: 'bg-blue-50 text-blue-600 border border-blue-100',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${styles[type]}`}>
      {children}
    </span>
  );
};

const Toggle = ({ enabled, onChange, label, danger = false }) => (
  <div className="flex items-center justify-between py-3">
    <span className={`text-sm font-bold ${danger ? 'text-rose-500' : 'text-slate-700'}`}>{label}</span>
    <button 
      onClick={() => onChange(!enabled)}
      className={`w-12 h-6 rounded-full transition-colors relative ${enabled ? (danger ? 'bg-rose-500' : 'bg-[#6A4DFF]') : 'bg-slate-200'}`}
    >
      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${enabled ? 'translate-x-6' : ''}`} />
    </button>
  </div>
);

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in slide-in-from-bottom-5 border border-slate-700/50">
    <CheckCircle size={20} className="text-emerald-400" />
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="ml-2 hover:text-slate-300"><X size={16}/></button>
  </div>
);

/**
 * 0️⃣ DASHBOARD OVERVIEW (COCKPIT)
 */
const DashboardView = ({ showToast }) => {
  const [timeRange, setTimeRange] = useState('Week');

  const [loadingDash, setLoadingDash] = useState(true);

const [stats, setStats] = useState({
  totalUsers: 0,
  boardsCreated: 0,
  globalChaos: 0,
  revenueCents: 0,

  activeSubs: 0,
  mrrCents: 0,
  churn30d: 0,

  supabaseMs: null,
  oracleMs: null,
});


  const [chartData, setChartData] = useState([]); // [{name,new,returning}]
  const [regionData, setRegionData] = useState([]); // [{name, users, color}]

  // time window helper for growth chart
  const getRangeWindow = () => {
    const now = new Date();
    if (timeRange === 'Now') {
      // last 60 min in 5-min buckets = 12 points
      return { mode: 'minutes', minutes: 60, bucketMinutes: 5 };
    }
    if (timeRange === 'Week') return { mode: 'days', days: 7, bucketDays: 1 };
    if (timeRange === 'Month') return { mode: 'days', days: 30, bucketDays: 2 }; // 15 points
    if (timeRange === 'Year') return { mode: 'months', months: 12 };
    // All: last 4 years (matches your mock)
    return { mode: 'years', years: 4 };
  };


  const fetchDashboard = async () => {
    setLoadingDash(true);

    try {
      // 1) TOTAL USERS (fast count)
      const usersCountReq = supabase
        .from(TABLES.users)
        .select('id', { count: 'exact', head: true });

      // 2) BOARDS CREATED (fast count)
      const boardsCountReq = supabase
        .from(TABLES.boards)
        .select('id', { count: 'exact', head: true });

      // 3) REVENUE (last 30 days)
      const revFrom = new Date();
      revFrom.setDate(revFrom.getDate() - 30);

      const revenueReq = supabase
        .from(TABLES.purchases)
        .select('amount_cents, status, created_at')
        .gte('created_at', revFrom.toISOString())
        .limit(5000);

      // 4) GLOBAL CHAOS (sample last 500 boards)
      const chaosReq = supabase
        .from(TABLES.boards)
        .select('chaos_score, tiles, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      // 5) TOP REGIONS (client-side aggregation)
      const regionsReq = supabase
        .from(TABLES.users)
        .select('region')
        .limit(10000);

      // 6) SUBS + CHURN
      const subsReq = supabase
        .from(TABLES.users)
        .select("id, is_pro, pro_current_period_end")
        .limit(20000);

      const churnFrom = new Date();
      churnFrom.setDate(churnFrom.getDate() - 30);

      const churnReq = supabase
        .from(TABLES.subEvents)
        .select("event_type, occurred_at")
        .eq("event_type", "deleted")
        .gte("occurred_at", churnFrom.toISOString())
        .limit(5000);

      // 7) SYSTEM STATUS latency
      const supaMsReq = measureSupabaseMs();

      const [
        usersCountRes,
        boardsCountRes,
        revenueRes,
        chaosRes,
        regionsRes,
        subsRes,
        churnRes,
        supaMs,
      ] = await Promise.all([
        usersCountReq,
        boardsCountReq,
        revenueReq,
        chaosReq,
        regionsReq,
        subsReq,
        churnReq,
        supaMsReq,
      ]);

      const totalUsers = usersCountRes.count || 0;
      const boardsCreated = boardsCountRes.count || 0;

      // revenue sum (paid only)
      const revenueCents = (revenueRes.data || [])
        .filter(p => (p.status || 'paid') === 'paid')
        .reduce((sum, p) => sum + Number(p.amount_cents || 0), 0);

      // global chaos avg
      const chaosVals = (chaosRes.data || [])
        .map(getBoardChaos)
        .filter(v => typeof v === 'number');

      const globalChaos = chaosVals.length
        ? Math.round(chaosVals.reduce((a, c) => a + c, 0) / chaosVals.length)
        : 0;

      // active subs + MRR
      const now = new Date();
      const activeSubs = (subsRes.data || []).filter((p) => {
        const end = p.pro_current_period_end ? new Date(p.pro_current_period_end) : null;
        const inPeriod = end && end > now;
        return !!p.is_pro || !!inPeriod;
      }).length;

      const mrrCents = activeSubs * PRO_PRICE_CENTS;

      // churn 30d
      const churn30d = (churnRes.data || []).length;

      // top regions aggregation
      const regionCounts = new Map();
      (regionsRes.data || []).forEach((u) => {
        const r = getUserRegion(u);
        regionCounts.set(r, (regionCounts.get(r) || 0) + 1);
      });

      const topRegions = [...regionCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, users], idx) => ({
          name,
          users,
          color: ['#6A4DFF', '#4D9BFF', '#FF67D2', '#A788FF', '#10B981'][idx % 5]
        }));

      setStats((prev) => ({
        ...prev,
        totalUsers,
        boardsCreated,
        globalChaos,
        revenueCents,
        activeSubs,
        mrrCents,
        churn30d,
        supabaseMs: supaMs,
      }));

      setRegionData(topRegions);

      const series = await fetchGrowthSeries(timeRange);
      setChartData(series);

      if (showToast) showToast(`Dashboard refreshed (${timeRange})`);

    } catch (e) {
      console.error('Dashboard fetch failed:', e);
    } finally {
      setLoadingDash(false);
    }
  };

  // Growth series builder
const fetchGrowthSeries = async (range) => {
  const now = new Date();
  const window = getRangeWindow();

  // --- helpers ---
  const bucketLabel = {
    week: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  };

  const makeDayBuckets = (start, days, stepDays, labelMode) => {
    const buckets = [];
    for (let i = 0; i < days; i += stepDays) {
      const bucketStart = startOfDay(addDays(start, i));
      const bucketEnd = startOfDay(addDays(start, i + stepDays));
      const name =
  labelMode === "dow"
    ? bucketLabel.week[bucketStart.getDay()]
    : bucketStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      buckets.push({ bucketStart, bucketEnd, name });
    }
    return buckets;
  };

  const makeMinuteBuckets = (start, totalMinutes, stepMinutes) => {
    const buckets = [];
    const count = Math.ceil(totalMinutes / stepMinutes);
    for (let i = 0; i < count; i++) {
      const bucketStart = new Date(start.getTime() + i * stepMinutes * 60 * 1000);
      const bucketEnd = new Date(bucketStart.getTime() + stepMinutes * 60 * 1000);
      const name = `${(i + 1) * stepMinutes}m`;
      buckets.push({ bucketStart, bucketEnd, name });
    }
    return buckets;
  };

  const makeMonthBuckets = (monthsBack) => {
    // last N months including current month
    const buckets = [];
    const base = new Date(now);
    base.setDate(1);
    base.setHours(0, 0, 0, 0);

    for (let i = monthsBack - 1; i >= 0; i--) {
      const bucketStart = new Date(base);
      bucketStart.setMonth(bucketStart.getMonth() - i);

      const bucketEnd = new Date(bucketStart);
      bucketEnd.setMonth(bucketEnd.getMonth() + 1);

      const name = bucketLabel.months[bucketStart.getMonth()];
      buckets.push({ bucketStart, bucketEnd, name });
    }
    return buckets;
  };

  const makeYearBuckets = (yearsBack) => {
    const buckets = [];
    const thisYear = now.getFullYear();
    for (let y = thisYear - (yearsBack - 1); y <= thisYear; y++) {
      const bucketStart = new Date(y, 0, 1, 0, 0, 0, 0);
      const bucketEnd = new Date(y + 1, 0, 1, 0, 0, 0, 0);
      buckets.push({ bucketStart, bucketEnd, name: String(y) });
    }
    return buckets;
  };

  
  // --- decide buckets + overall start ---
  let buckets = [];
  let rangeStart = null;

  if (window.mode === "minutes") {
    const start = new Date(now.getTime() - window.minutes * 60 * 1000);
    buckets = makeMinuteBuckets(start, window.minutes, window.bucketMinutes);
    rangeStart = start;
  } else if (window.mode === "days") {
    const start = startOfDay(addDays(now, -window.days + 1));
    buckets = makeDayBuckets(
      start,
      window.days,
      window.bucketDays || 1,
      window.days === 7 ? "dow" : "daynum"
    );
    rangeStart = start;
  } else if (window.mode === "months") {
    buckets = makeMonthBuckets(12);
    rangeStart = buckets[0]?.bucketStart || startOfDay(addDays(now, -365));
  } else {
    // years
    buckets = makeYearBuckets(window.years || 4);
    rangeStart = buckets[0]?.bucketStart || startOfDay(addDays(now, -365 * 4));
  }

  const startIso = rangeStart.toISOString();
  const nowIso = now.toISOString();

  // --- fetch NEW users (created in range) ---
  const { data: newUsers, error: newErr } = await supabase
    .from(TABLES.users)
    .select("device_id, created_at")
    .gte("created_at", startIso)
    .lte("created_at", nowIso)
    .limit(100000);

  if (newErr) console.warn("fetchGrowthSeries newUsers error:", newErr);

  // --- fetch ACTIVE users (seen in range) ---
  // IMPORTANT: this relies on your app heartbeat updating profiles.last_seen_at
  const { data: activeUsers, error: activeErr } = await supabase
    .from(TABLES.users)
    .select("device_id, created_at, last_seen_at")
    .gte("last_seen_at", startIso)
    .lte("last_seen_at", nowIso)
    .limit(100000);

  if (activeErr) console.warn("fetchGrowthSeries activeUsers error:", activeErr);

  // --- bucket counts ---
  return buckets.map(({ bucketStart, bucketEnd, name }) => {
    // new = profiles created in bucket
    const newCount = (newUsers || []).reduce((acc, u) => {
      const t = new Date(u.created_at);
      return (t >= bucketStart && t < bucketEnd) ? acc + 1 : acc;
    }, 0);

    // returning = active in bucket AND created before bucketStart
    const returningSet = new Set();
    (activeUsers || []).forEach((u) => {
      const seen = new Date(u.last_seen_at);
      if (seen >= bucketStart && seen < bucketEnd) {
        const created = u.created_at ? new Date(u.created_at) : null;
        if (created && created < bucketStart) returningSet.add(u.device_id);
      }
    });

    return { name, new: newCount, returning: returningSet.size };
  });
};


  useEffect(() => {
    fetchDashboard();
    // refresh every 30s while viewing dashboard
    const t = setInterval(fetchDashboard, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const metrics = [
    {
      label: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: '', // optional: compute later (week-over-week)
      icon: Users, color: 'text-blue-500', bg: 'bg-blue-50'
    },
    {
      label: 'Boards Created',
      value: stats.boardsCreated.toLocaleString(),
      change: '',
      icon: Layers, color: 'text-purple-500', bg: 'bg-purple-50'
    },
    {
      label: 'Global Chaos',
      value: `${stats.globalChaos}%`,
      change: '',
      icon: Zap, color: 'text-pink-500', bg: 'bg-pink-50'
    },
    {
      label: 'Revenue (30d)',
      value: formatMoney(stats.revenueCents),
      change: '',
      icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50'
    },
    {
  label: 'Active Subs',
  value: stats.activeSubs.toLocaleString(),
  change: '',
  icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50'
},
{
  label: 'MRR (est)',
  value: formatMoney(stats.mrrCents),
  change: '',
  icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50'
},
{
  label: 'Churn (30d)',
  value: stats.churn30d.toLocaleString(),
  change: '',
  icon: AlertOctagon, color: 'text-rose-500', bg: 'bg-rose-50'
},

  ];


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <Card key={i} className="flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${metric.bg} ${metric.color}`}>
                <metric.icon size={20} />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">{metric.change}</span>
            </div>
            <div>
              <div className="text-slate-500 text-xs font-bold uppercase tracking-wider">{metric.label}</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{metric.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart */}
        <div className="lg:col-span-2">
          <Card 
            title={<><TrendingUp size={20} className="text-[#6A4DFF]"/> User Growth</>}
            action={
              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                {['Now', 'Week', 'Month', 'Year', 'All'].map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      timeRange === range 
                        ? 'bg-white text-[#6A4DFF] shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            }
          >
            <div className="h-72 w-full min-w-0" style={{ minHeight: 1, minWidth: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6A4DFF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6A4DFF" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4D9BFF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4D9BFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748B'}} />
                  <Tooltip contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="new" stackId="1" stroke="#6A4DFF" fill="url(#colorNew)" name="New Users" />
                  <Area type="monotone" dataKey="returning" stackId="1" stroke="#4D9BFF" fill="url(#colorRet)" name="Returning Users" />
                  <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Geographic Distribution */}
        <div className="space-y-6">
             <Card title={<><Globe size={20} className="text-[#4D9BFF]"/> Top Regions</>}>
                <div className="space-y-4">
                    {regionData.map((region, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full" style={{backgroundColor: region.color}} />
                                <span className="text-sm font-bold text-slate-700">{region.name}</span>
                            </div>
                            <span className="text-sm font-mono font-bold text-slate-500">{region.users.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-6 pt-4 border-t border-slate-50">
                    <button className="w-full text-xs font-bold text-[#6A4DFF] hover:text-[#5839ff] flex items-center justify-center gap-1">
                        View Full Map <ArrowUpRight size={12}/>
                    </button>
                </div>
             </Card>
             
             <Card>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase">System Status</span>
                    <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                        <span className="text-xs font-bold text-emerald-600">Operational</span>
                    </div>
                </div>
                <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs text-slate-500">
  <span>Canon DB</span>
  <span>{stats.supabaseMs ?? '—'}ms</span>
</div>

                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden"><div className="w-[92%] h-full bg-emerald-400 rounded-full"/></div>
                    
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
  <span>AI Oracle</span>
  <span>{stats.oracleMs ?? '—'}ms</span>
</div>

                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden"><div className="w-[98%] h-full bg-[#6A4DFF] rounded-full"/></div>
                </div>
             </Card>
        </div>
      </div>
    </div>
  );
};

/**
 * 1️⃣ AUTHORITY VIEW
 */
const AuthorityView = ({ adminState, setAdminState, goToCanon, showToast }) => {
  const isLocked = adminState.status === 'Locked';
  const lock = new Date(adminState.lockDate);

  const isHardLocked =
    adminState.lockDate && !isNaN(lock.getTime())
      ? new Date() > lock
      : false;

  // ✅ FIX: your JSX uses `hardLocked`, so define it
  const hardLocked = isHardLocked;

  // ✅ FIX: you call setSavingLock(), but never defined the state
  const [savingLock, setSavingLock] = useState(false);

  // ✅ local draft so datetime-local can be edited without snapping back
  const [lockDraft, setLockDraft] = useState(() => isoToDatetimeLocal(adminState.lockDate));
  const [lockDirty, setLockDirty] = useState(false);


// keep draft synced to server value unless user is mid-edit
useEffect(() => {
  if (!lockDirty) setLockDraft(isoToDatetimeLocal(adminState.lockDate));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [adminState.lockDate]);

const saveHardLock = async () => {
  const iso = toIsoFromDatetimeLocal(lockDraft);
  if (!iso) {
    showToast?.("Invalid date/time");
    return;
  }

  setSavingLock(true);
  try {
    await setAdminState({
      lockDate: iso,
    });

    setLockDirty(false);

    // If you set it to a past time, you're instantly locked
    const nowLocked = new Date() >= new Date(iso);
    showToast?.(nowLocked ? "HARD LOCK ACTIVE 🔒" : "Hard Lock saved ✅");
  } catch (e) {
    console.error("saveHardLock failed:", e);
    showToast?.(`Save failed: ${e?.message || "Unknown error"}`);
  } finally {
    setSavingLock(false);
  }
};

const cancelHardLockEdit = () => {
  setLockDraft(isoToDatetimeLocal(adminState.lockDate));
  setLockDirty(false);
  showToast?.("Hard Lock edit cancelled");
};



  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(v => v + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card title={<><Lock size={20} className="text-[#6A4DFF]"/> Active Edition Control</>}>
        <div className="space-y-6">
          {/* Year */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
              Target Simulation Year
            </label>

            <div className="flex gap-4 items-center">
              <input
                type="number"
                value={adminState.activeYear}
                onChange={(e) =>
                  setAdminState({
                    activeYear: Number(e.target.value),
                  })
                }
                disabled={isLocked}
                className="bg-slate-50 border border-slate-200 text-slate-900 text-2xl font-black rounded-xl px-4 py-3 w-32 text-center focus:ring-2 focus:ring-[#6A4DFF] outline-none disabled:opacity-50"
              />

              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-bold uppercase">Current Status</span>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isLocked ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                  <span className={`font-bold ${isLocked ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {adminState.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="border-t border-slate-100 pt-6">
            <div className="flex gap-2">
              <button
                onClick={() => setAdminState({ status: 'Draft' })}
                disabled={isHardLocked}
                className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                  adminState.status === 'Draft'
                    ? 'bg-slate-200 text-slate-600'
                    : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-400'
                }`}
              >
                Draft
              </button>

              <button
                onClick={() => setAdminState({  status: 'Open' })}
                disabled={isHardLocked}
                className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                  adminState.status === 'Open'
                    ? 'bg-[#6A4DFF] text-white shadow-lg shadow-[#6A4DFF]/20'
                    : 'bg-white text-slate-400 border border-slate-200 hover:border-[#6A4DFF]'
                }`}
              >
                Open (Live)
              </button>

              <button
                onClick={() =>
                  setAdminState({
                    status: adminState.status === 'Locked' ? 'Draft' : 'Locked',
                  })
                }
                disabled={isHardLocked}
                className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                  adminState.status === 'Locked'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-rose-500 border border-rose-200 hover:bg-rose-50'
                }`}
              >
                {adminState.status === 'Locked' ? <Unlock size={16} /> : <Lock size={16} />}
                {adminState.status === 'Locked' ? 'UNLOCK' : 'LOCK'}
              </button>
            </div>

            {/* Button UNDER the row (this is the part that was breaking your JSX nesting) */}
            <button
              onClick={goToCanon}
              disabled={isHardLocked}
              className={`mt-4 w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${
                isHardLocked
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#6A4DFF] text-white hover:bg-[#5839ff]'
              }`}
            >
              <Edit3 size={16} />
              Open Canon Deck Editor
            </button>

            <p className="text-xs text-slate-400 mt-3 text-center">
              {isHardLocked
                ? "⛔ Hard Lock passed. Canon permanently sealed."
                : "ℹ️ Admin may edit canon until Hard Lock date."}
            </p>

            <div className="border-t border-slate-100 pt-6 mt-6">
              <Toggle
                label="Enable Global Canon Mode (All users share the same 2026)"
                enabled={adminState.canonMode}
                onChange={(value) =>
                  setAdminState({
                    canonMode: value,
                  })
                }
              />

              <p className="text-xs text-slate-400 mt-2">
                {adminState.canonMode
                  ? "🟣 Canon Mode ON — All users receive the official Doomgo 2026 board."
                  : "⚪ Canon Mode OFF — Users create personal 2026 boards."}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card
  title={<><Calendar size={20} className="text-[#FF67D2]"/> Hard Lock Enforcement</>}
  action={
    <Badge type={hardLocked ? "danger" : "primary"}>
      {hardLocked ? "LOCKED" : "ARMED"}
    </Badge>
  }
>
  <div className="space-y-6">
    <div className={`p-4 rounded-xl border ${hardLocked ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`${hardLocked ? "text-rose-500" : "text-slate-500"} shrink-0`} size={24} />
        <div>
          <h4 className={`${hardLocked ? "text-rose-600" : "text-slate-700"} font-bold text-sm`}>
            Ritual Lock Protocol
          </h4>
          <p className={`${hardLocked ? "text-rose-500" : "text-slate-500"} text-xs mt-1`}>
            Once crossed, Canon Deck writes are rejected automatically (even if someone bypasses the UI).
          </p>
        </div>
      </div>
    </div>

    <div>
      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
        Hard Lock Timestamp (Local input • stored as UTC)
      </label>

      <input
        type="datetime-local"
        value={lockDraft}
        onChange={(e) => {
          setLockDraft(e.target.value);
          setLockDirty(true);
        }}
        disabled={hardLocked}
        className={`w-full bg-slate-50 border text-slate-900 font-mono rounded-xl px-4 py-3 focus:ring-2 outline-none
          ${hardLocked ? "opacity-60 cursor-not-allowed border-rose-200 focus:ring-rose-200" : "border-slate-200 focus:ring-rose-500"}`}
      />

      <div className="flex gap-2 mt-3">
        <button
          onClick={saveHardLock}
          disabled={hardLocked || savingLock || !lockDirty || !toIsoFromDatetimeLocal(lockDraft)}
          className={`flex-1 py-3 rounded-xl font-bold text-sm ${
            (hardLocked || savingLock || !lockDirty || !toIsoFromDatetimeLocal(lockDraft))
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-rose-500 text-white hover:bg-rose-600"
          }`}
        >
          {hardLocked ? "HARD LOCKED" : (savingLock ? "Saving..." : "Save Hard Lock")}
        </button>

        <button
          onClick={cancelHardLockEdit}
          disabled={hardLocked || !lockDirty}
          className={`flex-1 py-3 rounded-xl font-bold text-sm ${
            (hardLocked || !lockDirty)
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Cancel
        </button>
      </div>

      {!hardLocked && lockDirty && (
        <p className="text-xs text-rose-500 font-bold mt-2">
          Unsaved changes — click “Save Hard Lock”.
        </p>
      )}
    </div>

    <div className="text-center">
      <div className="text-xs font-bold text-slate-400 uppercase">Time Remaining</div>
      <div className="text-3xl font-mono font-black text-slate-900 mt-1">
        {getTimeRemaining(toIsoFromDatetimeLocal(lockDraft) || adminState.lockDate)}
      </div>
    </div>
  </div>
</Card>
    </div>
  );
};

// =====================
// AI HELPERS (Admin)
// Paste above normalizeDeck()
// =====================
const callGeminiAdmin = async (prompt, systemInstruction = "") => {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemInstruction }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();

  return (
    data.result?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "The oracle is silent."
  );
};

const stripFences = (s) =>
  String(s || "")
    .replace(/```json/gi, "```")
    .replace(/```/g, "")
    .trim();

const extractJsonArraySubstring = (s) => {
  const str = String(s || "");
  const a = str.indexOf("[");
  const b = str.lastIndexOf("]");
  if (a !== -1 && b !== -1 && b > a) return str.slice(a, b + 1);
  return null;
};

const safeParseJson = (s) => {
  try { return JSON.parse(s); } catch { return null; }
};

// Accepts AI output in JSON (preferred) or line-list fallback.
// Returns array of 25 objects: { text, category, chaosWeight }
const parseCanonAi = (raw) => {
  const cleaned = stripFences(raw);

  // 1) try direct JSON
  let parsed = safeParseJson(cleaned);

  // 2) try substring [ ... ]
  if (!parsed) {
    const sub = extractJsonArraySubstring(cleaned);
    if (sub) parsed = safeParseJson(sub);
  }

  // If AI returned { tiles: [...] }
  if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.tiles)) {
    parsed = parsed.tiles;
  }

  if (Array.isArray(parsed)) {
    const arr = parsed
      .map((x) => ({
        text: String(x?.text ?? x?.prediction ?? "").trim(),
        category: String(x?.category ?? "General").trim(),
        chaosWeight: typeof x?.chaosWeight === "number"
          ? x.chaosWeight
          : (typeof x?.confidence === "number" ? x.confidence : null),
      }))
      .filter((x) => x.text.length);

    return arr;
  }

  // 3) fallback: parse as lines
  const lines = cleaned
    .split("\n")
    .map((l) => l.replace(/^\s*[\-\*\d\.\)]\s*/g, "").trim())
    .filter(Boolean);

  return lines.map((t) => ({ text: t, category: "General", chaosWeight: null }));
};

const clamp01to100 = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

const buildCanonPrompt = ({ year, chaosPolicy, deck }) => {
  const brand = "Doomgo";
  const multiplier = Number(chaosPolicy?.globalMultiplier ?? 1.0);
  const absurdity = clamp01to100(chaosPolicy?.absurdityBias ?? 50);

  // Build per-slot targets (use deck’s chaosWeight as base)
  const targets = (deck || []).map((t, i) => {
    const base = typeof t?.chaosWeight === "number" ? t.chaosWeight : 50;
    const adjusted = clamp01to100(base * multiplier);
    return { i, adjusted };
  });

  // Make AI respect order and weights
  const targetList = targets
    .map((x) => `${x.i}: ${x.adjusted}`)
    .join(", ");

  return `
You are generating the OFFICIAL ${brand} ${year} Canon board (5x5).
Return ONLY valid JSON (no markdown, no commentary).

Rules:
- Output must be a JSON array of EXACTLY 25 objects in index order 0..24.
- Index 12 MUST be: { "text": "DOOMGO ${year} (CROWN)", "category": "Special", "chaosWeight": 100 }
- Every other index must be a short, punchy prediction (max ~60 chars if possible).
- Keep it fun + viral. No slurs/hate. No instructions for wrongdoing. Avoid graphic violence.
- Categories must be ONE of: ["General","Tech","Politics","Nature","Space","Viral","Special"]
- chaosWeight is 0..100. Higher = more absurd/sci-fi/unhinged.
- Absurdity bias is ${absurdity}%:
    - ~0% means mostly plausible mainstream events.
    - ~100% means mostly absurd/sci-fi/chaotic events.
- Use these chaosWeight targets per index (match as close as possible):
  ${targetList}

Return format example:
[
  {"text":"...", "category":"Tech", "chaosWeight":72},
  ...
  {"text":"DOOMGO ${year} (CROWN)","category":"Special","chaosWeight":100},
  ...
]
`.trim();
};


const normalizeDeck = (deck) => {
  const src = Array.isArray(deck) && deck.length ? deck : INITIAL_CANON_DECK;

  return src.map((t, i) => {
    const id = (t && (t.id ?? t.tileId)) ?? i;

    const text =
      t?.text ??
      (i === 12 ? "DOOMGO 2026 (CROWN)" : `Event ${i + 1}: [Placeholder]`);

    const category = t?.category ?? (i === 12 ? "Special" : "General");

    const w =
      typeof t?.chaosWeight === "number"
        ? t.chaosWeight
        : (typeof t?.confidence === "number" ? t.confidence : (i === 12 ? 100 : 50));

    const weight = clamp01to100(w);

    return {
      id,
      text,
      category,
      chaosWeight: weight,
      confidence: typeof t?.confidence === "number" ? clamp01to100(t.confidence) : weight, // ✅ keep both
      isLocked: typeof t?.isLocked === "boolean" ? t.isLocked : i === 12,
    };
  });
};


/**
 * 2️⃣ CANON DECK VIEW
 */
const CanonDeckView = ({ adminState, setAdminState }) => {
  const [localDeck, setLocalDeck] = useState(() => normalizeDeck(adminState.canonDeck));

  useEffect(() => {
    setLocalDeck(normalizeDeck(adminState.canonDeck));
  }, [adminState.canonDeck]);

  const canonLocked = adminState.status === 'Locked';
  const lockOk = adminState.lockDate && !isNaN(new Date(adminState.lockDate).getTime());
const isCanonHardLocked =
  adminState.status === "Locked" || (lockOk ? new Date() > new Date(adminState.lockDate) : false);


  const [selectedTile, setSelectedTile] = useState(null);
  const [draftTile, setDraftTile] = useState(null);

  // ✅ prevents crash + gives each tile a dot color
  const getChaosColor = (weight) => {
    if (weight <= 20) return 'bg-slate-300';
    if (weight <= 50) return 'bg-[#4D9BFF]';
    if (weight <= 80) return 'bg-[#6A4DFF]';
    return 'bg-[#FF67D2]';
  };

  const handleTileClick = (tile) => {
    if (isCanonHardLocked) return;
    setSelectedTile(tile);
    setDraftTile({ ...tile }); // clone
  };

  const [aiGenLoading, setAiGenLoading] = useState(false);

  const updateDraft = (field, value) => {
    setDraftTile((prev) => ({ ...prev, [field]: value }));
  };

  // ✅ saves ONLY 1 tile (by id) + persists to supabase via setAdminState
  const saveTile = async () => {
    if (!draftTile) return;

const updatedDeck = localDeck.map((tile) =>
  tile.id === draftTile.id
    ? {
        ...tile,
        ...draftTile,
        id: tile.id,
        isLocked: tile.isLocked,
        // ✅ keep client-compatible weight
        confidence:
          typeof draftTile?.confidence === "number"
            ? clamp01to100(draftTile.confidence)
            : clamp01to100(draftTile?.chaosWeight ?? tile.chaosWeight ?? tile.confidence ?? 50),
        chaosWeight: clamp01to100(draftTile?.chaosWeight ?? tile.chaosWeight ?? 50),
      }
    : tile
);


    setLocalDeck(updatedDeck);

   try {
  await setAdminState({
    canonDeck: updatedDeck,
  });
} catch (e) {
  console.error("canon save failed:", e);
  // if you want toast here too, pass showToast into CanonDeckView the same way as AuthorityView
}


    setSelectedTile(null);
    setDraftTile(null);
  };

const generateCanonWithAI = async () => {
  if (aiGenLoading) return;

  setAiGenLoading(true);
  try {
    const year = Number(adminState?.activeYear ?? 2026);
    const chaosPolicy = adminState?.chaosPolicy || { globalMultiplier: 1.0, absurdityBias: 50 };

    // build prompt using your current deck weights + Chaos Logic sliders
    const prompt = buildCanonPrompt({
      year,
      chaosPolicy,
      deck: localDeck,
    });

    const systemInstruction =
      "You generate Doomgo predictions. Do NOT say 'Chaos Cards'. Output only JSON.";

    const raw = await callGeminiAdmin(prompt, systemInstruction);
    const parsed = parseCanonAi(raw);

    // Map parsed -> EXACTLY 25 slots.
    // If AI returns fewer, we fill from existing localDeck.
    const byIndex = new Array(25).fill(null);

    // If AI returned 25 in order, use it directly:
    if (parsed.length >= 25) {
      for (let i = 0; i < 25; i++) byIndex[i] = parsed[i];
    } else {
      // Otherwise: use lines sequentially for non-center tiles
      let p = 0;
      for (let i = 0; i < 25; i++) {
        if (i === 12) continue;
        byIndex[i] = parsed[p] || null;
        p++;
      }
    }

    const multiplier = Number(chaosPolicy?.globalMultiplier ?? 1.0);

    const generatedDeck = localDeck.map((tile, i) => {
      if (tile.isLocked || i === 12) {
        // hard enforce center branding
        if (i === 12) {
          return {
            ...tile,
            text: `DOOMGO ${year} (CROWN)`,
            category: "Special",
            chaosWeight: 100,
            confidence: 100,
          };
        }
        return tile;
      }

      const base = typeof tile.chaosWeight === "number" ? tile.chaosWeight : 50;
      const adjustedWeight = clamp01to100(base * multiplier);

      const ai = byIndex[i];
      const text = String(ai?.text || "").trim() || tile.text;
      const category = String(ai?.category || tile.category || "General").trim();

      return {
        ...tile,
        text,
        category,
        chaosWeight: adjustedWeight,
        confidence: adjustedWeight, // ✅ client uses this
      };
    });

    setLocalDeck(generatedDeck);

    await setAdminState({
      canonDeck: generatedDeck,
    });
  } catch (e) {
    console.error("Generate canon AI failed:", e);
  } finally {
    setAiGenLoading(false);
  }
};


  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Grid size={20} className="text-[#6A4DFF]" /> Canon Grid (5x5)
        </h2>

        <div className="flex items-center gap-3">
<button
  onClick={generateCanonWithAI}
  disabled={isCanonHardLocked || aiGenLoading}
  className={`px-4 py-2 rounded-xl font-bold text-xs ${
    (isCanonHardLocked || aiGenLoading)
      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
      : 'bg-[#FF67D2] text-white hover:bg-[#ff4fc5]'
  }`}
>
  {aiGenLoading ? "Generating…" : "Generate Canon with AI"}
</button>


          {canonLocked ? <Badge type="danger">LOCKED</Badge> : <Badge type="success">EDITABLE</Badge>}
          <span className="text-xs text-slate-400 font-mono">ID: DG-CANON-2026-V1</span>
        </div>
      </div>

      {/* Grid + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 relative min-h-[520px] shadow-sm">
            {canonLocked && (
              <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center backdrop-blur-sm rounded-3xl border border-rose-100">
                <div className="text-center">
                  <Lock size={48} className="mx-auto text-rose-500 mb-4" />
                  <h3 className="text-2xl font-black text-slate-900">CANON LOCKED</h3>
                  <p className="text-slate-500 text-sm mt-2">The Doomgo timeline is sealed.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-5 gap-3 w-full max-w-2xl aspect-square mx-auto">
              {localDeck.map((tile) => (
                <div
                  key={tile.id}
                  onClick={() => handleTileClick(tile)}
                  className={`relative rounded-2xl border p-2 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.03]
                    ${
                      selectedTile?.id === tile.id
                        ? 'border-[#6A4DFF] ring-2 ring-[#6A4DFF]/20 shadow-xl z-10'
                        : 'border-slate-100 hover:border-[#4D9BFF] hover:shadow-md'
                    }
                    ${
                      tile.id === 12
                        ? 'bg-gradient-to-br from-[#FF67D2]/10 to-[#6A4DFF]/10'
                        : 'bg-white'
                    }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-slate-400 font-mono">#{tile.id + 1}</span>
                    <div className={`w-2 h-2 rounded-full ${getChaosColor(tile.chaosWeight)}`} />
                  </div>

                  <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-3 text-center">
                    {tile.text}
                  </p>

                  {tile.id === 12 && (
                    <Crown size={12} className="absolute top-1 right-1 text-yellow-500" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col min-h-[520px] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Tile Properties</h3>
          </div>

          {selectedTile ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Event Text</label>
                <textarea
                  value={draftTile?.text || ''}
                  onChange={(e) => updateDraft('text', e.target.value)}
                  disabled={selectedTile.isLocked || canonLocked}
                  className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 text-sm focus:ring-2 focus:ring-[#6A4DFF] outline-none resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Chaos Weight (0-100)</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={draftTile?.chaosWeight ?? 0}
                    onChange={(e) => updateDraft('chaosWeight', parseInt(e.target.value))}
                    disabled={selectedTile.isLocked || canonLocked}
                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#6A4DFF]"
                  />
                  <span className="text-xl font-black w-12 text-right text-slate-900">
                    {draftTile?.chaosWeight ?? 0}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Category</label>
                <select
                  value={draftTile?.category || 'General'}
                  onChange={(e) => updateDraft('category', e.target.value)}
                  disabled={selectedTile.isLocked || canonLocked}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:ring-2 focus:ring-[#6A4DFF] outline-none font-bold"
                >
                  <option>General</option>
                  <option>Tech</option>
                  <option>Politics</option>
                  <option>Nature</option>
                  <option>Space</option>
                  <option>Viral</option>
                  <option>Special</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveTile}
                  disabled={isCanonHardLocked}
                  className={`flex-1 font-bold py-2 rounded-xl ${
                    isCanonHardLocked ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-[#6A4DFF] text-white'
                  }`}
                >
                  Save Tile
                </button>

                <button
                  onClick={() => {
                    setDraftTile(null);
                    setSelectedTile(null);
                  }}
                  className="flex-1 bg-slate-100 text-slate-600 font-bold py-2 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <Grid size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a tile from the grid to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


/**
 * 3️⃣ CHAOS & PROBABILITY LOGIC (PERSISTED)
 * Saves to adminState.data.chaosPolicy
 */
const ChaosLogicView = ({ draftAdmin, setDraftAdmin, setDirty, saveChaosDraft, savingGlobal }) => {
  const defaults = { globalMultiplier: 1.0, absurdityBias: 50 };
  const cp = draftAdmin?.chaosPolicy || defaults;

  const setMultiplier = (v) => {
    setDirty(true);
    setDraftAdmin((s) => ({
      ...(s || {}),
      chaosPolicy: { ...(s?.chaosPolicy || defaults), globalMultiplier: Number(v) },
    }));
  };

  const setBias = (v) => {
    setDirty(true);
    setDraftAdmin((s) => ({
      ...(s || {}),
      chaosPolicy: { ...(s?.chaosPolicy || defaults), absurdityBias: Number(v) },
    }));
  };

  const resetChaosPolicy = () => {
    setDirty(true);
    setDraftAdmin((s) => ({
      ...(s || {}),
      chaosPolicy: defaults,
    }));
  };

  const mult = Number(cp.globalMultiplier ?? 1.0);
  const bias = Number(cp.absurdityBias ?? 50);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card title={<><Activity size={20} className="text-[#FF67D2]"/> Global Probability Modifiers</>}>
        <div className="space-y-8 py-4">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">Global Chaos Multiplier</label>
              <span className="text-[#FF67D2] font-mono font-black">{mult.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={mult}
              onChange={(e) => setMultiplier(e.target.value)}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#FF67D2]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Multiplies Chaos/Yearly tile confidence + instructs AI to be weirder.
            </p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-bold text-slate-700">Absurdity Bias</label>
              <span className="text-[#6A4DFF] font-mono font-black">{bias}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={bias}
              onChange={(e) => setBias(e.target.value)}
              className="w-full h-3 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#6A4DFF]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Tells AI what % of events should be absurd/sci-fi vs plausible.
            </p>
          </div>

          {/* ✅ SAVE ROW */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={saveChaosDraft}
              disabled={savingGlobal}
              className={`flex-1 text-white font-bold py-3 rounded-xl ${
                savingGlobal ? "bg-slate-300 cursor-not-allowed" : "bg-[#FF67D2] hover:bg-[#ff4fc5]"
              }`}
            >
              {savingGlobal ? "Saving…" : "Save Chaos Logic"}
            </button>
            <button
              onClick={resetChaosPolicy}
              className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
            >
              Reset
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Saved to: <span className="font-mono">doomgo_admin_state.data.chaosPolicy</span>
          </p>
        </div>
      </Card>

      <Card title={<><Terminal size={20} className="text-slate-600"/> Simulation Preview</>}>
        <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 h-64 overflow-y-auto">
          <p className="text-[#6A4DFF]">$ init_simulation --multiplier={mult.toFixed(1)} --bias={bias}</p>
          <p className="mt-2 text-slate-500">... Loading Probability Matrix ...</p>
          <p className="mt-2">Event: "Aliens Land"</p>
          <p className="ml-4 text-slate-400">Base Weight: 85</p>
          <p className="ml-4 text-[#FF67D2]">Adjusted Weight: {Math.min(100, Math.floor(85 * mult))}</p>
          <p className="mt-2">Event: "Coffee Extinct"</p>
          <p className="ml-4 text-slate-400">Base Weight: 40</p>
          <p className="ml-4 text-[#FF67D2]">Adjusted Weight: {Math.min(100, Math.floor(40 * mult))}</p>
          <div className="mt-4 border-t border-slate-700 pt-2">
            <span className="text-emerald-400">STATUS: READY TO DEPLOY</span>
          </div>
        </div>
      </Card>
    </div>
  );
};



/**
 * 4️⃣ AI GOVERNANCE
 */
const AIGovernanceView = ({ adminState, setAdminState }) => {
  const aiPolicy = adminState.aiPolicy ?? {
    enabled: true,
    beta: false,
    monthlyCredits: 5,
  };

  const updatePolicy = async (patch) => {
   await setAdminState({
     aiPolicy: { ...aiPolicy, ...patch },
   });
 };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Global AI Controls">
        <Toggle
          label="Enable AI Generation Globally"
          enabled={aiPolicy.enabled}
          onChange={(value) => updatePolicy({ enabled: value })}
        />

        <Toggle
          label="Beta Model (Unstable / Creative)"
          enabled={aiPolicy.beta}
          onChange={(value) => updatePolicy({ beta: value })}
          danger
        />
      </Card>

      <Card title="Credit Policy Control">
        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
          Monthly Free Credits
        </label>
        <input
          type="number"
          value={aiPolicy.monthlyCredits}
          onChange={(e) =>
            updatePolicy({ monthlyCredits: Number(e.target.value) })
          }
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold"
        />
      </Card>
    </div>
  );
};


/**
 * 5️⃣ MESSAGING & TRUST
 */
const MessagingView = ({ adminState, setAdminState }) => {
  const defaults = {
  globalMessage: '',
  announcementId: null,
  updatedAt: null,

  preLockWarning: 'Are you sure? Once locked, your predictions for 2026 are set in stone. No take-backs.',
  postJan1EditAttempt: 'Nice try. The timeline is sealed. See you in 2027.',
  globalDisclaimer: 'Doomgo is a game. We do not actually control the weather (yet).',
  showDisclaimerOnLoad: true,

  betaNotice: 'This is an early beta build — expect occasional bugs. DM @Lou.IsDoomgo 🙂',
  lockConfirmationText: 'Locked. Your predictions for 2026 are set in stone.', // add here too
};


  const [local, setLocal] = useState({
    ...defaults,
    ...(adminState.messaging || {}),
  });
const [dirty, setDirty] = useState(false);

  useEffect(() => {
    // Only pull from server if user isn't mid-edit
    if (!dirty) {
      setLocal({ ...defaults, ...(adminState.messaging || {}) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminState.messaging]);
   const setField = (patch) => {
    setDirty(true);
    setLocal((prev) => ({ ...prev, ...patch }));
  };

  const saveAll = async () => {
    await setAdminState({
      messaging: local,
    });
    setDirty(false); // ✅ allow future re-hydrates
  };

  const sendAnnouncement = async () => {
  const msg = (local.globalMessage || "").trim();
  if (!msg.length) return;

  try {
    setDirty(true);

    // 1) Create announcement row (THIS is what you were missing)
    const { data: ann, error: annErr } = await supabase
      .from('doomgo_announcements')
      .insert({ message: msg, active: true })
      .select('id, created_at')
      .single();

    if (annErr) throw annErr;

    // 2) Stamp adminState.messaging with the announcement id (so clients can detect "new")
    const next = {
      ...local,
      announcementId: ann.id,               // ✅ real uuid id
      updatedAt: ann.created_at || new Date().toISOString(),
    };

    setLocal(next);

    // 3) Persist into doomgo_admin_state
    await setAdminState({
      messaging: next,
    });

    // Optional: clear the textbox after sending
    // setLocal(prev => ({ ...prev, globalMessage: '' }));

  } catch (e) {
    console.error('sendAnnouncement failed:', e);
  } finally {
    setDirty(false);
  }
};


  return (
    <div className="space-y-6">
      <Card title="Global User Message">
        <textarea
          value={local.globalMessage}
          onChange={(e) => setField({ globalMessage: e.target.value })}
          className="w-full h-32 bg-slate-50 border rounded-xl p-3"
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={<><Lock size={20} className="text-slate-600"/> Lock Confirmation Text</>}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Pre-Lock Warning</label>
              <textarea
                value={local.preLockWarning}
                onChange={(e) => setLocal({ ...local, preLockWarning: e.target.value })}
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-[#6A4DFF] outline-none resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Post-Jan 1 Edit Attempt</label>
              <textarea
                value={local.postJan1EditAttempt}
                onChange={(e) => setLocal({ ...local, postJan1EditAttempt: e.target.value })}
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-[#6A4DFF] outline-none resize-none"
              />
            </div>
          </div>
        </Card>

        <Card title={<><AlertOctagon size={20} className="text-amber-500"/> Beta Notices</>}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Global Disclaimer</label>
              <textarea
                value={local.globalDisclaimer}
                onChange={(e) => setLocal({ ...local, globalDisclaimer: e.target.value })}
                className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:ring-2 focus:ring-[#6A4DFF] outline-none resize-none"
              />
            </div>

            <Toggle
              label="Show Disclaimer on Load"
              enabled={!!local.showDisclaimerOnLoad}
              onChange={(v) => setLocal({ ...local, showDisclaimerOnLoad: v })}
            />
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        <button onClick={saveAll} className="bg-[#6A4DFF] text-white px-4 py-2 rounded-xl font-bold">
          Save Messaging Settings
        </button>

        <button onClick={sendAnnouncement} className="bg-[#FF67D2] text-white px-4 py-2 rounded-xl font-bold">
          Send Announcement
        </button>
</div>

    </div>
  );
};



/**
 * 8️⃣ SAFETY & EMERGENCY
 */
const SafetyView = ({ adminState, emergencyFreeze, unfreezeSystem }) => (
  <Card
    title={<><AlertTriangle size={20} className="text-rose-500"/> Emergency Controls</>}
    className="border-rose-100"
  >
    <div className="space-y-6">
      <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-between">
        <div>
          <h4 className="text-rose-600 font-bold">Emergency Freeze All</h4>
          <p className="text-rose-500 text-xs">
            Instantly locks all boards and prevents new creations.
          </p>
        </div>

        {adminState?.status === "Locked" ? (
          <button
            onClick={unfreezeSystem}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-4 rounded-lg"
          >
            UNFREEZE
          </button>
        ) : (
          <button
            onClick={emergencyFreeze}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-rose-200"
          >
            ACTIVATE
          </button>
        )}
      </div>
    </div>
  </Card>
);


/**
 * MAIN LAYOUT & NAVIGATION
 */
const Sidebar = ({ active, setView, mobileOpen, setMobileOpen }) => {
  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'authority', label: 'Authority', icon: Globe },
    { id: 'canon', label: 'Canon Deck', icon: Grid },
    { id: 'chaos', label: 'Chaos Logic', icon: Activity },
    { id: 'ai', label: 'AI Gov', icon: Cpu },
    { id: 'messaging', label: 'Messaging', icon: MessageSquare },
    { id: 'safety', label: 'Safety', icon: Shield },
  ];

  return (
    <>
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 transform ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="h-20 flex items-center px-6 border-b border-slate-50">
          <div className="flex items-center gap-3">
            <img
  src={doomgoLogo}
  alt="Doomgo"
  className="w-8 h-8 rounded-lg object-cover"
/>

            <div>
              <h1 className="text-slate-900 font-black text-lg tracking-tight leading-none">DOOMGO</h1>
              <span className="text-[10px] text-[#FF67D2] font-bold uppercase tracking-widest">Admin</span>
            </div>
          </div>
        </div>
        <div className="p-4 space-y-1 overflow-y-auto">
          <div className="px-2 mb-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Control Room</div>
          {items.map(item => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                active === item.id 
                  ? 'bg-[#6A4DFF]/10 text-[#6A4DFF]' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-auto p-4 border-t border-slate-50">
          <div className="flex items-center gap-3 text-slate-400 text-xs font-mono">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
            SYSTEM ONLINE
          </div>
        </div>
      </div>
    </>
  );
};

export default function DoomgoAdmin() {
  const [adminState, setAdminState] = useState(null);
const [draftAdmin, setDraftAdmin] = useState(null);     // what the UI edits
const [dirty, setDirty] = useState(false);
const dirtyRef = useRef(false);
const [savingGlobal, setSavingGlobal] = useState(false);
  const [view, setView] = useState('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState(null);
useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  // (Optional but prevents crashes if referenced elsewhere)
  const [aiPolicy, setAiPolicy] = useState(null);
  const [aiCredits, setAiCredits] = useState(0);


  // PATCH-BASED SAVE (prevents canonDeck "false changes" + respects hard lock)
const patchAdminState = async (patch) => {
  // optimistic UI merge (top-level)
  setAdminState((prev) => ({ ...(prev || {}), ...(patch || {}) }));

  const { data, error } = await supabase.rpc("doomgo_admin_patch", { patch });

  if (error) {
    console.error("patchAdminState failed:", error);

    // optional: reload server truth so UI doesn't drift
    const { data: fresh } = await supabase
      .from("doomgo_admin_state")
      .select("data")
      .eq("id", "global")
      .single();

    if (fresh?.data) setAdminState(fresh.data);

    throw error;
  }

  // server returns the full merged admin state
  setAdminState(data);
  return data;
};

// keep the same prop name your views already use
const persistAdminState = patchAdminState;

// ✅ Save ONLY the chaos knobs (safe; won’t touch canonDeck)
const saveChaosDraft = async () => {
  if (!draftAdmin?.chaosPolicy) return;

  setSavingGlobal(true);
  try {
    const next = await persistAdminState({
      chaosPolicy: {
        globalMultiplier: Number(draftAdmin.chaosPolicy.globalMultiplier ?? 1.0),
        absurdityBias: Number(draftAdmin.chaosPolicy.absurdityBias ?? 50),
      },
    });

    // keep draft aligned to server truth after save
    setDraftAdmin(next);
    setDirty(false);
  } catch (e) {
    console.error("saveChaosDraft failed:", e);
  } finally {
    setSavingGlobal(false);
  }
};

// 🔥 Debounce autosave when chaos knobs change
useEffect(() => {
  if (!dirty) return;
  // optional: only autosave while you’re on the chaos view
  if (view !== "chaos") return;

  const t = setTimeout(() => {
    saveChaosDraft();
  }, 700);

  return () => clearTimeout(t);
}, [
  dirty,
  view,
  draftAdmin?.chaosPolicy?.absurdityBias,
  draftAdmin?.chaosPolicy?.globalMultiplier,
]);



const [session, setSession] = useState(null);
const [isAdmin, setIsAdmin] = useState(false);
const [authLoading, setAuthLoading] = useState(true);


const emergencyFreeze = async () => {
  const updated = {
    ...adminState,
    status: "Locked",
    canonMode: true,
    emergencyFreezeAt: new Date().toISOString(),
  };
await persistAdminState({
   status: "Locked",
   canonMode: true,
   emergencyFreezeAt: new Date().toISOString(),
 });
};

const unfreezeSystem = async () => {
  const updated = {
    ...adminState,
    status: "Open", // or "Draft" — choose your normal unlocked state
  };
  await persistAdminState({ status: "Open" });
};

  // ✅ GLOBAL ADMIN STATE (SOURCE OF TRUTH)
const [loading, setLoading] = useState(true);
useEffect(() => {
  let alive = true;

  const boot = async () => {
    const { data } = await supabase.auth.getSession();
    if (!alive) return;

    setSession(data.session || null);

    if (!data.session?.user?.id) {
      setIsAdmin(false);
      setAuthLoading(false);
      return;
    }

    // --- DEBUG: always log the uid so you SEE it ---
console.log("SIGNED IN UID:", data.session.user.id);

// --- allowlist check via RPC (more reliable than direct table select) ---
const { data: isAllowed, error: allowErr } = await supabase.rpc("doomgo_is_admin");

if (allowErr) {
  console.error("Admin allowlist RPC failed:", allowErr);
  setIsAdmin(false);
} else {
  setIsAdmin(!!isAllowed);
}


    setAuthLoading(false);
  };

  boot();

  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession);
    setAuthLoading(false);
  });

  return () => {
    alive = false;
    sub?.subscription?.unsubscribe?.();
  };
}, []);

useEffect(() => {
    // ✅ NEW: only load admin data if authorized
  if (!session || !isAdmin) return;
  let alive = true;

  const loadAdminState = async () => {
    const { data, error } = await supabase
      .from('doomgo_admin_state')
      .select('data')
      .eq('id', 'global')
      .single();

    if (!alive) return;

   if (error) {
  console.error('Failed to load admin state', error);
  setLoading(false);
  return;
}

if (data?.data) {
  setAdminState(data.data);

  // ✅ only overwrite the draft if the user is NOT currently editing
  setDraftAdmin((prev) => (dirtyRef.current && prev ? prev : data.data));
  if (!dirtyRef.current) setDirty(false);

  if (data.data.aiPolicy) {
    setAiPolicy(data.data.aiPolicy);
    setAiCredits(data.data.aiPolicy.monthlyCredits);
  }
}

    setLoading(false);
  };

  // 🔥 initial load
  loadAdminState();

  // 🔁 poll every 5 seconds for admin changes (freeze / unfreeze)
  const interval = setInterval(() => {
    if (view === 'messaging') return; // ✅ don’t clobber form state
    loadAdminState();
  }, 5000);
  return () => {
    alive = false;
    clearInterval(interval);
  };
}, [view, session, isAdmin]);


  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  if (authLoading) {
  return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">Checking access…</div>;
}

if (!session) {
  return <AdminLogin onAuthed={() => window.location.reload()} />;
}

if (!isAdmin) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-600 font-bold p-6">
      <div className="text-center">
        <div className="text-xl text-slate-900 font-black">Not authorized</div>
        <div className="text-sm text-slate-500 font-medium mt-1">
          You’re signed in, but this account isn’t on the admin allowlist.
        </div>
      </div>
<div className="mt-3 text-xs font-mono text-slate-400">
  UID: {session?.user?.id}
</div>

      <div className="flex gap-2">
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 font-bold"
        >
          Sign out
        </button>

        <button
          onClick={() => window.location.reload()}
          className="bg-[#6A4DFF] text-white rounded-xl px-4 py-2 font-bold"
        >
          Retry
        </button>
      </div>
    </div>
  );
}


if (loading || !adminState) {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">
      Loading Doomgo Admin…
    </div>
  );
}

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans lg:pl-64 transition-all duration-300">
      <Sidebar active={view} setView={setView} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <main className="p-4 md:p-8 max-w-7xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-2 capitalize">{view.replace('-', ' ')}</h2>
            <p className="text-slate-500 font-medium">Control Room • Edition 2026</p>
          </div>

            {/* ✅ NEW: right-side actions */}
  <div className="flex items-center gap-2">
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        window.location.reload();
      }}
      className="hidden lg:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 text-slate-700 font-bold"
    >
      <LogOut size={16} /> Logout
    </button>
          <button 
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 bg-white rounded-xl border border-slate-200"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={24} />
          </button>
          </div>
        </header>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {view === 'dashboard' && <DashboardView showToast={showToast} />}

{view === 'authority' && (
  <AuthorityView
    adminState={adminState}
    setAdminState={persistAdminState}
    goToCanon={() => setView('canon')}
    showToast={showToast}
  />
)}


{view === 'canon' && (
  <CanonDeckView
    adminState={adminState}
    setAdminState={persistAdminState}
  />
)}


{view === 'chaos' && (
  <ChaosLogicView
    draftAdmin={draftAdmin || adminState}
    setDraftAdmin={setDraftAdmin}
    setDirty={setDirty}
    saveChaosDraft={saveChaosDraft}
    savingGlobal={savingGlobal}
  />
)}


{view === 'ai' && (
  <AIGovernanceView
    adminState={adminState}
    setAdminState={persistAdminState}
  />
)}



{view === 'messaging' && (
   <MessagingView
     adminState={adminState}
     setAdminState={persistAdminState}
   />
 )}

{view === 'safety' && (
  <SafetyView
    adminState={adminState}
    emergencyFreeze={emergencyFreeze}
    unfreezeSystem={unfreezeSystem}
  />
)}


        </div>
      </main>
      
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}