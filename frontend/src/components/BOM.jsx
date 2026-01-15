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
  const [selectedItems, setSelectedItems] = useState([]); // Changed to array for multi-select
  const [bomResult, setBomResult] = useState([]); // Now stores { materialName, items: [] }[]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedMaterial, setExpandedMaterial] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Retrieve initial WBS results from local storage
  const [wbsResults, setWbsResults] = useState(
    JSON.parse(localStorage.getItem("wbsResults")) || null
  );
  const [projectDays, setProjectDays] = useState();

  // Also keep BOQ items for backwards compatibility
  const [boqItems, setBoqItems] = useState(
    JSON.parse(localStorage.getItem("boqItems")) || []
  );

  useEffect(() => {
    const handleStorageChange = () => {
      setBoqItems(JSON.parse(localStorage.getItem("boqItems")) || []);
      // Also refresh WBS results if available
      setWbsResults(JSON.parse(localStorage.getItem("wbsResults")) || null);
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Load WBS results on mount
  useEffect(() => {
    const savedWBS = localStorage.getItem("wbsResults");
    if (savedWBS) {
      try {
        const parsed = JSON.parse(savedWBS);
        if (parsed && parsed.success && Array.isArray(parsed.data)) {
          setWbsResults(parsed);
          // When WBS results are loaded, filter out any BOQ items from selectedItems
          setSelectedItems((prev) => prev.filter((item) => item.wbs_id));
        }
      } catch (e) {
        console.error("Error loading WBS results:", e);
      }
    }
  }, []);

  // When WBS results change, ensure selectedItems only contains WBS items
  useEffect(() => {
    if (wbsResults?.data && wbsResults.data.length > 0) {
      setSelectedItems((prev) => prev.filter((item) => item.wbs_id));
    }
  }, [wbsResults]);

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
  // Toggle selection of an item (multi-select)
  // Prioritize WBS items - only select WBS items when WBS results are available
  const toggleItemSelection = (item) => {
    setSelectedItems((prev) => {
      // For WBS items, check by wbs_id
      if (item.wbs_id) {
        const isSelected = prev.some(
          (selected) => selected.wbs_id === item.wbs_id
        );
        if (isSelected) {
          // Remove if already selected
          return prev.filter((selected) => selected.wbs_id !== item.wbs_id);
        } else {
          // Add if not selected - ensure we're adding the full WBS item
          return [...prev, item];
        }
      } else {
        // For BOQ items (fallback when no WBS results), check by projectMaterial and originalIndex
        const isSelected = prev.some(
          (selected) =>
            selected.projectMaterial === item.projectMaterial &&
            selected.originalIndex === item.originalIndex
        );
        if (isSelected) {
          return prev.filter(
            (selected) =>
              !(
                selected.projectMaterial === item.projectMaterial &&
                selected.originalIndex === item.originalIndex
              )
          );
        } else {
          return [...prev, item];
        }
      }
    });
  };

  const generateSelected = async () => {
    if (!selectedItems || selectedItems.length === 0) {
      setError("No items selected. Please select items to generate BOM.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Generate BOM using bomAPI.predict with WBS objects
      // Pass the selected WBS objects directly in boqData array
      const bomRes = await bomAPI.predict({
        boqData: selectedItems, // Use WBS objects directly from selectedItems
        projectDays: Number(projectDays),
      });

      // Handle new API response structure - array of BOM items
      const bomItems =
        bomRes.data?.data?.bom_items ||
        bomRes.data?.bom_items ||
        bomRes.bom_items ||
        bomRes.data ||
        [];

      // Group BOM items by wbs_id (since multiple materials can belong to same WBS)
      const bomItemsByWbsId = {};
      if (Array.isArray(bomItems)) {
        bomItems.forEach((bomItem) => {
          const wbsId = bomItem.wbs_id;
          if (!bomItemsByWbsId[wbsId]) {
            bomItemsByWbsId[wbsId] = [];
          }
          bomItemsByWbsId[wbsId].push(bomItem);
        });
      }

      // Map selected WBS items to their BOM results
      const materialResults = selectedItems.map((selectedItem) => {
        const wbsId = selectedItem.wbs_id;
        const bomItemsForWbs = bomItemsByWbsId[wbsId] || [];

        return {
          wbs_id: wbsId,
          materialName:
            selectedItem.boq_reference ||
            bomItemsForWbs[0]?.work_item ||
            "Unknown Material",
          work_item: bomItemsForWbs[0]?.work_item || selectedItem.boq_reference,
          location: selectedItem.location,
          original_qty: selectedItem.original_qty,
          state: selectedItem.state,
          tier: selectedItem.tier,
          items: bomItemsForWbs, // Array of BOM items for this WBS
        };
      });

      // Merge with existing results (replace if same wbs_id exists, otherwise add all)
      setBomResult((prev) => {
        const existing = Array.isArray(prev) ? prev : [];
        // Filter out any existing results with the same wbs_id as the new results
        // For items without wbs_id, check by materialName and location combination
        const filteredExisting = existing.filter((p) => {
          return !materialResults.some((m) => {
            // If both have wbs_id, match by wbs_id
            if (m.wbs_id && p.wbs_id) {
              return m.wbs_id === p.wbs_id;
            }
            // If no wbs_id, match by materialName and location
            if (!m.wbs_id && !p.wbs_id) {
              return (
                m.materialName === p.materialName && m.location === p.location
              );
            }
            return false;
          });
        });
        // Add all new material results
        const updated = [...filteredExisting, ...materialResults];
        localStorage.setItem("bomResult", JSON.stringify(updated));
        return updated;
      });

      // 2️⃣ Call COST ESTIMATION using estimationAPI.calculate
      // This will be done in the next step as per your request
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to generate BOM");
      console.error("BOM Generation Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // const generateBatch = async () => {
  //   try {
  //     setLoading(true);
  //     setError(null);

  //     // Use WBS results if available, otherwise fall back to BOQ items
  //     const itemsToProcess = wbsResults?.data || boqItems;

  //     if (!itemsToProcess || itemsToProcess.length === 0) {
  //       setError("No items available to process");
  //       return;
  //     }

  //     const allMaterialResults = [];
  //     const bomFiles = [];

  //     // Process each WBS result or BOQ item
  //     for (const item of itemsToProcess) {
  //       // For WBS format, use the item directly; for BOQ format, map to expected structure
  //       const processItem = item.wbs_id
  //         ? item // WBS format
  //         : {
  //             // BOQ format fallback
  //             boq_reference: item.projectMaterial,
  //             state: item.state,
  //             tier: item.tier,
  //             location: "N/A",
  //             original_qty: item.quantity,
  //           };

  //       const res = await bomAPI.predict({
  //         boqData: [processItem], // Pass as array with single WBS/mapped object
  //         projectDays,
  //       });

  //       const bomItems =
  //         res.data?.data?.bom_items ||
  //         res.data?.bom_items ||
  //         res.bom_items ||
  //         res.data ||
  //         [];

  //       // Handle new API response structure - array of BOM items grouped by wbs_id
  //       const bomItemsArray = Array.isArray(bomItems) ? bomItems : [];

  //       // Store grouped by material (boq_reference for WBS, projectMaterial for BOQ)
  //       const materialName =
  //         processItem.boq_reference || processItem.projectMaterial;
  //       const workItem = bomItemsArray[0]?.work_item || materialName;

  //       allMaterialResults.push({
  //         wbs_id: processItem.wbs_id || null,
  //         materialName: materialName,
  //         work_item: workItem,
  //         state: processItem.state,
  //         tier: processItem.tier,
  //         location: processItem.location || "N/A",
  //         original_qty: processItem.original_qty || processItem.quantity,
  //         items: bomItemsArray, // Array of BOM items with new structure
  //       });

  //       const file =
  //         res.data?.data?.bomFile || res.data?.bomFile || "predicted_bom.xlsx";

  //       bomFiles.push(file);
  //     }

  //     // Merge with existing results (replace if same wbs_id exists, otherwise add all)
  //     setBomResult((prev) => {
  //       const existing = Array.isArray(prev) ? prev : [];
  //       // Filter out any existing results with the same wbs_id as the new results
  //       // For items without wbs_id, check by materialName and location combination
  //       const filteredExisting = existing.filter((p) => {
  //         return !allMaterialResults.some((m) => {
  //           // If both have wbs_id, match by wbs_id
  //           if (m.wbs_id && p.wbs_id) {
  //             return m.wbs_id === p.wbs_id;
  //           }
  //           // If no wbs_id, match by materialName and location
  //           if (!m.wbs_id && !p.wbs_id) {
  //             return (
  //               m.materialName === p.materialName && m.location === p.location
  //             );
  //           }
  //           return false;
  //         });
  //       });
  //       // Add all new material results
  //       const updated = [...filteredExisting, ...allMaterialResults];
  //       localStorage.setItem("bomResult", JSON.stringify(updated));
  //       return updated;
  //     });

  //     // COST ESTIMATION (BATCH) - will be implemented in next step
  //     setError(null);
  //   } catch (err) {
  //     setError(err.message || "Failed to generate batch BOM");
  //     console.error("Batch BOM Generation Error:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCostPrediction = async () => {
    if (!bomResult || bomResult.length === 0) {
      setError("No BOM results available. Please generate BOM first.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Flatten all BOM items from all results into a single array
      const allBomItems = bomResult.flatMap((bom) => bom.items || []);

      // Format payload - filter out items with quantity 0
      const payload = allBomItems.map((item) => ({
        item_name: item.material_name || item.item_name,
        quantity: item.quantity || 0,
        unit: item.unit || "Unit",
      }));

      if (payload.length === 0) {
        setError("No valid BOM items with quantity > 0 found.");
        return;
      }

      const result = await estimationAPI.calculate({ bomData: payload });

      // Store the result in localStorage for POSTPredictor to use
      if (result && result.data) {
        localStorage.setItem("costPredictions", JSON.stringify(result.data));
        // Also update postResult if needed
        if (setPostResult) {
          setPostResult(result);
        }
        // Navigate to post-predictor view
        setActiveView("post-predictor");
      }
    } catch (err) {
      setError(err.message || "Failed to calculate cost estimation");
      console.error("Cost Prediction Error:", err);
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
      <div className="flex gap-3 flex-wrap">
        <input
          className="flex-1 px-6 py-3 focus:outline-none rounded-lg disabled:bg-gray-400/20 border"
          type="number"
          placeholder="Enter number of days for this project"
          disabled={
            boqItems.length === 0 &&
            (!wbsResults?.data || wbsResults.data.length === 0)
          }
          value={projectDays}
          onChange={(e) => setProjectDays(e.target.value)}
        />
        <button
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium whitespace-nowrap"
          onClick={generateSelected}
          disabled={selectedItems.length === 0 || loading}
        >
          Generate BOM ({selectedItems.length} selected)
        </button>
        <button
          // onClick={generateBatch}
          disabled={
            (boqItems.length === 0 &&
              (!wbsResults?.data || wbsResults.data.length === 0)) ||
            loading
          }
          className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium whitespace-nowrap"
        >
          Generate BOM for All ({wbsResults?.data?.length || boqItems.length})
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
      {/* Only show BOQ items if WBS results are not available */}
      {boqItems.length > 0 &&
        (!wbsResults?.data || wbsResults.data.length === 0) && (
          <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  BOQ Items ({boqItems.length})
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Click items to select multiple items for BOM generation
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
                      items[0].projectMaterial ||
                      items[0].work ||
                      "Unknown Work";
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
                                {items[0]?.state &&
                                  ` • State: ${items[0].state}`}
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
                                onClick={() => toggleItemSelection(item)}
                                className={`p-2 border rounded cursor-pointer transition-all ${
                                  selectedItems.some(
                                    (s) =>
                                      s.projectMaterial ===
                                        item.projectMaterial &&
                                      s.originalIndex === item.originalIndex
                                  )
                                    ? "border-blue-600 bg-blue-100"
                                    : "border-gray-200 bg-white hover:border-green-300"
                                }`}
                                title="Click to select/deselect"
                              >
                                <p className="text-xs font-medium">
                                  #{idx + 1}
                                </p>
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

      {/* WBS Results Section - If WBS results are available */}
      {wbsResults?.data && wbsResults.data.length > 0 && (
        <div className="bg-white border border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">
                WBS Items ({wbsResults.data.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Click WBS items to select multiple items for BOM generation
              </p>
            </div>
          </div>

          {/* Group WBS items by boq_reference */}
          {(() => {
            const groups = {};
            wbsResults.data.forEach((item, idx) => {
              const workName = item.boq_reference || "Unknown Work";
              const normalizedName = workName.trim().toLowerCase();
              if (!groups[normalizedName]) {
                groups[normalizedName] = [];
              }
              groups[normalizedName].push({ ...item, originalIndex: idx });
            });

            return (
              <div className="space-y-3">
                {Object.entries(groups).map(([normalizedKey, items]) => {
                  const workName = items[0].boq_reference || "Unknown Work";
                  return (
                    <div
                      key={normalizedKey}
                      className="border border-blue-200 rounded-lg overflow-hidden"
                    >
                      <div className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-left">
                            <p className="font-semibold text-gray-800 capitalize">
                              {workName}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              Location: {items[0]?.location || "N/A"} • Qty:{" "}
                              {items[0]?.original_qty || "N/A"}
                              {items[0]?.state && ` • State: ${items[0].state}`}
                              {items[0]?.tier && ` • Tier: ${items[0].tier}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-white text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                            {items.length}{" "}
                            {items.length === 1 ? "item" : "items"}
                          </span>
                          {items.map((item, idx) => (
                            <div
                              key={item.wbs_id || idx}
                              onClick={() => {
                                // Ensure we're passing the full WBS item object
                                toggleItemSelection(item);
                              }}
                              className={`p-2 border rounded cursor-pointer transition-all ${
                                selectedItems.some(
                                  (s) => s.wbs_id === item.wbs_id
                                )
                                  ? "border-blue-600 bg-blue-100"
                                  : "border-gray-200 bg-white hover:border-blue-300"
                              }`}
                              title="Click to select/deselect"
                            >
                              <p className="text-xs font-medium">
                                {item.wbs_id}
                              </p>
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
            No Items Found
          </h3>
          <p className="text-gray-600 mb-4">
            {wbsResults?.data && wbsResults.data.length > 0
              ? "Select WBS items above to generate BOM"
              : "Please generate WBS/BOQ items first before creating BOM."}
          </p>
          {!wbsResults?.data || wbsResults.data.length === 0 ? (
            <button
              onClick={() => setActiveView("boq-generator")}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
            >
              Go to BOQ Generator →
            </button>
          ) : null}
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
                          {materials[0]?.work_item || materialName}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {materials.length}{" "}
                          {materials.length === 1
                            ? "BOM result"
                            : "BOM results"}
                          {materials[0]?.wbs_id &&
                            ` • WBS: ${materials[0].wbs_id}`}
                          {materials[0]?.location &&
                            ` • Location: ${materials[0].location}`}
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
                                {material.work_item || materialName}
                                {materials.length > 1 && ` #${materialIdx + 1}`}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                <span className="font-medium">WBS ID:</span>{" "}
                                {material.wbs_id || "N/A"}
                                {material.location &&
                                  ` • Location: ${material.location}`}
                                {material.original_qty &&
                                  ` • Qty: ${material.original_qty}`}
                                {material.state &&
                                  ` • State: ${material.state}`}
                                {material.tier && ` • Tier: ${material.tier}`}
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
                                      Material Name
                                    </th>
                                    <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                      Material ID
                                    </th>
                                    <th className="p-2 text-right font-semibold text-gray-700 text-xs">
                                      Quantity
                                    </th>
                                    <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                      Unit
                                    </th>
                                    <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                      Source Table
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
                                        {item.material_name || "N/A"}
                                      </td>
                                      <td className="p-2 text-gray-600">
                                        {item.material_id || "N/A"}
                                      </td>
                                      <td className="p-2 text-right text-gray-700 font-medium">
                                        {item.quantity !== undefined &&
                                        item.quantity !== null
                                          ? item.quantity.toLocaleString()
                                          : "N/A"}
                                      </td>
                                      <td className="p-2 text-gray-600">
                                        {item.unit || "N/A"}
                                      </td>
                                      <td className="p-2 text-gray-600">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                                          {item.source_table || "N/A"}
                                        </span>
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
              disabled={!bomResult || bomResult.length === 0 || loading}
              onClick={handleCostPrediction}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
            >
              {loading ? "Calculating..." : "Cost Prediction →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BOM;
