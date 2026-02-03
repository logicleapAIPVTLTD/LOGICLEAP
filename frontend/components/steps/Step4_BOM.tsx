import { useStore, BOMItem } from '../../store/useStore';
import axios from 'axios';
import { Loader2, ArrowRight, ArrowLeft, RefreshCw, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step4() {
  const { bomData, costData, setCostData, setStep, apiKey, selectedModel, setLoading, isLoading } = useStore();

  const hasNextData = costData && costData.line_items?.length > 0;

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/generate-cost`, bomData, { 
        headers: { 'x-gemini-api-key': apiKey, 'x-gemini-model': selectedModel } 
      });
      setCostData(res.data); 
      setStep(5);
    } catch (e: any) { 
      alert("Error: " + (e.response?.data?.detail || e.message)); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleContinue = () => {
    setStep(5);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-6 rounded-[24px] shadow-sm border border-white/50">
        <div className="flex items-center gap-4">
            <button onClick={() => setStep(3)} className="p-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Bill of Materials</h2>
                <p className="text-slate-500 font-medium">Calculated Quantities with <span className="text-purple-600 font-bold">Wastage Factors</span>.</p>
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
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-200 transition-all transform hover:-translate-y-0.5"
            >
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : (
                    <>
                        {hasNextData ? <RefreshCw size={18}/> : <Calculator size={18}/>}
                        {hasNextData ? "Recalculate Costs" : "Calculate Costs"}
                    </>
                )}
            </button>
        </div>
      </div>

      <div className="bg-white/60 backdrop-blur-md rounded-[24px] overflow-hidden border border-white/60 shadow-xl shadow-slate-200/40">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-200">
            <tr><th className="p-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Scope</th><th className="p-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Material</th><th className="p-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Qty</th><th className="p-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Unit</th><th className="p-6 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Calculation Logic</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100/50 bg-white/40">
            {bomData.map((row, idx) => (
              <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                <td className="p-6 font-bold text-slate-800">{row.Room}</td>
                <td className="p-6"><span className="text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">{row.Material}</span></td>
                <td className="p-6 font-mono font-bold text-lg text-slate-700">{row.Est_Quantity}</td>
                <td className="p-6"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{row.Unit}</span></td>
                <td className="p-6 text-slate-400 italic text-xs max-w-xs">{row.Calculation_Basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}