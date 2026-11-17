export const columns = [
  ['rank','Rang','Rang général'], ['name','Joueur','Nom complet'], ['team','Équipe','Équipe'],
  ['ppg','PTS/MJ','Points par match'], ['number','No','Numéro de maillot'], ['games','MJ','Matchs joués'],
  ['m2','LR 2','Tirs à deux points réussis'], ['a2','LT 2','Tirs à deux points tentés'],
  ['m3','LR 3','Tirs à trois points réussis'], ['a3','LT 3','Tirs à trois points tentés'],
  ['ft','LFR','Lancers francs réussis'], ['fta','LFT','Lancers francs tentés'],
  ['ro','RO','Rebonds offensifs'], ['rd','RD','Rebonds défensifs'], ['points','PTS','Points totaux']
];
const collator = new Intl.Collator('fr-CA', {numeric:true, sensitivity:'base'});
const decimals = new Intl.NumberFormat('fr-CA',{minimumFractionDigits:1, maximumFractionDigits:1});
const fold = value => value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('fr-CA');
export function display(key, value) {
  if (value == null || value === '') return '—';
  return ['ppg','rpg','pct2','pct3','pctft'].includes(key) ? decimals.format(value) : String(value);
}
export function selectRows(players, {limit, search, team, key, direction}) {
  const terms = fold(search.trim()).split(/\s+/);
  return players.filter(p => (limit === 'all' || p.rank <= Number(limit)) &&
    (!team || p.teamId === team) && terms.every(term => fold(p.name).includes(term))).sort((a,b) => {
    if (a[key] == null || b[key] == null) return Number(a[key] == null) - Number(b[key] == null) || a.rank-b.rank;
    const delta = typeof a[key] === 'number' ? a[key]-b[key] : collator.compare(a[key],b[key]);
    return direction*delta || a.rank-b.rank;
  });
}
export function csv(rows) {
  const escape = value => {
    let s = String(value);
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"','""') + '"';
  };
  const lines = [columns.map(c=>c[1]), ...rows.map(p=>columns.map(([k])=>p[k] == null ? '' : display(k,p[k])))];
  return '\uFEFF'+lines.map(line=>line.map(escape).join(';')).join('\r\n')+'\r\n';
}
export function stale(updated, now=Date.now()) {
  return now-Date.parse(updated) >= 60*60*1000;
}
