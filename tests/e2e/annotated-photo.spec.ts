import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { SCENE } from '@/components/hotspots/scene';
import type { Build, HotspotImage, Locale } from '@/lib/api';
import { readBuild } from './helpers/catalog-api';

/**
 * Notes dessinées sur la photo de tête de la fiche PUBLIQUE (web #52, phase 3). Les attentes se lisent dans l'API au
 * moment du test, jamais dans le code du site : une fiche porte des notes si, et seulement si, l'API sert `hotspot_image`.
 *
 * Candidates : les cinq fiches du pilote (web #49), premières mises en ligne (phase 4.1), et un cadre nu exclu du
 * catalogue, dont la photo n'est jamais mesurée. Chaque test qui parcourt les fiches annotées exige d'en trouver une, et
 * le premier exige aussi une fiche sans notes : sans elles, rien ne serait prouvé. L'API doit donc servir les notes des
 * fiches du pilote (api #51 déployée et `ajala:hotspots:place --apply` passé sur elles).
 */
const CANDIDATES = [
  'giant/talon-1',
  'giant/anthem-advanced-sl-0',
  'trek/madone-sl-6-gen-8',
  'trek/checkpoint-alr-5-gen-3',
  'specialized/turbo-vado-sl-2-5-0-step-through-eq',
  'giant/propel-advanced-pro-ff',
  // Les noms les plus longs des lots en ligne (relevé du 13 octobre 2026) : à 960 px, « Advanced-Grade Composite front and
  // rear » (Giant), « AeroDrive base bar with Sync armrest set » (Giant) et « Rock Shox SID Select+ 3-Position Remote »
  // (Canyon) dépassaient du cadre de la fiche de 11 à 13 px.
  'giant/trance-x-advanced-0',
  'giant/trinity-advanced-sl-2',
  'canyon/lux-world-cup-cf-9',
] as const;
const LOCALES: readonly Locale[] = ['ar-sa', 'en-sa'];

interface Fiche {
  /** `{marque}/{slug}` : l'adresse de la fiche, et le nom de sa composition (`data-annotated`). */
  address: string;
  locale: Locale;
  build: Build;
  /** Les notes que l'API sert pour la photo de tête, ou null. */
  hotspots: HotspotImage | null;
}

type Annotated = Fiche & { hotspots: HotspotImage };
type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

let read: Promise<Fiche[]> | undefined;

/** Les candidates telles que l'API les sert, lues une fois par worker. */
function fiches(request: APIRequestContext): Promise<Fiche[]> {
  read ??= (async () => {
    const all: Fiche[] = [];
    for (const address of CANDIDATES) {
      for (const locale of LOCALES) {
        const [brand, slug] = address.split('/');
        const build = await readBuild(request, locale, brand, slug);
        // Une API antérieure à web #52 ne porte pas la clé : aucune note.
        const hotspots = build.hotspot_image ?? null;
        if (hotspots) {
          // Contrat : des notes décrivent la photo de tête, dans la scène que le site dessine. Un écart échoue ici.
          expect(hotspots.media_id, `${locale}/${address} : notes de la photo de tête`).toBe(build.images[0]?.id);
          expect(hotspots.scene, `${locale}/${address} : scène`).toBe(SCENE);
          expect(hotspots.points.length, `${locale}/${address} : au moins un point`).toBeGreaterThan(0);
        }
        all.push({ address, locale, build, hotspots });
      }
    }
    return all;
  })();
  return read;
}

async function annotated(request: APIRequestContext, locale?: Locale): Promise<Annotated[]> {
  const found = (await fiches(request)).filter((f): f is Annotated => f.hotspots !== null && (!locale || f.locale === locale));
  expect(found.length, `au moins une fiche annotée ${locale ?? ''} parmi ${CANDIDATES.join(', ')}`).toBeGreaterThan(0);
  return found;
}

