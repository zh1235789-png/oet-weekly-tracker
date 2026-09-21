import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, norm } from './harness.mjs';

// 2026-09-21 は月曜。その週の日曜始まりは 2026-09-20
const MON = '2026-09-21T09:00:00+09:00';
const app = (today = MON) => loadApp({ today });

test('pad() は1桁を0埋めする', () => {
  const a = app();
  assert.equal(a.pad(1), '01');
  assert.equal(a.pad(12), '12');
});

test('dkey() はローカル日付を YYYY-MM-DD にする', () => {
  assert.equal(app().dkey(new Date(2026, 8, 21)), '2026-09-21');
});

test('weekStart(0) は今週の日曜', () => {
  assert.equal(app().dkey(app().weekStart(0)), '2026-09-20');
});

test('weekStart() は時刻を切り捨てる', () => {
  const d = app().weekStart(0);
  assert.deepEqual([d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds()], [0, 0, 0, 0]);
});

test('weekStart(-1) / weekStart(1) は前後の週の日曜', () => {
  const a = app();
  assert.equal(a.dkey(a.weekStart(-1)), '2026-09-13');
  assert.equal(a.dkey(a.weekStart(1)), '2026-09-27');
});

test('weekDates() は日曜から土曜までの7日', () => {
  const a = app();
  const keys = a.weekDates(0).map(a.dkey);
  assert.equal(keys.length, 7);
  assert.equal(keys[0], '2026-09-20');
  assert.equal(keys[6], '2026-09-26');
});

test('日曜に実行してもその日が週初になる', () => {
  const a = app('2026-09-20T09:00:00+09:00');
  assert.equal(a.dkey(a.weekStart(0)), '2026-09-20');
});

test('土曜に実行しても週初は前の日曜', () => {
  const a = app('2026-09-26T23:59:00+09:00');
  assert.equal(a.dkey(a.weekStart(0)), '2026-09-20');
});

test('月をまたぐ週でも7日連続になる', () => {
  const a = app('2026-10-01T09:00:00+09:00');   // 木曜
  assert.deepEqual(norm(a.weekDates(0).map(a.dkey)),
    ['2026-09-27','2026-09-28','2026-09-29','2026-09-30','2026-10-01','2026-10-02','2026-10-03']);
});

test('年をまたぐ週でも7日連続になる', () => {
  const a = app('2027-01-01T09:00:00+09:00');   // 金曜 → 週初は前年12/27
  assert.deepEqual(norm(a.weekDates(0).map(a.dkey)),
    ['2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02']);
});

test('weekOffsetOf() は weekStart() と往復する', () => {
  const a = app();
  for (const off of [-3, -1, 0, 1, 4]) {
    assert.equal(a.weekOffsetOf(a.weekStart(off)), off, `offset ${off} で不一致`);
  }
});

test('weekOffsetOf() は週の途中の日でも同じ週を指す', () => {
  const a = app();
  assert.equal(a.weekOffsetOf(new Date(2026, 8, 20)), 0);   // 日曜
  assert.equal(a.weekOffsetOf(new Date(2026, 8, 26)), 0);   // 土曜
  assert.equal(a.weekOffsetOf(new Date(2026, 8, 27)), 1);   // 翌週日曜
});

test('todayInfo() は今日のキーと曜日を返す', () => {
  const t = app().todayInfo();
  assert.equal(t.key, '2026-09-21');
  assert.equal(t.wd, 1);   // 月曜
});
