(function(){
const STAT_KEYS=["HP","MP","SAN","STR","CON","POW","DEX","APP","SIZ","INT","EDU","DB","MOV","幸運"];
function parseJson(text){const raw=JSON.parse(text);return raw.data&&raw.kind?raw.data:raw;}
function normalizeStatus(raw){const stats={};(raw.status||[]).forEach(s=>{stats[s.label]={value:s.value??"",max:s.max??s.value??""};});(raw.params||[]).forEach(p=>{stats[p.label]=Number.isNaN(Number(p.value))?p.value:Number(p.value);});return stats;}
function extractSkills(commands){const map=new Map();String(commands||"").split(/\n/).forEach(line=>{const m=line.match(/(?:CCB?|1D100|1d100)\s*<=\s*(\d+)\s*【([^】]+)】/);if(m&&!/SAN|正気度|さんちぇ/i.test(m[2]))map.set(m[2].trim(),Number(m[1]));});return [...map].map(([name,value])=>({name,value,category:""})).sort((a,b)=>b.value-a.value||a.name.localeCompare(b.name,"ja"));}
function splitMemo(memo){return {profile:memo||"",items:"",combat:"",relationships:"",scenarios:"",free:"",secret:""};}
function fromCcf(text,iacharaText=""){const raw=parseJson(text);const now=new Date().toISOString();return {id:"chara_"+Date.now().toString(36),name:raw.name||"No Name",reading:"",system:"",edition:"",occupation:"",lifeStatus:"alive",tags:[],iconUrl:raw.iconUrl||"",tachieUrl:"",externalUrl:raw.externalUrl||"",initiative:raw.initiative||0,stats:normalizeStatus(raw),skills:extractSkills(raw.commands),memoSections:splitMemo(raw.memo),memoExportOptions:{profile:true,items:true,combat:true,relationships:true,scenarios:true,free:true,secret:false},commands:raw.commands||"",source:{ccfoliaRaw:raw,iacharaText:iacharaText||""},timestamps:{createdAt:now,updatedAt:now,ccfoliaImportedAt:now,iacharaImportedAt:iacharaText?now:""}};}
window.CharaLibraParser={STAT_KEYS,fromCcf,extractSkills};
})();
