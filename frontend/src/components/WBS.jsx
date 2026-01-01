
// import { AirVent } from "lucide-react"
// import React, { useState, useEffect, useMemo } from "react";
// import { generateWBS, generateWBSBatch } from "../services/api";
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
//     useEffect(() => {
//         if (initialItems.length > 0 && !selectedItemForForm) {
//             setSelectedItemForForm({ ...initialItems[0] });
//         }
//     }, [initialItems, selectedItemForForm]);

//     useEffect(() => {
//         const savedResults = sessionStorage.getItem("wbsResults");
//         if (savedResults) {
//             setResults(JSON.parse(savedResults));
//         }
//     }, []);
//     useEffect(() => {
//     const handleBeforeUnload = () => {
//         sessionStorage.removeItem("wbsResults");
//     };

//     window.addEventListener("beforeunload", handleBeforeUnload);

//     return () => {
//         window.removeEventListener("beforeunload", handleBeforeUnload);
//     };
// }, []);


//     /* ---------------- HANDLERS ---------------- */
//     const handleFormInputChange = (field, value) => {
//         setSelectedItemForForm(prev => ({ ...prev, [field]: value }));
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

//                     sessionStorage.setItem("wbsResults", JSON.stringify(mergedResults));
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

//                     sessionStorage.setItem("wbsResults", JSON.stringify(mergedResults));
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
//             if (boqItem?.wbs) {
//                 Object.entries(boqItem.wbs).forEach(([stageName, tasks]) => {
//                     tasksByStage[stageName] = tasks.map(task => ({
//                         ...task,
//                         boq_text: boqItem.boq_text
//                     }));
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
//                 <h3 className="font-semibold mb-4">Generate WBS (Single BOQ)</h3>

//                 {selectedItemForForm && (
//                     <div className="space-y-4">
//                         <input
//                             className="w-full border p-2 rounded"
//                             placeholder="BOQ Item"
//                             value={selectedItemForForm.projectMaterial || ""}
//                             onChange={e =>
//                                 handleFormInputChange("projectMaterial", e.target.value)
//                             }
//                         />

//                         <div className="flex gap-4">
//                             <input
//                                 type="number"
//                                 className="flex-1 border p-2 rounded"
//                                 placeholder="Quantity"
//                                 value={selectedItemForForm.quantity || ""}
//                                 onChange={e =>
//                                     handleFormInputChange("quantity", e.target.value)
//                                 }
//                             />
//                             <input
//                                 className="flex-1 border p-2 rounded"
//                                 placeholder="Unit"
//                                 value={selectedItemForForm.unit || ""}
//                                 onChange={e =>
//                                     handleFormInputChange("unit", e.target.value)
//                                 }
//                             />
//                             <input
//                                 className="flex-1 border p-2 rounded"
//                                 placeholder="Enter full state name"
//                                 value={selectedItemForForm.stateFull || ""}
//                                 onChange={e => {
//                                     const fullState = e.target.value;
//                                     const mapping = STATE_TIER_MAP[fullState];

//                                     setSelectedItemForForm(prev => ({
//                                         ...prev,
//                                         stateFull: fullState, // keep the full name for display
//                                         state: mapping?.code || "", // store the state code
//                                         tier: mapping?.defaultTier || ""  // store the tier
//                                     }));
//                                 }}
//                             />
//                         </div>

//                         <button
//                             onClick={() => handleGenerate(false)}
//                             disabled={loading}
//                             className="bg-blue-600 text-white px-4 py-2 rounded"
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
//                             onClick={() => setSelectedItemForForm({
//                                 ...item,
//                                 stateFull: Object.keys(STATE_TIER_MAP).find(
//                                     k => STATE_TIER_MAP[k].code === item.state
//                                 ) || ""
//                             })}
//                             className="border p-3 rounded cursor-pointer hover:bg-gray-50"
//                         >
//                             <p className="font-medium">{item.projectMaterial}</p>
//                             <p className="text-sm">
//                                 {item.quantity} {item.unit} × {item.rate}
//                             </p>
//                         </div>
//                     ))}
//                 </div>

//                 <button
//                     onClick={() => handleGenerate(true)}
//                     disabled={loading || initialItems.length === 0}
//                     className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
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
//                 <div className="space-y-4 mb-6">
//                     {allTasksByBOQ.map((boqItem, idx) => (
//                         <div key={idx} className="border rounded p-4 bg-white shadow">
//                             {/* BOQ Heading */}
//                             <h3
//                                 className="font-bold text-lg mb-2 cursor-pointer"
//                                 onClick={() =>
//                                     setExpandedBOQ(expandedBOQ === idx ? null : idx)
//                                 }
//                             >
//                                 {boqItem.boq_text}
//                             </h3>

