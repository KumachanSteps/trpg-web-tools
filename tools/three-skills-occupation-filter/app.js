import { validateOccupations, filterOccupations } from './core.mjs';

const $ = id => document.getElementById(id);
const checkboxes = [...document.querySelectorAll('input[type="checkbox"]')];
let jobs;

function render() {
  const selected = checkboxes.filter(input => input.checked).map(input => input.value);
  const result = filterOccupations(jobs, selected, $('source').value);
  $('count').textContent = result.count;
  $('denominator').textContent = ` / ${result.denominator} 件`;
  $('percent').textContent = `${result.percent.toFixed(1)}%`;
  $('ratio-fill').style.width = `${result.percent}%`;
  $('scope-label').textContent = $('source').value === 'all'
    ? '登録170職業中（固定職業技能のみ）'
    : `${$('source').selectedOptions[0].textContent}の${result.denominator}職業中 · 全出典では ${result.overallCount} / 170件`;
  $('impact').textContent = selected.length
    ? `${selected.join('・')}を固定枠でそろえる条件で、${result.denominator}件 → ${result.count}件。${result.denominator - result.count}件がこの集計の対象外になります。`
    : '技能の条件なし。対象の出典に登録されたすべての職業を表示しています。';

  const fragment = document.createDocumentFragment();
  for (const job of result.matches) {
    const row = document.createElement('article');
    row.className = 'job';
    row.dataset.jobId = `${job.source}:${job.id}`;
    const name = document.createElement('h3');
    name.textContent = job.name;
    const source = document.createElement('span');
    source.className = 'job-source';
    source.textContent = job.source;
    const tags = document.createElement('span');
    tags.className = 'tags';
    for (const skill of selected) {
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = skill;
      tags.append(tag);
    }
    if (!selected.length) {
      tags.classList.add('unselected');
      tags.textContent = '条件なし';
    }
    row.append(name, source, tags);
    fragment.append(row);
  }
  if (!result.count) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'この条件に一致する職業はありません。技能のチェックや出典を変えて比較できます。';
    fragment.append(empty);
  }
  $('job-list').replaceChildren(fragment);
  $('job-list').scrollTop = 0;
}

async function start() {
  try {
    const response = await fetch('./occupations.json');
    if (!response.ok) throw new Error('データを取得できませんでした。');
    jobs = validateOccupations(await response.json());
    for (const input of checkboxes) input.addEventListener('change', render);
    $('source').addEventListener('change', render);
    for (const [id, checked] of [['select-all', true], ['clear', false]]) {
      $(id).addEventListener('click', () => {
        checkboxes.forEach(input => { input.checked = checked; });
        render();
      });
    }
    render();
  } catch (error) {
    $('scope-label').textContent = '職業データを読み込めませんでした。';
    $('error').textContent = `ページを再読み込みしてください。${error.message}`;
    $('error').hidden = false;
    document.querySelectorAll('input, select, button').forEach(input => { input.disabled = true; });
  }
}
start();
