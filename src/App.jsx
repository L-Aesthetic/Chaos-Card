import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Plus, User, Settings,  
  Check, Share2, Sparkles, Zap, 
  Crown, Edit3, Calendar, Heart, 
  X, Shuffle, Loader2, ArrowRight, Volume2, 
  Flame, Skull, Trash2, Wand2, Newspaper, 
  RotateCcw, Save, Play, Globe, Activity, Copy,
  Upload, Lock, Unlock, RefreshCw, History, AlertTriangle
} from 'lucide-react';

/**
 * BINGO OF THE YEAR - GOLD MASTER (COMPILATION FIXED)
 * * Features:
 * - 🚫 Fixed Reference Errors (Restored missing views).
 * - ⚡ Quick Refresh works reliably (Instant Fallback).
 * - 🧠 Oracle remembers predictions per card.
 * - 💾 Restore 2026 works by strictly separating Core vs Active state.
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

// FALLBACK DECKS
const MOCK_DECKS = {
    daily: ["Spilled Coffee", "Forgot Password", "Zoom Glitch", "Missed Bus", "Rain/No Umbrella", "Phone Died", "Stubbed Toe", "Sent Wrong Text", "Free Donut", "Found $5", "Complimented", "Good Hair Day", "FREE SPACE", "Hit Green Lights", "Package Arrived", "Meme Viral", "Dog Saw Me", "Cat Purred", "Pizza Night", "Found Keys", "Woke up Early", "Gym PR", "Book Finished", "New Song Obsession", "Nice Sunset"],
    weekly: ["Finished a Book", "Cooked a Meal", "Called Mom", "Zero Inbox", "Went for a Run", "Saw a Movie", "No Social Media Day", "Met a Friend", "Cleaned House", "Watered Plants", "Slept 8hrs", "Tried New Food", "FREE SPACE", "Rainy Day", "Sunny Day", "Traffic Jam", "Forgot Wallet", "Bought a Treat", "Wrote in Journal", "Took a Photo", "Heard Fav Song", "Pet a Dog", "Did Laundry", "Paid Bills", "Woke up Happy"],
    monthly: ["Pay Raise", "New Project", "Office Drama", "Birthday Party", "Unexpected Bill", "New Neighbor", "Internet Outage", "Fav Show Cancelled", "Viral Trend", "Local News Event", "Weather Freakout", "Politician Scandal", "FREE SPACE", "New Cafe Opens", "Friend Visits", "Lost Wallet", "Found Wallet", "Car Trouble", "Good Date", "Bad Date", "New Hobby", "Movie Premiere", "Concert Ticket", "Sale Shopping", "Tech Upgrade"],
    chaos: ["Aliens Land", "AI President", "Ocean Evaporates", "Gravity Glitch", "Dinosaurs Return", "Telepathy Real", "Moon Turns Pink", "Time Travel", "Robot Uprising", "Cats Talk", "Plants Walk", "Money worthless", "FREE SPACE", "Mars Colony", "Flying Cities", "Immortality Pill", "Global Teleport", "Dream Recorder", "Weather Control", "New Color Found", "Ghost Confirmed", "Dragon Sighted", "Magic Real", "Atlantis Rises", "Simulation Glitch"]
};

const MOCK_ROASTS = [
    "You're playing it safe. 2026 is leaving you behind while you wait for a sign.",
    "A respectable amount of chaos, but I expected more from you. Step it up.",
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
    // data.result is the raw Gemini response from the function
    return (
      data.result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "The oracle is silent."
    );
  } catch (error) {
    console.warn("Gemini API Error:", error);
    throw error;
  }
};

/*
// TTS Handler
const callGeminiTTS = async (text) => {
  if (!apiKey) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } }
    }
  };
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) return pcmToWav(audioData);
  } catch (e) {
    console.error("TTS failed", e);
  }
  return null;
}; */

const vibrate = (ms = 10) => {
  if (navigator.vibrate) navigator.vibrate(ms);
};

