
// // import { AirVent } from "lucide-react"
// // import React, { useState, useEffect, useMemo } from "react";
// // import { generateWBS, generateWBSBatch } from "../services/api";
// // const STATE_TIER_MAP = {
// //     // States
// //     "Andhra Pradesh": { code: "AP", defaultTier: "T1" },
// //     "Arunachal Pradesh": { code: "AR", defaultTier: "T2" },
// //     "Assam": { code: "AS", defaultTier: "T1" },
// //     "Bihar": { code: "BR", defaultTier: "T1" },
// //     "Chhattisgarh": { code: "CG", defaultTier: "T2" },
// //     "Goa": { code: "GA", defaultTier: "T1" },
// //     "Gujarat": { code: "GJ", defaultTier: "T1" },
// //     "Haryana": { code: "HR", defaultTier: "T1" },
// //     "Himachal Pradesh": { code: "HP", defaultTier: "T2" },
// //     "Jharkhand": { code: "JH", defaultTier: "T2" },
// //     "Karnataka": { code: "KA", defaultTier: "T1" },
// //     "Kerala": { code: "KL", defaultTier: "T1" },
// //     "Madhya Pradesh": { code: "MP", defaultTier: "T2" },
// //     "Maharashtra": { code: "MH", defaultTier: "T1" },
// //     "Manipur": { code: "MN", defaultTier: "T2" },
// //     "Meghalaya": { code: "ML", defaultTier: "T2" },
// //     "Mizoram": { code: "MZ", defaultTier: "T2" },
// //     "Nagaland": { code: "NL", defaultTier: "T2" },
// //     "Odisha": { code: "OR", defaultTier: "T1" },
// //     "Punjab": { code: "PB", defaultTier: "T1" },
// //     "Rajasthan": { code: "RJ", defaultTier: "T2" },
// //     "Sikkim": { code: "SK", defaultTier: "T2" },
// //     "Tamil Nadu": { code: "TN", defaultTier: "T1" },
// //     "Telangana": { code: "TS", defaultTier: "T1" },
// //     "Tripura": { code: "TR", defaultTier: "T2" },
// //     "Uttar Pradesh": { code: "UP", defaultTier: "T1" },
// //     "Uttarakhand": { code: "UK", defaultTier: "T2" },
// //     "West Bengal": { code: "WB", defaultTier: "T1" },

// //     // Union Territories
// //     "Andaman and Nicobar Islands": { code: "AN", defaultTier: "T3" },
// //     "Chandigarh": { code: "CH", defaultTier: "T1" },
// //     "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", defaultTier: "T2" },
// //     "Delhi": { code: "DL", defaultTier: "T1" },
// //     "Jammu and Kashmir": { code: "JK", defaultTier: "T2" },
// //     "Ladakh": { code: "LA", defaultTier: "T3" },
// //     "Lakshadweep": { code: "LD", defaultTier: "T3" },
// //     "Puducherry": { code: "PY", defaultTier: "T2" }
// // };
// // export default function WBS({ setActiveView, initialItems = [] }) {
// //     const [selectedItemForForm, setSelectedItemForForm] = useState(null);
// //     const [results, setResults] = useState(null);
// //     const [loading, setLoading] = useState(false);
// //     const [error, setError] = useState(null);
// //     const [activeStageFilter, setActiveStageFilter] = useState("All stages");
// //     const [expandedBOQ, setExpandedBOQ] = useState(null); // which BOQ heading is expanded
// //     const [expandedStage, setExpandedStage] = useState({});
// //     const STAGES = ["All stages", "Planning", "Procurement", "Execution", "QC", "Billing"];
// //     const isSuccess = Boolean(results?.success);
// //     const boqItems = useMemo(() => {
// //         if (!results?.data) return [];
// //         return Array.isArray(results.data) ? results.data : [results.data];
// //     }, [results]);

// //     /* ---------------- INIT ---------------- */
// //     useEffect(() => {
// //         if (initialItems.length > 0 && !selectedItemForForm) {
// //             setSelectedItemForForm({ ...initialItems[0] });
// //         }
// //     }, [initialItems, selectedItemForForm]);

// //     useEffect(() => {
// //         const savedResults = sessionStorage.getItem("wbsResults");
// //         if (savedResults) {
// //             setResults(JSON.parse(savedResults));
// //         }
// //     }, []);
// //     useEffect(() => {
// //     const handleBeforeUnload = () => {
// //         sessionStorage.removeItem("wbsResults");
// //     };

// //     window.addEventListener("beforeunload", handleBeforeUnload);

// //     return () => {
// //         window.removeEventListener("beforeunload", handleBeforeUnload);
// //     };
// // }, []);


// //     /* ---------------- HANDLERS ---------------- */
// //     const handleFormInputChange = (field, value) => {
// //         setSelectedItemForForm(prev => ({ ...prev, [field]: value }));
// //     };

// //     const handleGenerate = async (batch = false) => {
// //         setLoading(true);
// //         setError(null);
// //         // setResults(null);

// //         try {
// //             if (batch) {
// //                 const response = await generateWBSBatch(initialItems);

// //                 const normalizedData = {
// //                     success: response.success,
// //                     data: response.results
// //                         .filter(r => r.success && r.data)
// //                         .map(r => r.data)
// //                 };
// //                 setResults(prev => {
// //                     const prevArray = Array.isArray(prev?.data) ? prev.data : [];
// //                     const newArray = Array.isArray(normalizedData.data)
// //                         ? normalizedData.data
// //                         : [];

// //                     const mergedMap = new Map();

// //                     [...prevArray, ...newArray].forEach(item => {
// //                         mergedMap.set(item.boq_text, item);
// //                     });

// //                     const mergedResults = {
// //                         success: true,
// //                         data: Array.from(mergedMap.values())
// //                     };

// //                     sessionStorage.setItem("wbsResults", JSON.stringify(mergedResults));
// //                     return mergedResults;
// //                 });



// //             } else {
// //                 const response = await generateWBS([selectedItemForForm]);

// //                 const normalizedData = {
// //                     success: response.success,
// //                     data: response.data
// //                 };
// //                 setResults(prev => {
// //                     const prevArray = Array.isArray(prev?.data) ? prev.data : [];

// //                     const newArray = Array.isArray(normalizedData.data)
// //                         ? normalizedData.data
// //                         : [normalizedData.data];

// //                     // 🔒 Remove duplicates by boq_text
// //                     const mergedMap = new Map();

// //                     [...prevArray, ...newArray].forEach(item => {
// //                         mergedMap.set(item.boq_text, item);
// //                     });

// //                     const mergedResults = {
// //                         success: true,
// //                         data: Array.from(mergedMap.values())
// //                     };

// //                     sessionStorage.setItem("wbsResults", JSON.stringify(mergedResults));
// //                     return mergedResults;
// //                 });
// //             }

// //         } catch (err) {
// //             console.error(err);
// //             setError(err.message || "Failed to generate WBS");
// //         } finally {
// //             setLoading(false);
// //         }
// //     };
// //     const allTasksByBOQ = useMemo(() => {
// //         if (!results?.data) return [];

// //         const boqArray = Array.isArray(results.data) ? results.data : [results.data];

// //         return boqArray.map(boqItem => {
// //             const tasksByStage = {};
// //             if (boqItem?.wbs) {
// //                 Object.entries(boqItem.wbs).forEach(([stageName, tasks]) => {
// //                     tasksByStage[stageName] = tasks.map(task => ({
// //                         ...task,
// //                         boq_text: boqItem.boq_text
// //                     }));
// //                 });
// //             }
// //             return {
// //                 ...boqItem,
// //                 tasksByStage
// //             };
// //         });
// //     }, [results]);

// //     /* ---------------- UI ---------------- */
// //     return (
// //         <div className="p-4">

