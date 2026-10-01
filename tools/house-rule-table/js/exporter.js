/* CoCハウスルール表メーカー — 書き出し（PNG / テキスト / Markdown）
 * app.js が作る「表のモデル」を受け取って整形する。
 * モデル: { title, meta: [[label, value]], cols, sections: [{ title, tone, cats: [{ title, rows: [{ name, value, kind, note }] }] }],
 *           remarksLabel, remarks, legend, credit, lang }
 * kind: 'o' | 'x' | 'm' | 'opt' | 'text' | 'unset' */
(function (global) {
  'use strict';

  const FONT = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", "Yu Gothic UI", Meiryo, system-ui, sans-serif';

  const PALETTE = {
    light: {
      bg: '#ffffff', ink: '#1f2a3a', muted: '#66758a', faint: '#8a97a8', line: 'rgba(76, 100, 132, 0.16)', zebra: '#f4f7fb',
      accent: '#3a78d8', common: '#66758a', o: '#1f9d6b', x: '#8f9bab', m: '#d9622b', modBg: 'rgba(224, 112, 60, 0.08)', top: '#3a78d8'
    },
    dark: {
      bg: '#0d1b2f', ink: '#eef6ff', muted: '#9fb0c6', faint: '#7f90a7', line: 'rgba(168, 204, 255, 0.14)', zebra: 'rgba(255, 255, 255, 0.035)',
      accent: '#69a8ff', common: '#9fb0c6', o: '#3cc98f', x: '#7d8da3', m: '#f08a55', modBg: 'rgba(240, 138, 85, 0.12)', top: '#69a8ff'
    }
  };

  /* ================= テキスト ================= */

  function toText(model, opts = {}) {
    const colon = model.lang === 'ja' ? '：' : ': ';
    const out = [];
    out.push(model.lang === 'ja' ? `【${model.title}】` : `【 ${model.title} 】`);
    model.meta.forEach(([label, value]) => out.push(`${label}${colon}${value}`));
    model.sections.forEach(sec => {
      out.push('', `■ ${sec.title}`);
      sec.cats.forEach(cat => {
        out.push(`◆ ${cat.title}`);
        cat.rows.forEach(row => {
          out.push(`・${row.name}${colon}${row.value}`);
          if (opts.notes !== false && row.note) row.note.split('\n').forEach((line, i) => out.push(`${i ? '　　' : '　└ '}${line}`));
        });
      });
    });
    if (model.remarks) {
      out.push('', `■ ${model.remarksLabel}`);
      model.remarks.split('\n').forEach(line => out.push(line));
    }
    if (opts.legend !== false) out.push('', model.legend);
    return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  /* ================= Markdown ================= */

  const mdCell = text => String(text || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const mdLine = text => String(text || '').replace(/([\\`*_#[\]<>])/g, '\\$1');

  function toMarkdown(model, opts = {}) {
    const out = [`# ${mdLine(model.title)}`];
    if (model.meta.length) out.push('', model.meta.map(([label, value]) => `**${mdLine(label)}**: ${mdLine(value)}`).join('  \n'));
    const withNotes = opts.notes !== false && model.sections.some(sec => sec.cats.some(cat => cat.rows.some(row => row.note)));
    model.sections.forEach(sec => {
      out.push('', `## ${mdLine(sec.title)}`);
      sec.cats.forEach(cat => {
        out.push('', `### ${mdLine(cat.title)}`, '');
        out.push(withNotes ? `| ${model.cols.rule} | ${model.cols.value} | ${model.cols.note} |` : `| ${model.cols.rule} | ${model.cols.value} |`);
        out.push(withNotes ? '| --- | :---: | --- |' : '| --- | :---: |');
        cat.rows.forEach(row => {
          const cells = [mdCell(row.name), mdCell(row.value)];
          if (withNotes) cells.push(mdCell(row.note));
          out.push(`| ${cells.join(' | ')} |`);
        });
      });
    });
    if (model.remarks) out.push('', `## ${mdLine(model.remarksLabel)}`, '', model.remarks.split('\n').map(mdLine).join('  \n'));
    if (opts.legend !== false) out.push('', `> ${model.legend}`);
    return out.join('\n') + '\n';
  }

  /* ================= 画像 ================= */

  /* 日本語・韓国語は1文字ごと、英語は単語ごとに折り返す */
  function wrap(ctx, text, maxW) {
    const lines = [];
    String(text || '').split('\n').forEach(para => {
      if (!para) { lines.push(''); return; }
      const tokens = para.match(/[A-Za-z0-9À-ÿ'’\-.,!?%:;/()&+]+\s*|\s+|./gu) || [];
      let line = '';
      tokens.forEach(tok => {
        const test = line + tok;
        if (ctx.measureText(test.trimEnd()).width <= maxW || !line) {
          line = test;
          /* 単語ひとつが幅を超えるときは文字単位で割る */
          while (ctx.measureText(line.trimEnd()).width > maxW && line.length > 1) {
            let cut = line.length - 1;
            while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) cut -= 1;
            lines.push(line.slice(0, cut));
            line = line.slice(cut);
          }
          return;
        }
        /* 行頭に来てはいけない記号は前の行に残す */
        if (/^[、。，．）」』】〕！？ー々…・：；,.)!?\]]/u.test(tok) && line.length > 1) {
          lines.push(line.slice(0, -1).trimEnd());
          line = line.slice(-1) + tok;
          return;
        }
        lines.push(line.trimEnd());
        line = tok.trimStart();
      });
      lines.push(line.trimEnd());
    });
    return lines;
  }

  function renderPng(model, opts = {}) {
    const pal = PALETTE[opts.theme === 'dark' ? 'dark' : 'light'];
    const narrow = opts.layout === 'narrow';
    const W = narrow ? 600 : 960;
    const PAD = narrow ? 24 : 36;
    const scale = opts.scale || 2;
    /* 注記がひとつもなければ注記列を出さない */
    const withNotes = opts.notes !== false && model.sections.some(sec => sec.cats.some(cat => cat.rows.some(row => row.note)));
    const inner = W - PAD * 2;

    const measure = document.createElement('canvas').getContext('2d');
    const font = (size, weight = 400) => `${weight} ${size}px ${FONT}`;

    /* 1回目は高さを測るだけ、2回目で描く */
    function pass(ctx, draw) {
      let y = PAD;
      const fill = (color, x, yy, w, hh, r = 0) => {
        if (!draw) return;
        ctx.fillStyle = color;
        if (r && ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, yy, w, hh, r); ctx.fill(); } else ctx.fillRect(x, yy, w, hh);
      };
      const text = (str, x, yy, size, weight, color, align = 'left') => {
        if (!draw) return;
        ctx.font = font(size, weight);
        ctx.fillStyle = color;
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.fillText(str, x, yy);
      };
      const lines = (str, maxW, size, weight) => { ctx.font = font(size, weight); return wrap(ctx, str, maxW); };

      if (draw) {
        ctx.fillStyle = pal.bg;
        ctx.fillRect(0, 0, W, ctx.canvas.height / scale);
        fill(pal.top, 0, 0, W, 5);
      }

      /* 表題 */
      const titleSize = narrow ? 23 : 27;
      lines(model.title, inner, titleSize, 800).forEach(line => { text(line, PAD, y, titleSize, 800, pal.ink); y += titleSize * 1.32; });
      if (model.meta.length) {
        y += 4;
        const metaStr = model.meta.map(([label, value]) => `${label}  ${value}`).join(narrow ? '\n' : '　／　');
        lines(metaStr, inner, 13, 500).forEach(line => { text(line, PAD, y, 13, 500, pal.muted); y += 20; });
      }
      y += 14;

      const valueColor = kind => (kind === 'o' ? pal.o : kind === 'x' ? pal.x : kind === 'm' ? pal.m : kind === 'unset' ? pal.faint : pal.ink);
      const valueSize = kind => (kind === 'o' || kind === 'x' || kind === 'm' ? 17 : 14);

      model.sections.forEach((sec, si) => {
        y += si ? 18 : 4;
        const tone = sec.tone === 'common' ? pal.common : pal.accent;
        fill(tone, PAD, y + 2, 4, 20, 2);
        text(sec.title, PAD + 14, y + 1, narrow ? 17 : 19, 800, pal.ink);
        y += 32;

        if (!narrow) {
          const c1 = withNotes ? inner * 0.34 : inner * 0.56;
          const c2 = withNotes ? inner * 0.2 : inner * 0.44;
          text(model.cols.rule, PAD + 12, y, 11, 700, pal.faint);
          text(model.cols.value, PAD + c1 + c2 / 2, y, 11, 700, pal.faint, 'center');
          if (withNotes) text(model.cols.note, PAD + c1 + c2 + 12, y, 11, 700, pal.faint);
          y += 18;
        }

        sec.cats.forEach(cat => {
          y += 6;
          text(cat.title, PAD + 2, y, 12.5, 800, tone);
          y += 19;
          fill(pal.line, PAD, y, inner, 1);
          y += 1;

          cat.rows.forEach((row, ri) => {
            const note = withNotes ? row.note : '';
            const mod = row.kind === 'm';
            if (!narrow) {
              const c1 = withNotes ? inner * 0.34 : inner * 0.56;
              const c2 = withNotes ? inner * 0.2 : inner * 0.44;
              const c3 = inner - c1 - c2;
              const nameL = lines(row.name, c1 - 20, 14, 600);
              const valL = lines(row.value, c2 - 16, valueSize(row.kind), 700);
              const noteL = note ? lines(note, c3 - 24, 13, 400) : [];
              const h = Math.max(nameL.length * 21, valL.length * (valueSize(row.kind) + 6), noteL.length * 20) + 18;
              if (ri % 2 === 1) fill(pal.zebra, PAD, y, inner, h);
              if (mod && note) fill(pal.modBg, PAD + c1 + c2, y, c3, h);
              if (mod && note) fill(pal.m, PAD + c1 + c2, y, 3, h);
              const nTop = y + (h - nameL.length * 21) / 2 + 1;
              nameL.forEach((line, i) => text(line, PAD + 12, nTop + i * 21, 14, 600, pal.ink));
              const vTop = y + (h - valL.length * (valueSize(row.kind) + 6)) / 2 + 1;
              valL.forEach((line, i) => text(line, PAD + c1 + c2 / 2, vTop + i * (valueSize(row.kind) + 6), valueSize(row.kind), 700, valueColor(row.kind), 'center'));
              const noteTop = y + (h - noteL.length * 20) / 2 + 1;
              noteL.forEach((line, i) => text(line, PAD + c1 + c2 + 14, noteTop + i * 20, 13, 400, mod ? pal.ink : pal.muted));
              y += h;
            } else {
              ctx.font = font(valueSize(row.kind), 700);
              const valW = Math.min(ctx.measureText(row.value).width, inner * 0.46);
              const valL = lines(row.value, inner * 0.46, valueSize(row.kind), 700);
              const nameL = lines(row.name, inner - valW - 34, 14, 600);
              const noteL = note ? lines(note, inner - 34, 12.5, 400) : [];
              const top = Math.max(nameL.length * 21, valL.length * (valueSize(row.kind) + 6));
              const h = top + (noteL.length ? noteL.length * 19 + 6 : 0) + 18;
              if (ri % 2 === 1) fill(pal.zebra, PAD, y, inner, h);
              nameL.forEach((line, i) => text(line, PAD + 10, y + 9 + i * 21, 14, 600, pal.ink));
              valL.forEach((line, i) => text(line, PAD + inner - 10, y + 8 + i * (valueSize(row.kind) + 6), valueSize(row.kind), 700, valueColor(row.kind), 'right'));
              if (noteL.length) {
                const ny = y + 9 + top + 4;
                if (mod) fill(pal.m, PAD + 12, ny, 3, noteL.length * 19 - 2);
                noteL.forEach((line, i) => text(line, PAD + 22, ny + i * 19, 12.5, 400, mod ? pal.ink : pal.muted));
              }
              y += h;
            }
          });
          fill(pal.line, PAD, y, inner, 1);
          y += 1;
        });
      });

      if (model.remarks) {
        y += 22;
        fill(pal.common, PAD, y + 2, 4, 18, 2);
        text(model.remarksLabel, PAD + 14, y, 16, 800, pal.ink);
        y += 28;
        lines(model.remarks, inner - 12, 13.5, 400).forEach(line => { text(line, PAD + 2, y, 13.5, 400, pal.ink); y += 21; });
      }

      y += 18;
      fill(pal.line, PAD, y, inner, 1);
      y += 12;
      if (opts.legend !== false) {
        const legL = lines(model.legend, narrow ? inner : inner * 0.6, 12, 600);
        legL.forEach((line, i) => text(line, PAD, y + i * 18, 12, 600, pal.muted));
        if (narrow) y += legL.length * 18 + 4;
      }
      text(model.credit, PAD + inner, y + (narrow ? 0 : 1), 11, 500, pal.faint, 'right');
      y += 18 + PAD - 8;
      return Math.ceil(y);
    }

    const height = pass(measure, false);
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    pass(ctx, true);
    return canvas;
  }

  global.HRT_EXPORT = { toText, toMarkdown, renderPng, wrap };
})(window);