const path = (f: Fiche) => `/${f.locale}/bikes/${f.address}`;
const name = (f: Fiche) => `${f.locale}/${f.address}`;
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/** La composition d'une fiche annotée, polices chargées. */
async function open(page: Page, f: Fiche, width: number): Promise<Locator> {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path(f));
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return page.locator(`[data-annotated="${f.address}"]`);
}

test('la fiche suit l’API : des notes si elle en sert, sinon la galerie ordinaire, chacune à sa largeur', async ({ page, request }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  let withNotes = 0;
  let without = 0;
  for (const f of await fiches(request)) {
    const response = await page.goto(path(f));
    expect(response?.status(), name(f)).toBe(200);
    const width = await page.locator('main').evaluate((main) => main.getBoundingClientRect().width);
    const scene = page.locator('[data-annotated]');
    if (f.hotspots) {
      withNotes++;
      await expect(scene, name(f)).toHaveAttribute('data-annotated', f.address);
      // Les numéros sont ceux de l'API, dans son ordre : le site n'en calcule aucun.
      await expect(scene.locator('[data-dot]'), name(f)).toHaveText(f.hotspots.points.map((p) => String(p.n)));
      expect(width, `${name(f)} : fiche élargie aux marges des notes`).toBe(1264);
    } else {
      without++;
      await expect(scene, name(f)).toHaveCount(0);
      expect(width, `${name(f)} : largeur ordinaire`).toBe(896);
      // Relecture du 10 octobre 2026 : `annotated={undefined}` écrivait la clé dans la charge RSC, invisible au DOM.
      const html = await (await request.get(path(f))).text();
      expect(html, `${name(f)} : clé annotated dans la charge RSC`).not.toMatch(/\\?"annotated\\?"\s*:/);
    }
  }
  expect(withNotes, 'au moins une fiche annotée').toBeGreaterThan(0);
  expect(without, 'au moins une fiche sans notes').toBeGreaterThan(0);
});

// La mise en page large commence à 900 px de conteneur : une fenêtre de 960 px en donne 912.
test('960, 1024 et 1440 : une note et un trait par point, hors photo, dans la scène, sans chevauchement', async ({ page, request }) => {
  test.setTimeout(300_000);
  for (const f of await annotated(request)) {
    const points = f.hotspots.points;
    for (const width of [960, 1024, 1440]) {
      const id = `${name(f)} ${width}`;
      const scene = await open(page, f, width);
      const sceneBox = (await scene.boundingBox())!;
      expect(sceneBox.width, `${id} : conteneur large`).toBeGreaterThanOrEqual(900);
      await expect(scene.locator('[data-dot]'), id).toHaveCount(points.length);
      await expect(scene.locator('[data-note]:visible'), id).toHaveCount(points.length);
      await expect(scene.locator('svg [data-leader]'), id).toHaveCount(points.length);
      const photo = (await scene.locator('img').first().boundingBox())!;
      const notes = await Promise.all((await scene.locator('[data-note]').all()).map(async (n) => (await n.boundingBox())!));
      notes.forEach((note, i) => {
        const at = `${id} : ${points[i].id}`;
        expect(overlap(note, photo), `${at} sur la photo`).toBe(false);
        expect(note.x >= sceneBox.x - 0.5 && note.x + note.width <= sceneBox.x + sceneBox.width + 0.5, `${at} hors scène`).toBe(true);
        notes.slice(i + 1).forEach((other, j) => expect(overlap(note, other), `${at} / ${points[i + j + 1].id}`).toBe(false));
      });
      // Le TEXTE de chaque note reste dans la scène, pas seulement sa boîte : une ligne trop longue se replie au lieu d'être
      // coupée par le cadre de la galerie (`overflow: hidden`). Relevé du 13 octobre 2026 : +12 px à 960 px.
      const outside = await scene.evaluate((root) => {
        const frame = root.getBoundingClientRect();
        const bad: string[] = [];
        root.querySelectorAll('[data-note] *').forEach((el) => {
          if (el.children.length > 0 || !el.textContent?.trim()) return;
          const range = document.createRange();
          range.selectNodeContents(el);
          for (const r of range.getClientRects()) {
            const over = Math.max(r.right - frame.right, frame.left - r.left);
            if (r.width > 0 && over > 0.5) bad.push(`${el.textContent.trim().slice(0, 60)} (+${Math.round(over)} px)`);
          }
        });
        return bad;
      });
      expect(outside, `${id} : texte hors de la scène`).toEqual([]);
    }
  }
});

