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
function createInitialState(){return {name:'',title:'',nameMode:'short',system:'auto',resolved:'coc7',status:{hp:'',mp:'',san:'',db:'',build:'',move:'',armor:'',ammo:'',weaponHp:''},abilities:{STR:'',CON:'',SIZ:'',DEX:'',INT:'',APP:'',POW:'',EDU:''},combat:[],armor:'',skills:[],spells:[],powers:[],equipment:[],memo:'',manualPalette:false,commandAddon:false};}
let state=createInitialState();
function fullKomaName(){return [state.name,state.title].filter(Boolean).join(' / ')}
function selectedKomaName(){return state.nameMode==='short'?(state.name||'NPC'):(fullKomaName()||state.name||'NPC')}
function normalize(s){return (s||'').replace(/％/g,'%').replace(/／/g,'/').replace(/＋/g,'+').replace(/：/g,':').replace(/　/g,' ').trim()}
function normalizePdfWraps(s){
  return (s||'')
    .replace(/クトゥル\s*\n\s*フ神話/g,'クトゥルフ神話')
    .replace(/クトゥル\s+フ神話/g,'クトゥルフ神話');
}
function statAndActionSourceFor(raw){
  const n=raw||'';
  const idx=n.search(/能力値\s*[:：]/);
  return idx>=0?n.slice(idx):n;
}
function removeEquipmentBlock(raw){
  const lines=(raw||'').replace(/\r\n?/g,'\n').split(/\n/);
  const kept=[];
  let inEquip=false;
  for(const rawLine of lines){
    const line=normalize(rawLine);
    if(/^(?:装備|所持品|武器)\s*[:：]?$/i.test(line) || /^\[\s*武器\s*\]$/.test(line)){inEquip=true; continue;}
    if(inEquip && (/^\[.+\]$/.test(line) || /^§\s*\S+/.test(line) || /^▼\s*\S+/.test(line) || /^【\s*エネミー\s*[:：]/.test(line))){inEquip=false;}
    if(!inEquip) kept.push(rawLine);
  }
  return kept.join('\n');
}
function stripHard(s){return s.replace(/[（(]\s*\d+\s*[/／]\s*\d+\s*[）)]/g,'').trim()}
function isNoDataText(v){const s=normalize(v).replace(/[。．.！!？?\s]/g,'').toLowerCase(); return !s || ['なし','無し','無','ない','ありません','特になし','とくになし','none','no','n/a','na','-','ー','―','—','なしなし'].includes(s);}
function parseNum(re,text){const m=text.match(re);return m?m[1]:''}
function cleanNpcHeading(line){
  let s=normalize(line);
  s=s.replace(/^\s*(?:NPC|名前|Name|デフォルト名)\s*[:：]\s*/i,'');
  s=s.replace(/^\s*§\s*/,'');
  s=s.replace(/^\s*▼\s*エネミーデータ\s*[\/／]\s*/,'');
  s=s.replace(/^\s*▼\s*/,'');
  s=s.replace(/^\s*【\s*エネミー\s*[:：]\s*/,'').replace(/】\s*$/,'');
  s=s.replace(/^\s*\[\s*敵情報\s*[:：]\s*/,'').replace(/\]\s*$/,'');
  s=s.replace(/^\s*[●◆◇■□★☆]+\s*/,'').replace(/^\s*・\s*/,'');
  s=s.replace(/\s*・\s*[◆◇■□★☆]*\s*$/,'').replace(/[◆◇■□★☆]+\s*$/,'').trim();
  return s || 'NPC';
}
function isNpcBlockHeading(line){
  const s=normalize(line);
  if(!s || looksLikeSection(s)) return false;
  if(/^[（(].*[）)]$/.test(s)) return false;
  if(/\(mnvr\)|（mnvr）|^ダメージ\b|^1\s*ラウンド/.test(s)) return false;
  if(/^(?:CCB|CC|1D100)\s*<=/i.test(s) || /^\d+d\d+/i.test(s)) return false;
  if(/^(?:しかし|また|さらに|その|この|あの|彼|彼女|探索者|キーパー|近頃|親しい|シナリオ|ある神話研究家|対象|捕まえられた者|もしくは|または|あるいは|か)/.test(s)) return false;
  if(/^(?:もしくは|または|あるいは|か)\s*\d+d\d+/i.test(s)) return false;
  if(/^§\s*\S+/.test(s)) return true;
  if(/^デフォルト名\s*[:：]\s*\S+/.test(s)) return true;
  if(/^▼\s*エネミーデータ\s*[\/／]\s*\S+/.test(s)) return true;
  if(/^▼\s*[^:：\n]{1,40}$/.test(s) && !looksLikeSection(s)) return true;
  if(/^【\s*エネミー\s*[:：]\s*.+?】$/.test(s)) return true;
  if(/^\[\s*敵情報\s*[:：]\s*.+?\]$/.test(s)) return true;
  const commaHeading=s.match(/^([^:：\n%％。.!！？?]{1,30})[、,]([^%％\n。.!！？?]{1,60})$/);
  if(commaHeading){
    const head=commaHeading[1].trim();
    const headNoParen=head.replace(/[（(][^）)]*[）)]/g,'').trim();
    const looksLikeName=/^[一-龠々ァ-ヶーA-Za-z・\s]+(?:[（(][^）)]+[）)])?$/.test(head) && headNoParen.length>=2 && headNoParen.length<=18;
    const hasAgeParen=/[（(][^）)]*\d+\s*歳[^）)]*[）)]/.test(head);
    const bodyLike=/^(?:しかし|また|さらに|その|この|あの|彼|彼女|探索者|キーパー|近頃|親しい|シナリオ|ある神話研究家|対象|捕まえられた者|約?\d+年前|\d+年前)/.test(head);
    if(looksLikeName && !bodyLike && !isNonSkillName(s) && (hasAgeParen || !/[0-9０-９]/.test(headNoParen))) return true;
  }
  if(/^●\s*\S+/.test(s)) return true;
  if(/^◆\s*・?\s*.+?・?\s*◆$/.test(s)) return true;
  if(/[%％]|ダメージ/i.test(s)) return false;
  if(/^・\s*[^・]+[（(][^）)]+[）)]\s*$/.test(s)) return true;
  if(/^[^:：\n]{1,60}[（(][^）)]+[）)]\s*[、,].+/.test(s) && !isNonSkillName(s)) return true;
  if(/^[^:：\n]{1,40}[（(][^）)]+[）)]\s*$/.test(s) && !isNonSkillName(s)) return true;
  return false;
}
function selectFirstNpcBlock(raw){
  const lines=raw.replace(/\r\n?/g,'\n').split(/\n/);
  const starts=[];
  lines.forEach((line,i)=>{ if(isNpcBlockHeading(line)) starts.push(i); });
  if(!starts.length) return raw;
  const start=starts[0];
  const end=starts.find(i=>i>start);
  return lines.slice(start, end||lines.length).join('\n').trim();
}
function stripReadingFromLooseName(name, firstRaw){
  const raw=normalize(firstRaw||'');
  const n=normalize(name);
  if(/^◆/.test(raw)) return n;
  const m=n.match(/^(.*?)\s*[（(]([^）)]+)[）)]\s*$/);
  if(m){
    const note=normalize(m[2]);
    // Only remove furigana-like Japanese readings. Keep codenames such as （R）.
    if(/^[ぁ-んァ-ヶー\s]+$/.test(note)) return m[1].trim() || n;
  }
  return n;
}
function normalizeDbValue(value){
  let v=normalize(value||'').trim();
  if(!v) return '';
  v=v.replace(/^DB\s*[:：]?\s*/i,'');
  if(/^\d+D\d+/i.test(v)) v='+'+v;
  return v.replace(/d/ig,'D');
}
function looksLikeSection(line){return /^\s*(?:[・●◆◇■□★☆]*\s*)?(?:[【\[]?\s*)?(?:性格|能力|背景|その他|ステータス|能力値|技能|装甲|シナリオ内使用呪文|取得呪文|呪文|年齢|性別|身長|6版|7版)(?:\s*[】\]]|[:：\s]|$)/.test(normalize(line));}
function extractNameAndTitle(lines){
  const firstRaw=lines[0]||'';
  const firstNorm=normalize(firstRaw);
  let first=cleanNpcHeading(firstRaw);
  let name=first, title='';
  if(/^▼\s*エネミーデータ\s*[\/／]/.test(firstNorm)) title='エネミーデータ';
  if(/^【\s*エネミー\s*[:：]/.test(firstNorm)) {
    title='';
    const enemyNameMatch=first.match(/^(.+?)[（(]([^）)]+)[）)]$/);
    if(enemyNameMatch){ name=enemyNameMatch[1].trim(); title=enemyNameMatch[2].trim(); }
    else title='エネミー';
  }
  if(/^\[\s*敵情報\s*[:：]/.test(firstNorm)) title='敵情報';
  if(/[、,]/.test(first) && !/^【\s*エネミー\s*[:：]/.test(firstNorm)){ const parts=first.split(/[、,]/).map(x=>x.trim()).filter(Boolean); name=parts.shift()||first; title=title||parts.join('、'); }
  for(let i=1;i<Math.min(lines.length,8);i++){
    const line=normalize(lines[i]);
    if(!line) continue;
    if(looksLikeSection(line) || /^(STR|CON|SIZ|DEX|INT|APP|POW|EDU|SAN|HP|MP|DB|MOV|BLD)\b/i.test(line)) break;
    const dash=line.match(/^(.+?)\s*[-–—―]\s*(.+)$/);
    if(dash){ title=dash[2].trim(); break; }
    if(!title && !/^[A-Za-z][A-Za-z\s.'’]+$/.test(line)){
      title=line.trim();
      if(/^§/.test(firstNorm)){
        const nextLine=normalize(lines[i+1]||'');
        if(nextLine && /^[のをにへがとで、。]/.test(nextLine)){ title=(title+nextLine).replace(/\s+/g,' '); }
      }
      break;
    }
  }
  name=stripReadingFromLooseName(cleanNpcHeading(name), firstRaw);
  title=cleanNpcHeading(title).replace(/^NPC$/,'').replace(/(\d+)\s+歳/g,'$1歳').replace(/\s+/g,' ').replace(/街\s+の/g,'街の');
  return {name, title};
}
function abilitySourceFor(raw){
  const n=normalize(raw);
  const idx7=n.search(/(?:^|\n)\s*7版/);
  const idx6=n.search(/(?:^|\n)\s*6版/);
  if(idx7>=0){ const after=n.slice(idx7); const san=after.search(/(?:^|\n)\s*(?:SAN|正気度|耐久力|HP|マジックポイント|MP|ダメージボーナス|DB)\b/i); return san>0?after.slice(0,san):after; }
  if(idx6>=0){ const after=n.slice(idx6); const idxNext=after.search(/(?:^|\n)\s*7版/); const san=after.search(/(?:^|\n)\s*(?:SAN|正気度|耐久力|HP|マジックポイント|MP|ダメージボーナス|DB)\b/i); let end=[idxNext,san].filter(x=>x>0).sort((a,b)=>a-b)[0]; return end?after.slice(0,end):after; }
  return n;
}
function isCombatSkillName(name){return /近接|回避|こぶし|キック|拳銃|射撃|ショットガン|警棒|棍棒|クラヴマガ|ナイフ|戦闘|投擲|武器|格闘|マーシャルアーツ|組み付き|組みつき|触手|触肢|発火|瞬間移動|アサルトライフル|ライフル|リボルバー|群れ攻撃|噛みつき|鉤爪|鍵爪/.test(name||'')}
function tailAfterStatLines(raw){
  const lines=raw.split(/\n+/); let last=-1;
  lines.forEach((line,i)=>{
    const n=normalize(line);
    const statLine=/^(?:[・\s]*)?(?:ステータス|6版|7版)$/.test(n)
      || /^(?:[◎◆◇■□★☆●・\s]*)?(?:ステータス例|能力値)\s*[:：]?\s*(?:STR|CON|SIZ|DEX|INT|APP|POW|EDU)\b/i.test(n)
      || /^(?:[◎◆◇■□★☆●・\s]*)?(?:STR|CON|SIZ|DEX|INT|APP|POW|EDU)\s*[:：]?\s*\d+/i.test(n)
      || /^(?:SAN|正気度|耐久力|耐久|HP|マジックポイント|MP|ダメージボーナス|ダメボ|DB|ビルド|BLD|移動|MOV)(?:[:：\s+\-]|$)/i.test(n);
    if(statLine) last=i;
  });
  return last>=0?lines.slice(last+1).join('\n'):raw;
}

function isNonSkillName(name){
  const s=normalize(name).replace(/[\s:：]/g,'').replace(/^[◎◆◇■□★☆●・]+/,'');
  if(/^(?:ステータス例|ステータス|能力値)?(?:STR|CON|SIZ|DEX|INT|APP|POW|EDU|SAN|HP|MP|DB|BLD|MOV)/i.test(s)) return true;
  return /^(正気度|耐久力|耐久度|耐久値|耐久|体力|マジックポイント|ダメージボーナス|ダメボ|ビルド|移動|装甲|幸運|知識|IDE|年齢|性別|身長|6版|7版)/i.test(s);
}
function extractSpells(raw){
  const spells=[]; const seen=new Set();
  const add=v=>{v=normalize(v).replace(/^[-・●◆◇■□★☆\s、,]+/,'').replace(/[、,。．.]+$/,'').trim(); if(!v||isNoDataText(v))return; if(!seen.has(v)){seen.add(v);spells.push(v);}};
  const addSpellLine=line=>{
    let v=normalize(line||'');
    if(!v) return;
    const bracketed=[...v.matchAll(/《[^》]+》/g)].map(m=>m[0]);
    if(bracketed.length){
      bracketed.forEach(add);
      const rest=v.replace(/《[^》]+》/g,'').replace(/^[、,\s]+/,'').replace(/^ほかに/,'ほかに').trim();
      if(rest) rest.split(/[、,]+/).map(x=>x.trim()).filter(Boolean).forEach(add);
    } else {
      v.split(/[、,]+/).map(x=>x.trim()).filter(Boolean).forEach(add);
    }
  };
  const text=raw.replace(/\r\n?/g,'\n');
  const inlineRe=/(?:取得呪文|使用呪文|呪文)\s*[:：]\s*([^\n]+)/g;
  let m; while((m=inlineRe.exec(text))) addSpellLine(m[1]);
  const blockRe=/\[\s*シナリオ内使用呪文\s*\]([\s\S]*?)(?=\n\s*\[[^\]]+\]|\n\s*[●◆◇■□★☆]|$)/g;
  while((m=blockRe.exec(text))){
    m[1].split(/\n+/).map(x=>x.trim()).filter(Boolean).forEach(line=>{
      if(!/^\[/.test(line) && !looksLikeSection(line)) addSpellLine(line);
    });
  }
  return spells;
}

function extractPowers(raw){
  const powers=[]; const seen=new Set();
  const add=v=>{v=normalize(v).replace(/^[-・●◆◇■□★☆\s]+/,'').trim(); if(!v||isNoDataText(v))return; if(!seen.has(v)){seen.add(v);powers.push(v);}};
  const text=raw.replace(/\r\n?/g,'\n');
  if(/怒りの\s*[「"]?叫び[」"]?/.test(text)){
    add('怒りの「叫び」');
    if(/POWロールに失敗/.test(text) && /1D6ラウンド/.test(text)) add('POWロール失敗で1D6ラウンド行動不能');
    if(/1D6\s*正気度ポイント/.test(text) || /1D6\s*SAN/i.test(text)) add('1D6 【正気度喪失（1時間ごと）】');
  }
  return powers;
}

function compactWeaponName(v){
  return normalize(v||'')
    .replace(/\s+(?=(?:ゲージ|口径|mm|ｍｍ|リボルバー|ショットガン|ライフル|拳銃|スタンガン))/g,'')
    .replace(/(?<=\d)\s+(?=ゲージ|口径)/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function extractEquipment(raw){
  const result={armorLines:[],statusArmor:'',weapons:[]};
  const text=(raw||'').replace(/\r\n?/g,'\n');
  const lines=text.split(/\n/);
  let inEquip=false;
  const armorShort=[];
  const addArmor=(line)=>{
    let n=normalize(line).replace(/^[-・●◆◇■□★☆\s]+/,'').trim();
    if(!n) return;
    let item='', detail='';
    if(/※/.test(n)){
      const parts=n.split(/※/);
      item=compactWeaponName(parts.shift()||'').replace(/[、,。]+$/,'').trim();
      detail=normalize(parts.join('※')).trim();
    }else{
      const m=n.match(/^(.+?)\s+([^\s].*?装甲\s*\d+)\s*$/);
      if(m){ item=compactWeaponName(m[1]).replace(/[、,。]+$/,'').trim(); detail=normalize(m[2]).trim(); }
      else { detail=n; }
    }
    detail=detail.replace(/装甲\s*(\d+)/,'装甲 $1');
    const pretty=item && detail ? `${item} ※${detail}` : (item||detail||n);
    const num=(detail.match(/装甲\s*(\d+)/)||[])[1]||'';
    let type='';
    if(/銃撃/.test(detail)) type='銃撃';
    else if(/格闘/.test(detail)) type='格闘';
    else if(/ダメージ/.test(detail)) type=detail.replace(/に対する装甲\s*\d+.*/,'').trim();
    if(num) armorShort.push(type?`${type}${num}`:`装甲${num}`);
    if(!result.armorLines.includes(pretty)) result.armorLines.push(pretty);
  };
  const addWeapon=(line)=>{
    normalize(line).split(/[、,]/).map(x=>compactWeaponName(x)).filter(Boolean).forEach(w=>{
      if(!/装甲\s*\d+/.test(w) && !/^装備[:：]?$/.test(w) && !result.weapons.includes(w)) result.weapons.push(w);
    });
  };
  for(const rawLine of lines){
    const line=normalize(rawLine);
    if(!line) continue;
    if(/^(?:装備|所持品|武器)\s*[:：]?$|^\[\s*武器\s*\]$/.test(line)){inEquip=true; continue;}
    if(inEquip && (/^\[.+\]$/.test(line) || isNpcBlockHeading(line) || /^(?:能力値|技能|戦闘|呪文|装甲)\s*[:：]?$/.test(line))) { inEquip=false; }
    if(!inEquip) continue;
    if(/装甲\s*\d+/.test(line)) addArmor(line);
    else addWeapon(line);
  }
  result.statusArmor=armorShort.join(' / ');
  return result;
}
function collectLooseSkills(text){
  const result=[]; const seen=new Set();
  const src=normalize(stripHard(text)).split(/\n+/).filter(line=>{
    const n=normalize(line).trim();
    if(!n) return false;
    if(/^(?:装備|所持品|武器)\s*[:：]?$|^\[\s*武器\s*\]$/.test(n)) return false;
    if(/装甲\s*\d+|ゲージショットガン|口径.*リボルバー|スタンガン/.test(n)) return false;
    if(/^(?:[◎◆◇■□★☆●・\s]*)?(?:ステータス例|能力値)\s*[:：]?\s*(?:STR|CON|SIZ|DEX|INT|APP|POW|EDU)\b/i.test(n)) return false;
    if(/^(?:[◎◆◇■□★☆●・\s]*)?(?:STR|CON|SIZ|DEX|INT|APP|POW|EDU)\s*[:：]?\s*\d+/i.test(n)) return false;
    if(/^(?:SAN|正気度|耐久力|耐久度|耐久値|耐久|HP|MP|DB|ダメージボーナス|ダメボ|ビルド|BLD|移動|MOV)\b/i.test(n)) return false;
    return true;
  }).join('\n');
  const add=(name,value)=>{
    name=normalize(name).replace(/^[・\-\s]+/,'').replace(/[〈〉《》【】<>\[\]]/g,'').replace(/[:：]\s*$/,'').trim();
    value=normalize(value).replace(/[^0-9]/g,'');
    if(/[0-9%％]/.test(name)) return;
    if(!name||!value||isNonSkillName(name)||/^(他|その他|技能|戦闘技能|所持技能|特技)$/.test(name)||/^他\s/.test(name))return;
    const key=name+'|'+value; if(!seen.has(key)){seen.add(key);result.push({name,value});}
  };
  let m;
  const bracketRe=/[〈《【<]\s*([^〉》】>]+?)\s*[〉》】>]\s*(\d{1,3})\s*%?/g;
  while((m=bracketRe.exec(src))) add(m[1],m[2]);
  const fallbackSrc=src.replace(/[〈《【<]\s*[^〉》】>]+?\s*[〉》】>]\s*\d{1,3}\s*%?/g,' ');
  let parenRe=/([^\n、,。%〈《【<]+?(?:[（(][^0-9%）)]*?[）)])?)\s*[（(]\s*(\d{1,3})\s*%?\s*[）)]/g;
  while((m=parenRe.exec(fallbackSrc))) add(m[1],m[2]);
  // Repeated simple pairs on one line: 組み付き25％　回避50% / 威圧 50%、聞き耳 55%
  // Do not apply this to parenthesized 6e style skills such as 回避（64%）キック（75%）.
  if(!/[（(]\s*\d{1,3}\s*%\s*[）)]/.test(fallbackSrc)){
    let simplePairRe=/([^\d%％、,。\n]+?)\s*[:：]?\s*(\d{1,3})\s*[%％](?:\s*[（(]\s*ダメージ\s*[:：;；]?\s*[^）)]*\s*[）)])?/g;
    while((m=simplePairRe.exec(fallbackSrc))) add(m[1],m[2]);
  }
  fallbackSrc.split(/[、,。\n]+/).forEach(item=>{
    const normalized=normalize(item).trim();
    if(/(?:ステータス例|能力値|STR|CON|SIZ|DEX|INT|APP|POW|EDU|SAN|HP|MP|DB)\s*[:：]?\s*\d+/i.test(normalized)) return;
    const m=normalized.match(/^(.+?)\s*[:：]?\s*(\d{1,3})\s*%?$/);
    if(m) add(m[1],m[2]);
  });
  return result;
}
function statRegex(label){return new RegExp('(?:^|\\s)'+label+'\\s*:?\\s*([+\\-]?[^\\s]+)','i')}
function inferDbFromBuild(build){
  const b=String(build||'').replace(/^\+/,'').trim();
  if(!b || b==='0') return '';
  if(b==='1') return '+1D4';
  if(b==='2') return '+1D6';
  if(b==='3') return '+2D6';
  if(b==='4') return '+3D6';
  return '';
}
function splitCombatAndSkills(rows){
  const combat=[]; const skills=[];
  rows.forEach(r=>{(isCombatSkillName(r.name)?combat:skills).push(r);});
  return {combat,skills};
}

function normalizeDiceExpr(expr){
  let s=normalize(expr||'').trim().replace(/db/ig,'DB').replace(/d/ig,'D');
  s=s.replace(/DB/g,'{DB}');
  return s;
}
function cleanSkillName(name){
  return normalize(name||'').replace(/^[・\-\s]+/,'').replace(/[〈〉《》【】<>\[\]]/g,'').replace(/[:：]\s*$/,'').trim();
}
function addCombatRow(list,row){
  if(!row || (!row.name && !row.damage)) return;
  const key=[row.name||'',row.value||'',row.damage||''].join('|');
  if(!list.some(x=>[x.name||'',x.value||'',x.damage||''].join('|')===key)) list.push(row);
}
function normalizeDamageSourceName(name){
  let s=cleanSkillName(name||'').replace(/\s+/g,'');
  if(s==='鍵爪') s='鉤爪';
  return s;
}
function extractNamedDamageMap(raw){
  const map={};
  const src=normalize(raw||'');
  let m;
  // 例: 拳銃ダメージ:1D10 / 群れ攻撃ダメージ:1D8 / 鍵爪ダメージ:1D4+DB
  // ひらがなを含む攻撃名（群れ攻撃）を壊さない。
  const re=/([^\n:：、,。]+?)\s*ダメージ\s*[:：]\s*([^\s\n、,。]+)/g;
  while((m=re.exec(src))){
    let name=cleanSkillName(m[1]||'');
    name=name.replace(/^(?:技能|攻撃|武器|行動)\s*[:：]?\s*/,'').trim();
    if(!name || /ボーナス|DB|ビルド|移動|装甲|耐久|HP|MP|SAN|STR|CON|SIZ|DEX|INT|APP|POW|EDU/i.test(name)) continue;
    const key=normalizeDamageSourceName(name);
    const dmg=normalize(m[2]||'').trim();
    if(key && dmg) map[key]=dmg;
  }
  return map;
}

function namedDamageFor(sourceName, damageMap){
  const key=normalizeDamageSourceName(sourceName);
  return (damageMap||{})[key] || '';
}
function applyNamedDamages(rows, damageMap){
  (rows||[]).forEach(r=>{
    if(!r.damage){
      const dmg=namedDamageFor(r.name, damageMap);
      if(dmg) r.damage=dmg;
    }
  });
}
function parseCombatRows(text, options={}){
  const rows=[];
  const enemyMode=!!options.enemyMode;
  const damageMap=options.damageMap||{};
  let inWeaponBlock=false;
  const lines=(text||'').replace(/\r\n?/g,'\n').split(/\n+/).map(x=>x.trim()).filter(Boolean);
  lines.forEach(line=>{
    let n=normalize(stripHard(line));
    n=n.replace(/^・\s*/,'').trim();
    if(/^\[\s*武器\s*\]$/.test(n)){inWeaponBlock=true; return;}
    if(/^\[.+\]$/.test(n) && !/^\[\s*武器\s*\]$/.test(n)) inWeaponBlock=false;
    if(!n || looksLikeSection(n) || isNonSkillName(n)) return;
    if(/^【\s*エネミー\s*[:：]/.test(n) || /^\[\s*敵情報\s*[:：]/.test(n) || /^▼\s*エネミーデータ\s*[\/／]/.test(n)) return;
    if(/^.+?\s*ダメージ\s*[:：]\s*[^\s]+/.test(n)) return;
    const processNote=n.match(/^(.+?)\s*処理\s*[:：]\s*(.+)$/);
    if(processNote){ addCombatRow(rows,{name:cleanSkillName(processNote[1])+'処理：'+processNote[2].trim(),value:'',damage:''}); return; }
    if(/^[（(].*※.*[）)]$/.test(n)){
      if(enemyMode) addCombatRow(rows,{name:n.replace(/^[（(]\s*※?\s*/,'').replace(/[）)]$/,'').trim(),value:'',damage:''});
      return;
    }
    if(/[（(]\s*\d{1,3}\s*%\s*[）)]/.test(n) && !/ダメージ/i.test(n)) return;
    // 公式系データの「1ラウンドの攻撃回数： 2」のような単純な回数メモは
    // チャットパレットの戦闘コマンドとしては出力しない。
    // ただし「1ラウンドの攻撃回数 : 4(触手の乱打、つかむ)」のように
    // 攻撃内容の補足を含む場合は従来通り戦闘補足として保持する。
    if(/^1\s*ラウンド/.test(n)){
      if(/攻撃回数|戦闘回数/.test(n) && /[:：]\s*\d+\s*$/.test(n)) return;
      addCombatRow(rows,{name:n,value:'',damage:''}); return;
    }
    if(/\(mnvr\)|（mnvr）/i.test(n)){ addCombatRow(rows,{name:n,value:'',damage:''}); return; }
    const squarePairs=[...n.matchAll(/\[\s*([^\]\d]+?)\s+(\d{1,3})\s*\]/g)];
    if(squarePairs.length){
      squarePairs.forEach(pair=>{
        const pairName=cleanSkillName(pair[1]);
        const pairValue=pair[2];
        const pairDamage=namedDamageFor(pairName, damageMap);
        if(!pairName || isNonSkillName(pairName)) return;
        if(enemyMode || pairDamage || isCombatSkillName(pairName) || /群れ攻撃|噛みつき|鉤爪|鍵爪/.test(pairName)) addCombatRow(rows,{name:pairName,value:pairValue,damage:pairDamage});
      });
      return;
    }
    const directCmd=n.match(/^(?:CCB|CC|1D100)\s*<=\s*([^\s]+)\s+(.+)$/i);
    if(directCmd){ addCombatRow(rows,{name:cleanSkillName(directCmd[2]), value:directCmd[1].trim(), damage:''}); return; }
    if(/^(?:CCB|CC|1D100)\s*<=/i.test(n)){ addCombatRow(rows,{name:n, value:'', damage:''}); return; }
    const alternativeDamage=n.match(/^(?:もしくは|または|あるいは|か)\s*(\d+d\d+(?:[+\-]\d+d?\d*)?(?:\+?DB)?)(?:[（(]([^）)]+)[）)])?$/i);
    if(alternativeDamage){
      let dmg=alternativeDamage[1].trim();
      const note=normalize(alternativeDamage[2]||'').trim();
      // 代替ダメージ行は「肉切りナイフ使用時・ダメージ」のように
      // 由来が分かるラベルへ変換して保持する。
      if(note) dmg += '（' + note + '）';
      if(rows.length){ rows[rows.length-1].damage = [rows[rows.length-1].damage, dmg].filter(Boolean).join('、'); }
      else addCombatRow(rows,{name:'', value:'', damage:dmg});
      return;
    }
    const directDamage=n.match(/^(\d+d\d+(?:[+\-]\d+d?\d*)?(?:\+?DB)?)\s*[（(]([^）)]+)[）)]$/i);
    if(directDamage){ addCombatRow(rows,{name:'', value:'', damage:directDamage[1]+'（'+directDamage[2]+'）'}); return; }
    if(/^\d+d\d+/i.test(n)){ addCombatRow(rows,{name:n.replace(/d/ig,'D'), value:'', damage:''}); return; }
    if(/^[（(].+[）)]$/.test(n)){ addCombatRow(rows,{name:n, value:'', damage:''}); return; }
    let dm=n.match(/^ダメージ\s*[:;：；]?\s*(.+)$/i);
    if(dm){ if(rows.length) rows[rows.length-1].damage=dm[1].trim(); return; }
    const weaponDamage=n.match(/^(.+?)\s+ダメージ\s*[:;：；]?\s*([^\s、,]+)(.*)$/i);
    if(weaponDamage && (inWeaponBlock || !/%/.test(weaponDamage[1]||''))){
      const weaponName=cleanSkillName((weaponDamage[1]||'')+(weaponDamage[3]||''));
      const weaponDmg=normalize(weaponDamage[2]||'').trim();
      const sameDamageAlready=rows.some(r=>normalizeDiceExpr(r.damage||'')===normalizeDiceExpr(weaponDmg));
      if(inWeaponBlock && sameDamageAlready){ addCombatRow(rows,{name:weaponName,value:'',damage:''}); }
      else { addCombatRow(rows,{name:weaponName,value:'',damage:weaponDmg}); }
      return;
    }
    const repeatedPairs=[...n.matchAll(/([^\d%％、,。\n]+?)\s*[:：]?\s*(\d{1,3})\s*[%％](?:\s*[（(]\s*ダメージ\s*[:：;；]?\s*([^）)]*)\s*[）)])?/g)];
    if(repeatedPairs.length>=2){
      repeatedPairs.forEach(pair=>{
        const pairName=cleanSkillName(pair[1]);
        const pairValue=pair[2];
        const pairDamage=normalize(pair[3]||'').trim() || namedDamageFor(pairName, damageMap);
        if(!pairName || isNonSkillName(pairName)) return;
        if(isCombatSkillName(pairName) || pairDamage || /庇う|かばう|抵抗|鉱石化|触肢|発火|瞬間移動|群れ攻撃|噛みつき|鉤爪|鍵爪/.test(pairName)){
          addCombatRow(rows,{name:pairName,value:pairValue,damage:pairDamage});
        }
      });
      return;
    }
    // 射撃（32口径オートマチック拳銃）50%（25／10）、ダメージ 1D8 のように
    // 技能名中に数字を含む括弧がある場合、値の 50% ではなく括弧内の 32 を拾わないようにする。
    const greedySkill=n.match(/^[<〈《【]?\s*(.+?)(?=\s*\d{1,3}\s*[%％])\s*(\d{1,3})\s*[%％]\s*(?:[（(]([^）)]*)[）)])?\s*(?:[、,\s]*ダメージ(?:は)?\s*[:;：；]?\s*([^、,\s]+(?:\s*[、,]\s*[^、,\s]+)*))?\s*(.*)$/i);
    if(greedySkill){
      const name=cleanSkillName(greedySkill[1]);
      const value=greedySkill[2];
      const parenNote=normalize(greedySkill[3]||'').trim();
      const damage=normalize(greedySkill[4]||'').trim();
      let extra=normalize(greedySkill[5]||'').trim();
      if(!name || isNonSkillName(name)) return;
      let rowDamage=damage || namedDamageFor(name, damageMap);
      const parenDamage=parenNote.match(/^ダメージ\s*[:：;；]?\s*(.+)$/i);
      if(parenDamage && !rowDamage) rowDamage=parenDamage[1].trim();
      const hasDamage=!!rowDamage;
      const isCombat=enemyMode || hasDamage || isCombatSkillName(name) || /庇う|かばう|抵抗|鉱石化|触肢|発火|瞬間移動|群れ攻撃|噛みつき|鉤爪|鍵爪/.test(name);
      if(isCombat){
        addCombatRow(rows,{name,value,damage:rowDamage});
        if(parenNote && !parenDamage && !/^\d+\s*[/／]\s*\d+$/.test(parenNote)) addCombatRow(rows,{name:parenNote.replace(/\s+/g,' '),value:'',damage:''});
        if(extra) addCombatRow(rows,{name:extra.replace(/^[/／、,\s]+/,'').trim(),value:'',damage:''});
      }
      return;
    }
    // <発火操作>80%/ダメージ:1d6 / 触肢 60%(1 ラウンドに 2 回) ダメージ:db / 射撃(拳銃):31% ダメージ;1d10
    const m=n.match(/^[<〈《【]?\s*(.+?)\s*[>〉》】]?\s*[:：]?\s*(\d{1,3})\s*%?\s*(?:[（(]([^）)]*)[）)])?\s*(?:[\/／、,\s]*ダメージ\s*[:;：；]?\s*([^\s、,]+))?\s*(.*)$/i);
    if(m){
      const name=cleanSkillName(m[1]);
      const value=m[2];
      const parenNote=normalize(m[3]||'').trim();
      const damage=normalize(m[4]||'').trim();
      let extra=normalize(m[5]||'').trim();
      if(!name || isNonSkillName(name)) return;
      let rowDamage=damage || namedDamageFor(name, damageMap);
      const parenDamage=parenNote.match(/^ダメージ\s*[:：;；]?\s*(.+)$/i);
      if(parenDamage && !rowDamage) rowDamage=parenDamage[1].trim();
      const hasDamage=!!rowDamage;
      const isCombat=enemyMode || hasDamage || isCombatSkillName(name) || /庇う|かばう|抵抗|鉱石化|触肢|発火|瞬間移動/.test(name);
      if(isCombat){
        addCombatRow(rows,{name,value,damage:rowDamage});
        if(parenNote && !parenDamage && !/^\d+\s*[/／]\s*\d+$/.test(parenNote)) addCombatRow(rows,{name:parenNote.replace(/\s+/g,' '),value:'',damage:''});
        if(extra) addCombatRow(rows,{name:extra.replace(/^[/／、,\s]+/,'').trim(),value:'',damage:''});
      }
      return;
    }
    if(enemyMode){
      addCombatRow(rows,{name:n,value:'',damage:''});
    }
  });
  return rows;
}

