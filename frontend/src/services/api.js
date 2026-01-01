
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* =========================
   Base request helper
========================= */
const request = async (endpoint, options = {}) => {
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || "API request failed");
  }

  return data;
};

/* =========================
   BOM APIs
========================= */
export const bomAPI = {
  predict: (payload) =>
    request("/bom/predict", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

/* =========================
   ESTIMATION APIs
========================= */
export const estimationAPI = {
  calculate: (payload) =>
    request("/estimation/calculate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

/* =========================
   WBS APIs
========================= */
export function generateWBS(items) {
  const singleItem = items[0];

  return request("/wbs/generate", {
    method: "POST",
    body: JSON.stringify({
      boq_text: singleItem.projectMaterial,
      quantity: singleItem.quantity,
    }),
  });
}

export function generateWBSBatch(items) {
  return request("/wbs/batch", {
    method: "POST",
    body: JSON.stringify({
      boqs: items.map((item) => ({
        boq_text: item.projectMaterial,
        quantity: item.quantity,
      })),
    }),
  });
}
