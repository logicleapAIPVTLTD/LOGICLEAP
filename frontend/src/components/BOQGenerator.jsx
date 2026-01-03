
import { Edit2, Trash2, ChevronDown } from "lucide-react";
import React, { useEffect, useState } from "react";

// Work Types for Material Dropdown
const WORK_TYPES = [
  "Flooring Work",
  "Tiling Work",
  "False Ceiling Work",
  "Painting / Wall Painting",
  "Wallpaper Fixing",
  "Carpentry Work",
  "Modular Kitchen Installation",
  "Furniture Installation",
  "Glass Partition Work",
  "Office Interior Setup",
  "Retail Showroom Interior",
  "Electrical Wiring",
  "Electrical Repair & Maintenance",
  "Plumbing Work (Interior)",
  "Plumbing Service Work",
  "Road Construction",
  "Highway Widening",
  "Drainage Construction",
  "Storm Water Drain Work",
  "Bridge Construction",
  "Culvert Construction",
  "Retaining Wall Construction",
  "Footpath Construction",
  "Canal Lining",
  "Water Pipeline Laying",
  "Sewer Line Construction",
  "Borewell Drilling",
  "Pump House Construction",
  "Substation Civil Work",
  "Underground Sump Cleaning",
  "Overhead Water Tank Cleaning",
  "Septic Tank Cleaning",
  "Facility Management Services",
  "Housekeeping Services",
  "Painting Contract Work",
  "Pest Control Services",
  "AC Installation & Servicing",
  "Lift Maintenance",
  "Fire Safety System Installation",
  "CCTV Installation"
];

const STATE_TIER_MAP = {
  // States
  "Andhra Pradesh": { code: "AP", defaultTier: "T1" },
  "Arunachal Pradesh": { code: "AR", defaultTier: "T2" },
  "Assam": { code: "AS", defaultTier: "T1" },
  "Bihar": { code: "BR", defaultTier: "T1" },
  "Chhattisgarh": { code: "CG", defaultTier: "T2" },
  "Goa": { code: "GA", defaultTier: "T1" },
  "Gujarat": { code: "GJ", defaultTier: "T1" },
  "Haryana": { code: "HR", defaultTier: "T1" },
  "Himachal Pradesh": { code: "HP", defaultTier: "T2" },
  "Jharkhand": { code: "JH", defaultTier: "T2" },
  "Karnataka": { code: "KA", defaultTier: "T1" },
  "Kerala": { code: "KL", defaultTier: "T1" },
  "Madhya Pradesh": { code: "MP", defaultTier: "T2" },
  "Maharashtra": { code: "MH", defaultTier: "T1" },
  "Manipur": { code: "MN", defaultTier: "T2" },
  "Meghalaya": { code: "ML", defaultTier: "T2" },
  "Mizoram": { code: "MZ", defaultTier: "T2" },
  "Nagaland": { code: "NL", defaultTier: "T2" },
  "Odisha": { code: "OR", defaultTier: "T1" },
  "Punjab": { code: "PB", defaultTier: "T1" },
  "Rajasthan": { code: "RJ", defaultTier: "T2" },
  "Sikkim": { code: "SK", defaultTier: "T2" },
  "Tamil Nadu": { code: "TN", defaultTier: "T1" },
  "Telangana": { code: "TS", defaultTier: "T1" },
  "Tripura": { code: "TR", defaultTier: "T2" },
  "Uttar Pradesh": { code: "UP", defaultTier: "T1" },
  "Uttarakhand": { code: "UK", defaultTier: "T2" },
  "West Bengal": { code: "WB", defaultTier: "T1" },

  // Union Territories
  "Andaman and Nicobar Islands": { code: "AN", defaultTier: "T3" },
  "Chandigarh": { code: "CH", defaultTier: "T1" },
  "Dadra and Nagar Haveli and Daman and Diu": { code: "DN", defaultTier: "T2" },
  "Delhi": { code: "DL", defaultTier: "T1" },
  "Jammu and Kashmir": { code: "JK", defaultTier: "T2" },
  "Ladakh": { code: "LA", defaultTier: "T3" },
  "Lakshadweep": { code: "LD", defaultTier: "T3" },
  "Puducherry": { code: "PY", defaultTier: "T2" }
};
/* ---- Constants ---- */
const TIERS = ["T1", "T2", "T3"];

const emptyItem = {
  projectMaterial: "",
  state: "",
  tier: "",
  length: "",
  width: "",
};

