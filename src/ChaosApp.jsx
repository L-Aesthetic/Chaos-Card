import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { startCheckout } from './lib/billing';
import AdSlot from "./components/AdSlot";
import { canShowAd, markAdShown } from "./lib/adCap";
import * as htmlToImage from 'html-to-image';
import { 
  Home, Plus, User, Settings,  
  Check, Share2, Sparkles, Zap, 
  Crown, Edit3, Calendar, Heart, 
  X, Shuffle, Loader2, ArrowRight, 
  Flame, Skull, Trash2, Wand2, Newspaper, 
  RotateCcw, Save, Play, Globe, Activity, Copy,
  Upload, Lock, Unlock, RefreshCw, History, AlertTriangle
} from 'lucide-react';

/**
 * DOOMGO - GOLD MASTER (COMPILATION FIXED)
 * * Features:
 * - 🚫 Fixed Reference Errors.
 * - ⚡ Quick Refresh works reliably.
 * - 🧠 Oracle remembers predictions.
 * - 💾 Restore 2026 works by strictly separating Core vs Active state.
 * - ⌨️ Fixed input focus loss on Profile Edit.
 */

// --- UTILS ---

const pcmToWav = (base64PCM, sampleRate = 24000) => {
  try {
    const binaryString = atob(base64PCM);
    const len = binaryString.length;
    const buffer = new ArrayBuffer(len);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < len; i++) {
      view[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(buffer);
    const wavBuffer = new ArrayBuffer(44 + pcmData.length * 2);
    const viewWav = new DataView(wavBuffer);
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    writeString(viewWav, 0, 'RIFF');
    viewWav.setUint32(4, 36 + pcmData.length * 2, true);
    writeString(viewWav, 8, 'WAVE');
    writeString(viewWav, 12, 'fmt ');
    viewWav.setUint32(16, 16, true);
    viewWav.setUint16(20, 1, true); 
    viewWav.setUint16(22, 1, true); 
    viewWav.setUint32(24, sampleRate, true);
    viewWav.setUint32(28, sampleRate * 2, true);
    viewWav.setUint16(32, 2, true);
    viewWav.setUint16(34, 16, true);
    writeString(viewWav, 36, 'data');
    viewWav.setUint32(40, pcmData.length * 2, true);
    const pcmView = new Int16Array(wavBuffer, 44);
    pcmView.set(pcmData);
    const blob = new Blob([viewWav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Audio conversion failed", e);
    return null;
  }
};

const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};
// Put this helper RIGHT ABOVE enforceFreeCenter
const isCenterToken = (text) => {
  const norm = String(text || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")   // convert punctuation → space
    .replace(/\s+/g, " ")          // collapse whitespace
    .trim();

  // Handles:
  // "FREE SPACE"
  // "DOOMGO: 2026"
  // "DOOMGO 2026 (CROWN)"
  // "DOOMGO 2026 CROWN"
  const isFree = norm === "FREE SPACE";
  const isDoomgo = norm === "DOOMGO 2026" || norm === "DOOMGO 2026 CROWN" || (norm.startsWith("DOOMGO 2026") && norm.includes("CROWN"));

  return isFree || isDoomgo;
};


// ✅ REPLACE enforceFreeCenter with this
const enforceFreeCenter = (data) => {
  const arr = Array.isArray(data) ? data : [];

  const norm = (t) =>
    String(t || "")
      .toUpperCase()
      .replace(/[^A-Z0-9 ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const crownIdx = arr.findIndex(
    (item) => norm(item?.text).includes("DOOMGO 2026") && norm(item?.text).includes("CROWN")
  );
  const freeIdx = arr.findIndex((item) => norm(item?.text) === "FREE SPACE");

  const centerIdx = crownIdx >= 0 ? crownIdx : freeIdx;
  const centerCandidate = centerIdx >= 0 ? arr[centerIdx] : null;

  // ✅ Remove *all* center-token tiles from the non-center pool (prevents duplicate FREE SPACE / CROWN elsewhere)
  const withoutCenterTokens = arr.filter((item, i) => {
    if (i === centerIdx) return false;
    return !isCenterToken(item?.text);
  });

  // Keep exactly 24 non-center tiles
  const trimmed = withoutCenterTokens.slice(0, 24);

  const centerTile = {
    text: centerCandidate?.text || "FREE SPACE",
    category: centerCandidate?.category || "Special",
    confidence: 100,
    oracleText: null,
    hit: true,
    locked: true,
  };

  const result = [...trimmed.slice(0, 12), centerTile, ...trimmed.slice(12)];

  return result.map((item, i) => ({
    ...item,
    id: i,
    hit: i === 12 ? true : !!item.hit,
    locked: i === 12 ? true : !!item.locked,
    confidence: i === 12 ? 100 : Number(item.confidence) || 50,
  }));
};


const normalizeBoard = (rawBoard) => {
  if (!Array.isArray(rawBoard)) return rawBoard;

  return enforceFreeCenter(
    rawBoard.slice(0, 25).map((item, i) => ({
      id: i,
      text: item.text,
      category: item.category || "General",
      confidence: Number(item.confidence) || 50,
      oracleText: item.oracleText || null,
    }))
  );
};
const mergeUserProgress = (freshBoard, prevBoard) => {
  if (!Array.isArray(freshBoard) || freshBoard.length !== 25) return freshBoard;

  const prev = Array.isArray(prevBoard) && prevBoard.length === 25 ? prevBoard : null;

  return freshBoard.map((sq, i) => ({
    ...sq,
    // keep FREE SPACE always hit
    hit: i === 12 ? true : !!prev?.[i]?.hit,
    // keep any oracle text the user already generated (optional but nice)
    oracleText: prev?.[i]?.oracleText ?? sq.oracleText ?? null,
  }));
};





// --- ANALYTICS / PRESENCE (ANON) ---

const getDeviceId = () => {
  const key = "doomgo_device_id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = (crypto?.randomUUID?.() || `dg_${Math.random().toString(36).slice(2)}_${Date.now()}`);
    localStorage.setItem(key, id);
  }
  return id;
};

const getRegionGuess = () => {
  // lightweight, non-invasive
  const lang = navigator.language || "en-US";
  // tries to infer country-ish from locale like en-US
  const parts = lang.split("-");
  return parts[1] || "Unknown";
};



// FALLBACK DECKS
const MOCK_DECKS = {
    daily: ["Spilled Coffee", "Forgot Password", "Zoom Glitch", "Missed Bus", "Rain/No Umbrella", "Phone Died", "Stubbed Toe", "Sent Wrong Text", "Free Donut", "Found $5", "Complimented", "Good Hair Day", "FREE SPACE", "Hit Green Lights", "Package Arrived", "Meme Viral", "Dog Saw Me", "Cat Purred", "Pizza Night", "Found Keys", "Woke up Early", "Gym PR", "Book Finished", "New Song Obsession", "Nice Sunset"],
    weekly: ["Finished a Book", "Cooked a Meal", "Called Mom", "Zero Inbox", "Went for a Run", "Saw a Movie", "No Social Media Day", "Met a Friend", "Cleaned House", "Watered Plants", "Slept 8hrs", "Tried New Food", "FREE SPACE", "Rainy Day", "Sunny Day", "Traffic Jam", "Forgot Wallet", "Bought a Treat", "Wrote in Journal", "Took a Photo", "Heard Fav Song", "Pet a Dog", "Did Laundry", "Paid Bills", "Woke up Happy"],
    monthly: ["Pay Raise", "New Project", "Office Drama", "Birthday Party", "Unexpected Bill", "New Neighbor", "Internet Outage", "Fav Show Cancelled", "Viral Trend", "Local News Event", "Weather Freakout", "Politician Scandal", "FREE SPACE", "New Cafe Opens", "Friend Visits", "Lost Wallet", "Found Wallet", "Car Trouble", "Good Date", "Bad Date", "New Hobby", "Movie Premiere", "Concert Ticket", "Sale Shopping", "Tech Upgrade"],
    chaos: ["Aliens Land", "AI President", "Ocean Evaporates", "Gravity Glitch", "Dinosaurs Return", "Telepathy Real", "Moon Turns Pink", "Time Travel", "Robot Uprising", "Cats Talk", "Plants Walk", "Money worthless", "FREE SPACE", "Mars Colony", "Flying Cities", "Immortality Pill", "Global Teleport", "Dream Recorder", "Weather Control", "New Color Found", "Ghost Confirmed", "Dragon Sighted", "Magic Real", "Atlantis Rises", "Simulation Glitch"]
};

const MOCK_ROASTS = [
    "You're playing it safe. 2026 is leaving you behind while you wait for a sign.",
    "A respectable amount of doom, but I expected more from you. Step it up.",
    "Is this a Bingo card or a to-do list? You need more disasters.",
    "You're surviving 2026, but are you really *living* it? Try harder.",
    "Wow, look at you avoiding all the interesting events. Boring!"
];

// API Handler – now uses Netlify function
const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch("/.netlify/functions/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, systemInstruction }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return (
      data.result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "The oracle is silent."
    );
  } catch (error) {
    console.warn("Gemini API Error:", error);
    throw error;
  }
};

const deviceVibrate = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

// --- UI COMPONENTS ---

const SoftCard = ({ children, className = "", onClick, noPadding = false }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-[32px] shadow-xl shadow-blue-100/50 border border-white/60 relative overflow-hidden transition-all duration-300 active:scale-[0.98] ${noPadding ? '' : 'p-6'} ${className}`}
  >
    {children}
  </div>
);



const GeometricShape = ({ type, className }) => {
  if (type === 'cube') {
    return (
      <div className={`absolute w-32 h-32 opacity-90 pointer-events-none ${className}`}>
        <div className="w-full h-full bg-gradient-to-tr from-blue-500 to-cyan-300 rounded-3xl shadow-2xl transform rotate-12 skew-x-12 mix-blend-overlay"></div>
      </div>
    );
  }
  if (type === 'sphere') {
    return (
      <div className={`absolute w-40 h-40 rounded-full bg-gradient-to-br from-purple-400 to-pink-300 shadow-2xl shadow-purple-500/30 pointer-events-none blur-2xl ${className}`}></div>
    );
  }
  if (type === 'pyramid') {
     return (
       <div className={`absolute w-0 h-0 border-l-[40px] border-r-[40px] border-b-[60px] border-l-transparent border-r-transparent border-b-amber-400 opacity-80 drop-shadow-xl pointer-events-none ${className}`}></div>
     )
  }
  return null;
};

const Toggle = ({ checked, onChange }) => (
    <div 
        onClick={(e) => {
    e.stopPropagation();
    onChange(!checked);
  }}
        className={`w-12 h-7 rounded-full flex items-center px-1 cursor-pointer transition-colors ${checked ? 'bg-[#1A1E2C]' : 'bg-gray-300'}`}
    >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform transform ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
);

// --- DATA ---

// ✅ BRAND / CONTACT (single source of truth)
const BRAND = {
  appName: "Doomgo",
  url: "https://doomgo.world",
  socials: {
    tiktok: "@doomgoapp",
    instagram: "@doomgo_social",
    threads: "@doomgo_social",
  },
  email: "doomgo2026@gmail.com",
};

const BRAND_LINKS = {
  site: BRAND.url,
  tiktok: `https://www.tiktok.com/${String(BRAND.socials.tiktok || "").replace("@","")}`,
  instagram: `https://www.instagram.com/${String(BRAND.socials.instagram || "").replace("@","")}`,
  threads: `https://www.threads.net/${String(BRAND.socials.threads || "").replace("@","")}`,
  email: `mailto:${BRAND.email}`,
};

const INITIAL_PREDICTIONS = [
  "Celebrity runs for President", "AI writes a hit song", "Aliens confirmed", "New Ocean discovered", "Flying cars prototype",
  "Social app shuts down", "Billionaire cage fight", "Volcano eruption", "Crypto crash", "Viral dance craze",
  "Global internet outage", "Time travel proven", "DOOMGO: 2026", "Oasis Reunion Tour", "Mars colony started",
  "Robot butler released", "New Harry Potter", "Weather control tests", "VR Headset mainstream", "Legendary band retires",
  "Royal Wedding", "Car co. bankrupt", "Underground city found", "Telepathy implant", "Glacier melts"
];

const INITIAL_BOARD = INITIAL_PREDICTIONS.map((text, i) => ({
  id: i,
  text,
  category: "General",
  hit: i === 12,
  confidence: i === 12 
    ? 100 
    : Math.floor(Math.random() * 100) + 1, // 1–100 for non-center tiles
  locked: i === 12,
  oracleText: null,
}));


// --- MAIN APP ---

export default function BingoApp() {
  const [currentScreen, setCurrentScreen] = useState('onboarding');
  const [activeTab, setActiveTab] = useState('home');
  const [mode, setMode] = useState('play'); // 'play' vs 'edit'
  const [adminState, setAdminState] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [aiPolicy, setAiPolicy] = useState({
  enabled: true,
  monthlyCredits: 5,
});
const [chaosPolicy, setChaosPolicy] = useState({
  globalMultiplier: 1.0,
  absurdityBias: 50,
});

// --- FEEDBACK (DISABLED FOR NOW) ---
const vibrate = () => {};   // keeps your existing vibrate(...) calls from crashing
const feedback = () => {};  // keeps your existing feedback(...) calls from crashing

const copyToClipboard = async (text) => {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    openConfirm("Copied ✅", null);
  } catch {
    // fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    openConfirm("Copied ✅", null);
  }
};


  const [loading, setLoading] = useState(true); // ✅ ADD THIS
  const [isEditingProfile, setIsEditingProfile] = useState(false);

 // --- STATE PERSISTENCE ---

// 📌 Pinned Decks (one per type)
const [pinnedDecks, setPinnedDecks] = useState(() => {
  try {
    return JSON.parse(localStorage.getItem("bingo_pinned_decks")) || {};
  } catch {
    return {};
  }
});
const [announcement, setAnnouncement] = useState(null);
const [dismissedAnnouncementId, setDismissedAnnouncementId] = useState(() => {
  return localStorage.getItem("doomgo_dismissed_announcement_id") || null;
});

  const [userProfile, setUserProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bingo_user_profile')) || {
        name: "Stranger",
        seed: "Stranger",
        bio: "Ready for 2026",
        customImage: null
      };
    } catch {
      return {
        name: "Stranger",
        seed: "Stranger",
        bio: "Ready for 2026",
        customImage: null
      };
    }
  });

  const [draftProfile, setDraftProfile] = useState(userProfile);

  const [appSettings, setAppSettings] = useState(() => {
      try { return JSON.parse(localStorage.getItem('bingo_settings')) || { haptics: true, sound: true }; }
      catch { return { haptics: true, sound: true }; }
  });

  const [aiCredits, setAiCredits] = useState(() => {
      try { return parseInt(localStorage.getItem('bingo_ai_credits') || '5'); }
      catch { return 5; }
  });

  const [activeBoardType, setActiveBoardType] = useState(() => {
     return localStorage.getItem('bingo_board_type') || 'yearly';
  });

  const [isBoardLocked, setIsBoardLocked] = useState(() => {
    return localStorage.getItem('bingo_board_locked') === 'true';
  });

  const [myBoard, setMyBoard] = useState(() => {
  try {
    const stored = JSON.parse(localStorage.getItem('bingo_active_board'));
    if (Array.isArray(stored) && stored.length === 25) {
      const allFifty = stored.every(
        (sq) => typeof sq.confidence === "number" && sq.confidence === 50
      );

      if (allFifty) {
        return stored.map((sq, idx) => ({
          ...sq,
          confidence:
            idx === 12
              ? 100
              : Math.floor(Math.random() * 100) + 1,
        }));
      }

      return enforceFreeCenter(stored);
    }
    return INITIAL_BOARD;
  } catch {
    return INITIAL_BOARD;
  }
});

  const [coreBoard, setCoreBoard] = useState(INITIAL_BOARD);
  const [messaging, setMessaging] = useState(null);
