import { columns, display, selectRows, csv, stale } from "./model.mjs";
import { portraits } from "./portraits.mjs";
const $ = (id) => document.getElementById(id);
const state = { limit: "50", search: "", team: "", key: "ppg", direction: -1 };
let dataset,
  visible = [];
const dates = new Intl.DateTimeFormat("fr-CA", {
  timeZone: "America/Toronto",
  dateStyle: "medium",
  timeStyle: "short",
});
function element(tag, text) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  return node;
}
function profile(p) {
  $("profile-team").textContent = p.team + " · Rang " + p.rank;
  $("profile-name").textContent = p.name;
  const portrait = $("profile-portrait");
  portrait.replaceChildren();
  portrait.hidden = true;
  if (portraits[p.id]) {
    const image = element("img");
    image.alt = p.name;
    image.onload = () => {
      if (image.parentNode === portrait) portrait.hidden = false;
    };
    portrait.append(image);
    image.src = portraits[p.id];
  }
  const stats = [
    ["ppg", "Points par match"],
    ["points", "Points"],
    ["games", "Matchs joués"],
    ["m2", "Tirs à deux points réussis (LR 2)"],
    ["pct2", "Réussite à 2 points"],
    ["m3", "Tirs à trois points réussis (LR 3)"],
    ["pct3", "Réussite à 3 points"],
    ["ft", "Lancers francs réussis (LFR)"],
    ["pctft", "Réussite aux lancers francs"],
    ["rebounds", "Rebonds totaux"],
    ["rpg", "Rebonds par match"],
  ];
  $("profile-stats").replaceChildren(
    ...stats.map(([key, label]) => {
      const item = element("div");
      const unit = key.startsWith("pct") && p[key] != null ? " %" : "";
      item.append(
        element("dt", label),
        element("dd", display(key, p[key]) + unit),
      );
      return item;
    }),
  );
  $("profile").showModal();
}
function render() {
  if (!dataset) return;
  visible = selectRows(dataset.players, state);
  $("body").replaceChildren(
    ...visible.map((p) => {
      const row = element("tr");
      for (const [key] of columns) {
        const cell = element("td");
        cell.dataset.key = key;
        if (key === "name") {
          const button = element("button", p.name);
          button.className = "name";
          button.addEventListener("click", () => profile(p));
          cell.append(button);
        } else cell.textContent = display(key, p[key]);
        row.append(cell);
      }
      return row;
    }),
  );
  for (const th of $("head").children) {
    const active = th.dataset.key === state.key;
    th.setAttribute(
      "aria-sort",
      active ? (state.direction === 1 ? "ascending" : "descending") : "none",
    );
    th.firstChild.textContent =
      th.dataset.label + (active ? (state.direction === 1 ? " ↑" : " ↓") : "");
  }
  document
    .querySelectorAll("[data-limit]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.limit === state.limit)),
    );
  $("results").textContent = visible.length + " joueurs affichés";
  $("notice").hidden = visible.length > 0;
  $("notice").textContent = "Aucun joueur ne correspond à cette sélection.";
  $("csv").disabled = !visible.length;
}
for (const [key, label, description] of columns) {
  const th = element("th"),
    button = element("button", label);
  th.scope = "col";
  th.dataset.key = key;
  th.dataset.label = label;
  button.title = description;
  button.setAttribute("aria-label", "Trier par " + description.toLowerCase());
  button.onclick = () => {
    state.direction =
      state.key === key
        ? -state.direction
        : ["rank", "name", "team", "number"].includes(key)
          ? 1
          : -1;
    state.key = key;
    render();
  };
  th.append(button);
  $("head").append(th);
}
document.querySelectorAll("[data-limit]").forEach(
  (b) =>
    (b.onclick = () => {
      state.limit = b.dataset.limit;
      render();
    }),
);
$("search").oninput = (e) => {
  state.search = e.target.value;
  render();
};
$("team").onchange = (e) => {
  state.team = e.target.value;
  render();
};
$("csv").onclick = () => {
  const url = URL.createObjectURL(
    new Blob([csv(visible)], { type: "text/csv;charset=utf-8" }),
  );
  const link = element("a");
  link.href = url;
  link.download = "RSEQ-D2-classement.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
function freshness() {
  if (!dataset) return;
  const old = stale(dataset.updated);
  $("fresh").textContent = old ? "Actualisation en retard" : "À jour";
  $("fresh").dataset.stale = String(old);
}
let loading = false;
async function load() {
  if (loading) return;
  loading = true;
  try {
    const response = await fetch("./data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const data = await response.json();
    if (
      data.season !== "2026-2027" ||
      data.teams?.length !== 8 ||
      !data.players?.length ||
      !Number.isFinite(Date.parse(data.updated))
    )
      throw new Error("incomplet");
    dataset = data;
    const teams = [...data.teams].sort((a, b) =>
      a.name.localeCompare(b.name, "fr-CA"),
    );
    $("team").replaceChildren(
      new Option("Toutes les équipes", ""),
      ...teams.map((t) => new Option(t.name, t.id)),
    );
    $("team").value = state.team;
    $("sources").replaceChildren(
      ...teams.map((t) => {
        const li = element("li"),
          a = element("a", t.name + " · " + t.games + " MJ");
        a.href =
          "https://diffusion.rseq.ca/Default?Type=Team&TeamId=" +
          encodeURIComponent(t.id);
        li.append(a);
        return li;
      }),
    );
    $("teams").textContent = teams.length;
    $("eligible").textContent = data.players.length;
    $("updated").dateTime = data.updated;
    $("updated").textContent =
      dates.format(new Date(data.updated)) + " (Québec)";
    const leader = data.players[0];
    $("leader").hidden = false;
    $("leader-name").textContent = leader.name;
    $("leader-line").textContent =
      leader.team + " · " + display("ppg", leader.ppg) + " PTS/MJ";
    freshness();
    render();
  } catch (error) {
    if (!dataset) {
      $("fresh").dataset.stale = "true";
      $("fresh").textContent = "Données indisponibles";
      $("notice").textContent =
        error.message === "404"
          ? "En attente de la première actualisation complète des huit équipes."
          : "Impossible de charger le classement. Une nouvelle tentative aura lieu automatiquement.";
    } else freshness();
  } finally {
    loading = false;
  }
}
load();
setInterval(freshness, 60000);
setInterval(load, 60 * 60000);
