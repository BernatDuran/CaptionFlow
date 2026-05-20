import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const TABS = ["Flow", "Editor", "Export", "Settings", "History"];
const EXPORT_PROFILES = ["legacy", "basic", "youtube", "review", "archive"];
const CONFIG_PRESETS = ["personal-youtube", "local-review"];
const FORMATS = ["srt", "vtt", "txt"];
const RECENT_PROJECTS_KEY = "captionflow.recentProjects";

const initialProjectForm = {
  name: "CaptionFlow Project",
  rootDir: "./captionflow-project",
};

const initialJobForm = {
  inputPath: "",
  sourceLang: "en",
  targetLang: "es",
};

const initialBrowser = {
  open: false,
  title: "",
  target: "",
  mode: "any",
  path: "",
  entries: [],
  roots: [],
  parent: null,
  home: "",
  cwd: "",
};

export default function App() {
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem("captionflow.activeTab");
    return TABS.includes(savedTab) ? savedTab : "Flow";
  });
  const [backendStatus, setBackendStatus] = useState("checking");
  const [busyAction, setBusyAction] = useState("");
  const [notice, setNotice] = useState({ type: "info", text: "" });
  const [config, setConfig] = useState(null);
  const [providers, setProviders] = useState([]);
  const [doctor, setDoctor] = useState(null);
  const [secrets, setSecrets] = useState(null);
  const [projectPath, setProjectPath] = useState(() => localStorage.getItem("captionflow.projectPath") || "");
  const [recentProjects, setRecentProjects] = useState(readRecentProjects);
  const [project, setProject] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [draftSegments, setDraftSegments] = useState([]);
  const [draftIssues, setDraftIssues] = useState([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [jobForm, setJobForm] = useState(initialJobForm);
  const [jobEvents, setJobEvents] = useState([]);
  const [browser, setBrowser] = useState(initialBrowser);
  const [editorFilter, setEditorFilter] = useState("");

  const selectedJob = useMemo(
    () => project?.jobs?.find((job) => job.id === selectedJobId),
    [project, selectedJobId],
  );
  const providersByTask = useMemo(() => groupProvidersByTask(providers), [providers]);
  const doctorSummary = useMemo(() => summarizeDoctor(doctor), [doctor]);
  const readiness = useMemo(
    () => buildReadiness({ backendStatus, config, project, selectedJob, draftSegments, doctorSummary }),
    [backendStatus, config, project, selectedJob, draftSegments, doctorSummary],
  );
  const visibleSegments = useMemo(
    () => filterSegments(draftSegments, editorFilter),
    [draftSegments, editorFilter],
  );

  useEffect(() => {
    refreshSystem();
  }, []);

  useEffect(() => {
    localStorage.setItem("captionflow.activeTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (projectPath) {
      localStorage.setItem("captionflow.projectPath", projectPath);
    }
  }, [projectPath]);

  useEffect(() => {
    if (projectPath && project) {
      rememberProject(projectPath, project.name, setRecentProjects);
    }
  }, [projectPath, project]);

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
      setJobForm((form) => ({
        ...form,
        sourceLang: form.sourceLang || configPayload.source_lang || "en",
        targetLang: form.targetLang || configPayload.target_lang || "es",
      }));
      setNotice({ type: "success", text: "Sistema actualizado." });
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
      setJobEvents([]);
      setNotice({ type: "success", text: "Proyecto creado." });
      setActiveTab("Flow");
    });
  }

  async function openProject(path = projectPath) {
    await runAction("open-project", async () => {
      const response = await api.getProject(path);
      setProjectPath(response.path);
      setProject(response.project);
      setSelectedJobId(response.project.jobs?.[0]?.id || "");
      setDraftSegments([]);
      setJobEvents([]);
      setNotice({ type: "success", text: "Proyecto cargado." });
      setActiveTab("Flow");
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
      setJobEvents([]);
      setNotice({ type: "success", text: "Archivo añadido como job." });
    });
  }

  async function runJob() {
    await runAction("run-job", async () => {
      setJobEvents([
        {
          stage: "queue",
          status: "started",
          message: "Job enviado al backend local.",
        },
      ]);
      const response = await api.runJob({
        project_path: projectPath,
        job_id: selectedJobId,
        config: config || {},
      });
      setProject(response.project);
      setJobEvents(response.events || []);
      setNotice({ type: "success", text: "Job completado y draft guardado." });
      await loadDraft({ silent: true });
      setActiveTab("Editor");
    });
  }

  async function loadDraft(options = {}) {
    await runAction("load-draft", async () => {
      const response = await api.getDraft(projectPath, selectedJobId);
      setDraftSegments(response.segments);
      setDraftIssues(localDraftIssues(response.segments));
      if (!options.silent) {
        setNotice({ type: "success", text: "Draft cargado." });
      }
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
      setNotice({
        type: response.issues.length ? "warning" : "success",
        text: `Draft guardado con ${response.issues.length} avisos de validacion.`,
      });
    });
  }

  async function exportJob() {
    await runAction("export-job", async () => {
      const response = await api.exportJob({
        project_path: projectPath,
        job_id: selectedJobId,
        export_profile: config?.export_profile || "youtube",
        formats: config?.formats || ["srt", "vtt"],
        output_dir: config?.output_dir,
      });
      setProject(response.project);
      setNotice({ type: "success", text: `Exportados ${response.files.length} archivos.` });
    });
  }

  async function applyPreset(preset) {
    await runAction("apply-preset", async () => {
      const response = await api.initConfig(preset);
      setConfig(response.config);
      setNotice({ type: "success", text: `Preset aplicado: ${preset}.` });
    });
  }

  async function saveConfig() {
    await runAction("save-config", async () => {
      const response = await api.saveConfig(config);
      setConfig(response.config);
      setNotice({ type: "success", text: "Configuracion guardada." });
    });
  }

  async function setSecret(envVar) {
    const value = window.prompt(`Configurar ${envVar}. Se guarda solo en el proceso backend local.`);
    if (value === null) return;
    await runAction("set-secret", async () => {
      const response = await api.setSecret(envVar, value);
      setSecrets(response);
      setNotice({ type: "success", text: `${envVar} actualizado.` });
    });
  }

  async function openBrowser(target, mode, title, startPath = "") {
    await runAction("filesystem", async () => {
      const response = await api.filesystem(startPath || browser.path || project?.root_dir || "", mode);
      setBrowser({
        open: true,
        title,
        target,
        mode,
        path: response.path,
        entries: response.entries,
        roots: response.roots,
        parent: response.parent,
        home: response.home,
        cwd: response.cwd,
      });
    });
  }

  async function browseTo(path = browser.path) {
    await runAction("filesystem", async () => {
      const response = await api.filesystem(path, browser.mode);
      setBrowser((current) => ({
        ...current,
        path: response.path,
        entries: response.entries,
        roots: response.roots,
        parent: response.parent,
        home: response.home,
        cwd: response.cwd,
      }));
    });
  }

  function selectBrowserPath(path) {
    if (browser.target === "projectRoot") {
      setProjectForm((form) => ({ ...form, rootDir: path }));
    }
    if (browser.target === "projectFile") {
      setProjectPath(path);
    }
    if (browser.target === "mediaFile") {
      setJobForm((form) => ({ ...form, inputPath: path }));
    }
    if (browser.target === "outputDir") {
      setConfig((current) => ({ ...current, output_dir: path }));
    }
    if (browser.target === "glossaryPath") {
      setConfig((current) => ({ ...current, translation_glossary_path: path }));
    }
    setBrowser(initialBrowser);
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
    <>
    <a className="skip-link" href="#captionflow-workspace">Saltar al contenido</a>
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

      <section className="workspace" id="captionflow-workspace">
        <header className="topbar">
          <div>
            <h1>{activeTab}</h1>
            <p>{subtitleFor(activeTab)}</p>
          </div>
          <button disabled={Boolean(busyAction)} onClick={refreshSystem}>
            {busyAction === "refresh" ? "Actualizando..." : "Refresh"}
          </button>
        </header>

        {notice.text && <div className={`notice notice-${notice.type}`}>{notice.text}</div>}

        {activeTab === "Flow" && (
          <FlowView
            readiness={readiness}
            projectForm={projectForm}
            setProjectForm={setProjectForm}
            projectPath={projectPath}
            setProjectPath={setProjectPath}
            project={project}
            selectedJob={selectedJob}
            selectedJobId={selectedJobId}
            setSelectedJobId={setSelectedJobId}
            jobForm={jobForm}
            setJobForm={setJobForm}
            jobEvents={jobEvents}
            config={config}
            busyAction={busyAction}
            createProject={createProject}
            openProject={openProject}
            addJob={addJob}
            runJob={runJob}
            loadDraft={loadDraft}
            exportJob={exportJob}
            setActiveTab={setActiveTab}
            openBrowser={openBrowser}
          />
        )}

        {activeTab === "Editor" && (
          <EditorView
            selectedJob={selectedJob}
            draftSegments={draftSegments}
            draftIssues={draftIssues}
            visibleSegments={visibleSegments}
            editorFilter={editorFilter}
            setEditorFilter={setEditorFilter}
            busyAction={busyAction}
            loadDraft={loadDraft}
            saveDraft={saveDraft}
            updateSegment={updateSegment}
          />
        )}

        {activeTab === "Export" && (
          <ExportView
            selectedJob={selectedJob}
            config={config}
            setConfig={setConfig}
            busyAction={busyAction}
            exportJob={exportJob}
            openBrowser={openBrowser}
          />
        )}

        {activeTab === "Settings" && config && (
          <SettingsView
            config={config}
            setConfig={setConfig}
            providers={providers}
            providersByTask={providersByTask}
            secrets={secrets}
            doctor={doctor}
            applyPreset={applyPreset}
            saveConfig={saveConfig}
            setSecret={setSecret}
            openBrowser={openBrowser}
          />
        )}

        {activeTab === "History" && (
          <HistoryView
            recentProjects={recentProjects}
            openProject={openProject}
            setProjectPath={setProjectPath}
          />
        )}
      </section>

      {browser.open && (
        <FileBrowser
          browser={browser}
          busyAction={busyAction}
          browseTo={browseTo}
          selectPath={selectBrowserPath}
          close={() => setBrowser(initialBrowser)}
        />
      )}
    </main>
    </>
  );
}

