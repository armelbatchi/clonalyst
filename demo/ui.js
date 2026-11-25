(() => {
const C=Clonalyst, $=id=>document.getElementById(id);
let raw=[], header=[], source='', generated=false, report='';
const fmt=x=>x==null?'Not reached':Math.round(x).toLocaleString('en-US');
const money=x=>x==null?'Not reached':'$'+fmt(x);
const num=(id,min,max)=>Math.max(min,Math.min(max,Number($(id).value)||min));
function cellRow(el, values){const tr=document.createElement('tr');for(const v of values){const td=document.createElement('td');td.textContent=v;tr.append(td)}el.append(tr)}
function download(name,content,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function generate(){raw=C.generateCohort(num('n',2000,100000),num('seed',1,4294967295));header=Object.keys(raw[0]);source='Generated synthetic cohort';generated=true;run()}
function run(){
 try{
 const v=C.validate(raw,header), t=$('target').value, want=num('want',1,100000), cost=num('cost',1,1000000);
 for(const id of ['results','rank','chart']) $(id).replaceChildren();
 $('checks').textContent=v.missingCols.length?'Missing required columns: '+v.missingCols.join(', '):v.valid.length+' of '+v.n+' rows passed; '+v.excluded.length+' excluded.';
 $('issues').textContent=v.excluded.slice(0,8).map(r=>r.id+': '+r.issues.join('; ')).join('\n');
 $('finding').textContent='';$('cal').textContent='';report='';
 if(!v.valid.length){$('status').textContent='No valid rows.';return}
 C.score(v.valid,C.DEMO_MODEL);
 let calSet,cand;
 if(generated){let k=Math.min(num('ncal',0,v.valid.length),Math.max(0,v.valid.length-1));calSet=v.valid.slice(0,k);cand=v.valid.slice(k);for(const r of calSet)r[t]=r['_true_'+t]}
 else{calSet=v.valid.filter(r=>r[t]===0||r[t]===1);cand=v.valid.filter(r=>r[t]!==0&&r[t]!==1)}
 if(!cand.length){$('status').textContent='No unsequenced candidate rows for this target.';return}
 const cal=C.recalibrate(calSet.map(r=>r['p_'+t]),calSet.map(r=>r[t]));
 const plan=C.plan(cand,t,cal,{target:want,cost,seed:11});
 const names={model:'Model-guided',age:'Age only',random:'Random'}, colors={model:'#14546b',age:'#bd7621',random:'#8393a1'};
 $('finding').textContent=fmt(plan.strategies.model.kExp)+' samples (model-guided)';
 $('cal').textContent=cal.n+' calibration records; '+cal.events+' simulated carriers. Recalibration: '+cal.mode+'.'+(cal.oe==null?'':' Observed/expected before: '+cal.oe.toFixed(2)+'.');
 for(const [k,s] of Object.entries(plan.strategies))cellRow($('results'),[names[k],fmt(s.kExp),money(s.costExp),fmt(s.kConf)]);
 const svg=$('chart'), ns='http://www.w3.org/2000/svg';
 const xmax=Math.max(1,Math.min(plan.n,Math.ceil(1.15*Math.max(...Object.values(plan.strategies).map(s=>s.kExp||plan.n))))), ymax=Math.max(1,want*1.15,plan.strategies.model.curve.E[xmax]*1.05);
 const x=k=>48+570*k/xmax,y=p=>230-200*p/ymax;
 function el(tag,attrs,txt){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(txt)e.textContent=txt;svg.append(e)}
 for(let i=0;i<=4;i++){const yy=y(i*ymax/4);el('line',{x1:48,y1:yy,x2:618,y2:yy,stroke:'#dbe3e8'});el('text',{x:40,y:yy+4,'text-anchor':'end','font-size':11},fmt(i*ymax/4));el('text',{x:x(i*xmax/4),y:248,'text-anchor':'middle','font-size':11},fmt(i*xmax/4))}
 el('text',{x:330,y:264,'text-anchor':'middle','font-size':11},'Samples sequenced');
 el('line',{x1:48,y1:y(want),x2:618,y2:y(want),stroke:'#526578','stroke-dasharray':'4 4'});
 for(const [k,s] of Object.entries(plan.strategies)){const points=[];for(let i=0;i<=250;i++){const j=Math.floor(i*xmax/250);points.push(x(j)+','+y(s.curve.E[j]))}el('polyline',{points:points.join(' '),fill:'none',stroke:colors[k],'stroke-width':2.7})}
 Object.keys(names).forEach((k,i)=>el('text',{x:48+i*150,y:15,fill:colors[k],'font-size':12},names[k]));
 plan.strategies.model.order.slice(0,15).forEach((i,r)=>cellRow($('rank'),[r+1,cand[i].id,cand[i].age,(plan.probs[i]*100).toFixed(2)+'%']));
 report=['CLONALYST RESEARCH DEMONSTRATION','Illustrative coefficients; synthetic inputs only; not validated.',source,$('checks').textContent,$('cal').textContent,'Target: '+C.TARGETS[t]+'; carriers: '+want+'; cost per sample: $'+cost,...Object.entries(plan.strategies).map(([k,s])=>names[k]+': '+fmt(s.kExp)+' samples; '+money(s.costExp)+'; approximate 95% count '+fmt(s.kConf))].join('\n');
 $('status').textContent=source+' · '+cand.length+' candidate records';
 }catch(e){$('status').textContent='Unable to run: '+e.message}
}
$('generate').onclick=generate;$('run').onclick=run;$('target').onchange=()=>{$('want').value=$('target').value==='ch_any'?100:20;run()};
$('file').onchange=async e=>{const f=e.target.files[0];if(!f)return;const v=C.parseCSV(await f.text());raw=v.rows;header=v.header;generated=false;source='Synthetic CSV: '+f.name;run()};
$('download').onclick=()=>{if(report)download('clonalyst-report.txt',report,'text/plain')};
$('sample').onclick=()=>{const rows=C.generateCohort(20000,42,{errors:false}),fields=[...C.REQUIRED,...C.OUTCOMES];download('clonalyst-synthetic.csv',[fields.join(','),...rows.map((r,i)=>fields.map(k=>C.OUTCOMES.includes(k)?(i<2000?r['_true_'+k]:''):r[k]).join(','))].join('\n'),'text/csv')};
generate();
})();