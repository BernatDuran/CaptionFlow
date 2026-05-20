import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const TABS = ["Dashboard", "Project", "Editor", "Export", "Settings"];
const EXPORT_PROFILES = ["legacy", "basic", "youtube", "review", "archive"];
const CONFIG_PRESETS = ["personal-youtube", "local-review"];

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
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState({ type: "info", text: "" });
  const [config, setConfig] = useState(null);
  const [providers, setProviders] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [secrets, setSecrets] = useState(null);
  const [projectPath, setProjectPath] = useState(() => localStorage.getItem("captionflow.projectPath") || "");
  const [project, setProject] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [draftSegments, setDraftSegments] = useState([]);
  const [draftIssues, setDraftIssues] = useState([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [jobForm, setJobForm] = useState(initialJobForm);

  const selectedJob = useMemo(
    () => project?.jobs?.find((job) => job.id === selectedJobId),
    [project, selectedJobId],
  );
  const providersByTask = useMemo(() => groupProvidersByTask(providers), [providers]);
  const doctorSummary = useMemo(() => summarizeDoctor(doctor), [doctor]);

  useEffect(() => {
    refreshSystem();
  }, []);

  useEffect(() => {
    if (projectPath) {
      localStorage.setItem("captionflow.projectPath", projectPath);
    }
  }, [projectPath]);

  async function runAction(label, callback, options = {}) {
    setBusyAction(label);
    setNotice({ type: "info", text: "" });
    try {
      await callback();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
      if (options.rethrow) {
        throw error;
      }
    } finally {
      setBusyAction("");
    }
  }

  async function refreshSystem() {
    await runAction("refresh", async () => {
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
      setNotice({ type: "success", text: "System refreshed." });
    }, { rethrow: true }).catch(() => {
      setBackendStatus("offline");
    });
  }

  async function createProject() {
    await runAction("create-project", async () => {
      const response = await api.createProject(projectForm.name, projectForm.rootDir);
      setProjectPath(response.path);
      setProject(response.project);
      setSelectedJobId("");
      setDraftSegments([]);
      setNotice({ type: "success", text: "Project created." });
      setActiveTab("Project");
    });
  }

  async function openProject() {
    await runAction("open-project", async () => {
      const response = await api.getProject(projectPath);
      setProject(response.project);
      setSelectedJobId(response.project.jobs?.[0]?.id || "");
      setDraftSegments([]);
      setNotice({ type: "success", text: "Project loaded." });
      setActiveTab("Project");
    });
  }

  async function addJob() {
    await runAction("add-job", async () => {
      const response = await api.addJob({
        project_path: projectPath,
        input_path: jobForm.inputPath,
        source_lang: jobForm.sourceLang,
        target_lang: jobForm.targetLang,
      });
      setProject(response.project);
      setSelectedJobId(response.job.id);
      setNotice({ type: "success", text: "Job added." });
    });
  }

  async function runJob() {
    await runAction("run-job", async () => {
      const response = await api.runJob({
        project_path: projectPath,
        job_id: selectedJobId,
        config: config || {},
      });
      setProject(response.project);
      setNotice({ type: "success", text: "Job completed and draft saved." });
      await loadDraft();
      setActiveTab("Editor");
    });
  }

  async function loadDraft() {
    await runAction("load-draft", async () => {
      const response = await api.getDraft(projectPath, selectedJobId);
      setDraftSegments(response.segments);
      setDraftIssues(localDraftIssues(response.segments));
      setNotice({ type: "success", text: "Draft loaded." });
    });
  }

  async function saveDraft() {
    await runAction("save-draft", async () => {
      const response = await api.saveDraft({
        project_path: projectPath,
        job_id: selectedJobId,
        segments: draftSegments,
      });
      setDraftIssues(response.issues);
      setNotice({ type: response.issues.length ? "warning" : "success", text: `Draft saved with ${response.issues.length} validation issues.` });
    });
  }

  async function exportJob() {
    await runAction("export-job", async () => {
      const response = await api.exportJob({
        project_path: projectPath,
        job_id: selectedJobId,
        export_profile: config?.export_profile || "youtube",
        formats: config?.formats || ["srt", "vtt"],
      });
      setProject(response.project);
      setNotice({ type: "success", text: `Exported ${response.files.length} files.` });
    });
  }

  async function applyPreset(preset) {
    await runAction("apply-preset", async () => {
      const response = await api.initConfig(preset);
      setConfig(response.config);
      setNotice({ type: "success", text: `Applied preset ${preset}.` });
    });
  }

  async function saveConfig() {
    await runAction("save-config", async () => {
      const response = await api.saveConfig(config);
      setConfig(response.config);
      setNotice({ type: "success", text: "Configuration saved." });
    });
  }

  async function setSecret(envVar) {
    const value = window.prompt(`Set ${envVar}. The value stays in the local backend process.`);
    if (value === null) return;
    await runAction("set-secret", async () => {
      const response = await api.setSecret(envVar, value);
      setSecrets(response);
      setNotice({ type: "success", text: `${envVar} updated.` });
    });
  }

  function updateSegment(index, field, value) {
    setDraftSegments((segments) => {
      const updated = segments.map((segment, current) =>
        current === index ? { ...segment, [field]: value } : segment,
      );
      setDraftIssues(localDraftIssues(updated));
      return updated;
    });
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
            <p>{subtitleFor(activeTab)}</p>
          </div>
          <button disabled={Boolean(busyAction)} onClick={refreshSystem}>
            {busyAction === "refresh" ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        {notice.text && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}

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
                onChange={(event) => setProjectForm({ ...projectForm, rootDir: event.target.value })}
                placeholder="Root directory"
              />
              <button disabled={busyAction === "create-project"} onClick={createProject}>
                Create
              </button>
            </div>
            <div className="panel">
              <h2>Open project</h2>
              <input
                value={projectPath}
                onChange={(event) => setProjectPath(event.target.value)}
                placeholder="Path to captionflow_project.json"
              />
              <button disabled={!projectPath || busyAction === "open-project"} onClick={openProject}>
                Open
              </button>
            </div>
            <div className="panel metrics-panel">
              <h2>Environment</h2>
              <Metric label="Failures" value={doctorSummary.failures} tone="fail" />
              <Metric label="Warnings" value={doctorSummary.warnings} tone="warn" />
              <Metric label="Providers" value={providers.length} />
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
                aria-label="Source language"
              />
              <input
                value={jobForm.targetLang}
                onChange={(event) => setJobForm({ ...jobForm, targetLang: event.target.value })}
                aria-label="Target language"
              />
              <button disabled={!projectPath || !jobForm.inputPath || Boolean(busyAction)} onClick={addJob}>
                Add job
              </button>
              <button disabled={!selectedJobId || Boolean(busyAction)} onClick={runJob}>
                {busyAction === "run-job" ? "Running..." : "Run"}
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
            <div className="toolbar editor-toolbar">
              <button disabled={!selectedJobId || Boolean(busyAction)} onClick={loadDraft}>
                Load draft
              </button>
              <button disabled={!draftSegments.length || Boolean(busyAction)} onClick={saveDraft}>
                Save draft
              </button>
              <span className={draftIssues.length ? "issue-count warning" : "issue-count"}>
                {draftIssues.length} issues
              </span>
            </div>
            <div className="editor-grid">
              {draftSegments.map((segment, index) => (
                <div className="segment-row" key={`${segment.start}-${index}`}>
                  <span>{index + 1}</span>
                  <input
                    type="number"
                    step="0.001"
                    value={segment.start}
                    onChange={(event) => updateSegment(index, "start", Number(event.target.value))}
                  />
                  <input
                    type="number"
                    step="0.001"
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
              {!draftSegments.length && <EmptyState text="Load a completed job draft to begin editing." />}
            </div>
          </section>
        )}

        {activeTab === "Export" && (
          <section className="panel">
            <h2>Export selected job</h2>
            <p>{selectedJob ? selectedJob.input_path : "Select a job first."}</p>
            <button disabled={!selectedJobId || Boolean(busyAction)} onClick={exportJob}>
              {busyAction === "export-job" ? "Exporting..." : "Export"}
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
              {CONFIG_PRESETS.map((preset) => (
                <button key={preset} onClick={() => applyPreset(preset)}>
                  {preset}
                </button>
              ))}
            </div>
            <div className="panel">
              <h2>Providers</h2>
              <ProviderSelect
                label="Transcription"
                value={config.transcription_provider}
                providers={providersByTask.transcription}
                onChange={(value) => setConfig({ ...config, transcription_provider: value })}
              />
              <ProviderSelect
                label="Transcription fallback"
                value={config.transcription_fallback_provider || ""}
                providers={providersByTask.transcription}
                includeNone
                onChange={(value) => setConfig({ ...config, transcription_fallback_provider: value || null })}
              />
              <ProviderSelect
                label="Translation"
                value={config.translation_provider}
                providers={providersByTask.translation}
                onChange={(value) => setConfig({ ...config, translation_provider: value })}
              />
              <ProviderSelect
                label="Translation fallback"
                value={config.translation_fallback_provider || ""}
                providers={providersByTask.translation}
                includeNone
                onChange={(value) => setConfig({ ...config, translation_fallback_provider: value || null })}
              />
              <SelectInput
                label="Export profile"
                value={config.export_profile}
                options={EXPORT_PROFILES}
                onChange={(value) => setConfig({ ...config, export_profile: value })}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={Boolean(config.translation_cache_enabled)}
                  onChange={(event) =>
                    setConfig({ ...config, translation_cache_enabled: event.target.checked })
                  }
                />
                Translation cache
              </label>
              <ConfigInput
                label="Glossary path"
                value={config.translation_glossary_path || ""}
                onChange={(value) => setConfig({ ...config, translation_glossary_path: value || null })}
              />
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
                {(doctor?.checks || []).slice(0, 14).map((check) => (
                  <div className={`check check-${check.status}`} key={check.name}>
                    <span>{check.name}</span>
                    <small>{check.message}</small>
                    {check.action_hint && <small>{check.action_hint}</small>}
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
  if (!jobs.length) {
    return <EmptyState text="No jobs yet. Add a video or audio file to begin." />;
  }
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
            <td><span className={`job-status ${job.status}`}>{job.status}</span></td>
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

function SelectInput({ label, value, options, onChange }) {
  return (
    <label className="config-input">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ProviderSelect({ label, value, providers, includeNone = false, onChange }) {
  return (
    <SelectInput
      label={label}
      value={value}
      options={[...(includeNone ? [""] : []), ...providers.map((provider) => provider.name)]}
      onChange={onChange}
    />
  );
}

function Metric({ label, value, tone = "neutral" }) {
  return (
    <div className={`metric metric-${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

function groupProvidersByTask(providers) {
  return providers.reduce(
    (groups, provider) => {
      groups[provider.task] = [...(groups[provider.task] || []), provider];
      return groups;
    },
    { transcription: [], translation: [], tts: [] },
  );
}

function summarizeDoctor(doctor) {
  const checks = doctor?.checks || [];
  return {
    failures: checks.filter((check) => check.status === "fail").length,
    warnings: checks.filter((check) => check.status === "warn").length,
  };
}

function localDraftIssues(segments) {
  const issues = [];
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (Number(segment.end) <= Number(segment.start)) {
      issues.push({ code: "invalid_timing", index });
    }
    if (!String(segment.text || "").trim()) {
      issues.push({ code: "empty_text", index });
    }
    if (index > 0 && Number(segment.start) < Number(segments[index - 1].end)) {
      issues.push({ code: "overlap", index });
    }
  }
  return issues;
}

function subtitleFor(tab) {
  const subtitles = {
    Dashboard: "Create or open a local CaptionFlow project.",
    Project: "Add media, select a job and run the pipeline.",
    Editor: "Review and correct subtitle drafts before export.",
    Export: "Generate YouTube, review or archive outputs.",
    Settings: "Configure providers, API keys, cache, glossary and diagnostics.",
  };
  return subtitles[tab] || "CaptionFlow";
}
