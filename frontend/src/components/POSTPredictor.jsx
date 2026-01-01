
const POSTPredictor = ({ postResult }) => {
  if (!postResult || !postResult.summary) {
    return (
      <div className="text-center py-12 text-gray-500">
        No cost estimation available yet.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-lg p-6 space-y-4">
      <h2 className="text-lg font-semibold">
        Location-Based Cost Estimation
      </h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th>Component</th>
            <th>Min</th>
            <th>Likely</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(postResult.summary).map(([key, val]) => (
            <tr key={key} className="border-b">
              <td className="capitalize py-2">{key}</td>
              <td>₹{val.min}</td>
              <td>₹{val.likely}</td>
              <td>₹{val.max}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-lg font-bold">
        Total Estimated Cost:
        <span className="text-blue-600 ml-2">
          ₹{postResult.grand_total.min} – ₹{postResult.grand_total.max}
        </span>
      </p>

      <p className="text-sm text-gray-500">
        AI Confidence Score: {postResult.confidence}
      </p>
    </div>
  );
};
export default POSTPredictor;
