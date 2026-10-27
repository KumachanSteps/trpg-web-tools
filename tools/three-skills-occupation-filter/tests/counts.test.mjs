import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CORE, SOURCES, validateOccupations, filterOccupations } from '../core.mjs';

const jobs = JSON.parse(readFileSync(new URL('../occupations.json', import.meta.url), 'utf8'));
const selections = [[], ['目星'], ['聞き耳'], ['図書館'], ['目星', '聞き耳'], ['目星', '図書館'], ['聞き耳', '図書館'], CORE];
const cases = [
  ['all', 170, [170, 79, 50, 61, 28, 29, 9, 3]],
  [SOURCES[0], 73, [73, 17, 18, 17, 7, 3, 2, 0]],
  [SOURCES[1], 70, [70, 49, 23, 38, 18, 23, 4, 2]],
  [SOURCES[2], 27, [27, 13, 9, 6, 3, 3, 3, 1]],
];
for (const [source, denominator, counts] of cases) {
  for (const [index, selected] of selections.entries()) {
    test(`${source}: ${selected.join('+') || '条件なし'}`, () => {
      const result = filterOccupations(jobs, selected, source);
      assert.equal(result.count, counts[index]);
      assert.equal(result.matches.length, counts[index]);
      assert.equal(result.denominator, denominator);
      assert.equal(result.percent, counts[index] / denominator * 100);
      assert.equal(result.overallCount, cases[0][2][index]);
    });
  }
}
test('170 source/ID identities, source counts, and fixed flags are valid', () => {
  assert.equal(validateOccupations(jobs), jobs);
  assert.deepEqual([0, 1, 2, 3].map(n => jobs.filter(job => CORE.filter(skill => job.skills.includes(skill)).length === n).length), [43, 67, 57, 3]);
});
test('private detective optional Listen is not counted as fixed', () => {
  const detective = jobs.find(job => job.source === SOURCES[0] && job.name === '私立探偵');
  assert.ok(detective.skillOptions.some(group => group.options.includes('聞き耳')));
  assert.ok(!filterOccupations(jobs, CORE).matches.includes(detective));
  assert.ok(filterOccupations(jobs, ['目星', '図書館']).matches.includes(detective));
});
test('invalid size, duplicate identities, unsupported sources, and inconsistent flags fail visibly', () => {
  assert.throws(() => validateOccupations(jobs.slice(1)));
  for (const replacement of [jobs[1], { ...jobs[0], source: 'パルプクトゥルフ' }, { ...jobs[0], coreSkillsFixed: CORE }]) {
    const changed = [...jobs]; changed[0] = replacement;
    assert.throws(() => validateOccupations(changed));
  }
  assert.throws(() => filterOccupations(jobs, ['技能名ではない']));
  assert.throws(() => filterOccupations(jobs, [], '不明'));
});
