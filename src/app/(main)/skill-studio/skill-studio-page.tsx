"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Pencil, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { ConfirmDialog, useConfirm } from "./confirm-dialog";
import { listCustomers, type CustomerConfig } from "@/services/settings";
import {
  createSkill, deleteSkill, deleteSkillRun, generatePrompt, listSkillRuns, listSkills,
  startSkillRun, updateSkill, type Skill, type SkillRun, type SkillWrite,
} from "@/services/skills";
import { modeLabels, statusLabels, t } from "./skill-copy";

type SkillDraft = SkillWrite;

const emptyDraft: SkillDraft = {
  name: "", description: "", prompt: "", customerId: null,
  classifications: ["forecast", "confirmed"],
};
const tone = (status: string): "green" | "red" | "amber" => status === "succeeded" ? "green" : status === "failed" ? "red" : "amber";
const message = (error: unknown) => error instanceof Error ? error.message : "Request failed";

export function SkillStudioPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [runState, setRunState] = useState<{ skillId: string; items: SkillRun[] } | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [edited, setEdited] = useState<{ skillId: string; draft: SkillDraft } | null>(null);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const { confirm, dialogProps } = useConfirm();
  const selected = skills.find((skill) => skill.id === selectedId) ?? null;
  const promptEditing = editingPromptId === selectedId;
  const draft = selected
    ? edited?.skillId === selected.id ? edited.draft : {
      name: selected.name, description: selected.description ?? "", prompt: selected.prompt ?? "",
      customerId: selected.customerId, classifications: selected.classifications,
    }
    : emptyDraft;
  const runs = runState?.skillId === selectedId ? runState.items : [];
  const setDraft = (next: SkillDraft) => { if (selected) setEdited({ skillId: selected.id, draft: next }); };

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const refresh = useCallback(async () => {
    const data = await listSkills({ search: debouncedSearch, page });
    setSkills(data.items);
    setTotal(data.total);
    setSelectedId((id) => data.items.some((item) => item.id === id) ? id : data.items[0]?.id || "");
  }, [page, debouncedSearch]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API-backed initial state
  useEffect(() => { void refresh().catch((error) => toast.error(message(error))); void listCustomers().then(setCustomers); }, [refresh]);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    void listSkillRuns(selectedId).then((items) => {
      if (active) setRunState({ skillId: selectedId, items });
    }).catch((error) => { if (active) toast.error(message(error)); });
    return () => { active = false; };
  }, [selectedId]);
  async function action(key: string, work: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try { await work(); } catch (error) { toast.error(message(error)); } finally { setBusy(""); }
  }

  async function save() {
    if (!selected) return;
    if (!draft.name.trim() || draft.name.length > 120) { toast.error("名称必须为 1-120 个字符"); return; }
    if (draft.prompt.length > 30000) { toast.error("提示词不能超过 30000 个字符"); return; }
    await action("save", async () => {
      const result = await updateSkill(selected.id, draft);
      setSkills((items) => items.map((skill) => skill.id === result.id ? result : skill));
      setEdited((current) => current?.skillId === result.id ? null : current);
      toast.success(t.saved);
    });
  }

  async function run(mode: "test" | "formal") {
    if (!selected || !draft.customerId) return;
    await action(mode, async () => {
      const saved = await updateSkill(selected.id, draft);
      setSkills((items) => items.map((skill) => skill.id === saved.id ? saved : skill));
      setEdited((current) => current?.skillId === saved.id ? null : current);
      const created = await startSkillRun(saved.id, mode);
      router.push(`/skill-studio/runs/${created.id}`);
    });
  }

  const canRun = !!selected && !!draft.customerId && !!draft.prompt.trim() && draft.classifications.length > 0 && !busy;

  async function removeSkill(skill: Skill) {
    await action(`delete-skill-${skill.id}`, async () => {
      if (!await confirm({ title: t.deleteSkill, body: t.deleteSkillConfirm, variant: "destructive", confirmLabel: t.deleteSkill })) return;
      await deleteSkill(skill.id);
      if (edited?.skillId === skill.id) setEdited(null);
      if (selectedId === skill.id) setSelectedId("");
      await refresh();
    });
  }

  async function generate() {
    if (!selected || !draft.description.trim()) return;
    await action("generate", async () => {
      const prompt = await generatePrompt(selected.id, draft.description);
      setDraft({ ...draft, name: prompt.name, prompt: prompt.prompt });
      setEditingPromptId(null);
    });
  }

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
    <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
      <Link href="/orders" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[var(--forvia-blue)]"><ArrowLeft size={15}/>{t.backToOrders}</Link>
      <span className="text-[11px] text-slate-400">{t.title}</span>
    </div>
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(190px,2fr)_minmax(440px,6fr)_minmax(300px,4fr)] overflow-hidden max-[1050px]:grid-cols-[220px_1fr] max-[760px]:block max-[760px]:overflow-auto">
      <aside className="flex min-h-0 flex-col overflow-hidden border-r border-[var(--line)] max-[760px]:min-h-[360px]">
        <div className="flex-none p-3 pb-0">
          <div className="mb-3 flex items-center justify-between"><strong className="text-sm">{t.list}</strong><Button size="sm" variant="primary" disabled={!!busy} onClick={() => void action("create", async () => {
            const skill = await createSkill({ name: "Untitled correction", customerId: null, classifications: ["forecast", "confirmed"] });
            setSearch(""); setPage(1); setSkills((items) => [skill, ...items.filter((item) => item.id !== skill.id)].slice(0, 20)); setTotal((v) => v + 1); setEdited(null); setSelectedId(skill.id);
          })}><Plus size={14}/>{t.create}</Button></div>
          <div className="relative mb-3"><Search className="absolute left-2 top-2 h-4 w-4 text-slate-400"/><Input className="pl-8" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={t.searchPlaceholder}/></div>
        </div>
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {skills.map((skill) => <div key={skill.id} className={`group mb-1 flex items-center rounded-xl border transition-colors ${skill.id === selectedId ? "border-[var(--forvia-blue)] bg-[var(--forvia-blue-soft)]" : "border-transparent hover:bg-slate-50"}`}>
            <button onClick={() => { setEditingPromptId(null); setSelectedId(skill.id); }} className="min-w-0 flex-1 p-3 text-left">
              <span className="block truncate text-xs font-bold">{skill.name}</span>
              <small className="mt-2 block truncate text-[10px] text-slate-400">{customers.find((c) => c.id === skill.customerId)?.name ?? t.unboundCustomer}</small>
            </button>
            <Button size="icon-sm" variant="ghost" className={`mr-2 shrink-0 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 max-[760px]:opacity-100 ${skill.id === selectedId ? "text-red-600 opacity-100" : "text-slate-400 opacity-0"}`} aria-label={`${t.deleteSkill}: ${skill.name}`} title={t.deleteSkill} disabled={!!busy} onClick={() => void removeSkill(skill)}><Trash2 size={13}/></Button>
          </div>)}
        </div>
        <div className="flex flex-none items-center justify-between border-t border-[var(--line)] bg-white p-3 text-[10px] text-slate-500"><Button size="sm" disabled={page === 1} onClick={() => setPage((v) => v - 1)}>{t.prevPage}</Button><span>{page} / {Math.max(1, Math.ceil(total / 20))}</span><Button size="sm" disabled={page * 20 >= total} onClick={() => setPage((v) => v + 1)}>{t.nextPage}</Button></div>
      </aside>

      <section className="min-h-0 overflow-auto border-r border-[var(--line)] p-5 max-[760px]:border-b">
        {selected ? <>
          <div className="mb-4"><strong className="text-sm">{t.definition}</strong><p className="mt-1 text-[11px] text-slate-500">{t.definitionHint}</p></div>
          <fieldset disabled={!!busy} className="space-y-4 disabled:opacity-70">
            <label className="skill-field">{t.name}<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
            <div className="grid items-end gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label className="skill-field">{t.scope}<select className="skill-select" value={draft.customerId ?? ""} onChange={(event) => setDraft({ ...draft, customerId: event.target.value || null })}><option value="" disabled={selected.customerId !== null}>{t.unboundCustomer}</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
              <div className="orders-lane-tabs h-[34px]" aria-label={t.orderTypes}>{(["forecast", "confirmed"] as const).map((kind) => {
                const checked = draft.classifications.includes(kind);
                return <button key={kind} type="button" aria-pressed={checked} onClick={() => setDraft({ ...draft, classifications: checked ? draft.classifications.filter((v) => v !== kind) : [...draft.classifications, kind] })} className={`orders-lane-toggle ${kind === "confirmed" ? "firm" : "forecast"} ${checked ? "active" : ""}`}>{kind === "confirmed" ? t.confirmed : t.forecast}</button>;
              })}</div>
            </div>
            <label className="skill-field">{t.description}<span className="relative block"><Textarea className={!draft.prompt.trim() ? "pb-14" : ""} rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/>{!draft.prompt.trim() && <Button className="absolute bottom-3 right-3 shadow-sm" disabled={!draft.description.trim()} onClick={() => void generate()}><Sparkles size={14}/>{busy === "generate" ? t.generating : t.generate}</Button>}</span></label>
            {busy === "generate" ? <GenerationProgress/> : draft.prompt.trim() && <div className="skill-field">
              <span>{t.prompt}</span>
              <div className="relative min-h-64 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 shadow-inner">
                <div className="absolute right-3 top-3 z-10 flex gap-2">
                  <Button size="sm" className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800" onClick={() => setEditingPromptId(promptEditing ? null : selected.id)}><Pencil size={13}/>{promptEditing ? t.finishEditing : t.editPrompt}</Button>
                  <Button size="sm" className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800" disabled={!draft.description.trim()} onClick={() => void generate()}><Sparkles size={13}/>{t.generate}</Button>
                </div>
                {promptEditing ? <Textarea autoFocus aria-label={t.prompt} className="min-h-64 resize-y rounded-none border-0 bg-transparent px-4 pb-4 pt-14 font-mono text-xs leading-6 text-slate-100 focus:ring-0" rows={12} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}/> : <pre className="min-h-64 overflow-auto whitespace-pre-wrap break-words px-4 pb-4 pt-14 font-mono text-xs leading-6"><code>{draft.prompt}</code></pre>}
              </div>
            </div>}
            <div className="flex justify-end pt-2"><Button variant="primary" onClick={() => void save()}><Save size={14}/>{t.save}</Button></div>
          </fieldset>
        </> : <div className="grid h-full place-items-center text-sm text-slate-400">{t.noSkills}</div>}
      </section>

      <aside className="flex min-h-0 flex-col overflow-hidden p-4 max-[1050px]:col-span-2 max-[1050px]:max-h-[360px] max-[1050px]:border-t">
        <div className="flex flex-none items-center justify-between"><strong className="text-sm">{t.runHistory}</strong>{selected && <div className="flex gap-2"><Button disabled={!canRun} onClick={() => void run("test")}>{busy === "test" && <LoaderCircle className="animate-spin" size={14}/>}{t.newTestRun}</Button><Button variant="primary" disabled={!canRun} onClick={() => void run("formal")}>{busy === "formal" && <LoaderCircle className="animate-spin" size={14}/>}{t.newFormalRun}</Button></div>}</div>
        {selected && <div className="mt-4 flex min-h-0 flex-1 flex-col"><p className="mb-3 flex-none text-[11px] leading-5 text-slate-500">{t.runHistoryHint}</p><div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--line)]">{runs.map((runItem) => <div key={runItem.id} className="flex items-center border-b border-[var(--line)] px-1 py-1 last:border-b-0">
          <button onClick={() => router.push(`/skill-studio/runs/${runItem.id}`)} className="flex min-w-0 flex-1 items-center justify-between py-2 pr-2 text-left text-[11px]"><span className="min-w-0"><strong className="block text-xs text-[var(--ink)]">{modeLabels[runItem.mode]}</strong><small className="block truncate text-slate-500">{runItem.inputCellCount ? t.cellsLabel(runItem.inputCellCount) : t.pendingData} · {runItem.createdAt ? new Date(runItem.createdAt).toLocaleString() : "—"}</small></span><Badge variant={tone(runItem.status)}>{statusLabels[runItem.status]}</Badge></button>
          {!runItem.mergeBatches.length && <Button size="icon-sm" variant="ghost" aria-label={t.deleteRun} title={t.deleteRun} disabled={!!busy} onClick={() => void action(`delete-run-${runItem.id}`, async () => { if (!await confirm({ title: t.deleteRun, body: t.deleteRunConfirm, variant: "destructive", confirmLabel: t.deleteRun })) return; await deleteSkillRun(runItem.id); setRunState((state) => state?.skillId === selectedId ? { ...state, items: state.items.filter((item) => item.id !== runItem.id) } : state); toast.success(t.runDeleted); })}><Trash2 size={13}/></Button>}
        </div>)}{!runs.length && <div className="p-6 text-center text-xs text-slate-400">{t.noRuns}</div>}</div></div>}
      </aside>
    </div>
    <ConfirmDialog {...dialogProps} />
  </div>;
}

function GenerationProgress() {
  const steps = t.generationSteps;
  const [phase, setPhase] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setPhase((cur) => Math.min(cur + 1, steps.length - 1)), 2400); return () => window.clearInterval(timer); }, [steps.length]);
  return <div className="min-h-64 rounded-xl border border-[var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)] p-5" role="status" aria-live="polite"><div className="mb-5 flex items-center gap-2 text-xs font-black text-[var(--forvia-blue)]"><LoaderCircle className="animate-spin" size={16}/>{t.generationTitle}</div><div className="space-y-3">{steps.map((step, index) => <div key={step} className={`flex items-center gap-3 text-xs ${index <= phase ? "text-[var(--ink)]" : "text-slate-400"}`}><span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${index < phase ? "border-emerald-500 bg-emerald-500 text-white" : index === phase ? "border-[var(--forvia-blue)] bg-white text-[var(--forvia-blue)]" : "border-slate-300"}`}>{index < phase ? "✓" : index + 1}</span>{step}</div>)}</div><p className="mt-5 text-[11px] leading-5 text-slate-500">{t.generationDone}</p></div>;
}
