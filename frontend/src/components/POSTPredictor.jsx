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
      const validPredictions = Array.isArray(parsed) 
        ? parsed.filter(p => p && p.estimation && p.estimation.grand_total)
        : (parsed && parsed.estimation ? [parsed] : []);

      if (validPredictions.length > 0) {
        // Aggregate all cost predictions into one result
        const aggregatedSummary = {};
        let totalMin = 0, totalLikely = 0, totalMax = 0;

        validPredictions.forEach(costPred => {
          const est = costPred.estimation;
          
          // Aggregate grand totals
          if (est.grand_total) {
            totalMin += est.grand_total.min || 0;
            totalLikely += est.grand_total.likely || 0;
            totalMax += est.grand_total.max || 0;
          }

          // Aggregate summary components
          if (est.summary && typeof est.summary === 'object') {
            Object.entries(est.summary).forEach(([key, val]) => {
              if (!aggregatedSummary[key]) {
                aggregatedSummary[key] = { min: 0, likely: 0, max: 0 };
              }
              aggregatedSummary[key].min += val.min || 0;
              aggregatedSummary[key].likely += val.likely || 0;
              aggregatedSummary[key].max += val.max || 0;
            });
          }
        });

        finalEstimation = {
          summary: aggregatedSummary,
          grand_total: {
            min: totalMin,
            likely: totalLikely,
            max: totalMax
          }
        };
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

  const hasSummary = aggregatedResult.summary && typeof aggregatedResult.summary === 'object';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Cost Prediction</h2>
        <p className="text-gray-600">Aggregated cost estimation for all materials</p>
      </div>

      <div className="bg-white border border-green-200 rounded-lg overflow-hidden shadow-sm">
        {/* Header - Clickable */}
        <div 
          className="px-4 py-3 bg-gradient-to-r from-green-50 to-green-100 cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div>
            <p className="text-sm text-gray-600">Total Cost Estimation</p>
          </div>
          <div className="flex items-center gap-3">
            {aggregatedResult.grand_total && (
              <span className="text-sm font-semibold text-green-700 bg-white px-3 py-1 rounded">
                ₹{aggregatedResult.grand_total.min?.toLocaleString()} – ₹{aggregatedResult.grand_total.max?.toLocaleString()}
              </span>
            )}
            <span className="text-gray-500">{isExpanded ? "▼" : "▶"}</span>
          </div>
        </div>

        {/* Cost Details */}
        {isExpanded && (
          <div className="p-6 space-y-4">
            {hasSummary && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Cost Breakdown</h4>
                <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left border-b">Component</th>
                      <th className="p-3 text-right border-b">Min</th>
                      <th className="p-3 text-right border-b">Likely</th>
                      <th className="p-3 text-right border-b">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(aggregatedResult.summary).map(([key, val]) => (
                      <tr key={key} className="border-b hover:bg-green-50">
                        <td className="p-3 capitalize font-medium">{key.replace(/_/g, ' ')}</td>
                        <td className="p-3 text-right">₹{val.min?.toLocaleString() || '0'}</td>
                        <td className="p-3 text-right">₹{val.likely?.toLocaleString() || '0'}</td>
                        <td className="p-3 text-right">₹{val.max?.toLocaleString() || '0'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {aggregatedResult.grand_total && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-lg font-bold text-gray-800 mb-1">
                  Total Estimated Cost:
                </p>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Min: </span>
                    <span className="text-lg font-bold text-green-700">
                      ₹{aggregatedResult.grand_total.min?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Likely: </span>
                    <span className="text-lg font-bold text-blue-700">
                      ₹{aggregatedResult.grand_total.likely?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Max: </span>
                    <span className="text-lg font-bold text-red-700">
                      ₹{aggregatedResult.grand_total.max?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default POSTPredictor;
