// node dumpcat.js <shelf-data.js> <authors-dir> > catalog.json
const fs = require('fs');
global.window = {};
require(process.argv[2]);
const dir = process.argv[3];
const out = [];
window.JukeboxShelf.defaults().forEach(tab => tab.tracks.forEach((tr, i) => {
  let author = '';
  try { author = JSON.parse(fs.readFileSync(`${dir}/${tr.yt}.json`, 'utf8')).author_name; } catch (e) { /* none */ }
  out.push({ yt: tr.yt, title: tr.title, tab: tab.id, pos: i, author });
}));
process.stdout.write(JSON.stringify(out, null, 1));
