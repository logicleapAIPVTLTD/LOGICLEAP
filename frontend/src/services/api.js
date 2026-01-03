
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
// export function generateWBS(items) {
//   const singleItem = items[0];

//   return request("/wbs/generate", {
//     method: "POST",
//     body: JSON.stringify({
//       boq_text: singleItem.projectMaterial,
//       quantity: singleItem.quantity,
//     }),
//   });
// }

// export function generateWBSBatch(items) {
//   return request("/wbs/batch", {
//     method: "POST",
//     body: JSON.stringify({
//       boqs: items.map((item) => ({
//         boq_text: item.projectMaterial,
//         quantity: item.quantity,
//       })),
//     }),
//   });
// }

// Fixed WBS API functions to match new backend format

/**
 * Generate WBS for a single project
 * @param {Object} item - Single project item with { work, length, breadth, state, tier }
 */
export function generateWBS(item) {
  return request("/wbs/generate", {
    method: "POST",
    body: JSON.stringify({
      work: item.work,
      length: item.length || null,
      breadth: item.breadth || null,
      state: item.state || null,
      tier: item.tier || null
    }),
  });
}

/**
 * Generate WBS for multiple projects (batch)
 * @param {Object} payload - Object containing { projects: [...] }
 */
export function generateWBSBatch(payload) {
  // payload should be { projects: [{ work, length, breadth, state, tier }, ...] }
  return request("/wbs/batch", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// // Helper function for making requests
// function request(url, options = {}) {
//   const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
//   return fetch(`${baseURL}${url}`, {
//     headers: {
//       'Content-Type': 'application/json',
//       ...options.headers,
//     },
//     ...options,
//   }).then(async (response) => {
//     const data = await response.json();
    
//     if (!response.ok) {
//       throw new Error(data.error || data.message || 'Request failed');
//     }
    
//     return data;
//   });
// }