// Run with: node tests/core.test.js
const C = require('../src/core.js');
const assert = require('assert');
let passed = 0;
const ok = (cond, msg) => { assert(cond, msg); passed++; };

const raw = C.generateCohort(20000, 42);
const header = Object.keys(raw[0]);
const v = C.validate(raw, header);
ok(v.missingCols.length === 0, 'all required columns present');
ok(v.excluded.length > 0 && v.excluded.length < 400, 'injected errors are caught: ' + v.excluded.length);
ok(v.perCol.hgb.unit > 0, 'hemoglobin unit errors flagged');
ok(v.perCol.anc.missing > 0, 'missing neutrophil counts flagged');
ok(v.perCol.age.range > 0, 'out-of-range ages flagged');

C.score(v.valid, C.DEMO_MODEL);
const prev = t => v.valid.reduce((s, r) => s + r['_true_' + t], 0) / v.valid.length;
console.log('simulated prevalence', {any: prev('ch_any').toFixed(3), jak2: prev('jak2').toFixed(4), idh: prev('idh').toFixed(4)});
ok(prev('ch_any') > 0.05 && prev('ch_any') < 0.25, 'overall CH prevalence plausible');
ok(prev('jak2') > 0.001 && prev('jak2') < 0.012, 'JAK2 prevalence plausible');

// calibration subset: first 1,000 valid rows act as already sequenced
const calSet = v.valid.slice(0, 2000), cand = v.valid.slice(2000);
for (const t of C.OUTCOMES){
  const ps = calSet.map(r => r['p_' + t]), ys = calSet.map(r => r['_true_' + t]);
  const cal = C.recalibrate(ps, ys);
  const oeBefore = ys.reduce((a,b) => a + b, 0) / ps.reduce((a,b) => a + b, 0);
  const psAfter = ps.map(p => C.applyCal(p, cal));
  const oeAfter = ys.reduce((a,b) => a + b, 0) / psAfter.reduce((a,b) => a + b, 0);
  console.log(t, 'events', cal.events, 'mode', cal.mode, 'a', cal.a.toFixed(3), 'b', cal.b.toFixed(3), 'O/E before', oeBefore.toFixed(2), 'after', oeAfter.toFixed(2));
  if (cal.applied) ok(Math.abs(oeAfter - 1) < 0.05, t + ' calibration-in-the-large restored after recalibration');
  else ok(cal.a === 0 && cal.b === 1, t + ' recalibration withheld when events are too few');
  const p = C.plan(cand, t, cal, {target: t === 'ch_any' ? 100 : 20, cost: 150, seed: 3});
  const s = p.strategies;
  console.log('  samples needed (expected): model', s.model.kExp, 'age', s.age.kExp, 'random', s.random.kExp,
              '| 95% confident: model', s.model.kConf, '| simulated carriers in model pick', s.model.simulatedCarriers);
  ok(s.model.kExp <= s.age.kExp && s.age.kExp <= s.random.kExp, t + ' model <= age <= random');
  ok(s.model.kConf >= s.model.kExp, t + ' confident count is larger than expected count');
}
// CSV round trip with a missing column
const bad = C.parseCSV('id,age,sex\n1,70,M\n');
const vb = C.validate(bad.rows, bad.header);
ok(vb.missingCols.includes('plt'), 'missing columns reported');
console.log('passed', passed, 'checks');
