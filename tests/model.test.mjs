import test from "node:test";
import assert from "node:assert/strict";
import { categoryLeaders, csv, display, selectRows } from "../site/model.mjs";
const players = [
  { rank: 1, name: "Hélène Test", teamId: "a", ppg: 12.04 },
  { rank: 2, name: "Jean Test", teamId: "b", ppg: 12.01 },
  { rank: 51, name: '=TEST("A")', teamId: "a", ppg: 1 },
];
const options = {
  limit: "50",
  search: "",
  team: "",
  key: "ppg",
  direction: -1,
};
test("les meneurs incluent toute la ligue et départagent les égalités à la limite", () => {
  const league = Array.from({ length: 13 }, (_, index) => ({
    rank: index + 1, m2: Math.max(2, 10 - index), ppg: 20,
  }));
  league[11].m2 = 21;
  league[12].m2 = null;
  const rows = categoryLeaders(league.toReversed(), "m2");
  assert.deepEqual(rows.map(row => row.player.rank), [12, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(rows.at(-1).rank, 10);
  league[2].m2 = 9;
  assert.deepEqual(categoryLeaders(league, "m2").slice(2, 5).map(row => row.rank), [3, 3, 5]);
  assert.deepEqual(categoryLeaders(league.toReversed(), "ppg").map(row => row.rank),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});
test("le pourcentage exige une tentative et conserve les zéros enregistrés", () => {
  const league = [
    { rank: 1, fta: 0, pctft: 0 }, { rank: 2, fta: 4, pctft: 0 },
    { rank: 3, fta: 2, pctft: 50 }, { rank: 4, fta: null, pctft: null },
  ];
  assert.deepEqual(categoryLeaders(league, "pctft").map(row => row.player.rank), [3, 2]);
});
test("top, recherche sans accent, filtre, tri numérique avant arrondi", () => {
  assert.deepEqual(selectRows(players, options), players.slice(0, 2));
  assert.deepEqual(
    selectRows(players, { ...options, search: "test helene", team: "a" }),
    [players[0]],
  );
  assert.equal(
    selectRows(players, { ...options, limit: "all", direction: 1 })[0].rank,
    51,
  );
  assert.equal(display("ppg", 12.04), "12,0");
});
test("CSV Excel, BOM, échappement des guillemets et des formules", () => {
  const result = csv(players);
  assert.ok(result.startsWith('\uFEFF"Rang";"Joueur"'));
  assert.ok(result.includes('"\'=TEST(""A"")"'));
  assert.ok(result.includes('"12,0"'));
});
