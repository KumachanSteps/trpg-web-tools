const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
function I18N(key){return (window.NPCDataReaderLanguage&&window.NPCDataReaderLanguage.t)?window.NPCDataReaderLanguage.t(key):key;}
function systemLabel(code){return code==='coc7'?I18N('coc7'):code==='coc6'?I18N('coc6'):I18N('generic');}
const SAMPLE=`カルティスト、名もなき神の信者
STR 60　CON 70　SIZ 60　DEX 60　INT 50
APP 35　POW 50　EDU 60　正気度 0　耐久力 13
DB：+0　ビルド：0　移動：8　MP：10
1ラウンドの戦闘回数：1（ナイフ、または首を絞める）
近接戦闘（格闘）60%（30/12）、ダメージ 1D3+1+DB（ナイフ）
首を絞める（mnvr）
ダメージ 1D3+DB（素手）
回避 30%（15/6）`;
let state={name:'カルティスト',title:'名もなき神の信者',nameMode:'full',system:'auto',resolved:'coc7',status:{hp:'13',mp:'10',san:'0',db:'+0',build:'0',move:'8'},abilities:{STR:'60',CON:'70',SIZ:'60',DEX:'60',INT:'50',APP:'35',POW:'50',EDU:'60'},combat:[{name:'近接戦闘（格闘）',value:'60',damage:'1D3+1+DB（ナイフ）'},{name:'首を絞める（mnvr）',value:'',damage:'1D3+DB（素手）'},{name:'回避',value:'30',damage:''}],armor:'',skills:[],spells:[],memo:'カルティスト',manualPalette:false};
function fullKomaName(){return [state.name,state.title].filter(Boolean).join(' / ')}
function selectedKomaName(){return state.nameMode==='short'?(state.name||'NPC'):(fullKomaName()||state.name||'NPC')}
function normalize(s){return (s||'').replace(/％/g,'%').replace(/／/g,'/').replace(/＋/g,'+').replace(/：/g,':').replace(/　/g,' ').trim()}
function stripHard(s){return s.replace(/[（(]\s*\d+\s*[/／]\s*\d+\s*[）)]/g,'').trim()}
function isNoDataText(v){const s=normalize(v).replace(/[。．.！!？?\s]/g,'').toLowerCase(); return !s || ['なし','無し','無','ない','ありません','特になし','とくになし','none','no','n/a','na','-','ー','―','—','なしなし'].includes(s);}
function parseNum(re,text){const m=text.match(re);return m?m[1]:''}
function cleanNpcHeading(line){
  let s=normalize(line).replace(/^\s*(?:NPC|名前|Name)\s*[:：]\s*/i,'');
  s=s.replace(/^\s*[●◆◇■□★☆]+\s*/,'').replace(/^\s*・\s*/,'');
  s=s.replace(/\s*・\s*[◆◇■□★☆]*\s*$/,'').replace(/[◆◇■□★☆]+\s*$/,'').trim();
  return s || 'NPC';
}
function looksLikeSection(line){return /^\s*(?:[・●◆◇■□★☆]*\s*)?(?:性格|能力|背景|その他|ステータス|技能|装甲|シナリオ内使用呪文|取得呪文|呪文|年齢|性別|身長|6版|7版)(?:[:：\s]|$)/.test(normalize(line));}
function extractNameAndTitle(lines){
  const firstRaw=lines[0]||'';
  let first=cleanNpcHeading(firstRaw);
  let name=first, title='';
  if(/[、,]/.test(first)){ const parts=first.split(/[、,]/).map(x=>x.trim()).filter(Boolean); name=parts.shift()||first; title=parts.join('、'); }
  for(let i=1;i<Math.min(lines.length,8);i++){
    const line=normalize(lines[i]);
    if(!line || looksLikeSection(line) || /^(STR|CON|SIZ|DEX|INT|APP|POW|EDU|SAN|HP|MP|DB)\b/i.test(line)) continue;
    const dash=line.match(/^(.+?)\s*[-–—―]\s*(.+)$/);
    if(dash){ title=dash[2].trim(); break; }
    if(!title && !/^[A-Za-z][A-Za-z\s.'’]+$/.test(line)){ title=line.trim(); break; }
  }
  return {name:cleanNpcHeading(name), title:cleanNpcHeading(title).replace(/^NPC$/,'')};
}
function abilitySourceFor(raw){
  const n=normalize(raw);
  const idx7=n.search(/(?:^|\n)\s*7版/);
  const idx6=n.search(/(?:^|\n)\s*6版/);
  if(idx7>=0){ const after=n.slice(idx7); const san=after.search(/(?:^|\n)\s*(?:SAN|正気度|耐久力|HP|マジックポイント|MP|ダメージボーナス|DB)\b/i); return san>0?after.slice(0,san):after; }
  if(idx6>=0){ const after=n.slice(idx6); const idxNext=after.search(/(?:^|\n)\s*7版/); const san=after.search(/(?:^|\n)\s*(?:SAN|正気度|耐久力|HP|マジックポイント|MP|ダメージボーナス|DB)\b/i); let end=[idxNext,san].filter(x=>x>0).sort((a,b)=>a-b)[0]; return end?after.slice(0,end):after; }
  return n;
}
function isCombatSkillName(name){return /近接|回避|こぶし|キック|拳銃|クラヴマガ|ナイフ|戦闘|投擲|武器|格闘|マーシャルアーツ|組み付き|組みつき/.test(name||'')}
function tailAfterStatLines(raw){
  const lines=raw.split(/\n+/); let last=-1;
  lines.forEach((line,i)=>{const n=normalize(line); if(/^(?:[・\s]*)?(?:ステータス|6版|7版)$/.test(n)||/^(STR|CON|SIZ|DEX|INT|APP|POW|EDU)\b/i.test(n)||/^(SAN|正気度|耐久力|耐久|HP|マジックポイント|MP|ダメージボーナス|ダメボ|DB|ビルド|移動)(?:[:：\s+\-]|$)/i.test(n)) last=i;});
  return last>=0?lines.slice(last+1).join('\n'):raw;
}

function isNonSkillName(name){
  const s=normalize(name).replace(/[\s:：]/g,'');
  return /^(STR|CON|SIZ|DEX|INT|APP|POW|EDU|SAN|HP|MP|DB|正気度|耐久力|耐久|体力|マジックポイント|ダメージボーナス|ダメボ|ビルド|移動|年齢|性別|身長|6版|7版)/i.test(s);
}
function extractSpells(raw){
  const spells=[]; const seen=new Set();
  const add=v=>{v=normalize(v).replace(/^[-・●◆◇■□★☆\s]+/,'').trim(); if(!v||isNoDataText(v))return; if(!seen.has(v)){seen.add(v);spells.push(v);}};
  const text=raw.replace(/\r\n?/g,'\n');
  const inlineRe=/(?:取得呪文|使用呪文|呪文)\s*[:：]\s*([^\n]+)/g;
  let m; while((m=inlineRe.exec(text))) add(m[1]);
  const blockRe=/\[\s*シナリオ内使用呪文\s*\]([\s\S]*?)(?=\n\s*\[[^\]]+\]|\n\s*[●◆◇■□★☆]|$)/g;
  while((m=blockRe.exec(text))){
    m[1].split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(line=>{
      if(!/^\[/.test(line) && !looksLikeSection(line)) add(line);
    });
  }
  return spells;
}
function collectLooseSkills(text){
  const result=[]; const seen=new Set(); const src=normalize(stripHard(text));
  const add=(name,value)=>{name=normalize(name).replace(/^[・\-\s]+/,'').trim(); if(!name||isNonSkillName(name)||/^(他|その他|技能|戦闘技能|所持技能|特技)$/.test(name)||/^他\s/.test(name))return; const key=name+'|'+value; if(!seen.has(key)){seen.add(key);result.push({name,value});}};
  let re=/([^\n、,。%]+?(?:[（(][^0-9%）)]*?[）)])?)\s*[（(]\s*(\d{1,3})\s*%?\s*[）)]/g, m;
  while((m=re.exec(src))) add(m[1],m[2]);
  src.split(/[、,。\n]+/).forEach(item=>{const m=normalize(item).match(/^(.+?)\s*(\d{1,3})\s*%?$/); if(m) add(m[1],m[2]);});
  return result;
}
function parseText(text){
 const raw=text.trim(); const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean); const nt=extractNameAndTitle(lines); state.name=nt.name; state.title=nt.title; state.memo=state.name; state.nameMode=state.title?'full':'short';
 const t=normalize(raw); const abilSrc=abilitySourceFor(raw); ['STR','CON','SIZ','DEX','APP','POW','INT','EDU'].forEach(k=>state.abilities[k]=parseNum(new RegExp(k+'\\s*:?\\s*(\\d+)','i'),abilSrc));
 state.status.san=parseNum(/(?:正気度|SAN)\s*:?\s*(\d+)/i,t); state.status.hp=parseNum(/(?:耐久力|耐久|HP|体力)\s*:?\s*(\d+)/i,t); state.status.mp=parseNum(/(?:マジックポイント|MP)\s*:?\s*([+-]?\d+)/i,t); state.status.db=parseNum(/(?:ダメージボーナス|ダメボ|DB)\s*:?\s*([^\s]+)/i,t); state.status.build=parseNum(/ビルド\s*:?\s*([^\s]+)/i,t); state.status.move=parseNum(/移動\s*:?\s*([^\s]+)/i,t);
 state.resolved=(/7版/.test(raw)||/ビルド|移動/.test(raw)||Object.values(state.abilities).some(v=>Number(v)>20))?'coc7':'coc6';
 state.combat=[]; state.skills=[]; state.spells=extractSpells(raw); state.armor=''; let skillPart='';
 const skillIdx=raw.search(/(?:\[技能\]|技能[:：]|所持技能[:：]|特技[:：])/); const beforeSkill=skillIdx>=0?raw.slice(0,skillIdx):raw; if(skillIdx>=0) skillPart=raw.slice(skillIdx).replace(/^.*?(?:\[技能\]|技能[:：]|所持技能[:：]|特技[:：])/s,'');
 const armorMatch=raw.match(/(?:装甲|防具|防御)[:：]\s*([^\n]+)/); if(armorMatch){ const armorValue=armorMatch[1].trim(); state.armor=isNoDataText(armorValue)?'':armorValue; }
 beforeSkill.split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(line=>{let n=normalize(stripHard(line)); if(looksLikeSection(n)) return; if(isNonSkillName(n)) return; if(/^ダメージ\s+/.test(n)){ if(state.combat.length) state.combat[state.combat.length-1].damage=n.replace(/^ダメージ\s+/,''); return; }
   const m=n.match(/^(.+?)\s*(\d+)%\s*(?:、|,)?\s*(?:ダメージ\s*(.+))?$/); if(m && (isCombatSkillName(m[1]) || m[3])){state.combat.push({name:m[1].trim(),value:m[2],damage:(m[3]||'').trim()}); return;} if(/戦闘回数|mnvr|ダメージ|参照|首を絞める|切りつける|ナイフ|こぶし|キック|拳銃|クラヴマガ|回避/.test(n) && !/^[A-Z]{3}/.test(n)) state.combat.push({name:n,value:'',damage:''}); });
 state.skills=collectLooseSkills(skillPart);
 if(!state.skills.length && /\[技能\]/.test(raw)){ const after=raw.split(/\[技能\]/).slice(1).join('\n'); state.skills=collectLooseSkills(after); }
 if(!state.skills.length && skillIdx<0){ state.skills=collectLooseSkills(tailAfterStatLines(raw)).filter(r=>!isCombatSkillName(r.name)); }
 render();}
