import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const TABS = ["Dashboard", "Project", "Editor", "Export", "Settings"];

const initialProjectForm = {
  name: "CaptionFlow Project",
  rootDir: "./captionflow-project",
};

const initialJobForm = {
  inputPath: "",
  sourceLang: "en",
  targetLang: "es",
};

export default function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [config, setConfig] = useState(null);
  const [providers, setProviders] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [secrets, setSecrets] = useState(null);
  const [projectPath, setProjectPath] = useState("");
  const [project, setProject] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [draftSegments, setDraftSegments] = useState([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [jobForm, setJobForm] = useState(initialJobForm);

  const selectedJob = useMemo(
    () => project?.jobs?.find((job) => job.id === selectedJobId),
    [project, selectedJobId],
  );

  useEffect(() => {
    refreshSystem();
  }, []);

  async function refreshSystem() {
    try {
      await api.health();
      setBackendStatus("online");
      const [configPayload, providersPayload, doctorPayload, secretsPayload] = await Promise.all([
        api.getConfig(),
        api.providers(),
        api.doctor(),
        api.secrets(),
      ]);
      setConfig(configPayload);
      setProviders(providersPayload.providers);
      setDoctor(doctorPayload);
      setSecrets(secretsPayload);
    } catch (error) {
      setBackendStatus("offline");
      setMessage(error.message);
    }
  }

  async function createProject() {
    const response = await api.createProject(projectForm.name, projectForm.rootDir);
    setProjectPath(response.path);
    setProject(response.project);
    setMessage("Project created.");
    setActiveTab("Project");
  }

  async function openProject() {
    const response = await api.getProject(projectPath);
    setProject(response.project);
    setMessage("Project loaded.");
    setActiveTab("Project");
  }

  async function addJob() {
    const response = await api.addJob({
      project_path: projectPath,
      input_path: jobForm.inputPath,
      source_lang: jobForm.sourceLang,
      target_lang: jobForm.targetLang,
    });
    setProject(response.project);
    setSelectedJobId(response.job.id);
    setMessage("Job added.");
  }

  async function runJob() {
    const response = await api.runJob({
      project_path: projectPath,
      job_id: selectedJobId,
      config: config || {},
    });
    setProject(response.project);
    setMessage("Job completed and draft saved.");
    await loadDraft();
    setActiveTab("Editor");
  }

  async function loadDraft() {
    const response = await api.getDraft(projectPath, selectedJobId);
    setDraftSegments(response.segments);
  }

  async function saveDraft() {
    const response = await api.saveDraft({
      project_path: projectPath,
      job_id: selectedJobId,
      segments: draftSegments,
    });
    setMessage(`Draft saved with ${response.issues.length} validation issues.`);
  }

  async function exportJob() {
    const response = await api.exportJob({
      project_path: projectPath,
      job_id: selectedJobId,
      export_profile: config?.export_profile || "youtube",
      formats: config?.formats || ["srt", "vtt"],
    });
    setProject(response.project);
    setMessage(`Exported ${response.files.length} files.`);
  }

  async function applyPreset(preset) {
    const response = await api.initConfig(preset);
    setConfig(response.config);
    setMessage(`Applied preset ${preset}.`);
  }

  async function saveConfig() {
    const response = await api.saveConfig(config);
    setConfig(response.config);
    setMessage("Configuration saved.");
  }

  async function setSecret(envVar) {
    const value = window.prompt(`Set ${envVar}. The value stays in the local backend process.`);
    if (value === null) return;
    const response = await api.setSecret(envVar, value);
    setSecrets(response);
  }

  function updateSegment(index, field, value) {
    setDraftSegments((segments) =>
      segments.map((segment, current) =>
        current === index ? { ...segment, [field]: value } : segment,
      ),
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">CaptionFlow</div>
          <div className={`status status-${backendStatus}`}>{backendStatus}</div>
        </div>
        <nav>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeTab}</h1>
            <p>{message || "Local subtitle workflow for transcription, review and export."}</p>
          </div>
          <button onClick={refreshSystem}>Refresh</button>
        </header>

        {activeTab === "Dashboard" && (
          <section className="panel-grid">
            <div className="panel">
              <h2>Create project</h2>
              <input
                value={projectForm.name}
                onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })}
                placeholder="Project name"
              />
              <input
                value={projectForm.rootDir}
                onChange={(event) =>
                  setProjectForm({ ...projectForm, rootDir: event.target.value })
                }
                placeholder="Root directory"
              />
              <button onClick={createProject}>Create</button>
            </div>
            <div className="panel">
              <h2>Open project</h2>
              <input
                value={projectPath}
                onChange={(event) => setProjectPath(event.target.value)}
                placeholder="Path to captionflow_project.json"
              />
              <button onClick={openProject}>Open</button>
            </div>
            <div className="panel">
              <h2>Environment</h2>
              <p>{doctor?.checks?.filter((check) => check.status === "fail").length || 0} failures</p>
              <p>{doctor?.checks?.filter((check) => check.status === "warn").length || 0} warnings</p>
            </div>
          </section>
        )}

        {activeTab === "Project" && (
          <section className="stack">
            <div className="toolbar">
              <input
                value={jobForm.inputPath}
                onChange={(event) => setJobForm({ ...jobForm, inputPath: event.target.value })}
                placeholder="Video or audio path"
              />
              <input
                value={jobForm.sourceLang}
                onChange={(event) => setJobForm({ ...jobForm, sourceLang: event.target.value })}
              />
              <input
                value={jobForm.targetLang}
                onChange={(event) => setJobForm({ ...jobForm, targetLang: event.target.value })}
              />
              <button disabled={!projectPath || !jobForm.inputPath} onClick={addJob}>
                Add job
              </button>
              <button disabled={!selectedJobId} onClick={runJob}>
                Run
              </button>
            </div>
            <JobTable
              jobs={project?.jobs || []}
              selectedJobId={selectedJobId}
              onSelect={setSelectedJobId}
            />
          </section>
        )}

        {activeTab === "Editor" && (
          <section className="stack">
            <div className="toolbar">
              <button disabled={!selectedJobId} onClick={loadDraft}>
                Load draft
              </button>
              <button disabled={!draftSegments.length} onClick={saveDraft}>
                Save draft
              </button>
            </div>
            <div className="editor-grid">
              {draftSegments.map((segment, index) => (
                <div className="segment-row" key={`${segment.start}-${index}`}>
                  <span>{index + 1}</span>
                  <input
                    value={segment.start}
                    onChange={(event) => updateSegment(index, "start", Number(event.target.value))}
                  />
                  <input
                    value={segment.end}
                    onChange={(event) => updateSegment(index, "end", Number(event.target.value))}
                  />
                  <textarea
                    value={segment.text}
                    onChange={(event) => updateSegment(index, "text", event.target.value)}
                  />
                  <textarea
                    value={segment.translated}
                    onChange={(event) => updateSegment(index, "translated", event.target.value)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === "Export" && (
          <section className="panel">
            <h2>Export selected job</h2>
            <p>{selectedJob ? selectedJob.input_path : "Select a job first."}</p>
            <button disabled={!selectedJobId} onClick={exportJob}>
              Export
            </button>
            <ul className="file-list">
              {(selectedJob?.output_files || []).map((file) => (
                <li key={file}>{file}</li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === "Settings" && config && (
          <section className="settings-grid">
            <div className="panel">
              <h2>Presets</h2>
              <button onClick={() => applyPreset("personal-youtube")}>Personal YouTube</button>
              <button onClick={() => applyPreset("local-review")}>Local Review</button>
            </div>
            <div className="panel">
              <h2>Providers</h2>
              <ConfigInput label="Transcription" value={config.transcription_provider} onChange={(value) => setConfig({ ...config, transcription_provider: value })} />
              <ConfigInput label="Transcription fallback" value={config.transcription_fallback_provider || ""} onChange={(value) => setConfig({ ...config, transcription_fallback_provider: value || null })} />
              <ConfigInput label="Translation" value={config.translation_provider} onChange={(value) => setConfig({ ...config, translation_provider: value })} />
              <ConfigInput label="Translation fallback" value={config.translation_fallback_provider || ""} onChange={(value) => setConfig({ ...config, translation_fallback_provider: value || null })} />
              <ConfigInput label="Export profile" value={config.export_profile} onChange={(value) => setConfig({ ...config, export_profile: value })} />
              <button onClick={saveConfig}>Save settings</button>
            </div>
            <div className="panel">
              <h2>API keys</h2>
              {Object.entries(secrets?.keys || {}).map(([envVar, info]) => (
                <div className="secret-row" key={envVar}>
                  <span>{envVar}</span>
                  <strong>{info.configured ? info.preview : "not set"}</strong>
                  <button onClick={() => setSecret(envVar)}>Set</button>
                </div>
              ))}
            </div>
            <div className="panel">
              <h2>Doctor</h2>
              <div className="check-list">
                {(doctor?.checks || []).slice(0, 12).map((check) => (
                  <div className={`check check-${check.status}`} key={check.name}>
                    <span>{check.name}</span>
                    <small>{check.message}</small>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel provider-panel">
              <h2>Available providers</h2>
              {providers.map((provider) => (
                <span key={provider.name}>{provider.task}: {provider.name}</span>
              ))}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function JobTable({ jobs, selectedJobId, onSelect }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Status</th>
          <th>Input</th>
          <th>Languages</th>
          <th>Draft</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr
            key={job.id}
            className={selectedJobId === job.id ? "selected" : ""}
            onClick={() => onSelect(job.id)}
          >
            <td>{job.status}</td>
            <td>{job.input_path}</td>
            <td>{job.source_lang} to {job.target_lang}</td>
            <td>{job.subtitle_draft_path ? "yes" : "no"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ConfigInput({ label, value, onChange }) {
  return (
    <label className="config-input">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
