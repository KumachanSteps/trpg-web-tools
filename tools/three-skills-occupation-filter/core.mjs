export const CORE = ['目星', '聞き耳', '図書館'];
export const SOURCES = ['クトゥルフ2015', 'クトゥルフ2026', 'クトゥルフ神話TRPGプレイングガイド'];

export function validateOccupations(jobs) {
  if (!Array.isArray(jobs) || jobs.length !== 170) throw new Error('職業データは170件必要です。');
  const identities = new Set();
  for (const job of jobs) {
    const identity = `${job.source}:${job.id}`;
    if (!SOURCES.includes(job.source) || identities.has(identity) || !job.id || !job.name || !Array.isArray(job.skills)) {
      throw new Error('職業データの出典・ID・技能を確認してください。');
    }
    const fixed = CORE.filter(skill => job.skills.includes(skill));
    if (!Array.isArray(job.coreSkillsFixed) || fixed.length !== job.coreSkillsFixed.length || !fixed.every(skill => job.coreSkillsFixed.includes(skill))) {
      throw new Error('固定技能の索引が元データと一致しません。');
    }
    identities.add(identity);
  }
  return jobs;
}

export function filterOccupations(jobs, selected = [], source = 'all') {
  if (!selected.every(skill => CORE.includes(skill)) || (source !== 'all' && !SOURCES.includes(source))) {
    throw new Error('不明な絞り込み条件です。');
  }
  const scope = jobs.filter(job => SOURCES.includes(job.source) && (source === 'all' || job.source === source));
  const matches = scope.filter(job => selected.every(skill => job.skills.includes(skill)));
  const overall = jobs.filter(job => SOURCES.includes(job.source) && selected.every(skill => job.skills.includes(skill)));
  return { matches, count: matches.length, denominator: scope.length, percent: scope.length ? matches.length / scope.length * 100 : 0, overallCount: overall.length };
}