function FlowView(props) {
  const {
    readiness,
    projectForm,
    setProjectForm,
    projectPath,
    setProjectPath,
    project,
    selectedJob,
    selectedJobId,
    setSelectedJobId,
    jobForm,
    setJobForm,
    jobEvents,
    config,
    busyAction,
    createProject,
    openProject,
    addJob,
    runJob,
    loadDraft,
    exportJob,
    setActiveTab,
    openBrowser,
  } = props;

  return (
    <section className="flow-layout">
      <div className="stepper">
        {readiness.map((step, index) => (
          <div className={`step-card step-${step.state}`} key={step.label}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </div>
        ))}
      </div>

      <section className="panel-grid">
        <div className="panel">
          <PanelHeader title="Proyecto" meta={project ? project.name : "Sin proyecto cargado"} />
          <ConfigInput
            label="Nombre"
            value={projectForm.name}
            onChange={(value) => setProjectForm({ ...projectForm, name: value })}
          />
          <PathInput
            label="Carpeta del proyecto"
            value={projectForm.rootDir}
            onChange={(value) => setProjectForm({ ...projectForm, rootDir: value })}
            onBrowse={() => openBrowser("projectRoot", "directory", "Seleccionar carpeta de proyecto", projectForm.rootDir)}
          />
          <div className="button-row">
            <button disabled={busyAction === "create-project"} onClick={createProject}>
              Crear proyecto
            </button>
          </div>
          <PathInput
            label="Abrir proyecto existente"
            value={projectPath}
            onChange={setProjectPath}
            onBrowse={() => openBrowser("projectFile", "project", "Abrir captionflow_project.json", projectPath)}
          />
          <button disabled={!projectPath || busyAction === "open-project"} onClick={() => openProject(projectPath)}>
            Abrir proyecto
          </button>
        </div>

        <div className="panel">
          <PanelHeader title="Archivo y job" meta={selectedJob ? selectedJob.status : "Pendiente"} />
          <PathInput
            label="Video o audio"
            value={jobForm.inputPath}
            onChange={(value) => setJobForm({ ...jobForm, inputPath: value })}
            onBrowse={() => openBrowser("mediaFile", "media", "Seleccionar video o audio", jobForm.inputPath)}
          />
          <div className="two-columns">
            <ConfigInput
              label="Origen"
              value={jobForm.sourceLang}
              onChange={(value) => setJobForm({ ...jobForm, sourceLang: value })}
            />
            <ConfigInput
              label="Destino"
              value={jobForm.targetLang}
              onChange={(value) => setJobForm({ ...jobForm, targetLang: value })}
            />
          </div>
          <button disabled={!projectPath || !jobForm.inputPath || Boolean(busyAction)} onClick={addJob}>
            Añadir job
          </button>
          <JobList
            jobs={project?.jobs || []}
            selectedJobId={selectedJobId}
            onSelect={setSelectedJobId}
          />
        </div>
      </section>

      <section className="panel-grid">
        <div className="panel">
          <PanelHeader
            title="Ejecutar"
            meta={config ? `${config.transcription_provider} + ${config.translation_provider}` : "Sin config"}
          />
          <ProviderRouteSummary config={config} />
          <button disabled={!selectedJobId || Boolean(busyAction)} onClick={runJob}>
            {busyAction === "run-job" ? "Procesando..." : "Ejecutar pipeline"}
          </button>
          <EventTimeline events={jobEvents} selectedJob={selectedJob} />
        </div>

        <div className="panel">
          <PanelHeader title="Revisar y exportar" meta="Resultado final" />
          <div className="quick-actions">
            <button disabled={!selectedJobId || Boolean(busyAction)} onClick={() => loadDraft()}>
              Cargar draft
            </button>
            <button disabled={!selectedJob?.subtitle_draft_path} onClick={() => setActiveTab("Editor")}>
              Abrir editor
            </button>
            <button disabled={!selectedJob?.subtitle_draft_path || Boolean(busyAction)} onClick={exportJob}>
              Exportar
            </button>
            <button onClick={() => setActiveTab("Settings")}>Configurar</button>
          </div>
          <OutputList files={selectedJob?.output_files || []} />
        </div>
      </section>
    </section>
  );
}