//                             {/* Stages */}
//                             {expandedBOQ === idx && (
//                                 <div className="space-y-2 ml-2">
//                                     {Object.entries(boqItem.tasksByStage).map(([stageName, tasks]) => (
//                                         <div key={stageName}>
//                                             <h4
//                                                 className="font-semibold cursor-pointer"
//                                                 onClick={() =>
//                                                     setExpandedStage(prev => ({
//                                                         ...prev,
//                                                         [stageName + idx]: !prev[stageName + idx]
//                                                     }))
//                                                 }
//                                             >
//                                                 {stageName}
//                                             </h4>

//                                             {/* Tasks */}
//                                             {expandedStage[stageName + idx] && (
//                                                 <div className="ml-4 mt-1 space-y-1">
//                                                     {tasks.map(task => (
//                                                         <div
//                                                             key={task.task_id}
//                                                             className="p-2 border rounded flex justify-between"
//                                                         >
//                                                             <div>
//                                                                 <p className="font-medium">Task name: {task.task_name}</p>
//                                                                 <p className="text-xs text-gray-500">
//                                                                     Optimistic: {task.duration?.optimistic_hours?.toFixed(2)}h •{" "}
//                                                                     Most Likely: {task.duration?.most_likely_hours?.toFixed(2)}h •{" "}
//                                                                     Pessimistic: {task.duration?.pessimistic_hours?.toFixed(2)}h •{" "}
//                                                                     Expected: {task.duration?.expected_hours?.toFixed(2)}h
//                                                                 </p>
//                                                             </div>
//                                                             <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded">
//                                                                 {stageName}
//                                                             </span>
//                                                         </div>
//                                                     ))}
//                                                 </div>
//                                             )}
//                                         </div>
//                                     ))}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             )}





//         </div>
//     );
// }




