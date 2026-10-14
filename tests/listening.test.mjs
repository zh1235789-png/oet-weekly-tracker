import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

// 2026-10-14 は水曜。その週の日曜始まりは 2026-10-11
const WED = '2026-10-14T09:00:00+09:00';
const withLog = (log, done = {}) =>
  loadApp({ today: WED, storage: { 'oet-weekly-v2': JSON.stringify({ done, log }) } });

test('記録が無ければ1.0倍から', () => {
  assert.equal(withLog({}).nextSpeed('2026-10-14').sp, '1.0');
});

test('直近が無回答0なら1段上げる', () => {
  const a = withLog({ '2026-10-12': { sp: '1.0', bl: 3 }, '2026-10-13': { sp: '1.0', bl: 0 } });
  assert.equal(a.nextSpeed('2026-10-14').sp, '1.1');
});

test('直近に無回答があれば据え置き', () => {
  const a = withLog({ '2026-10-12': { sp: '1.0', bl: 0 }, '2026-10-13': { sp: '1.1', bl: 2 } });
  assert.equal(a.nextSpeed('2026-10-14').sp, '1.1');
});

test('1.15倍が上限', () => {
  assert.equal(withLog({ '2026-10-13': { sp: '1.15', bl: 0 } }).nextSpeed('2026-10-14').sp, '1.15');
});

test('今日の記録は今日の提案に使わない', () => {
  assert.equal(withLog({ '2026-10-14': { sp: '1.0', bl: 0 } }).nextSpeed('2026-10-14').sp, '1.0');
});

test('日曜の初見記録（a）は速度提案に混ざらない', () => {
  assert.equal(withLog({ '2026-10-11': { a: 15, bl: 0 } }).nextSpeed('2026-10-14').sp, '1.0');
});

test('新方式の週は L 月〜土×3工程＋日曜＋週内2件', () => {
  assert.deepEqual(norm(withLog({}).weekStats(0, 'L')), { total: 6 * 3 + 1 + 2, done: 0 });
});

test('旧1チェック(L-core)の日は3工程すべて済み扱い', () => {
  const a = withLog({}, { 'd:2026-10-12:L-core': true });
  assert.equal(a.weekStats(0, 'L').done, 3);
});

test('旧方式の週は L を1日1件で数え、追加タスクを含めない', () => {
  assert.deepEqual(norm(withLog({}).weekStats(-1, 'L')), { total: 6 + 1, done: 0 });
});

test('setLog は無回答を0〜24に丸めて保存する', () => {
  const a = withLog({});
  a.setLog('2026-10-14', 'bl', '30');
  a.setLog('2026-10-14', 'sp', '1.1');
  assert.deepEqual(norm(JSON.parse(a.__store['oet-weekly-v2']).log), { '2026-10-14': { bl: 24, sp: '1.1' } });
});
