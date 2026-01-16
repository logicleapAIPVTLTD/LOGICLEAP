import {
  Upload,
  FileText,
  Image,
  X,
  Trash2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Building2,
  Layers,
} from "lucide-react";
import React, { useState, useMemo } from "react";
import { boqAPI } from "../services/api";

const STATE_TIER_MAP = {
  "Andhra Pradesh": { code: "AP", defaultTier: "T1" },
  "Arunachal Pradesh": { code: "AR", defaultTier: "T2" },
  Assam: { code: "AS", defaultTier: "T1" },
  Bihar: { code: "BR", defaultTier: "T1" },
  Chhattisgarh: { code: "CG", defaultTier: "T2" },
  Goa: { code: "GA", defaultTier: "T1" },
  Gujarat: { code: "GJ", defaultTier: "T1" },
  Haryana: { code: "HR", defaultTier: "T1" },
  "Himachal Pradesh": { code: "HP", defaultTier: "T2" },
  Jharkhand: { code: "JH", defaultTier: "T2" },
  Karnataka: { code: "KA", defaultTier: "T1" },
  Kerala: { code: "KL", defaultTier: "T1" },
  "Madhya Pradesh": { code: "MP", defaultTier: "T2" },
  Maharashtra: { code: "MH", defaultTier: "T1" },
  Manipur: { code: "MN", defaultTier: "T2" },
  Meghalaya: { code: "ML", defaultTier: "T2" },
  Mizoram: { code: "MZ", defaultTier: "T2" },
  Nagaland: { code: "NL", defaultTier: "T2" },
  Odisha: { code: "OR", defaultTier: "T1" },
  Punjab: { code: "PB", defaultTier: "T1" },
  Rajasthan: { code: "RJ", defaultTier: "T2" },
  Sikkim: { code: "SK", defaultTier: "T2" },
  "Tamil Nadu": { code: "TN", defaultTier: "T1" },
  Telangana: { code: "TS", defaultTier: "T1" },
  Tripura: { code: "TR", defaultTier: "T2" },
  "Uttar Pradesh": { code: "UP", defaultTier: "T1" },
  Uttarakhand: { code: "UK", defaultTier: "T2" },
  "West Bengal": { code: "WB", defaultTier: "T1" },
  "Andaman and Nicobar Islands": { code: "AN", defaultTier: "T3" },
  Chandigarh: { code: "CH", defaultTier: "T1" },
  "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", defaultTier: "T2" },
  Delhi: { code: "DL", defaultTier: "T1" },
  "Jammu and Kashmir": { code: "JK", defaultTier: "T2" },
  Ladakh: { code: "LA", defaultTier: "T3" },
  Lakshadweep: { code: "LD", defaultTier: "T3" },
  Puducherry: { code: "PY", defaultTier: "T2" },
};

const PROJECT_TYPES = [
  "Interior Design",
  "Residential Construction",
  "Commercial Construction",
  "Infrastructure",
  "Renovation",
  "Other",
];

