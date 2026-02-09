import { useStore, CostItem } from '../../store/useStore';
import { Printer, Download, Building2, MapPin, Wallet, Sparkles, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Step5() {
  const { costData, projectDetails, selectedModel, setStep } = useStore();
  const summary = costData?.project_summary || {};
  const items = (costData?.line_items || []) as CostItem[];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
            <button onClick={() => setStep(4)} className="p-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-500 transition-colors"><ArrowLeft size={20}/></button>
            <div><h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Final Estimate</h1><p className="text-slate-500 mt-1 text-sm font-medium">Powered by <b>{selectedModel === 'gemini-2.5-flash-lite' ? 'Lite' : 'Base'}</b> • {summary.city_tier} Market Data</p></div>
        </div>
        <div className="flex gap-3">
            <button className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all"><Printer size={18}/> Print</button>
            <button className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-black flex items-center gap-2 shadow-xl shadow-slate-300 transition-all"><Download size={18}/> PDF Report</button>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-[40px] bg-slate-900 p-10 md:p-12 shadow-2xl shadow-slate-400/50">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px]"></div>
        
        <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center">
            <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4"><Sparkles size={12}/> AI Precision Estimate</div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Grand Total Project Cost</p>
                <div className="text-6xl md:text-8xl font-mono font-bold tracking-tighter text-white flex items-baseline gap-2">
                    <span className="text-3xl text-slate-600 font-sans">₹</span>
                    {summary.total_cost?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
            </div>
            <div className="flex gap-4 md:justify-end">
                <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 min-w-[140px]"><Building2 className="text-indigo-400 mb-2" size={24}/><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Type</p><p className="font-bold text-lg text-white">{projectDetails.type}</p></div>
                <div className="bg-white/5 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/10 min-w-[140px]"><MapPin className="text-emerald-400 mb-2" size={24}/><p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Region</p><p className="font-bold text-lg text-white">{projectDetails.location}</p></div>
            </div>
        </div>
      </div>

      <div className="bg-white shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden border border-slate-100">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-xl text-slate-800 flex items-center gap-3"><Wallet size={24} className="text-slate-400"/> Detailed Breakdown</h3></div>
        <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-400 font-bold uppercase text-[10px] tracking-widest"><tr><th className="p-6 pl-8">Item</th><th className="p-6 text-right">Mat. Rate</th><th className="p-6 text-right">Lab. Rate</th><th className="p-6 pr-8 text-right">Total</th></tr></thead>
            <tbody className="divide-y divide-slate-50">
                {items.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-6 pl-8"><div className="font-bold text-slate-900 text-base mb-1">{row.Material}</div><div className="text-xs font-bold text-slate-400 bg-slate-100 inline-block px-2 py-0.5 rounded">{row.Room}</div></td>
                    <td className="p-6 text-right font-mono text-slate-600">₹{row.Rate_Mat?.toLocaleString()}</td>
                    <td className="p-6 text-right font-mono text-slate-600">₹{row.Rate_Lab?.toLocaleString()}</td>
                    <td className="p-6 pr-8 text-right font-mono font-bold text-slate-900 bg-slate-50/50 group-hover:bg-indigo-50/30 transition-colors text-lg">₹{row.Subtotal?.toLocaleString()}</td>
                </tr>
                ))}
            </tbody>
        </table>
      </div>
    </motion.div>
  );
}