function commandPrefix(){return state.resolved==='coc6'?'CCB<=':state.resolved==='generic'?'1D100<=':'CC<='}
function damageLine(d){let s=normalize(d).replace(/DB/g,'{DB}'); let label='ダメージ'; const note=s.match(/[（(]([^）)]+)[）)]/); if(note){label+='（'+note[1]+'）'; s=s.replace(/[（(][^）)]+[）)]/g,'').trim();} return s?`${s} 【${label}】`:'';}
function generatePalette(){const pre=commandPrefix(); let out=[]; if(state.combat.some(r=>r.name||r.damage)){out.push('// ▼ 戦闘'); state.combat.forEach(r=>{if(r.value) out.push(`${pre}${r.value} 【${r.name}】`); else if(r.name) out.push(r.name); const dl=damageLine(r.damage); if(dl) out.push(dl);});}
 if(state.armor.trim() && !isNoDataText(state.armor)) out.push('', '// ▼ 装甲', state.armor.trim()); if(state.skills.length){out.push('', '// ▼ 技能'); state.skills.forEach(r=>{if(r.name&&r.value)out.push(`${pre}${r.value} 【${r.name}】`)});} if(state.spells&&state.spells.length){out.push('', '// ▼ 呪文'); state.spells.forEach(x=>out.push(x));} const abs=Object.entries(state.abilities).filter(([k,v])=>v!==''&&v!=null); if(abs.length){out.push('', '// ▼ 能力値'); abs.forEach(([k,v])=>out.push(`${pre}${v} 【${k}】`));} return out.join('\n').trim();}