const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

// ✅ helper for messaging strings
const msg = (key, fallback) => {
  const candidates = [
    messaging?.[key],
    messaging?.[String(key || "").toLowerCase()],
    messaging?.[key === "betaNotice" ? "beta_notice" : null],
    messaging?.[key === "betaNotice" ? "earlyBetaNotice" : null],
  ].filter(Boolean);

  const val = candidates.find(v => typeof v === "string" && v.trim().length);
  return val ? val : fallback;
};


  const [boardHistory, setBoardHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bingo_history')) || []; }
    catch { return []; }
  });
  
    // Transients
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null); 
  // --- Beta + Privacy Tooltip State ---
  const [showBetaTooltip, setShowBetaTooltip] = useState(false);
  const [showPrivacyTooltip, setShowPrivacyTooltip] = useState(false);
  const [editingSquare, setEditingSquare] = useState(null); 
  const [showShare, setShowShare] = useState(false);
  const [roastData, setRoastData] = useState(null);
  const [showRoast, setShowRoast] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", action: null });
  
  // Create / Preview State
  const [previewDeck, setPreviewDeck] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewType, setPreviewType] = useState("");
  
  // AI State
  const [isGenerating, setIsGenerating] = useState(false);
  const [newsHeadline, setNewsHeadline] = useState("");
  const [isOracleLoading, setIsOracleLoading] = useState(false);

// Win State Tracking