test('1440 : la ligne manuscrite est le nom servi, la partie dessous ; sans nom, la partie seule', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const f of await annotated(request)) {
    const scene = await open(page, f, 1440);
    for (const [i, p] of f.hotspots.points.entries()) {
      const note = scene.locator('[data-note]').nth(i);
      const at = `${name(f)} : ${p.id}`;
      await expect(note.locator('[data-main]'), at).toHaveText(p.main ?? p.part);
      await expect(note.locator('[data-main] + span'), at).toHaveCount(p.main === null ? 0 : 1);
      if (p.main !== null) await expect(note.locator('[data-main] + span'), at).toHaveText(p.part);
    }
  }
});

test('390 : points seuls, un panneau, Échap rend le focus', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const f of await annotated(request)) {
    const scene = await open(page, f, 390);
    const first = f.hotspots.points[0];
    await expect(scene.locator('[data-note]:visible'), name(f)).toHaveCount(0);
    await expect(scene.locator('svg:visible'), name(f)).toHaveCount(0);
    const dot = scene.locator('[data-dot]').first();
    await dot.click();
    const detail = page.locator('[data-detail]');
    await expect(detail, name(f)).toBeVisible();
    await expect(detail, name(f)).toContainText(first.main ?? first.part);
    await expect(detail, name(f)).toContainText(first.note);
    await page.keyboard.press('Escape');
    await expect(detail, name(f)).toBeHidden();
    await expect(dot, name(f)).toBeFocused();
  }
});

// Relecture du 10 octobre 2026 : une hauteur réservée ne tenait ni à 320 px ni en anglais, et la page descendait.
test('320 et 390 : choisir un point ou masquer les notes ne change pas la hauteur', async ({ page, request }) => {
  test.setTimeout(300_000);
  for (const f of await annotated(request)) {
    for (const width of [320, 390]) {
      const id = `${name(f)} ${width}`;
      const scene = await open(page, f, width);
      const height = () => scene.evaluate((el) => el.getBoundingClientRect().height);
      const before = await height();
      // Au clavier : ce test mesure la hauteur, le toucher a le sien.
      for (const [i, point] of f.hotspots.points.entries()) {
        await scene.locator('[data-dot]').nth(i).focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-detail]'), id).toContainText(point.note);
        expect(await height(), `${id} : ${point.id}`).toBeCloseTo(before, 0);
      }
      await scene.getByRole('checkbox').focus();
      await page.keyboard.press('Space');
      await expect(scene.locator('[data-dot]'), id).toHaveCount(0);
      expect(await height(), `${id} : notes masquées`).toBeCloseTo(before, 0);
    }
  }
});

// Mesuré le 11 octobre 2026 : un nom d'un seul tenant plus large que le panneau le poussait hors de la scène.
test('320 et 390 : aucune explication ne sort du panneau', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const f of await annotated(request)) {
    for (const width of [320, 390]) {
      const scene = await open(page, f, width);
      const outside = await scene.locator('[data-dot]').first().evaluate((dot) => {
        const area = document.getElementById(dot.getAttribute('aria-controls')!)!;
        const box = area.getBoundingClientRect();
        return [...area.querySelectorAll('*')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.left < box.left - 0.5 || r.right > box.right + 0.5))
          .map(({ el, r }) => `${el.tagName.toLowerCase()} [${Math.round(r.left)}..${Math.round(r.right)}] hors [${Math.round(box.left)}..${Math.round(box.right)}] « ${(el.textContent ?? '').slice(0, 30)} »`);
      });
      expect(outside, `${name(f)} ${width} px`).toEqual([]);
    }
  }
});

