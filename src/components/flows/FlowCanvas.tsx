import { useState, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, Plus, Save, X, Trash2,
  HelpCircle, Zap, LayoutGrid, MessageSquare, GitBranch,
} from "lucide-react";
import type {
  ConversationFlow, FlowStep, StepType, FieldDef, ApiParam,
} from "../../lib/flowTypes";

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Step metadata ────────────────────────────────────────────────────────────

type StepMeta = { label: string; icon: React.ReactNode; bg: string; border: string; text: string; handle: string };

const STEP_META: Record<StepType, StepMeta> = {
  ask:     { label: "Ask User",     icon: <HelpCircle size={12} />,    bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700",   handle: "#3b82f6" },
  api:     { label: "Call API",     icon: <Zap size={12} />,           bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", handle: "#f97316" },
  widget:  { label: "Show Widget",  icon: <LayoutGrid size={12} />,    bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", handle: "#a855f7" },
  message: { label: "Send Message", icon: <MessageSquare size={12} />, bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  handle: "#22c55e" },
  branch:  { label: "Branch",       icon: <GitBranch size={12} />,     bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  handle: "#f59e0b" },
};

// ─── Custom node ──────────────────────────────────────────────────────────────

function StepNode({ data, selected }: NodeProps) {
  const step = data as unknown as FlowStep;
  const meta = STEP_META[step.type];

  return (
    <div className={`relative w-[210px] rounded-xl border-2 bg-white shadow-sm transition-shadow
      ${selected ? "border-[oklch(0.48_0.27_268)] shadow-lg ring-2 ring-[oklch(0.48_0.27_268)]/20" : meta.border}`}
    >
      {/* target handle */}
      <Handle
        type="target" position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-white"
        style={{ background: meta.handle }}
      />

      {/* header */}
      <div className={`flex items-center gap-1.5 rounded-t-xl px-3 py-1.5 ${meta.bg}`}>
        <span className={meta.text}>{meta.icon}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wide ${meta.text}`}>{meta.label}</span>
      </div>

      {/* body */}
      <div className="px-3 py-2.5">
        <div className="text-[13px] font-semibold leading-tight text-gray-900 line-clamp-1">{step.label}</div>
        {step.type === "ask" && step.question && (
          <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{step.question}</p>
        )}
        {step.type === "api" && (
          <p className="mt-1 font-mono text-[11px] text-gray-500 line-clamp-1">{step.apiEndpoint || step.apiName || "—"}</p>
        )}
        {step.type === "widget" && step.widgetType && (
          <p className="mt-1 text-[11px] text-gray-500">{step.widgetType}</p>
        )}
        {step.type === "branch" && step.condition && (
          <p className="mt-1 text-[11px] text-gray-500 line-clamp-1">{step.condition}</p>
        )}
        {step.type === "message" && step.messageTemplate && (
          <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{step.messageTemplate}</p>
        )}
      </div>

      {/* source handles */}
      {step.type === "branch" ? (
        <>
          <Handle type="source" position={Position.Right} id="yes"
            style={{ background: "#22c55e", top: "38%" }}
            className="!h-3 !w-3 !border-2 !border-white"
          />
          <Handle type="source" position={Position.Right} id="no"
            style={{ background: "#ef4444", top: "68%" }}
            className="!h-3 !w-3 !border-2 !border-white"
          />
          <div className="pointer-events-none absolute right-[-32px] text-[9px] font-bold text-green-600" style={{ top: "calc(38% - 7px)" }}>YES</div>
          <div className="pointer-events-none absolute right-[-28px] text-[9px] font-bold text-red-500" style={{ top: "calc(68% - 7px)" }}>NO</div>
        </>
      ) : (
        <Handle type="source" position={Position.Right}
          style={{ background: meta.handle }}
          className="!h-3 !w-3 !border-2 !border-white"
        />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { step: StepNode };

// ─── Edge factory ─────────────────────────────────────────────────────────────

function makeEdge(id: string, source: string, target: string, handle?: string): Edge {
  const yes = handle === "yes";
  const no  = handle === "no";
  const color = yes ? "#22c55e" : no ? "#ef4444" : "#94a3b8";
  return {
    id,
    source,
    sourceHandle: handle,
    target,
    label: yes ? "Yes" : no ? "No" : undefined,
    style: { strokeWidth: 2, stroke: color },
    markerEnd: { type: MarkerType.ArrowClosed, color },
    labelStyle: handle ? { fill: color, fontWeight: 700, fontSize: 11 } : undefined,
    labelBgStyle: handle ? { fill: "white", fillOpacity: 0.9, rx: 4 } : undefined,
  };
}

// ─── Conversions ──────────────────────────────────────────────────────────────

function stepsToNodes(steps: FlowStep[]): Node[] {
  return steps.map((step, i) => ({
    id: step.id,
    type: "step",
    position: step.position ?? { x: i * 290 + 60, y: 120 },
    data: { ...step } as unknown as Record<string, unknown>,
    draggable: true,
  }));
}

function stepsToEdges(steps: FlowStep[]): Edge[] {
  const edges: Edge[] = [];
  steps.forEach((step, i) => {
    if (step.type === "branch") {
      if (step.branchYes) edges.push(makeEdge(`${step.id}->yes->${step.branchYes}`, step.id, step.branchYes, "yes"));
      if (step.branchNo)  edges.push(makeEdge(`${step.id}->no->${step.branchNo}`,   step.id, step.branchNo,  "no"));
    } else {
      const nextId = step.nextStepId ?? steps[i + 1]?.id;
      if (nextId) edges.push(makeEdge(`${step.id}->${nextId}`, step.id, nextId));
    }
  });
  return edges;
}

function nodesToSteps(nodes: Node[], edges: Edge[], origSteps: FlowStep[]): FlowStep[] {
  const origMap = new Map(origSteps.map(s => [s.id, s]));
  const nextMap: Record<string, string> = {};
  const yesMap:  Record<string, string> = {};
  const noMap:   Record<string, string> = {};
  edges.forEach(e => {
    if (e.sourceHandle === "yes") yesMap[e.source] = e.target;
    else if (e.sourceHandle === "no") noMap[e.source] = e.target;
    else nextMap[e.source] = e.target;
  });
  return nodes.map(n => {
    const step = n.data as unknown as FlowStep;
    const orig = origMap.get(step.id) ?? step;
    return {
      ...orig, ...step,
      position: n.position,
      nextStepId: nextMap[step.id],
      branchYes:  yesMap[step.id],
      branchNo:   noMap[step.id],
    };
  });
}

// ─── Config panel ─────────────────────────────────────────────────────────────

function ConfigPanel({ step, onChange, onDelete, onClose }: {
  step: FlowStep;
  onChange: (s: FlowStep) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const u = (patch: Partial<FlowStep>) => onChange({ ...step, ...patch });

  const addField = () => u({ fields: [...(step.fields ?? []), { key: "", label: "", type: "text", required: false }] });
  const setField = (i: number, f: FieldDef) => u({ fields: (step.fields ?? []).map((x, j) => j === i ? f : x) });
  const delField = (i: number) => u({ fields: (step.fields ?? []).filter((_, j) => j !== i) });

  const addParam = () => u({ apiParams: [...(step.apiParams ?? []), { key: "", source: "user_input" as const }] });
  const setParam = (i: number, p: ApiParam) => u({ apiParams: (step.apiParams ?? []).map((x, j) => j === i ? p : x) });
  const delParam = (i: number) => u({ apiParams: (step.apiParams ?? []).filter((_, j) => j !== i) });

  const meta = STEP_META[step.type];

  return (
    <div className="flex h-full flex-col bg-background">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`${meta.text}`}>{meta.icon}</span>
          <span className="text-[13px] font-semibold text-foreground">{meta.label}</span>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-muted">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-3">
        {/* Type */}
        <div>
          <label className="label">Step type</label>
          <select className="input-base" value={step.type} onChange={e => u({ type: e.target.value as StepType })}>
            <option value="ask">Ask User</option>
            <option value="api">Call API</option>
            <option value="widget">Show Widget</option>
            <option value="message">Send Message</option>
            <option value="branch">Branch</option>
          </select>
        </div>

        {/* Label */}
        <div>
          <label className="label">Label</label>
          <input className="input-base" value={step.label} onChange={e => u({ label: e.target.value })} placeholder="Step name" />
        </div>

        {/* ── Ask ── */}
        {step.type === "ask" && <>
          <div>
            <label className="label">Question</label>
            <textarea className="input-base resize-none" rows={3} value={step.question ?? ""} onChange={e => u({ question: e.target.value })} placeholder="What to ask the user… Use {{field_key}} for dynamic values." />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0">Fields</label>
              <button type="button" className="btn-xs" onClick={addField}>+ Add field</button>
            </div>
            {(step.fields ?? []).map((f, i) => (
              <div key={i} className="mb-2 space-y-1.5 rounded-lg border border-border bg-muted/40 p-2">
                <div className="flex gap-1.5">
                  <input className="input-sm flex-1" placeholder="key" value={f.key} onChange={e => setField(i, { ...f, key: e.target.value })} />
                  <input className="input-sm flex-1" placeholder="label" value={f.label} onChange={e => setField(i, { ...f, label: e.target.value })} />
                  <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => delField(i)}><Trash2 size={12} /></button>
                </div>
                <div className="flex gap-1.5">
                  <select className="input-sm flex-1" value={f.type} onChange={e => setField(i, { ...f, type: e.target.value as FieldDef["type"] })}>
                    <option value="text">text</option>
                    <option value="number">number</option>
                    <option value="select">select</option>
                    <option value="date">date</option>
                  </select>
                  <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
                    <input type="checkbox" checked={f.required} onChange={e => setField(i, { ...f, required: e.target.checked })} /> required
                  </label>
                </div>
                {f.type === "select" && (
                  <input className="input-sm w-full" placeholder="Options, comma-separated" value={(f.options ?? []).join(", ")}
                    onChange={e => setField(i, { ...f, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                )}
                <input className="input-sm w-full" placeholder="Example hint" value={f.example ?? ""}
                  onChange={e => setField(i, { ...f, example: e.target.value })} />
              </div>
            ))}
          </div>
          <div>
            <label className="label">Skip if already collected (comma-separated keys)</label>
            <input className="input-base" placeholder="e.g. year, fuel_type" value={(step.skipIfPresent ?? []).join(", ")}
              onChange={e => u({ skipIfPresent: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
          </div>
          <div>
            <label className="label">API to call on completion</label>
            <select className="input-base" value={step.apiOnComplete ?? ""}
              onChange={e => u({ apiOnComplete: e.target.value || undefined })}>
              <option value="">None</option>
              <option value="send_otp">send_otp</option>
              <option value="verify_otp">verify_otp</option>
              <option value="price_estimate">price_estimate</option>
              <option value="book_inspection">book_inspection</option>
            </select>
          </div>
          {step.apiOnComplete && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">On success → step id</label>
                <input className="input-base" placeholder="step id" value={step.onSuccessStep ?? ""}
                  onChange={e => u({ onSuccessStep: e.target.value || undefined })} />
              </div>
              <div>
                <label className="label">On fail → step id</label>
                <input className="input-base" placeholder="step id (blank = retry)" value={step.onFailStep ?? ""}
                  onChange={e => u({ onFailStep: e.target.value || undefined })} />
              </div>
            </div>
          )}
          <div>
            <label className="label">Widget to show (optional)</label>
            <select className="input-base" value={step.widgetType ?? ""}
              onChange={e => u({ widgetType: e.target.value as FlowStep["widgetType"] || undefined })}>
              <option value="">None</option>
              <option value="otp_input">OTP Input</option>
            </select>
          </div>
        </>}

        {/* ── API ── */}
        {step.type === "api" && <>
          <div>
            <label className="label">API Name</label>
            <input className="input-base" value={step.apiName ?? ""} onChange={e => u({ apiName: e.target.value })} placeholder="price_estimate" />
          </div>
          <div>
            <label className="label">Endpoint</label>
            <input className="input-base font-mono text-[12px]" value={step.apiEndpoint ?? ""} onChange={e => u({ apiEndpoint: e.target.value })} placeholder="/api/endpoint" />
          </div>
          <div>
            <label className="label">Output key</label>
            <input className="input-base" value={step.apiOutputKey ?? ""} onChange={e => u({ apiOutputKey: e.target.value })} placeholder="result_key" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0">Parameters</label>
              <button type="button" className="btn-xs" onClick={addParam}>+ Add param</button>
            </div>
            {(step.apiParams ?? []).map((p, i) => (
              <div key={i} className="mb-2 space-y-1.5 rounded-lg border border-border bg-muted/40 p-2">
                <div className="flex gap-1.5">
                  <input className="input-sm flex-1" placeholder="param key" value={p.key} onChange={e => setParam(i, { ...p, key: e.target.value })} />
                  <select className="input-sm" value={p.source} onChange={e => setParam(i, { ...p, source: e.target.value as ApiParam["source"] })}>
                    <option value="user_input">user_input</option>
                    <option value="step_output">step_output</option>
                    <option value="hardcoded">hardcoded</option>
                  </select>
                  <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => delParam(i)}><Trash2 size={12} /></button>
                </div>
                {p.source === "user_input"  && <input className="input-sm w-full" placeholder="field key" value={p.fieldKey ?? ""} onChange={e => setParam(i, { ...p, fieldKey: e.target.value })} />}
                {p.source === "step_output" && <div className="flex gap-1.5">
                  <input className="input-sm flex-1" placeholder="step ID" value={p.stepId ?? ""} onChange={e => setParam(i, { ...p, stepId: e.target.value })} />
                  <input className="input-sm flex-1" placeholder="output key" value={p.outputKey ?? ""} onChange={e => setParam(i, { ...p, outputKey: e.target.value })} />
                </div>}
                {p.source === "hardcoded"   && <input className="input-sm w-full" placeholder="value" value={p.value ?? ""} onChange={e => setParam(i, { ...p, value: e.target.value })} />}
              </div>
            ))}
          </div>
        </>}

        {/* ── Widget ── */}
        {step.type === "widget" && <>
          <div>
            <label className="label">Widget type</label>
            <select className="input-base" value={step.widgetType ?? ""} onChange={e => u({ widgetType: e.target.value as FlowStep["widgetType"] })}>
              <option value="">Select…</option>
              <option value="price_estimate">Price Estimate</option>
              <option value="emi_calculator">EMI Calculator</option>
              <option value="car_cards">Car Cards</option>
              <option value="slot_picker">Slot Picker</option>
              <option value="otp_input">OTP Input</option>
              <option value="booking_calendar">Booking Calendar</option>
              <option value="confirmation">Confirmation</option>
            </select>
          </div>
          <div>
            <label className="label">Data from step ID</label>
            <input className="input-base" value={step.widgetDataStep ?? ""} onChange={e => u({ widgetDataStep: e.target.value })} placeholder="step ID whose output feeds this widget" />
          </div>
          <div>
            <label className="label">Question / prompt (if also collecting input)</label>
            <textarea className="input-base resize-none" rows={2} value={step.question ?? ""} onChange={e => u({ question: e.target.value })} placeholder="Use {{field_key}} for dynamic values" />
          </div>
          {(step.fields ?? []).length > 0 || true ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="label mb-0">Fields to collect (optional)</label>
                <button type="button" className="btn-xs" onClick={addField}>+ Add field</button>
              </div>
              {(step.fields ?? []).map((f, i) => (
                <div key={i} className="mb-2 space-y-1.5 rounded-lg border border-border bg-muted/40 p-2">
                  <div className="flex gap-1.5">
                    <input className="input-sm flex-1" placeholder="key" value={f.key} onChange={e => setField(i, { ...f, key: e.target.value })} />
                    <input className="input-sm flex-1" placeholder="label" value={f.label} onChange={e => setField(i, { ...f, label: e.target.value })} />
                    <button type="button" className="p-1 text-muted-foreground hover:text-destructive" onClick={() => delField(i)}><Trash2 size={12} /></button>
                  </div>
                  <div className="flex gap-1.5">
                    <select className="input-sm flex-1" value={f.type} onChange={e => setField(i, { ...f, type: e.target.value as FieldDef["type"] })}>
                      <option value="text">text</option>
                      <option value="number">number</option>
                      <option value="select">select</option>
                      <option value="date">date</option>
                    </select>
                    <label className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground">
                      <input type="checkbox" checked={f.required} onChange={e => setField(i, { ...f, required: e.target.checked })} /> required
                    </label>
                  </div>
                  {f.type === "select" && (
                    <input className="input-sm w-full" placeholder="Options, comma-separated" value={(f.options ?? []).join(", ")}
                      onChange={e => setField(i, { ...f, options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} />
                  )}
                </div>
              ))}
              {(step.fields ?? []).length > 0 && (
                <div>
                  <label className="label">Branch condition (field key or "key == 'value'")</label>
                  <input className="input-base" value={step.condition ?? ""} onChange={e => u({ condition: e.target.value })} placeholder="e.g. wants_inspection" />
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <input className="input-sm" placeholder="Yes → step id" value={step.branchYes ?? ""} onChange={e => u({ branchYes: e.target.value || undefined })} />
                    <input className="input-sm" placeholder="No → step id" value={step.branchNo ?? ""} onChange={e => u({ branchNo: e.target.value || undefined })} />
                  </div>
                </div>
              )}
            </div>
          ) : null}
          <div>
            <label className="label">Follow-up chips (comma-separated)</label>
            <input className="input-base" value={(step.followUpChips ?? []).join(", ")}
              onChange={e => u({ followUpChips: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
              placeholder="Book inspection, What next?" />
          </div>
        </>}

        {/* ── Message ── */}
        {step.type === "message" && (
          <div>
            <label className="label">Message template</label>
            <textarea className="input-base resize-none" rows={4} value={step.messageTemplate ?? ""}
              onChange={e => u({ messageTemplate: e.target.value })} placeholder="Use {{field_key}} to reference collected data" />
          </div>
        )}

        {/* ── Branch ── */}
        {step.type === "branch" && (
          <div>
            <label className="label">Condition</label>
            <input className="input-base" value={step.condition ?? ""} onChange={e => u({ condition: e.target.value })} placeholder="e.g. wants_inspection == 'Yes'" />
            <p className="mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              Connect the <strong>YES</strong> and <strong>NO</strong> handles on the canvas to target steps
            </p>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="label">Internal notes</label>
          <textarea className="input-base resize-none" rows={2} value={step.notes ?? ""} onChange={e => u({ notes: e.target.value })} placeholder="Developer notes…" />
        </div>
      </div>

      {/* footer */}
      <div className="border-t border-border p-3">
        <button type="button" onClick={onDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-destructive transition-colors hover:bg-destructive/10">
          <Trash2 size={12} /> Delete step
        </button>
      </div>
    </div>
  );
}

// ─── Flow Canvas ──────────────────────────────────────────────────────────────

export function FlowCanvas({ flow, onSave, onBack }: {
  flow: ConversationFlow;
  onSave: (updated: ConversationFlow) => void;
  onBack: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [nodes, setNodes, onNodesChange] = useNodesState(stepsToNodes(flow.steps));
  const [edges, setEdges, onEdgesChange] = useEdgesState(stepsToEdges(flow.steps));
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu]   = useState(false);
  const [meta, setMeta] = useState({
    name: flow.name, status: flow.status, icon: flow.icon,
    description: flow.description, triggers: flow.triggers,
    apiDependencies: flow.apiDependencies, dependencies: flow.dependencies,
  });

  const selectedNode = nodes.find(n => n.id === selectedId);
  const selectedStep = selectedNode ? (selectedNode.data as unknown as FlowStep) : null;

  const onConnect = useCallback((params: Connection) => {
    setEdges(eds => addEdge(makeEdge(
      `${params.source}-${params.sourceHandle ?? "out"}->${params.target}`,
      params.source!, params.target!, params.sourceHandle ?? undefined,
    ), eds));
  }, [setEdges]);

  const handleStepChange = useCallback((updated: FlowStep) => {
    setNodes(nds => nds.map(n =>
      n.id === updated.id ? { ...n, data: { ...updated } as unknown as Record<string, unknown> } : n
    ));
  }, [setNodes]);

  const addStep = (type: StepType) => {
    const id = uid();
    const newStep: FlowStep = { id, type, label: `New ${STEP_META[type].label}` };
    const x = nodes.reduce((max, n) => Math.max(max, n.position.x), 60) + 290;
    setNodes(nds => [...nds, {
      id, type: "step",
      position: { x, y: 120 },
      data: { ...newStep } as unknown as Record<string, unknown>,
    }]);
    setSelectedId(id);
    setShowAddMenu(false);
  };

  const deleteStep = (id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedId(null);
  };

  const handleSave = () => {
    const steps = nodesToSteps(nodes, edges, flow.steps);
    onSave({ ...flow, ...meta, steps, updatedAt: Date.now() });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-background px-4 py-2.5">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> All flows
          </button>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <span className="text-xl">{meta.icon}</span>
            <input
              className="w-[180px] rounded bg-transparent px-1 text-[15px] font-semibold text-foreground outline-none hover:bg-muted focus:bg-muted"
              value={meta.name}
              onChange={e => setMeta(m => ({ ...m, name: e.target.value }))}
            />
            <select
              className="rounded-full border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
              value={meta.status}
              onChange={e => setMeta(m => ({ ...m, status: e.target.value as ConversationFlow["status"] }))}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button type="button" onClick={() => setShowAddMenu(v => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] hover:bg-muted">
              <Plus size={13} /> Add step
            </button>
            {showAddMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border border-border bg-background py-1 shadow-lg">
                {(Object.keys(STEP_META) as StepType[]).map(t => (
                  <button key={t} type="button" onClick={() => addStep(t)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] hover:bg-muted ${STEP_META[t].text}`}>
                    {STEP_META[t].icon}
                    {STEP_META[t].label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg bg-[oklch(0.48_0.27_268)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90">
            <Save size={13} /> Save
          </button>
        </div>
      </div>

      {/* Canvas + panel */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 min-w-0">
          {mounted ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              onPaneClick={() => { setSelectedId(null); setShowAddMenu(false); }}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              minZoom={0.2}
              maxZoom={2}
              deleteKeyCode="Delete"
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
              <Controls showInteractive={false} />
            </ReactFlow>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Loading canvas…
            </div>
          )}
        </div>

        {/* Config panel */}
        {selectedStep && (
          <div className="w-[300px] shrink-0 border-l border-border overflow-hidden">
            <ConfigPanel
              step={selectedStep}
              onChange={handleStepChange}
              onDelete={() => deleteStep(selectedStep.id)}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
