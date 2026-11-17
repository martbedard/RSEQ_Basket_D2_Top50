import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("la fiche reprend les paniers et lancers francs réussis du classement", async ({ page }) => {
  const archive = new URL("../archives/2026-11.json", import.meta.url);
  const data = JSON.parse(await readFile(archive, "utf8"));
  await page.route("**/data.json", (route) => route.fulfill({ json: data }));
  await page.goto("/");
  const row = page.getByRole("row").filter({ hasText: "Christ-Ariel Oulaï" });
  await row.getByRole("button").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("dt")).toHaveText([
    "Points par match",
    "Points",
    "Matchs joués",
    "Tirs à deux points réussis (LR 2)",
    "Tirs à trois points réussis (LR 3)",
    "Lancers francs réussis (LFR)",
    "Réussite aux lancers francs",
  ]);
  for (const [key, label] of [
    ["m2", "Tirs à deux points réussis (LR 2)"],
    ["m3", "Tirs à trois points réussis (LR 3)"],
    ["ft", "Lancers francs réussis (LFR)"],
  ]) {
    const count = await row.locator(`td[data-key="${key}"]`).innerText();
    const stat = dialog.locator("dl > div").filter({ has: page.getByText(label, { exact: true }) });
    await expect(stat.locator("dd")).toHaveText(count);
  }
});

test("les fiches de Limoilou chargent les portraits par numéro de maillot", async ({ page }) => {
  const archive = new URL("../archives/2026-11.json", import.meta.url);
  const data = JSON.parse(await readFile(archive, "utf8"));
  await page.route("**/data.json", (route) => route.fulfill({ json: data }));
  await page.goto("/");
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  const dialog = page.getByRole("dialog");
  for (const player of data.players.filter((p) => p.team === "Limoilou")) {
    await page.getByRole("button", { name: player.name, exact: true }).click();
    const portrait = dialog.getByRole("img", { name: player.name, exact: true });
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveAttribute("src", `./portraits/limoilou/2026-27/${player.number}.jpg`);
    await dialog.getByRole("button", { name: "Fermer la fiche" }).click();
  }
});

test("portrait à l’ouverture, changement de joueur et photo indisponible", async ({ page }) => {
  const archive = new URL("../archives/2026-11.json", import.meta.url);
  const data = JSON.parse(await readFile(archive, "utf8"));
  await page.route("**/data.json", (route) => route.fulfill({ json: data }));
  let requests = 0;
  await page.route("https://dynamiques.csfoy.ca/**", (route) => {
    requests++;
    if (!route.request().url().includes("csm_bedard_isaac_")) return route.abort();
    return route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"/>',
    });
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  expect(requests).toBe(0);
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Isaac Bédard", exact: true }).click();
  await expect(dialog.getByRole("img", { name: "Isaac Bédard" })).toBeVisible();
  await dialog.getByRole("button", { name: "Fermer la fiche" }).click();

  await page.getByRole("button", { name: "Yohann Keenania Zabavy" }).click();
  await expect(dialog.locator("img")).toHaveCount(0);
  await expect(dialog).toContainText("Points par match");
  await dialog.getByRole("button", { name: "Fermer la fiche" }).click();

  const failed = page.waitForEvent("requestfailed", (req) => req.url().includes("csm_bolduc_alexis_"));
  await page.getByRole("button", { name: "Alexis Bolduc" }).click();
  await failed;
  await expect(dialog.locator("img")).toBeHidden();
  await expect(dialog).toContainText("Points par match");
});

test("classement officiel, sélections, fiche, CSV et défilement", async ({
  page,
  request,
}, info) => {
  const data = await (await request.get("/data.json")).json();
  await page.goto("/");
  const rows = page.locator("tbody tr");
  await expect(page.getByRole("button", { name: "Tous", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(rows).toHaveCount(data.players.length);
  await expect(rows.first()).toContainText(data.players[0].name);
  for (const n of [10, 25, 50]) {
    await page.getByRole("button", { name: "Top " + n, exact: true }).click();
    await expect(rows).toHaveCount(Math.min(n, data.players.length));
  }
  await page.getByRole("button", { name: "Tous", exact: true }).click();
  await expect(rows).toHaveCount(data.players.length);
  const p = data.players[0];
  await page.getByLabel("Filtrer par équipe").selectOption(p.teamId);
  await expect(rows).toHaveCount(
    data.players.filter((x) => x.teamId === p.teamId).length,
  );
  await page.getByLabel("Rechercher un joueur").fill(p.name);
  await rows.first().getByRole("button").click();
  await expect(page.getByRole("dialog")).toContainText(p.name);
  await page.getByRole("button", { name: "Fermer la fiche" }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exporter/ }).click();
  expect(await readFile(await (await downloaded).path(), "utf8")).toContain(
    p.name,
  );
  await page.getByLabel("Rechercher un joueur").fill("");
  await page.getByLabel("Filtrer par équipe").selectOption("");
  await page
    .getByRole("button", { name: "Trier par points par match", exact: true })
    .click();
  expect(await rows.first().innerText()).toContain(
    data.players.filter((x) => x.ppg === data.players.at(-1).ppg)[0].name,
  );
  if (info.project.name === "téléphone") {
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const scroll = page.locator(".scroll");
    expect(await scroll.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(
      true,
    );
    await scroll.evaluate((el) => (el.scrollLeft = 300));
    expect(
      await rows
        .first()
        .locator("td")
        .nth(1)
        .evaluate((el) => el.getBoundingClientRect().left),
    ).toBeLessThan(100);
  }
});
test("chargement, première extraction, erreur et données périmées", async ({
  page,
  request,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/data.json", async (route) => {
    await gate;
    await route.fulfill({ status: 404, body: "" });
  });
  await page.goto("/");
  await expect(page.getByRole("status")).toContainText("Chargement");
  release();
  await expect(page.getByRole("status")).toContainText(
    "première actualisation",
  );
  await page.unrouteAll();
  await page.route("**/data.json", (route) =>
    route.fulfill({ status: 500, body: "" }),
  );
  await page.reload();
  await expect(page.getByRole("status")).toContainText("Impossible");
  await page.unrouteAll();
  const data = await (await request.get("/data.json")).json();
  data.updated = "2020-01-01T00:00:00Z";
  await page.route("**/data.json", (route) => route.fulfill({ json: data }));
  await page.reload();
  await expect(page.locator("#fresh")).toHaveText("Actualisation en retard");
});
