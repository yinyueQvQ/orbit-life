'use client';

import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Clipboard, Pin, Plus, X } from 'lucide-react';
import { api } from '../client/api.mjs';
import { findMemos, memoCategories, memoLimits, memoSections } from '../shared/memos.mjs';
import {AudioField, MemoryAudio, saveWithAudio, type AudioReference} from './memory-audio';
import './memo-panel.css';

type Section = keyof typeof memoSections;
const sectionTabs: (Section | '')[] = ['', ...Object.keys(memoSections) as Section[]];
type Memo = { id: string; title: string; content: string; section: Section; category: string; pinned: boolean; updatedAt: string; audio?: AudioReference|null };
type Dialog = { type: 'edit'; memo?: Memo } | { type: 'delete'; memo: Memo };
type MemoChange = { action: 'memo' | 'updateMemo' | 'deleteMemo'; id?: string; title?: string; content?: string; category?: string; section?: Section; pinned?: boolean };
const pageSize = 48;

async function copyText(value: string) {
 const copied = await navigator.clipboard?.writeText(value).then(() => true, () => false);
 if (copied) return;
 const previous = document.activeElement;
 const field = document.createElement('textarea');
 field.value = value;
 field.readOnly = true;
 field.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0;pointer-events:none';
 document.body.appendChild(field);
 try {
  field.select();
  if (!document.execCommand('copy')) throw Error('无法自动复制，请选中正文后手动复制。');
 } finally {
  field.remove();
  if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
 }
}

