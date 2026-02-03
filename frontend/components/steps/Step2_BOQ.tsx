import { useStore, BOQItem } from '../../store/useStore';
import axios from 'axios';
import { Trash2, CheckCircle, Loader2, ArrowLeft, PenLine, Ruler, ArrowRight, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step2() {
  const { 
    boqData, updateBOQItem, deleteBOQItem, 
    wbsData, setWBSData, 
    setStep, apiKey, selectedModel, setLoading, isLoading 
  } = useStore();

  // Check if next step data already exists
  const hasNextData = wbsData && wbsData.length > 0;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/generate-wbs`, boqData, { 
        headers: { 'x-gemini-api-key': apiKey, 'x-gemini-model': selectedModel } 
      });
      setWBSData(res.data);
      setStep(3);
    } catch (e: any) { 
      alert("Error: " + (e.response?.data?.detail || e.message)); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleContinue = () => {
    setStep(3);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/80 backdrop-blur-xl p-6 rounded-[24px] shadow-sm border border-white/50 gap-4">
        <div className="flex items-center gap-4">
            <button onClick={() => setStep(1)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div>
                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bill of Quantities</h2>
                <p className="text-slate-500 font-medium">AI identified <span className="text-indigo-600 font-bold">{boqData.length} work items</span>.</p>
            </div>
        </div>
        
        <div className="flex gap-3">
            {/* Show "Continue" only if data exists */}
            {hasNextData && (
                <button 
                    onClick={handleContinue} 
                    className="bg-white border-2 border-slate-100 text-slate-700 hover:border-indigo-200 hover:text-indigo-600 px-6 py-3.5 rounded-xl font-bold flex items-center gap-2 transition-all"
                >
                    Continue <ArrowRight size={18}/>
                </button>
            )}
            
            {/* Main Action: Generate/Regenerate */}
            <button 
                onClick={handleRegenerate} 
                disabled={isLoading} 
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-200/50 hover:shadow-emerald-200/80 transition-all transform hover:-translate-y-0.5"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : (
                    <>
                        {hasNextData ? <RefreshCw size={18}/> : <CheckCircle size={18}/>} 
                        {hasNextData ? "Regenerate WBS" : "Generate WBS"}
                    </>
                )}
            </button>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-[24px] overflow-hidden border border-white/60 shadow-xl shadow-slate-200/40">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
                <tr>
                <th className="p-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest w-16">#</th>
                <th className="p-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest min-w-[300px]">Work Item</th>
                <th className="p-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest w-40">Dimensions</th>
                <th className="p-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest w-32">Quantity</th>
                <th className="p-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest w-24">Unit</th>
                <th className="p-6 font-bold text-slate-400 text-[11px] uppercase tracking-widest w-20 text-center">Action</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 bg-white/40">
                {boqData.map((item, idx) => (
                <tr key={idx} className="hover:bg-indigo-50/40 transition-colors group">
                    <td className="p-6 text-slate-300 font-mono text-xs font-bold">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="p-6">
                    <div className="relative">
                        <input value={item.Work} onChange={(e) => updateBOQItem(idx, {...item, Work: e.target.value})} className="w-full bg-transparent font-semibold text-slate-700 outline-none border-b border-transparent focus:border-indigo-500 focus:bg-white/80 transition-all py-1.5 px-1 rounded"/>
                        <PenLine className="absolute right-0 top-1/2 -translate-y-1/2 text-indigo-300 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity" size={14}/>
                    </div>
                    </td>
                    <td className="p-6">
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200/50 w-fit">
                            <Ruler size={12} className="text-slate-400"/>
                            {item.Length || 0} <span className="text-slate-300">×</span> {item.Width || 0}
                        </div>
                    </td>
                    <td className="p-6">
                    <input type="number" value={item.Quantity} onChange={(e) => updateBOQItem(idx, {...item, Quantity: Number(e.target.value)})} className="w-24 bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center text-slate-700 shadow-sm"/>
                    </td>
                    <td className="p-6">
                        <span className="px-3 py-1.5 bg-indigo-50 rounded-lg text-[10px] font-extrabold text-indigo-600 uppercase tracking-wide border border-indigo-100">{item.Unit}</span>
                    </td>
                    <td className="p-6 text-center">
                    <button onClick={() => deleteBOQItem(idx)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2.5 rounded-xl transition-all"><Trash2 size={18}/></button>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </motion.div>
  );
}