import { AirVent } from "lucide-react"
import React, { useState, useEffect, useMemo } from "react";
import { generateWBS, generateWBSBatch } from "../services/api";
const STATE_TIER_MAP = {
    // States
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

    // Union Territories
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
    const [activeStageFilter, setActiveStageFilter] = useState("All stages");
    const [expandedBOQ, setExpandedBOQ] = useState(null); // which BOQ heading is expanded
    const [expandedStage, setExpandedStage] = useState({});
    const STAGES = ["All stages", "Planning", "Procurement", "Execution", "QC", "Billing"];
    const isSuccess = Boolean(results?.success);
    const boqItems = useMemo(() => {
        if (!results?.data) return [];
        return Array.isArray(results.data) ? results.data : [results.data];
    }, [results]);

    /* ---------------- INIT ---------------- */
    useEffect(() => {
        if (initialItems.length > 0 && !selectedItemForForm) {
            setSelectedItemForForm({ ...initialItems[0] });
        }
    }, [initialItems, selectedItemForForm]);

    useEffect(() => {
        const savedResults = sessionStorage.getItem("wbsResults");
        if (savedResults) {
            setResults(JSON.parse(savedResults));
        }
    }, []);
    useEffect(() => {
    const handleBeforeUnload = () => {
        sessionStorage.removeItem("wbsResults");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
    };
}, []);


    /* ---------------- HANDLERS ---------------- */
    const handleFormInputChange = (field, value) => {
        setSelectedItemForForm(prev => ({ ...prev, [field]: value }));
    };

    const handleGenerate = async (batch = false) => {
        setLoading(true);
        setError(null);
        // setResults(null);

        try {
            if (batch) {
                const response = await generateWBSBatch(initialItems);

                const normalizedData = {
                    success: response.success,
                    data: response.results
                        .filter(r => r.success && r.data)
                        .map(r => r.data)
                };
                setResults(prev => {
                    const prevArray = Array.isArray(prev?.data) ? prev.data : [];
                    const newArray = Array.isArray(normalizedData.data)
                        ? normalizedData.data
                        : [];

                    const mergedMap = new Map();

                    [...prevArray, ...newArray].forEach(item => {
                        mergedMap.set(item.boq_text, item);
                    });

                    const mergedResults = {
                        success: true,
                        data: Array.from(mergedMap.values())
                    };

                    sessionStorage.setItem("wbsResults", JSON.stringify(mergedResults));
                    return mergedResults;
                });



            } else {
                const response = await generateWBS([selectedItemForForm]);

                const normalizedData = {
                    success: response.success,
                    data: response.data
                };
                setResults(prev => {
                    const prevArray = Array.isArray(prev?.data) ? prev.data : [];

                    const newArray = Array.isArray(normalizedData.data)
                        ? normalizedData.data
                        : [normalizedData.data];

                    // 🔒 Remove duplicates by boq_text
                    const mergedMap = new Map();

                    [...prevArray, ...newArray].forEach(item => {
                        mergedMap.set(item.boq_text, item);
                    });

                    const mergedResults = {
                        success: true,
                        data: Array.from(mergedMap.values())
                    };

                    sessionStorage.setItem("wbsResults", JSON.stringify(mergedResults));
                    return mergedResults;
                });
            }

        } catch (err) {
            console.error(err);
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
            if (boqItem?.wbs) {
                Object.entries(boqItem.wbs).forEach(([stageName, tasks]) => {
                    tasksByStage[stageName] = tasks.map(task => ({
                        ...task,
                        boq_text: boqItem.boq_text
                    }));
                });
            }
            return {
                ...boqItem,
                tasksByStage
            };
        });
    }, [results]);

    /* ---------------- UI ---------------- */
    return (
        <div className="p-4">

            {/* SUCCESS ALERT */}
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

            {/* BOM CTA */}
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

            {/* SINGLE BOQ FORM */}
            <div className="bg-white p-6 shadow rounded mb-8">
                <h3 className="font-semibold mb-4">Generate WBS (Single BOQ)</h3>

                {selectedItemForForm && (
                    <div className="space-y-4">
                        <input
                            className="w-full border p-2 rounded"
                            placeholder="BOQ Item"
                            value={selectedItemForForm.projectMaterial || ""}
                            onChange={e =>
                                handleFormInputChange("projectMaterial", e.target.value)
                            }
                        />

                        <div className="flex gap-4">
                            <input
                                type="number"
                                className="flex-1 border p-2 rounded"
                                placeholder="Quantity"
                                value={selectedItemForForm.quantity || ""}
                                onChange={e =>
                                    handleFormInputChange("quantity", e.target.value)
                                }
                            />
                            <input
                                className="flex-1 border p-2 rounded"
                                placeholder="Unit"
                                value={selectedItemForForm.unit || ""}
                                onChange={e =>
                                    handleFormInputChange("unit", e.target.value)
                                }
                            />
                            <input
                                className="flex-1 border p-2 rounded"
                                placeholder="Enter full state name"
                                value={selectedItemForForm.stateFull || ""}
                                onChange={e => {
                                    const fullState = e.target.value;
                                    const mapping = STATE_TIER_MAP[fullState];

                                    setSelectedItemForForm(prev => ({
                                        ...prev,
                                        stateFull: fullState, // keep the full name for display
                                        state: mapping?.code || "", // store the state code
                                        tier: mapping?.defaultTier || ""  // store the tier
                                    }));
                                }}
                            />
                        </div>

                        <button
                            onClick={() => handleGenerate(false)}
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 rounded"
                        >
                            Generate Selected WBS
                        </button>
                    </div>
                )}
            </div>
            {/* BOQ LIST + BATCH */}
            <div className="bg-white p-6 shadow rounded">
                <h3 className="font-semibold mb-3">
                    BOQ Items ({initialItems.length})
                </h3>

                <div className="flex gap-4 flex-wrap">
                    {initialItems.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedItemForForm({
                                ...item,
                                stateFull: Object.keys(STATE_TIER_MAP).find(
                                    k => STATE_TIER_MAP[k].code === item.state
                                ) || ""
                            })}
                            className="border p-3 rounded cursor-pointer hover:bg-gray-50"
                        >
                            <p className="font-medium">{item.projectMaterial}</p>
                            <p className="text-sm">
                                {item.quantity} {item.unit} × {item.rate}
                            </p>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => handleGenerate(true)}
                    disabled={loading || initialItems.length === 0}
                    className="mt-4 bg-green-600 text-white px-4 py-2 rounded"
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
                <div className="space-y-4 mb-6">
                    {allTasksByBOQ.map((boqItem, idx) => (
                        <div key={idx} className="border rounded p-4 bg-white shadow">
                            {/* BOQ Heading */}
                            <h3
                                className="font-bold text-lg mb-2 cursor-pointer"
                                onClick={() =>
                                    setExpandedBOQ(expandedBOQ === idx ? null : idx)
                                }
                            >
                                {boqItem.boq_text}
                            </h3>

                            {/* Stages */}
                            {expandedBOQ === idx && (
                                <div className="space-y-2 ml-2">
                                    {Object.entries(boqItem.tasksByStage).map(([stageName, tasks]) => (
                                        <div key={stageName}>
                                            <h4
                                                className="font-semibold cursor-pointer"
                                                onClick={() =>
                                                    setExpandedStage(prev => ({
                                                        ...prev,
                                                        [stageName + idx]: !prev[stageName + idx]
                                                    }))
                                                }
                                            >
                                                {stageName}
                                            </h4>

                                            {/* Tasks */}
                                            {expandedStage[stageName + idx] && (
                                                <div className="ml-4 mt-1 space-y-1">
                                                    {tasks.map(task => (
                                                        <div
                                                            key={task.task_id}
                                                            className="p-2 border rounded flex justify-between"
                                                        >
                                                            <div>
                                                                <p className="font-medium">Task name: {task.task_name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    Optimistic: {task.duration?.optimistic_hours?.toFixed(2)}h •{" "}
                                                                    Most Likely: {task.duration?.most_likely_hours?.toFixed(2)}h •{" "}
                                                                    Pessimistic: {task.duration?.pessimistic_hours?.toFixed(2)}h •{" "}
                                                                    Expected: {task.duration?.expected_hours?.toFixed(2)}h
                                                                </p>
                                                            </div>
                                                            <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded">
                                                                {stageName}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}





        </div>
    );
}

