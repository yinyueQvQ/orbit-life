export const memoSections = { temporary: '临时', longTerm: '长期' };
export const memoCategories = ['口号', '签名 / Sign', '灵感', '其他'];
export const memoLimits = { title: 80, content: 4000, records: 5000 };

function cleanMemo({ section, category, title, content, pinned }) {
 if (typeof section !== 'string' || !Object.hasOwn(memoSections, section)) throw Error('备忘保留类型无效');
 if (!memoCategories.includes(category)) throw Error('备忘分类无效');
 if (typeof title !== 'string' || title.length > memoLimits.title) throw Error('备忘标题过长或无效');
 if (typeof content !== 'string' || !content.trim() || content.length > memoLimits.content) throw Error('请填写 1 至 4000 字的备忘正文');
 if (typeof pinned !== 'boolean') throw Error('备忘置顶状态无效');
 return { section, category, title: title.trim(), content, pinned };
}

export function changeMemo(memos, change, now = new Date().toISOString()) {
 if (change.action === 'memo') {
  if (memos.length >= memoLimits.records) throw Error('备忘录已满，请先整理现有记录');
  const fields = cleanMemo({ section: 'temporary', category: '其他', title: '', pinned: false, ...change });
  return [{ id: crypto.randomUUID(), ...fields, updatedAt: now }, ...memos];
 }
 const current = memos.find(memo => memo.id === change.id);
 if (!current) throw Error('备忘不存在');
 if (change.action === 'deleteMemo') return memos.filter(memo => memo !== current);
 const fields = cleanMemo({ ...current, ...change });
 return memos.map(memo => memo === current ? { ...memo, ...fields, updatedAt: now } : memo);
}

export function validateMemos(memos) {
 if (!Array.isArray(memos) || memos.length > memoLimits.records) throw Error('备忘录备份格式无效');
 const seen = new Set();
 for (const memo of memos) {
  if (!memo || typeof memo.id !== 'string' || !memo.id.trim() || memo.id.length > 120 || seen.has(memo.id)) throw Error('备忘编号无效');
  if (typeof memo.updatedAt !== 'string' || !Number.isFinite(Date.parse(memo.updatedAt)) || new Date(memo.updatedAt).toISOString() !== memo.updatedAt) throw Error('备忘修改时间无效');
  cleanMemo(memo);
  seen.add(memo.id);
 }
}

export function findMemos(memos, { section, category, query }) {
 const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 return memos.filter(memo => {
  if ((section && memo.section !== section) || (category && memo.category !== category)) return false;
  const searchable = [memo.title, memo.content, memo.category, memoSections[memo.section]].join(' ').toLowerCase();
  return words.every(word => searchable.includes(word));
 }).sort((first, second) => Number(second.pinned) - Number(first.pinned) || second.updatedAt.localeCompare(first.updatedAt));
}