function generateJson(){const commands=$('#paletteOutput').value; const params=[...Object.entries(state.abilities).filter(([k,v])=>v).map(([label,value])=>({label,value:String(value)})),{label:'DB',value:String(state.status.db||'')},{label:'ビルド',value:String(state.status.build||'')},{label:'移動',value:String(state.status.move||'')}].filter(x=>x.value!==''); const status=['HP','MP','SAN'].map(label=>{const key=label.toLowerCase(); return {label,value:Number(state.status[key]||0),max:Number(state.status[key]||0)}}); return JSON.stringify({kind:'character',data:{name:selectedKomaName(),initiative:Number(state.abilities.DEX||0),memo:state.memo||state.name,status,params,commands}},null,2)}
function rowActionButtons(type,i){return `<div class="row-actions"><button type="button" class="grab" draggable="true" data-grab-type="${type}" data-grab-index="${i}" title="ドラッグして並べ替え" aria-label="ドラッグして並べ替え">☰</button><button type="button" class="del" data-del-${type}="${i}" title="削除" aria-label="削除">×</button></div>`}
function renderRows(){const cb=$('#combatBody'); cb.innerHTML=''; state.combat.forEach((r,i)=>cb.insertAdjacentHTML('beforeend',`<tr data-row-type="combat" data-row-index="${i}"><td><input data-combat-name="${i}" value="${esc(r.name)}"></td><td><input data-combat-value="${i}" value="${esc(r.value)}"></td><td><input data-combat-damage="${i}" value="${esc(r.damage)}"></td><td>${rowActionButtons('combat',i)}</td></tr>`)); const sb=$('#skillBody'); sb.innerHTML=''; state.skills.forEach((r,i)=>sb.insertAdjacentHTML('beforeend',`<tr data-row-type="skill" data-row-index="${i}"><td><input data-skill-name="${i}" value="${esc(r.name)}"></td><td><input data-skill-value="${i}" value="${esc(r.value)}"></td><td>${rowActionButtons('skill',i)}</td></tr>`));}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function render(){ $('#npcName').value=state.name; $('#npcTitle').value=state.title; $('#systemMode').value=state.system; $('#resolvedSystem').value=systemLabel(state.resolved); $('#systemBadge').textContent=I18N('autoDetected')+$('#resolvedSystem').value; const shortBadge=$('#nameModeShort'); const fullBadge=$('#nameModeFull'); if(shortBadge){shortBadge.textContent=state.name||'NPC'; shortBadge.classList.toggle('active',state.nameMode==='short'); shortBadge.setAttribute('aria-pressed',state.nameMode==='short'?'true':'false');} if(fullBadge){fullBadge.textContent=fullKomaName()||state.name||'NPC'; fullBadge.classList.toggle('active',state.nameMode!=='short'); fullBadge.setAttribute('aria-pressed',state.nameMode!=='short'?'true':'false');} Object.entries(state.status).forEach(([k,v])=>{const el=$(`[data-status="${k}"]`); if(el)el.value=v}); Object.entries(state.abilities).forEach(([k,v])=>{const el=$(`[data-ability="${k}"]`); if(el)el.value=v}); $('#armorText').value=state.armor; $('#memoText').value=state.memo; renderRows(); if(!state.manualPalette) $('#paletteOutput').value=generatePalette(); $('#jsonOutput').value=generateJson(); requestAnimationFrame(adjustLayout);}
function updateFromFields(){state.name=$('#npcName').value;state.title=$('#npcTitle').value;state.system=$('#systemMode').value; state.resolved=state.system==='auto'?state.resolved:state.system; $$('[data-status]').forEach(e=>state.status[e.dataset.status]=e.value); $$('[data-ability]').forEach(e=>state.abilities[e.dataset.ability]=e.value); state.armor=$('#armorText').value; state.memo=$('#memoText').value; state.combat.forEach((r,i)=>{r.name=($(`[data-combat-name="${i}"]`)||{}).value||'';r.value=($(`[data-combat-value="${i}"]`)||{}).value||'';r.damage=($(`[data-combat-damage="${i}"]`)||{}).value||''}); state.skills.forEach((r,i)=>{r.name=($(`[data-skill-name="${i}"]`)||{}).value||'';r.value=($(`[data-skill-value="${i}"]`)||{}).value||''}); state.manualPalette=false; render();}
function adjustLayout(){
  if(innerWidth<=1050)return;
  const mainH=$('#mainArea').clientHeight;
  const gap=16;
  const maxTop=Math.floor((mainH-gap)*0.5);
  const minTop=260;
  const desired=Math.max(minTop, Math.min(maxTop, Math.round(mainH*0.46)));
  document.documentElement.style.setProperty('--left-top-card-h', desired+'px');

  const cardBodyExtra=53+28+56;
  const inputH=Math.max(86, desired-cardBodyExtra);
  document.documentElement.style.setProperty('--left-input-h', inputH+'px');

  // Keep the right column total height aligned to the natural height of the middle column.
  // Use the actual rendered chat palette panel height instead of the target left panel height,
  // because the note line / padding can make the card a few pixels taller.
  const middleH=$('#middleCard').offsetHeight;
  const chatH=$('#chatPaletteCard').offsetHeight || desired;
  const jsonH=Math.max(260, middleH - chatH - gap);
  document.documentElement.style.setProperty('--right-json-card-h', jsonH+'px');

  const body=$('#jsonCard .card-body');
  const note=$('#jsonCard .output-note');
  const jsonBox=$('#jsonOutput');
  if(body && note && jsonBox){
    const cs=getComputedStyle(body);
    const padY=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
    const bodyH=Math.max(0, jsonH - 53);
    const noteH=note.offsetHeight;
    const boxH=Math.max(120, bodyH - padY - noteH - 12);
    jsonBox.style.height=boxH+'px';
  }
}