// Relecture du 10 octobre 2026 : à 390 px, des cibles carrées de 44 px se recouvraient, et un toucher dans la bande
// commune allait au point suivant dans le DOM.
test('320 et 390 : un toucher va toujours au point le plus proche, cibles de 24 à 44 px', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const f of await annotated(request, 'en-sa')) {
    for (const width of [320, 390]) {
      const scene = await open(page, f, width);
      await scene.locator('img').first().evaluate((img) => img.scrollIntoView({ block: 'center' }));
      const faults = await scene.locator('[data-dot]').evaluateAll((dots) => {
        const centres = dots.map((dot) => {
          const r = dot.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: Math.min(r.width, r.height) };
        });
        const owner = (x: number, y: number) => dots.indexOf(document.elementFromPoint(x, y)?.closest('[data-dot]') as HTMLElement);
        const found: string[] = [];
        centres.forEach((a, i) => {
          if (a.size < 24 || a.size > 44) found.push(`point ${i + 1} : cible de ${a.size.toFixed(1)} px`);
          if (owner(a.x, a.y) !== i) found.push(`point ${i + 1} : son centre ne le touche pas`);
          centres.forEach((b, j) => {
            if (i !== j && owner(a.x + 0.45 * (b.x - a.x), a.y + 0.45 * (b.y - a.y)) === j) found.push(`près du point ${i + 1}, le toucher va au ${j + 1}`);
          });
        });
        return found;
      });
      expect(faults, `${name(f)} ${width} px`).toEqual([]);
    }
  }
});

// Relecture du 10 octobre 2026 : masquer les notes retire les points du DOM ; un point qui avait le focus le perdait.
test('390 : masquer les notes pendant qu’un point a le focus rend le focus à la case', async ({ page, request }) => {
  const [f] = await annotated(request, 'en-sa');
  const scene = await open(page, f, 390);
  await scene.locator('[data-dot]').first().focus();
  await scene.getByRole('checkbox').dispatchEvent('click');
  await expect(scene.locator('[data-dot]')).toHaveCount(0);
  await expect(scene.getByRole('checkbox')).toBeFocused();
});

test('ar-sa 1440 : tout le latin d’une ligne manuscrite est isolé dans <bdi>, l’arabe reste hors', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const f of await annotated(request, 'ar-sa')) {
    const scene = await open(page, f, 1440);
    const orphans = await scene.locator('[data-main]').evaluateAll((els) =>
      els.reduce((total, el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let count = 0;
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (/[A-Za-z]/.test(n.textContent ?? '') && !n.parentElement?.closest('bdi')) count++;
        }
        return total + count;
      }, 0),
    );
    expect(orphans, name(f)).toBe(0);
  }
});

/** x (bord gauche) du caractère `offset` de la première occurrence de `needle` dans le texte RENDU de `el`. */
async function glyphX(el: Locator, needle: string, offset: number): Promise<number> {
  return el.evaluate(
    (root, [needle, offset]) => {
      const nodes: Text[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
      let at = nodes.map((n) => n.data).join('').indexOf(needle);
      if (at < 0) throw new Error(`« ${needle} » absent`);
      at += offset;
      for (const node of nodes) {
        if (at < node.data.length) {
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + 1);
          return range.getBoundingClientRect().left;
        }
        at -= node.data.length;
      }
      throw new Error('hors du texte');
    },
    [needle, offset] as const,
  );
}

