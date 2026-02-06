import { useState } from 'react';
import { useStore } from '../../store/useStore';
import axios from 'axios';
import { Upload, Loader2, FileText, MapPin, Building, ArrowRight, X, Sparkles, Type, Droplet, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PROJECT_TYPES = ['Interior', 'Tank Cleaning'];

export default function Step1() {
  const { setProjectDetails, setBOQData, setStep, setLoading, isLoading, apiKey, selectedModel, projectDetails } = useStore();
  const [form, setForm] = useState({ name: projectDetails.name || '', type: projectDetails.type || 'Interior', location: projectDetails.location || 'Mumbai' });
  const [file, setFile] = useState<File | null>(null);
  const [textInput, setTextInput] = useState('');
  const [inputMode, setInputMode] = useState<'file' | 'text'>('file');

  const handleSubmit = async () => {
    if (!apiKey) return alert("Please activate your API Key.");
    setProjectDetails(form);
    setLoading(true);
    const formData = new FormData();
    formData.append('project_name', form.name);
    formData.append('project_type', form.type);
    formData.append('location', form.location);
    
    if (inputMode === 'file' && file) {
        formData.append('file', file);
    } else if (inputMode === 'text' && textInput) {
        formData.append('text_input', textInput);
    } else {
        setLoading(false);
        return alert("Please provide either a file or text input.");
    }

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/generate-boq`, formData, {
        headers: { 'x-gemini-api-key': apiKey, 'x-gemini-model': selectedModel }
      });
      if (Array.isArray(res.data) && res.data.length > 0) { setBOQData(res.data); setStep(2); }
      else { alert("AI returned no items. Try a clearer input."); }
    } catch (e: any) { alert(`Error: ${e.response?.data?.detail || e.message}`); } 
    finally { setLoading(false); }
  };

  // Icon mapping for project types
  const getProjectIcon = (type: string) => {
    switch(type) {
      case 'Interior': return <Home size={18} />;
      case 'Tank Cleaning': return <Droplet size={18} />;
      default: return <Building size={18} />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto py-6">
      
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
            <Sparkles size={12}/> V2.0 Neural Engine
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">Initialize Project</h1>
        <p className="text-lg text-slate-500 max-w-lg mx-auto">Upload blueprints or raw data to auto-generate a comprehensive financial breakdown.</p>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-white/50 rounded-[32px] p-8 md:p-10 shadow-xl shadow-slate-200/50">
        
        {/* Form Inputs */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Metadata</label>
                    <div className="relative group">
                        <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Project Name" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300"/>
                    </div>
                    <div className="relative group mt-3">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="Location" className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300"/>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Service Type</label>
                <div className="grid grid-cols-1 gap-4">
                    {PROJECT_TYPES.map((t) => (
                        <button 
                            key={t} 
                            onClick={() => setForm({...form, type: t})} 
                            className={`py-4 px-5 rounded-xl border transition-all flex items-center gap-3 ${
                                form.type === t 
                                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-md ring-2 ring-indigo-100' 
                                    : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50 text-slate-600'
                            }`}
                        >
                            <div className={`p-2 rounded-lg ${
                                form.type === t 
                                    ? 'bg-indigo-100 text-indigo-700' 
                                    : 'bg-slate-100 text-slate-500'
                            }`}>
                                {getProjectIcon(t)}
                            </div>
                            <div className="text-left flex-1">
                                <span className="font-bold text-sm block">{t}</span>
                                <span className="text-xs text-slate-400">
                                    {t === 'Interior' ? 'Rooms, flooring, painting, etc.' : 'Water tank cleaning'}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl mb-6 w-fit mx-auto">
            <button onClick={() => setInputMode('file')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'file' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Upload size={16}/> File Upload
            </button>
            <button onClick={() => setInputMode('text')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <Type size={16}/> Raw Text
            </button>
        </div>

        <AnimatePresence mode="wait">
            {inputMode === 'file' ? (
                <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="relative border-2 border-dashed border-slate-300 rounded-[24px] bg-slate-50/50 hover:bg-indigo-50/30 hover:border-indigo-400/50 transition-all group cursor-pointer overflow-hidden min-h-[200px] flex items-center justify-center">
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    <div className="text-center p-8">
                        <div className="w-16 h-16 bg-white shadow-xl shadow-slate-200/50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                            {file ? <FileText className="text-indigo-600" size={32}/> : <Upload className="text-slate-400 group-hover:text-indigo-500 transition-colors" size={32}/>}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{file ? file.name : "Drop Plans Here"}</h3>
                        <p className="text-slate-400 text-sm mt-1">PDF, JPG, PNG, DOCX supported</p>
                        {file && <button onClick={(e) => {e.stopPropagation(); setFile(null)}} className="absolute top-4 right-4 p-2 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-full shadow-sm z-20 transition-colors"><X size={16}/></button>}
                    </div>
                </motion.div>
            ) : (
                <motion.div key="text" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <textarea 
                        value={textInput} onChange={(e) => setTextInput(e.target.value)}
                        placeholder={form.type === 'Tank Cleaning' 
                            ? "Describe tanks to clean: type (overhead/underground), capacity, dimensions, location..." 
                            : "Paste project description, dimensions, or rough notes here..."}
                        className="w-full h-[200px] p-6 bg-slate-50 border border-slate-200 rounded-[24px] focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-400 resize-none"
                    />
                </motion.div>
            )}
        </AnimatePresence>

        <button onClick={handleSubmit} disabled={isLoading} className="w-full py-5 mt-8 bg-slate-900 hover:bg-black text-white text-lg font-bold rounded-2xl shadow-xl shadow-slate-300/50 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 disabled:opacity-70 transition-all flex items-center justify-center gap-3">
            {isLoading ? <Loader2 className="animate-spin" /> : <>Generate Analysis <ArrowRight size={20} className="opacity-60" /></>}
        </button>

      </div>
    </motion.div>
  );
}