// //             {/* SUCCESS ALERT */}
// //             {isSuccess && (
// //                 <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
// //                     <p className="font-bold">WBS Generated Successfully</p>
// //                     <p>
// //                         {Array.isArray(results.data)
// //                             ? `Generated WBS for ${results.data.length} BOQ items`
// //                             : `Generated WBS for ${results.data?.boq_text}`}
// //                     </p>
// //                 </div>
// //             )}

// //             {/* BOM CTA */}
// //             {isSuccess && (
// //                 <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 mb-6 flex justify-between items-center rounded">
// //                     <div>
// //                         <p className="font-bold">Next Step</p>
// //                         <p>Proceed to generate BOM</p>
// //                     </div>
// //                     <button
// //                         onClick={() => setActiveView("bom-generator")}
// //                         className="px-4 py-2 bg-purple-600 text-white rounded"
// //                     >
// //                         Generate BOM →
// //                     </button>
// //                 </div>
// //             )}

// //             <h2 className="text-xl font-bold mb-4">AI-Driven WBS Creator</h2>

// //             {/* SINGLE BOQ FORM */}
// //             <div className="bg-white p-6 shadow rounded mb-8">
// //                 <h3 className="font-semibold mb-4">Generate WBS (Single BOQ)</h3>

// //                 {selectedItemForForm && (
// //                     <div className="space-y-4">
// //                         <input
// //                             className="w-full border p-2 rounded"
// //                             placeholder="BOQ Item"
// //                             value={selectedItemForForm.projectMaterial || ""}
// //                             onChange={e =>
// //                                 handleFormInputChange("projectMaterial", e.target.value)
// //                             }
// //                         />

// //                         <div className="flex gap-4">
// //                             <input
// //                                 type="number"
// //                                 className="flex-1 border p-2 rounded"
// //                                 placeholder="Quantity"
// //                                 value={selectedItemForForm.quantity || ""}
// //                                 onChange={e =>
// //                                     handleFormInputChange("quantity", e.target.value)
// //                                 }
// //                             />
// //                             <input
// //                                 className="flex-1 border p-2 rounded"
// //                                 placeholder="Unit"
// //                                 value={selectedItemForForm.unit || ""}
// //                                 onChange={e =>
// //                                     handleFormInputChange("unit", e.target.value)
// //                                 }
// //                             />
// //                             <input
// //                                 className="flex-1 border p-2 rounded"
// //                                 placeholder="Enter full state name"
// //                                 value={selectedItemForForm.stateFull || ""}
// //                                 onChange={e => {
// //                                     const fullState = e.target.value;
// //                                     const mapping = STATE_TIER_MAP[fullState];

// //                                     setSelectedItemForForm(prev => ({
// //                                         ...prev,
// //                                         stateFull: fullState, // keep the full name for display
// //                                         state: mapping?.code || "", // store the state code
// //                                         tier: mapping?.defaultTier || ""  // store the tier
// //                                     }));
// //                                 }}
// //                             />
// //                         </div>

// //                         <button
// //                             onClick={() => handleGenerate(false)}
// //                             disabled={loading}
// //                             className="bg-blue-600 text-white px-4 py-2 rounded"
// //                         >
// //                             Generate Selected WBS
// //                         </button>
// //                     </div>
// //                 )}
// //             </div>
// //             {/* BOQ LIST + BATCH */}
// //             <div className="bg-white p-6 shadow rounded">
// //                 <h3 className="font-semibold mb-3">
// //                     BOQ Items ({initialItems.length})
// //                 </h3>

// //                 <div className="flex gap-4 flex-wrap">
// //                     {initialItems.map((item, idx) => (
// //                         <div
// //                             key={idx}
// //                             onClick={() => setSelectedItemForForm({
// //                                 ...item,
// //                                 stateFull: Object.keys(STATE_TIER_MAP).find(
// //                                     k => STATE_TIER_MAP[k].code === item.state
// //                                 ) || ""
// //                             })}
// //                             className="border p-3 rounded cursor-pointer hover:bg-gray-50"
// //                         >
// //                             <p className="font-medium">{item.projectMaterial}</p>
// //                             <p className="text-sm">
// //                                 {item.quantity} {item.unit} × {item.rate}
// //                             </p>
// //                         </div>
// //                     ))}
// //                 </div>

// //                 <button
// //                     onClick={() => handleGenerate(true)}
// //                     disabled={loading || initialItems.length === 0}
// //                     className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
// //                 >
// //                     Generate WBS for All BOQ Items
// //                 </button>
// //             </div>

// //             {loading && <p className="mt-4">Generating WBS…</p>}
// //             {error && (
// //                 <div className="mt-4 bg-red-100 text-red-700 p-3 rounded">
// //                     {error}
// //                 </div>
// //             )}



// //             {allTasksByBOQ.length > 0 && (
// //                 <div className="space-y-4 mb-6">
// //                     {allTasksByBOQ.map((boqItem, idx) => (
// //                         <div key={idx} className="border rounded p-4 bg-white shadow">
// //                             {/* BOQ Heading */}
// //                             <h3
// //                                 className="font-bold text-lg mb-2 cursor-pointer"
// //                                 onClick={() =>
// //                                     setExpandedBOQ(expandedBOQ === idx ? null : idx)
// //                                 }
// //                             >
// //                                 {boqItem.boq_text}
// //                             </h3>

// //                             {/* Stages */}
// //                             {expandedBOQ === idx && (
// //                                 <div className="space-y-2 ml-2">
// //                                     {Object.entries(boqItem.tasksByStage).map(([stageName, tasks]) => (
// //                                         <div key={stageName}>
// //                                             <h4
// //                                                 className="font-semibold cursor-pointer"
// //                                                 onClick={() =>
// //                                                     setExpandedStage(prev => ({
// //                                                         ...prev,
// //                                                         [stageName + idx]: !prev[stageName + idx]
// //                                                     }))
// //                                                 }
// //                                             >
// //                                                 {stageName}
// //                                             </h4>

// //                                             {/* Tasks */}
// //                                             {expandedStage[stageName + idx] && (
// //                                                 <div className="ml-4 mt-1 space-y-1">
// //                                                     {tasks.map(task => (
// //                                                         <div
// //                                                             key={task.task_id}
// //                                                             className="p-2 border rounded flex justify-between"
// //                                                         >
// //                                                             <div>
// //                                                                 <p className="font-medium">Task name: {task.task_name}</p>
// //                                                                 <p className="text-xs text-gray-500">
// //                                                                     Optimistic: {task.duration?.optimistic_hours?.toFixed(2)}h •{" "}
// //                                                                     Most Likely: {task.duration?.most_likely_hours?.toFixed(2)}h •{" "}
// //                                                                     Pessimistic: {task.duration?.pessimistic_hours?.toFixed(2)}h •{" "}
// //                                                                     Expected: {task.duration?.expected_hours?.toFixed(2)}h
// //                                                                 </p>
// //                                                             </div>
// //                                                             <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded">
// //                                                                 {stageName}
// //                                                             </span>
// //                                                         </div>
// //                                                     ))}
// //                                                 </div>
// //                                             )}
// //                                         </div>
// //                                     ))}
// //                                 </div>
// //                             )}
// //                         </div>
// //                     ))}
// //                 </div>
// //             )}





// //         </div>
// //     );
// // }




// import { AirVent, ChevronDown } from "lucide-react"
// import React, { useState, useEffect, useMemo } from "react";
// import { generateWBS, generateWBSBatch } from "../services/api";

