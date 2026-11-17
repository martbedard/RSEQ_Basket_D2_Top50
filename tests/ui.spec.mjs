import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
test('classement officiel, sélections, fiche, CSV et défilement',async({page,request},info)=>{
  const data=await (await request.get('/data.json')).json();
  await page.goto('/');
  const rows=page.locator('tbody tr');
  await expect(rows).toHaveCount(Math.min(50,data.players.length));
  await expect(rows.first()).toContainText(data.players[0].name);
  for(const n of [10,25]) {
    await page.getByRole('button',{name:'Top '+n,exact:true}).click();
    await expect(rows).toHaveCount(Math.min(n,data.players.length));
  }
  await page.getByRole('button',{name:'Tous',exact:true}).click();
  await expect(rows).toHaveCount(data.players.length);
  const p=data.players[0];
  await page.getByLabel('Filtrer par équipe').selectOption(p.teamId);
  await expect(rows).toHaveCount(data.players.filter(x=>x.teamId===p.teamId).length);
  await page.getByLabel('Rechercher un joueur').fill(p.name);
  await rows.first().getByRole('button').click();
  await expect(page.getByRole('dialog')).toContainText(p.name);
  await page.getByRole('button',{name:'Fermer la fiche'}).click();
  const downloaded=page.waitForEvent('download');
  await page.getByRole('button',{name:/Exporter/}).click();
  expect(await readFile(await (await downloaded).path(),'utf8')).toContain(p.name);
  await page.getByLabel('Rechercher un joueur').fill('');
  await page.getByLabel('Filtrer par équipe').selectOption('');
  await page.getByRole('button',{name:'Trier par points par match',exact:true}).click();
  expect(await rows.first().innerText()).toContain(data.players.filter(x=>x.ppg===data.players.at(-1).ppg)[0].name);
  if(info.project.name==='téléphone'){
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const scroll=page.locator('.scroll');
    expect(await scroll.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
    await scroll.evaluate(el=>el.scrollLeft=300);
    expect(await rows.first().locator('td').nth(1).evaluate(el=>el.getBoundingClientRect().left)).toBeLessThan(100);
  }
});
test('chargement, première extraction, erreur et données périmées',async({page,request})=>{
  let release;
  const gate=new Promise(r=>release=r);
  await page.route('**/data.json',async route=>{await gate;await route.fulfill({status:404,body:''});});
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Chargement');
  release();
  await expect(page.getByRole('status')).toContainText('première actualisation');
  await page.unrouteAll();
  await page.route('**/data.json',route=>route.fulfill({status:500,body:''}));
  await page.reload();await expect(page.getByRole('status')).toContainText('Impossible');
  await page.unrouteAll();
  const data=await (await request.get('/data.json')).json();
  data.updated='2020-01-01T00:00:00Z';
  await page.route('**/data.json',route=>route.fulfill({json:data}));
  await page.reload();await expect(page.locator('#fresh')).toHaveText('Actualisation en retard');
});
