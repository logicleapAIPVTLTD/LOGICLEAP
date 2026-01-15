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

  console.log(data);

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
    request("/bom/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

/* =========================
   ESTIMATION APIs
========================= */
export const estimationAPI = {
  calculate: (payload) =>
    request("/cost-engine/estimate", {
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
      tier: item.tier || null,
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

/* =========================
   BOQ APIs
========================= */
const requestFormData = async (endpoint, formData) => {
  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    body: formData,
    // Don't set Content-Type header - browser will set it with boundary for FormData
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || data?.error || "API request failed");
  }

  return data;
};

export const boqAPI = {
  // Generate BOQ from file upload (Excel, CSV, PDF)
  generateFromFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return requestFormData("/boq/file", formData);
  },

  // Generate BOQ from floor plan and 2D layout images
  // Note: Backend currently processes one file at a time, so we're sending floor plan first
  // The layout file may need separate processing or backend update to handle both
  generateFromImages: (floorPlanFile, projectInfo) => {
    const formData = new FormData();
    console.log(projectInfo);
    formData.append("file", floorPlanFile); // Backend expects 'file' for floorplan
    // meterPerPixel is required by backend - always send it
    formData.append("meterPerPixel", projectInfo.meterPerPixel || "0.01");
    // autoSelectWorks must be 'true' to generate BOQ items automatically
    formData.append("autoSelectWorks", "true");
    // Optional metadata
    formData.append("projectName", projectInfo.projectName || "");
    formData.append("location", projectInfo.location || "");
    formData.append("state", projectInfo.state || "");
    formData.append("tier", projectInfo.tier || "");
    formData.append("projectType", projectInfo.projectType || "");
    // Note: Backend may need to be updated to accept both floorplan and layout files
    // For now, sending floor plan only - layout processing may be separate
    return requestFormData("/boq/file", formData);
  },
};

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