// // Work Types for Material Dropdown
// const WORK_TYPES = [
//   "Flooring Work",
//   "Tiling Work",
//   "False Ceiling Work",
//   "Painting / Wall Painting",
//   "Wallpaper Fixing",
//   "Carpentry Work",
//   "Modular Kitchen Installation",
//   "Furniture Installation",
//   "Glass Partition Work",
//   "Office Interior Setup",
//   "Retail Showroom Interior",
//   "Electrical Wiring",
//   "Electrical Repair & Maintenance",
//   "Plumbing Work (Interior)",
//   "Plumbing Service Work",
//   "Road Construction",
//   "Highway Widening",
//   "Drainage Construction",
//   "Storm Water Drain Work",
//   "Bridge Construction",
//   "Culvert Construction",
//   "Retaining Wall Construction",
//   "Footpath Construction",
//   "Canal Lining",
//   "Water Pipeline Laying",
//   "Sewer Line Construction",
//   "Borewell Drilling",
//   "Pump House Construction",
//   "Substation Civil Work",
//   "Underground Sump Cleaning",
//   "Overhead Water Tank Cleaning",
//   "Septic Tank Cleaning",
//   "Facility Management Services",
//   "Housekeeping Services",
//   "Painting Contract Work",
//   "Pest Control Services",
//   "AC Installation & Servicing",
//   "Lift Maintenance",
//   "Fire Safety System Installation",
//   "CCTV Installation"
// ];

// const STATE_TIER_MAP = {
//     // States
//     "Andhra Pradesh": { code: "AP", defaultTier: "T1" },
//     "Arunachal Pradesh": { code: "AR", defaultTier: "T2" },
//     "Assam": { code: "AS", defaultTier: "T1" },
//     "Bihar": { code: "BR", defaultTier: "T1" },
//     "Chhattisgarh": { code: "CG", defaultTier: "T2" },
//     "Goa": { code: "GA", defaultTier: "T1" },
//     "Gujarat": { code: "GJ", defaultTier: "T1" },
//     "Haryana": { code: "HR", defaultTier: "T1" },
//     "Himachal Pradesh": { code: "HP", defaultTier: "T2" },
//     "Jharkhand": { code: "JH", defaultTier: "T2" },
//     "Karnataka": { code: "KA", defaultTier: "T1" },
//     "Kerala": { code: "KL", defaultTier: "T1" },
//     "Madhya Pradesh": { code: "MP", defaultTier: "T2" },
//     "Maharashtra": { code: "MH", defaultTier: "T1" },
//     "Manipur": { code: "MN", defaultTier: "T2" },
//     "Meghalaya": { code: "ML", defaultTier: "T2" },
//     "Mizoram": { code: "MZ", defaultTier: "T2" },
//     "Nagaland": { code: "NL", defaultTier: "T2" },
//     "Odisha": { code: "OR", defaultTier: "T1" },
//     "Punjab": { code: "PB", defaultTier: "T1" },
//     "Rajasthan": { code: "RJ", defaultTier: "T2" },
//     "Sikkim": { code: "SK", defaultTier: "T2" },
//     "Tamil Nadu": { code: "TN", defaultTier: "T1" },
//     "Telangana": { code: "TS", defaultTier: "T1" },
//     "Tripura": { code: "TR", defaultTier: "T2" },
//     "Uttar Pradesh": { code: "UP", defaultTier: "T1" },
//     "Uttarakhand": { code: "UK", defaultTier: "T2" },
//     "West Bengal": { code: "WB", defaultTier: "T1" },

//     // Union Territories
//     "Andaman and Nicobar Islands": { code: "AN", defaultTier: "T3" },
//     "Chandigarh": { code: "CH", defaultTier: "T1" },
//     "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", defaultTier: "T2" },
//     "Delhi": { code: "DL", defaultTier: "T1" },
//     "Jammu and Kashmir": { code: "JK", defaultTier: "T2" },
//     "Ladakh": { code: "LA", defaultTier: "T3" },
//     "Lakshadweep": { code: "LD", defaultTier: "T3" },
//     "Puducherry": { code: "PY", defaultTier: "T2" }
// };
// export default function WBS({ setActiveView, initialItems = [] }) {
//     const [selectedItemForForm, setSelectedItemForForm] = useState(null);
//     const [results, setResults] = useState(null);
//     const [loading, setLoading] = useState(false);
//     const [error, setError] = useState(null);
//     const [activeStageFilter, setActiveStageFilter] = useState("All stages");
//     const [expandedBOQ, setExpandedBOQ] = useState(null); // which BOQ heading is expanded
//     const [expandedStage, setExpandedStage] = useState({});
//     const STAGES = ["All stages", "Planning", "Procurement", "Execution", "QC", "Billing"];
//     const isSuccess = Boolean(results?.success);
//     const boqItems = useMemo(() => {
//         if (!results?.data) return [];
//         return Array.isArray(results.data) ? results.data : [results.data];
//     }, [results]);

//     /* ---------------- INIT ---------------- */
//     // Sync with BOQ changes - clear WBS and related results when BOQ changes
//     useEffect(() => {
//         const checkBOQChanges = () => {
//             const stored = JSON.parse(localStorage.getItem("boqItems") || "[]");
//             // If stored BOQ doesn't match initialItems, clear WBS, BOM, and Cost Prediction results
//             if (stored.length !== initialItems.length) {
//                 localStorage.removeItem("wbsResults");
//                 localStorage.removeItem("bomResult");
//                 localStorage.removeItem("costPredictions");
//                 setResults(null);
//             }
//         };
        
//         // Check on mount and when initialItems change
//         checkBOQChanges();
        
//         // Also listen for storage events
//         window.addEventListener("storage", checkBOQChanges);
//         return () => window.removeEventListener("storage", checkBOQChanges);
//     }, [initialItems.length]);

//             // Initialize form with first BOQ item or empty form for manual generation
//     useEffect(() => {
//         if (!selectedItemForForm) {
//             if (initialItems.length > 0) {
//                 const firstItem = { ...initialItems[0] };
//                 // Get full state name for display
//                 const stateFull = Object.keys(STATE_TIER_MAP).find(
//                     k => STATE_TIER_MAP[k].code === firstItem.state
//                 ) || "";
//                 setSelectedItemForForm({
//                     ...firstItem,
//                     stateFull: stateFull
//                 });
//             } else {
//                 // Initialize with empty form for manual generation
//                 setSelectedItemForForm({
//                     projectMaterial: "",
//                     state: "",
//                     tier: "",
//                     length: "",
//                     width: "",
//                     stateFull: ""
//                 });
//             }
//         }
//     }, [initialItems, selectedItemForForm]);

//     useEffect(() => {
//         const savedResults = localStorage.getItem("wbsResults");
//         if (savedResults) {
//             setResults(JSON.parse(savedResults));
//         }
//     }, []);


//     /* ---------------- HANDLERS ---------------- */
//     const handleFormInputChange = (field, value) => {
//         setSelectedItemForForm(prev => ({ ...prev, [field]: value }));
//     };

//     const handleStateChange = (fullStateName) => {
//         const mapping = STATE_TIER_MAP[fullStateName];
//         setSelectedItemForForm(prev => ({
//             ...prev,
//             stateFull: fullStateName,
//             state: mapping?.code || "",
//             tier: mapping?.defaultTier || prev.tier || ""
//         }));
//     };

//     const handleGenerate = async (batch = false) => {
//         setLoading(true);
//         setError(null);
//         // setResults(null);

//         try {
//             if (batch) {
//                 const response = await generateWBSBatch(initialItems);

//                 const normalizedData = {
//                     success: response.success,
//                     data: response.results
//                         .filter(r => r.success && r.data)
//                         .map(r => r.data)
//                 };
//                 setResults(prev => {
//                     const prevArray = Array.isArray(prev?.data) ? prev.data : [];
//                     const newArray = Array.isArray(normalizedData.data)
//                         ? normalizedData.data
//                         : [];

//                     const mergedMap = new Map();

//                     [...prevArray, ...newArray].forEach(item => {
//                         mergedMap.set(item.boq_text, item);
//                     });

//                     const mergedResults = {
//                         success: true,
//                         data: Array.from(mergedMap.values())
//                     };

