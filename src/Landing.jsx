import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";

import { 
  Check, Star, ChevronDown, ChevronUp,
  Play, TrendingUp, Users, User,
  Shuffle, Share2
} from 'lucide-react';


/**
 * DOOMGO LANDING PAGE
 * "Trust + Conversion + SEO" Layer
 * * Features:
 * - 🎨 Consistent "Soft Plastic" Aesthetic
 * - 📱 Responsive Mobile/Desktop Layout
 * - 📧 Email Capture UI
 * - 🙋‍♀️ Accordion FAQ
 * - 📊 Social Proof & Demo Mockups
 */

// --- UI HELPERS (Reused for consistency) ---

const SoftCard = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-[32px] shadow-xl shadow-blue-100/50 border border-white/60 relative overflow-hidden ${className}`} {...props}>
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

// --- SUB-COMPONENTS ---

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-none">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex justify-between items-center text-left focus:outline-none"
      >
        <span className="font-bold text-[#1A1E2C] text-sm">{question}</span>
        {isOpen ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
      </button>
      {isOpen && <p className="pb-4 text-xs text-gray-500 leading-relaxed">{answer}</p>}
    </div>
  );
};

const MockPhone = () => (
  <div className="relative mx-auto w-64 h-[520px] bg-[#0F1322] rounded-[44px] border-[10px] border-[#0F1322] shadow-2xl overflow-hidden z-10 transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500">
    {/* Notch */}
    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0F1322] rounded-full z-20 shadow-md" />

    {/* Screen */}
    <div className="w-full h-full bg-[#F5F7FA] relative flex flex-col">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 text-[10px] font-bold text-slate-500">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="w-6 h-3 rounded-md border border-slate-300 relative overflow-hidden">
            <span className="absolute inset-y-0 left-0 w-4 bg-slate-300" />
          </span>
        </div>
      </div>

      {/* App header */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
            <img src="/chaos-icon.png" alt="Doomgo" className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <div className="text-sm font-black text-[#1A1E2C] leading-none">Doomgo</div>
            <div className="text-[11px] font-bold text-slate-500">2026 Chaos Deck</div>
          </div>
          <div className="ml-auto text-[10px] font-black px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
            LIVE
          </div>
        </div>

        {/* Chips */}
        <div className="mt-3 flex gap-2">
          {["Daily", "Weekly", "Monthly"].map((t) => (
            <div
              key={t}
              className="text-[10px] font-black px-3 py-1 rounded-full bg-white border border-slate-100 shadow-sm text-slate-600"
            >
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="px-4 pb-4 flex-1">
        <div className="grid grid-cols-5 gap-1.5 content-start">
          {Array(25).fill(0).map((_, i) => {
            const isHot = i === 12 || i === 3 || i === 7;
            const label =
              i === 12 ? "FREE" :
              i === 3 ? "ALIENS" :
              i === 7 ? "CRASH" :
              null;

            return (
              <div
                key={i}
                className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-black tracking-tight
                  ${isHot ? "bg-indigo-500 text-white shadow-md" : "bg-white text-slate-400 border border-slate-100 shadow-sm"}
                `}
              >
                {label}
              </div>
            );
          })}
        </div>

        {/* Mini stats row */}
        <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-500">
          <span>Chaos Score</span>
          <span className="text-indigo-600 font-black">72</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-slate-200 overflow-hidden">
          <div className="h-full w-2/3 bg-indigo-500 rounded-full" />
        </div>
      </div>

      {/* Bottom nav */}
      <div className="px-5 pb-6">
        <div className="h-12 bg-[#1A1E2C] rounded-full shadow-xl flex items-center justify-around">
          <span className="w-2 h-2 rounded-full bg-white/80" />
          <span className="w-8 h-2 rounded-full bg-white/30" />
          <span className="w-2 h-2 rounded-full bg-white/50" />
        </div>
      </div>
    </div>

    {/* Shine */}
    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/10 to-transparent pointer-events-none"></div>
  </div>
);


// --- MAIN PAGE ---

