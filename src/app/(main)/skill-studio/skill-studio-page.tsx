"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Plus, Save, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { listCustomers, type CustomerConfig } from "@/services/settings";
import {
  createSkill, deleteSkill, deleteSkillRun, generatePrompt, listSkillRuns, listSkills,
  startSkillRun, updateSkill, type Skill, type SkillRun,
} from "@/services/skills";
import { skillCopy } from "./skill-copy";

type SkillDraft = Pick<Skill, "name" | "description" | "prompt" | "customer_id" | "classifications" | "output_type" | "skill_spec">;

const emptyDraft: SkillDraft = {
  name: "", description: "", prompt: "", customer_id: null,
  classifications: ["forecast", "confirmed"], output_type: "correction", skill_spec: {},
};
const tone = (status: string): "green" | "red" | "amber" => status === "succeeded" ? "green" : status === "failed" ? "red" : "amber";
const message = (error: unknown) => error instanceof Error ? error.message : "Request failed";

export function SkillStudioPage() {
  const router = useRouter();
  const locale = typeof navigator !== "undefined" && navigator.language.startsWith("zh-TW") ? "zh-TW" : typeof navigator !== "undefined" && !navigator.language.startsWith("zh") ? "en" : "zh-CN";
  const t = skillCopy[locale];
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [runs, setRuns] = useState<SkillRun[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<"prompt" | "spec">("prompt");
  const [draft, setDraft] = useState<SkillDraft>(emptyDraft);
  const selected = skills.find((skill) => skill.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    const data = await listSkills({ search, page });
    setSkills(data.items);
    setTotal(data.total);
    setSelectedId((id) => data.items.some((item) => item.id === id) ? id : data.items[0]?.id || "");
  }, [page, search]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- API-backed initial state
  useEffect(() => { void refresh().catch((error) => toast.error(message(error))); void listCustomers().then(setCustomers); }, [refresh]);
  useEffect(() => {
    if (!selected) return;
    void Promise.resolve().then(() => {
      setDraft({
        name: selected.name, description: selected.description, prompt: selected.prompt,
        customer_id: selected.customer_id, classifications: selected.classifications,
        output_type: selected.output_type, skill_spec: selected.skill_spec || {},
      });
      setTab("prompt");
    });
    void listSkillRuns(selected.id).then((result) => setRuns(result.items)).catch(() => setRuns([]));
  }, [selected]);

  async function action(key: string, work: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    try { await work(); } catch (error) { toast.error(message(error)); } finally { setBusy(""); }
  }

  async function save() {
    if (!selected) return;
    await action("save", async () => {
      const result = await updateSkill(selected.id, draft);
      setSkills((items) => items.map((skill) => skill.id === result.id ? result : skill));
      toast.success("Skill 已保存");
    });
  }

  async function run(mode: "test" | "formal") {
    if (!selected || !draft.customer_id) return;
    await action(mode, async () => {
      const saved = await updateSkill(selected.id, draft);
      setSkills((items) => items.map((skill) => skill.id === saved.id ? saved : skill));
      const created = await startSkillRun(saved.id, mode);
      router.push(`/skill-studio/runs/${created.id}`);
    });
  }

  const canRun = !!selected && !!draft.customer_id && !!draft.prompt.trim() && draft.classifications.length > 0 && !busy;

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
    <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
      <Link href="/orders" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[var(--forvia-blue)]"><ArrowLeft size={15}/>返回订单</Link>
      <span className="text-[11px] text-slate-400">Skill Studio</span>
    </div>
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(190px,2fr)_minmax(440px,6fr)_minmax(300px,4fr)] overflow-hidden max-[1050px]:grid-cols-[220px_1fr] max-[760px]:block max-[760px]:overflow-auto">
      <aside className="min-h-0 overflow-auto border-r border-[var(--line)] p-3">
        <div className="mb-3 flex items-center justify-between"><strong className="text-sm">{t.list}</strong><Button size="sm" variant="primary" disabled={!!busy} onClick={() => void action("create", async () => {
          const skill = await createSkill({ name: "Untitled correction", customer_id: null, classifications: ["forecast", "confirmed"], output_type: "correction" });
          setSearch(""); setPage(1); setSkills((items) => [skill, ...items.filter((item) => item.id !== skill.id)].slice(0, 20)); setTotal((value) => value + 1); setSelectedId(skill.id);
        })}><Plus size={14}/>{t.create}</Button></div>
        <div className="relative mb-3"><Search className="absolute left-2 top-2 h-4 w-4 text-slate-400"/><Input className="pl-8" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search"/></div>
        {skills.map((skill) => <button key={skill.id} onClick={() => setSelectedId(skill.id)} className={`mb-1 w-full rounded-xl border p-3 text-left ${skill.id === selectedId ? "border-[var(--forvia-blue)] bg-[var(--forvia-blue-soft)]" : "border-transparent hover:bg-slate-50"}`}>
          <span className="block truncate text-xs font-bold">{skill.name}</span>
          <small className="mt-2 block truncate text-[10px] text-slate-400">{customers.find((customer) => customer.id === skill.customer_id)?.name ?? "未绑定客户"}</small>
        </button>)}
        <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-3 text-[10px] text-slate-500"><Button size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>上一页</Button><span>{page} / {Math.max(1, Math.ceil(total / 20))}</span><Button size="sm" disabled={page * 20 >= total} onClick={() => setPage((value) => value + 1)}>下一页</Button></div>
      </aside>

      <section className="min-h-0 overflow-auto border-r border-[var(--line)] p-5 max-[760px]:border-b">
        {selected ? <>
          <div className="mb-4 flex items-center justify-between gap-3"><div><strong className="text-sm">{t.definition}</strong><p className="mt-1 text-[11px] text-slate-500">保存后即可试运行或正式运行</p></div><Button size="sm" variant="destructive" disabled={!!busy} onClick={() => void action("delete-skill", async () => {
            if (!window.confirm("删除后 Skill 将从清单隐藏，历史 Run 仍会保留。确认删除？")) return;
            await deleteSkill(selected.id); setSelectedId(""); await refresh();
          })}><Trash2 size={13}/>删除 Skill</Button></div>
          <fieldset disabled={!!busy} className="space-y-4 disabled:opacity-70">
            <label className="skill-field">{t.name}<Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })}/></label>
            <label className="skill-field">{t.scope}<select className="skill-select" value={draft.customer_id ?? ""} onChange={(event) => setDraft({ ...draft, customer_id: event.target.value || null })}><option value="">未绑定客户</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
            <div className="flex gap-4 text-xs">{(["forecast", "confirmed"] as const).map((kind) => <label key={kind}><input type="checkbox" checked={draft.classifications.includes(kind)} onChange={() => setDraft({ ...draft, classifications: draft.classifications.includes(kind) ? draft.classifications.filter((value) => value !== kind) : [...draft.classifications, kind] })}/> {kind === "confirmed" ? "Firm" : "Forecast"}</label>)}</div>
            <label className="skill-field">{t.description}<Textarea rows={5} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })}/></label>
            <Button disabled={!draft.description.trim()} onClick={() => void action("generate", async () => { setTab("prompt"); const prompt = await generatePrompt(selected.id, draft.description); setDraft({ ...draft, name: prompt.name, prompt: prompt.prompt, skill_spec: prompt.skillSpec }); })}><Sparkles size={14}/>{busy === "generate" ? "生成中…" : t.generate}</Button>
            <div><div className="mb-2 flex justify-end"><div className="rounded-lg bg-slate-100 p-1 text-xs">{(["prompt", "spec"] as const).map((item) => <button type="button" key={item} onClick={() => setTab(item)} className={`rounded-md px-3 py-1.5 ${tab === item ? "bg-white font-bold shadow-sm" : "text-slate-500"}`}>{item === "prompt" ? "提示词" : "Skill Spec"}</button>)}</div></div>{tab === "prompt" ? busy === "generate" ? <GenerationProgress/> : <Textarea aria-label="提示词" className="font-mono" rows={12} value={draft.prompt} onChange={(event) => setDraft({ ...draft, prompt: event.target.value })}/> : <pre className="min-h-64 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-[11px] leading-5 text-slate-200">{JSON.stringify(draft.skill_spec, null, 2)}</pre>}</div>
            <Button variant="primary" onClick={() => void save()}><Save size={14}/>{t.save}</Button>
          </fieldset>
        </> : <div className="grid h-full place-items-center text-sm text-slate-400">{t.noSkills}</div>}
      </section>

      <aside className="min-h-0 overflow-auto p-4 max-[1050px]:col-span-2 max-[1050px]:border-t">
        <div className="flex items-center justify-between"><strong className="text-sm">运行历史</strong>{selected && <div className="flex gap-2"><Button disabled={!canRun} onClick={() => void run("test")}>{busy === "test" && <LoaderCircle className="animate-spin" size={14}/>}新建试运行</Button><Button variant="primary" disabled={!canRun} onClick={() => void run("formal")}>{busy === "formal" && <LoaderCircle className="animate-spin" size={14}/>}新建正式运行</Button></div>}</div>
        {selected && <div className="mt-4"><p className="mb-3 text-[11px] leading-5 text-slate-500">新建运行后，在 Run 页选择日期与物料并预览最终数据快照。</p>{runs.map((runItem) => <div key={runItem.id} className="flex items-center border-b border-[var(--line)] py-1">
          <button onClick={() => router.push(`/skill-studio/runs/${runItem.id}`)} className="flex min-w-0 flex-1 items-center justify-between py-2 pr-2 text-left text-[11px]"><span className="min-w-0"><strong className="block text-xs text-[var(--ink)]">{runItem.mode === "test" ? "试运行" : "正式运行"}</strong><small className="block truncate text-slate-500">{runItem.input_cell_count ? `${runItem.input_cell_count} cells` : "待选择数据"} · {runItem.created_at ? new Date(runItem.created_at).toLocaleString() : "—"}</small></span><Badge variant={tone(runItem.status)}>{runItem.status}</Badge></button>
          {!runItem.merge_batches.length && <Button size="icon-sm" variant="ghost" aria-label="删除运行" title="删除未合并的运行" disabled={!!busy} onClick={() => void action(`delete-run-${runItem.id}`, async () => { if (!window.confirm("该运行尚未合并，确认删除？")) return; await deleteSkillRun(runItem.id); setRuns((items) => items.filter((item) => item.id !== runItem.id)); toast.success("运行已删除"); })}><Trash2 size={13}/></Button>}
        </div>)}{!runs.length && <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-xs text-slate-400">暂无运行记录</div>}</div>}
      </aside>
    </div>
  </div>;
}

function GenerationProgress() {
  const steps = ["理解客户自然语言", "保留阈值与例外条件", "翻译业务规则与修改动作", "校验精简 Skill 结构"];
  const [phase, setPhase] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setPhase((current) => Math.min(current + 1, steps.length - 1)), 2400); return () => window.clearInterval(timer); }, [steps.length]);
  return <div className="min-h-64 rounded-xl border border-[var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)] p-5" role="status" aria-live="polite"><div className="mb-5 flex items-center gap-2 text-xs font-black text-[var(--forvia-blue)]"><LoaderCircle className="animate-spin" size={16}/>正在设计 Skill 提示词</div><div className="space-y-3">{steps.map((step, index) => <div key={step} className={`flex items-center gap-3 text-xs ${index <= phase ? "text-[var(--ink)]" : "text-slate-400"}`}><span className={`grid h-5 w-5 place-items-center rounded-full border text-[10px] ${index < phase ? "border-emerald-500 bg-emerald-500 text-white" : index === phase ? "border-[var(--forvia-blue)] bg-white text-[var(--forvia-blue)]" : "border-slate-300"}`}>{index < phase ? "✓" : index + 1}</span>{step}</div>)}</div><p className="mt-5 text-[11px] leading-5 text-slate-500">完成后会自动填入可编辑提示词，并同步生成只读 Skill Spec。</p></div>;
}