const BOQGenerator = ({ boqData, setBoqData, setActiveView, setSelectedBOQItems }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyItem);
  const [editIndex, setEditIndex] = useState(null);

  const [localBoqData, setLocalBoqData] = useState([]);
  useEffect(() => {
    setLocalBoqData([...boqData]);
  }, [boqData]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (!formData.projectMaterial || !formData.state) return;
    const formatState = (name) =>
      name
        .toLowerCase()
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

    const normalizedState = formatState(formData.state.trim());
    const stateInfo = STATE_TIER_MAP[normalizedState];

    if (!stateInfo) {
      alert(`Invalid state: ${formData.state}`);
      return;
    }

    const formattedItem = {
      ...formData,
      state: stateInfo.code,             // store code (DL)
      tier: formData.tier || stateInfo.defaultTier, // keep user tier or default
    };

    const updated = [...boqData];
    if (editIndex !== null) {
      updated[editIndex] = formattedItem;
    } else {
      updated.push(formattedItem);
    }

    setBoqData(updated);
    localStorage.setItem("boqItems", JSON.stringify(updated));
    // Clear WBS, BOM, and Cost Prediction results when BOQ changes
    localStorage.removeItem("wbsResults");
    localStorage.removeItem("bomResult");
    localStorage.removeItem("costPredictions");
    setFormData(emptyItem);
    setEditIndex(null);
    setShowForm(false);
  };



  const handleEdit = (index) => {
    const item = localBoqData[index];
    setFormData(item);
    setEditIndex(index);
    setShowForm(true);
  };



  const handlePermanentDelete = (index) => {
    if (window.confirm("Are you sure you want to permanently delete this BOQ item?")) {
      const updated = [...boqData];
      updated.splice(index, 1);
      setBoqData(updated);
      localStorage.setItem("boqItems", JSON.stringify(updated));
      // Clear WBS, BOM, and Cost Prediction results when BOQ changes
      localStorage.removeItem("wbsResults");
      localStorage.removeItem("bomResult");
      localStorage.removeItem("costPredictions");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold font-sans"> Add Projects-</h2>
        
        </div>

        <div className="space-x-2">
          <button
            onClick={() => {
              setShowForm(true);
              setFormData(emptyItem);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all duration-200 font-medium"
          >
            + Add Item
          </button>

          <button
            disabled={boqData.length === 0}
            onClick={() => {
              setSelectedBOQItems(boqData); 
              setActiveView("wbs-creator");
            }}
            className={`px-4 py-2 rounded-lg shadow-sm transition-all duration-200 font-medium ${
              boqData.length === 0 
                ? "bg-gray-300 cursor-not-allowed text-gray-500" 
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            Generate WBS →
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="border border-green-200 rounded-lg p-6 bg-gradient-to-br from-green-50 to-white space-y-4 shadow-sm">
          {/* Material Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project / Material</label>
            <div className="relative">
              <select
                name="projectMaterial"
                value={formData.projectMaterial}
                onChange={handleChange}
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="">Select Material</option>
                {WORK_TYPES.map((workType) => (
                  <option key={workType} value={workType}>
                    {workType}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
            </div>
          </div>

          {/* State, Tier, Length, Width */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 appearance-none cursor-pointer"
              >
                <option value="">Select State</option>
                {Object.keys(STATE_TIER_MAP).map((stateName) => (
                  <option key={stateName} value={stateName}>
                    {stateName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
              <select
                name="tier"
                value={formData.tier}
                onChange={handleChange}
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Select Tier</option>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Length</label>
              <input
                name="length"
                placeholder="Length"
                value={formData.length}
                onChange={handleChange}
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
              <input
                name="width"
                placeholder="Width"
                value={formData.width}
                onChange={handleChange}
                className="w-full border border-green-300 p-3 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-sm transition-all duration-200 font-medium flex-1"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData(emptyItem);
                setEditIndex(null);
              }}
              className="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg shadow-sm transition-all duration-200 font-medium flex-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* BOQ Table */}
      {localBoqData.length > 0 && (
        <div className="rounded-lg border border-green-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gradient-to-r from-green-50 to-green-100">
              <tr>
                <th className="p-3 text-left font-semibold text-gray-700">Project</th>
                <th className="p-3 text-left font-semibold text-gray-700">State</th>
                <th className="p-3 text-left font-semibold text-gray-700">Tier</th>
                <th className="p-3 text-left font-semibold text-gray-700">Length</th>
                <th className="p-3 text-left font-semibold text-gray-700">Width</th>
                <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-green-100">
              {localBoqData.map((item, i) => (
                <tr key={i} className="hover:bg-green-50 transition-colors duration-150">
                  <td className="p-3 text-gray-700 capitalize">{item.projectMaterial}</td>
                  <td className="p-3 text-gray-600">{item.state}</td>
                  <td className="p-3 text-gray-600">{item.tier}</td>
                  <td className="p-3 text-gray-600">{item.length || "-"}</td>
                  <td className="p-3 text-gray-600">{item.width || "-"}</td>
                  <td className="p-3">
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => handleEdit(i)} 
                        className="text-green-600 hover:text-green-700 p-1.5 hover:bg-green-100 rounded transition-all duration-200"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handlePermanentDelete(i)} 
                        className="text-red-500 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-all duration-200"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BOQGenerator;