export default function LandingPage({ onLaunchApp }) {
  const navigate = useNavigate();
  const launch = onLaunchApp ?? (() => navigate("/"));

  return (
    <div className="min-h-screen bg-[#F5F7FA] font-sans text-[#1A1E2C] overflow-x-hidden selection:bg-indigo-100">
      
      {/* --- HERO SECTION --- */}
      <section className="relative pt-20 pb-32 px-6 lg:pt-32">
         {/* Background Shapes */}
         <GeometricShape type="sphere" className="-top-20 -left-20 opacity-60" />
         <GeometricShape type="cube" className="top-40 -right-10 rotate-12 opacity-50" />
         
         <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left z-10">
  {/* Logo */}
  <div className="flex justify-center lg:justify-start mb-4">
    <img
      src="/chaos-icon.png"
      alt="Doomgo"
      className="w-14 h-14 rounded-2xl shadow-lg border border-white"
    />
  </div>

  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-indigo-100 shadow-sm mb-6">
    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">2026 Edition Live</span>
  </div>
                <h1 className="text-5xl lg:text-7xl font-black leading-[0.95] tracking-tighter mb-6">
                    Predict Your<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Year.</span>
                </h1>
                <p className="text-lg text-gray-500 font-medium mb-8 max-w-md mx-auto lg:mx-0 leading-relaxed">
                    Create your 2026 Bingo card. Track chaos, viral moments, and personal wins as they happen.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                    <button 
  onClick={launch}
  className="px-8 py-4 bg-[#1A1E2C] text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
>
  <Play size={20} fill="currentColor"/> Open App
</button>

                    <div className="hidden sm:block w-px h-12 bg-gray-200 self-center"></div>
                    <div className="flex items-center gap-[-10px]">
                         <div className="flex -space-x-3">
  {[
    { icon: <User size={16} />, cls: "bg-indigo-100 text-indigo-600" },
    { icon: <Users size={16} />, cls: "bg-purple-100 text-purple-600" },
    { icon: <TrendingUp size={16} />, cls: "bg-emerald-100 text-emerald-600" },
  ].map((a, i) => (
    <div
      key={i}
      className={`w-10 h-10 rounded-full border-2 border-white ${a.cls} flex items-center justify-center shadow-sm`}
      aria-hidden="true"
    >
      {a.icon}
    </div>
  ))}
</div>

                         <div className="ml-4 text-left">
                             <p className="text-xs font-bold">15K+ Players</p>
                             <div className="flex text-yellow-400 text-[10px]">★★★★★</div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Hero Visual */}
            <div className="relative mt-12 lg:mt-0">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl transform scale-75"></div>
                <MockPhone />
                
                {/* Floating Elements */}
                <SoftCard className="absolute top-20 -left-6 !p-3 animate-bounce-slow">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">👽</span>
                        <div className="text-left">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Highest voted</p>
                            <p className="text-xs font-bold">Aliens Land in Florida</p>
                        </div>
                    </div>
                </SoftCard>

                <SoftCard className="absolute bottom-32 -right-6 !p-3 animate-bounce-slow" style={{animationDelay: '1s'}}>
                    <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-green-100 rounded-full text-green-600"><TrendingUp size={14}/></div>
                         <p className="text-xs font-bold">Bitcoin Crash</p>
                    </div>
                </SoftCard>
            </div>
         </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section className="py-24 px-6 bg-white relative">
          <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-black mb-12">How Doomgo Works</h2>
              
              <div className="grid md:grid-cols-3 gap-8">
                  {[
                      { icon: <Shuffle size={24}/>, title: "1. Pick a Deck", desc: "Choose a Daily, Monthly, or the legendary 2026 Chaos Deck." },
                      { icon: <Check size={24}/>, title: "2. Track Events", desc: "Mark off predictions as they happen in real life." },
                      { icon: <Share2 size={24}/>, title: "3. Share & Flex", desc: "Generate viral images of your board to prove you called it." }
                  ].map((step, i) => (
                      <div key={i} className="p-6 rounded-[32px] bg-gray-50 border border-gray-100 relative group hover:-translate-y-1 transition-transform">
                          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 text-indigo-600 group-hover:scale-110 transition-transform">
                              {step.icon}
                          </div>
                          <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                          <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                      </div>
                  ))}
              </div>
          </div>
      </section>

      {/* --- SOCIAL PROOF --- */}
      <section className="py-24 px-6 relative overflow-hidden">
          <GeometricShape type="pyramid" className="bottom-10 left-10 rotate-12 opacity-30" />
          <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                  <h2 className="text-3xl font-black max-w-xs">Don't just watch 2026 happen. Predict it.</h2>
                  <div className="text-right hidden md:block">
                      <p className="text-4xl font-black text-indigo-600">18,452</p>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Boards Created</p>
                  </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                  <SoftCard className="!p-6">
                      <div className="flex gap-1 text-yellow-400 mb-3"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
                      <p className="text-sm font-medium text-gray-700 mb-4">"I literally predicted the celebrity breakup last week. My friends are freaking out!!!"</p>
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
  <User size={14} />
</div>
                          <span className="text-xs font-bold text-gray-400">@sarah-snaps</span>
                      </div>
                  </SoftCard>
                  <SoftCard className="!p-6">
                      <div className="flex gap-1 text-yellow-400 mb-3"><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/><Star size={16} fill="currentColor"/></div>
                      <p className="text-sm font-medium text-gray-700 mb-4">"The daily bingo is my new morning routine. Way better than scrolling news."</p>
                      <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
  <User size={14} />
</div>

                          <span className="text-xs font-bold text-gray-400">@crypto_dave</span>
                      </div>
                  </SoftCard>
              </div>
          </div>
      </section>

      {/* --- FAQ --- */}
      <section className="py-24 px-6 bg-white">
          <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-black mb-8 text-center">Frequently Asked Questions</h2>
              <div className="space-y-2">
                  <FAQItem question="Is it free?" answer="Yes! You get the 2026 deck and daily decks for free. We have a Pro mode for power users who want unlimited AI generations." />
                  <FAQItem question="Do I need an account?" answer="Nope. Doomgo works offline on your device. We respect your privacy." />
                  <FAQItem question="Is this real gambling?" answer="Not at all. It's a game of prediction and vibes. No money is wagered." />
                  <FAQItem question="Can I edit my board?" answer="Chaos decks can be edited freely. The Official 2026 deck locks once you commit to it (to prevent cheating!)." />
              </div>
          </div>
      </section>

     {/* --- CTA / FOOTER --- */}
<section className="py-24 px-6 relative">
  <div className="max-w-4xl mx-auto text-center">
    <SoftCard className="!p-12 bg-gradient-to-br from-[#1A1E2C] to-gray-900 text-white border-none">
      <h2 className="text-3xl md:text-4xl font-black mb-4">Ready to play?</h2>
      <p className="text-sm md:text-base text-white/70 font-medium mb-8">
        No account required. Build your deck in under a minute.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={launch}
          className="px-8 py-4 bg-white text-[#1A1E2C] rounded-2xl font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-all inline-flex items-center justify-center gap-2"
        >
          <Play size={20} fill="currentColor" />
          Open the App
        </button>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-bold text-white/60">
        <a href="/privacy.html" className="hover:text-white" target="_blank" rel="noreferrer">Privacy Policy</a>
        <a href="/terms.html" className="hover:text-white" target="_blank" rel="noreferrer">Terms of Service</a>
        <a href="/contact.html" className="hover:text-white" target="_blank" rel="noreferrer">Contact</a>
      </div>
    </SoftCard>

    <div className="mt-10 text-xs font-bold text-gray-400">
      © 2026 Doomgo Inc.
    </div>
  </div>
</section>

      <style>{`
        .animate-bounce-slow { animation: bounce 3s infinite; }
        @keyframes bounce {
            0%, 100% { transform: translateY(-5%); }
            50% { transform: translateY(5%); }
        }
      `}</style>
    </div>
  );
}