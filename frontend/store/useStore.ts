// store/useStore.ts

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware'; // Removed StateStorage from import as it's implied
import { get, set, del } from 'idb-keyval';

// Custom Storage implementation for IndexedDB
const idbStorage = {
  getItem: async (name: string): Promise<string | null> => (await get(name)) || null,
  setItem: async (name: string, value: string): Promise<void> => await set(name, value),
  removeItem: async (name: string): Promise<void> => await del(name),
};

export type BOQItem = { "Item No."?: number; Work: string; Length?: number; Width?: number; Quantity: number; Unit: string; [key: string]: any; };
export type WBSItem = { Work: string; WBS_Procurement?: string[]; WBS_Planning?: string[]; WBS_Execution?: { step: number; activity: string; estimated_hours: number }[]; WBS_QC?: string[]; WBS_Billing?: string[]; };
export type BOMItem = { Room: string; Material: string; Est_Quantity: number; Unit: string; Calculation_Basis?: string; };
export type CostItem = { Material: string; Rate_Mat: number; Rate_Lab: number; Subtotal: number; Source?: string; Room?: string; };

interface AppState {
  apiKey: string;
  // Updated type to be explicit (optional but good practice)
  selectedModel: string; 
  step: number;
  projectDetails: any;
  // ... (rest of your types remain the same)
  boqData: BOQItem[];
  wbsData: WBSItem[];
  bomData: BOMItem[];
  costData: any;
  isLoading: boolean;
  
  setApiKey: (key: string) => void;
  setSelectedModel: (model: string) => void;
  setProjectDetails: (d: any) => void;
  setBOQData: (d: BOQItem[]) => void;
  updateBOQItem: (idx: number, item: BOQItem) => void; // Fixed signature
  deleteBOQItem: (idx: number) => void; // Fixed signature
  setWBSData: (d: WBSItem[]) => void;
  setBOMData: (d: BOMItem[]) => void;
  setCostData: (d: any) => void;
  setStep: (s: number) => void;
  setLoading: (l: boolean) => void;
  resetStore: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      apiKey: '',
      // Ensure this default matches one of your 'id' values in the frontend
      selectedModel: 'gemini-2.5-flash-lite', 
      step: 1,
      projectDetails: {},
      boqData: [],
      wbsData: [],
      bomData: [],
      costData: null,
      isLoading: false,

      setApiKey: (key) => set({ apiKey: key }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setProjectDetails: (d) => set({ projectDetails: d }),
      setBOQData: (d) => set({ boqData: d }),
      
      // Fixed the update logic to be cleaner
      updateBOQItem: (idx, item) => set((state) => {
        const newBOQ = [...state.boqData];
        newBOQ[idx] = item;
        return { boqData: newBOQ };
      }),

      // Fixed the delete logic
      deleteBOQItem: (idx) => set((state) => ({
        boqData: state.boqData.filter((_, i) => i !== idx)
      })),

      setWBSData: (d) => set({ wbsData: d }),
      setBOMData: (d) => set({ bomData: d }),
      setCostData: (d) => set({ costData: d }),
      setStep: (s) => set({ step: s }),
      setLoading: (l) => set({ isLoading: l }),
      
      resetStore: () => set((state) => ({ 
        step: 1, 
        projectDetails: {}, 
        boqData: [], 
        wbsData: [], 
        bomData: [], 
        costData: null, 
        isLoading: false,
        // Preserve API Key and Selected Model on reset
        apiKey: state.apiKey, 
        selectedModel: state.selectedModel 
      })),
    }),
    { 
      name: 'logicleap-pro-v2', 
      storage: createJSONStorage(() => idbStorage) 
    }
  )
);