// Planche du 11 octobre 2026 : « 300 Series Alpha » s'affichait « Series Alpha 300 » sur une page arabe.
test('ar-sa 390 : un nom latin qui commence par un nombre s’affiche dans son ordre, à l’écran', async ({ page, request }) => {
  test.setTimeout(180_000);
  let checked = 0;
  for (const f of await annotated(request, 'ar-sa')) {
    for (const [i, p] of f.hotspots.points.entries()) {
      if (p.main === null || !/^\d+\s+[A-Za-z]/.test(p.main)) continue;
      const [number, word] = p.main.split(/\s+/);
      const scene = await open(page, f, 390);
      await scene.locator('[data-dot]').nth(i).focus();
      await page.keyboard.press('Enter');
      const line = page.locator('[data-detail] p').first();
      await expect(line, `${name(f)} : ${p.id}`).toContainText(p.main);
      const needle = `${number} ${word}`;
      expect(await glyphX(line, needle, 0), `${name(f)} : « ${needle} » se lit de gauche à droite`).toBeLessThan(await glyphX(line, needle, number.length + 1));
      checked++;
    }
  }
  expect(checked, 'au moins un nom qui commence par un nombre (Madone, Checkpoint)').toBeGreaterThan(0);
});

test('thème sombre : la scène reste claire, le texte sombre', async ({ page, request }) => {
  const [f] = await annotated(request);
  await page.addInitScript(() => localStorage.setItem('theme', 'dark'));
  const scene = await open(page, f, 1440);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const [background, color] = await scene.evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.backgroundColor, style.color];
  });
  expect(background).toBe('rgb(255, 255, 255)');
  expect(color).toBe('rgb(23, 23, 23)');
});

test('image bloquée : aucun point, une alerte', async ({ page, request }) => {
  const [f] = await annotated(request);
  await page.route(`**/media/${f.hotspots.media_id}/**`, (route) => route.abort());
  const scene = await open(page, f, 1440);
  // L'alerte de la scène, pas l'annonceur de route que Next pose sur chaque page (role="alert" lui aussi).
  await expect(scene.locator('[role="alert"]')).toBeVisible();
  await expect(scene.locator('[data-dot]')).toHaveCount(0);
});

test('une autre photo de la galerie s’affiche sans aucun point, la photo de tête les retrouve', async ({ page, request }) => {
  const f = (await annotated(request, 'en-sa')).find((candidate) => candidate.build.images.length > 1);
  expect(f, 'une fiche annotée avec plusieurs photos').toBeDefined();
  const total = f!.build.images.length;
  const scene = await open(page, f!, 1440);
  await expect(scene.locator('[data-dot]')).toHaveCount(f!.hotspots.points.length);
  await page.getByRole('button', { name: `Photo 2 of ${total}` }).click();
  await expect(page.locator('[data-annotated]')).toHaveCount(0);
  await page.getByRole('button', { name: `Photo 1 of ${total}` }).click();
  await expect(scene.locator('[data-dot]')).toHaveCount(f!.hotspots.points.length);
});

// Décision du fondateur du 11 octobre 2026 : le jaune, réglé à un seul endroit (`globals.css`) ; pas de sélecteur.
test('le soulignement est jaune, et la fiche publique n’a pas le sélecteur de l’aperçu', async ({ page, request }) => {
  const [f] = await annotated(request);
  const scene = await open(page, f, 1440);
  const color = await scene.locator('[data-main] [data-segment]').first().evaluate((el) => getComputedStyle(el, '::after').backgroundColor);
  expect(color).toBe('rgb(246, 215, 124)');
  await expect(page.locator('[data-accent-picker]')).toHaveCount(0);
});