const WIN_LINES = [
  [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // Rows
  [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // Cols
  [0,6,12,18,24], [4,8,12,16,20] // Diagonals
];

const calculateWinningLines = (board) => {
  if (!board) return 0;
  let count = 0;
  WIN_LINES.forEach((line) => {
    if (line.every((i) => board[i] && board[i].hit)) count++;
  });
  return count;
};

// returns a Set of completed line signatures, e.g. "0-1-2-3-4"
const getCompletedLineSigs = (board) => {
  const set = new Set();
  if (!Array.isArray(board) || board.length !== 25) return set;

  WIN_LINES.forEach((line) => {
    if (line.every((i) => board[i] && board[i].hit)) {
      set.add(line.join("-"));
    }
  });

  return set;
};

const [winningIndices, setWinningIndices] = useState([]);
const [winCount, setWinCount] = useState(0); // ✅ for FREE SPACE gold + UI logic
const previousWinCount = useRef(0);
const previousCompletedLineSigs = useRef(new Set()); // ✅ detect newly completed line(s)


  const fileInputRef = useRef(null);
  const backupInputRef = useRef(null);

  
  // Effects
  useEffect(() => {
  console.log("showShare changed:", showShare);
}, [showShare]);

  useEffect(() => localStorage.setItem('bingo_active_board', JSON.stringify(myBoard)), [myBoard]);
  useEffect(() => localStorage.setItem('bingo_user_profile', JSON.stringify(userProfile)), [userProfile]);
  useEffect(() => localStorage.setItem('bingo_settings', JSON.stringify(appSettings)), [appSettings]);
  useEffect(() => localStorage.setItem('bingo_board_type', activeBoardType), [activeBoardType]);
  useEffect(() => localStorage.setItem('bingo_core_board', JSON.stringify(coreBoard)), [coreBoard]);
  useEffect(() => localStorage.setItem('bingo_board_locked', isBoardLocked), [isBoardLocked]);
  useEffect(() => localStorage.setItem('bingo_ai_credits', aiCredits.toString()), [aiCredits]);
  useEffect(() => {
  if (!adminState) return;

  if (
  adminState.canonMode === true &&
  Array.isArray(adminState.canonDeck) &&
  !localStorage.getItem("doomgo_user_forked")
) {
  // grab whatever the user had saved (hits, oracleText, etc)
let prevBoard = null;
try {
  prevBoard = JSON.parse(localStorage.getItem("bingo_active_board"));
} catch {}

// build the canon board from admin
const canonBase = normalizeBoard(
  adminState.canonDeck.map((item, i) => ({
    id: i,
    text: item.text,
    category: item.category || "General",
    confidence:
  typeof item.confidence === "number"
    ? item.confidence
    : (typeof item.chaosWeight === "number" ? item.chaosWeight : 50),

    // don't force hit here (we’ll merge user progress below)
    oracleText: null,
  }))
);

// ✅ merge saved progress into canon (keeps highlights)
const canonWithOverrides = applyYearlyOverrides(canonBase);
const canonMerged = mergeUserProgress(canonWithOverrides, prevBoard);

setMyBoard(canonMerged);
setCoreBoard(canonMerged);



  // 🔒 Lock ONLY if canon is locked
  // 🔓 Board is editable unless HARD locked
const hardLocked =
  adminState.status === "Locked" ||
  new Date() > new Date(adminState.lockDate);

setIsBoardLocked(hardLocked);

}

}, [adminState]);
useEffect(() => localStorage.setItem('bingo_history', JSON.stringify(boardHistory)), [boardHistory]);
useEffect(() => {
  const loadAdminState = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('doomgo_admin_state')
      .select('data')
      .eq('id', 'global')
      .single();

    if (error) {
      console.error('Failed to load admin state', error);
      setLoading(false);
      return;
    }

    setAdminState(data.data);

// ✅ hydrate messaging bundle (use the freshly loaded bundle below)
const bundle = data.data?.messaging || null;
setMessaging(bundle);

// ✅ announcement wiring (uses bundle, not stale state)
if (bundle?.globalMessage) {
  const txt = bundle.globalMessage.trim();
  if (txt.length) {
    const id =
      bundle.announcementId ||
      bundle.updatedAt ||
      "global";
    setAnnouncement({ id, message: txt });
  } else {
    setAnnouncement(null);
  }
} else {
  setAnnouncement(null);
}

// ✅ disclaimer on load (once per device) — use bundle
const shouldShow = !!bundle?.showDisclaimerOnLoad;
const disclaimerText = bundle?.globalDisclaimer;
const dismissed = localStorage.getItem("doomgo_disclaimer_dismissed") === "true";

if (shouldShow && disclaimerText && !dismissed) {
  setShowDisclaimerModal(true);
}


if (data.data?.aiPolicy) {
  setAiPolicy(data.data.aiPolicy);
  // FORCE ADMIN CREDIT COUNT ON LOAD
  setAiCredits(data.data.aiPolicy.monthlyCredits);
}

if (data.data?.chaosPolicy) {
  setChaosPolicy({
    globalMultiplier:
      typeof data.data.chaosPolicy.globalMultiplier === "number"
        ? data.data.chaosPolicy.globalMultiplier
        : 1.0,
    absurdityBias:
      typeof data.data.chaosPolicy.absurdityBias === "number"
        ? data.data.chaosPolicy.absurdityBias
        : 50,
  });
}

setLoading(false);
  };

  loadAdminState();
}, []);

// --- PRESENCE: create/update anonymous profile so Admin dashboard sees users ---
useEffect(() => {
  if (!adminState) return;

  const deviceId = getDeviceId();

  const upsertProfile = async () => {
    try {
      // You can rename columns to match your profiles table.
      const { error } = await supabase
  .from("profiles")
  .upsert(
    {
      device_id: deviceId,
      last_seen_at: new Date().toISOString(),
      region: getRegionGuess(),
      user_agent: navigator.userAgent,
    },
    { onConflict: "device_id" }
  );

if (error) console.warn("Presence upsert failed:", error);

    } catch (e) {
      console.warn("Presence upsert failed:", e);
    }
  };

  upsertProfile();

  // heartbeat every 60s while the tab is open
  const t = setInterval(upsertProfile, 60000);
  return () => clearInterval(t);
}, [adminState]);


useEffect(() => {
  if (!isCenterToken(myBoard?.[12]?.text)) {
    console.warn("🚨 CENTER TILE BROKEN", myBoard?.[12], myBoard);
  }
}, [myBoard]);


useEffect(() => {
  localStorage.setItem(
    "bingo_pinned_decks",
    JSON.stringify(pinnedDecks)
  );
}, [pinnedDecks]);

  // 🔮 First-time users get an AI-generated board
  useEffect(() => {
    const storedBoard = localStorage.getItem('bingo_active_board');
    if (!storedBoard) {
      setMyBoard(INITIAL_BOARD);
setCoreBoard(INITIAL_BOARD);
setActiveBoardType('yearly');
 
    }
  }, []);

// Initialize win count on mount
useEffect(() => {
  if (!Array.isArray(myBoard) || myBoard.length !== 25) return;
  const initialWins = calculateWinningLines(myBoard);
  previousWinCount.current = initialWins;
  setWinCount(initialWins);
  previousCompletedLineSigs.current = getCompletedLineSigs(myBoard);
}, [adminState]); // or [myBoard] with a guard


// Win Detection (bounce ONLY on new completed row/col/diag)
useEffect(() => {
  if (!Array.isArray(myBoard) || myBoard.length !== 25) return;

  const currentWinningIndices = new Set();
  let winningLinesCount = 0;

  // collect completed line signatures + indices
  const currentCompleted = new Set();

  WIN_LINES.forEach((line) => {
    const isComplete = line.every((i) => myBoard[i] && myBoard[i].hit);
    if (isComplete) {
      winningLinesCount++;
      line.forEach((i) => currentWinningIndices.add(i));
      currentCompleted.add(line.join("-"));
    }
  });

  setWinningIndices(Array.from(currentWinningIndices));
  setWinCount(winningLinesCount); // ✅ used to make FREE SPACE gold after any win

  // ✅ Detect newly completed lines
  const prevCompleted = previousCompletedLineSigs.current || new Set();
  const newlyCompleted = [];

  currentCompleted.forEach((sig) => {
    if (!prevCompleted.has(sig)) newlyCompleted.push(sig);
  });

  // ✅ If new line(s) completed: confetti + bounce the tiles in the new line(s)
  if (newlyCompleted.length > 0) {
    newlyCompleted.forEach((sig) => {
      const line = sig.split("-").map((n) => Number(n));
      line.forEach((idx) => {
        const tile = myBoard[idx];
        if (tile) triggerBounce(tile.id); // bounce tiles in the NEW line
      });
    });

    if (!showConfetti) {
      setShowConfetti(true);
      vibrate(200);
      setTimeout(() => setShowConfetti(false), 4000);
    }
  }

  previousWinCount.current = winningLinesCount;
  previousCompletedLineSigs.current = currentCompleted;
}, [myBoard]);



  // --- HELPERS ---

  const openConfirm = (message, action) => {
      setConfirmModal({ show: true, message, action });
  };

  const closeConfirm = () => {
      setConfirmModal({ show: false, message: "", action: null });
  };

const openShareModal = () => {
  try {
    console.log("Share button pressed");
    // ✅ Don't mark ads here — we only count it if Sponsored actually renders inside SharePreview
    setShowShare(true);
  } catch (e) {
    console.error("Failed to open share modal:", e);
    openConfirm("Share UI failed to open. Check console.", null);
  }
};


  const confirmAction = () => {
      if (confirmModal.action) confirmModal.action();
      closeConfirm();
  };
  const logBoardEvent = async ({ boardType, board, locked = false, source = "unknown" }) => {
  try {
    const deviceId = getDeviceId();
    
    const tiles = Array.isArray(board) ? board.map(t => ({
      text: t.text,
      category: t.category,
      confidence: t.confidence,
      hit: !!t.hit,
      locked: !!t.locked,
    })) : null;

    const chaos_score = Array.isArray(board)
  ? Math.round(
      board
        .filter((_, i) => i !== 12)
        .reduce((sum, t) => sum + (Number(t.confidence) || 50), 0) / 24
    )
  : null;

    await supabase.from("doomgo_boards").insert({
  device_id: deviceId,
  board_type: boardType,
  locked,
  source,
  chaos_score, // ✅
  tiles,
  created_at: new Date().toISOString(),
});

  } catch (e) {
    console.warn("Board log failed:", e);
  }
};

const [bouncingIds, setBouncingIds] = useState({});

const triggerBounce = (id) => {
  setBouncingIds((prev) => ({ ...prev, [id]: true }));
  window.setTimeout(() => {
    setBouncingIds((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, 3000);
};

const getYearlyOverrides = () => {
  try { return JSON.parse(localStorage.getItem("doomgo_yearly_overrides") || "{}"); }
  catch { return {}; }
};

const setYearlyOverrides = (obj) => {
  localStorage.setItem("doomgo_yearly_overrides", JSON.stringify(obj || {}));
};

const applyYearlyOverrides = (board) => {
  const ov = getYearlyOverrides();
  if (!ov || typeof ov !== "object") return board;
  return board.map((t, i) => (ov[i] ? { ...t, ...ov[i] } : t));
};


const isPastJan1ForActiveYear = () => {
  const year = Number(adminState?.activeYear ?? 2026); // falls back to 2026 if missing
  const now = new Date();
  const jan1 = new Date(year, 0, 1);
  return now >= jan1;
};


// --- ADMIN ACTIONS ---

const emergencyFreeze = async () => {
  const updated = {
    ...adminState,
    status: "Locked",
    canonMode: true,
    emergencyFreezeAt: new Date().toISOString(),
  };

  setAdminState(updated);

  await supabase
    .from("doomgo_admin_state")
    .update({ data: updated })
    .eq("id", "global");
};

const unfreezeSystem = async () => {
  const updated = {
    ...adminState,
    status: "Open",
  };

  setAdminState(updated);

  await supabase
    .from("doomgo_admin_state")
    .update({ data: updated })
    .eq("id", "global");
};


  const restorePinnedDeck = (type) => {
  const pinned = pinnedDecks[type];
  if (!pinned) return;

  openConfirm(`Restore your pinned ${type} deck?`, () => {
    saveToHistory();
    setMyBoard(normalizeBoard(pinned.board));
    setActiveBoardType(type);
    previousWinCount.current = calculateWinningLines(pinned.board);
    if (appSettings.haptics) vibrate(50);
  });
};


const pinCurrentDeck = () => {
  if (activeBoardType === "yearly") {
    openConfirm("Your Doomgo 2026 deck is already permanent.", null);
    return;
  }

  openConfirm(
    `Pin this ${activeBoardType} deck?\n\nThis will replace any previously pinned ${activeBoardType} deck.`,
    () => {
      setPinnedDecks((prev) => ({
        ...prev,
        [activeBoardType]: {
          board: JSON.parse(JSON.stringify(myBoard)),
          type: activeBoardType,
          pinnedAt: Date.now(),
        },
      }));

      if (appSettings.haptics) vibrate(40);
    }
  );
};


  const saveToHistory = () => {
      setBoardHistory(prev => {
          const snapshot = { 
              board: JSON.parse(JSON.stringify(myBoard)), 
              type: activeBoardType 
          };
          const newHistory = [...prev, snapshot];
          return newHistory.slice(-5);
      });
  };

  const rewindHistory = () => {
      if (boardHistory.length === 0) return;
      const lastState = boardHistory[boardHistory.length - 1];
      
      openConfirm(`Rewind to previous board state (${lastState.type})?`, () => {
          setMyBoard(normalizeBoard(lastState.board));
          setActiveBoardType(lastState.type);
          
          setBoardHistory(prev => prev.slice(0, -1));
          previousWinCount.current = calculateWinningLines(lastState.board); 
          if(appSettings.haptics) vibrate(50);
      });
  };

  const handleTileClick = (sq) => {
      // Edit Mode
      if (mode === 'edit') {
          if (sq.id === 12) {
  vibrate(30);
  return;
}
          if (isBoardLocked) {
  // If it’s yearly + locked (or we’re past Jan 1), show the admin message
  if (activeBoardType === "yearly" && isPastJan1ForActiveYear()) {
  openConfirm(
    msg("postJan1EditAttempt", "Nice try. The timeline is sealed. See you in 2027."),
    null
  );
} else {
  openConfirm("Board is locked! Unlock it first to edit.", null);
}
return;

}

          setEditingSquare(sq); 
          return;
      }
      
      // Play Mode logic
      if (!isBoardLocked) {
          openConfirm("You must LOCK your board before playing to prevent accidental edits. Lock board now?", () => {
              setIsBoardLocked(true);
          });
          return;
      }

      setSelectedSquare(sq); 
  };

  const saveEdit = (newText) => {
  if (!editingSquare) return;

  // 🧬 User is diverging from canon
  // store per-tile override (yearly only)
if (activeBoardType === "yearly") {
  const ov = getYearlyOverrides();
  ov[editingSquare.id] = { text: newText }; // you can also store category/confidence if you want
  setYearlyOverrides(ov);
}

const newBoard = myBoard.map(s =>
  s.id === editingSquare.id ? { ...s, text: newText } : s
);


  setMyBoard(newBoard);
  setIsBoardLocked(false);
  setEditingSquare(null);
};


  const toggleHit = (id) => {
  if (id === 12) return; // ✅ FREE SPACE stays on forever

  const isCurrentlyHit = !!myBoard.find((s) => s.id === id)?.hit;
  const nextHit = !isCurrentlyHit;

  const newBoard = myBoard.map((s) =>
    s.id === id ? { ...s, hit: nextHit } : s
  );

  setMyBoard(newBoard);
  if (activeBoardType === "yearly") setCoreBoard(newBoard);

  setSelectedSquare(null);
  if (appSettings.haptics) vibrate(20);
};



  const restoreCoreBoard = () => {
      openConfirm("Switch back to your main 2026 predictions?", () => {
          saveToHistory(); 
          setMyBoard(coreBoard);
          setActiveBoardType('yearly');
          previousWinCount.current = calculateWinningLines(coreBoard);
          if(appSettings.haptics) vibrate(50);
      });
  };

  const toggleLock = () => {
  // 🔐 Already locked yearly board → informational only
  if (activeBoardType === 'yearly' && isBoardLocked) {
    openConfirm(
      "Your Doomgo 2026 card is permanently locked.",
      null
    );
    return;
  }

  // ⚠️ First-time lock of yearly board → confirmation required
  if (activeBoardType === "yearly" && !isBoardLocked) {
  openConfirm(
    msg(
      "preLockWarning",
      "Lock your Doomgo 2026 card?\n\nOnce locked, this board cannot be edited or regenerated for the rest of the year."
    ),
    () => {
      setIsBoardLocked(true);
      setMode("play");

      // ✅ analytics write
      logBoardEvent({
        boardType: "yearly",
        board: myBoard,
        locked: true,
        source: "yearly_lock",
      });

      if (appSettings.haptics) vibrate(50);

      // ✅ post-lock message (add this key in admin if you want)
      openConfirm(
        msg("lockConfirmationText", "Locked. Your predictions for 2026 are set in stone."),
        null
      );
    }
  );

  return;
}


  // 🔁 All other boards (daily / weekly / monthly / chaos)
  setIsBoardLocked(!isBoardLocked);
  if (!isBoardLocked) setMode('play');
  if (appSettings.haptics) vibrate(20);
};



  const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setUserProfile({...userProfile, customImage: reader.result});
          };
          reader.readAsDataURL(file);
      }
  };

  const consumeAiCredit = () => {
  if (!aiPolicy.enabled) {
    openConfirm(
      "🔒 AI is currently disabled by Doomgo admin.\n\nYou can still play without AI.",
      null
    );
    return false;
  }

  if (aiCredits > 0) {
    setAiCredits(prev => prev - 1);
    return true;
  }

  showOutOfCredits();
  return false;
};


  const showOutOfCredits = () => {
  openConfirm(
    "🔮 Oracle limit reached\n\nThis beta includes 5 AI generations so costs don’t explode while we test Doomgo.\n\nYou can keep playing without AI.\nMore credits, daily access, and premium decks are coming soon.",
    null
  );
};


  const quickRefresh = async () => {
  // 🔒 Prevent refresh if canonical yearly deck is locked
  if (activeBoardType === 'yearly' && isBoardLocked) {
    openConfirm(
      "The official Doomgo 2026 deck is locked and cannot be regenerated.",
      null
    );
    return;
  }

  if (aiCredits <= 0) {
  showOutOfCredits();
  return;
}


  const targetType = activeBoardType === 'yearly'
    ? 'chaos'
    : activeBoardType;

  openConfirm(
    `Quick Refresh: Regenerate this board (${targetType})? Cost: 1 Credit.`,
    async () => {
      if (consumeAiCredit()) {
        setIsRefreshing(true);
        saveToHistory();
        await generateDeck(targetType, true);
        setIsRefreshing(false);
      }
    }
  );
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

const applyChaosPolicyToItems = (items, type) => {
  const isChaos = type === "chaos" || type === "yearly";
  if (!isChaos) return items;

  const mult = Number(chaosPolicy?.globalMultiplier ?? 1.0);

  return items.map((it, idx) => ({
    ...it,
    confidence:
      idx === 12
        ? 100
        : clamp(Math.round((Number(it.confidence) || 50) * mult), 1, 100),
  }));
};


  // DECK GENERATION
  const generateDeck = async (type, autoApply = false) => {
      setIsGenerating(true);
      let prompt = "Generate 25 unique events.";
      if (type === 'daily') prompt = "Generate 25 funny, relatable, minor events that could happen TODAY (e.g., 'Spilled coffee'). Unique items.";
      if (type === 'weekly') prompt = "Generate 25 events for THIS WEEK (e.g., 'Finished a book', 'Went for a run'). Unique items.";
      if (type === 'monthly') prompt = "Generate 25 specific events or news headlines for NEXT MONTH. Unique items.";
      if (type === 'chaos' || type === 'yearly') {
  const bias = Number(chaosPolicy?.absurdityBias ?? 50);
  prompt =
    `Generate 25 global events for 2026. ` +
    `${bias}% should be absurd/sci-fi/unhinged, and ${100 - bias}% should feel plausible. ` +
    `Unique items.`;
}


      try {
          const res = await callGemini(
  prompt + ` Return ONLY a JSON array of exactly 25 objects with this shape: { "text": string, "category": string, "confidence": a number from 1 to 100 }. The item at index 12 must be text: "FREE SPACE". No markdown, no extra text.`
);
          const clean = res.replace(/```json|```/g, '').trim();
          let data = JSON.parse(clean);

data = applyChaosPolicyToItems(data, type);

if (autoApply) {
  applyNewBoard(enforceFreeCenter(data), type);
} else {
  showDeckPreview(data, "New Deck", type);
}


      } catch (e) {
          const fallbackType = (type === 'yearly') ? 'chaos' : type;
       const mockData = shuffleArray(MOCK_DECKS[fallbackType] || MOCK_DECKS['chaos']).map((txt, i) => ({ 
    text: txt, 
    category: "General", 
    confidence: Math.floor(Math.random() * 100) + 1 
}));
          
const adjustedMock = applyChaosPolicyToItems(mockData, type);

if (autoApply) {
  applyNewBoard(
    enforceFreeCenter(
      adjustedMock.map((item, i) => ({ ...item, id: i }))
    ),
    type
  );
} else {
  showDeckPreview(adjustedMock, "New Deck", type);
}

      } finally {
          setIsGenerating(false);
      }
  };

  const applyNewBoard = (data, type) => {
      const newBoard = enforceFreeCenter(
  data.slice(0, 25).map((item, i) => ({
    id: i,
    text: item.text,
    category: item.category || "General",
    confidence: Number(item.confidence) || Math.floor(Math.random() * 100) + 1,
    oracleText: null
  }))
);

      
      setMyBoard(newBoard);
      previousWinCount.current = 0; 
      
      if (activeBoardType === 'yearly' && (type === 'chaos' || type === 'yearly')) {
           setActiveBoardType('chaos'); 
      } else {
           setActiveBoardType(type);
      }
      
      vibrate(100);
  }

  const showDeckPreview = (data, title, type) => {
  const normalized = enforceFreeCenter(
    data.slice(0, 25).map((item, i) => ({
      id: i,
      text: item.text,
      category: item.category || "General",
      confidence: Number(item.confidence) || Math.floor(Math.random() * 100) + 1,
      oracleText: null
    }))
  );

  const newBoard = normalized.map((item, i) => ({
    ...item,
    hit: i === 12,
    locked: i === 12
  }));

  setPreviewDeck(newBoard);
  setPreviewTitle(title);
  setPreviewType(type);
};


  const activatePreviewDeck = () => {
  // 🔒 Only AI-generated decks cost credits
  const costsCredit = previewType !== 'daily';

  if (costsCredit && !consumeAiCredit()) return;

  saveToHistory();

  if (activeBoardType === 'yearly') {
    setCoreBoard(myBoard);
  }

  const safeBoard = enforceFreeCenter(
  previewDeck.map((item, i) => ({
    ...item,
    id: i
  }))
);

setMyBoard(safeBoard);
previousWinCount.current = 0;
setActiveBoardType(previewType);

// ✅ write a board row for analytics
logBoardEvent({
  boardType: previewType,
  board: safeBoard,
  locked: false,
  source: "preview_activate",
});

setPreviewDeck(null);
setActiveTab('home');


  if (appSettings.haptics) vibrate(100);
};


  const askOracle = async (cardId, text) => {
      setIsOracleLoading(true);
      try {
          const res = await callGemini(`Give a 1-sentence mystic prophecy about: "${text}". Be funny/sassy.`, "You are a mystic Oracle.");
          setMyBoard(prev => prev.map(sq => sq.id === cardId ? { ...sq, oracleText: res } : sq));
          if(appSettings.haptics) vibrate(10);
      } catch(e) { 
          setMyBoard(prev => prev.map(sq => sq.id === cardId ? { ...sq, oracleText: "The spirits are silent." } : sq));
      } finally { 
          setIsOracleLoading(false); 
      }
  };

  const generateDoomgoRoast = async () => {
      if (!consumeAiCredit()) return;
      setIsOracleLoading(true);
      const hits = myBoard.filter(s => s.hit && !s.locked).map(s => s.text).join(", ");
      const misses = myBoard.filter(s => !s.hit && !s.locked).map(s => s.text).join(", ");
      
      try {
          const prompt = `You are a chaotic, snarky Bingo announcer. The user has achieved: ${hits || "Nothing"}. Waiting on: ${misses}. Roast their Doomgo card so far.`;
          const res = await callGemini(prompt);
          setRoastData(res);
          setShowRoast(true);
      } catch(e) {
          const fallbackRoast = MOCK_ROASTS[Math.floor(Math.random() * MOCK_ROASTS.length)];
          setRoastData(fallbackRoast);
          setShowRoast(true);
      } finally {
          setIsOracleLoading(false);
      }
  };

  const generateHeadline = async (text) => {
      setIsOracleLoading(true);
      setNewsHeadline("");
      try {
          const res = await callGemini(`Write a BREAKING NEWS ticker headline for: "${text}". Use ALL CAPS. Max 10 words.`);
          setNewsHeadline(res.replace(/"/g, ''));
          if(appSettings.haptics) vibrate(10);
      } catch(e) {}
      finally { setIsOracleLoading(false); }
  };
const exportBackup = () => {
  const keys = [
    "bingo_active_board",
    "bingo_core_board",
    "bingo_board_type",
    "bingo_board_locked",
    "bingo_user_profile",
    "bingo_ai_credits",
    "bingo_history",
    "bingo_pinned_decks",
    "doomgo_dismissed_announcement_id",
    "doomgo_user_forked",
  ];

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `doomgo-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
};

const importBackupFromFile = async (file) => {
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!parsed?.data || typeof parsed.data !== "object") {
      openConfirm("That backup file looks invalid.", null);
      return;
    }

    Object.entries(parsed.data).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      localStorage.setItem(k, v);
    });

    openConfirm("Backup restored ✅ Reloading...", null);
    setTimeout(() => window.location.reload(), 600);
  } catch (e) {
    openConfirm("Couldn’t import that backup file.", null);
  }
};

  const resetApp = () => {
      openConfirm("Reset EVERYTHING? This cannot be undone.", () => {
          localStorage.clear();
          window.location.reload();
      });
  };

  // --- VIEW DEFINITIONS ---

  const ConfirmationModal = () => {
      if (!confirmModal.show) return null;
      return (
          <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-fade-in">
              <SoftCard className="w-full max-w-xs p-6 shadow-2xl bg-white">
                  <div className="flex justify-center mb-4 text-amber-500"><AlertTriangle size={32}/></div>
                  <p className="text-center text-[#1A1E2C] font-bold mb-6">{confirmModal.message}</p>
                  <div className="flex gap-2">
                      <button onClick={closeConfirm} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl">Cancel</button>
                      <button onClick={confirmAction} className="flex-1 py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg">{confirmModal.action ? "Confirm" : "OK"}</button>
                  </div>
              </SoftCard>
          </div>
      );
  };

  const OnboardingView = () => (
  <div className="fixed inset-0 z-[100] flex flex-col justify-center items-start p-8 bg-[#F5F7FA] overflow-hidden">
      <GeometricShape type="cube" className="-top-20 -right-20 rotate-12" />
      <GeometricShape type="sphere" className="-bottom-20 -left-20" />
      <GeometricShape type="pyramid" className="top-1/2 -right-10 opacity-50" />

      <div className="z-10 mb-12 mt-10">
        {/* Doomgo logo */}
        <img
  src="/chaos-icon.png"
  alt="Doomgo Logo"
  className="w-28 h-28 mb-5 drop-shadow-xl rounded-3xl"
/>


        <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">
          2026 Edition
        </p>
        <h1 className="text-7xl font-black text-[#1A1E2C] leading-[0.9] tracking-tighter mb-6">
          Welcome<br />To Doomgo.
        </h1>
        <p className="text-gray-500 font-medium text-lg max-w-xs">
  Predict the future. Track the chaos.<br />
  Play Bingo Of the Year!
</p>

<p className="mt-4 text-[11px] text-gray-400 max-w-xs leading-snug">
  ✨ Includes{" "}
  <span className="font-bold">
    {aiPolicy.monthlyCredits} free AI moments
  </span>{" "}
  to generate decks, roasts, and predictions.
</p>


      </div>

      <button
        onClick={() => setCurrentScreen('app')}
        className="w-20 h-20 rounded-full bg-[#1A1E2C] text-white flex items-center justify-center shadow-2xl z-20"
      >
        <ArrowRight size={32} />
      </button>
  </div>
);


  const HomeView = () => (
  <div className="pb-32 pt-12 px-6 bg-transparent min-h-full relative">
          <div className="flex justify-between items-start mb-6">
  <div className="flex items-start gap-4">
    {/* ✅ Doomgo logo next to greeting */}
    <img
      src="/chaos-icon.png"
      alt="Doomgo"
      className="w-12 h-12 rounded-2xl shadow-md shrink-0 mt-1"
    />

    <div>
      <h2 className="text-4xl font-black text-[#1A1E2C] leading-none tracking-tight">
        Hello,<br/>{userProfile.name}
      </h2>
      <p className="text-gray-400 font-medium text-lg mt-1">
        Ready to play Bingo of The Year?
      </p>
    </div>
  </div>

  <div
    onClick={() => setActiveTab('profile')}
    className="w-12 h-12 rounded-full bg-white shadow-md p-1 cursor-pointer active:scale-95 transition-transform overflow-hidden"
  >
    <img
      src={userProfile.customImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.seed}`}
      className="w-full h-full rounded-full bg-blue-100 object-cover"
    />
  </div>
</div>


    {announcement && announcement.id !== dismissedAnnouncementId && (
      <SoftCard className="mb-4 !p-4 border border-indigo-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">
              Admin Announcement
            </p>
            <p className="text-sm font-bold text-gray-700 leading-snug">
              {announcement.message}
            </p>
          </div>

          <button
            onClick={() => {
              feedback(8, "close");
              localStorage.setItem("doomgo_dismissed_announcement_id", announcement.id);
              setDismissedAnnouncementId(announcement.id);
            }}
            className="p-2 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </SoftCard>
    )}
          <div className="flex items-center justify-between mb-6">
              <div className="px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${activeBoardType === 'yearly' ? 'bg-indigo-500' : 'bg-green-500'}`}></span><span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{activeBoardType} Board</span></div>
              {activeBoardType !== 'yearly' && (<button onClick={restoreCoreBoard} className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 active:scale-95 transition-transform"><RefreshCw size={10}/> Restore 2026</button>)}
          </div>
          <SoftCard className="mb-8 !p-5 flex items-center justify-between">
              <div><p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Doomgo Level</p><h3 className="text-4xl font-black text-[#1A1E2C]">{Math.round((myBoard.filter(s=>s.hit).length/25)*100)}%</h3></div>
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="6" fill="transparent" /><circle cx="32" cy="32" r="28" stroke="#3B82F6" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (myBoard.filter(s => s.hit).length / 25))} strokeLinecap="round" /></svg>
              </div>
          </SoftCard>
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
  <h3 className="text-xl font-bold text-[#1A1E2C]">Active Board</h3>
  {isBoardLocked && <Lock size={14} className="text-gray-400" />}

  {activeBoardType !== "yearly" && (
    <button
      onClick={pinCurrentDeck}
      className="ml-2 px-2 py-1 text-xs font-bold rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
      title="Pin this deck"
    >
      📌 Pin
    </button>
  )}
</div>

              <div className="flex gap-2">
                  <button onClick={generateDoomgoRoast} className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors active:scale-95" title="Roast"><Flame size={16} /></button>
                  <button onClick={rewindHistory} disabled={boardHistory.length === 0} className={`p-2 rounded-full transition-colors ${boardHistory.length > 0 ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-50 text-gray-300'}`} title="Undo"><History size={16} /></button>
                  <button onClick={quickRefresh} className="p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 transition-colors active:scale-95" title="Refresh">{isRefreshing ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16} />}</button>
                  <button onClick={toggleLock} className={`p-2 rounded-full transition-colors ${isBoardLocked ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>{isBoardLocked ? <Lock size={16}/> : <Unlock size={16}/>}</button>
                  <div className={`flex gap-1 p-1 rounded-full transition-all ${isBoardLocked ? 'bg-gray-100 opacity-50 pointer-events-none' : 'bg-gray-200'}`}>
                      <button onClick={() => setMode('play')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode==='play' ? 'bg-white text-[#1A1E2C] shadow-sm' : 'text-gray-500'}`}><Zap size={12} className="inline mr-1"/> Play</button>
                      <button onClick={() => setMode('edit')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode==='edit' ? 'bg-white text-[#1A1E2C] shadow-sm' : 'text-gray-500'}`}><Edit3 size={12} className="inline mr-1"/> Edit</button>
                  </div>
              </div>
          </div>
          <div className="grid grid-cols-5 gap-2 mb-8">
              {myBoard.map((sq, idx) => {
 const isWinningLine = winningIndices.includes(idx);
const isFree = idx === 12;
const shouldBounce = !!bouncingIds[sq.id];
const hasDoomgo = winCount > 0;
const freeIsGold = isFree && hasDoomgo;
const showCrown = isFree || isWinningLine;

  return (
    <div
      key={sq.id}
      onClick={() => handleTileClick(sq)}
      className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden transition-all active:scale-95 border-2 ${
  shouldBounce ? "doomgo-bounce" : ""
} ${
  isFree
    ? (hasDoomgo
        ? "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white border-white ring-2 ring-white/70 shadow-lg scale-105 z-10"
        : "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white shadow-lg scale-105 z-10 ring-2 ring-white/40"
      )
    : isWinningLine
  ? "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 text-white border-white ring-2 ring-white/70 shadow-lg"
      : sq.hit
        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white ring-2 ring-white/50 shadow-lg"
        : "bg-white text-gray-600 shadow-sm hover:bg-gray-50 border-white"
}`}

    >
      <div
        className={`w-1 h-1 rounded-full mb-1 ${
          sq.hit ? 'bg-white/50' : 'bg-gray-300'
        }`}
      />

      <p className="text-[8px] font-bold leading-tight line-clamp-3 select-none">
  {sq.text}
</p>

{/* ✅ Center tile helper label */}
{idx === 12 && (
  <p className="text-[7px] font-black tracking-wide text-white text-center leading-none mt-0.5 drop-shadow-sm">
    Free space
  </p>
)}


{/* ✅ Crown only on completed bingo line tiles */}
{showCrown && (
  <Crown
    size={12}
    className="absolute top-1 left-1 text-yellow-300 drop-shadow-sm"
  />
)}

{/* ✅ Checkmark on ALL hit tiles (including center) */}
{sq.hit && (
  <Check
    size={12}
    className="absolute bottom-1 right-1 text-white/90 drop-shadow-sm"
  />
)}

{mode === 'edit' && !isFree && (
  <Edit3 size={10} className="absolute top-1 right-1 text-amber-500" />
)}

    </div>
  );
})}

          </div>
          <p className="text-center text-xs text-gray-400 italic">{isBoardLocked ? (mode === 'play' ? "Tap to mark predictions" : "Board locked") : "Lock the board to start playing"}</p>
      </div>
  );

  const CreateView = () => {
    if (previewDeck) {
        return (
  <div className="pb-32 pt-12 px-6 bg-transparent min-h-full relative">
    <GeometricShape type="cube" className="top-10 -right-6 opacity-[0.22] scale-75" />
<GeometricShape type="sphere" className="bottom-10 -left-10 opacity-[0.20] scale-75" />
                 <div className="flex items-center gap-4 mb-6"><button onClick={() => setPreviewDeck(null)} className="p-2 bg-gray-200 rounded-full"><ArrowRight className="rotate-180" size={20}/></button><h2 className="text-3xl font-black text-[#1A1E2C]">{previewTitle}</h2></div>
                 <div className="grid grid-cols-5 gap-2 mb-8 opacity-75 grayscale hover:grayscale-0 transition-all">
                    {previewDeck.map(sq => (<div key={sq.id} className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-center relative overflow-hidden bg-white shadow-sm border border-gray-100`}><p className="text-[8px] font-bold leading-tight line-clamp-3 select-none text-gray-600">{sq.text}</p>{sq.locked && <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50"><Crown size={12} className="opacity-50"/></div>}</div>))}
                </div>
                <div className="space-y-3"><button onClick={activatePreviewDeck} className="w-full py-4 bg-[#1A1E2C] text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"><Play size={20} fill="currentColor"/> Start This Game</button><p className="text-center text-xs text-gray-400 px-4">Cost: 1 AI Credit ({aiCredits} remaining).</p></div>
            </div>
        )
    }
    return (
  <div className="pb-32 pt-12 px-6 bg-transparent min-h-full relative">
          <h2 className="text-3xl font-black text-[#1A1E2C] mb-6">New Deck</h2>
          <div className="space-y-4">
              <SoftCard onClick={() => generateDeck('daily')} className="!bg-gradient-to-br from-pink-500 to-rose-500 text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Daily Deck</h3><p className="text-xs text-pink-100">Predict today's small chaos.</p></div><Calendar size={24} className="opacity-80"/></div></SoftCard>
              <SoftCard onClick={() => generateDeck('weekly')} className="!bg-gradient-to-br from-orange-400 to-amber-500 text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Weekly Bingo</h3><p className="text-xs text-orange-100">Goals & Events for this week.</p></div><Calendar size={24} className="opacity-80"/></div></SoftCard>
              <SoftCard onClick={() => generateDeck('monthly')} className="!bg-gradient-to-br from-teal-500 to-emerald-500 text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Monthly Forecast</h3><p className="text-xs text-teal-100">What happens next month?</p></div><Calendar size={24} className="opacity-80"/></div></SoftCard>
              <SoftCard onClick={() => generateDeck('chaos')} className="!bg-[#1A1E2C] text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Doomgo 2026</h3><p className="text-xs text-gray-400">Global events & absurdity.</p></div><Globe size={24} className="opacity-80"/></div></SoftCard>
          </div>
          <p className="text-center text-xs font-bold text-gray-400 mt-6">
  AI Credits Remaining: {aiCredits}/{aiPolicy.monthlyCredits}
  <br />
  <span className="font-normal text-[10px]">
    Used for AI decks, roasts & oracle
  </span>
</p>


{Object.keys(pinnedDecks).length > 0 && (
  <div className="mt-8">
    <h4 className="text-sm font-bold text-gray-500 mb-3">
      📌 Pinned Decks
    </h4>

    <div className="space-y-2">
      {Object.entries(pinnedDecks).map(([type]) => (
        <SoftCard
          key={type}
          onClick={() => restorePinnedDeck(type)}
          className="!p-4 flex items-center justify-between cursor-pointer"
        >
          <div>
            <p className="font-bold capitalize">{type} Deck</p>
            <p className="text-xs text-gray-400">Saved earlier</p>
          </div>
          <Play size={18} />
        </SoftCard>
      ))}
    </div>
  </div>
)}

          {isGenerating && (<div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50"><div className="flex flex-col items-center animate-fade-in"><Loader2 size={40} className="animate-spin text-[#1A1E2C] mb-4"/><p className="font-black text-[#1A1E2C] text-xl">Consulting Timeline...</p></div></div>)}
      </div>
    );
  };

const SharePreview = ({ onClose, isPro }) => {
  const cardRef = useRef(null);
  const [caption, setCaption] = useState("");
  const [loadingCaption, setLoadingCaption] = useState(false);

  // ✅ prebuilt image for Chrome (keeps user-gesture for download/share)
  const [exporting, setExporting] = useState(false);
  const [exportBlob, setExportBlob] = useState(null);
  const [exportUrl, setExportUrl] = useState(null);
  const [exportFile, setExportFile] = useState(null);

  // ✅ Decide once: should Sponsored show for THIS modal open?
  const [showSponsored, setShowSponsored] = useState(false);

  useEffect(() => {
    if (isPro) {
      setShowSponsored(false);
      return;
    }

    const allowed = canShowAd(2);
    setShowSponsored(allowed);

    // ✅ Only count it if we are actually going to render Sponsored
    if (allowed) markAdShown();
  }, [isPro]);


  const prepareShareAsset = useCallback(async () => {
    if (!cardRef.current) return;

    setExporting(true);
    try {
      const blob = await htmlToImage.toBlob(cardRef.current, {
        cacheBust: true,
        pixelRatio: Math.min(3, window.devicePixelRatio || 2),
        backgroundColor: "#1A1E2C",
      });

      if (!blob) throw new Error("No blob generated");

      const file = new File([blob], "doomgo-card.png", { type: "image/png" });
      const url = URL.createObjectURL(blob);

      setExportBlob(blob);
      setExportFile(file);

      // revoke previous URL to avoid leaks
      setExportUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch (e) {
      console.error("prepareShareAsset failed:", e);
      openConfirm("Couldn’t render the share image. Try again or use your phone.", null);
    } finally {
      setExporting(false);
    }
  }, []);

  // ✅ build the image immediately when modal opens
  useEffect(() => {
    prepareShareAsset();
  }, [prepareShareAsset]);

  // ✅ cleanup blob URL
  useEffect(() => {
    return () => {
      if (exportUrl) URL.revokeObjectURL(exportUrl);
    };
  }, [exportUrl]);

  const genCaption = async () => {
    setLoadingCaption(true);

    const hitCount = myBoard.filter((s) => s.hit).length;
    const hits = myBoard
      .filter((s) => s.hit && !s.locked)
      .map((s) => s.text)
      .slice(0, 3)
      .join(", ");

    try {
      const res = await callGemini(
        `Write a short, funny Instagram caption for my 2026 Bingo card. I have completed ${hitCount}/25 events. Highlights: ${
          hits || "None yet"
        }. Include hashtags.`
      );
      setCaption(res.replace(/"/g, ""));
    } catch (e) {
      console.warn("Caption gen failed:", e);
      setCaption("Error generating caption.");
    } finally {
      setLoadingCaption(false);
    }
  };

  const handleShare = async () => {
    const captionText =
      `${caption || "My Doomgo 2026 card"}\n\n` +
      `Play Doomgo → ${BRAND.url}\n` +
      `TikTok ${BRAND.socials.tiktok} • IG/Threads ${BRAND.socials.instagram}\n`;

    const safeCopy = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
    };

    // If we don't have the asset yet, prepare it and ask user to tap again
    if (!exportFile || !exportUrl) {
      await prepareShareAsset();
      openConfirm("Preparing image… tap Share again ✅", null);
      return;
    }

    const canShareFiles =
      !!navigator.share &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [exportFile] });

    // Best path: native share with image (mostly mobile)
    if (canShareFiles) {
      try {
        await navigator.share({
          title: "My Doomgo Card",
          text: captionText,
          files: [exportFile],
        });
        if (appSettings.haptics) vibrate(40);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.warn("Native share failed, falling back:", err);
      }
    }

    // Chrome desktop fallback: download + copy caption
    try {
      const a = document.createElement("a");
      a.href = exportUrl;
      a.download = "doomgo-card.png";
      document.body.appendChild(a);
      a.click();
      a.remove();

      await safeCopy(captionText);
      openConfirm("Image downloaded + caption copied ✅", null);
      if (appSettings.haptics) vibrate(40);
    } catch (e) {
      console.error("Download fallback failed:", e);
      openConfirm("Couldn’t download. Try Safari or long-press the image.", null);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] bg-[#1A1E2C]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-black/20 p-2 rounded-full text-white hover:bg-black/30 z-50"
        >
          <X size={18} />
        </button>

        <div className="overflow-y-auto scrollbar-hide flex-1">
          <div
            ref={cardRef}
            className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-center relative overflow-hidden"
          >
            <GeometricShape
              type="cube"
              className="top-2 right-2 opacity-30 w-12 h-12 z-0"
            />

            <h2 className="relative z-10 text-white text-2xl font-black mb-4 tracking-tight">
              MY DOOMGO<br />CARD
            </h2>

            <div className="grid grid-cols-5 gap-1 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
              {myBoard.map((sq, idx) => {
                const isWinningLine = winningIndices.includes(idx);
                const isFree = idx === 12;
                const hasDoomgo = winCount > 0;
                const freeIsGold = isFree && hasDoomgo;
                const showCrown = isFree || isWinningLine;

                return (
                  <div
                    key={sq.id}
                    className={`relative aspect-square rounded-[4px] flex items-center justify-center p-[2px] ${
                      sq.hit
                        ? (isWinningLine || freeIsGold)
                          ? "bg-yellow-400 text-white"
                          : "bg-indigo-500 text-white"
                        : "bg-white/30 text-white"
                    }`}
                  >
                    {showCrown && (
  <Crown
    size={7}
    className="absolute top-[1px] left-[1px] text-yellow-300 drop-shadow-sm"
  />
)}

{sq.hit && (
  <Check
    size={6}
    className="absolute bottom-[1px] right-[1px] text-white/90"
  />
)}

                    <span className="text-[5px] font-bold leading-none overflow-hidden select-none">
                      {sq.text.slice(0, 8)}..
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-between items-center text-white/80 text-xs font-bold">
              <span>{BRAND.socials.tiktok}</span>
              <span>{Math.round((myBoard.filter(s=>s.hit).length/25)*100)}% Complete</span>
            </div>
          </div>

          <div className="p-6 bg-white text-center">
            <div className="bg-gray-50 rounded-xl p-3 text-left border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Caption</label>
                <button
                  onClick={genCaption}
                  disabled={loadingCaption}
                  className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:text-purple-800"
                >
                  {loadingCaption ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  Magic Gen
                </button>
              </div>

              <textarea
                className="w-full bg-transparent text-sm text-gray-600 font-medium resize-none focus:outline-none h-16 select-text"
                placeholder="Check out my 2026 Bingo card..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                autoComplete="on"
                autoCorrect="on"
                autoCapitalize="sentences"
              />
            </div>
          </div>
        </div>

{showSponsored && (
  <div className="px-6 pb-6 bg-white">
    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
      Sponsored
    </div>

    <AdSlot
      client="ca-pub-3803731780577395"
      slot="1214488599"
      className="rounded-2xl overflow-hidden"
    />
  </div>
)}


        <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0 z-10">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200"
          >
            Close
          </button>

          <button
            onClick={handleShare}
            disabled={exporting}
            className="flex-1 py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            {exporting ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            {exporting ? "Preparing…" : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
};


  const EventModal = () => {
      const liveSquare = myBoard.find(s => s.id === selectedSquare?.id) || selectedSquare;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in">
            <SoftCard className="w-full max-w-sm !p-0 overflow-hidden shadow-2xl relative">
                <button onClick={() => setSelectedSquare(null)} className="absolute top-4 right-4 bg-black/20 p-2 rounded-full text-white hover:bg-black/40 z-50"><X size={20}/></button>
                <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600 relative p-4 flex justify-end"><div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl">{liveSquare.hit ? '🎉' : '🔮'}</div></div>
                <div className="pt-10 px-6 pb-6 text-center">
                    <h3 className="text-xl font-black text-[#1A1E2C] mb-2 leading-tight">{liveSquare.text}</h3>
                    <div className="flex justify-center gap-2 mb-6"><span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase">{liveSquare.category}</span><span className="px-3 py-1 bg-blue-50 rounded-full text-[10px] font-bold text-blue-500 uppercase">{liveSquare.confidence}% Conf.</span></div>
                    {newsHeadline && (<div className="bg-black text-white p-3 mb-4 text-left font-mono text-xs border-l-4 border-red-500 relative"><span className="absolute -top-2 -left-1 bg-red-600 text-[8px] font-bold px-1">LIVE</span>{newsHeadline}</div>)}
                    <div className="bg-indigo-50 p-4 rounded-2xl mb-6 border border-indigo-100 text-left">
                        <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Sparkles size={12}/> The Oracle</span><div className="flex gap-2"><button onClick={() => generateHeadline(liveSquare.text)} className="text-indigo-300 hover:text-indigo-600"><Newspaper size={14}/></button>{liveSquare.oracleText && (
  <button
    onClick={(e) => {
      e.stopPropagation();
      copyToClipboard(liveSquare.oracleText);
    }}
    className="text-indigo-300 hover:text-indigo-600"
    title="Copy Oracle"
  >
    <Copy size={14}/>
  </button>
)}

</div></div>
                        {liveSquare.oracleText ? (<p className="text-sm text-indigo-900 italic">"{liveSquare.oracleText}"</p>) : (<button onClick={() => askOracle(liveSquare.id, liveSquare.text)} disabled={isOracleLoading} className="text-xs font-bold text-indigo-500 w-full text-center py-2 hover:bg-indigo-100 rounded-lg transition-colors">{isOracleLoading ? "Consulting..." : "Ask for judgment ->"}</button>)}
                    </div>
                    <button onClick={() => toggleHit(liveSquare.id)} className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all ${liveSquare.hit ? 'bg-gray-100 text-gray-500' : 'bg-[#1A1E2C] text-white'}`}>{liveSquare.hit ? 'Unmark Event' : 'CONFIRM EVENT'}</button>
                </div>
            </SoftCard>
        </div>
      );
  };
const DisclaimerModal = () => {
  if (!showDisclaimerModal) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
      <SoftCard className="w-full max-w-sm p-6 shadow-2xl bg-white">
        <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">
          Disclaimer
        </p>
        <p className="text-sm font-bold text-gray-700 leading-snug">
  {msg("globalDisclaimer", "Doomgo is a game.")}
</p>

        <button
          onClick={() => {
            localStorage.setItem("doomgo_disclaimer_dismissed", "true");
            setShowDisclaimerModal(false);
          }}
          className="w-full mt-5 py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg"
        >
          Got it
        </button>
      </SoftCard>
    </div>
  );
};

const RoastModal = () => {
  const roastText =
    typeof roastData === "string"
      ? roastData
      : (roastData?.text ?? roastData?.message ?? String(roastData ?? ""));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
      <SoftCard className="w-[min(92vw,720px)] max-h-[82vh] overflow-hidden shadow-2xl relative bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-100">
        <button
          onClick={() => setShowRoast(false)}
          className="absolute top-4 right-4 bg-white p-2 rounded-full text-gray-500 hover:bg-gray-100 shadow-sm z-10"
        >
          <X size={18} />
        </button>

        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-3xl shadow-inner">
            🔥
          </div>
        </div>

        <h3 className="text-2xl font-black text-center text-[#1A1E2C] mb-2">
          Doomgo Report
        </h3>

        {/* ✅ Scrollable roast text area */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 mb-6 p-4 max-h-[52vh] overflow-y-auto">
          <p className="text-sm text-gray-700 font-medium leading-relaxed whitespace-pre-wrap italic">
            {roastText ? `"${roastText}"` : "…"}
          </p>
        </div>

        <button
          onClick={() => setShowRoast(false)}
          className="w-full py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg"
        >
          I accept my fate
        </button>
      </SoftCard>
    </div>
  );
};
  const EditModal = () => {
      const [text, setText] = useState(editingSquare.text);
      const [isRewriting, setIsRewriting] = useState(false);
      const magicRewrite = async () => {
          if (!consumeAiCredit()) return;
          setIsRewriting(true);
          try { const res = await callGemini(`Rewrite: "${text}". Make it funnier/chaotic. Return ONLY text.`); setText(res.replace(/"/g, '').trim()); } catch(e) { openConfirm("Magic failed.", null); } finally { setIsRewriting(false); }
      };
      return (<div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in"><SoftCard className="w-full max-w-sm p-6 shadow-2xl relative"><button onClick={() => setEditingSquare(null)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full text-gray-500 hover:bg-gray-200"><X size={18}/></button><h3 className="text-xl font-black text-[#1A1E2C] mb-4">Edit Card</h3><div className="relative">
        <textarea
  value={text}
  onChange={(e) => setText(e.target.value)}
  className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 font-bold text-gray-700 mb-4 h-32 focus:outline-none focus:border-blue-500 resize-none select-text"
  autoComplete="on"
  autoCorrect="on"
  autoCapitalize="sentences"
/>

<button onClick={magicRewrite} disabled={isRewriting} className="absolute bottom-6 right-2 bg-purple-100 text-purple-600 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-purple-200">{isRewriting ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>} Magic Swap</button></div><div className="flex gap-2"><button onClick={() => setEditingSquare(null)} className="flex-1 py-3 bg-gray-100 text-gray-500 font-bold rounded-xl">Cancel</button><button onClick={() => { saveEdit(text); }} className="flex-1 py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg">Save</button></div></SoftCard></div>);
  };

  function DoomgoPlusCard() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id;

        // ✅ supports both logged-in users AND anonymous device users
        let q = supabase.from("profiles").select("is_pro");
        if (uid) q = q.eq("id", uid);
        else q = q.eq("device_id", getDeviceId());

        const { data: prof } = await q.maybeSingle();
        setIsPro(!!prof?.is_pro);
      } catch (e) {
        console.warn("Pro check failed:", e);
        setIsPro(false);
      }
    };
    run();
  }, []);

  if (isPro) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6">
        <div className="text-slate-900 font-black text-lg">Doomgo Plus</div>
        <div className="text-slate-500 text-sm mt-1">
          Active ✅ No ads • Unlimited AI • Bonus boards
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-slate-900 font-black text-lg">Doomgo Plus</div>
          <div className="text-slate-500 text-sm mt-1">
            No ads • Unlimited AI • Theme packs • Holiday boards
          </div>
        </div>
        <div className="text-[#6A4DFF] font-black">$4.99</div>
      </div>

      <button
        onClick={async () => {
          setLoading(true);
          try {
            await startCheckout();
            // usually redirects; if not, stop loading
            setLoading(false);
          } catch (e) {
            setLoading(false);
            openConfirm(e?.message || "Checkout failed.", null);
          }
        }}
        disabled={loading}
        className="mt-4 w-full bg-[#6A4DFF] text-white font-bold py-3 rounded-2xl disabled:opacity-60"
      >
        {loading ? "Opening Stripe…" : "Upgrade to Plus"}
      </button>

      <div className="text-xs text-slate-400 mt-3">
        Cancel anytime. Unlocks future theme packs + bonus boards as they drop.
      </div>
    </div>
  );
}

