import { useState, useEffect } from "react";
import { Plus, ChevronDown, ChevronUp, Trash2, GripVertical, ArrowRight, Zap, MessageSquare, GitBranch, LayoutGrid, HelpCircle, Save, ArrowLeft, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { ConversationFlow, FlowStep, StepType, FieldDef, ApiParam } from "../../lib/flowTypes";
import { SEED_FLOWS } from "../../lib/flowTypes";
import { FlowCanvas } from "./FlowCanvas";
import { loadFlowsFn, saveFlowsFn } from "../../lib/flowServerFn";

const FLOWS_KEY = "cars24_flows";

function loadFlowsLocal(): ConversationFlow[] {
  if (typeof window === "undefined") return SEED_FLOWS;
  try {
    const raw = localStorage.getItem(FLOWS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SEED_FLOWS;
}

function saveFlowsLocal(flows: ConversationFlow[]) {
  try { localStorage.setItem(FLOWS_KEY, JSON.stringify(flows)); } catch {}
}

async function persistFlows(flows: ConversationFlow[]) {
  saveFlowsLocal(flows);
  try { await saveFlowsFn({ data: flows }); } catch {}
}

const uuid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const STEP_META: Record<StepType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  ask:     { label: "Ask User",     icon: <HelpCircle size={14} />,    color: "text-blue-600",   bg: "bg-blue-50 border-blue-200" },
  api:     { label: "Call API",     icon: <Zap size={14} />,           color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  widget:  { label: "Show Widget",  icon: <LayoutGrid size={14} />,    color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  message: { label: "Send Message", icon: <MessageSquare size={14} />, color: "text-green-600",  bg: "bg-green-50 border-green-200" },
  branch:  { label: "Branch",       icon: <GitBranch size={14} />,     color: "text-red-600",    bg: "bg-red-50 border-red-200" },
};

const STATUS_META = {
  active:   { label: "Active",   icon: <CheckCircle2 size={12} />, color: "text-green-600 bg-green-50 border-green-200" },
  draft:    { label: "Draft",    icon: <Clock size={12} />,        color: "text-amber-600 bg-amber-50 border-amber-200" },
  archived: { label: "Archived", icon: <AlertCircle size={12} />,  color: "text-gray-500 bg-gray-50 border-gray-200" },
};

// ─── Step Editor ─────────────────────────────────────────────────────────────

function FieldRow({ field, onChange, onDelete }: {
  field: FieldDef;
  onChange: (f: FieldDef) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 items-start rounded-lg border border-border bg-background p-2.5">
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
        <input className="input-sm" placeholder="key (e.g. car_name)" value={field.key}
          onChange={e => onChange({ ...field, key: e.target.value })} />
        <input className="input-sm" placeholder="Label" value={field.label}
          onChange={e => onChange({ ...field, label: e.target.value })} />
        <select className="input-sm" value={field.type}
          onChange={e => onChange({ ...field, type: e.target.value as FieldDef["type"] })}>
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="select">Select</option>
          <option value="date">Date</option>
        </select>
        <input className="input-sm" placeholder="Example hint" value={field.example ?? ""}
          onChange={e => onChange({ ...field, example: e.target.value })} />
      </div>
      <label className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
        <input type="checkbox" checked={field.required}
          onChange={e => onChange({ ...field, required: e.target.checked })} />
        Required
      </label>
      <button type="button" onClick={onDelete} className="mt-1 text-muted-foreground hover:text-destructive">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function ApiParamRow({ param, onChange, onDelete }: {
  param: ApiParam;
  onChange: (p: ApiParam) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-2 items-center rounded-lg border border-border bg-background p-2.5">
      <input className="input-sm w-28" placeholder="param key" value={param.key}
        onChange={e => onChange({ ...param, key: e.target.value })} />
      <select className="input-sm w-32" value={param.source}
        onChange={e => onChange({ ...param, source: e.target.value as ApiParam["source"] })}>
        <option value="user_input">User Input</option>
        <option value="step_output">Step Output</option>
        <option value="hardcoded">Hardcoded</option>
      </select>
      {param.source === "user_input" && (
        <input className="input-sm flex-1" placeholder="field key" value={param.fieldKey ?? ""}
          onChange={e => onChange({ ...param, fieldKey: e.target.value })} />
      )}
      {param.source === "step_output" && (
        <>
          <input className="input-sm flex-1" placeholder="step id" value={param.stepId ?? ""}
            onChange={e => onChange({ ...param, stepId: e.target.value })} />
          <input className="input-sm flex-1" placeholder="output key" value={param.outputKey ?? ""}
            onChange={e => onChange({ ...param, outputKey: e.target.value })} />
        </>
      )}
      {param.source === "hardcoded" && (
        <input className="input-sm flex-1" placeholder="value" value={param.value ?? ""}
          onChange={e => onChange({ ...param, value: e.target.value })} />
      )}
      <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function StepCard({ step, index, total, onChange, onDelete, onMove }: {
  step: FlowStep;
  index: number;
  total: number;
  onChange: (s: FlowStep) => void;
  onDelete: () => void;
  onMove: (dir: "up" | "down") => void;
}) {
  const [open, setOpen] = useState(false);
  const meta = STEP_META[step.type];

  return (
    <div className={`rounded-xl border ${open ? "border-foreground/20 shadow-sm" : "border-border"} bg-card overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <button type="button" onClick={() => onMove("up")} disabled={index === 0}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20">
            <ChevronUp size={12} />
          </button>
          <button type="button" onClick={() => onMove("down")} disabled={index === total - 1}
            className="text-muted-foreground hover:text-foreground disabled:opacity-20">
            <ChevronDown size={12} />
          </button>
        </div>

        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
          {index + 1}
        </span>

        <span className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.bg} ${meta.color}`}>
          {meta.icon} {meta.label}
        </span>

        <input
          className="flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="Step name…"
          value={step.label}
          onChange={e => onChange({ ...step, label: e.target.value })}
        />

        <button type="button" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 size={14} />
        </button>
        <button type="button" onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="border-t border-border px-4 py-4 space-y-4">
          {/* Type selector */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(STEP_META) as StepType[]).map(t => (
              <button key={t} type="button"
                onClick={() => onChange({ ...step, type: t })}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  step.type === t ? `${STEP_META[t].bg} ${STEP_META[t].color} border-current` : "border-border text-muted-foreground hover:border-foreground/30"
                }`}>
                {STEP_META[t].icon} {STEP_META[t].label}
              </button>
            ))}
          </div>

          {/* ASK fields */}
          {step.type === "ask" && (
            <div className="space-y-3">
              <div>
                <label className="label">Bot question / message</label>
                <textarea className="input-base h-16 resize-none" placeholder="What should the bot say to the user?"
                  value={step.question ?? ""} onChange={e => onChange({ ...step, question: e.target.value })} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0">Fields to collect</label>
                  <button type="button" className="btn-xs" onClick={() =>
                    onChange({ ...step, fields: [...(step.fields ?? []), { key: "", label: "", type: "text", required: false }] })}>
                    + Add field
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(step.fields ?? []).map((f, i) => (
                    <FieldRow key={i} field={f}
                      onChange={nf => { const arr = [...(step.fields ?? [])]; arr[i] = nf; onChange({ ...step, fields: arr }); }}
                      onDelete={() => { const arr = [...(step.fields ?? [])]; arr.splice(i, 1); onChange({ ...step, fields: arr }); }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API fields */}
          {step.type === "api" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">API Name</label>
                  <input className="input-base" placeholder="e.g. price_estimate"
                    value={step.apiName ?? ""} onChange={e => onChange({ ...step, apiName: e.target.value })} />
                </div>
                <div>
                  <label className="label">Endpoint</label>
                  <input className="input-base" placeholder="/api/price-estimate"
                    value={step.apiEndpoint ?? ""} onChange={e => onChange({ ...step, apiEndpoint: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Output stored as</label>
                <input className="input-base w-48" placeholder="e.g. price_estimate_result"
                  value={step.apiOutputKey ?? ""} onChange={e => onChange({ ...step, apiOutputKey: e.target.value })} />
              </div>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="label mb-0">Parameters</label>
                  <button type="button" className="btn-xs" onClick={() =>
                    onChange({ ...step, apiParams: [...(step.apiParams ?? []), { key: "", source: "user_input" }] })}>
                    + Add param
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(step.apiParams ?? []).map((p, i) => (
                    <ApiParamRow key={i} param={p}
                      onChange={np => { const arr = [...(step.apiParams ?? [])]; arr[i] = np; onChange({ ...step, apiParams: arr }); }}
                      onDelete={() => { const arr = [...(step.apiParams ?? [])]; arr.splice(i, 1); onChange({ ...step, apiParams: arr }); }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* WIDGET fields */}
          {step.type === "widget" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Widget Type</label>
                <select className="input-base" value={step.widgetType ?? ""}
                  onChange={e => onChange({ ...step, widgetType: e.target.value as FlowStep["widgetType"] })}>
                  <option value="">Select widget…</option>
                  <option value="price_estimate">Price Estimate</option>
                  <option value="emi_calculator">EMI Calculator</option>
                  <option value="car_cards">Car Cards</option>
                  <option value="slot_picker">Slot Picker</option>
                  <option value="otp_input">OTP Input</option>
                  <option value="booking_calendar">Booking Calendar</option>
                  <option value="confirmation">Confirmation Card</option>
                </select>
              </div>
              <div>
                <label className="label">Data from step (id)</label>
                <input className="input-base" placeholder="e.g. fetch_estimate"
                  value={step.widgetDataStep ?? ""} onChange={e => onChange({ ...step, widgetDataStep: e.target.value })} />
              </div>
            </div>
          )}

          {/* MESSAGE fields */}
          {step.type === "message" && (
            <div>
              <label className="label">Message (use {"{{field_key}}"} for dynamic values)</label>
              <textarea className="input-base h-20 resize-none"
                placeholder="e.g. Great! I've found {{car_name}} listings for you."
                value={step.messageTemplate ?? ""} onChange={e => onChange({ ...step, messageTemplate: e.target.value })} />
            </div>
          )}

          {/* BRANCH fields */}
          {step.type === "branch" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-3">
                <label className="label">Condition</label>
                <input className="input-base" placeholder="e.g. wants_inspection == 'Yes, book it'"
                  value={step.condition ?? ""} onChange={e => onChange({ ...step, condition: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="label">If true → step id</label>
                <input className="input-base" placeholder="step id"
                  value={step.branchYes ?? ""} onChange={e => onChange({ ...step, branchYes: e.target.value })} />
              </div>
              <div className="col-span-1">
                <label className="label">If false → step id</label>
                <input className="input-base" placeholder="step id"
                  value={step.branchNo ?? ""} onChange={e => onChange({ ...step, branchNo: e.target.value })} />
              </div>
            </div>
          )}

          {/* Follow-up chips (shared) */}
          <div>
            <label className="label">Follow-up chips (comma-separated)</label>
            <input className="input-base" placeholder="e.g. Book inspection, Improve price, Documents needed"
              value={(step.followUpChips ?? []).join(", ")}
              onChange={e => onChange({ ...step, followUpChips: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
          </div>

          {/* Notes */}
          <div>
            <label className="label">Internal notes</label>
            <input className="input-base" placeholder="Notes for the dev / AI about this step…"
              value={step.notes ?? ""} onChange={e => onChange({ ...step, notes: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Flow Editor ─────────────────────────────────────────────────────────────

function FlowEditor({ flow, onSave, onBack }: {
  flow: ConversationFlow;
  onSave: (f: ConversationFlow) => void;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<ConversationFlow>(flow);
  const [saved, setSaved] = useState(false);

  const update = (patch: Partial<ConversationFlow>) => {
    setDraft(d => ({ ...d, ...patch, updatedAt: Date.now() }));
    setSaved(false);
  };

  const updateStep = (i: number, step: FlowStep) => {
    const steps = [...draft.steps];
    steps[i] = step;
    update({ steps });
  };

  const addStep = () => {
    const newStep: FlowStep = { id: uuid(), type: "ask", label: "New step" };
    update({ steps: [...draft.steps, newStep] });
  };

  const deleteStep = (i: number) => {
    const steps = [...draft.steps];
    steps.splice(i, 1);
    update({ steps });
  };

  const moveStep = (i: number, dir: "up" | "down") => {
    const steps = [...draft.steps];
    const j = dir === "up" ? i - 1 : i + 1;
    [steps[i], steps[j]] = [steps[j], steps[i]];
    update({ steps });
  };

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ICONS = ["🚗", "💰", "🧮", "🛡️", "🔧", "📦", "⭐", "🏠", "📱", "💳"];

  return (
    <div className="flex h-full flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-6 py-3 flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
          <ArrowLeft size={15} /> All flows
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-[13px] font-medium">{draft.name || "Untitled flow"}</span>
        <div className="ml-auto flex items-center gap-2">
          <select className="input-sm w-28" value={draft.status}
            onChange={e => update({ status: e.target.value as ConversationFlow["status"] })}>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <button type="button" onClick={handleSave}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all ${
              saved ? "bg-green-500 text-white" : "bg-cars24-red text-cars24-red-foreground hover:opacity-90"
            }`}>
            <Save size={13} /> {saved ? "Saved!" : "Save flow"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">

          {/* Basic info */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">Flow Info</h2>
            <div className="grid grid-cols-[auto_1fr] gap-3 items-start">
              <div>
                <label className="label">Icon</label>
                <select className="input-base w-16 text-center text-lg" value={draft.icon}
                  onChange={e => update({ icon: e.target.value })}>
                  {ICONS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Flow Name</label>
                <input className="input-base" placeholder="e.g. Sell My Car"
                  value={draft.name} onChange={e => update({ name: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input-base h-14 resize-none"
                placeholder="What does this flow accomplish?"
                value={draft.description} onChange={e => update({ description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Trigger keywords (comma-separated)</label>
                <input className="input-base" placeholder="sell, selling, want to sell"
                  value={draft.triggers.join(", ")}
                  onChange={e => update({ triggers: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
              </div>
              <div>
                <label className="label">APIs / Services required</label>
                <input className="input-base" placeholder="price_estimate API, booking API"
                  value={draft.apiDependencies.join(", ")}
                  onChange={e => update({ apiDependencies: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
              </div>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Steps ({draft.steps.length})
              </h2>
              <button type="button" onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-[12px] text-muted-foreground hover:border-cars24-red hover:text-cars24-red transition-colors">
                <Plus size={13} /> Add step
              </button>
            </div>

            {draft.steps.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-[13px] text-muted-foreground">
                No steps yet — click "Add step" to build your flow
              </div>
            ) : (
              <div className="space-y-2">
                {draft.steps.map((step, i) => (
                  <div key={step.id} className="flex items-start gap-2">
                    <StepCard step={step} index={i} total={draft.steps.length}
                      onChange={s => updateStep(i, s)}
                      onDelete={() => deleteStep(i)}
                      onMove={dir => moveStep(i, dir)} />
                    {i < draft.steps.length - 1 && (
                      <div className="mt-3 flex w-6 items-center justify-center">
                        <ArrowRight size={14} className="text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Flow List ────────────────────────────────────────────────────────────────

function FlowListCard({ flow, onClick, onDelete }: {
  flow: ConversationFlow;
  onClick: () => void;
  onDelete: () => void;
}) {
  const statusMeta = STATUS_META[flow.status];
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => e.key === 'Enter' && onClick()}
      className="group relative w-full rounded-xl border border-border bg-card p-5 text-left hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer">
      <button type="button"
        onClick={e => { e.stopPropagation(); onDelete(); }}
        className="absolute right-3 top-3 hidden rounded-md p-1 text-muted-foreground hover:text-destructive group-hover:flex">
        <Trash2 size={14} />
      </button>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{flow.icon}</span>
        <div>
          <div className="text-[14px] font-semibold text-foreground">{flow.name}</div>
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${statusMeta.color}`}>
            {statusMeta.icon} {statusMeta.label}
          </span>
        </div>
      </div>

      <p className="mb-3 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">{flow.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {flow.triggers.slice(0, 4).map(t => (
          <span key={t} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">"{t}"</span>
        ))}
        {flow.triggers.length > 4 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">+{flow.triggers.length - 4}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{flow.steps.length} steps</span>
        <span className="flex items-center gap-1 text-cars24-red font-medium">
          Edit flow <ArrowRight size={11} />
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FlowsPage() {
  const [flows, setFlows] = useState<ConversationFlow[]>(loadFlowsLocal);
  const [selected, setSelected] = useState<string | null>(null);

  // Hydrate from server on mount (server is source of truth)
  useEffect(() => {
    loadFlowsFn().then(serverFlows => {
      if (serverFlows && serverFlows.length > 0) {
        setFlows(serverFlows);
        saveFlowsLocal(serverFlows);
      }
    }).catch(() => {});
  }, []);

  const selectedFlow = flows.find(f => f.id === selected);

  const saveFlow = (updated: ConversationFlow) => {
    setFlows(prev => {
      const next = prev.map(f => f.id === updated.id ? updated : f);
      persistFlows(next);
      return next;
    });
  };

  const addFlow = () => {
    const f: ConversationFlow = {
      id: uuid(),
      name: "New Flow",
      description: "",
      icon: "🚗",
      color: "blue",
      triggers: [],
      steps: [],
      dependencies: [],
      apiDependencies: [],
      status: "draft",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setFlows(prev => { const next = [...prev, f]; persistFlows(next); return next; });
    setSelected(f.id);
  };

  const deleteFlow = (id: string) => {
    setFlows(prev => { const next = prev.filter(f => f.id !== id); persistFlows(next); return next; });
    if (selected === id) setSelected(null);
  };

  if (selectedFlow) {
    return (
      <FlowCanvas
        flow={selectedFlow}
        onSave={saveFlow}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-bold text-foreground">Flow Builder</h1>
          <p className="text-[13px] text-muted-foreground">Define conversation flows, APIs, and step dependencies for each Cars24 product</p>
        </div>
        <button type="button" onClick={addFlow}
          className="flex items-center gap-1.5 rounded-lg bg-cars24-red px-4 py-2 text-[13px] font-medium text-cars24-red-foreground hover:opacity-90">
          <Plus size={14} /> New flow
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {flows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <LayoutGrid size={32} className="opacity-30" />
            <p className="text-[14px]">No flows yet. Create your first one.</p>
            <button type="button" onClick={addFlow}
              className="rounded-lg border border-dashed border-border px-4 py-2 text-[13px] hover:border-cars24-red hover:text-cars24-red">
              + New flow
            </button>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {flows.map(f => (
              <FlowListCard key={f.id} flow={f}
                onClick={() => setSelected(f.id)}
                onDelete={() => deleteFlow(f.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