//                     localStorage.setItem("wbsResults", JSON.stringify(mergedResults));
//                     return mergedResults;
//                 });



//             } else {
//                 const response = await generateWBS([selectedItemForForm]);

//                 const normalizedData = {
//                     success: response.success,
//                     data: response.data
//                 };
//                 setResults(prev => {
//                     const prevArray = Array.isArray(prev?.data) ? prev.data : [];

//                     const newArray = Array.isArray(normalizedData.data)
//                         ? normalizedData.data
//                         : [normalizedData.data];

//                     // 🔒 Remove duplicates by boq_text
//                     const mergedMap = new Map();

//                     [...prevArray, ...newArray].forEach(item => {
//                         mergedMap.set(item.boq_text, item);
//                     });

//                     const mergedResults = {
//                         success: true,
//                         data: Array.from(mergedMap.values())
//                     };

//                     localStorage.setItem("wbsResults", JSON.stringify(mergedResults));
//                     return mergedResults;
//                 });
//             }

//         } catch (err) {
//             console.error(err);
//             setError(err.message || "Failed to generate WBS");
//         } finally {
//             setLoading(false);
//         }
//     };
//     const allTasksByBOQ = useMemo(() => {
//         if (!results?.data) return [];

//         const boqArray = Array.isArray(results.data) ? results.data : [results.data];

//         return boqArray.map(boqItem => {
//             const tasksByStage = {};
            
//             // Handle different possible data structures
//             let wbsData = boqItem?.wbs;
            
//             // Stage normalization helper to handle numeric or text stage names
//             const normalizeStageName = (name) => {
//                 if (name === null || name === undefined) return "Unknown";
//                 const raw = name.toString().trim().toLowerCase();
//                 // Handle numeric strings like "1.0", "2.0"
//                 const numericStage = Number(raw);
//                 const normalizedNumeric = Number.isFinite(numericStage) ? numericStage.toString().replace(/\.0+$/, "") : raw;
//                 const key = normalizedNumeric || raw;
//                 const stageMap = {
//                     "1": "Planning",
//                     "planning": "Planning",
//                     "plan": "Planning",
//                     "2": "Procurement",
//                     "procurement": "Procurement",
//                     "ordering materials": "Procurement",
//                     "3": "Execution",
//                     "execution": "Execution",
//                     "exec": "Execution",
//                     "4": "QC",
//                     "qc": "QC",
//                     "qc check": "QC",
//                     "5": "Billing",
//                     "billing": "Billing"
//                 };
//                 if (stageMap[key]) return stageMap[key];
//                 if (stageMap[raw]) return stageMap[raw];
//                 return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unknown";
//             };

//             // If wbs is an array (from dynamo_wbs format), convert it to stage-based object
//             if (Array.isArray(wbsData)) {
//                 wbsData = wbsData.reduce((acc, task) => {
//                     const stageName = normalizeStageName(task.stage || "Unknown");
//                     if (!acc[stageName]) {
//                         acc[stageName] = [];
//                     }
//                     acc[stageName].push(task);
//                     return acc;
//                 }, {});
//             }
            
//             // Process the wbs data
//             if (wbsData && typeof wbsData === 'object') {
//                 Object.entries(wbsData).forEach(([stageName, tasks]) => {
//                     // Ensure tasks is an array
//                     const tasksArray = Array.isArray(tasks) ? tasks : [];
//                     const normalizedStageName = normalizeStageName(stageName);

//                     const mappedTasks = tasksArray.map(task => {
//                         // Handle different task structures
//                         const taskObj = typeof task === 'string' ? { task_name: task } : task;
                        
//                         // Preserve duration object if it exists, otherwise compute from final_days
//                         let durationObj = taskObj.duration;
//                         if (!durationObj && taskObj.final_days) {
//                             const hours = taskObj.final_days * 8;
//                             durationObj = {
//                                 expected_hours: hours,
//                                 optimistic_hours: hours * 0.8,
//                                 most_likely_hours: hours,
//                                 pessimistic_hours: hours * 1.2
//                             };
//                         }
                        
//                         return {
//                             task_id: taskObj.task_id || taskObj.wbs_task_id || `task-${Math.random().toString(36).substr(2, 9)}`,
//                             task_name: taskObj.task_name || taskObj.task || task,
//                             duration: durationObj,
//                             boq_text: boqItem.boq_text
//                         };
//                     });

//                     // Combine tasks if the stage already exists
//                     if (!tasksByStage[normalizedStageName]) {
//                         tasksByStage[normalizedStageName] = mappedTasks;
//                     } else {
//                         tasksByStage[normalizedStageName] = [...tasksByStage[normalizedStageName], ...mappedTasks];
//                     }
//                 });
//             }
            
//             return {
//                 ...boqItem,
//                 tasksByStage
//             };
//         });
//     }, [results]);

//     /* ---------------- UI ---------------- */
//     return (
//         <div className="p-4">

//             {/* SUCCESS ALERT */}
//             {isSuccess && (
//                 <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
//                     <p className="font-bold">WBS Generated Successfully</p>
//                     <p>
//                         {Array.isArray(results.data)
//                             ? `Generated WBS for ${results.data.length} BOQ items`
//                             : `Generated WBS for ${results.data?.boq_text}`}
//                     </p>
//                 </div>
//             )}

//             {/* BOM CTA */}
//             {isSuccess && (
//                 <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 mb-6 flex justify-between items-center rounded">
//                     <div>
//                         <p className="font-bold">Next Step</p>
//                         <p>Proceed to generate BOM</p>
//                     </div>
//                     <button
//                         onClick={() => setActiveView("bom-generator")}
//                         className="px-4 py-2 bg-purple-600 text-white rounded"
//                     >
//                         Generate BOM →
//                     </button>
//                 </div>
//             )}

//             <h2 className="text-xl font-bold mb-4">AI-Driven WBS Creator</h2>

//             {/* SINGLE BOQ FORM */}
//             <div className="bg-white p-6 shadow rounded mb-8">
//                 <div className="flex justify-between items-center mb-4">
//                     <h3 className="font-semibold">Generate WBS (Single BOQ)</h3>
//                     <button
//                         onClick={() => {
//                             setSelectedItemForForm({
//                                 projectMaterial: "",
//                                 state: "",
//                                 tier: "",
//                                 length: "",
//                                 width: "",
//                                 stateFull: ""
//                             });
//                             setResults(null);
//                             localStorage.removeItem("wbsResults");
//                         }}
//                         className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
//                     >
//                         Start Fresh / Manual
//                     </button>
//                 </div>

//                 {selectedItemForForm && (
//                     <div className="space-y-4">
//                         {/* Project / Material Dropdown */}
//                         <div>
//                             <label className="block text-sm font-medium text-gray-700 mb-1">Project / Material</label>
//                             <div className="relative">
//                                 <select
//                                     value={selectedItemForForm.projectMaterial || ""}
//                                     onChange={(e) => handleFormInputChange("projectMaterial", e.target.value)}
//                                     className="w-full border border-gray-300 p-2 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
//                                 >
//                                     <option value="">Select Material</option>
//                                     {WORK_TYPES.map((workType) => (
//                                         <option key={workType} value={workType}>
//                                             {workType}
//                                         </option>
//                                     ))}
//                                 </select>
//                                 <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
//                                 <select
//                                     className="w-full border border-gray-300 p-2 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
//                                     value={selectedItemForForm.stateFull || ""}
//                                     onChange={(e) => handleStateChange(e.target.value)}
//                                 >
//                                     <option value="">Select State</option>
//                                     {Object.keys(STATE_TIER_MAP).map((stateName) => (
//                                         <option key={stateName} value={stateName}>
//                                             {stateName}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
//                                 <select
//                                     className="w-full border p-2 rounded"
//                                     value={selectedItemForForm.tier || ""}
//                                     onChange={e =>
//                                         handleFormInputChange("tier", e.target.value)
//                                     }
//                                 >
//                                     <option value="">Select Tier</option>
//                                     <option value="T1">T1</option>
//                                     <option value="T2">T2</option>
//                                     <option value="T3">T3</option>
//                                 </select>
//                             </div>
//                         </div>

