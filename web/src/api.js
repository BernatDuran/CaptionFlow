const API_BASE = import.meta.env.VITE_CAPTIONFLOW_API || "http://127.0.0.1:8765";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    throw new Error(payload.error || `Request failed: ${response.status}`);
  }
  return payload;
}

export const api = {
  health: () => request("/health"),
  getConfig: () => request("/config"),
  saveConfig: (config) => request("/config", { method: "PUT", body: JSON.stringify({ config }) }),
  initConfig: (preset) => request("/config", { method: "POST", body: JSON.stringify({ preset }) }),
  providers: () => request("/providers"),
  filesystem: (path, mode) =>
    request(`/filesystem?path=${encodeURIComponent(path || "")}&mode=${encodeURIComponent(mode || "any")}`),
  doctor: () => request("/doctor"),
  secrets: () => request("/secrets"),
  setSecret: (envVar, value) =>
    request("/secrets", {
      method: "PUT",
      body: JSON.stringify({ env_var: envVar, value }),
    }),
  createProject: (name, rootDir) =>
    request("/projects", {
      method: "POST",
      body: JSON.stringify({ name, root_dir: rootDir }),
    }),
  getProject: (path) => request(`/projects?path=${encodeURIComponent(path)}`),
  addJob: (payload) =>
    request("/projects/jobs", { method: "POST", body: JSON.stringify(payload) }),
  runJob: (payload) =>
    request("/projects/jobs/run", { method: "POST", body: JSON.stringify(payload) }),
  getDraft: (projectPath, jobId) =>
    request(
      `/projects/jobs/draft?project_path=${encodeURIComponent(projectPath)}&job_id=${encodeURIComponent(jobId)}`,
    ),
  saveDraft: (payload) =>
    request("/projects/jobs/draft", { method: "PUT", body: JSON.stringify(payload) }),
  exportJob: (payload) =>
    request("/projects/jobs/export", { method: "POST", body: JSON.stringify(payload) }),
};