const BOQGenerator = ({ setActiveView, setSelectedBOQItems }) => {
  const [inputMode, setInputMode] = useState(null); // 'images' or 'upload'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedBOQ, setGeneratedBOQ] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [backendData, setBackendData] = useState(null); // Store all backend response data
  const [expandedGroups, setExpandedGroups] = useState({}); // Track expanded dropdown groups
  const [expandedSections, setExpandedSections] = useState({
    rooms: true,
    boq: true,
    availableWorks: false,
  }); // Track expanded sections

  // Form data for both modes
  const [formData, setFormData] = useState({
    projectName: "",
    location: "",
    state: "",
    tier: "",
    projectType: "",
    meterPerPixel: "0.01", // Default scale factor (1cm per pixel = 0.01m per pixel)
  });

  // File states
  const [floorPlanFile, setFloorPlanFile] = useState(null);
  const [layoutFile, setLayoutFile] = useState(null);
  const [boqFile, setBoqFile] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-set tier when state changes
    if (name === "state") {
      const stateInfo = STATE_TIER_MAP[value];
      if (stateInfo) {
        setFormData((prev) => ({ ...prev, tier: stateInfo.defaultTier }));
      }
    }
  };

  const handleFileChange = (type, file) => {
    if (type === "floorPlan") {
      setFloorPlanFile(file);
    } else if (type === "layout") {
      setLayoutFile(file);
    } else if (type === "boq") {
      setBoqFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileChange(type, file);
    }
  };

  const removeBOQItem = (index) => {
    const updated = generatedBOQ.filter((_, i) => i !== index);
    setGeneratedBOQ(updated);
  };

  // Delete entire work group (e.g., all "False Ceiling" items)
  const removeWorkGroup = (workName) => {
    const updated = generatedBOQ.filter((item) => {
      const itemWorkName = item.work || item.description || "";
      return (
        itemWorkName.toLowerCase().trim() !== workName.toLowerCase().trim()
      );
    });
    setGeneratedBOQ(updated);
    // Close the group if it's expanded
    setExpandedGroups((prev) => {
      const newGroups = { ...prev };
      delete newGroups[workName];
      return newGroups;
    });
  };

  // Group BOQ items by work_name for dropdown display
  const groupedBOQ = useMemo(() => {
    const groups = {};
    generatedBOQ.forEach((item, index) => {
      const workName = item.work || `Item ${index + 1}`;
      if (!groups[workName]) {
        groups[workName] = [];
      }
      groups[workName].push({ ...item, originalIndex: index });
    });
    return groups;
  }, [generatedBOQ]);

  const toggleGroup = (workName) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [workName]: !prev[workName],
    }));
  };

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleGenerateFromImages = async () => {
    if (
      !formData.projectName ||
      !formData.location ||
      !formData.state ||
      !formData.projectType
    ) {
      setError("Please fill in all required fields");
      return;
    }

    // if (!floorPlanFile || !layoutFile) {
    //   setError("Please upload both Floor Plan and 2D Layout images");
    //   return;
    // }

    if (!floorPlanFile) {
      setError("Please upload Floor Plan images");
      return;
    }

    // Validate meterPerPixel
    const meterPerPixel = parseFloat(formData.meterPerPixel);
    if (isNaN(meterPerPixel) || meterPerPixel <= 0) {
      setError(
        "Invalid meterPerPixel value. Must be a positive number (e.g., 0.01 for 1cm per pixel)"
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const projectInfo = {
        projectName: formData.projectName,
        location: formData.location,
        state: STATE_TIER_MAP[formData.state]?.code || formData.state,
        tier: formData.tier,
        projectType: formData.projectType,
        meterPerPixel: meterPerPixel.toString(), // Ensure it's a string as expected by backend
      };

      console.log(projectInfo);

      const response = await boqAPI.generateFromImages(
        floorPlanFile,
        projectInfo
      );

      if (response.success && response.data) {
        // Store all backend data
        let boqArray = [];
        let backendData = {};
        if (Array.isArray(response.data)) {
          boqArray = response.data;
          backendData = { boq: response.data };
        } else {
          boqArray = response.data.boq || response.data.items || [];
          backendData = response.data;
        }

        console.log("BOQ Array extracted:", boqArray);
        console.log("Rooms data:", backendData.rooms);
        console.log("Available works:", backendData.available_works);
        console.log("Room summary:", backendData.room_summary);

        // Transform backend BOQ format to frontend format (preserve all original data)
        // Handle empty BOQ array - still show rooms and other data
        const boqItems =
          Array.isArray(boqArray) && boqArray.length > 0
            ? boqArray.map((item, index) => {
                // Handle both new format (qtySqm/qtySqft directly) and old format (area + unit)
                let qtySqm = 0;
                let qtySqft = 0;
                let areaValue = item.quantity || item.area || 0;
                let areaUnit = item.unit || "sqft";
                
                if (item.qtySqm !== undefined || item.qtySqft !== undefined) {
                   qtySqm = parseFloat(item.qtySqm || 0);
                   qtySqft = parseFloat(item.qtySqft || 0);
                   
                   // If quantity is missing but we have qtys, set it for display
                   if (!areaValue) {
                     areaValue = qtySqft;
                     areaUnit = "sqft";
                   }
                } else {
                    // Old fallback logic
                    if (areaUnit === "sqft") {
                      qtySqft = parseFloat(areaValue || 0);
                      qtySqm = qtySqft / 10.764;
                    } else if (areaUnit === "sqm") {
                      qtySqm = parseFloat(areaValue || 0);
                      qtySqft = qtySqm * 10.764;
                    }
                }

                return {
                  itemNo: item.itemNo || index + 1,
                  work: item.work || item.work_name || `Item ${index + 1}`,
                  description: item.description || "",
                  space: item.space || item.room_name || "",
                  workCode: item.workCode || item.work_code || "",
                  quantity: areaValue,
                  unit: areaUnit,
                  qtySqm: qtySqm,
                  qtySqft: qtySqft,
                  rate: item.rate || "",
                  amount: item.amount || "",
                  areaSource: item.areaSource || item.source || "AI_GENERATED",
                  confidence: item.confidence || 0.85,
                  // Preserve all original backend data
                  originalData: item,
                };
              })
            : [];

        console.log("Transformed BOQ Items:", boqItems);

        setBackendData(backendData);
        setGeneratedBOQ(boqItems);
        // Show results even if BOQ is empty but rooms exist
        if (
          boqItems.length > 0 ||
          (backendData.rooms && backendData.rooms.length > 0)
        ) {
          setShowResults(true);
        } else {
          setError(
            "No BOQ items or rooms detected. Please check your images and try again."
          );
        }
      } else {
        setError(
          response.error ||
            response.message ||
            "Failed to generate BOQ from images"
        );
      }
    } catch (err) {
      console.error("Error generating BOQ:", err);
      setError(err.message || "Failed to generate BOQ from images");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromFile = async () => {
    if (
      !formData.projectName ||
      !formData.location ||
      !formData.state ||
      !formData.projectType
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (!boqFile) {
      setError("Please upload a BOQ file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await boqAPI.generateFromFile(boqFile);

      if (response.success && response.data) {
        // Store all backend data
        setBackendData(response.data);

        // Backend returns: { success: true, data: [...] or { items: [...] } }
        const boqArray = Array.isArray(response.data)
          ? response.data
          : response.data.boq || response.data.items || [];

        if (boqArray.length === 0) {
          setError("No BOQ items found in the uploaded file.");
          return;
        }

        // Transform to frontend format (preserve all original data)
        const boqItems = boqArray.map((item, index) => ({
          itemNo: index + 1,
          work:
            item.work_name ||
            item.work ||
            item.description ||
            item.item_name ||
            item.material ||
            `Item ${index + 1}`,
          space: item.space || "",
          workCode: item.work_code || "",
          quantity: item.quantity || item.qty_sqm || item.qty_sqft || 0,
          unit: item.unit || "sqm",
          qtySqm: item.qty_sqm || 0,
          qtySqft: item.qty_sqft || 0,
          rate: item.rate || "",
          amount:
            item.amount ||
            (item.rate && item.quantity
              ? (parseFloat(item.rate) * parseFloat(item.quantity)).toFixed(2)
              : ""),
          areaSource: item.area_source || "",
          confidence: item.confidence || 1,
          // Preserve all original backend data
          originalData: item,
        }));

        setGeneratedBOQ(boqItems);
        setShowResults(true);
      } else {
        setError(response.error || "Failed to extract BOQ from file");
      }
    } catch (err) {
      console.error("Error extracting BOQ:", err);
      setError(err.message || "Failed to extract BOQ from file");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeBOQ = () => {
    if (generatedBOQ.length === 0) {
      setError("Please generate BOQ items first");
      return;
    }

    // Convert generated BOQ items to the format expected by the app
    const formattedItems = generatedBOQ.map((item) => ({
      projectMaterial: item.work || "Unknown Work",
      description: item.description,
      state: STATE_TIER_MAP[formData.state]?.code || formData.state,
      tier: formData.tier,
      length: item.qtySqm || item.quantity || "",
      width: item.unit || "",
      quantity: item.quantity || item.qtySqm || item.qtySqft || "",
      unit: item.unit || "sqm",
      rate: item.rate || "",
      workCode: item.workCode || "",
      space: item.space || "",
      originalData: item.originalData,
    }));

    // Save to localStorage
    localStorage.setItem("boqItems", JSON.stringify(formattedItems));

    // Clear WBS, BOM, and Cost Prediction results when BOQ changes
    localStorage.removeItem("wbsResults");
    localStorage.removeItem("bomResult");
    localStorage.removeItem("costPredictions");

    // Set selected BOQ items and navigate to WBS
    setSelectedBOQItems(formattedItems);
    setActiveView("wbs-creator");
  };

  const resetForm = () => {
    setInputMode(null);
    setFormData({
      projectName: "",
      location: "",
      state: "",
      tier: "",
      projectType: "",
      meterPerPixel: "0.01",
    });
    setFloorPlanFile(null);
    setLayoutFile(null);
    setBoqFile(null);
    setGeneratedBOQ([]);
    setShowResults(false);
    setBackendData(null);
    setExpandedGroups({});
    setExpandedSections({ rooms: true, boq: true, availableWorks: false });
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">BOQ Generator</h2>
        <p className="text-gray-600">
          Generate Bill of Quantities from images or upload existing BOQ
        </p>
      </div>

      {/* Input Mode Selection */}
      {!inputMode && !showResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Generate from Images Option */}
          <div
            onClick={() => setInputMode("images")}
            className="border-2 border-green-300 rounded-lg p-6 cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 bg-white shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Image className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Generate from Images
                  </h3>
                  <p className="text-sm text-gray-600">
                    Upload Floor Plan + 2D Layout
                  </p>
                </div>
              </div>
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">
                Recommended
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Use AI to extract BOQ items from floor plans and design layouts
            </p>
          </div>

          {/* Upload Existing BOQ Option */}
          <div
            onClick={() => setInputMode("upload")}
            className="border-2 border-green-300 rounded-lg p-6 cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-all duration-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Upload Existing BOQ
                </h3>
                <p className="text-sm text-gray-600">Excel, CSV, or PDF</p>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Upload a pre-existing BOQ document from your sales team
            </p>
          </div>
        </div>
      )}

      {/* Generate from Images Form */}
      {inputMode === "images" && !showResults && (
        <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              Generate from Images
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Project Information */}
          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-gray-700 mb-3">
              Project Information
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                placeholder="e.g., Corporate Office Interior"
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai, Maharashtra"
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State & Tier <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select State</option>
                  {Object.keys(STATE_TIER_MAP).map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName} - {STATE_TIER_MAP[stateName].defaultTier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Project Type</option>
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Scale Factor (Meter per Pixel){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="meterPerPixel"
                value={formData.meterPerPixel}
                onChange={handleInputChange}
                placeholder="e.g., 0.01 (for 1cm per pixel)"
                min="0.0001"
                step="0.0001"
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the scale factor: meters represented by each pixel (e.g.,
                0.01 = 1cm per pixel, 0.001 = 1mm per pixel)
              </p>
            </div>
          </div>

          {/* Image Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Floor Plan Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor Plan <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Determines how much work is needed (dimensions, areas)
              </p>
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "floorPlan")}
                className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-all"
                onClick={() =>
                  document.getElementById("floorPlanInput").click()
                }
              >
                <input
                  id="floorPlanInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange("floorPlan", e.target.files[0])
                  }
                />
                {floorPlanFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-700">
                      {floorPlanFile.name}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFloorPlanFile(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="text-sm text-green-600 font-medium">
                      Drop Floor Plan here or click to upload
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2D Layout Upload */}
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                2D Layout / Design Drawing{" "}
                <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Determines what work needs to be done (specifications,
                materials)
              </p>
              <div
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, "layout")}
                className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-all"
                onClick={() => document.getElementById("layoutInput").click()}
              >
                <input
                  id="layoutInput"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange("layout", e.target.files[0])
                  }
                />
                {layoutFile ? (
                  <div className="space-y-2">
                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto" />
                    <p className="text-sm font-medium text-green-700">
                      {layoutFile.name}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLayoutFile(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-green-500 mx-auto" />
                    <p className="text-sm text-green-600 font-medium">
                      Drop 2D Layout here or click to upload
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG</p>
                  </div>
                )}
              </div>
            </div> */}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerateFromImages}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
          >
            {loading
              ? "Generating BOQ from Images..."
              : "Generate BOQ from Images"}
          </button>
        </div>
      )}

      {/* Upload Existing BOQ Form */}
      {inputMode === "upload" && !showResults && (
        <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-800">
              Upload Existing BOQ
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Project Information */}
          <div className="space-y-4 mb-6">
            <h4 className="font-semibold text-gray-700 mb-3">
              Project Information
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
                placeholder="e.g., Corporate Office Interior"
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="e.g., Mumbai, Maharashtra"
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State & Tier <span className="text-red-500">*</span>
                </label>
                <select
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select State</option>
                  {Object.keys(STATE_TIER_MAP).map((stateName) => (
                    <option key={stateName} value={stateName}>
                      {stateName} - {STATE_TIER_MAP[stateName].defaultTier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="projectType"
                  value={formData.projectType}
                  onChange={handleInputChange}
                  className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Project Type</option>
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BOQ File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Existing BOQ <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Upload a pre-existing BOQ document from your sales team
            </p>
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, "boq")}
              className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/30 transition-all"
              onClick={() => document.getElementById("boqInput").click()}
            >
              <input
                id="boqInput"
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={(e) => handleFileChange("boq", e.target.files[0])}
              />
              {boqFile ? (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 text-green-600 mx-auto" />
                  <p className="text-sm font-medium text-green-700">
                    {boqFile.name}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setBoqFile(null);
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-green-500 mx-auto" />
                  <p className="text-sm text-green-600 font-medium">
                    Drop BOQ file here or click to upload
                  </p>
                  <p className="text-xs text-gray-500">
                    Excel (.xlsx, .xls), CSV, or PDF
                  </p>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerateFromFile}
            disabled={loading}
            className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
          >
            {loading ? "Extracting BOQ from File..." : "Generate BOQ from File"}
          </button>
        </div>
      )}

      {/* Generated BOQ Results - Show all backend data */}
      {showResults && (backendData || generatedBOQ.length > 0) && (
        <div className="space-y-6">
          {/* Summary Header */}
          <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">
                  Generated BOQ Results
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {/* {backendData.total_rooms || 0} rooms detected •{" "} */}
                  {generatedBOQ.length} BOQ items generated
                </p>
              </div>
              <button
                onClick={() => {
                  setShowResults(false);
                  setGeneratedBOQ([]);
                  setBackendData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Room Summary */}
            {backendData.room_summary && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Room Summary:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(backendData.room_summary).map(
                    ([space, count]) => (
                      <span
                        key={space}
                        className="px-3 py-1 bg-white text-green-700 rounded-full text-xs font-medium border border-green-200"
                      >
                        {space}: {count}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Rooms Section */}
          {backendData.rooms &&
            Array.isArray(backendData.rooms) &&
            backendData.rooms.length > 0 && (
              <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
                <button
                  onClick={() => toggleSection("rooms")}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Detected Rooms ({backendData.rooms.length})
                    </h3>
                  </div>
                  {expandedSections.rooms ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </button>

                {expandedSections.rooms && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-green-50 border-b-2 border-green-200">
                          <th className="p-3 text-left font-semibold text-gray-700">
                            Room Name
                          </th>
                          <th className="p-3 text-right font-semibold text-gray-700">
                            Area (sqm)
                          </th>
                          <th className="p-3 text-right font-semibold text-gray-700">
                            Area (sqft)
                          </th>
                          <th className="p-3 text-center font-semibold text-gray-700">
                            Confidence
                          </th>
                          <th className="p-3 text-left font-semibold text-gray-700">
                            Area Source
                          </th>
                          <th className="p-3 text-center font-semibold text-gray-700">
                            Has Dimensions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {backendData.rooms.map((room, index) => (
                          <tr
                            key={index}
                            className="border-b border-green-100 hover:bg-green-50/30 transition-colors"
                          >
                            <td className="p-3 text-gray-800 font-medium capitalize">
                              {room.name || "Room"}
                            </td>
                            <td className="p-3 text-right text-gray-700">
                              {room.sqm ? parseFloat(room.sqm).toFixed(2) : "-"}
                            </td>
                            <td className="p-3 text-right text-gray-700">
                              {room.sqft
                                ? parseFloat(room.sqft).toFixed(2)
                                : "-"}
                            </td>
                            <td className="p-3 text-center text-gray-700">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  room.confidence >= 0.7
                                    ? "bg-green-100 text-green-700"
                                    : room.confidence >= 0.4
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {(room.confidence * 100).toFixed(0)}%
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 text-xs capitalize">
                              {room.area_source || "-"}
                            </td>
                            <td className="p-3 text-center">
                              {room.has_dimensions ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-gray-400">✗</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

          {/* Available Works Section */}
          {backendData.available_works &&
            Object.keys(backendData.available_works).length > 0 && (
              <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
                <button
                  onClick={() => toggleSection("availableWorks")}
                  className="w-full flex items-center justify-between mb-4"
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Available Works
                    </h3>
                  </div>
                  {expandedSections.availableWorks ? (
                    <ChevronDown size={20} />
                  ) : (
                    <ChevronRight size={20} />
                  )}
                </button>

                {expandedSections.availableWorks && (
                  <div className="space-y-4">
                    {Object.entries(backendData.available_works).map(
                      ([spaceType, works]) => (
                        <div
                          key={spaceType}
                          className="border border-green-200 rounded-lg p-4"
                        >
                          <h4 className="font-semibold text-gray-800 mb-2 capitalize">
                            {spaceType} ({works.length} works)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {Array.isArray(works) &&
                              works.map((work, idx) => (
                                <div
                                  key={idx}
                                  className="p-2 bg-green-50 rounded text-xs text-gray-700 border border-green-100"
                                >
                                  {work.work_name ||
                                    work.work_code ||
                                    `Work ${idx + 1}`}
                                </div>
                              ))}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}

          {/* BOQ Items Section - Grouped by Work Name */}
          {generatedBOQ.length > 0 && (
            <div className="bg-white border border-green-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    BOQ Items ({generatedBOQ.length} items)
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Grouped by work type - Click to expand/collapse
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(groupedBOQ).map(([workName, items]) => (
                  <div
                    key={workName}
                    className="border border-green-200 rounded-lg overflow-hidden"
                  >
                    {/* Group Header - Clickable with Delete Button */}
                    <div className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 transition-colors">
                      <button
                        onClick={() => toggleGroup(workName)}
                        className="flex-1 flex items-center gap-3 text-left"
                      >
                        {expandedGroups[workName] ? (
                          <ChevronDown className="w-5 h-5 text-green-600" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-green-600" />
                        )}
                        <div className="text-left">
                          <p className="font-semibold text-gray-800">
                            {workName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {items.length}{" "}
                            {items.length === 1 ? "item" : "items"} •
                            {items[0]?.workCode &&
                              ` Code: ${items[0].workCode}`}
                            {items[0]?.space && ` • Space: ${items[0].space}`}
                          </p>
                        </div>
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white text-green-700 rounded-full text-xs font-medium border border-green-200">
                          {items.length} items
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              window.confirm(
                                `Are you sure you want to delete all "${workName}" items?`
                              )
                            ) {
                              removeWorkGroup(workName);
                            }
                          }}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-all"
                          title={`Delete all ${workName} items`}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

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
                                  Space
                                </th>
                                <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                  Work Code
                                </th>
                                <th className="p-2 text-right font-semibold text-gray-700 text-xs">
                                  Qty (sqm)
                                </th>
                                <th className="p-2 text-right font-semibold text-gray-700 text-xs">
                                  Qty (sqft)
                                </th>
                                <th className="p-2 text-left font-semibold text-gray-700 text-xs">
                                  Area Source
                                </th>
                                <th className="p-2 text-center font-semibold text-gray-700 text-xs">
                                  Confidence
                                </th>
                                <th className="p-2 text-center font-semibold text-gray-700 text-xs">
                                  Action
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b border-green-100 hover:bg-green-50/30 transition-colors"
                                >
                                  <td className="p-2 text-gray-700">
                                    {item.itemNo || idx + 1}
                                  </td>
                                  <td className="p-2 text-gray-700 capitalize">
                                    {item.space || "-"}
                                  </td>
                                  <td className="p-2 text-gray-600 text-xs">
                                    {item.workCode || "-"}
                                  </td>
                                  <td className="p-2 text-right text-gray-700">
                                    {item.qtySqm
                                      ? parseFloat(item.qtySqm).toFixed(2)
                                      : "-"}
                                  </td>
                                  <td className="p-2 text-right text-gray-700">
                                    {item.qtySqft
                                      ? parseFloat(item.qtySqft).toFixed(2)
                                      : "-"}
                                  </td>
                                  <td className="p-2 text-gray-600 text-xs capitalize">
                                    {item.areaSource || "-"}
                                  </td>
                                  <td className="p-2 text-center">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs ${
                                        item.confidence >= 0.7
                                          ? "bg-green-100 text-green-700"
                                          : item.confidence >= 0.4
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {(item.confidence * 100).toFixed(0)}%
                                    </span>
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      onClick={() =>
                                        removeBOQItem(item.originalIndex)
                                      }
                                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-all"
                                      title="Remove item"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {generatedBOQ.length === 0 && (
                <div className="mb-6 p-4 text-center text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm">
                    No BOQ items remaining. Please go back and generate again.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleFinalizeBOQ}
                  disabled={generatedBOQ.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
                >
                  Finalize BOQ & Generate WBS →
                </button>
                <button
                  onClick={() => {
                    setShowResults(false);
                    setGeneratedBOQ([]);
                    setBackendData(null);
                  }}
                  className="px-6 py-3 bg-gray-400 hover:bg-gray-500 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BOQGenerator;