const ProfileView = () => (
  <div className="pb-32 pt-8 px-6 bg-transparent min-h-full relative">
    <GeometricShape type="sphere" className="top-16 -left-10 opacity-[0.22] scale-75" />
<GeometricShape type="pyramid" className="bottom-16 -right-8 opacity-[0.20]" />

    {isEditingProfile ? (
      <SoftCard className="mb-8">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold">Edit Profile</h3>
          <button onClick={() => setIsEditingProfile(false)}>
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          {/* NAME FIELD */}
          <div>
            <label className="text-xs font-bold text-gray-500">Name</label>
            <input
              value={draftProfile.name}
              onChange={(e) =>
                setDraftProfile({ ...draftProfile, name: e.target.value })
              }
              className="w-full p-2 border rounded-lg bg-gray-50 text-sm font-bold select-text"
            />
          </div>

          {/* AVATAR FIELD */}
          <div>
            <label className="text-xs font-bold text-gray-500">Avatar</label>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex-1 p-3 border rounded-lg bg-gray-50 text-sm font-bold text-gray-600 flex items-center justify-center gap-2"
              >
                <Upload size={16} /> Upload Photo
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                accept="image/*"
              />
              <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-200">
                <img
                  src={
                    draftProfile.customImage ||
                    userProfile.customImage ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.seed}`
                  }
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            {(draftProfile.customImage || userProfile.customImage) && (
              <button
                onClick={() =>
                  setDraftProfile({ ...draftProfile, customImage: null })
                }
                className="text-xs text-red-500 font-bold mt-2"
              >
                Remove Custom Photo
              </button>
            )}
          </div>

          {/* SAVE BUTTON */}
          <button
            onClick={() => {
              setUserProfile(prev => ({
  ...prev,
  ...draftProfile,
  customImage: draftProfile.customImage ?? prev.customImage
}));
   // commit changes
              setIsEditingProfile(false);     // close editor
            }}
            className="w-full py-3 bg-black text-white rounded-xl font-bold text-sm"
          >
            Save Changes
          </button>
        </div>
      </SoftCard>
    ) : (
      <div className="flex flex-col items-center mb-8 relative">
        <button
  onClick={() => {
    // snapshot current profile into the draft
    setDraftProfile(userProfile);
    setIsEditingProfile(true);
  }}
  className="absolute top-0 right-0 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-blue-500"
>
  <Edit3 size={16} />
</button>

        <div className="w-24 h-24 rounded-full p-1 bg-white shadow-xl mb-4 relative overflow-hidden">
          <img
            src={
              userProfile.customImage ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.seed}`
            }
            alt="avatar"
            className="w-full h-full rounded-full bg-blue-100 object-cover"
          />
        </div>
        <h2 className="text-2xl font-bold text-[#1A1E2C]">
          {userProfile.name}
        </h2>
        <p className="text-gray-500 text-sm">{userProfile.bio}</p>

        {/* ⚠️ Early Beta + 🔒 Privacy Policy under profile picture */}
        <div className="mt-4 flex items-center justify-center gap-4 opacity-80 relative z-[80]">
          {/* ⚠️ Early Beta */}
          <div
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
              setShowPrivacyTooltip(false);
              setShowBetaTooltip((v) => !v);
            }}
          >
            <button className="px-3 py-1 rounded-full bg-white/70 border border-yellow-200 shadow-sm backdrop-blur-sm text-sm flex items-center justify-center">
              <span className="text-lg">⚠️</span>
            </button>

            {showBetaTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-72 p-3 bg-white rounded-2xl shadow-xl border text-[11px] text-gray-700 z-[90]">
                <p className="font-bold mb-1 text-yellow-600">Early Beta Notice</p>
                <p className="mb-2">
  {msg(
    "betaNotice",
    `This is an early beta build — expect occasional bugs or weird behavior.`
  )}
</p>

<div className="flex flex-wrap gap-2 text-[11px] font-bold">
  <a
    href={BRAND_LINKS.site}
    target="_blank"
    rel="noreferrer"
    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
  >
    doomgo.world
  </a>

  <a
    href={BRAND_LINKS.tiktok}
    target="_blank"
    rel="noreferrer"
    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
  >
    TikTok {BRAND.socials.tiktok}
  </a>

  <a
    href={BRAND_LINKS.instagram}
    target="_blank"
    rel="noreferrer"
    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
  >
    IG {BRAND.socials.instagram}
  </a>

  <a
    href={BRAND_LINKS.threads}
    target="_blank"
    rel="noreferrer"
    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200"
  >
    Threads {BRAND.socials.threads}
  </a>

</div>



              </div>
            )}
          </div>

          {/* 🔒 Privacy Policy */}
          <div
            className="relative"
            onClick={(e) => {
              e.stopPropagation();
              setShowBetaTooltip(false);
              setShowPrivacyTooltip((v) => !v);
            }}
          >
            <button className="px-3 py-1 rounded-full bg-white/70 border border-blue-200 shadow-sm backdrop-blur-sm text-sm flex items-center justify-center">
              <span className="text-lg">🔒</span>
            </button>

            {showPrivacyTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 p-3 bg-white rounded-2xl shadow-xl border text-[11px] text-gray-700 z-[90]">
                <p className="font-bold mb-1 text-blue-600">Privacy Policy</p>
                <ul className="space-y-1 list-disc ml-4">
                  <li>
                    Your Bingo cards, hits, and settings are stored locally on your
                    device using <code>localStorage</code>.
                  </li>
                  <li>
                    There are no accounts, passwords, trackers, or third-party
                    analytics in this beta.
                  </li>
                  <li>
                    When you generate decks, headlines, or roasts, the card text is
                    sent to an AI model (Gemini) via a Netlify server function so it
                    can respond. Nothing is permanently stored, shared, or sold.
                  </li>
                  <li>
                    Bug reports only include what YOU manually send. If something
                    looks broken, hit the ⚠️ and reach out — I actually read those.
                  </li>
                  <li>
                    An automatic bug-report button (the 🐞) is coming soon. Right now
                    everything is kept intentionally simple.
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

<DoomgoPlusCard />

<h3 className="text-lg font-bold text-[#1A1E2C] mb-4 mt-4">Tools</h3>

    <h3 className="text-lg font-bold text-[#1A1E2C] mb-4 mt-4">Tools</h3>
<div className="space-y-3 mb-12">
  <SoftCard className="!p-4">
    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Backup</p>

    <div className="flex gap-2">
      <button
        onClick={exportBackup}
        className="flex-1 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"
      >
        <Save size={16} /> Export
      </button>

      <button
        onClick={() => backupInputRef.current?.click()}
        className="flex-1 py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"
      >
        <Upload size={16} /> Import
      </button>

      <input
        ref={backupInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(e) => importBackupFromFile(e.target.files?.[0])}
      />
    </div>

    <p className="text-[11px] text-gray-400 mt-2">
      Export saves your boards + profile to a file. Import restores it on this device.
    </p>
  </SoftCard>

  <SoftCard className="!p-4">
    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Quick Actions</p>

    <button
      onClick={() => copyToClipboard("https://doomgo.world")}
      className="w-full py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-200 flex items-center justify-center gap-2"
    >
      <Copy size={16} /> Copy Doomgo Link
    </button>
  </SoftCard>

  <button
    onClick={resetApp}
    className="w-full py-3 rounded-2xl border-2 border-red-100 text-red-500 font-bold text-sm flex items-center justify-center gap-2 mt-2"
  >
    <Trash2 size={16} /> Reset App Data
  </button>
</div>

  </div>

  
);

