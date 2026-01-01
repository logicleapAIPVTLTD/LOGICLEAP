
import { Edit2, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
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
const UNITS = ["Sqft", "Sqm", "Nos", "Rm", "Kg"];
const TIERS = ["T1", "T2", "T3"];

const emptyItem = {
  projectMaterial: "",
  quantity: "",
  unit: "",
  rate: "",
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
    if (!formData.projectMaterial || !formData.quantity || !formData.state) return;
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
    setFormData(emptyItem);
    setEditIndex(null);
    setShowForm(false);
  };



  const handleEdit = (index) => {
    setFormData(localBoqData[index]);
    setEditIndex(index);
    setShowForm(true);
  };



  const handlePermanentDelete = (index) => {
    if (window.confirm("Are you sure you want to permanently delete this BOQ item?")) {
      const updated = [...boqData];
      updated.splice(index, 1);
      setBoqData(updated);
      localStorage.setItem("boqItems", JSON.stringify(updated));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Smart BOQ Generator</h2>
          <p className="text-sm text-gray-500">
            Create Bill of Quantities with AI assistance
          </p>
        </div>

        <div className="space-x-2">
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            + Add Item
          </button>

          <button
            disabled={boqData.length === 0}
            onClick={() => {
              setSelectedBOQItems(boqData); 
              setActiveView("wbs-creator");
            }}
            className={`px-3 py-1 rounded ${boqData.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-green-600 text-white"
              }`}
          >
            Generate WBS →
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="border rounded p-4 bg-gray-50 space-y-3">
          <input
            name="projectMaterial"
            placeholder="Project / Material"
            value={formData.projectMaterial}
            onChange={handleChange}
            className="border p-2 w-full rounded"
          />

          <div className="grid grid-cols-4 gap-2">
            <input
              name="quantity"
              placeholder="Quantity"
              value={formData.quantity}
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <select
              name="unit"
              value={formData.unit}
              onChange={handleChange}
              className="border p-2 rounded"
            >
              <option value="">Unit</option>
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <input
              name="rate"
              placeholder="Rate"
              value={formData.rate}
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <input
              name="state"
              placeholder="State"
              value={formData.state}
              onChange={handleChange}
              className="border p-2 rounded"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <select
              name="tier"
              value={formData.tier}
              onChange={handleChange}
              className="border p-2 rounded"
            >
              <option value="">Tier</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="length"
              placeholder="Length"
              value={formData.length}
              onChange={handleChange}
              className="border p-2 rounded"
            />
            <input
              name="width"
              placeholder="Width"
              value={formData.width}
              onChange={handleChange}
              className="border p-2 rounded"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-green-600 text-white rounded"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setFormData(emptyItem);
                setEditIndex(null);
              }}
              className="px-3 py-1 bg-gray-400 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* BOQ Table */}
      {localBoqData.length > 0 && (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2">Project / Material</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Rate</th>
              <th>Total Cost</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {localBoqData.map((item, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{item.projectMaterial}</td>
                <td>{item.quantity}</td>
                <td>{item.unit}</td>
                <td>{item.rate}</td>
                <td>
                  {item.quantity && item.rate
                    ? (parseFloat(item.quantity) * parseFloat(item.rate)).toFixed(2)
                    : "-"}
                </td>
                <td className="flex gap-2">
                  <button onClick={() => handleEdit(i)} className="text-blue-600 p-1">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handlePermanentDelete(i)} className="text-red-600 p-1">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BOQGenerator;