//                         <div className="grid grid-cols-2 gap-4">
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
//                                 <input
//                                     type="number"
//                                     className="w-full border p-2 rounded"
//                                     placeholder="Length"
//                                     value={selectedItemForForm.length || ""}
//                                     onChange={e =>
//                                         handleFormInputChange("length", e.target.value)
//                                     }
//                                 />
//                             </div>
//                             <div>
//                                 <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
//                                 <input
//                                     type="number"
//                                     className="w-full border p-2 rounded"
//                                     placeholder="Width"
//                                     value={selectedItemForForm.width || ""}
//                                     onChange={e =>
//                                         handleFormInputChange("width", e.target.value)
//                                     }
//                                 />
//                             </div>
//                         </div>

//                         <button
//                             onClick={() => handleGenerate(false)}
//                             disabled={loading || !selectedItemForForm.projectMaterial}
//                             className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
//                         >
//                             Generate Selected WBS
//                         </button>
//                     </div>
//                 )}
//             </div>
//             {/* BOQ LIST + BATCH */}
//             <div className="bg-white p-6 shadow rounded">
//                 <h3 className="font-semibold mb-3">
//                     BOQ Items ({initialItems.length})
//                 </h3>

//                 <div className="flex gap-4 flex-wrap">
//                     {initialItems.map((item, idx) => (
//                         <div
//                             key={idx}
//                             onClick={() => {
//                                 const stateFull = Object.keys(STATE_TIER_MAP).find(
//                                     k => STATE_TIER_MAP[k].code === item.state
//                                 ) || "";
//                                 setSelectedItemForForm({
//                                     ...item,
//                                     stateFull: stateFull
//                                 });
//                             }}
//                             className="border p-3 rounded cursor-pointer hover:bg-green-50 hover:border-green-300 transition-all"
//                         >
//                             <p className="font-medium capitalize">{item.projectMaterial}</p>
//                             <p className="text-sm text-gray-600">
//                                 State: {item.state} | Tier: {item.tier || "-"}
//                             </p>
//                             {(item.length || item.width) && (
//                                 <p className="text-xs text-gray-500">
//                                     {item.length && `L: ${item.length}`} {item.width && `W: ${item.width}`}
//                                 </p>
//                             )}
//                         </div>
//                     ))}
//                 </div>

//                 <button
//                     onClick={() => handleGenerate(true)}
//                     disabled={loading || initialItems.length === 0}
//                     className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
//                 >
//                     Generate WBS for All BOQ Items
//                 </button>
//             </div>

//             {loading && <p className="mt-4">Generating WBS…</p>}
//             {error && (
//                 <div className="mt-4 bg-red-100 text-red-700 p-3 rounded">
//                     {error}
//                 </div>
//             )}



//             {allTasksByBOQ.length > 0 && (
//                 <div className="space-y-6 mb-6">
//                     <h2 className="text-xl font-bold text-gray-800 mb-4">Generated WBS Results</h2>
//                     {allTasksByBOQ.map((boqItem, idx) => (
//                         <div key={idx} className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50/30 to-white shadow-sm hover:shadow-md transition-shadow duration-200">
//                             {/* BOQ Heading */}
//                             <div
//                                 className="flex items-center justify-between cursor-pointer mb-4 pb-3 border-b border-green-200"
//                                 onClick={() =>
//                                     setExpandedBOQ(expandedBOQ === idx ? null : idx)
//                                 }
//                             >
//                                 <div>
//                                     <h3 className="font-bold text-lg text-gray-800 capitalize">
//                                         {boqItem.boq_text}
//                                     </h3>
//                                     <p className="text-sm text-gray-500">
//                                         {boqItem.subcategory && `Category: ${boqItem.subcategory}`}
//                                         {boqItem.wbs_id && ` | ID: ${boqItem.wbs_id.slice(0, 8)}...`}
//                                     </p>
//                                 </div>
//                                 <div className="flex items-center gap-3">
//                                     <span className="text-sm text-gray-600 bg-green-100 px-2 py-1 rounded">
//                                         {Object.keys(boqItem.tasksByStage || {}).length} stages
//                                     </span>
//                                     <span className="text-sm text-gray-500">
//                                         {expandedBOQ === idx ? "▼" : "▶"}
//                                     </span>
//                                 </div>
//                             </div>

//                             {/* Stages */}
//                             {expandedBOQ === idx && (
//                                 <div className="space-y-3 mt-4">
//                                     {Object.entries(boqItem.tasksByStage)
//                                         .sort(([a], [b]) => {
//                                             // Sort stages in logical order
//                                             const order = { "Planning": 1, "Procurement": 2, "Execution": 3, "QC": 4, "Billing": 5 };
//                                             return (order[a] || 99) - (order[b] || 99);
//                                         })
//                                         .map(([stageName, tasks]) => {
//                                             // Only show stages that have tasks or show empty state
//                                             const hasTasks = tasks && tasks.length > 0;
//                                             return (
//                                                 <div key={stageName} className="bg-white rounded-lg border border-green-100 overflow-hidden">
//                                                     {/* Stage Header - Clickable */}
//                                                     <div
//                                                         className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-50/50 cursor-pointer hover:from-green-100 hover:to-green-100/50 transition-all duration-200 flex items-center justify-between"
//                                                 onClick={() =>
//                                                     setExpandedStage(prev => ({
//                                                         ...prev,
//                                                         [stageName + idx]: !prev[stageName + idx]
//                                                     }))
//                                                 }
//                                             >
//                                                         <h4 className="font-semibold text-gray-800 capitalize flex items-center gap-2">
//                                                             <span className={`w-2 h-2 rounded-full ${hasTasks ? 'bg-green-500' : 'bg-gray-300'}`}></span>
//                                                 {stageName}
//                                             </h4>
//                                                         <div className="flex items-center gap-3">
//                                                             <span className={`text-xs px-2 py-1 rounded ${hasTasks ? 'text-gray-600 bg-white' : 'text-gray-400 bg-gray-100'}`}>
//                                                                 {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
//                                                             </span>
//                                                             <span className="text-sm text-gray-500">
//                                                                 {expandedStage[stageName + idx] ? "▼" : "▶"}
//                                                             </span>
//                                                         </div>
//                                                     </div>