test('ar-sa 1440 : alignement physique contre le trait (gauche à droite, droite à gauche, haut et bas au centre)', async ({ page, request }) => {
  test.setTimeout(180_000);
  for (const f of await annotated(request, 'ar-sa')) {
    const scene = await open(page, f, 1440);
    for (const [i, p] of f.hotspots.points.entries()) {
      if (p.main === null) continue;
      const note = scene.locator('[data-note]').nth(i);
      const main = (await note.locator('[data-main]').boundingBox())!;
      const part = (await note.locator('[data-main] + span').boundingBox())!;
      const at = `${name(f)} : ${p.id} (${p.label.side})`;
      if (p.label.side === 'left') expect(Math.abs(main.x + main.width - (part.x + part.width)), at).toBeLessThan(2);
      else if (p.label.side === 'right') expect(Math.abs(main.x - part.x), at).toBeLessThan(2);
      else expect(Math.abs(main.x + main.width / 2 - (part.x + part.width / 2)), at).toBeLessThan(2);
    }
  }
});

/** Les fichiers des polices manuscrites que la page déclare, et ceux qu'elle a téléchargés. */
async function handFonts(page: Page): Promise<{ declared: string[]; caveat: string[]; ruqaa: string[] }> {
  return page.evaluate(() => {
    const faces = [...document.styleSheets]
      .flatMap((sheet) => { try { return [...sheet.cssRules]; } catch { return []; } })
      .filter((rule): rule is CSSFontFaceRule => rule instanceof CSSFontFaceRule)
      // Une URL de `src` est relative à SA feuille de style (`../media/…`), jamais à la page.
      .map((rule) => ({
        family: rule.style.getPropertyValue('font-family'),
        urls: [...rule.style.getPropertyValue('src').matchAll(/url\("?([^")]+)"?\)/g)]
          .map((m) => new URL(m[1], rule.parentStyleSheet?.href ?? document.baseURI).pathname),
      }))
      .filter((face) => /Caveat|Aref Ruqaa/.test(face.family) && !/Fallback/.test(face.family));
    const loaded = new Set(performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname));
    const fetched = (family: RegExp) => faces.filter((face) => family.test(face.family)).flatMap((face) => face.urls).filter((url) => loaded.has(url));
    return { declared: faces.flatMap((face) => face.urls), caveat: fetched(/Caveat/), ruqaa: fetched(/Aref Ruqaa/) };
  });
}

// Décision du 12 octobre 2026 (`fonts.ts`) : sans préchargement, une police manuscrite ne se télécharge que si une note
// l'emploie. Et l'arabe d'une ligne manuscrite va à Aref Ruqaa : avant, le secours de Caveat (Arial) le prenait.
// Un contexte neuf par fiche : une page suivante dans le même onglet relit du cache les polices de la précédente.
test('polices manuscrites : rien sans notes, Caveat pour les noms, Aref Ruqaa seulement pour une ligne arabe', async ({ browser, request }) => {
  test.setTimeout(180_000);
  let arabicLines = 0;
  for (const f of await fiches(request)) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(path(f), { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const fonts = await handFonts(page);
    await context.close();
    expect(fonts.declared.length, `${name(f)} : polices déclarées`).toBeGreaterThan(0);
    if (!f.hotspots) {
      expect([...fonts.caveat, ...fonts.ruqaa], `${name(f)} : aucune police manuscrite sans notes`).toEqual([]);
      continue;
    }
    expect(fonts.caveat.length, `${name(f)} : Caveat pour les noms`).toBeGreaterThan(0);
    // De l'arabe dans une ligne manuscrite : un chiffre clé (« 120 مم ») ou la partie d'un point sans nom.
    if (f.hotspots.points.some((p) => /\p{Script=Arabic}/u.test(p.main ?? p.part))) {
      expect(fonts.ruqaa.length, `${name(f)} : Aref Ruqaa pour l’arabe manuscrit`).toBeGreaterThan(0);
      arabicLines++;
    } else {
      expect(fonts.ruqaa, `${name(f)} : aucune lettre arabe manuscrite, rien de la police arabe`).toEqual([]);
    }
  }
  expect(arabicLines, 'au moins une fiche arabe avec de l’arabe manuscrit').toBeGreaterThan(0);
});