function parseText(text){
 const keepAddon=state.commandAddon;
 state=createInitialState();
 state.commandAddon=keepAddon;
 const sourceRaw=normalizePdfWraps((text||'').trim());
 const raw=selectFirstNpcBlock(sourceRaw);
 const lines=raw.split(/\n+/).map(x=>x.trim()).filter(Boolean); const nt=extractNameAndTitle(lines); state.name=nt.name; state.title=nt.title; state.memo=state.name; state.nameMode=state.title?'full':'short';
 const t=normalize(raw); const analysisRaw=statAndActionSourceFor(raw); const analysisNoEquip=removeEquipmentBlock(analysisRaw); const analysisText=normalize(analysisNoEquip); const abilSrc=abilitySourceFor(raw); ['STR','CON','SIZ','DEX','APP','POW','INT','EDU'].forEach(k=>state.abilities[k]=parseNum(new RegExp(k+'\\s*:?\\s*(\\d+)','i'),abilSrc));
 state.status.san=parseNum(/(?:正気度|SAN)\s*:?\s*(\d+)/i,t);
 state.status.hp=parseNum(/(?:耐久力|耐久度|耐久値|耐久|HP|体力)\s*:?\s*(\d+)/i,t);
 state.status.mp=parseNum(/(?:マジックポイント|MP)\s*:?\s*([+-]?\d+)/i,t);
 const dbBuild=t.match(/DB\s*[\/／]\s*ビルド\s*[:：]?\s*([^\/\s]+)\s*[\/／]\s*([+-]?\d+)/i);
 if(dbBuild){ state.status.db=normalizeDbValue(dbBuild[1]); state.status.build=normalize(dbBuild[2]).replace(/^\+/,''); }
 else { state.status.db=normalizeDbValue(parseNum(/(?:ダメージ[・･\s-]*ボーナス|ダメージボーナス|ダメボ|DB)\s*[:：]?\s*([^\s]+)/i,t)); state.status.build=parseNum(/(?:ビルド|BLD)\s*[:：]?\s*([+-]?\d+)/i,t).replace(/^\+/, ''); }
 const moveMatch=t.match(/(?:移動|MOV)\s*[:：]?\s*(\d+\s*(?:\/\s*飛行\s*\d+)?)/i);
 state.status.move=moveMatch?normalize(moveMatch[1]).replace(/^\+/, ''):'';
 if(!state.status.db){ const inferred=inferDbFromBuild(state.status.build); if(inferred) state.status.db=inferred; }
 state.resolved=(/7版|MOV|BLD|DB\s*[\/／]\s*ビルド|▼\s*エネミーデータ/i.test(raw)||/ビルド|移動/.test(raw)||Object.values(state.abilities).some(v=>Number(v)>30))?'coc7':(/CCB\s*<=/i.test(raw)?'coc6':'coc6');
 state.combat=[]; state.skills=[]; state.spells=extractSpells(raw); state.powers=extractPowers(raw); state.equipment=[]; state.armor=''; let skillPart='';
 const isEnemyData=/▼\s*エネミーデータ|【\s*エネミー\s*[:：]|\[\s*敵情報\s*[:：]/.test(raw);
 const damageMap=extractNamedDamageMap(raw);
 const skillIdx=analysisNoEquip.search(/(?:・\s*技能|〈\s*技能\s*〉|\[\s*技能\s*\]|【\s*技能\s*】|主な\s*技能(?:[（(][^）)]*[）)])?\s*[:：]|技能(?:[（(][^）)]*[）)])?\s*[:：]|所持技能\s*[:：]|特技\s*[:：])/);
 const beforeSkill=skillIdx>=0?analysisNoEquip.slice(0,skillIdx):analysisNoEquip;
 if(skillIdx>=0) skillPart=analysisNoEquip.slice(skillIdx).replace(/^.*?(?:・\s*技能|〈\s*技能\s*〉|\[\s*技能\s*\]|【\s*技能\s*】|主な\s*技能(?:[（(][^）)]*[）)])?\s*[:：]|技能(?:[（(][^）)]*[）)])?\s*[:：]|所持技能\s*[:：]|特技\s*[:：])/s,'');
 const armorMatch=raw.match(/(?:^|\n)\s*(?:装甲|防具|防御)\s*[:：]\s*([^\n]+)/); if(armorMatch){ const armorValue=armorMatch[1].trim(); const armorNormalized=(isNoDataText(armorValue)||/^0\b/.test(normalize(armorValue)))?'':armorValue; state.armor=armorNormalized; state.status.armor=armorNormalized; }
 const noHpArmor=raw.match(/耐久値\s*なし[^\n]*(?:装甲|攻撃)[^\n]*/); if(noHpArmor && !state.armor){ state.armor=normalize(noHpArmor[0]).trim(); state.status.armor=state.armor; }
 state.status.ammo=parseNum(/(?:残弾|装弾数)\s*[:：]?\s*(\d+)/i,t);
 state.status.weaponHp=parseNum(/(?:武器耐久|武器耐久値)\s*[:：]?\s*(\d+)/i,t);
 const equipment=extractEquipment(raw);
 if(equipment.armorLines.length){
   const armorText=equipment.armorLines.join('\n');
   state.armor=state.armor ? state.armor+'\n'+armorText : armorText;
   if(!state.status.armor) state.status.armor=equipment.statusArmor || armorText;
 }
 parseCombatRows(beforeSkill,{enemyMode:isEnemyData,damageMap}).forEach(r=>addCombatRow(state.combat,r));
 parseCombatRows(skillPart,{enemyMode:isEnemyData,damageMap}).forEach(r=>addCombatRow(state.combat,r));
 applyNamedDamages(state.combat, damageMap);
 if(equipment && equipment.weapons && equipment.weapons.length){ state.equipment=equipment.weapons.slice(); }
 let rows=collectLooseSkills(skillPart);
 if(!rows.length && /\[\s*技能\s*\]|【\s*技能\s*】|〈\s*技能\s*〉|(?:主な\s*)?技能(?:[（(][^）)]*[）)])?\s*[:：]/.test(raw)){ const after=raw.split(/\[\s*技能\s*\]|【\s*技能\s*】|〈\s*技能\s*〉|(?:主な\s*)?技能(?:[（(][^）)]*[）)])?\s*[:：]/).slice(1).join('\n'); rows=collectLooseSkills(after); }
 if(!rows.length && skillIdx<0){ rows=collectLooseSkills(tailAfterStatLines(analysisNoEquip)); }
 const separated=splitCombatAndSkills(rows);
 separated.combat.forEach(r=>{
   if(!state.combat.some(c=>c.name===r.name&&c.value===r.value)){
     const dmg=namedDamageFor(r.name, damageMap);
     state.combat.push({...r,damage:dmg||r.damage||''});
   }
 });
 applyNamedDamages(state.combat, damageMap);
 state.skills=separated.skills.filter(r=>!state.combat.some(c=>c.name===r.name&&c.value===r.value));
 render();}
