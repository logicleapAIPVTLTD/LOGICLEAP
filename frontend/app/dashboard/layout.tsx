"use client";
import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { Key, RotateCcw, ChevronDown, Cpu, Zap, LogOut } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-3-pro-preview",
  "gemini-3-flash-preview"
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { apiKey, setApiKey, resetStore, step, setStep, selectedModel, setSelectedModel } = useStore();
  const [showKeyModal, setShowKeyModal] = useState(!apiKey);
  const [tempKey, setTempKey] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);

  const handleSaveKey = () => {
    if (tempKey.length > 5) {
      setApiKey(tempKey);
      setShowKeyModal(false);
    }
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all project data?")) {
      resetStore();
      setStep(1);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-500 selection:text-white relative overflow-x-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-100/50 rounded-full blur-[120px] opacity-60" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-blue-100/50 rounded-full blur-[100px] opacity-60" />
      </div>

      {/* FIXED Full-Width Navbar (Solves Dislocation) */}
      <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Zap size={18} fill="currentColor" />
              </div>
              <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">LogicLeap</span>
            </Link>
            
            {/* Step Progress Pills */}
            <div className="hidden md:flex items-center bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center">
                  <button 
                    onClick={() => s < step && setStep(s)}
                    disabled={s > step}
                    className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all duration-300 ${
                      step === s ? 'bg-white text-indigo-600 shadow-sm scale-110 ring-1 ring-slate-200' : 
                      step > s ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {step > s ? '✓' : s}
                  </button>
                  {s < 5 && (
                    <div className="w-4 h-0.5 mx-1 bg-slate-200 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-emerald-400" 
                        initial={{ width: 0 }} 
                        animate={{ width: step > s ? "100%" : "0%" }} 
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            
            {/* Model Select */}
            <div className="relative">
                <button 
                    onClick={() => setShowModelMenu(!showModelMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 hover:border-indigo-300 transition-all text-slate-600 shadow-sm"
                >
                    <Cpu size={14} className="text-indigo-500"/>
                    <span className="max-w-[140px] truncate hidden sm:block">{selectedModel}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${showModelMenu ? 'rotate-180' : ''}`}/>
                </button>
                
                <AnimatePresence>
                {showModelMenu && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowModelMenu(false)}/>
                        <motion.div 
                            initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                            className="absolute top-full right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden p-1"
                        >
                            <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Neural Engine</div>
                            {MODELS.map(m => (
                                <button
                                    key={m}
                                    onClick={() => { setSelectedModel(m); setShowModelMenu(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between transition-colors ${selectedModel === m ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                >
                                    {m}
                                    {selectedModel === m && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"/>}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
                </AnimatePresence>
            </div>

            {/* API Status */}
            <button 
              onClick={() => setShowKeyModal(true)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                apiKey ? 'bg-emerald-50/50 border-emerald-200 text-emerald-700' : 'bg-rose-50/50 border-rose-200 text-rose-600 animate-pulse'
              }`}
            >
              <Key size={14} />
              <span className="hidden sm:inline">{apiKey ? 'CONNECTED' : 'KEY'}</span>
            </button>

            {/* Reset */}
            <button onClick={handleReset} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Reset Project">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Auth Modal */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20"
            >
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Key size={24} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-slate-900 text-center">Authentication</h2>
              <p className="text-slate-500 mb-6 text-sm text-center">Enter your Gemini API Key to activate the engine.</p>
              <input 
                  value={tempKey} onChange={(e) => setTempKey(e.target.value)} placeholder="sk-..." type="password"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all mb-4"
              />
              <div className="flex gap-3">
                  {apiKey && (
                      <button onClick={() => setShowKeyModal(false)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50">Cancel</button>
                  )}
                  <button 
                      onClick={handleSaveKey} disabled={tempKey.length < 5}
                      className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200"
                  >
                      Activate
                  </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 pt-28 pb-20 px-6 max-w-7xl mx-auto w-full relative z-10">
        {children}
      </main>
    </div>
  );
}