function EditorView({
  selectedJob,
  draftSegments,
  draftIssues,
  visibleSegments,
  editorFilter,
  setEditorFilter,
  busyAction,
  loadDraft,
  saveDraft,
  updateSegment,
}) {
  return (
    <section className="stack">
      <div className="toolbar editor-toolbar">
        <button disabled={!selectedJob || Boolean(busyAction)} onClick={() => loadDraft()}>
          Cargar draft
        </button>
        <button disabled={!draftSegments.length || Boolean(busyAction)} onClick={saveDraft}>
          Guardar draft
        </button>
        <input
          value={editorFilter}
          onChange={(event) => setEditorFilter(event.target.value)}
          placeholder="Buscar texto..."
        />
        <span className={draftIssues.length ? "issue-count warning" : "issue-count"}>
          {draftIssues.length} avisos
        </span>
      </div>
      <IssueSummary issues={draftIssues} />
      <div className="editor-grid">
        {visibleSegments.map(({ segment, index }) => (
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
        {!draftSegments.length && <EmptyState text="Ejecuta un job o carga un draft completado para editar subtitulos." />}
        {draftSegments.length > 0 && visibleSegments.length === 0 && <EmptyState text="No hay segmentos que coincidan con la busqueda." />}
      </div>
    </section>
  );
}

function ExportView({ selectedJob, config, setConfig, busyAction, exportJob, openBrowser }) {
  return (
    <section className="panel-grid">
      <div className="panel">
        <PanelHeader title="Exportacion" meta={selectedJob ? selectedJob.input_path : "Selecciona un job"} />
        <SelectInput
          label="Perfil"
          value={config?.export_profile || "youtube"}
          options={EXPORT_PROFILES}
          onChange={(value) => setConfig({ ...config, export_profile: value })}
        />
        <FormatSelector
          formats={config?.formats || ["srt"]}
          onChange={(formats) => setConfig({ ...config, formats })}
        />
        <PathInput
          label="Carpeta de salida"
          value={config?.output_dir || ""}
          onChange={(value) => setConfig({ ...config, output_dir: value })}
          onBrowse={() => openBrowser("outputDir", "directory", "Seleccionar carpeta de salida", config?.output_dir)}
        />
        <button disabled={!selectedJob || Boolean(busyAction)} onClick={exportJob}>
          {busyAction === "export-job" ? "Exportando..." : "Exportar job"}
        </button>
      </div>
      <div className="panel">
        <PanelHeader title="Archivos generados" meta={`${selectedJob?.output_files?.length || 0} archivos`} />
        <OutputList files={selectedJob?.output_files || []} />
      </div>
    </section>
  );
}

function SettingsView({
  config,
  setConfig,
  providers,
  providersByTask,
  secrets,
  doctor,
  applyPreset,
  saveConfig,
  setSecret,
  openBrowser,
}) {
  return (
    <section className="settings-grid">
      <div className="panel">
        <PanelHeader title="Presets" meta="Inicio rapido" />
        {CONFIG_PRESETS.map((preset) => (
          <button key={preset} onClick={() => applyPreset(preset)}>
            {preset}
          </button>
        ))}
      </div>
      <div className="panel">
        <PanelHeader title="Providers" meta="Model provider-ready" />
        <ProviderSelect
          label="Transcripcion"
          value={config.transcription_provider}
          providers={providersByTask.transcription}
          onChange={(value) => setConfig({ ...config, transcription_provider: value })}
        />
        <ConfigInput
          label="Modelo transcripcion"
          value={config.transcription_model || ""}
          onChange={(value) => setConfig({ ...config, transcription_model: value || null })}
        />
        <ProviderSelect
          label="Fallback transcripcion"
          value={config.transcription_fallback_provider || ""}
          providers={providersByTask.transcription}
          includeNone
          onChange={(value) => setConfig({ ...config, transcription_fallback_provider: value || null })}
        />
        <ProviderSelect
          label="Traduccion"
          value={config.translation_provider}
          providers={providersByTask.translation}
          onChange={(value) => setConfig({ ...config, translation_provider: value })}
        />
        <ConfigInput
          label="Modelo traduccion"
          value={config.translation_model || ""}
          onChange={(value) => setConfig({ ...config, translation_model: value || null })}
        />
        <ProviderSelect
          label="Fallback traduccion"
          value={config.translation_fallback_provider || ""}
          providers={providersByTask.translation}
          includeNone
          onChange={(value) => setConfig({ ...config, translation_fallback_provider: value || null })}
        />
        <SelectInput
          label="Perfil exportacion"
          value={config.export_profile}
          options={EXPORT_PROFILES}
          onChange={(value) => setConfig({ ...config, export_profile: value })}
        />
        <FormatSelector
          formats={config.formats || ["srt"]}
          onChange={(formats) => setConfig({ ...config, formats })}
        />
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={Boolean(config.translation_cache_enabled)}
            onChange={(event) =>
              setConfig({ ...config, translation_cache_enabled: event.target.checked })
            }
          />
          Cache de traduccion
        </label>
        <PathInput
          label="Glosario JSON"
          value={config.translation_glossary_path || ""}
          onChange={(value) => setConfig({ ...config, translation_glossary_path: value || null })}
          onBrowse={() => openBrowser("glossaryPath", "json", "Seleccionar glosario JSON", config.translation_glossary_path)}
        />
        <button onClick={saveConfig}>Guardar configuracion</button>
      </div>
      <div className="panel">
        <PanelHeader title="API keys" meta="Solo proceso local" />
        {Object.entries(secrets?.keys || {}).map(([envVar, info]) => (
          <div className="secret-row" key={envVar}>
            <span>{envVar}</span>
            <strong>{info.configured ? info.preview : "sin configurar"}</strong>
            <button onClick={() => setSecret(envVar)}>Configurar</button>
          </div>
        ))}
      </div>
      <div className="panel">
        <PanelHeader title="Doctor" meta="Acciones recomendadas" />
        <div className="check-list">
          {(doctor?.checks || []).slice(0, 18).map((check) => (
            <div className={`check check-${check.status}`} key={check.name}>
              <span>{check.name}</span>
              <small>{check.message}</small>
              {check.action_hint && <small>{check.action_hint}</small>}
            </div>
          ))}
        </div>
      </div>
      <div className="panel provider-panel">
        <PanelHeader title="Providers disponibles" meta={`${providers.length} registrados`} />
        {providers.map((provider) => (
          <ProviderBadge provider={provider} key={`${provider.task}-${provider.name}`} />
        ))}
      </div>
    </section>
  );
}

function HistoryView({ recentProjects, openProject, setProjectPath }) {
  if (!recentProjects.length) {
    return <EmptyState text="Todavia no hay proyectos recientes. Crea o abre uno desde Flow." />;
  }
  return (
    <section className="stack">
      {recentProjects.map((item) => (
        <div className="history-row" key={item.path}>
          <div>
            <strong>{item.name}</strong>
            <small>{item.path}</small>
            <small>{item.lastOpened}</small>
          </div>
          <button
            onClick={() => {
              setProjectPath(item.path);
              openProject(item.path);
            }}
          >
            Abrir
          </button>
        </div>
      ))}
    </section>
  );
}

function FileBrowser({ browser, busyAction, browseTo, selectPath, close }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2>{browser.title}</h2>
            <p>{browser.path}</p>
          </div>
          <button onClick={close}>Cerrar</button>
        </div>
        <div className="browser-actions">
          <button disabled={!browser.parent || Boolean(busyAction)} onClick={() => browseTo(browser.parent)}>
            Subir
          </button>
          <button disabled={Boolean(busyAction)} onClick={() => browseTo(browser.home)}>
            Home
          </button>
          <button disabled={Boolean(busyAction)} onClick={() => browseTo(browser.cwd)}>
            Repo
          </button>
          {browser.mode === "directory" && (
            <button onClick={() => selectPath(browser.path)}>
              Seleccionar carpeta actual
            </button>
          )}
        </div>
        <div className="root-list">
          {browser.roots.map((root) => (
            <button key={root} onClick={() => browseTo(root)}>
              {root}
            </button>
          ))}
        </div>
        <div className="browser-list">
          {browser.entries.map((entry) => (
            <div className="browser-row" key={entry.path}>
              <button
                className="browser-name"
                disabled={!entry.is_dir}
                onClick={() => browseTo(entry.path)}
              >
                {entry.is_dir ? "Dir" : "File"} {entry.name}
              </button>
              <button disabled={!entry.selectable} onClick={() => selectPath(entry.path)}>
                Usar
              </button>
            </div>
          ))}
          {!browser.entries.length && <EmptyState text="No hay elementos accesibles en esta carpeta." />}
        </div>
      </div>
    </div>
  );
}

function JobList({ jobs, selectedJobId, onSelect }) {
  if (!jobs.length) {
    return <EmptyState text="No hay jobs. Selecciona un video o audio para empezar." />;
  }
  return (
    <div className="job-list">
      {jobs.map((job) => (
        <button
          key={job.id}
          className={selectedJobId === job.id ? "job-item selected" : "job-item"}
          onClick={() => onSelect(job.id)}
        >
          <span className={`job-status ${job.status}`}>{job.status}</span>
          <strong>{basename(job.input_path)}</strong>
          <small>{job.source_lang} to {job.target_lang}</small>
          {job.error && <small>{job.error}</small>}
        </button>
      ))}
    </div>
  );
}

function EventTimeline({ events, selectedJob }) {
  const items = events.length
    ? events
    : selectedJob
      ? [{ stage: "job", status: selectedJob.status, message: `Estado actual: ${selectedJob.status}` }]
      : [];
  if (!items.length) {
    return <EmptyState text="Al ejecutar un job se mostraran aqui las etapas del pipeline." />;
  }
  return (
    <div className="event-list">
      {items.map((event, index) => (
        <div className="event-row" key={`${event.stage}-${index}`}>
          <span className={`event-dot event-${event.status}`} />
          <div>
            <strong>{event.stage}</strong>
            <small>{event.message}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProviderRouteSummary({ config }) {
  if (!config) {
    return <EmptyState text="Carga la configuracion para ver la ruta de providers." />;
  }
  return (
    <div className="route-summary">
      <span>Transcripcion: {config.transcription_provider}</span>
      {config.transcription_fallback_provider && <span>Fallback: {config.transcription_fallback_provider}</span>}
      <span>Traduccion: {config.translation_provider}</span>
      {config.translation_fallback_provider && <span>Fallback: {config.translation_fallback_provider}</span>}
    </div>
  );
}

function IssueSummary({ issues }) {
  if (!issues.length) {
    return null;
  }
  const counts = issues.reduce((acc, issue) => {
    acc[issue.code] = (acc[issue.code] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="issue-panel">
      {Object.entries(counts).map(([code, count]) => (
        <span key={code}>{code}: {count}</span>
      ))}
    </div>
  );
}

function OutputList({ files }) {
  if (!files.length) {
    return <EmptyState text="Aun no hay archivos exportados." />;
  }
  return (
    <ul className="file-list">
      {files.map((file) => (
        <li key={file}>{file}</li>
      ))}
    </ul>
  );
}

function ProviderBadge({ provider }) {
  return (
    <span title={provider.notes || provider.name}>
      {provider.task}: {provider.name} · {provider.privacy_level}
      {provider.requires_api_key ? ` · ${provider.api_key_env_var}` : ""}
    </span>
  );
}

function PanelHeader({ title, meta }) {
  return (
    <div className="panel-header">
      <h2>{title}</h2>
      {meta && <small>{meta}</small>}
    </div>
  );
}

function PathInput({ label, value, onChange, onBrowse }) {
  return (
    <label className="config-input">
      <span>{label}</span>
      <div className="path-row">
        <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
        <button type="button" onClick={onBrowse}>Buscar</button>
      </div>
    </label>
  );
}

function ConfigInput({ label, value, onChange }) {
  return (
    <label className="config-input">
      <span>{label}</span>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }) {
  return (
    <label className="config-input">
      <span>{label}</span>
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option || "ninguno"}</option>
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

function FormatSelector({ formats, onChange }) {
  const active = formats || [];
  return (
    <div className="format-selector">
      {FORMATS.map((format) => (
        <label className="checkbox-row" key={format}>
          <input
            type="checkbox"
            checked={active.includes(format)}
            onChange={(event) => {
              const next = event.target.checked
                ? [...new Set([...active, format])]
                : active.filter((item) => item !== format);
              onChange(next.length ? next : ["srt"]);
            }}
          />
          {format}
        </label>
      ))}
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

function buildReadiness({ backendStatus, config, project, selectedJob, draftSegments, doctorSummary }) {
  return [
    {
      label: "Sistema",
      state: backendStatus === "online" && doctorSummary.failures === 0 ? "done" : "needs-action",
      detail: backendStatus === "online" ? `${doctorSummary.warnings} avisos` : "Backend offline",
    },
    {
      label: "Configuracion",
      state: config ? "done" : "pending",
      detail: config ? `${config.export_profile} · ${config.formats?.join(", ")}` : "Carga Settings",
    },
    {
      label: "Proyecto",
      state: project ? "done" : "pending",
      detail: project ? `${project.jobs.length} jobs` : "Crea o abre uno",
    },
    {
      label: "Job",
      state: selectedJob ? "done" : "pending",
      detail: selectedJob ? selectedJob.status : "Añade archivo",
    },
    {
      label: "Revision",
      state: draftSegments.length || selectedJob?.subtitle_draft_path ? "done" : "pending",
      detail: draftSegments.length ? `${draftSegments.length} segmentos` : "Sin draft",
    },
    {
      label: "Exportacion",
      state: selectedJob?.output_files?.length ? "done" : "pending",
      detail: selectedJob?.output_files?.length ? `${selectedJob.output_files.length} archivos` : "Pendiente",
    },
  ];
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

function filterSegments(segments, query) {
  const normalized = query.trim().toLowerCase();
  return segments
    .map((segment, index) => ({ segment, index }))
    .filter(({ segment }) => {
      if (!normalized) return true;
      return `${segment.text} ${segment.translated}`.toLowerCase().includes(normalized);
    });
}

function readRecentProjects() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function rememberProject(path, name, setRecentProjects) {
  setRecentProjects((current) => {
    const next = [
      { path, name: name || basename(path), lastOpened: new Date().toLocaleString() },
      ...current.filter((item) => item.path !== path),
    ].slice(0, 8);
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next));
    return next;
  });
}

function basename(path) {
  return String(path || "").split(/[\\/]/).filter(Boolean).pop() || path;
}

function subtitleFor(tab) {
  const subtitles = {
    Flow: "Flujo guiado para configurar, procesar, revisar y exportar.",
    Editor: "Revision y correccion de subtitulos antes de exportar.",
    Export: "Perfiles y formatos finales para YouTube, revision o archivo.",
    Settings: "Providers, API keys, cache, glosario y diagnostico.",
    History: "Proyectos recientes para uso personal recurrente.",
  };
  return subtitles[tab] || "CaptionFlow";
}
