import test from "node:test";
import assert from "node:assert/strict";
import { csv, display, selectRows } from "../site/model.mjs";
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
