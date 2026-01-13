import { useEffect, useState, useMemo } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  Trash2,
  Building2,
} from "lucide-react";

import { bomAPI, estimationAPI } from "../services/api";

const BOM = ({ setActiveView, setPostResult, postResult = null }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [bomResult, setBomResult] = useState([]); // Now stores { materialName, items: [] }[]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedMaterial, setExpandedMaterial] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Retrieve initial BOQ items from local storage
  const [boqItems, setBoqItems] = useState(
    JSON.parse(localStorage.getItem("boqItems")) || []
  );
  const [projectDays, setProjectDays] = useState();

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

  // Group BOM results by material name (e.g., "False Ceiling Gypsum")
  const groupedBOMResults = useMemo(() => {
    const groups = {};
    bomResult.forEach((material) => {
      const materialName = material.materialName || "Unknown Material";
      const normalizedName = materialName.trim().toLowerCase();

      if (!groups[normalizedName]) {
        groups[normalizedName] = [];
      }
      groups[normalizedName].push(material);
    });

    // Convert to display format with original names
    const displayGroups = {};
    Object.entries(groups).forEach(([normalizedKey, items]) => {
      displayGroups[items[0].materialName] = items;
    });
    return displayGroups;
  }, [bomResult]);

  const toggleGroup = (materialName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [materialName]: !prev[materialName],
    }));
  };

  const removeBOMGroup = (materialName) => {
    const updated = bomResult.filter((item) => {
      const itemMaterialName = item.materialName || "";
      return (
        itemMaterialName.toLowerCase().trim() !==
        materialName.toLowerCase().trim()
      );
    });
    setBomResult(updated);
    localStorage.setItem("bomResult", JSON.stringify(updated));
    // Close the group if it's expanded
    setExpandedGroups((prev) => {
      const newGroups = { ...prev };
      delete newGroups[materialName];
      return newGroups;
    });
  };
  console.log(selectedItem);
  const generateSingle = async () => {
    if (!selectedItem) return;

    try {
      setLoading(true);
      setError(null);

      // 1️ Generate BOM using bomAPI.predict
      const bomRes = await bomAPI.predict({
        boqData: [
          {
            work_name: selectedItem.projectMaterial,
            dimensions: {
              area: [{ value: selectedItem.quantity, unit: selectedItem.unit }],
            },
          },
        ],
        projectDays: Number(projectDays),
      });

      // Handle various possible backend response structures
      const bomItems =
        bomRes.data?.data?.bom_items ||
        bomRes.data?.bom_items ||
        bomRes.bom_items ||
        bomRes.data ||
        [];

      // Store as grouped by material
      const materialResult = {
        materialName: selectedItem.projectMaterial,
        state: selectedItem.state,
        tier: selectedItem.tier,
        length: selectedItem.length,
        width: selectedItem.width,
        items: bomItems,
      };

      // Merge with existing results (replace if same material exists)
      setBomResult((prev) => {
        const existing = Array.isArray(prev)
          ? prev.filter((p) => p.materialName !== selectedItem.projectMaterial)
          : [];
        const updated = [...existing, materialResult];
        localStorage.setItem("bomResult", JSON.stringify(updated));
        return updated;
      });

      // 2️⃣ Call COST ESTIMATION using estimationAPI.calculate
      const estimationRes = await estimationAPI.calculate({
        state_tier: selectedItem.state + "-" + selectedItem.tier,
        boq_items: [
          {
            boq_id: "string",
            boq_name: selectedItem.projectMaterial,
            bom_items: bomItems.map((item) => ({
              item_name: item.Item_Name,
              quantity: item.Predicted_Quantity,
            })),
          },
        ],
      });

      const estimationData =
        estimationRes?.data?.data || estimationRes?.data || estimationRes;

      // Store cost prediction grouped by material
      const costPrediction = {
        materialName: selectedItem.projectMaterial,
        state: selectedItem.state,
        tier: selectedItem.tier,
        length: selectedItem.length,
        width: selectedItem.width,
        estimation: estimationData,
      };

      // Store in localStorage
      const existingCosts = JSON.parse(
        localStorage.getItem("costPredictions") || "[]"
      );
      const updatedCosts = existingCosts.filter(
        (c) => c.materialName !== selectedItem.projectMaterial
      );
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
          //   userWork: item.projectMaterial,
          //   length: Number(item.length || 1),
          //   breadth: Number(item.width || 1),
          boqData: [
            {
              work_name: item.projectMaterial,
              dimensions: {
                length: [{ value: item.length, unit: item.unit }],
              },
            },
          ],
          projectDays,
        });

        const bomItems =
          res.data?.data?.bom_items ||
          res.data?.bom_items ||
          res.bom_items ||
          res.data ||
          [];

        // Store grouped by material
        allMaterialResults.push({
          materialName: item.projectMaterial,
          state: item.state,
          tier: item.tier,
          length: item.length,
          width: item.width,
          items: bomItems,
        });

        const file =
          res.data?.data?.bomFile || res.data?.bomFile || "predicted_bom.xlsx";

        bomFiles.push(file);
      }

      // SHOW BOM TABLE - grouped by material
      setBomResult(allMaterialResults);
      localStorage.setItem("bomResult", JSON.stringify(allMaterialResults));

      // COST ESTIMATION (BATCH)
      const estimationRes = await estimationAPI.calculate({
        stateCode: boqItems[0]?.state,
        cityTier: boqItems[0]?.tier,
        bomFiles,
      });

      // Aggregate totals from all BOMs and store individually
      const batchData =
        estimationRes.data?.data || estimationRes.data || estimationRes;
      const allCostPredictions = [];
      const existingCosts = JSON.parse(
        localStorage.getItem("costPredictions") || "[]"
      );

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
              estimation: res,
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
              estimation: null,
            });
          }
        }

        // Calculate aggregated total
        let totalMin = 0,
          totalLikely = 0,
          totalMax = 0;
        batchData.forEach((res) => {
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
            max: totalMax,
          },
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
            estimation: batchData,
          });
        } else {
          // Multiple materials but single result - store for all with same estimation
          boqItems.forEach((item) => {
            allCostPredictions.push({
              materialName: item.projectMaterial,
              state: item.state,
              tier: item.tier,
              length: item.length,
              width: item.width,
              estimation: batchData,
            });
          });
        }
        setPostResult(batchData);
      }

      // Merge with existing costs (replace duplicates by material name, case-insensitive)
      const mergedCosts = existingCosts.filter(
        (c) =>
          !allCostPredictions.some(
            (newCost) =>
              newCost.materialName?.toLowerCase() ===
              c.materialName?.toLowerCase()
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
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">BOM Generator</h2>
        <p className="text-gray-600">
          Generate Bill of Materials from WBS / BOQ
        </p>
      </div>

      {/* Generate Buttons */}
      <div className="flex gap-3">
        <input
          className="flex-1 px-6 py-3 focus:outline-none rounded-lg disabled:bg-gray-400/20 border"
          type="number"
          placeholder="Enter number of days for this project"
          disabled={boqItems.length === 0}
          value={projectDays}
          onChange={(e) => setProjectDays(e.target.value)}
        />
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
          onClick={generateSingle}
          disabled={!selectedItem || loading}
        >
          Generate BOM (Selected)
        </button>
        <button
          onClick={generateBatch}
          disabled={boqItems.length === 0 || loading}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
        >
          Generate BOM for All ({boqItems.length})
        </button>
      </div>

      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">
          <p className="font-medium">Generating BOM from AI...</p>
          <p className="text-sm mt-1">
            Please wait while we process your request
          </p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* BOQ Items Section - Grouped by Work Name */}
      {boqItems.length > 0 && (
        <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                BOQ Items ({boqItems.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Select an item to generate BOM or generate for all
              </p>
            </div>
          </div>

          {/* Group BOQ items by work name */}
          {(() => {
            const groups = {};
            boqItems.forEach((item, idx) => {
              const workName =
                item.projectMaterial || item.work || "Unknown Work";
              const normalizedName = workName.trim().toLowerCase();
              if (!groups[normalizedName]) {
                groups[normalizedName] = [];
              }
              groups[normalizedName].push({ ...item, originalIndex: idx });
            });

            return (
              <div className="space-y-3">
                {Object.entries(groups).map(([normalizedKey, items]) => {
                  const workName =
                    items[0].projectMaterial || items[0].work || "Unknown Work";
                  return (
                    <div
                      key={normalizedKey}
                      className="border border-green-200 rounded-lg overflow-hidden"
                    >
                      <div className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-left">
                            <p className="font-semibold text-gray-800 capitalize">
                              {workName}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {items.length}{" "}
                              {items.length === 1 ? "item" : "items"}
                              {items[0]?.state && ` • State: ${items[0].state}`}
                              {items[0]?.tier && ` • Tier: ${items[0].tier}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-white text-green-700 rounded-full text-xs font-medium border border-green-200">
                            {items.length}{" "}
                            {items.length === 1 ? "item" : "items"}
                          </span>
                          {items.map((item, idx) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedItem(item)}
                              className={`p-2 border rounded cursor-pointer transition-all ${
                                selectedItem === item
                                  ? "border-green-600 bg-green-100"
                                  : "border-gray-200 bg-white hover:border-green-300"
                              }`}
                              title="Click to select"
                            >
                              <p className="text-xs font-medium">#{idx + 1}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {boqItems.length === 0 && !loading && (
        <div className="bg-white border border-green-200 rounded-lg p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No BOQ Items Found
          </h3>
          <p className="text-gray-600 mb-4">
            Please generate BOQ items first before creating BOM.
          </p>
          <button
            onClick={() => setActiveView("boq-generator")}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
          >
            Go to BOQ Generator →
          </button>
        </div>
      )}

      {/* Generated BOM Results - Grouped by Material Type */}
      {Object.keys(groupedBOMResults).length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-800">
              Generated BOM Results
            </h3>
            <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded">
              {bomResult.length} BOM{" "}
              {bomResult.length === 1 ? "result" : "results"}
              {Object.keys(groupedBOMResults).length > 0 &&
                ` • ${Object.keys(groupedBOMResults).length} ${
                  Object.keys(groupedBOMResults).length === 1
                    ? "material type"
                    : "material types"
                }`}
            </span>
          </div>

          {/* Grouped BOM Results by Material Type */}
          <div className="space-y-3">
            {Object.entries(groupedBOMResults).map(
              ([materialName, materials]) => (
                <div
                  key={materialName}
                  className="border border-green-200 rounded-lg overflow-hidden"
                >
                  {/* Material Type Group Header - Clickable with Delete */}
                  <div className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors">
                    <button
                      onClick={() => toggleGroup(materialName)}
                      className="flex-1 flex items-center gap-3 text-left"
                    >
                      {expandedGroups[materialName] ? (
                        <ChevronDown className="w-5 h-5 text-green-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-green-600" />
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-gray-800 capitalize">
                          {materialName}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {materials.length}{" "}
                          {materials.length === 1
                            ? "BOM result"
                            : "BOM results"}
                          {materials[0]?.state &&
                            ` • State: ${materials[0].state}`}
                          {materials[0]?.tier &&
                            ` • Tier: ${materials[0].tier}`}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-white text-green-700 rounded-full text-xs font-medium border border-green-200">
                        {materials.length}{" "}
                        {materials.length === 1 ? "result" : "results"}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Are you sure you want to delete all "${materialName}" BOM results?`
                            )
                          ) {
                            removeBOMGroup(materialName);
                          }
                        }}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-all"
                        title={`Delete all ${materialName} BOM results`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Grouped BOM Items - Expandable */}
                  {expandedGroups[materialName] && (
                    <div className="p-4 bg-white space-y-4">
                      {materials.map((material, materialIdx) => (
                        <div
                          key={materialIdx}
                          className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50/30 to-white shadow-sm"
                        >
                          {/* Individual Material Header */}
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-green-200">
                            <div>
                              <h4 className="font-bold text-base text-gray-800 capitalize">
                                {materialName}
                                {materials.length > 1 && ` #${materialIdx + 1}`}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {material.state && `State: ${material.state}`}
                                {material.tier && ` • Tier: ${material.tier}`}
                                {material.length &&
                                  ` • Length: ${material.length}`}
                                {material.width &&
                                  ` • Width: ${material.width}`}
                              </p>
                            </div>
                            <span className="text-sm text-gray-600 bg-green-100 px-2 py-1 rounded">
                              {material.items?.length || 0} BOM{" "}
                              {material.items?.length === 1 ? "item" : "items"}
                            </span>
                          </div>

                          {/* BOM Items Table */}
                          {material.items && material.items.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-gray-50 border-b border-green-200">
                                    <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                      Item Name
                                    </th>
                                    <th className="p-2 text-right font-semibold text-gray-700 text-xs">
                                      Quantity
                                    </th>
                                    <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                      Unit
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {material.items.map((item, itemIdx) => (
                                    <tr
                                      key={itemIdx}
                                      className="border-b border-green-100 hover:bg-green-50/30 transition-colors"
                                    >
                                      <td className="p-2 text-gray-800">
                                        {item.Item_Name ||
                                          item.item_name ||
                                          "N/A"}
                                      </td>
                                      <td className="p-2 text-right text-gray-700">
                                        {item.Predicted_Quantity ||
                                          item.predicted_quantity ||
                                          item.quantity ||
                                          "N/A"}
                                      </td>
                                      <td className="p-2 text-gray-600">
                                        {item.Unit || item.unit || "N/A"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-sm">
                                No BOM items generated for this material
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
          </div>

          {/* Cost Prediction Button */}
          <div className="flex justify-end">
            <button
              disabled={!postResult}
              onClick={() => setActiveView("post-predictor")}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
            >
              Cost Prediction →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOM;
