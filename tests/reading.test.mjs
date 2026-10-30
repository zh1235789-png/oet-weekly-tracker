import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

// 2026-10-30 は金曜。週初は 2026-10-25
const FRI = '2026-10-30T09:00:00+09:00';
const SAT = '2026-10-31T09:00:00+09:00';
const KEY = 'oet-weekly-v2';
const withDone = (done = {}, today = FRI) =>
  loadApp({ today, storage: { [KEY]: JSON.stringify({ done, log: {} }) } });
const pick = (m) => m && { k: m.k, done: m.done };

test('最初は Official01 の C1（A・B は採点済み扱い）', () => {
  assert.deepEqual(norm(pick(withDone().mockToday('2026-10-30'))), { k: 'Official01:C1', done: false });
});

test('今日解いたら、今日はそのパートを済みで出す（次へ進まない）', () => {
  const a = withDone({ 'm:Official01:C1': '2026-10-30' });
  assert.deepEqual(norm(pick(a.mockToday('2026-10-30'))), { k: 'Official01:C1', done: true });
});

test('翌日は次のパートへ', () => {
  const a = withDone({ 'm:Official01:C1': '2026-10-30' }, SAT);
  assert.deepEqual(norm(pick(a.mockToday('2026-10-31'))), { k: 'Official01:C2', done: false });
});

test('解かなかった日は同じパートが翌日も出る（曜日に関係なく持ち越し）', () => {
  assert.deepEqual(norm(pick(withDone({}, SAT).mockToday('2026-10-31'))), { k: 'Official01:C1', done: false });
});

test('セットを解き終えたら次のセットの Part A', () => {
  const a = withDone({ 'm:Official01:C1': '2026-10-30', 'm:Official01:C2': '2026-10-31' }, '2026-11-01T09:00:00+09:00');
  assert.deepEqual(norm(pick(a.mockToday('2026-11-01'))), { k: 'Official02:A', done: false });
});

test('toggleMock は今日の日付で記録し、もう一度で取り消す', () => {
  const a = withDone();
  a.toggleMock('Official01:C1');
  assert.equal(JSON.parse(a.__store[KEY]).done['m:Official01:C1'], '2026-10-30');
  a.toggleMock('Official01:C1');
  assert.equal(JSON.parse(a.__store[KEY]).done['m:Official01:C1'], undefined);
});

test('10/25 の週から曜日固定の模試タスクは集計に入らない', () => {
  const a = withDone();
  const ids = a.$('WEEK_TASKS').filter((t) => t.sess === 'R' && !(t.until && '2026-10-25' >= t.until)).map((t) => t.id);
  assert.deepEqual(norm(ids), ['R-app']);
});

test('前の週（10/18〜）までは曜日固定の模試タスクが残る', () => {
  const a = withDone();
  const before = a.weekStats(-1, 'other').total, now = a.weekStats(0, 'other').total;
  assert.equal(before - now, 5);
});

test('今日の欄に模試の行が出て、render が落ちない', () => {
  const a = withDone();
  assert.equal(a.__initError, null);
  const h = a.weekView();
  assert.match(h, /模試 Official01/);
  assert.match(h, /Part C Text 1/);
});
