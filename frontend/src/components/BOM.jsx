

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { bomAPI, estimationAPI } from '../services/api';


const BOM = ({ setActiveView, setPostResult, postResult = null }) => {
    const [selectedItem, setSelectedItem] = useState(null);
    const [bomResult, setBomResult] = useState([]); // Now stores { materialName, items: [] }[]
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expandedMaterial, setExpandedMaterial] = useState(null);

    // Retrieve initial BOQ items from local storage
    const [boqItems, setBoqItems] = useState(
        JSON.parse(localStorage.getItem("boqItems")) || []
    );

   
    useEffect(() => {
        const handleStorageChange = () => {
            setBoqItems(JSON.parse(localStorage.getItem("boqItems")) || []);
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, []);
    useEffect(() => {
        const savedBOM = localStorage.getItem("bomResult");
        if (savedBOM) {
            const parsed = JSON.parse(savedBOM);
            // Handle both old format (flat array) and new format (grouped by material)
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Check if it's new format (has materialName property)
                if (parsed[0].materialName) {
                    setBomResult(parsed);
                } else {
                    // Old format - convert to new format as "Unknown Material"
                    setBomResult([{ materialName: "Generated BOM", items: parsed }]);
                }
            }
        }
    }, []);

    // Sync with BOQ changes
    useEffect(() => {
        const handleStorageChange = () => {
            const stored = JSON.parse(localStorage.getItem("boqItems") || "[]");
            setBoqItems(stored);
            // If BOQ items changed, clear BOM results
            if (stored.length !== boqItems.length) {
                localStorage.removeItem("bomResult");
                setBomResult([]);
            }
        };

        window.addEventListener("storage", handleStorageChange);
        // Also check on mount
        const stored = JSON.parse(localStorage.getItem("boqItems") || "[]");
        if (stored.length !== boqItems.length) {
            localStorage.removeItem("bomResult");
            setBomResult([]);
        }

        return () => window.removeEventListener("storage", handleStorageChange);
    }, [boqItems.length]);



    const generateSingle = async () => {
        if (!selectedItem) return;

        try {
            setLoading(true);
            setError(null);

            // 1️ Generate BOM using bomAPI.predict
            const bomRes = await bomAPI.predict({
                userWork: selectedItem.projectMaterial,
                length: Number(selectedItem.length),
                breadth: Number(selectedItem.width),
            });

            // Handle various possible backend response structures
            const bomItems = bomRes.data?.data?.bom_items || bomRes.data?.bom_items || bomRes.bom_items || [];

            // Store as grouped by material
            const materialResult = {
                materialName: selectedItem.projectMaterial,
                state: selectedItem.state,
                tier: selectedItem.tier,
                length: selectedItem.length,
                width: selectedItem.width,
                items: bomItems
            };

            // Merge with existing results (replace if same material exists)
            setBomResult(prev => {
                const existing = Array.isArray(prev) ? prev.filter(p => p.materialName !== selectedItem.projectMaterial) : [];
                const updated = [...existing, materialResult];
                localStorage.setItem("bomResult", JSON.stringify(updated));
                return updated;
            });

            // 2️⃣ Call COST ESTIMATION using estimationAPI.calculate
            const estimationRes = await estimationAPI.calculate({
                stateCode: selectedItem.state,
                cityTier: selectedItem.tier,
                bomFiles: [
                    bomRes.data?.data?.bomFile ||
                    bomRes.data?.bomFile ||
                    'predicted_bom.xlsx'
                ]
            });

            const estimationData =
                estimationRes?.data?.data ||
                estimationRes?.data ||
                estimationRes;

            // Store cost prediction grouped by material
            const costPrediction = {
                materialName: selectedItem.projectMaterial,
                state: selectedItem.state,
                tier: selectedItem.tier,
                length: selectedItem.length,
                width: selectedItem.width,
                estimation: estimationData
            };

            // Store in localStorage
            const existingCosts = JSON.parse(localStorage.getItem("costPredictions") || "[]");
            const updatedCosts = existingCosts.filter(c => c.materialName !== selectedItem.projectMaterial);
            updatedCosts.push(costPrediction);
            localStorage.setItem("costPredictions", JSON.stringify(updatedCosts));

            setPostResult(estimationData);

        } catch (err) {
            setError(err.message || "Failed to generate BOM & Cost");
        } finally {
            setLoading(false);
        }
    };

    const generateBatch = async () => {
        try {
            setLoading(true);
            setError(null);

            const allMaterialResults = [];
            const bomFiles = [];

            for (const item of boqItems) {
                const res = await bomAPI.predict({
                    userWork: item.projectMaterial,
                    length: Number(item.length || 1),
                    breadth: Number(item.width || 1),
                });

                const bomItems =
                    res.data?.data?.bom_items ||
                    res.data?.bom_items ||
                    res.bom_items ||
                    [];

                // Store grouped by material
                allMaterialResults.push({
                    materialName: item.projectMaterial,
                    state: item.state,
                    tier: item.tier,
                    length: item.length,
                    width: item.width,
                    items: bomItems
                });

                const file =
                    res.data?.data?.bomFile ||
                    res.data?.bomFile ||
                    'predicted_bom.xlsx';

                bomFiles.push(file);
            }

            // SHOW BOM TABLE - grouped by material
            setBomResult(allMaterialResults);
            localStorage.setItem("bomResult", JSON.stringify(allMaterialResults));

            // COST ESTIMATION (BATCH)
            const estimationRes = await estimationAPI.calculate({
                stateCode: boqItems[0]?.state,
                cityTier: boqItems[0]?.tier,
                bomFiles
            });

            // Aggregate totals from all BOMs and store individually
            const batchData = estimationRes.data?.data || estimationRes.data || estimationRes;
            const allCostPredictions = [];
            const existingCosts = JSON.parse(localStorage.getItem("costPredictions") || "[]");

            if (Array.isArray(batchData)) {
                // API returned array - map each result to corresponding material
                batchData.forEach((res, idx) => {
                    if (boqItems[idx]) {
                        allCostPredictions.push({
                            materialName: boqItems[idx].projectMaterial,
                            state: boqItems[idx].state,
                            tier: boqItems[idx].tier,
                            length: boqItems[idx].length,
                            width: boqItems[idx].width,
                            estimation: res
                        });
                    }
                });

                // If array length doesn't match, create entries for missing materials
                if (batchData.length < boqItems.length) {
                    for (let idx = batchData.length; idx < boqItems.length; idx++) {
                        allCostPredictions.push({
                            materialName: boqItems[idx].projectMaterial,
                            state: boqItems[idx].state,
                            tier: boqItems[idx].tier,
                            length: boqItems[idx].length,
                            width: boqItems[idx].width,
                            estimation: null
                        });
                    }
                }

                // Calculate aggregated total
                let totalMin = 0, totalLikely = 0, totalMax = 0;
                batchData.forEach(res => {
                    if (res && res.grand_total) {
                        totalMin += res.grand_total.min || 0;
                        totalLikely += res.grand_total.likely || 0;
                        totalMax += res.grand_total.max || 0;
                    }
                });

                setPostResult({
                    ...batchData[0], 
                    grand_total: {
                        min: totalMin,
                        likely: totalLikely,
                        max: totalMax
                    }
                });
            } else {
                // Single aggregated result - distribute to all materials or store for first
                if (boqItems.length === 1) {
                    // Single material - store directly
                    allCostPredictions.push({
                        materialName: boqItems[0].projectMaterial,
                        state: boqItems[0].state,
                        tier: boqItems[0].tier,
                        length: boqItems[0].length,
                        width: boqItems[0].width,
                        estimation: batchData
                    });
                } else {
                    // Multiple materials but single result - store for all with same estimation
                    boqItems.forEach(item => {
                        allCostPredictions.push({
                            materialName: item.projectMaterial,
                            state: item.state,
                            tier: item.tier,
                            length: item.length,
                            width: item.width,
                            estimation: batchData
                        });
                    });
                }
                setPostResult(batchData);
            }

            // Merge with existing costs (replace duplicates by material name, case-insensitive)
            const mergedCosts = existingCosts.filter(c => 
                !allCostPredictions.some(newCost => 
                    newCost.materialName?.toLowerCase() === c.materialName?.toLowerCase()
                )
            );
            const finalCosts = [...mergedCosts, ...allCostPredictions];
            
            // Store all cost predictions in localStorage
            localStorage.setItem("costPredictions", JSON.stringify(finalCosts));

        } catch (err) {
            setError(err.message || "Failed to generate batch BOM & estimation");
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Sparkles className="text-green-600" /> BOM Generator
                </h2>
                <p className="text-gray-600">Generate Bill of Materials from WBS / BOQ</p>
            </div>

            <div className="flex gap-3">
                <button onClick={generateSingle} className="px-4 py-2 bg-blue-600 text-white rounded">+ Generate BOM</button>
                <button onClick={generateBatch} className="px-4 py-2 bg-green-600 text-white rounded">Generate BOM for All ({boqItems.length})</button>
            </div>
            {loading && <p className="text-blue-600">Generating BOM from AI...</p>}
            {error && <p className="text-red-600">{error}</p>}


            {/* BOQ Items Selector List (Dynamically mapped from boqItems state) */}
            <div className="bg-green-50 p-4 rounded border">
                <h4 className="font-medium mb-2">BOQ Items ({boqItems.length})</h4>
                <div className="grid grid-cols-3 gap-3">
                    {boqItems.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedItem(item)}
                            className={`p-3 border rounded cursor-pointer ${selectedItem === item
                                ? "border-green-600 bg-green-100"
                                : "bg-white"
                                }`}
                        >
                            <p className="font-semibold capitalize">{item.projectMaterial}</p>
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
            </div>

            {/* BOM Result - Grouped by Material */}
            {bomResult.length > 0 && (
                <div className="mt-6 space-y-4">
                    <h3 className="font-semibold text-lg text-gray-800">Generated BOM Results</h3>
                    
                    {bomResult.map((material, idx) => (
                        <div key={idx} className="border border-green-200 rounded-lg overflow-hidden bg-white shadow-sm">
                            {/* Material Header - Clickable */}
                            <div 
                                className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 cursor-pointer flex items-center justify-between"
                                onClick={() => setExpandedMaterial(expandedMaterial === idx ? null : idx)}
                            >
                                <div>
                                    <h4 className="font-bold text-gray-800 capitalize text-lg">{material.materialName}</h4>
                                    <p className="text-sm text-gray-600">
                                        State: {material.state} | Tier: {material.tier || "-"} 
                                        {material.length && ` | L: ${material.length}`}
                                        {material.width && ` W: ${material.width}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                                        {material.items?.length || 0} items
                                    </span>
                                    <span className="text-gray-500">{expandedMaterial === idx ? "▼" : "▶"}</span>
                                </div>
                            </div>
                            
                            {/* BOM Items Table */}
                            {expandedMaterial === idx && material.items && material.items.length > 0 && (
                                <div className="p-4">
                                    <table className="w-full border text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-2 border text-left">Item Name</th>
                                                <th className="p-2 border text-left">Quantity</th>
                                                <th className="p-2 border text-left">Unit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {material.items.map((item, itemIdx) => (
                                                <tr key={itemIdx} className="border-t hover:bg-green-50">
                                                    <td className="p-2 border">{item.Item_Name}</td>
                                                    <td className="p-2 border">{item.Predicted_Quantity}</td>
                                                    <td className="p-2 border">{item.Unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            
                            {expandedMaterial === idx && (!material.items || material.items.length === 0) && (
                                <div className="p-4 text-center text-gray-500">
                                    No BOM items generated for this material
                                </div>
                            )}
                        </div>
                    ))}
                    
                    <button
                        disabled={!postResult}
                        onClick={() => setActiveView("post-predictor")}
                        className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 transition-colors"
                    >
                        Cost Prediction →
                    </button>
                </div>
            )}

        </div>
    );
};

export default BOM;
