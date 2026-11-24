import test from 'node:test';
import assert from 'node:assert/strict';
import { newState, applyChange, normalizeState, publicState, readScope, propose, validateBackup } from '../shared/domain.mjs';
import { findMemos } from '../shared/memos.mjs';
import { mergeLocalData, migrationCounts } from '../shared/migration.mjs';
import { createWorkspace } from '../shared/workspace.mjs';

test('memo lifecycle preserves original copy and stays separate from action items and AI', () => {
 const content = '  Think differently\n慢慢向前。  ';
 const initial = newState();
 const created = applyChange(initial, { action: 'memo', content, category: '签名 / Sign' });
 const memo = created.memos[0];
 assert.equal(memo.section, 'temporary');
 assert.equal(memo.content, content);
 assert.equal(initial.memos.length, 0);
 assert.equal(publicState(created).memos[0].content, content);
 assert.deepEqual(created.notes, []);
 for (const scope of ['overview', 'goals', 'journal', 'plans']) assert.ok(!JSON.stringify(readScope(created, scope)).includes('Think differently'));
 assert.throws(() => propose(created, { action: 'memo', content }), /不支持的 AI 操作/);
 const updated = applyChange(created, { action: 'updateMemo', id: memo.id, section: 'longTerm', title: '标语', pinned: true });
 assert.equal(updated.memos[0].section, 'longTerm');
 assert.equal(updated.memos[0].content, content);
 assert.equal(updated.memos[0].pinned, true);
 assert.deepEqual(applyChange(updated, { action: 'deleteMemo', id: memo.id }).memos, []);
 assert.throws(() => applyChange(updated, { action: 'deleteMemo', id: 'missing' }), /备忘不存在/);
});

test('memo search combines filters and puts pins first without mutating state', () => {
 const older = { id: 'older', title: 'First line', content: '向前', section: 'longTerm', category: '口号', pinned: true, updatedAt: '2026-01-01T00:00:00.000Z' };
 const newer = { ...older, id: 'newer', pinned: false, updatedAt: '2026-11-01T00:00:00.000Z' };
 const memos = [newer, older, { ...older, id: 'temporary', section: 'temporary' }];
 assert.deepEqual(findMemos(memos, { section: 'longTerm', category: '口号', query: ' FIRST 向前 ' }).map(memo => memo.id), ['older', 'newer']);
 assert.deepEqual(findMemos(memos, { section: '', category: '灵感', query: '' }), []);
 assert.equal(memos[0].id, 'newer');
});

test('old backups stay compatible and new backups reject malformed or duplicate memos', () => {
 const { memos, ...legacy } = newState();
 assert.deepEqual(normalizeState(validateBackup(legacy)).memos, memos);
 const state = applyChange(legacy, { action: 'memo', content: 'Hello' });
 assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(state))).memos, state.memos);
 assert.throws(() => validateBackup({ ...state, memos: [state.memos[0], state.memos[0]] }), /备忘编号/);
 assert.throws(() => validateBackup({ ...state, memos: null }), /备忘录备份格式/);
 assert.throws(() => applyChange(state, { action: 'memo', content: ' ' }), /正文/);
 assert.throws(() => applyChange(state, { action: 'memo', content: 'x'.repeat(4001) }), /正文/);
 assert.throws(() => applyChange(state, { action: 'memo', content: 'x', section: ['temporary'] }), /保留类型/);
});

test('explicit migration copies memos once and preserves the destination copy', () => {
 const source = applyChange(newState(), { action: 'memo', content: '原始签名' });
 const first = mergeLocalData(newState(), source);
 assert.equal(first.added.memos, 1);
 assert.equal(migrationCounts(source).memos, 1);
 const edited = applyChange(first.state, { action: 'updateMemo', id: source.memos[0].id, content: '已编辑' });
 const repeated = mergeLocalData(edited, source);
 assert.equal(repeated.added.memos, 0);
 assert.equal(repeated.state.memos[0].content, '已编辑');
 assert.equal(source.memos[0].content, '原始签名');
});

test('shared workspace API saves and reloads memos', async () => {
 let stored = newState();
 const handle = createWorkspace({ load: async () => stored, save: async value => { stored = value; }, configured: () => false });
 assert.equal((await handle('/api/life', 'POST', { action: 'memo', content: 'Keep going' })).status, 200);
 assert.equal((await handle('/api/life', 'GET')).data.memos[0].content, 'Keep going');
 assert.notEqual((await handle('/api/life', 'POST', { action: 'memo', content: '' })).status, 200);
 assert.equal(stored.memos.length, 1);
});

test('urgent memos can be created, moved, filtered, and restored from backup', () => {
 const initial = applyChange(newState(), { action: 'memo', content: '准备材料' });
 const created = applyChange(initial, { action: 'memo', content: '提交申请', section: 'urgent' });
 const restored = validateBackup(JSON.parse(JSON.stringify(created)));
 const filter = { section: 'urgent', category: '', query: '紧急事项' };
 assert.deepEqual(findMemos(restored.memos, filter).map(memo => memo.content), ['提交申请']);

 const moved = applyChange(restored, { action: 'updateMemo', id: initial.memos[0].id, section: 'urgent' });
 assert.equal(moved.memos.find(memo => memo.id === initial.memos[0].id).section, 'urgent');
 assert.equal(findMemos(moved.memos, filter).length, 2);
});