//                                             {/* Tasks */}
//                                             {expandedStage[stageName + idx] && (
//                                                         <div className="p-4 space-y-3 bg-white">
//                                                             {hasTasks ? (
//                                                                 tasks.map((task, taskIdx) => (
//                                                         <div
//                                                             key={task.task_id}
//                                                             className="p-4 border border-green-100 rounded-lg bg-green-50/20 hover:bg-green-50/40 hover:border-green-200 transition-all duration-200"
//                                                         >
//                                                             <div className="flex justify-between items-start gap-4">
//                                                                 <div className="flex-1">
//                                                                     <p className="font-medium text-gray-800 mb-2">
//                                                                         {task.task_name || task.task}
//                                                                     </p>
//                                                                     <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
//                                                                         <div className="bg-white px-2 py-1 rounded border border-green-100">
//                                                                             <span className="text-gray-600">Optimistic:</span>
//                                                                             <span className="font-semibold text-gray-800 ml-1">
//                                                                                 {task.duration?.optimistic_hours != null 
//                                                                                     ? Number(task.duration.optimistic_hours).toFixed(2) 
//                                                                                     : "N/A"}h
//                                                                             </span>
//                                                             </div>
//                                                                         <div className="bg-white px-2 py-1 rounded border border-green-100">
//                                                                             <span className="text-gray-600">Most Likely:</span>
//                                                                             <span className="font-semibold text-gray-800 ml-1">
//                                                                                 {task.duration?.most_likely_hours != null 
//                                                                                     ? Number(task.duration.most_likely_hours).toFixed(2) 
//                                                                                     : "N/A"}h
//                                                                             </span>
//                                                                         </div>
//                                                                         <div className="bg-white px-2 py-1 rounded border border-green-100">
//                                                                             <span className="text-gray-600">Pessimistic:</span>
//                                                                             <span className="font-semibold text-gray-800 ml-1">
//                                                                                 {task.duration?.pessimistic_hours != null 
//                                                                                     ? Number(task.duration.pessimistic_hours).toFixed(2) 
//                                                                                     : "N/A"}h
//                                                                             </span>
//                                                                         </div>
//                                                                         <div className="bg-green-100 px-2 py-1 rounded border border-green-200">
//                                                                             <span className="text-gray-700 font-medium">Expected:</span>
//                                                                             <span className="font-bold text-green-700 ml-1">
//                                                                                 {task.duration?.expected_hours != null 
//                                                                                     ? Number(task.duration.expected_hours).toFixed(2) 
//                                                                                     : "N/A"}h
//                                                                             </span>
//                                                                         </div>
//                                                                     </div>
//                                                                 </div>
//                                                                 <span className="text-xs font-semibold px-3 py-1.5 bg-green-200 text-green-800 rounded-full whitespace-nowrap">
//                                                                 {stageName}
//                                                             </span>
//                                                         </div>
//                                                         </div>
//                                                                 ))
//                                                             ) : (
//                                                                 <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
//                                                                     <p className="text-sm">No tasks available for this stage</p>
//                                                 </div>
//                                             )}
//                                         </div>
//                                                     )}
//                                                 </div>
//                                             );
//                                         })}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             )}





//         </div>
//     );
// }



import { ChevronDown } from "lucide-react"
import React, { useState, useEffect, useMemo } from "react";
import { generateWBS, generateWBSBatch } from "../services/api";

const WORK_TYPES = [
  "Flooring Work", "Tiling Work", "False Ceiling Work", "Painting / Wall Painting",
  "Wallpaper Fixing", "Carpentry Work", "Modular Kitchen Installation",
  "Furniture Installation", "Glass Partition Work", "Office Interior Setup",
  "Retail Showroom Interior", "Electrical Wiring", "Electrical Repair & Maintenance",
  "Plumbing Work (Interior)", "Plumbing Service Work", "Road Construction",
  "Highway Widening", "Drainage Construction", "Storm Water Drain Work",
  "Bridge Construction", "Culvert Construction", "Retaining Wall Construction",
  "Footpath Construction", "Canal Lining", "Water Pipeline Laying",
  "Sewer Line Construction", "Borewell Drilling", "Pump House Construction",
  "Substation Civil Work", "Underground Sump Cleaning", "Overhead Water Tank Cleaning",
  "Septic Tank Cleaning", "Facility Management Services", "Housekeeping Services",
  "Painting Contract Work", "Pest Control Services", "AC Installation & Servicing",
  "Lift Maintenance", "Fire Safety System Installation", "CCTV Installation"
];

const STATE_TIER_MAP = {
    "Andhra Pradesh": { code: "AP", defaultTier: "T1" },
    "Arunachal Pradesh": { code: "AR", defaultTier: "T2" },
    "Assam": { code: "AS", defaultTier: "T1" },
    "Bihar": { code: "BR", defaultTier: "T1" },
    "Chhattisgarh": { code: "CG", defaultTier: "T2" },
    "Goa": { code: "GA", defaultTier: "T1" },
    "Gujarat": { code: "GJ", defaultTier: "T1" },
    "Haryana": { code: "HR", defaultTier: "T1" },
    "Himachal Pradesh": { code: "HP", defaultTier: "T2" },
    "Jharkhand": { code: "JH", defaultTier: "T2" },
    "Karnataka": { code: "KA", defaultTier: "T1" },
    "Kerala": { code: "KL", defaultTier: "T1" },
    "Madhya Pradesh": { code: "MP", defaultTier: "T2" },
    "Maharashtra": { code: "MH", defaultTier: "T1" },
    "Manipur": { code: "MN", defaultTier: "T2" },
    "Meghalaya": { code: "ML", defaultTier: "T2" },
    "Mizoram": { code: "MZ", defaultTier: "T2" },
    "Nagaland": { code: "NL", defaultTier: "T2" },
    "Odisha": { code: "OR", defaultTier: "T1" },
    "Punjab": { code: "PB", defaultTier: "T1" },
    "Rajasthan": { code: "RJ", defaultTier: "T2" },
    "Sikkim": { code: "SK", defaultTier: "T2" },
    "Tamil Nadu": { code: "TN", defaultTier: "T1" },
    "Telangana": { code: "TS", defaultTier: "T1" },
    "Tripura": { code: "TR", defaultTier: "T2" },
    "Uttar Pradesh": { code: "UP", defaultTier: "T1" },
    "Uttarakhand": { code: "UK", defaultTier: "T2" },
    "West Bengal": { code: "WB", defaultTier: "T1" },
    "Andaman and Nicobar Islands": { code: "AN", defaultTier: "T3" },
    "Chandigarh": { code: "CH", defaultTier: "T1" },
    "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", defaultTier: "T2" },
    "Delhi": { code: "DL", defaultTier: "T1" },
    "Jammu and Kashmir": { code: "JK", defaultTier: "T2" },
    "Ladakh": { code: "LA", defaultTier: "T3" },
    "Lakshadweep": { code: "LD", defaultTier: "T3" },
    "Puducherry": { code: "PY", defaultTier: "T2" }
};

