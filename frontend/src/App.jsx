import LogicLeapWireframe from "./LogicLeapWireframe";

function App() {
  console.log(import.meta.env.VITE_API_URL);
  // Results are now persisted in localStorage - no clearing on page load
  // WBS Results: localStorage.getItem("wbsResults")
  // BOM Results: localStorage.getItem("bomResult")
  // Cost Predictions: localStorage.getItem("costPredictions")
  // BOQ Items: localStorage.getItem("boqItems")

  return (
    <>
      <LogicLeapWireframe />
    </>
  );
}

export default App;
