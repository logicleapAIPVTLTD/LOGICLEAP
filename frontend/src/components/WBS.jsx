import {
  ChevronDown,
  ChevronRight,
  Activity,
  Building2,
  X,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { generateWBSBatch } from "../services/api";

export default function WBS({ setActiveView, initialItems = [] }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedBOQ, setExpandedBOQ] = useState(null);
  const [expandedStage, setExpandedStage] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [expandedWBSGroups, setExpandedWBSGroups] = useState({});
  const [boqItems, setBoqItems] = useState([]);
  const boqItemsRef = useRef([]);

  const isSuccess = Boolean(results?.success);

  /* ---------------- INIT ---------------- */
  // Load BOQ items on mount and when initialItems change
  useEffect(() => {
    const loadBOQItems = () => {
      // Priority: localStorage > initialItems
      const stored = JSON.parse(localStorage.getItem("boqItems") || "[]");
      const newItems =
        stored.length > 0
          ? stored
          : initialItems.length > 0
            ? initialItems
            : [];
      const newItemsStr = JSON.stringify(newItems);
      const currentStr = JSON.stringify(boqItemsRef.current);

      if (newItemsStr !== currentStr) {
        const previousLength = boqItemsRef.current.length;
        boqItemsRef.current = newItems;
        setBoqItems(newItems);

        // Clear WBS results when BOQ changes significantly
        if (newItems.length !== previousLength && previousLength > 0) {
          localStorage.removeItem("wbsResults");
          setResults(null);
          setExpandedBOQ(null);
          setExpandedStage({});
          setExpandedGroups({});
        }
      }
    };

    loadBOQItems();

    // Listen for storage events (for cross-tab updates)
    const handleStorageChange = (e) => {
      if (e.key === "boqItems") {
        loadBOQItems();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Check for localStorage changes periodically (for same-tab updates)
    // This is needed because storage events only fire across tabs/windows
    const interval = setInterval(loadBOQItems, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [initialItems]);

  useEffect(() => {
    // Only load saved results if they have valid WBS data from backend
    // Only show results that came directly from backend API with valid structure
    const savedResults = localStorage.getItem("wbsResults");
    if (savedResults) {
      try {
        const parsed = JSON.parse(savedResults);
        // Only use saved results if they have valid data structure from backend
        if (
          parsed &&
          parsed.success &&
          Array.isArray(parsed.data) &&
          parsed.data.length > 0
        ) {
          // Verify that saved results have valid WBS structure (from backend)
          // Backend returns items with stage_1_planning, stage_2_procurement, stage_3_execution, stage_4_qc, stage_5_billing
          const validResults = parsed.data.filter((item) => {
            if (!item) return false;
            // Check for required stage fields from backend response
            // Valid item must have at least wbs_id, boq_reference, and execution stage
            return (
              item.wbs_id &&
              item.boq_reference &&
              item.stage_3_execution &&
              Array.isArray(item.stage_3_execution) &&
              item.stage_3_execution.length > 0
            );
          });
          if (validResults.length > 0) {
            // Only load if we have valid backend-generated results
            setResults({
              success: true,
              data: validResults,
            });
          } else {
            // Clear invalid saved results
            localStorage.removeItem("wbsResults");
          }
        } else {
          // Clear invalid saved results
          localStorage.removeItem("wbsResults");
        }
      } catch (e) {
        console.error("Error parsing saved results:", e);
        // Clear invalid saved results
        localStorage.removeItem("wbsResults");
      }
    }
  }, []);

  /* ---------------- HANDLERS ---------------- */
  const handleGenerate = async () => {
    if (!boqItems || boqItems.length === 0) {
      setError("No BOQ items available. Please generate BOQ first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map BOQ items to WBS generation format
      const mappedProjects = boqItems.map((item) => {
        // Extract work name from multiple possible fields
        // const work =
        //   item.projectMaterial ||
        //   item.work ||
        //   item.work_name ||
        //   item.description ||
        //   item.scope_label ||
        //   "Unknown Work";

        // // Extract quantities - handle both original format (qty_sqm, qty_sqft) and formatted format (quantity, length, width)
        // const length =
        //   parseFloat(
        //     item.length || item.qty_sqm || item.qtySqm || item.quantity || 0
        //   ) || null;
        // const breadth =
        //   parseFloat(item.width || item.qty_sqft || item.qtySqft || 0) || null;

        // // Extract state and tier
        // const state = item.state || null;
        // const tier = item.tier || null;

        // return {
        //   work,
        //   length,
        //   breadth,
        //   state,
        //   tier,
        // };

        // Use normalized data from BOQGenerator
        // BOQGenerator saves: projectMaterial (work), space, quantity, unit, description
        return {
          work_name: item.projectMaterial || item.work || "Unknown Work",
          description: item.description || "",
          area: item.quantity || 0,
          unit: item.unit || "sqm",
          room_name: item.space || "Unknown Space",
          // Include other potential fields needed by backend
          work_code: item.workCode || "",
        };
      });

      console.log("Batch WBS API Request:", { projects: mappedProjects });
      const response = await generateWBSBatch({ boq_items: mappedProjects });
      console.log("Batch WBS API Response:", response);

      if (!response.success) {
        throw new Error(response.error || "Batch generation failed");
      }

      const successfulResults = response.data;

      console.log("Successful WBS Results:", successfulResults);

      // Only show results from backend - don't merge with old results
      // Filter to ensure only items with valid WBS data from backend are included
      // Backend format: { wbs_id, boq_reference, stage_1_planning, stage_2_procurement, stage_3_execution, stage_4_qc, stage_5_billing }
      const validResults = successfulResults.filter((item) => {
        if (!item) return false;
        // Check for required stage fields from backend response
        // Valid item must have at least wbs_id, boq_reference, and execution stage
        return (
          item.wbs_id &&
          item.boq_reference &&
          item.stage_3_execution &&
          Array.isArray(item.stage_3_execution) &&
          item.stage_3_execution.length > 0
        );
      });

      const normalizedData = {
        success: true,
        data: validResults,
      };

      // Only save and display the latest backend-generated results
      localStorage.setItem("wbsResults", JSON.stringify(normalizedData));
      setResults(normalizedData);
    } catch (err) {
      console.error("WBS Generation Error:", err);
      setError(err.message || "Failed to generate WBS");
    } finally {
      setLoading(false);
    }
  };

  // Group BOQ items by work name for dropdown display
  const groupedBOQ = useMemo(() => {
    const groups = {};
    boqItems.forEach((item, index) => {
      // Try multiple possible field names for work/material name
      const workName =
        item.projectMaterial ||
        item.work ||
        item.work_name ||
        item.description ||
        item.scope_label ||
        `Item ${index + 1}`;
      if (!groups[workName]) {
        groups[workName] = [];
      }
      groups[workName].push({ ...item, originalIndex: index });
    });
    return groups;
  }, [boqItems]);

  const toggleGroup = (workName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [workName]: !prev[workName],
    }));
  };

  const toggleWBSGroup = (workName) => {
    setExpandedWBSGroups((prev) => ({
      ...prev,
      [workName]: !prev[workName],
    }));
  };

  // Process WBS results for display - Only show backend-generated results with valid WBS data
  const allTasksByBOQ = useMemo(() => {
    if (!results?.data || !results.success) return [];

    const boqArray = Array.isArray(results.data)
      ? results.data
      : [results.data];

    // Filter to only include items with valid backend WBS structure
    const validBOQItems = boqArray.filter(
      (item) =>
        item &&
        item.wbs_id &&
        item.stage_3_execution &&
        Array.isArray(item.stage_3_execution)
    );

    return validBOQItems
      .map((boqItem) => {
        const tasksByStage = {};

        // Process execution stage from stage_3_execution array
        if (
          boqItem.stage_3_execution &&
          Array.isArray(boqItem.stage_3_execution)
        ) {
          const executionTasks = boqItem.stage_3_execution.map((execItem) => {
            // Handle both object format { step, activity, hours } and string format
            const taskObj =
              typeof execItem === "string"
                ? { task_name: execItem }
                : {
                  task_name:
                    execItem.activity || execItem.task_name || "Task",
                };

            const hours = execItem.hours || 0;
            const durationObj = {
              expected_hours: hours,
              optimistic_hours: hours * 0.8,
              most_likely_hours: hours,
              pessimistic_hours: hours * 1.2,
            };

            return {
              task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
              task_name: taskObj.task_name,
              duration: durationObj,
              boq_text: boqItem.boq_reference,
            };
          });
          tasksByStage["Execution"] = executionTasks;
        }

        // Process other stages from planning, procurement, qc, billing
        if (
          boqItem.stage_1_planning &&
          Array.isArray(boqItem.stage_1_planning)
        ) {
          tasksByStage["Planning"] = boqItem.stage_1_planning.map((item) => ({
            task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
            task_name: typeof item === "string" ? item : item.activity || item,
            duration: {
              expected_hours: 0,
              optimistic_hours: 0,
              most_likely_hours: 0,
              pessimistic_hours: 0,
            },
            boq_text: boqItem.boq_reference,
          }));
        }

        if (
          boqItem.stage_2_procurement &&
          Array.isArray(boqItem.stage_2_procurement)
        ) {
          tasksByStage["Procurement"] = boqItem.stage_2_procurement.map(
            (item) => ({
              task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
              task_name:
                typeof item === "string" ? item : item.activity || item,
              duration: {
                expected_hours: 0,
                optimistic_hours: 0,
                most_likely_hours: 0,
                pessimistic_hours: 0,
              },
              boq_text: boqItem.boq_reference,
            })
          );
        }

        if (boqItem.stage_4_qc && Array.isArray(boqItem.stage_4_qc)) {
          tasksByStage["QC"] = boqItem.stage_4_qc.map((item) => ({
            task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
            task_name: typeof item === "string" ? item : item.activity || item,
            duration: {
              expected_hours: 0,
              optimistic_hours: 0,
              most_likely_hours: 0,
              pessimistic_hours: 0,
            },
            boq_text: boqItem.boq_reference,
          }));
        }

        if (boqItem.stage_5_billing && Array.isArray(boqItem.stage_5_billing)) {
          tasksByStage["Billing"] = boqItem.stage_5_billing.map((item) => ({
            task_id: `task-${Math.random().toString(36).substr(2, 9)}`,
            task_name: typeof item === "string" ? item : item.activity || item,
            duration: {
              expected_hours: 0,
              optimistic_hours: 0,
              most_likely_hours: 0,
              pessimistic_hours: 0,
            },
            boq_text: boqItem.boq_reference,
          }));
        }

        // Only return items that have tasks after processing
        // This ensures we only show results that actually have WBS data from backend
        if (Object.keys(tasksByStage).length === 0) {
          return null; // Filter out items without tasks
        }

        return { ...boqItem, tasksByStage };
      })
      .filter((item) => item !== null); // Remove null items (those without valid WBS data)
  }, [results]);

  // Group WBS results by work name (e.g., "False Ceiling Gypsum")
  // Keep only ONE instance per work type - deduplicate multiple instances
  const groupedWBSResults = useMemo(() => {
    if (allTasksByBOQ.length === 0) return {};

    const groups = {};
    const workNameMap = {}; // Map to store original work name for display
    const seenWorkTypes = new Set(); // Track seen work types to keep only one instance

    allTasksByBOQ
      .filter(
        (boqItem) =>
          boqItem &&
          boqItem.tasksByStage &&
          Object.keys(boqItem.tasksByStage).length > 0
      )
      .forEach((boqItem) => {
        // Extract work name from boq_reference (new format uses this field)
        const workName = boqItem.boq_reference || "Unknown Work";

        // Normalize work name for grouping (case-insensitive, trimmed)
        // This ensures "False Ceiling Gypsum" and "false ceiling gypsum" are grouped together
        const normalizedKey = workName.trim().toLowerCase();

        // Only keep the FIRST instance of each work type (deduplicate)
        if (!seenWorkTypes.has(normalizedKey)) {
          seenWorkTypes.add(normalizedKey);

          // Store the original name for display
          if (!workNameMap[normalizedKey]) {
            workNameMap[normalizedKey] = workName.trim();
          }

          // Store only the first instance
          if (!groups[normalizedKey]) {
            groups[normalizedKey] = [boqItem]; // Keep only one item
          }
        }
        // Skip subsequent instances of the same work type
      });

    // Convert to display format with original work names
    const displayGroups = {};
    Object.entries(groups).forEach(([normalizedKey, items]) => {
      // Each group now contains only one item (first instance)
      displayGroups[workNameMap[normalizedKey]] = items;
    });

    return displayGroups;
  }, [allTasksByBOQ]);

  /* ---------------- UI ---------------- */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">WBS Generator</h2>
        <p className="text-gray-600">
          Generate Work Breakdown Structure from BOQ items
        </p>
      </div>

      {/* Success Alert */}
      {isSuccess && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">WBS Generated Successfully</p>
              <p>
                {Array.isArray(results.data)
                  ? `Generated WBS for ${results.data.length} BOQ items`
                  : `Generated WBS for ${results.data?.boq_text}`}
              </p>
            </div>
            <button
              onClick={() => {
                setResults(null);
                localStorage.removeItem("wbsResults");
              }}
              className="text-green-600 hover:text-green-800"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* BOM CTA */}
      {isSuccess && (
        <div className="bg-purple-100 border-l-4 border-purple-500 text-purple-700 p-4 flex justify-between items-center rounded">
          <div>
            <p className="font-bold">Next Step</p>
            <p>Proceed to generate BOM</p>
          </div>
          <button
            onClick={() => setActiveView("bom-generator")}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
          >
            Generate BOM →
          </button>
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
                Review BOQ items - Click to expand/collapse groups
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || boqItems.length === 0}
              className={`px-6 py-3 rounded-lg shadow-sm transition-all duration-200 font-medium ${loading || boqItems.length === 0
                  ? "bg-gray-400 cursor-not-allowed text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
                }`}
            >
              {loading ? "Generating WBS..." : "Generate WBS for All BOQ Items"}
            </button>
          </div>

          {/* Grouped BOQ Items Display */}
          <div className="space-y-3">
            {Object.entries(groupedBOQ).map(([workName, items]) => (
              <div
                key={workName}
                className="border border-green-200 rounded-lg overflow-hidden"
              >
                {/* Group Header - Clickable */}
                <button
                  onClick={() => toggleGroup(workName)}
                  className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedGroups[workName] ? (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-green-600" />
                    )}
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{workName}</p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {items.length} {items.length === 1 ? "item" : "items"}
                        {items[0]?.state && ` • State: ${items[0].state}`}
                        {items[0]?.tier && ` • Tier: ${items[0].tier}`}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-white text-green-700 rounded-full text-xs font-medium border border-green-200">
                    {items.length} items
                  </span>
                </button>

                {/* Grouped Items - Expandable */}
                {expandedGroups[workName] && (
                  <div className="p-4 bg-white">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-green-200">
                            <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                              Item No.
                            </th>
                            <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                              Work
                            </th>
                            <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                              State
                            </th>
                            <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                              Tier
                            </th>
                            <th className="p-2 text-right font-semibold text-gray-700 text-xs">
                              Length
                            </th>
                            <th className="p-2 text-right font-semibold text-gray-700 text-xs">
                              Width
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
                          {items.map((item, idx) => {
                            // Extract values with fallbacks for different field formats
                            const itemWorkName =
                              item.projectMaterial ||
                              item.work ||
                              item.work_name ||
                              item.description ||
                              item.scope_label ||
                              workName;
                            const quantity =
                              item.quantity ||
                              item.qty_sqm ||
                              item.qtySqm ||
                              item.qty_sqft ||
                              item.qtySqft ||
                              "-";
                            const unit =
                              item.unit ||
                              (item.qty_sqm || item.qtySqm
                                ? "sqm"
                                : item.qty_sqft || item.qtySqft
                                  ? "sqft"
                                  : "sqm");
                            const length =
                              item.length || item.qty_sqm || item.qtySqm || "-";
                            const width =
                              item.width ||
                              item.qty_sqft ||
                              item.qtySqft ||
                              "-";

                            return (
                              <tr
                                key={idx}
                                className="border-b border-green-100 hover:bg-green-50/30 transition-colors"
                              >
                                <td className="p-2 text-gray-700">{idx + 1}</td>
                                <td className="p-2 text-gray-800 font-medium capitalize">
                                  {itemWorkName}
                                </td>
                                <td className="p-2 text-gray-600">
                                  {item.state || "-"}
                                </td>
                                <td className="p-2 text-gray-600">
                                  {item.tier || "-"}
                                </td>
                                <td className="p-2 text-right text-gray-700">
                                  {length}
                                </td>
                                <td className="p-2 text-right text-gray-700">
                                  {width}
                                </td>
                                <td className="p-2 text-right text-gray-700">
                                  {quantity}
                                </td>
                                <td className="p-2 text-gray-600">{unit}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading and Error States */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg">
          <p className="font-medium">Generating WBS...</p>
          <p className="text-sm mt-1">
            Please wait while we process all BOQ items
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* No BOQ Items Message */}
      {boqItems.length === 0 && !loading && (
        <div className="bg-white border border-green-200 rounded-lg p-8 text-center">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            No BOQ Items Found
          </h3>
          <p className="text-gray-600 mb-4">
            Please generate BOQ items first before creating WBS.
          </p>
          <button
            onClick={() => setActiveView("boq-generator")}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
          >
            Go to BOQ Generator →
          </button>
        </div>
      )}

      {/* Generated WBS Results - Only show backend-generated results, grouped by work type */}
      {Object.keys(groupedWBSResults).length > 0 &&
        results &&
        results.success && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800">
                Generated WBS Results
              </h3>
              <span className="text-sm text-gray-600 bg-green-100 px-3 py-1 rounded">
                {allTasksByBOQ.length} BOQ{" "}
                {allTasksByBOQ.length === 1 ? "item" : "items"} processed
                {Object.keys(groupedWBSResults).length > 0 &&
                  ` • ${Object.keys(groupedWBSResults).length} ${Object.keys(groupedWBSResults).length === 1
                    ? "work type"
                    : "work types"
                  }`}
              </span>
            </div>

            {/* Grouped WBS Results by Work Type */}
            <div className="space-y-3">
              {Object.entries(groupedWBSResults).map(([workName, wbsItems]) => (
                <div
                  key={workName}
                  className="border border-green-200 rounded-lg overflow-hidden"
                >
                  {/* Work Type Group Header - Clickable */}
                  <button
                    onClick={() => toggleWBSGroup(workName)}
                    className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expandedWBSGroups[workName] ? (
                        <ChevronDown className="w-5 h-5 text-green-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-green-600" />
                      )}
                      <div className="text-left">
                        <p className="font-semibold text-gray-800 capitalize">
                          {workName}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          WBS result
                          {wbsItems[0]?.state &&
                            ` • State: ${wbsItems[0].state}`}
                          {wbsItems[0]?.tier && ` • Tier: ${wbsItems[0].tier}`}
                          {wbsItems[0]?.subcategory &&
                            ` • Category: ${wbsItems[0].subcategory}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white text-green-700 rounded-full text-xs font-medium border border-green-200">
                      1 result
                    </span>
                  </button>

                  {/* Grouped WBS Items - Expandable (Only one item per work type) */}
                  {expandedWBSGroups[workName] && (
                    <div className="p-4 bg-white space-y-4">
                      {/* Only show the first item (deduplicated) */}
                      {wbsItems.slice(0, 1).map((boqItem, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50/30 to-white shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          {/* Individual WBS Item Header */}
                          <div
                            className="flex items-center justify-between cursor-pointer mb-4 pb-3 border-b border-green-200"
                            onClick={() => {
                              // Use unique key for each item: workName-itemIdx
                              const uniqueKey = `${workName}-${itemIdx}`;
                              setExpandedBOQ(
                                expandedBOQ === uniqueKey ? null : uniqueKey
                              );
                            }}
                          >
                            <div>
                              <h4 className="font-bold text-base text-gray-800 capitalize">
                                {workName}
                              </h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {boqItem.subcategory &&
                                  `Category: ${boqItem.subcategory}`}
                                {boqItem.state && ` • State: ${boqItem.state}`}
                                {boqItem.tier && ` • Tier: ${boqItem.tier}`}
                                {boqItem.confidence != null &&
                                  ` • Confidence: ${(
                                    boqItem.confidence * 100
                                  ).toFixed(0)}%`}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600 bg-green-100 px-2 py-1 rounded">
                                {Object.keys(boqItem.tasksByStage || {}).length}{" "}
                                stages
                              </span>
                              <span className="text-sm text-gray-500">
                                {expandedBOQ === `${workName}-${itemIdx}`
                                  ? "▼"
                                  : "▶"}
                              </span>
                            </div>
                          </div>

                          {/* Stages */}
                          {expandedBOQ === `${workName}-${itemIdx}` && (
                            <div className="space-y-3 mt-4">
                              {Object.entries(boqItem.tasksByStage)
                                .sort(([a], [b]) => {
                                  const order = {
                                    Planning: 1,
                                    Procurement: 2,
                                    Execution: 3,
                                    QC: 4,
                                    Billing: 5,
                                  };
                                  return (order[a] || 99) - (order[b] || 99);
                                })
                                .map(([stageName, tasks]) => {
                                  const hasTasks = tasks && tasks.length > 0;
                                  const stageKey = `${workName}-${itemIdx}-${stageName}`;
                                  return (
                                    <div
                                      key={stageName}
                                      className="bg-white rounded-lg border border-green-100 overflow-hidden"
                                    >
                                      {/* Stage Header - Clickable */}
                                      <div
                                        className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-50/50 cursor-pointer hover:from-green-100 hover:to-green-100/50 transition-all duration-200 flex items-center justify-between"
                                        onClick={() =>
                                          setExpandedStage((prev) => ({
                                            ...prev,
                                            [stageKey]: !prev[stageKey],
                                          }))
                                        }
                                      >
                                        <h4 className="font-semibold text-gray-800 capitalize flex items-center gap-2">
                                          <Activity className="w-4 h-4 text-green-600" />
                                          <span
                                            className={`w-2 h-2 rounded-full ${hasTasks
                                                ? "bg-green-500"
                                                : "bg-gray-300"
                                              }`}
                                          ></span>
                                          {stageName}
                                        </h4>
                                        <div className="flex items-center gap-3">
                                          <span
                                            className={`text-xs px-2 py-1 rounded ${hasTasks
                                                ? "text-gray-600 bg-white"
                                                : "text-gray-400 bg-gray-100"
                                              }`}
                                          >
                                            {tasks.length}{" "}
                                            {tasks.length === 1
                                              ? "task"
                                              : "tasks"}
                                          </span>
                                          <span className="text-sm text-gray-500">
                                            {expandedStage[stageKey]
                                              ? "▼"
                                              : "▶"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Tasks */}
                                      {expandedStage[stageKey] && (
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
                                                      {task.task_name ||
                                                        task.task}
                                                    </p>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                                                      <div className="bg-white px-2 py-1 rounded border border-green-100">
                                                        <span className="text-gray-600">
                                                          Optimistic:
                                                        </span>
                                                        <span className="font-semibold text-gray-800 ml-1">
                                                          {task.duration
                                                            ?.optimistic_hours !=
                                                            null
                                                            ? Number(
                                                              task.duration
                                                                .optimistic_hours
                                                            ).toFixed(2)
                                                            : "N/A"}
                                                          h
                                                        </span>
                                                      </div>
                                                      <div className="bg-white px-2 py-1 rounded border border-green-100">
                                                        <span className="text-gray-600">
                                                          Most Likely:
                                                        </span>
                                                        <span className="font-semibold text-gray-800 ml-1">
                                                          {task.duration
                                                            ?.most_likely_hours !=
                                                            null
                                                            ? Number(
                                                              task.duration
                                                                .most_likely_hours
                                                            ).toFixed(2)
                                                            : "N/A"}
                                                          h
                                                        </span>
                                                      </div>
                                                      <div className="bg-white px-2 py-1 rounded border border-green-100">
                                                        <span className="text-gray-600">
                                                          Pessimistic:
                                                        </span>
                                                        <span className="font-semibold text-gray-800 ml-1">
                                                          {task.duration
                                                            ?.pessimistic_hours !=
                                                            null
                                                            ? Number(
                                                              task.duration
                                                                .pessimistic_hours
                                                            ).toFixed(2)
                                                            : "N/A"}
                                                          h
                                                        </span>
                                                      </div>
                                                      <div className="bg-green-100 px-2 py-1 rounded border border-green-200">
                                                        <span className="text-gray-700 font-medium">
                                                          Expected:
                                                        </span>
                                                        <span className="font-bold text-green-700 ml-1">
                                                          {task.duration
                                                            ?.expected_hours !=
                                                            null
                                                            ? Number(
                                                              task.duration
                                                                .expected_hours
                                                            ).toFixed(2)
                                                            : "N/A"}
                                                          h
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
                                              <p className="text-sm">
                                                No tasks available for this
                                                stage
                                              </p>
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
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