export default function WBS({ setActiveView, initialItems = [] }) {
    const [selectedItemForForm, setSelectedItemForForm] = useState(null);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedBOQ, setExpandedBOQ] = useState(null);
    const [expandedStage, setExpandedStage] = useState({});
    
    const isSuccess = Boolean(results?.success);

    /* ---------------- INIT ---------------- */
    useEffect(() => {
        const checkBOQChanges = () => {
            const stored = JSON.parse(localStorage.getItem("boqItems") || "[]");
            if (stored.length !== initialItems.length) {
                localStorage.removeItem("wbsResults");
                localStorage.removeItem("bomResult");
                localStorage.removeItem("costPredictions");
                setResults(null);
            }
        };
        
        checkBOQChanges();
        window.addEventListener("storage", checkBOQChanges);
        return () => window.removeEventListener("storage", checkBOQChanges);
    }, [initialItems.length]);

    useEffect(() => {
        if (!selectedItemForForm) {
            if (initialItems.length > 0) {
                const firstItem = { ...initialItems[0] };
                const stateFull = Object.keys(STATE_TIER_MAP).find(
                    k => STATE_TIER_MAP[k].code === firstItem.state
                ) || "";
                setSelectedItemForForm({
                    ...firstItem,
                    stateFull: stateFull
                });
            } else {
                setSelectedItemForForm({
                    projectMaterial: "",
                    state: "",
                    tier: "",
                    length: "",
                    width: "",
                    stateFull: ""
                });
            }
        }
    }, [initialItems, selectedItemForForm]);

    useEffect(() => {
        const savedResults = localStorage.getItem("wbsResults");
        if (savedResults) {
            try {
                setResults(JSON.parse(savedResults));
            } catch (e) {
                console.error("Error parsing saved results:", e);
            }
        }
    }, []);

    /* ---------------- HANDLERS ---------------- */
    const handleFormInputChange = (field, value) => {
        setSelectedItemForForm(prev => {
            if (!prev) return { [field]: value };
            return { ...prev, [field]: value };
        });
    };

    const handleStateChange = (fullStateName) => {
        const mapping = STATE_TIER_MAP[fullStateName];
        setSelectedItemForForm(prev => ({
            ...(prev || {}),
            stateFull: fullStateName,
            state: mapping?.code || "",
            tier: mapping?.defaultTier || (prev?.tier) || ""
        }));
    };

    const handleGenerate = async (batch = false) => {
        setLoading(true);
        setError(null);

        try {
            if (batch) {
                // Batch generation
                if (!initialItems || initialItems.length === 0) {
                    setError("No BOQ items to generate WBS for.");
                    setLoading(false);
                    return;
                }

                const mappedProjects = initialItems.map(item => ({
                    work: item.projectMaterial,
                    length: parseFloat(item.length) || null,
                    breadth: parseFloat(item.width) || null,
                    state: item.state || null,
                    tier: item.tier || null
                }));

                console.log("Batch API Request:", { projects: mappedProjects });
                const response = await generateWBSBatch({ projects: mappedProjects });
                console.log("Batch API Response:", response);

                if (!response.success) {
                    throw new Error(response.error || 'Batch generation failed');
                }

                const successfulResults = (response.results || [])
                    .filter(r => r.success && r.data)
                    .map(r => r.data);

                console.log("Successful Results:", successfulResults);

                const normalizedData = {
                    success: true,
                    data: successfulResults
                };

                setResults(prev => {
                    const prevArray = Array.isArray(prev?.data) ? prev.data : [];
                    const newArray = Array.isArray(normalizedData.data) ? normalizedData.data : [];
                    
                    const mergedMap = new Map();
                    [...prevArray, ...newArray].forEach(item => {
                        const key = item.boq_text || item.matched_work || item.projectMaterial;
                        mergedMap.set(key, item);
                    });

                    const mergedResults = {
                        success: true,
                        data: Array.from(mergedMap.values())
                    };

                    localStorage.setItem("wbsResults", JSON.stringify(mergedResults));
                    return mergedResults;
                });
            } else {
                // Single generation - with comprehensive validation
                if (!selectedItemForForm) {
                    setError("Form not initialized. Please refresh and try again.");
                    setLoading(false);
                    return;
                }

                if (!selectedItemForForm.projectMaterial || selectedItemForForm.projectMaterial.trim() === "") {
                    setError("Please select a project/material.");
                    setLoading(false);
                    return;
                }

                const mappedItem = {
                    work: selectedItemForForm.projectMaterial,
                    length: parseFloat(selectedItemForForm.length) || null,
                    breadth: parseFloat(selectedItemForForm.width) || null,
                    state: selectedItemForForm.state || null,
                    tier: selectedItemForForm.tier || null
                };

                console.log("Single API Request:", mappedItem);
                const response = await generateWBS(mappedItem);
                console.log("Single API Response:", response);

                if (!response.success) {
                    throw new Error(response.error || 'Generation failed');
                }

                const normalizedData = {
                    success: true,
                    data: response.data
                };

                setResults(prev => {
                    const prevArray = Array.isArray(prev?.data) ? prev.data : [];
                    const newItem = normalizedData.data;

                    const mergedMap = new Map();
                    prevArray.forEach(item => {
                        const key = item.boq_text || item.matched_work || item.projectMaterial;
                        mergedMap.set(key, item);
                    });
                    
                    const newKey = newItem.boq_text || newItem.matched_work || newItem.projectMaterial;
                    mergedMap.set(newKey, newItem);

                    const mergedResults = {
                        success: true,
                        data: Array.from(mergedMap.values())
                    };

                    localStorage.setItem("wbsResults", JSON.stringify(mergedResults));
                    return mergedResults;
                });
            }
        } catch (err) {
            console.error("WBS Generation Error:", err);
            setError(err.message || "Failed to generate WBS");
        } finally {
            setLoading(false);
        }
    };

    const allTasksByBOQ = useMemo(() => {
        if (!results?.data) return [];

        const boqArray = Array.isArray(results.data) ? results.data : [results.data];

        return boqArray.map(boqItem => {
            const tasksByStage = {};
            let wbsData = boqItem?.wbs;
            
            const normalizeStageName = (name) => {
                if (name === null || name === undefined) return "Unknown";
                const raw = name.toString().trim().toLowerCase();
                const numericStage = Number(raw);
                const normalizedNumeric = Number.isFinite(numericStage) ? numericStage.toString().replace(/\.0+$/, "") : raw;
                const key = normalizedNumeric || raw;
                const stageMap = {
                    "1": "Planning", "planning": "Planning", "plan": "Planning",
                    "2": "Procurement", "procurement": "Procurement", "ordering materials": "Procurement",
                    "3": "Execution", "execution": "Execution", "exec": "Execution",
                    "4": "QC", "qc": "QC", "qc check": "QC",
                    "5": "Billing", "billing": "Billing"
                };
                if (stageMap[key]) return stageMap[key];
                if (stageMap[raw]) return stageMap[raw];
                return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unknown";
            };

            if (Array.isArray(wbsData)) {
                wbsData = wbsData.reduce((acc, task) => {
                    const stageName = normalizeStageName(task.stage || "Unknown");
                    if (!acc[stageName]) acc[stageName] = [];
                    acc[stageName].push(task);
                    return acc;
                }, {});
            }
            
            if (wbsData && typeof wbsData === 'object') {
                Object.entries(wbsData).forEach(([stageName, tasks]) => {
                    const tasksArray = Array.isArray(tasks) ? tasks : [];
                    const normalizedStageName = normalizeStageName(stageName);

                    const mappedTasks = tasksArray.map(task => {
                        const taskObj = typeof task === 'string' ? { task_name: task } : task;
                        
                        let durationObj = taskObj.duration;
                        if (!durationObj && taskObj.final_days) {
                            const hours = taskObj.final_days * 8;
                            durationObj = {
                                expected_hours: hours,
                                optimistic_hours: hours * 0.8,
                                most_likely_hours: hours,
                                pessimistic_hours: hours * 1.2
                            };
                        }
                        
                        return {
                            task_id: taskObj.task_id || taskObj.wbs_task_id || `task-${Math.random().toString(36).substr(2, 9)}`,
                            task_name: taskObj.task_name || taskObj.task || task,
                            duration: durationObj,
                            boq_text: boqItem.boq_text
                        };
                    });

                    if (!tasksByStage[normalizedStageName]) {
                        tasksByStage[normalizedStageName] = mappedTasks;
                    } else {
                        tasksByStage[normalizedStageName] = [...tasksByStage[normalizedStageName], ...mappedTasks];
                    }
                });
            }
            
            return { ...boqItem, tasksByStage };
        });
    }, [results]);

    /* ---------------- UI ---------------- */
    return (
        <div className="p-4">
            {isSuccess && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded">
                    <p className="font-bold">WBS Generated Successfully</p>
                    <p>
                        {Array.isArray(results.data)
                            ? `Generated WBS for ${results.data.length} BOQ items`
                            : `Generated WBS for ${results.data?.boq_text}`}
                    </p>
                </div>
            )}

            {isSuccess && (
                <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 mb-6 flex justify-between items-center rounded">
                    <div>
                        <p className="font-bold">Next Step</p>
                        <p>Proceed to generate BOM</p>
                    </div>
                    <button
                        onClick={() => setActiveView("bom-generator")}
                        className="px-4 py-2 bg-purple-600 text-white rounded"
                    >
                        Generate BOM →
                    </button>
                </div>
            )}

            <h2 className="text-xl font-bold mb-4">AI-Driven WBS Creator</h2>

            <div className="bg-white p-6 shadow rounded mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Generate WBS (Single BOQ)</h3>
                    <button
                        onClick={() => {
                            setSelectedItemForForm({
                                projectMaterial: "",
                                state: "",
                                tier: "",
                                length: "",
                                width: "",
                                stateFull: ""
                            });
                            setResults(null);
                            localStorage.removeItem("wbsResults");
                        }}
                        className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                        Start Fresh / Manual
                    </button>
                </div>

                {selectedItemForForm && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project / Material</label>
                            <div className="relative">
                                <select
                                    value={selectedItemForForm.projectMaterial || ""}
                                    onChange={(e) => handleFormInputChange("projectMaterial", e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                                >
                                    <option value="">Select Material</option>
                                    {WORK_TYPES.map((workType) => (
                                        <option key={workType} value={workType}>{workType}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <select
                                    className="w-full border border-gray-300 p-2 rounded bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
                                    value={selectedItemForForm.stateFull || ""}
                                    onChange={(e) => handleStateChange(e.target.value)}
                                >
                                    <option value="">Select State</option>
                                    {Object.keys(STATE_TIER_MAP).map((stateName) => (
                                        <option key={stateName} value={stateName}>{stateName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
                                <select
                                    className="w-full border p-2 rounded"
                                    value={selectedItemForForm.tier || ""}
                                    onChange={e => handleFormInputChange("tier", e.target.value)}
                                >
                                    <option value="">Select Tier</option>
                                    <option value="T1">T1</option>
                                    <option value="T2">T2</option>
                                    <option value="T3">T3</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    placeholder="Length"
                                    value={selectedItemForForm.length || ""}
                                    onChange={e => handleFormInputChange("length", e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    placeholder="Width"
                                    value={selectedItemForForm.width || ""}
                                    onChange={e => handleFormInputChange("width", e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={loading || !selectedItemForForm?.projectMaterial}
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
                        >
                            Generate Selected WBS
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-6 shadow rounded">
                <h3 className="font-semibold mb-3">BOQ Items ({initialItems.length})</h3>

                <div className="flex gap-4 flex-wrap">
                    {initialItems.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => {
                                const stateFull = Object.keys(STATE_TIER_MAP).find(
                                    k => STATE_TIER_MAP[k].code === item.state
                                ) || "";
                                setSelectedItemForForm({
                                    ...item,
                                    stateFull: stateFull
                                });
                            }}
                            className="border p-3 rounded cursor-pointer hover:bg-green-50 hover:border-green-300 transition-all"
                        >
                            <p className="font-medium capitalize">{item.projectMaterial}</p>
                            <p className="text-sm text-gray-600">
                                State: {item.state} | Tier: {item.tier || "-"}
                            </p>
                            {(item.length || item.width) && (
                                <p className="text-xs text-gray-500">
                                    {item.length && `L: ${item.length}`} {item.width && `W: ${item.width}`}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => handleGenerate(true)}
                    disabled={loading || initialItems.length === 0}
                    className="mt-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded transition-colors"
                >
                    Generate WBS for All BOQ Items
                </button>
            </div>

            {loading && <p className="mt-4">Generating WBS…</p>}
            {error && (
                <div className="mt-4 bg-red-100 text-red-700 p-3 rounded">
                    {error}
                </div>
            )}

            {allTasksByBOQ.length > 0 && (
                <div className="space-y-6 mb-6 mt-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Generated WBS Results</h2>
                    {allTasksByBOQ.map((boqItem, idx) => (
                        <div key={idx} className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50/30 to-white shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div
                                className="flex items-center justify-between cursor-pointer mb-4 pb-3 border-b border-green-200"
                                onClick={() => setExpandedBOQ(expandedBOQ === idx ? null : idx)}
                            >
                                <div>
                                    <h3 className="font-bold text-lg text-gray-800 capitalize">
                                        {boqItem.boq_text}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {boqItem.subcategory && `Category: ${boqItem.subcategory}`}
                                        {boqItem.wbs_id && ` | ID: ${boqItem.wbs_id.slice(0, 8)}...`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 bg-green-100 px-2 py-1 rounded">
                                        {Object.keys(boqItem.tasksByStage || {}).length} stages
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {expandedBOQ === idx ? "▼" : "▶"}
                                    </span>
                                </div>
                            </div>

                            {expandedBOQ === idx && (
                                <div className="space-y-3 mt-4">
                                    {Object.entries(boqItem.tasksByStage)
                                        .sort(([a], [b]) => {
                                            const order = { "Planning": 1, "Procurement": 2, "Execution": 3, "QC": 4, "Billing": 5 };
                                            return (order[a] || 99) - (order[b] || 99);
                                        })
                                        .map(([stageName, tasks]) => {
                                            const hasTasks = tasks && tasks.length > 0;
                                            return (
                                                <div key={stageName} className="bg-white rounded-lg border border-green-100 overflow-hidden">
                                                    <div
                                                        className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-50/50 cursor-pointer hover:from-green-100 hover:to-green-100/50 transition-all duration-200 flex items-center justify-between"
                                                        onClick={() =>
                                                            setExpandedStage(prev => ({
                                                                ...prev,
                                                                [stageName + idx]: !prev[stageName + idx]
                                                            }))
                                                        }
                                                    >
                                                        <h4 className="font-semibold text-gray-800 capitalize flex items-center gap-2">
                                                            <span className={`w-2 h-2 rounded-full ${hasTasks ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                                                            {stageName}
                                                        </h4>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-xs px-2 py-1 rounded ${hasTasks ? 'text-gray-600 bg-white' : 'text-gray-400 bg-gray-100'}`}>
                                                                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
                                                            </span>
                                                            <span className="text-sm text-gray-500">
                                                                {expandedStage[stageName + idx] ? "▼" : "▶"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {expandedStage[stageName + idx] && (
                                                        <div className="p-4 space-y-3 bg-white">
                                                            {hasTasks ? (
                                                                tasks.map((task) => (
                                                                    <div
                                                                        key={task.task_id}
                                                                        className="p-4 border border-green-100 rounded-lg bg-green-50/20 hover:bg-green-50/40 hover:border-green-200 transition-all duration-200"
                                                                    >
                                                                        <div className="flex justify-between items-start gap-4">
                                                                            <div className="flex-1">
                                                                                <p className="font-medium text-gray-800 mb-2">
                                                                                    {task.task_name || task.task}
                                                                                </p>
                                                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                                                    <div className="bg-white px-2 py-1 rounded border border-green-100">
                                                                                        <span className="text-gray-600">Optimistic:</span>
                                                                                        <span className="font-semibold text-gray-800 ml-1">
                                                                                            {task.duration?.optimistic_hours != null 
                                                                                                ? Number(task.duration.optimistic_hours).toFixed(2) 
                                                                                                : "N/A"}h
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="bg-white px-2 py-1 rounded border border-green-100">
                                                                                        <span className="text-gray-600">Most Likely:</span>
                                                                                        <span className="font-semibold text-gray-800 ml-1">
                                                                                            {task.duration?.most_likely_hours != null 
                                                                                                ? Number(task.duration.most_likely_hours).toFixed(2) 
                                                                                                : "N/A"}h
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="bg-white px-2 py-1 rounded border border-green-100">
                                                                                        <span className="text-gray-600">Pessimistic:</span>
                                                                                        <span className="font-semibold text-gray-800 ml-1">
                                                                                            {task.duration?.pessimistic_hours != null 
                                                                                                ? Number(task.duration.pessimistic_hours).toFixed(2) 
                                                                                                : "N/A"}h
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="bg-green-100 px-2 py-1 rounded border border-green-200">
                                                                                        <span className="text-gray-700 font-medium">Expected:</span>
                                                                                        <span className="font-bold text-green-700 ml-1">
                                                                                            {task.duration?.expected_hours != null 
                                                                                                ? Number(task.duration.expected_hours).toFixed(2) 
                                                                                                : "N/A"}h
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-xs font-semibold px-3 py-1.5 bg-green-200 text-green-800 rounded-full whitespace-nowrap">
                                                                                {stageName}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                                                                    <p className="text-sm">No tasks available for this stage</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}