if (loading || !adminState) {
  return (
    <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">
      Loading Doomgo Control Matrix…
    </div>
  );
}

  // --- RENDER ---

  if (currentScreen === 'onboarding') return OnboardingView();

  return (
  <div className="h-screen w-full bg-[#F5F7FA] overflow-hidden font-sans text-[#1A1E2C] relative">
    {/* ✅ TRUE background layer (always behind screens) */}
    <div className="absolute inset-0 pointer-events-none -z-10">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#E2E8F0] to-transparent" />

      {/* App-wide geometry */}
      <GeometricShape type="cube" className="-top-24 -right-24 opacity-[0.16]" />
      <GeometricShape type="sphere" className="-bottom-28 -left-28 opacity-[0.14]" />
      <GeometricShape type="pyramid" className="top-[40%] -right-10 opacity-[0.12]" />
    </div>

    {/* ✅ Content layer (above bg) */}
    <div className="h-full overflow-y-auto scrollbar-hide pb-24 relative">
  {activeTab === 'home' && HomeView()}
  {activeTab === 'create' && CreateView()}
  {activeTab === 'profile' && ProfileView()}
</div>

{/* ✅ Legal links (AdSense-friendly) */}
    <div className="fixed bottom-2 left-0 right-0 flex justify-center gap-3 text-[10px] text-slate-400 z-30">
      <a href="/privacy.html" className="hover:text-slate-600 underline" target="_blank" rel="noreferrer">
        Privacy Policy
      </a>
    </div>

    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#1A1E2C] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-12 z-40">
      <button onClick={() => setActiveTab('home')} className={activeTab==='home' ? 'text-white' : 'text-gray-500'}>
        <Home size={24}/>
      </button>
      <button onClick={() => setActiveTab('create')} className="bg-blue-500 p-3 rounded-full -mt-10 border-[6px] border-[#F5F7FA] shadow-lg">
        <Plus size={28} className="text-white"/>
      </button>
      <button type="button" onClick={openShareModal} className="text-gray-500 hover:text-white">
  <Share2 size={24}/>
</button>

    </div>

    {selectedSquare && <EventModal />}
    {editingSquare && <EditModal />}
    {showShare && <SharePreview isPro={isPro} onClose={() => setShowShare(false)} />}
    {showRoast && <RoastModal />}
    {confirmModal.show && <ConfirmationModal />}
    {showDisclaimerModal && <DisclaimerModal />}
    {showConfetti && (
      <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center bg-black/20">
        <h1
          className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 drop-shadow-2xl animate-bounce tracking-tighter"
          style={{ filter: 'drop-shadow(0 4px 0px rgba(0,0,0,0.2))' }}
        >
          DOOMGO!
        </h1>
      </div>
    )}

    <style>{`
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .animate-fade-in { animation: fadeIn 0.3s ease-out; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

      @keyframes doomgoBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      .doomgo-bounce {
        animation: doomgoBounce 0.45s ease-in-out infinite;
      }
    `}</style>
  </div>
);

}