// --- UI COMPONENTS ---

const SoftCard = ({ children, className = "", onClick, noPadding = false }) => (
  <div 
    onClick={(e) => { if(onClick) { vibrate(5); onClick(e); } }}
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
        onClick={(e) => { e.stopPropagation(); vibrate(5); onChange(!checked); }}
        className={`w-12 h-7 rounded-full flex items-center px-1 cursor-pointer transition-colors ${checked ? 'bg-[#1A1E2C]' : 'bg-gray-300'}`}
    >
        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform transform ${checked ? 'translate-x-5' : ''}`}></div>
    </div>
);

// --- DATA ---

const INITIAL_PREDICTIONS = [
  "Celebrity runs for President", "AI writes a hit song", "Aliens confirmed", "New Ocean discovered", "Flying cars prototype",
  "Social app shuts down", "Billionaire cage fight", "Volcano eruption", "Crypto crash", "Viral dance craze",
  "Global internet outage", "Time travel proven", "CHAOS CARD: 2026", "Oasis Reunion Tour", "Mars colony started",
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

  // --- STATE PERSISTENCE ---

const [userProfile, setUserProfile] = useState(() => {
    try { 
      return JSON.parse(localStorage.getItem('bingo_user_profile')) || { 
        name: "Stranger", 
        seed: "Stranger", 
        bio: "Ready for 2026", 
        customImage: null 
      }; 
    }
    catch { 
      return { 
        name: "Stranger", 
        seed: "Stranger", 
        bio: "Ready for 2026", 
        customImage: null 
      }; 
    }
});

  // Draft profile used while editing so typing feels instant
  const [draftProfile, setDraftProfile] = useState(userProfile);

  // Whenever we open the editor, refresh the draft from saved profile
  useEffect(() => {
    if (isEditingProfile) {
      setDraftProfile(userProfile);
    }
  }, [isEditingProfile, userProfile]);


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
      // If all tiles are at 50, treat it as legacy and re-roll confidence
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

      return stored;
    }
    return INITIAL_BOARD;
  } catch {
    return INITIAL_BOARD;
  }
});


  // Initialize coreBoard properly if empty
  const [coreBoard, setCoreBoard] = useState(() => {
      try { 
          const saved = JSON.parse(localStorage.getItem('bingo_core_board'));
          return (Array.isArray(saved) && saved.length > 0) ? saved : INITIAL_BOARD; 
      }
      catch { return INITIAL_BOARD; }
  });

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
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
  const calculateWinningLines = (board) => {
      if(!board) return 0;
      const lines = [
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // Rows
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // Cols
        [0,6,12,18,24], [4,8,12,16,20] // Diagonals
      ];
      let count = 0;
      lines.forEach(line => {
          if (line.every(i => board[i].hit)) count++;
      });
      return count;
  };

  const [winningIndices, setWinningIndices] = useState([]);
  const previousWinCount = useRef(calculateWinningLines(myBoard));

  const fileInputRef = useRef(null);
  
  // Effects
  useEffect(() => localStorage.setItem('bingo_active_board', JSON.stringify(myBoard)), [myBoard]);
  useEffect(() => localStorage.setItem('bingo_user_profile', JSON.stringify(userProfile)), [userProfile]);
  useEffect(() => localStorage.setItem('bingo_settings', JSON.stringify(appSettings)), [appSettings]);
  useEffect(() => localStorage.setItem('bingo_board_type', activeBoardType), [activeBoardType]);
  useEffect(() => localStorage.setItem('bingo_core_board', JSON.stringify(coreBoard)), [coreBoard]);
  useEffect(() => localStorage.setItem('bingo_board_locked', isBoardLocked), [isBoardLocked]);
  useEffect(() => localStorage.setItem('bingo_ai_credits', aiCredits.toString()), [aiCredits]);
  useEffect(() => localStorage.setItem('bingo_history', JSON.stringify(boardHistory)), [boardHistory]);

  // 🔮 First-time users get an AI-generated board
  useEffect(() => {
    const storedBoard = localStorage.getItem('bingo_active_board');
    if (!storedBoard) {
      // First time on this device → generate a chaos/yearly board
      generateDeck('yearly', true); // or 'chaos'
    }
  }, []);

  // Initialize win count on mount
  useEffect(() => {
      previousWinCount.current = calculateWinningLines(myBoard);
  }, []);

  // Win Detection
  useEffect(() => {
    const lines = [
        [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24], // Rows
        [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24], // Cols
        [0,6,12,18,24], [4,8,12,16,20] // Diagonals
    ];

    const currentWinningIndices = new Set();
    let winningLinesCount = 0;

    lines.forEach(line => {
        if (line.every(i => myBoard[i].hit)) {
            winningLinesCount++;
            line.forEach(i => currentWinningIndices.add(i));
        }
    });

    setWinningIndices(Array.from(currentWinningIndices));

    if (winningLinesCount > previousWinCount.current) {
        if (!showConfetti) {
            setShowConfetti(true);
            vibrate(200);
            setTimeout(() => setShowConfetti(false), 4000);
        }
    }
    previousWinCount.current = winningLinesCount;
  }, [myBoard]);

  // --- HELPERS ---

  const openConfirm = (message, action) => {
      setConfirmModal({ show: true, message, action });
  };

  const closeConfirm = () => {
      setConfirmModal({ show: false, message: "", action: null });
  };

  const confirmAction = () => {
      if (confirmModal.action) confirmModal.action();
      closeConfirm();
  };

  // --- ACTIONS ---

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
          setMyBoard(lastState.board);
          setActiveBoardType(lastState.type);
          
          setBoardHistory(prev => prev.slice(0, -1));
          previousWinCount.current = calculateWinningLines(lastState.board); 
          if(appSettings.haptics) vibrate(50);
      });
  };

  const handleTileClick = (sq) => {
      // Edit Mode
      if (mode === 'edit') {
          if (sq.locked) {
              vibrate(50); 
              return;
          }
          if (isBoardLocked) {
              openConfirm("Board is locked! Unlock it first to edit.", null);
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
      if (newText && editingSquare) {
          const newBoard = myBoard.map(s => s.id === editingSquare.id ? { ...s, text: newText } : s);
          setMyBoard(newBoard);
          if (activeBoardType === 'yearly') setCoreBoard(newBoard);
          vibrate(20);
      }
      setEditingSquare(null);
  };

  const toggleHit = (id) => {
      const newBoard = myBoard.map(s => s.id === id ? { ...s, hit: !s.hit } : s);
      setMyBoard(newBoard);
      if (activeBoardType === 'yearly') setCoreBoard(newBoard);
      
      setSelectedSquare(null); 
      if(appSettings.haptics) vibrate(20);
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
      setIsBoardLocked(!isBoardLocked);
      if(!isBoardLocked) setMode('play'); 
      if(appSettings.haptics) vibrate(20);
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
      if (aiCredits > 0) {
          setAiCredits(prev => prev - 1);
          return true;
      }
      return false;
  };

  const quickRefresh = async () => {
      if (aiCredits <= 0) {
          openConfirm("No AI credits left (5/5 used). Reset app to restore?", () => resetApp());
          return;
      }
      
      const targetType = activeBoardType === 'yearly' ? 'chaos' : activeBoardType;

      openConfirm(`Quick Refresh: Regenerate this board (${targetType})? Cost: 1 Credit.`, async () => {
          if (consumeAiCredit()) {
              setIsRefreshing(true);
              saveToHistory(); 
              await generateDeck(targetType, true); 
              setIsRefreshing(false);
          }
      });
  }

  // DECK GENERATION
  const generateDeck = async (type, autoApply = false) => {
      setIsGenerating(true);
      let prompt = "Generate 25 unique events.";
      if (type === 'daily') prompt = "Generate 25 funny, relatable, minor events that could happen TODAY (e.g., 'Spilled coffee'). Unique items.";
      if (type === 'weekly') prompt = "Generate 25 events for THIS WEEK (e.g., 'Finished a book', 'Went for a run'). Unique items.";
      if (type === 'monthly') prompt = "Generate 25 specific events or news headlines for NEXT MONTH. Unique items.";
      if (type === 'chaos' || type === 'yearly') prompt = "Generate 25 unhinged, sci-fi, or absurd global events for 2026. Unique items.";

      try {
          const res = await callGemini(
  prompt + ` Return ONLY a JSON array of exactly 25 objects with this shape: { "text": string, "category": string, "confidence": a number from 1 to 100 }. The item at index 12 must be text: "FREE SPACE". No markdown, no extra text.`
);
          const clean = res.replace(/```json|```/g, '').trim();
          const data = JSON.parse(clean);
          
          if (!Array.isArray(data) || data.length < 25) throw new Error("Invalid Data");
          
          if (autoApply) {
              applyNewBoard(data, type);
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
          
          if (autoApply) {
              applyNewBoard(mockData.map((item,i)=>({ ...item, id:i, hit: i===12, locked: i===12 })), type);
          } else {
            showDeckPreview(mockData, "New Deck", type);
          }
      } finally {
          setIsGenerating(false);
      }
  };

  const applyNewBoard = (data, type) => {
      const newBoard = data.map((item, i) => ({
          id: i,
          text: item.text,
          category: item.category || "General",
          confidence: Number(item.confidence) || Math.floor(Math.random() * 100) + 1,
          hit: i === 12,
          locked: i === 12,
          oracleText: null
      }));
      
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
      const newBoard = data.slice(0, 25).map((item, i) => ({
          id: i,
          text: item.text,
          category: item.category || "General",
          confidence: Number(item.confidence) || Math.floor(Math.random() * 100) + 1,
          hit: i === 12, // Auto hit center
          locked: i === 12,
          oracleText: null
      }));
      setPreviewDeck(newBoard);
      setPreviewTitle(title);
      setPreviewType(type);
  };

  const activatePreviewDeck = () => {
      if (!consumeAiCredit()) return;
      
      saveToHistory();

      if (activeBoardType === 'yearly') {
          setCoreBoard(myBoard); 
      }
      
      setMyBoard(previewDeck);
      previousWinCount.current = 0; 

      setActiveBoardType(previewType); 
      
      setPreviewDeck(null);
      setActiveTab('home');
      if(appSettings.haptics) vibrate(100);
  }

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

  const generateChaosRoast = async () => {
      if (!consumeAiCredit()) return;
      setIsOracleLoading(true);
      const hits = myBoard.filter(s => s.hit && !s.locked).map(s => s.text).join(", ");
      const misses = myBoard.filter(s => !s.hit && !s.locked).map(s => s.text).join(", ");
      
      try {
          const prompt = `You are a chaotic, snarky Bingo announcer. The user has achieved: ${hits || "Nothing"}. Waiting on: ${misses}. Roast their year so far.`;
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
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-fade-in">
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
              <p className="text-blue-500 font-bold tracking-widest uppercase mb-4 text-sm">2026 Edition</p>
              <h1 className="text-7xl font-black text-[#1A1E2C] leading-[0.9] tracking-tighter mb-6">Welcome<br/>To Chaos.</h1>
              <p className="text-gray-500 font-medium text-lg max-w-xs">Predict the future. Track the madness.<br/>Play Bingo Of the Year!</p>
          </div>
          <button onClick={() => setCurrentScreen('app')} className="w-20 h-20 rounded-full bg-[#1A1E2C] text-white flex items-center justify-center shadow-2xl z-20"><ArrowRight size={32} /></button>
      </div>
  );

  const HomeView = () => (
      <div className="pb-32 pt-12 px-6 bg-[#F5F7FA] min-h-full relative">
          <div className="flex justify-between items-start mb-6">
              <div><h2 className="text-4xl font-black text-[#1A1E2C] leading-none tracking-tight">Hello,<br/>{userProfile.name}</h2><p className="text-gray-400 font-medium text-lg mt-1">Ready for chaos?</p></div>
              <div onClick={() => setActiveTab('profile')} className="w-12 h-12 rounded-full bg-white shadow-md p-1 cursor-pointer active:scale-95 transition-transform overflow-hidden"><img src={userProfile.customImage || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.seed}`} className="w-full h-full rounded-full bg-blue-100 object-cover" /></div>
          </div>
          <div className="flex items-center justify-between mb-6">
              <div className="px-3 py-1 bg-white rounded-full border border-gray-200 shadow-sm flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${activeBoardType === 'yearly' ? 'bg-indigo-500' : 'bg-green-500'}`}></span><span className="text-xs font-bold text-gray-600 uppercase tracking-wider">{activeBoardType} Board</span></div>
              {activeBoardType !== 'yearly' && (<button onClick={restoreCoreBoard} className="text-xs font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 active:scale-95 transition-transform"><RefreshCw size={10}/> Restore 2026</button>)}
          </div>
          <SoftCard className="mb-8 !p-5 flex items-center justify-between">
              <div><p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-1">Chaos Level</p><h3 className="text-4xl font-black text-[#1A1E2C]">{Math.round((myBoard.filter(s=>s.hit).length/25)*100)}%</h3></div>
              <div className="w-16 h-16 relative">
                <svg className="w-full h-full transform -rotate-90"><circle cx="32" cy="32" r="28" stroke="#E2E8F0" strokeWidth="6" fill="transparent" /><circle cx="32" cy="32" r="28" stroke="#3B82F6" strokeWidth="6" fill="transparent" strokeDasharray="175.9" strokeDashoffset={175.9 - (175.9 * (myBoard.filter(s => s.hit).length / 25))} strokeLinecap="round" /></svg>
              </div>
          </SoftCard>
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2"><h3 className="text-xl font-bold text-[#1A1E2C]">Active Board</h3>{isBoardLocked && <Lock size={14} className="text-gray-400"/>}</div>
              <div className="flex gap-2">
                  <button onClick={generateChaosRoast} className="p-2 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors active:scale-95" title="Roast"><Flame size={16} /></button>
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
                  const isCenter = idx === 12;
                  return (
                    <div key={sq.id} onClick={() => handleTileClick(sq)} className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-center cursor-pointer relative overflow-hidden transition-all active:scale-95 border-2 ${sq.hit ? (isWinningLine ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white border-white shadow-lg scale-105 z-10' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-white shadow-lg') : (mode === 'edit' ? 'bg-amber-50 border-dashed border-amber-300' : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50 border-white')}`}>
                        <div className={`w-1 h-1 rounded-full mb-1 ${sq.hit ? 'bg-white/50' : 'bg-gray-300'}`}></div>
                        <p className="text-[8px] font-bold leading-tight line-clamp-3 select-none">{sq.text}</p>
                        {sq.hit && !isWinningLine && <Check size={12} className="absolute bottom-1 right-1 opacity-50"/>}
                        {mode === 'edit' && !sq.locked && <Edit3 size={10} className="absolute top-1 right-1 text-amber-500"/>}
                        {(isCenter || isWinningLine) && <Crown size={10} className={`absolute top-1 right-1 ${isWinningLine ? 'text-white' : 'text-yellow-500'} opacity-80`} />}
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
            <div className="pb-32 pt-12 px-6 bg-[#F5F7FA] min-h-full">
                 <div className="flex items-center gap-4 mb-6"><button onClick={() => setPreviewDeck(null)} className="p-2 bg-gray-200 rounded-full"><ArrowRight className="rotate-180" size={20}/></button><h2 className="text-3xl font-black text-[#1A1E2C]">{previewTitle}</h2></div>
                 <div className="grid grid-cols-5 gap-2 mb-8 opacity-75 grayscale hover:grayscale-0 transition-all">
                    {previewDeck.map(sq => (<div key={sq.id} className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center text-center relative overflow-hidden bg-white shadow-sm border border-gray-100`}><p className="text-[8px] font-bold leading-tight line-clamp-3 select-none text-gray-600">{sq.text}</p>{sq.locked && <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50"><Crown size={12} className="opacity-50"/></div>}</div>))}
                </div>
                <div className="space-y-3"><button onClick={activatePreviewDeck} className="w-full py-4 bg-[#1A1E2C] text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 text-lg active:scale-95 transition-transform"><Play size={20} fill="currentColor"/> Start This Game</button><p className="text-center text-xs text-gray-400 px-4">Cost: 1 AI Credit ({aiCredits} remaining).</p></div>
            </div>
        )
    }
    return (
      <div className="pb-32 pt-12 px-6 bg-[#F5F7FA] min-h-full">
          <h2 className="text-3xl font-black text-[#1A1E2C] mb-6">New Deck</h2>
          <div className="space-y-4">
              <SoftCard onClick={() => generateDeck('daily')} className="!bg-gradient-to-br from-pink-500 to-rose-500 text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Daily Deck</h3><p className="text-xs text-pink-100">Predict today's small chaos.</p></div><Calendar size={24} className="opacity-80"/></div></SoftCard>
              <SoftCard onClick={() => generateDeck('weekly')} className="!bg-gradient-to-br from-orange-400 to-amber-500 text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Weekly Bingo</h3><p className="text-xs text-orange-100">Goals & Events for this week.</p></div><Calendar size={24} className="opacity-80"/></div></SoftCard>
              <SoftCard onClick={() => generateDeck('monthly')} className="!bg-gradient-to-br from-teal-500 to-emerald-500 text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Monthly Forecast</h3><p className="text-xs text-teal-100">What happens next month?</p></div><Calendar size={24} className="opacity-80"/></div></SoftCard>
              <SoftCard onClick={() => generateDeck('chaos')} className="!bg-[#1A1E2C] text-white cursor-pointer active:scale-95"><div className="flex items-center justify-between"><div><h3 className="font-bold text-lg">Ultimate 2026</h3><p className="text-xs text-gray-400">Global events & absurdity.</p></div><Globe size={24} className="opacity-80"/></div></SoftCard>
          </div>
          <p className="text-center text-xs font-bold text-gray-400 mt-6">AI Credits Remaining: {aiCredits}/5</p>
          {isGenerating && (<div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-50"><div className="flex flex-col items-center animate-fade-in"><Loader2 size={40} className="animate-spin text-[#1A1E2C] mb-4"/><p className="font-black text-[#1A1E2C] text-xl">Consulting Timeline...</p></div></div>)}
      </div>
    );
  };

  const SharePreview = ({ onClose }) => {
    const [caption, setCaption] = useState("");
    const [loadingCaption, setLoadingCaption] = useState(false);
    const genCaption = async () => {
        if(!apiKey) { setCaption("No API Key - Write your own caption!"); return; }
        setLoadingCaption(true);
        const hitCount = myBoard.filter(s=>s.hit).length;
        const hits = myBoard.filter(s=>s.hit && !s.locked).map(s=>s.text).slice(0,3).join(", ");
        try {
            const res = await callGemini(`Write a short, funny Instagram caption for my 2026 Bingo card. I have completed ${hitCount}/25 events. Highlights: ${hits || "None yet"}. Include hashtags.`);
            setCaption(res.replace(/"/g, ''));
        } catch(e) { setCaption("Error generating caption."); }
        finally { setLoadingCaption(false); }
    };
    const handleShare = async () => {
        const shareText = `My 2026 Bingo Card: ${Math.round((myBoard.filter(s=>s.hit).length/25)*100)}% Complete!\n\n${caption}\n\n#Bingo2026`;
        if (navigator.share) {
            try { await navigator.share({ title: '2026 Bingo', text: shareText }); } catch (e) {}
        } else {
            try {
                await navigator.clipboard.writeText(shareText);
                if(appSettings.haptics) vibrate(50);
                openConfirm("Caption copied to clipboard!", null);
            } catch(e) {}
        }
    };
    return (
      <div className="fixed inset-0 z-50 bg-[#1A1E2C]/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] overflow-hidden shadow-2xl relative max-h-[85vh] flex flex-col">
              <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 p-2 rounded-full text-white hover:bg-black/30 z-50"><X size={18}/></button>
              <div className="overflow-y-auto scrollbar-hide flex-1">
                  <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-center relative">
                      <GeometricShape type="cube" className="top-2 right-2 opacity-30 w-12 h-12" />
                      <h2 className="text-white text-2xl font-black mb-4 tracking-tight">MY CHAOS<br/>CARD</h2>
                      <div className="grid grid-cols-5 gap-1 bg-white/10 p-2 rounded-xl backdrop-blur-sm">
                          {myBoard.map((sq, idx) => {
                              const isWinningLine = winningIndices.includes(idx);
                              return (<div key={sq.id} className={`aspect-square rounded-[4px] flex items-center justify-center p-[2px] ${sq.hit ? (isWinningLine ? 'bg-yellow-400 text-black' : 'bg-white/90 text-gray-800') : 'bg-white/30 text-white'}`}><span className="text-[5px] font-bold leading-none overflow-hidden select-none">{sq.text.slice(0,8)}..</span></div>)
                          })}
                      </div>
                      <div className="mt-4 flex justify-between items-center text-white/80 text-xs font-bold"><span>@BingoOfTheYear</span><span>{Math.round((myBoard.filter(s=>s.hit).length/25)*100)}% Complete</span></div>
                  </div>
                  <div className="p-6 bg-white text-center">
                      <div className="bg-gray-50 rounded-xl p-3 text-left border border-gray-100">
                          <div className="flex justify-between items-center mb-2"><label className="text-xs font-bold text-gray-400 uppercase">Caption</label><button onClick={genCaption} disabled={loadingCaption} className="text-xs font-bold text-purple-600 flex items-center gap-1 hover:text-purple-800">{loadingCaption ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>} Magic Gen</button></div>
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
              <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0 z-10"><button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200">Close</button><button onClick={handleShare} className="flex-1 py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"><Share2 size={18}/> Share</button></div>
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
                        <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-indigo-600 flex items-center gap-1"><Sparkles size={12}/> The Oracle</span><div className="flex gap-2"><button onClick={() => generateHeadline(liveSquare.text)} className="text-indigo-300 hover:text-indigo-600"><Newspaper size={14}/></button>{liveSquare.oracleText && <button onClick={() => callGeminiTTS(liveSquare.oracleText).then(u => u && new Audio(u).play())} className="text-indigo-300 hover:text-indigo-600"><Volume2 size={14}/></button>}</div></div>
                        {liveSquare.oracleText ? (<p className="text-sm text-indigo-900 italic">"{liveSquare.oracleText}"</p>) : (<button onClick={() => askOracle(liveSquare.id, liveSquare.text)} disabled={isOracleLoading} className="text-xs font-bold text-indigo-500 w-full text-center py-2 hover:bg-indigo-100 rounded-lg transition-colors">{isOracleLoading ? "Consulting..." : "Ask for judgment ->"}</button>)}
                    </div>
                    <button onClick={() => toggleHit(liveSquare.id)} className={`w-full py-4 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all ${liveSquare.hit ? 'bg-gray-100 text-gray-500' : 'bg-[#1A1E2C] text-white'}`}>{liveSquare.hit ? 'Unmark Event' : 'CONFIRM EVENT'}</button>
                </div>
            </SoftCard>
        </div>
      );
  };

  const RoastModal = () => (<div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in"><SoftCard className="w-full max-w-sm p-6 shadow-2xl relative bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-100"><button onClick={() => setShowRoast(false)} className="absolute top-4 right-4 bg-white p-2 rounded-full text-gray-500 hover:bg-gray-100 shadow-sm"><X size={18}/></button><div className="flex justify-center mb-4"><div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-3xl shadow-inner">🔥</div></div><h3 className="text-2xl font-black text-center text-[#1A1E2C] mb-2">Chaos Report</h3><div className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 mb-6"><p className="text-sm text-gray-700 font-medium leading-relaxed italic">"{roastData}"</p></div><button onClick={() => setShowRoast(false)} className="w-full py-3 bg-[#1A1E2C] text-white font-bold rounded-xl shadow-lg">I accept my fate</button></SoftCard></div>);
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
const ProfileView = () => (
  <div className="pb-32 pt-8 px-6 bg-[#F5F7FA] min-h-full">
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
              setUserProfile(draftProfile);   // commit changes
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
          onClick={() => setIsEditingProfile(true)}
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
                <p>
                  This is an early beta build — expect occasional bugs or weird
                  behavior. If something breaks, DM{" "}
                  <span className="font-mono font-bold text-blue-600">
                    @Lou.IsChaosC
                  </span>{" "}
                  🙂
                </p>
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

    <h3 className="text-lg font-bold text-[#1A1E2C] mb-4 mt-4">Settings</h3>
    <div className="space-y-3 mb-12">
      <SoftCard className="!p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Activity size={18} />
          </div>
          <span className="font-bold text-sm">Haptics</span>
        </div>
        <Toggle
          checked={appSettings.haptics}
          onChange={(v) => setAppSettings({ ...appSettings, haptics: v })}
        />
      </SoftCard>
      <SoftCard className="!p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Volume2 size={18} />
          </div>
          <span className="font-bold text-sm">Sound Effects</span>
        </div>
        <Toggle
          checked={appSettings.sound}
          onChange={(v) => setAppSettings({ ...appSettings, sound: v })}
        />
      </SoftCard>
      <button
        onClick={resetApp}
        className="w-full py-3 rounded-2xl border-2 border-red-100 text-red-500 font-bold text-sm flex items-center justify-center gap-2 mt-6"
      >
        <Trash2 size={16} /> Reset App Data
      </button>
    </div>
  </div>
);


  // --- RENDER ---

  if (currentScreen === 'onboarding') return <OnboardingView />;

  return (
    <div className="h-screen w-full bg-[#F5F7FA] overflow-hidden font-sans text-[#1A1E2C] relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#E2E8F0] to-transparent -z-10"></div>
      <div className="h-full overflow-y-auto scrollbar-hide pb-24">
          {activeTab === 'home' && <HomeView />}
          {activeTab === 'create' && <CreateView />}
          {activeTab === 'profile' && <ProfileView />}
      </div>
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-[#1A1E2C] text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-12 z-40">
          <button onClick={() => setActiveTab('home')} className={activeTab==='home' ? 'text-white' : 'text-gray-500'}><Home size={24}/></button>
          <button onClick={() => setActiveTab('create')} className="bg-blue-500 p-3 rounded-full -mt-10 border-[6px] border-[#F5F7FA] shadow-lg"><Plus size={28} className="text-white"/></button>
          <button onClick={() => setShowShare(true)} className="text-gray-500 hover:text-white"><Share2 size={24}/></button>
      </div>
      {selectedSquare && <EventModal />}
      {editingSquare && <EditModal />}
      {showShare && <SharePreview onClose={() => setShowShare(false)} />}
      {showRoast && <RoastModal />}
      {confirmModal.show && <ConfirmationModal />}
      {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center bg-black/20">
              <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 drop-shadow-2xl animate-bounce tracking-tighter" style={{ filter: 'drop-shadow(0 4px 0px rgba(0,0,0,0.2))' }}>
                CHAOS!
              </h1>
          </div>
      )}
      <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .animate-fade-in { animation: fadeIn 0.3s ease-out; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}