import { expect, test, type Page } from '@playwright/test';

/**
 * Noms latins dans une page arabe.
 *
 * Onze modeles du catalogue finissent par un signe : « Borrego+ », « Talon E+ »,
 * « Ponto Go! », « Precaliber 20" », « TCR Advanced Pro (Dura-Ace) »… Dans une
 * page en RTL, l'algorithme bidirectionnel rattache ce signe final au sens de
 * lecture de la page et le rend DE L'AUTRE COTE du mot : « +Borrego ». Le DOM
 * est juste, le rendu est faux — aucun test qui lit le texte ne le voit.
 *
 * On mesure donc le rendu : la boite du dernier caractere doit se trouver a
 * droite de celle du premier. Un nom latin isole se lit de gauche a droite,
 * quelle que soit la direction de la page.
 */
const BORREGO_AR = '/ar-sa/bikes/trek/borrego';
const BORREGO_EN = '/en-sa/bikes/trek/borrego';

/** x du premier et du dernier caractere rendus du texte d'un element. */
async function bords(page: Page, selector: string): Promise<{ premier: number; dernier: number }> {
  return page.locator(selector).first().evaluate((el) => {
    const noeud = (function chercher(n: Node): Text | null {
      if (n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim()) return n as Text;
      for (const enfant of Array.from(n.childNodes)) {
        const t = chercher(enfant);
        if (t) return t;
      }
      return null;
    })(el);
    if (!noeud) throw new Error('aucun texte dans ' + el.tagName);
    const texte = noeud.textContent ?? '';
    const debut = texte.search(/\S/);
    const fin = texte.search(/\S\s*$/);
    const r1 = document.createRange();
    r1.setStart(noeud, debut);
    r1.setEnd(noeud, debut + 1);
    const r2 = document.createRange();
    r2.setStart(noeud, fin);
    r2.setEnd(noeud, fin + 1);
    return { premier: r1.getBoundingClientRect().left, dernier: r2.getBoundingClientRect().left };
  });
}

test('en arabe, « Borrego+ » garde son + a droite dans le titre de la fiche', async ({ page }) => {
  await page.goto(BORREGO_AR);
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Borrego+');

  const { premier, dernier } = await bords(page, 'h1');
  expect(dernier, 'le « + » doit etre rendu a droite du « B »').toBeGreaterThan(premier);
});

test('en arabe, le nom garde son + a droite sur la carte du catalogue', async ({ page }) => {
  // Trie par nom, « Borrego+ » est la premiere carte des Trek : pas de pagination
  // a traverser, et le tri ne bouge pas avec l'arrivee de nouveaux millesimes.
  await page.goto('/ar-sa/bikes?brand=trek&sort=name');
  // `exact` : sans lui, « Borrego+ » attrape aussi « Borrego+ S ».
  await expect(page.getByRole('heading', { level: 2, name: 'Borrego+', exact: true })).toBeVisible();

  const { premier, dernier } = await bords(page, 'h2:has-text("Borrego+")');
  expect(dernier, 'le « + » doit etre rendu a droite du « B »').toBeGreaterThan(premier);
});

test('en anglais, rien ne change', async ({ page }) => {
  await page.goto(BORREGO_EN);
  const { premier, dernier } = await bords(page, 'h1');
  expect(dernier).toBeGreaterThan(premier);
});
