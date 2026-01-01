

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { bomAPI, estimationAPI } from '../services/api';


const BOM = ({ setActiveView, setPostResult, postResult = null }) => {
    const [selectedItem, setSelectedItem] = useState(null);
    const [bomResult, setBomResult] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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
        const savedBOM = sessionStorage.getItem("bomResult");
        if (savedBOM) {
            setBomResult(JSON.parse(savedBOM));
        }
    }, []);
    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem("bomResult");
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);



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

            setBomResult(bomItems);
            sessionStorage.setItem("bomResult", JSON.stringify(bomItems));

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

            // setPostResult(estimationRes.data?.data);
            const estimationData =
                estimationRes?.data?.data ||
                estimationRes?.data ||
                estimationRes;

            setPostResult(estimationData);
            // setActiveView("post-predictor");

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

            const allBomItems = [];
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

                allBomItems.push(...bomItems);

                const file =
                    res.data?.data?.bomFile ||
                    res.data?.bomFile ||
                    'predicted_bom.xlsx';

                bomFiles.push(file);
            }

            // SHOW BOM TABLE
            setBomResult(allBomItems);
            sessionStorage.setItem("bomResult", JSON.stringify(allBomItems));

            // COST ESTIMATION (BATCH)
            const estimationRes = await estimationAPI.calculate({
                stateCode: boqItems[0]?.state,
                cityTier: boqItems[0]?.tier,
                bomFiles
            });

            // Aggregate totals from all BOMs
            const batchData = estimationRes.data?.data;
            if (Array.isArray(batchData)) {
                let totalMin = 0, totalLikely = 0, totalMax = 0;

                batchData.forEach(res => {
                    totalMin += res.grand_total?.min || 0;
                    totalLikely += res.grand_total?.likely || 0;
                    totalMax += res.grand_total?.max || 0;
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
                setPostResult(batchData || estimationRes.data || estimationRes);
            }

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
                            <p className="font-semibold">{item.projectMaterial}</p>
                            <p className="text-sm text-gray-600">
                                Qty: {item.quantity} {item.unit}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* BOM Result Table (Dynamically rendered based on API response) */}
            {bomResult.length > 0 && (
                <div className="mt-6 border rounded p-4 bg-white">
                    <h3 className="font-semibold mb-3">Generated BOM</h3>
                    <table className="w-full border text-sm">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2 border text-left">Item Name</th>
                                <th className="p-2 border text-left">Quantity</th>
                                <th className="p-2 border text-left">Unit</th>
                                {/* <th className="p-2 border text-left">Cost Component</th> */}
                            </tr>
                        </thead>
                        <tbody>
                            {bomResult.map((item, idx) => (
                                <tr key={idx} className="border-t">
                                    <td className="p-2 border">{item.Item_Name}</td>
                                    <td className="p-2 border">{item.Predicted_Quantity}</td>
                                    <td className="p-2 border">{item.Unit}</td>
                                    {/* <td className="p-2 border">{item.Cost_Component}</td> */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <button
                        disabled={!postResult}
                        onClick={() => setActiveView("post-predictor")}
                        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                    >
                        Cost Prediction →
                    </button>
                </div>
            )}

        </div>
    );
};

export default BOM;
