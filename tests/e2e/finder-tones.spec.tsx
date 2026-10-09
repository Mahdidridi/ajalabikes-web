/** @jsxImportSource react */
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from '@playwright/test';
import { FinderQuestionScreen } from '@/app/[locale]/finder/question';
import type { FinderQuestion } from '@/lib/api';

/*
 * Decision du 9 octobre 2026 (fondateur) : seule la question RACINE du bikefinder teinte ses
 * tuiles. La regle est testee sur des questions SYNTHETIQUES : l'arbre servi par l'API ne
 * reutilise aucune cle de la racine plus bas, donc un test sur la vraie page ne verrait jamais
 * un ecran suivant se teinter par erreur. Les couleurs reelles, en clair et en sombre, sont
 * verifiees sur la vraie page par `finder.spec.ts`.
 */
const tuiles = (...cles: string[]): FinderQuestion => ({
  kind: 'tiles',
  label: 'Question',
  options: cles.map((cle) => ({ key: cle, label: cle, next: null })),
});

const rendu = (question: FinderQuestion, steps: string[]) =>
  renderToStaticMarkup(
    <main>
      <FinderQuestionScreen locale="en-sa" question={question} steps={steps} depth={steps.length} />
    </main>,
  );

test('un ecran suivant ne teinte ni n illustre rien, meme sur les cles de la racine', async ({ page }) => {
  await page.setContent(rendu(tuiles('road', 'mountain', 'kids'), ['mountain']));

  for (const cle of ['road', 'kids']) {
    const tuile = page.locator(`a[href="/en-sa/finder/mountain/${cle}"]`);
    await expect(tuile).not.toHaveClass(/bg-tone-/);
    await expect(tuile).toHaveClass(/bg-white/);
  }
  // Road et Mountain ont une illustration a la racine : plus bas, aucune image.
  await expect(page.locator('img')).toHaveCount(0);
});

test('une cle inconnue a la racine garde la tuile neutre et sans image, jamais une teinte devinee', async ({ page }) => {
  // `constructor` et `__proto__` : la table ne les definit pas, mais un objet litteral les heriterait.
  const inconnues = ['electric', 'constructor', '__proto__'];
  await page.setContent(rendu(tuiles('road', ...inconnues), []));

  // Temoin : a la racine, une cle connue est bien teintee — la comparaison a un sens.
  await expect(page.locator('a[href="/en-sa/finder/road"]')).toHaveClass(/bg-tone-lavender/);

  for (const cle of inconnues) {
    const tuile = page.locator(`a[href="/en-sa/finder/${cle}"]`);
    await expect(tuile).not.toHaveClass(/bg-tone-/);
    await expect(tuile).toHaveClass(/bg-white/);
  }
  // Une seule image dans la page : celle du temoin. Les cles inconnues n'en ont pas.
  await expect(page.locator('img')).toHaveCount(1);
});

/*
 * Illustrations des tuiles — decisions du 9 octobre 2026 (fondateur) : Road et Mountain d'abord,
 * puis les trois autres le meme jour ; les cinq tuiles de la racine portent leur illustration.
 * Decoratives (`alt=""`) : le nom accessible d'une tuile reste son libelle. Deux largeurs en
 * `srcset`, dimensions reservees (pas de saut de mise en page). `fichier` est le nom de base
 * servi, different de la cle d'option pour Gravel et City. Changer une illustration = ce tableau,
 * `finder/question.tsx`, `public/finder-art/` (nom versionne) et `CLAUDE.md` dans le meme commit.
 */
const ILLUSTRATIONS = {
  road: { fichier: 'road', largeur: 480, hauteur: 277 },
  mountain: { fichier: 'mountain', largeur: 480, hauteur: 263 },
  'gravel-cx': { fichier: 'gravel', largeur: 480, hauteur: 281 },
  'city-fitness': { fichier: 'city', largeur: 480, hauteur: 276 },
  kids: { fichier: 'kids', largeur: 480, hauteur: 267 },
} as const;

test('chaque tuile de la racine porte une illustration decorative, dimensionnee, en deux largeurs', async ({ page }) => {
  await page.setContent(rendu(tuiles(...Object.keys(ILLUSTRATIONS)), []));

  for (const [cle, { fichier, largeur, hauteur }] of Object.entries(ILLUSTRATIONS)) {
    // Decorative : le nom accessible du lien est le libelle, pas un texte de l'image.
    const tuile = page.getByRole('link', { name: cle, exact: true });
    await expect(tuile).toHaveCount(1);

    const image = tuile.locator('img');
    await expect(image).toHaveCount(1);
    await expect(image).toHaveAttribute('alt', '');
    await expect(image).toHaveAttribute('src', `/finder-art/${fichier}-480-v1.webp`);
    await expect(image).toHaveAttribute(
      'srcset',
      `/finder-art/${fichier}-320-v1.webp 320w, /finder-art/${fichier}-480-v1.webp 480w`,
    );
    await expect(image).toHaveAttribute('width', String(largeur));
    await expect(image).toHaveAttribute('height', String(hauteur));
  }
});
