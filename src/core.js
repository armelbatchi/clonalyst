/* Clonalyst core (demonstration build).
   Independent implementation written for this demo. It does not contain CH-Predict
   code or CH-Predict coefficients. Default model coefficients are illustrative only.
   Pure functions, no DOM, so the same file runs in the browser and in Node tests. */
const Clonalyst = (() => {
  const REQUIRED = ['id','age','sex','smoking_status','anc','alc','amc','hgb','mcv','rdw','plt'];
  const OUTCOMES = ['ch_any','jak2','idh'];
  const TARGETS = {ch_any:'Any CH driver', jak2:'JAK2', idh:'IDH1/2'};
  const RANGES = {age:[18,110],anc:[0.1,30],alc:[0.1,20],amc:[0,5],hgb:[4,22],mcv:[50,130],rdw:[9,30],plt:[5,1500]};
  const UNIT_HINT = {hgb:v => v > 30 ? 'looks like g/L, expected g/dL' : null,
                     anc:v => v > 100 ? 'looks like cells/uL, expected 10^9/L' : null,
                     plt:v => v > 3000 ? 'looks like cells/uL, expected 10^9/L' : null};
  const REF = {age:[60,12],anc:[4.0,1.4],alc:[1.9,0.6],amc:[0.5,0.15],hgb:[13.8,1.4],mcv:[90,5],rdw:[13.5,1.0],plt:[250,60]};

  // Illustrative scoring model shipped with the demo. Not validated.
  const DEMO_MODEL = {
    name:'Demo model v0 (illustrative coefficients, not validated)',
    ch_any:{b0:-2.85, age:0.62, smoking_status:0.20, male:0.05, rdw:0.10, hgb:-0.04},
    jak2:{b0:-6.3, age:0.55, plt:0.75, hgb:0.20, anc:0.10},
    idh:{b0:-6.7, age:0.70, anc:-0.25, rdw:0.25}
  };
  // Hidden generator used only to simulate synthetic outcomes.
  const TRUTH = {
    ch_any:{b0:-2.44, age:0.636, smoking_status:0.25, male:0.05, rdw:0.12, hgb:-0.05},
    jak2:{b0:-6.05, age:0.60, plt:0.90, hgb:0.25, anc:0.15},
    idh:{b0:-6.40, age:0.72, anc:-0.30, rdw:0.30}
  };

  const expit = x => 1/(1+Math.exp(-x));
  const logit = p => Math.log(p/(1-p));
  const clampP = p => Math.min(1-1e-9, Math.max(1e-9, p));
  function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function normal(r){ let u = 0, v = 0; while(u === 0) u = r(); while(v === 0) v = r(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }
  const z = (k, v) => (v - REF[k][0]) / REF[k][1];

  function linpred(coef, row){
    let s = coef.b0;
    for (const k of Object.keys(coef)){
      if (k === 'b0') continue;
      if (k === 'male') s += coef.male * (row.sex === 'M' ? 1 : 0);
      else if (k === 'smoking_status') s += coef.smoking_status * row.smoking_status;
      else s += coef[k] * z(k, row[k]);
    }
    return s;
  }

  function generateCohort(n, seed, opts = {}){
    const r = rng(seed), rows = [];
    const errRate = opts.errors === false ? 0 : 1;
    for (let i = 0; i < n; i++){
      const male = r() < 0.5;
      const row = {
        id:'S' + String(i+1).padStart(6,'0'),
        age:Math.round(40 + 45*Math.pow(r(), 0.85)),
        sex:male ? 'M' : 'F',
        smoking_status:r() < 0.35 ? 1 : 0,
        anc:+Math.exp(Math.log(4.0) + 0.33*normal(r)).toFixed(2),
        alc:+Math.exp(Math.log(1.9) + 0.30*normal(r)).toFixed(2),
        amc:+Math.max(0.05, 0.5 + 0.15*normal(r)).toFixed(2),
        hgb:+((male ? 14.6 : 13.2) + 1.2*normal(r)).toFixed(1),
        mcv:+(90 + 5*normal(r)).toFixed(1),
        rdw:+(13.5 + 1.0*normal(r) + 0.25*Math.abs(normal(r))).toFixed(1),
        plt:Math.round(Math.exp(Math.log(245) + 0.24*normal(r)))
      };
      for (const t of OUTCOMES) row['_true_' + t] = r() < expit(linpred(TRUTH[t], row)) ? 1 : 0;
      if (errRate){
        const e = r();
        if (e < 0.003) row.hgb = +(row.hgb*10).toFixed(0);
        else if (e < 0.006) row.anc = '';
        else if (e < 0.008) row.age = 7;
      }
      rows.push(row);
    }
    return rows;
  }

  function parseCSV(text){
    const lines = text.replace(/\r/g,'').split('\n').filter(l => l.trim().length);
    if (!lines.length) return {header:[], rows:[]};
    const split = l => { const out = []; let cur = '', q = false;
      for (const ch of l){ if (ch === '"') q = !q; else if (ch === ',' && !q){ out.push(cur); cur = ''; } else cur += ch; }
      out.push(cur); return out.map(s => s.trim()); };
    const header = split(lines[0]).map(h => h.toLowerCase());
    const rows = lines.slice(1).map(l => { const v = split(l), o = {}; header.forEach((h,i) => o[h] = v[i] ?? ''); return o; });
    return {header, rows};
  }

  function validate(rawRows, header){
    const missingCols = REQUIRED.filter(c => !header.includes(c));
    const perCol = {}; REQUIRED.forEach(c => perCol[c] = {missing:0, invalid:0, range:0, unit:0});
    const valid = [], excluded = [];
    if (missingCols.length) return {missingCols, perCol, valid, excluded, n:rawRows.length};
    for (const raw of rawRows){
      const row = {id:String(raw.id)}, issues = [];
      for (const c of REQUIRED.slice(1)){
        const s = raw[c];
        if (s === '' || s === undefined || s === null){ perCol[c].missing++; issues.push(c + ' missing'); continue; }
        if (c === 'sex'){ const v = String(s).toUpperCase(); if (v !== 'M' && v !== 'F'){ perCol[c].invalid++; issues.push('sex not M/F'); } row.sex = v; continue; }
        const v = Number(s);
        if (!Number.isFinite(v)){ perCol[c].invalid++; issues.push(c + ' not numeric'); continue; }
        if (c === 'smoking_status'){ if (v !== 0 && v !== 1){ perCol[c].invalid++; issues.push('smoking_status not 0/1'); } row[c] = v; continue; }
        const hint = UNIT_HINT[c] && UNIT_HINT[c](v);
        if (hint){ perCol[c].unit++; issues.push(c + ' ' + hint); }
        else if (RANGES[c] && (v < RANGES[c][0] || v > RANGES[c][1])){ perCol[c].range++; issues.push(c + ' out of range'); }
        row[c] = v;
      }
      for (const t of OUTCOMES){ const s = raw[t]; if (s === '0' || s === 0 || s === '1' || s === 1) row[t] = Number(s); }
      for (const k of Object.keys(raw)) if (k.startsWith('_true_')) row[k] = raw[k];
      (issues.length ? excluded : valid).push(issues.length ? {id:row.id, issues} : row);
    }
    return {missingCols, perCol, valid, excluded, n:rawRows.length};
  }

  function score(rows, model){
    for (const row of rows) for (const t of OUTCOMES) row['p_' + t] = expit(linpred(model[t], row));
    return rows;
  }

  // Logistic recalibration y ~ a + b*logit(p). Intercept-only when events are few.
  function recalibrate(ps, ys, minEvents = 20, minIntercept = 10){
    const events = ys.reduce((s,y) => s + y, 0), n = ys.length;
    const x = ps.map(p => logit(clampP(p)));
    const expected = ps.reduce((s,p) => s + p, 0);
    const oe = expected > 0 ? events/expected : null;
    const oeCI = events > 0 ? [oe*Math.exp(-1.96/Math.sqrt(events)), oe*Math.exp(1.96/Math.sqrt(events))] : null;
    if (n === 0 || events < minIntercept) return {a:0, b:1, mode:'not applied (only ' + events + ' events, at least ' + minIntercept + ' needed)', events, n, oe, oeCI, applied:false};
    let a = 0, b = 1;
    const slope = events >= minEvents && n - events >= minEvents;
    for (let it = 0; it < 50; it++){
      let g0 = 0, g1 = 0, h00 = 1e-6, h01 = 0, h11 = 1e-6;
      for (let i = 0; i < n; i++){
        const m = expit(a + b*x[i]), w = m*(1-m), r = ys[i] - m;
        g0 += r; g1 += r*x[i]; h00 += w; h01 += w*x[i]; h11 += w*x[i]*x[i];
      }
      if (!slope){ const da = g0/h00; a += da; if (Math.abs(da) < 1e-8) break; continue; }
      const det = h00*h11 - h01*h01, da = (h11*g0 - h01*g1)/det, db = (h00*g1 - h01*g0)/det;
      a += da; b += db; if (Math.abs(da) + Math.abs(db) < 1e-8) break;
    }
    return {a, b, mode:slope ? 'intercept and slope' : 'intercept only (fewer than ' + minEvents + ' events)', events, n, oe, oeCI, applied:true};
  }
  const applyCal = (p, cal) => expit(cal.a + cal.b*logit(clampP(p)));

  function calibrationBins(ps, ys, k){
    const idx = ps.map((p,i) => i).sort((i,j) => ps[i] - ps[j]), bins = [];
    for (let b = 0; b < k; b++){
      const s = idx.slice(Math.floor(b*idx.length/k), Math.floor((b+1)*idx.length/k));
      if (!s.length) continue;
      bins.push({pred:s.reduce((t,i) => t + ps[i], 0)/s.length, obs:s.reduce((t,i) => t + ys[i], 0)/s.length, n:s.length});
    }
    return bins;
  }

  // Expected carriers as people are sequenced in a given order. Uses the (recalibrated) probabilities.
  function curve(order, probs){
    const E = new Float64Array(order.length + 1), V = new Float64Array(order.length + 1);
    for (let i = 0; i < order.length; i++){ const p = probs[order[i]]; E[i+1] = E[i] + p; V[i+1] = V[i] + p*(1-p); }
    return {E, V};
  }
  function needed(c, target, z = 0){
    for (let k = 1; k < c.E.length; k++) if (c.E[k] - z*Math.sqrt(c.V[k]) >= target) return k;
    return null;
  }

  function plan(candidates, targetKey, cal, opts){
    const probs = candidates.map(r => applyCal(r['p_' + targetKey], cal));
    const n = candidates.length, ids = [...Array(n).keys()];
    const byModel = ids.slice().sort((i,j) => probs[j] - probs[i]);
    const byAge = ids.slice().sort((i,j) => candidates[j].age - candidates[i].age || i - j);
    const r = rng(opts.seed || 7), byRandom = ids.slice();
    for (let i = n - 1; i > 0; i--){ const j = Math.floor(r()*(i+1)); [byRandom[i], byRandom[j]] = [byRandom[j], byRandom[i]]; }
    const strategies = {model:byModel, age:byAge, random:byRandom};
    const out = {probs, n, strategies:{}};
    for (const [name, order] of Object.entries(strategies)){
      const c = curve(order, probs);
      const kExp = needed(c, opts.target), kConf = needed(c, opts.target, 1.645);
      const sim = order[0] !== undefined && candidates[0]['_true_' + targetKey] !== undefined
        ? (k => k ? order.slice(0, k).reduce((s,i) => s + Number(candidates[i]['_true_' + targetKey]), 0) : null)(kExp) : null;
      out.strategies[name] = {order, curve:c, kExp, kConf,
        costExp:kExp ? kExp*opts.cost : null, costConf:kConf ? kConf*opts.cost : null, simulatedCarriers:sim};
    }
    return out;
  }

  return {REQUIRED, OUTCOMES, TARGETS, DEMO_MODEL, expit, logit, rng, generateCohort, parseCSV, validate, score,
          recalibrate, applyCal, calibrationBins, curve, needed, plan};
})();
if (typeof module !== 'undefined') module.exports = Clonalyst;
