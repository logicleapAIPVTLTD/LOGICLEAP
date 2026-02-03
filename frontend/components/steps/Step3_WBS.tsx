import { useState } from 'react';
import { useStore } from '../../store/useStore';
import axios from 'axios';
import { ChevronDown, Loader2, CheckCircle, Clock, ClipboardList, ShoppingCart, Hammer, ShieldCheck, Banknote, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Step3() {
  const { wbsData, bomData, setBOMData, setStep, apiKey, selectedModel, setLoading, isLoading } = useStore();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const hasNextData = bomData && bomData.length > 0;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/generate-bom`, wbsData, { 
        headers: { 'x-gemini-api-key': apiKey, 'x-gemini-model': selectedModel } 
      });
      setBOMData(res.data);
      setStep(4);
    } catch { 
      alert("Error generating BOM"); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleContinue = () => {
    setStep(4);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-[24px] shadow-sm border border-white/50 sticky top-24 z-10">
        <div className="flex items-center gap-4">
            <button onClick={() => setStep(2)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Work Breakdown</h2>
                <p className="text-slate-500 text-sm font-medium">5-Stage Execution Plan.</p>
            </div>
        </div>
        
        <div className="flex gap-3">
            {hasNextData && (
                <button 
                    onClick={handleContinue} 
                    className="bg-white border-2 border-slate-100 text-slate-700 hover:border-indigo-200 hover:text-indigo-600 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                    Continue <ArrowRight size={18}/>
                </button>
            )}
            
            <button 
                onClick={handleRegenerate} 
                disabled={isLoading} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : (
                    <>
                        {hasNextData ? <RefreshCw size={18}/> : null}
                        {hasNextData ? "Regenerate BOM" : "Generate BOM"}
                    </>
                )}
            </button>
        </div>
      </div>

      <div className="grid gap-4">
        {wbsData.map((item: any, idx) => {
            const isOpen = openIndex === idx;
            const hasData = item.WBS_Execution && item.WBS_Execution.length > 0;
            return (
              <div key={idx} className={`bg-white rounded-3xl border transition-all duration-500 overflow-hidden ${isOpen ? 'shadow-2xl border-indigo-200 ring-1 ring-indigo-50' : 'shadow-sm border-slate-200 hover:border-indigo-200 hover:shadow-md'}`}>
                <div onClick={() => setOpenIndex(isOpen ? null : idx)} className="p-6 flex justify-between items-center cursor-pointer bg-white relative z-10">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${hasData ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{hasData ? <CheckCircle size={22}/> : <Clock size={22}/>}</div>
                    <div><h3 className="font-bold text-lg text-slate-800 tracking-tight">{item.Work}</h3><p className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{hasData ? "Ready for Execution" : "Pending Analysis"}</p></div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-slate-50 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-indigo-50 text-indigo-600' : 'text-slate-400'}`}><ChevronDown size={20}/></div>
                </div>
                
                <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 bg-slate-50/50">
                    <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-slate-400 mb-4 tracking-widest"><ClipboardList size={14}/> Planning</h4><ul className="space-y-3">{item.WBS_Planning?.map((p:string, i:number) => <li key={i} className="text-xs text-slate-600 leading-relaxed pl-3 border-l-2 border-slate-100">{p}</li>)}</ul></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"><h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-amber-500 mb-4 tracking-widest"><ShoppingCart size={14}/> Procurement</h4><ul className="space-y-3">{item.WBS_Procurement?.map((m:string, i:number) => <li key={i} className="text-xs text-slate-700 font-bold bg-amber-50/50 px-3 py-2 rounded-lg border border-amber-100/50">{m}</li>)}</ul></div>
                        <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm ring-4 ring-indigo-50/30 md:row-span-2"><h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-indigo-600 mb-4 tracking-widest"><Hammer size={14}/> Execution</h4><div className="space-y-4 relative before:absolute before:left-[15px] before:top-3 before:bottom-3 before:w-0.5 before:bg-indigo-50">{item.WBS_Execution?.map((step: any, i: number) => (<div key={i} className="relative pl-10"><div className="absolute left-0 top-0 w-8 h-8 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-[10px] font-bold shadow-lg shadow-indigo-200 z-10">{step.step}</div><p className="text-sm font-bold text-slate-800">{step.activity}</p><p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mt-1">{step.estimated_hours} Hours</p></div>))}</div></div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                            <div><h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-emerald-600 mb-3 tracking-widest"><ShieldCheck size={14}/> Quality Check</h4><ul className="space-y-2">{item.WBS_QC?.map((q:string, i:number) => <li key={i} className="text-xs text-slate-500 flex gap-2"><span className="text-emerald-500 font-bold">✓</span> {q}</li>)}</ul></div>
                            <div className="pt-6 border-t border-slate-50"><h4 className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-purple-600 mb-3 tracking-widest"><Banknote size={14}/> Billing Milestone</h4><ul className="space-y-2">{item.WBS_Billing?.map((b:string, i:number) => <li key={i} className="text-xs font-bold text-slate-600 bg-purple-50 px-3 py-2 rounded-lg border border-purple-100">{b}</li>)}</ul></div>
                        </div>
                    </div>
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            );
        })}
      </div>
    </motion.div>
  );
}