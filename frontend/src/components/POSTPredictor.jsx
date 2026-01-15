import { useState, useEffect } from "react";

const POSTPredictor = ({ postResult }) => {
  const [aggregatedResult, setAggregatedResult] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load and aggregate cost predictions from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("costPredictions");
    let finalEstimation = null;

    if (saved) {
      const parsed = JSON.parse(saved);

      // Handle new API response format: array of cost estimation items
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Aggregate all items
        let totalMaterialCost = 0;
        let totalLaborCost = 0;
        let totalEquipmentCost = 0;
        let totalOverheadsAndProfit = 0;
        let totalContingencyCost = 0;
        let grandTotal = 0;

        parsed.forEach((item) => {
          totalMaterialCost += item.total_material_cost || 0;
          totalLaborCost += item.total_labor_cost || 0;
          totalEquipmentCost += item.total_equipment_cost || 0;
          totalOverheadsAndProfit += item.overheads_and_profit || 0;
          totalContingencyCost += item.contingency_cost || 0;
          grandTotal += item.grand_total || 0;
        });

        finalEstimation = {
          items: parsed, // Store individual items for detailed view
          summary: {
            material: {
              min: totalMaterialCost,
              likely: totalMaterialCost,
              max: totalMaterialCost,
            },
            labour: {
              min: totalLaborCost,
              likely: totalLaborCost,
              max: totalLaborCost,
            },
            machinery: {
              min: totalEquipmentCost,
              likely: totalEquipmentCost,
              max: totalEquipmentCost,
            },
            overheads_and_profit: {
              min: totalOverheadsAndProfit,
              likely: totalOverheadsAndProfit,
              max: totalOverheadsAndProfit,
            },
            contingency: {
              min: totalContingencyCost,
              likely: totalContingencyCost,
              max: totalContingencyCost,
            },
          },
          grand_total: {
            min: grandTotal,
            likely: grandTotal,
            max: grandTotal,
          },
        };
      } else if (parsed && parsed.estimation) {
        // Handle old format (backward compatibility)
        const pc = parsed.estimation.project_cost;
        if (pc && pc.overall) {
          finalEstimation = {
            summary: {
              material: pc.material || { min: 0, likely: 0, max: 0 },
              labour: pc.labour || { min: 0, likely: 0, max: 0 },
              machinery: pc.machinery || { min: 0, likely: 0, max: 0 },
            },
            grand_total: pc.overall,
          };
        }
      }
    }

    // Fallback to postResult if available
    if (!finalEstimation && postResult) {
      finalEstimation = postResult;
    }

    setAggregatedResult(finalEstimation);
  }, [postResult]);

  if (!aggregatedResult || !aggregatedResult.grand_total) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No cost estimation available yet.</p>
        <p className="text-sm">Generate BOM first to see cost predictions.</p>
      </div>
    );
  }

  const hasSummary =
    aggregatedResult.summary && typeof aggregatedResult.summary === "object";
  const hasItems =
    aggregatedResult.items &&
    Array.isArray(aggregatedResult.items) &&
    aggregatedResult.items.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Cost Prediction
        </h2>
        <p className="text-gray-600">
          Aggregated cost estimation for all materials
        </p>
      </div>

      <div className="bg-white border border-green-200 rounded-lg overflow-hidden shadow-sm">
        {/* Header - Clickable */}
        <div
          className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div>
            <p className="text-sm text-gray-600">Total Cost Estimation</p>
            {hasItems && (
              <p className="text-xs text-gray-500 mt-1">
                {aggregatedResult.items.length} item
                {aggregatedResult.items.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {aggregatedResult.grand_total && (
              <span className="text-sm font-semibold text-green-700 bg-white px-3 py-1 rounded">
                ₹
                {aggregatedResult.grand_total.likely?.toLocaleString() ||
                  aggregatedResult.grand_total.min?.toLocaleString()}
              </span>
            )}
            <span className="text-gray-500">{isExpanded ? "▼" : "▶"}</span>
          </div>
        </div>

        {/* Cost Details */}
        {isExpanded && (
          <div className="p-6 space-y-4">
            {/* Individual Items Table */}
            {hasItems && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Item-wise Cost Breakdown
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3 text-left border-b">Item Name</th>
                        <th className="p-3 text-left border-b">Work Item</th>
                        <th className="p-3 text-right border-b">Qty</th>
                        <th className="p-3 text-right border-b">Material</th>
                        <th className="p-3 text-right border-b">Labor</th>
                        <th className="p-3 text-right border-b">Equipment</th>
                        <th className="p-3 text-right border-b">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aggregatedResult.items.map((item, idx) => (
                        <tr key={idx} className="border-b hover:bg-green-50">
                          <td className="p-3 font-medium text-gray-800">
                            {item.item_name || item.material_name || "N/A"}
                          </td>
                          <td className="p-3 text-gray-600 text-sm">
                            {item.work_item || "N/A"}
                          </td>
                          <td className="p-3 text-right text-gray-700">
                            {item.quantity?.toLocaleString() || "0"}{" "}
                            {item.unit || ""}
                          </td>
                          <td className="p-3 text-right">
                            ₹{item.total_material_cost?.toLocaleString() || "0"}
                          </td>
                          <td className="p-3 text-right">
                            ₹{item.total_labor_cost?.toLocaleString() || "0"}
                          </td>
                          <td className="p-3 text-right">
                            ₹
                            {item.total_equipment_cost?.toLocaleString() || "0"}
                          </td>
                          <td className="p-3 text-right font-semibold text-green-700">
                            ₹{item.grand_total?.toLocaleString() || "0"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Summary Breakdown */}
            {hasSummary && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">
                  Cost Summary
                </h4>
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left border-b">Component</th>
                      <th className="p-3 text-right border-b">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(aggregatedResult.summary).map(
                      ([key, val]) => (
                        <tr key={key} className="border-b hover:bg-green-50">
                          <td className="p-3 capitalize font-medium">
                            {key.replace(/_/g, " ")}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            ₹
                            {val.likely?.toLocaleString() ||
                              val.min?.toLocaleString() ||
                              "0"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Grand Total */}
            {aggregatedResult.grand_total && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-lg font-bold text-gray-800 mb-1">
                  Total Estimated Cost:
                </p>
                <div className="flex items-center gap-4">
                  {aggregatedResult.grand_total.min !==
                  aggregatedResult.grand_total.max ? (
                    <>
                      <div>
                        <span className="text-sm text-gray-600">Min: </span>
                        <span className="text-lg font-bold text-green-700">
                          ₹{aggregatedResult.grand_total.min?.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Likely: </span>
                        <span className="text-lg font-bold text-blue-700">
                          ₹
                          {aggregatedResult.grand_total.likely?.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Max: </span>
                        <span className="text-lg font-bold text-red-700">
                          ₹{aggregatedResult.grand_total.max?.toLocaleString()}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div>
                      <span className="text-lg font-bold text-green-700">
                        ₹
                        {aggregatedResult.grand_total.likely?.toLocaleString() ||
                          aggregatedResult.grand_total.min?.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                {hasItems && aggregatedResult.items[0]?.cost_basis && (
                  <p className="text-xs text-gray-500 mt-2">
                    Cost Basis: {aggregatedResult.items[0].cost_basis}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSTPredictor;