let dragState=null;
function syncRowInputs(type){
  if(type==='combat') state.combat.forEach((r,i)=>{r.name=($(`[data-combat-name="${i}"]`)||{}).value||'';r.value=($(`[data-combat-value="${i}"]`)||{}).value||'';r.damage=($(`[data-combat-damage="${i}"]`)||{}).value||''});
  if(type==='skill') state.skills.forEach((r,i)=>{r.name=($(`[data-skill-name="${i}"]`)||{}).value||'';r.value=($(`[data-skill-value="${i}"]`)||{}).value||''});
}
function moveRow(type,from,to){
  const list=type==='combat'?state.combat:state.skills;
  if(!list || from===to || from<0 || to<0 || from>=list.length || to>=list.length) return;
  const [item]=list.splice(from,1);
  list.splice(to,0,item);
  state.manualPalette=false;
  render();
}
function toast(m){$('#toast').textContent=m;$('#toast').classList.add('show');setTimeout(()=>$('#toast').classList.remove('show'),1300)}
function resetToDefault(){state={name:'カルティスト',title:'名もなき神の信者',nameMode:'full',system:'auto',resolved:'coc7',status:{hp:'13',mp:'10',san:'0',db:'+0',build:'0',move:'8'},abilities:{STR:'60',CON:'70',SIZ:'60',DEX:'60',INT:'50',APP:'35',POW:'50',EDU:'60'},combat:[{name:'近接戦闘（格闘）',value:'60',damage:'1D3+1+DB（ナイフ）'},{name:'首を絞める（mnvr）',value:'',damage:'1D3+DB（素手）'},{name:'回避',value:'30',damage:''}],armor:'',skills:[],spells:[],memo:'カルティスト',manualPalette:false}; $('#rawInput').value=SAMPLE; render();}
window.NPCDataReader={toast,resetToDefault,render};
document.addEventListener('input',e=>{ if(e.target.id==='paletteOutput'){state.manualPalette=true; $('#jsonOutput').value=generateJson(); return;} if(e.target.closest('#middleCol')) updateFromFields(); });
document.addEventListener('click',e=>{ if(e.target.dataset.nameMode){state.nameMode=e.target.dataset.nameMode; render(); return;} if(e.target.id==='parseBtn'){state.manualPalette=false; parseText($('#rawInput').value||SAMPLE)} if(e.target.id==='sampleBtn'){$('#rawInput').value=SAMPLE;state.manualPalette=false;parseText(SAMPLE)} if(e.target.id==='clearBtn'){$('#rawInput').value=''} if(e.target.id==='addCombatBtn'){state.combat.push({name:'',value:'',damage:''});render()} if(e.target.id==='addSkillBtn'){state.skills.push({name:'',value:''});render()} if(e.target.dataset.delCombat){state.combat.splice(Number(e.target.dataset.delCombat),1);render()} if(e.target.dataset.delSkill){state.skills.splice(Number(e.target.dataset.delSkill),1);render()} if(e.target.id==='copyPaletteBtn')navigator.clipboard.writeText($('#paletteOutput').value).then(()=>toast(I18N('copiedPalette'))); if(e.target.id==='copyJsonBtn')navigator.clipboard.writeText($('#jsonOutput').value).then(()=>toast(I18N('copiedJson'))); if(e.target.id==='themeBtn'){document.body.classList.toggle('light');adjustLayout()}});