export default function MemoPanel({ memos, onChange }: { memos: Memo[]; onChange: () => Promise<void> }) {
 const [section, setSection] = useState<Section | ''>('');
 const [category, setCategory] = useState('');
 const [query, setQuery] = useState('');
 const [limit, setLimit] = useState(pageSize);
 const [dialog, setDialog] = useState<Dialog | null>(null);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [status, setStatus] = useState('');
 const writing = useRef(false);
 const visible: Memo[] = useMemo(() => findMemos(memos, { section, category, query }), [memos, section, category, query]);

 function open(next: Dialog | null) {
  if (writing.current) return;
  setError('');
  setStatus('');
  setDialog(next);
 }

 async function save(change: MemoChange, message: string, form?: FormData) {
  if (writing.current) return;
  writing.current = true;
  setBusy(true);
  setError('');
  setStatus('');
  try {
   if (form) await saveWithAudio(form, change);
   else await api('/api/life', change);
   await onChange();
   if (change.action === 'memo') {
    setSection(change.section ?? 'temporary');
    setCategory('');
    setQuery('');
    setLimit(pageSize);
   }
   setDialog(null);
   setStatus(message);
  } catch (reason) {
   setError(reason instanceof Error ? reason.message : '备忘未保存，请重试。');
  } finally {
   writing.current = false;
   setBusy(false);
  }
 }

 function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const content = String(form.get('content') || '');
  const id = dialog?.memo?.id;
  const selectedSection = form.get('section') as Section;
  void save({ action: id ? 'updateMemo' : 'memo', id, content, title: String(form.get('title') || ''), category: String(form.get('category')), section: selectedSection }, '已保存备忘。', form);
 }

 return <div className="memo-space">
  <section className="v2-card memo-controls" aria-label="筛选备忘">
   <div className="memo-row">
    <div className="space-tabs memo-tabs" role="group" aria-label="备忘分区">
     {sectionTabs.map(key => <button key={key} type="button" aria-pressed={section === key} data-active={section === key} onClick={() => { setSection(key); setLimit(pageSize); }}>{key ? memoSections[key] : '全部'}</button>)}
    </div>
    <button className="v2-primary" type="button" disabled={busy} onClick={() => open({ type: 'edit' })}><Plus size={16}/> 新建备忘</button>
   </div>
   <div className="v2-form memo-filters">
    <label>搜索备忘<input type="search" value={query} placeholder="搜索标题、正文或分类" onChange={event => { setQuery(event.target.value); setLimit(pageSize); }}/></label>
    <label>分类<select value={category} onChange={event => { setCategory(event.target.value); setLimit(pageSize); }}><option value="">全部分类</option>{memoCategories.map(value => <option key={value}>{value}</option>)}</select></label>
   </div>
   <p className="v2-muted memo-hint">临时备忘也会保留，直到你手动删除。</p>
  </section>

  <p role="status" className="memo-feedback">{status}</p>
  {error && !dialog && <p className="v2-error" role="alert">{error}</p>}
  {visible.length ? <div className="memo-grid">
   {visible.slice(0, limit).map(memo => <article className="v2-card memo-card" key={memo.id}>
    <div className="memo-row"><span className="v2-muted">{memoSections[memo.section]} · {memo.category}</span>{memo.pinned && <span className="memo-pin"><Pin size={14}/> 已置顶</span>}</div>
    {memo.title && <h2>{memo.title}</h2>}
    <p className="memo-content">{memo.content}</p>
    <MemoryAudio key={memo.audio?.id} audio={memo.audio}/>
    <div className="memo-actions">
     <button type="button" className="v2-secondary" onClick={async () => { setError(''); setStatus(''); try { await copyText(memo.content); setStatus('已复制正文。'); } catch { setError('无法自动复制，请选中正文后手动复制。'); } }}><Clipboard size={15}/> 复制</button>
     <button type="button" className="v2-secondary" disabled={busy} onClick={() => open({ type: 'edit', memo })}>编辑</button>
     <button type="button" className="v2-secondary" disabled={busy} onClick={() => void save({ action: 'updateMemo', id: memo.id, pinned: !memo.pinned }, memo.pinned ? '已取消置顶。' : '已置顶。')}>{memo.pinned ? '取消置顶' : '置顶'}</button>
     <button type="button" className="v2-secondary" disabled={busy} onClick={() => open({ type: 'delete', memo })}>删除</button>
    </div>
   </article>)}
  </div> : <div className="v2-card v2-empty">{memos.length ? '没有符合条件的备忘。' : '还没有备忘。先存一句想留下的话吧。'}</div>}
  {limit < visible.length && <button className="v2-secondary" onClick={() => setLimit(limit + pageSize)}>加载更多（剩余 {visible.length - limit} 条）</button>}

  {dialog && <div className="v2-dialog-overlay">
   <section className="v2-dialog" role="dialog" aria-modal="true" aria-labelledby="memo-dialog-title">
    <button type="button" className="v2-icon dialog-close" aria-label="关闭" disabled={busy} onClick={() => open(null)}><X size={20}/></button>
    <h2 id="memo-dialog-title">{dialog.type === 'delete' ? '删除这条备忘？' : dialog.memo ? '编辑备忘' : '新建备忘'}</h2>
    {dialog.type === 'delete' ? <>
     <p className="v2-muted memo-delete-summary">{dialog.memo.title || dialog.memo.content.slice(0, 100)} · 删除后无法撤销。</p>
     <button type="button" className="v2-danger" disabled={busy} onClick={() => void save({ action: 'deleteMemo', id: dialog.memo.id }, '已删除备忘。')}>{busy ? '正在删除…' : '确认删除'}</button>
    </> : <form className="v2-form" onSubmit={submit}>
     <div className="v2-form-grid">
      <label>分区<select name="section" defaultValue={dialog.memo?.section || section || 'temporary'}>{Object.entries(memoSections).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>分类<select name="category" defaultValue={dialog.memo?.category || category || '其他'}>{memoCategories.map(value => <option key={value}>{value}</option>)}</select></label>
     </div>
     <label>标题（选填）<input name="title" defaultValue={dialog.memo?.title} maxLength={memoLimits.title}/></label>
     <label>正文<textarea name="content" rows={5} maxLength={memoLimits.content} defaultValue={dialog.memo?.content} placeholder="例如：保持好奇，慢慢向前。"/></label>
     <AudioField audio={dialog.memo?.audio}/>
     <button className="v2-primary" disabled={busy}>{busy ? '正在保存…' : '保存备忘'}</button>
    </form>}
    {error && <p className="v2-error" role="alert">{error}</p>}
   </section>
  </div>}
 </div>;
}