function commandAddonLines(){return ['choice({PC1}, {PC2}, {PC3}, {PC4})','choice({HO1}, {HO2}, {HO3}, {HO4})',':HP-',':MP-'];}
function commandPrefix(){return state.resolved==='coc6'?'CCB<=':state.resolved==='generic'?'1D100<=':'CC<='}
function splitDamageParts(d){
  const raw=normalize(d||'').trim();
  if(!raw) return [];
  const parts=[];
  let buf='';
  let depth=0;
  for(const ch of raw){
    if(ch==='（'||ch==='(') depth++;
    if(ch==='）'||ch===')') depth=Math.max(0,depth-1);
    if((ch==='、'||ch===',') && depth===0){
      if(buf.trim()) parts.push(buf.trim());
      buf='';
    } else {
      buf+=ch;
    }
  }
  if(buf.trim()) parts.push(buf.trim());
  return parts;
}
function damageLines(d,sourceName){
  const parts=splitDamageParts(d);
  if(!parts.length) return [];
  const multi=parts.length>1;
  return parts.map(part=>{
    let s=normalizeDiceExpr(part);
    let label='ダメージ';
    const note=s.match(/[（(]([^）)]+)[）)]/);
    if(note){
      const noteText=note[1].trim();
      label=/ダメージ/.test(noteText)?noteText:'ダメージ（'+noteText+'）';
      s=s.replace(/[（(][^）)]+[）)]/g,'').trim();
      return s?`${s} 【${label}】`:'';
    }
    if(multi) return s;
    if(sourceName){label=cleanSkillName(sourceName)+'・ダメージ';}
    return s?`${s} 【${label}】`:'';
  }).filter(Boolean);
}
function damageLine(d,sourceName){return damageLines(d,sourceName)[0]||'';}
function generatePalette(){const pre=commandPrefix(); let out=[]; if(state.commandAddon) out.push(...commandAddonLines(), ''); if(state.combat.some(r=>r.name||r.damage)){out.push('// ▼ 戦闘'); state.combat.forEach(r=>{if(r.value) out.push(`${pre}${r.value} 【${r.name}】`); else if(r.name) out.push(r.name); damageLines(r.damage,r.name).forEach(dl=>out.push(dl));});}
 if(state.armor.trim() && !isNoDataText(state.armor)) out.push('', '// ▼ 装甲', state.armor.trim()); if(state.equipment&&state.equipment.length){out.push('', '// ▼ 装備'); state.equipment.forEach(x=>out.push(x));} if(state.skills.length){out.push('', '// ▼ 技能'); state.skills.forEach(r=>{if(r.name&&r.value)out.push(`${pre}${r.value} 【${r.name}】`)});} if(state.spells&&state.spells.length){out.push('', '// ▼ 呪文'); state.spells.forEach(x=>out.push(x));} if(state.powers&&state.powers.length){out.push('', '// ▼ 能力'); state.powers.forEach(x=>out.push(x));} const abs=Object.entries(state.abilities).filter(([k,v])=>v!==''&&v!=null); if(abs.length){out.push('', '// ▼ 能力値'); abs.forEach(([k,v])=>{ if(state.resolved==='coc6') out.push(`CCB<=${v}*5 【${k} x5】`); else out.push(`${pre}${v} 【${k}】`); });} return out.join('\n').trim();}