document.addEventListener('dragstart',e=>{
  const handle=e.target.closest('.grab');
  if(!handle) return;
  const type=handle.dataset.grabType;
  syncRowInputs(type);
  dragState={type,from:Number(handle.dataset.grabIndex)};
  const row=handle.closest('tr');
  if(row) row.classList.add('dragging');
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',`${type}:${dragState.from}`);
});
document.addEventListener('dragover',e=>{
  if(!dragState) return;
  const row=e.target.closest('tr[data-row-type]');
  if(!row || row.dataset.rowType!==dragState.type) return;
  e.preventDefault();
  e.dataTransfer.dropEffect='move';
  $$('tr.drop-target').forEach(r=>r.classList.remove('drop-target'));
  row.classList.add('drop-target');
});
document.addEventListener('drop',e=>{
  if(!dragState) return;
  const row=e.target.closest('tr[data-row-type]');
  if(row && row.dataset.rowType===dragState.type){
    e.preventDefault();
    moveRow(dragState.type,dragState.from,Number(row.dataset.rowIndex));
  }
  $$('tr.drop-target,tr.dragging').forEach(r=>r.classList.remove('drop-target','dragging'));
  dragState=null;
});
document.addEventListener('dragend',()=>{
  $$('tr.drop-target,tr.dragging').forEach(r=>r.classList.remove('drop-target','dragging'));
  dragState=null;
});
addEventListener('resize',adjustLayout); $('#rawInput').value=SAMPLE; render();