function jsonValue(v){const s=String(v??'').trim(); return /^[-+]?\d+(?:\.\d+)?$/.test(s)?Number(s):s;}
function generateJson(){const commands=$('#paletteOutput').value; const params=[...Object.entries(state.abilities).filter(([k,v])=>String(v??'').trim()!=='').map(([label,value])=>({label,value:String(value)})),{label:'DB',value:String(state.status.db||'')}].filter(x=>String(x.value??'').trim()!==''); const status=[]; ['HP','MP','SAN'].forEach(label=>{const key=label.toLowerCase(); const value=String(state.status[key]??'').trim(); if(value!=='') status.push({label,value:jsonValue(value),max:jsonValue(value)});}); [['ビルド','build'],['移動','move'],['装甲','armor'],['残弾','ammo'],['武器耐久','weaponHp']].forEach(([label,key])=>{const value=String(state.status[key]??'').trim(); if(value!=='') status.push({label,value:jsonValue(value)});}); return JSON.stringify({kind:'character',data:{name:selectedKomaName(),initiative:Number(state.abilities.DEX||0),memo:state.memo||state.name,status,params,commands}},null,2)}
function rowActionButtons(type,i){return `<div class="row-actions"><button type="button" class="grab" draggable="true" data-grab-type="${type}" data-grab-index="${i}" title="ドラッグして並べ替え" aria-label="ドラッグして並べ替え">☰</button><button type="button" class="del" data-del-${type}="${i}" title="削除" aria-label="削除">×</button></div>`}
function renderRows(){const cb=$('#combatBody'); cb.innerHTML=''; state.combat.forEach((r,i)=>cb.insertAdjacentHTML('beforeend',`<tr data-row-type="combat" data-row-index="${i}"><td><input data-combat-name="${i}" value="${esc(r.name)}"></td><td><input data-combat-value="${i}" value="${esc(r.value)}"></td><td><input data-combat-damage="${i}" value="${esc(r.damage)}"></td><td>${rowActionButtons('combat',i)}</td></tr>`)); const sb=$('#skillBody'); sb.innerHTML=''; state.skills.forEach((r,i)=>sb.insertAdjacentHTML('beforeend',`<tr data-row-type="skill" data-row-index="${i}"><td><input data-skill-name="${i}" value="${esc(r.name)}"></td><td><input data-skill-value="${i}" value="${esc(r.value)}"></td><td>${rowActionButtons('skill',i)}</td></tr>`));}
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')}
function render(){ $('#npcName').value=state.name; $('#npcTitle').value=state.title; $('#systemMode').value=state.system; $('#resolvedSystem').value=systemLabel(state.resolved); $('#systemBadge').textContent=I18N('autoDetected')+$('#resolvedSystem').value; const shortBadge=$('#nameModeShort'); const fullBadge=$('#nameModeFull'); if(shortBadge){shortBadge.textContent=state.name||'NPC'; shortBadge.classList.toggle('active',state.nameMode==='short'); shortBadge.setAttribute('aria-pressed',state.nameMode==='short'?'true':'false');} if(fullBadge){fullBadge.textContent=fullKomaName()||state.name||'NPC'; fullBadge.classList.toggle('active',state.nameMode!=='short'); fullBadge.setAttribute('aria-pressed',state.nameMode!=='short'?'true':'false');} Object.entries(state.status).forEach(([k,v])=>{const el=$(`[data-status="${k}"]`); if(el)el.value=v}); Object.entries(state.abilities).forEach(([k,v])=>{const el=$(`[data-ability="${k}"]`); if(el)el.value=v}); $('#armorText').value=state.armor; $('#memoText').value=state.memo; renderRows(); const addon=$('#commandAddonCheck'); if(addon) addon.checked=!!state.commandAddon; if(!state.manualPalette) $('#paletteOutput').value=generatePalette(); $('#jsonOutput').value=generateJson(); requestAnimationFrame(adjustLayout);}
function syncDerivedOutputs(){
  const shortBadge=$('#nameModeShort'); const fullBadge=$('#nameModeFull');
  if(shortBadge){shortBadge.textContent=state.name||'NPC'; shortBadge.classList.toggle('active',state.nameMode==='short'); shortBadge.setAttribute('aria-pressed',state.nameMode==='short'?'true':'false');}
  if(fullBadge){fullBadge.textContent=fullKomaName()||state.name||'NPC'; fullBadge.classList.toggle('active',state.nameMode!=='short'); fullBadge.setAttribute('aria-pressed',state.nameMode!=='short'?'true':'false');}
  const badge=$('#systemBadge'); const resolved=$('#resolvedSystem');
  if(resolved) resolved.value=systemLabel(state.resolved);
  if(badge && resolved) badge.textContent=I18N('autoDetected')+resolved.value;
  if(!state.manualPalette) $('#paletteOutput').value=generatePalette();
  $('#jsonOutput').value=generateJson();
}
let derivedOutputTimer=null;
function scheduleDerivedOutputs(delay=80){
  clearTimeout(derivedOutputTimer);
  derivedOutputTimer=setTimeout(()=>{
    if(!state.manualPalette) $('#paletteOutput').value=generatePalette();
    $('#jsonOutput').value=generateJson();
  }, delay);
}
function updateRowEditFromFields(type){
  syncRowInputs(type);
  state.manualPalette=false;
  scheduleDerivedOutputs();
}
function updateFromFields(options={}){state.name=$('#npcName').value;state.title=$('#npcTitle').value;state.system=$('#systemMode').value; state.resolved=state.system==='auto'?state.resolved:state.system; $$('[data-status]').forEach(e=>state.status[e.dataset.status]=e.value); $$('[data-ability]').forEach(e=>state.abilities[e.dataset.ability]=e.value); state.armor=$('#armorText').value; if(state.armor && !state.status.armor) state.status.armor=state.armor; state.memo=$('#memoText').value; state.combat.forEach((r,i)=>{r.name=($(`[data-combat-name="${i}"]`)||{}).value||'';r.value=($(`[data-combat-value="${i}"]`)||{}).value||'';r.damage=($(`[data-combat-damage="${i}"]`)||{}).value||''}); state.skills.forEach((r,i)=>{r.name=($(`[data-skill-name="${i}"]`)||{}).value||'';r.value=($(`[data-skill-value="${i}"]`)||{}).value||''}); state.manualPalette=false; if(options.render===false) syncDerivedOutputs(); else render();}
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

  // v1.509: keep footer inside the shared work scrollbar so it never overlaps the fixed left column.
  document.documentElement.style.setProperty('--footer-panel-offset','0px');
  document.documentElement.style.setProperty('--footer-panel-w','100%');
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
let lastAutoParsedRaw='';
let rawAutoParseTimer=null;
function parseRawInputNow(){
  const rawEl=$('#rawInput');
  const raw=(rawEl&&rawEl.value?rawEl.value:'').trim();
  if(!raw) return false;
  state.manualPalette=false;
  parseText(raw);
  lastAutoParsedRaw=raw;
  return true;
}
function scheduleRawAutoParse(delay=160){
  const rawEl=$('#rawInput');
  if(!rawEl) return;
  clearTimeout(rawAutoParseTimer);
  rawAutoParseTimer=setTimeout(()=>{
    const raw=(rawEl.value||'').trim();
    if(!raw || raw===lastAutoParsedRaw) return;
    parseRawInputNow();
  },delay);
}
function resetToDefault(){state=createInitialState(); $('#rawInput').value=''; lastAutoParsedRaw=''; state.manualPalette=false; render();}
window.NPCDataReader={toast,resetToDefault,render,parseRawInputNow,scheduleRawAutoParse};
document.addEventListener('input',e=>{
  if(e.target.id==='rawInput'){scheduleRawAutoParse(420); return;}
  if(e.target.id==='paletteOutput'){state.manualPalette=true; $('#jsonOutput').value=generateJson(); return;}
  if(e.target.matches('[data-combat-name],[data-combat-value],[data-combat-damage]')){updateRowEditFromFields('combat'); return;}
  if(e.target.matches('[data-skill-name],[data-skill-value]')){updateRowEditFromFields('skill'); return;}
  if(e.target.closest('#middleCol')) updateFromFields({render:false});
});
document.addEventListener('change',e=>{
  if(e.target.id==='commandAddonCheck'){state.commandAddon=e.target.checked; state.manualPalette=false; render(); return;}
  if(e.target.matches('[data-combat-name],[data-combat-value],[data-combat-damage]')){updateRowEditFromFields('combat'); return;}
  if(e.target.matches('[data-skill-name],[data-skill-value]')){updateRowEditFromFields('skill'); return;}
  if(e.target.closest('#middleCol')) updateFromFields({render:false});
});
document.addEventListener('click',e=>{ if(e.target.dataset.nameMode){state.nameMode=e.target.dataset.nameMode; render(); return;} if(e.target.id==='parseBtn'){const raw=$('#rawInput').value.trim(); if(raw){parseRawInputNow()} else toast('NPC情報を貼り付けてください');} if(e.target.id==='sampleBtn'){$('#rawInput').value=SAMPLE;parseRawInputNow()} if(e.target.id==='clearBtn'){$('#rawInput').value=''; lastAutoParsedRaw=''; state=createInitialState(); render();} if(e.target.id==='addCombatBtn'){state.combat.push({name:'',value:'',damage:''});render()} if(e.target.id==='addSkillBtn'){state.skills.push({name:'',value:''});render()} if(e.target.dataset.delCombat){state.combat.splice(Number(e.target.dataset.delCombat),1);render()} if(e.target.dataset.delSkill){state.skills.splice(Number(e.target.dataset.delSkill),1);render()} if(e.target.id==='copyPaletteBtn')navigator.clipboard.writeText($('#paletteOutput').value).then(()=>toast(I18N('copiedPalette'))); if(e.target.id==='copyJsonBtn')navigator.clipboard.writeText($('#jsonOutput').value).then(()=>toast(I18N('copiedJson'))); if(e.target.id==='themeBtn'){document.body.classList.toggle('light');adjustLayout()}});

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
function setupRawInputPlaceholder(){const raw=$('#rawInput'); if(!raw) return; const ph=raw.getAttribute('placeholder')||''; raw.addEventListener('focus',()=>raw.setAttribute('placeholder','')); raw.addEventListener('blur',()=>{if(!raw.value) raw.setAttribute('placeholder',ph);});}
function setupRawInputAutoParse(){
  const raw=$('#rawInput');
  if(!raw) return;
  raw.addEventListener('paste',()=>setTimeout(()=>scheduleRawAutoParse(80),0));
  raw.addEventListener('drop',()=>setTimeout(()=>scheduleRawAutoParse(120),0));
}
addEventListener('resize',adjustLayout); setupRawInputPlaceholder(); setupRawInputAutoParse(); $('#rawInput').value=''; render();
