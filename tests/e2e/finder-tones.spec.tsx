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

test('un ecran suivant ne teinte rien, meme sur les cles de la racine', async ({ page }) => {
  await page.setContent(rendu(tuiles('road', 'kids'), ['mountain']));

  for (const cle of ['road', 'kids']) {
    const tuile = page.locator(`a[href="/en-sa/finder/mountain/${cle}"]`);
    await expect(tuile).not.toHaveClass(/bg-tone-/);
    await expect(tuile).toHaveClass(/bg-white/);
  }
});

test('une cle inconnue a la racine garde la tuile neutre, jamais une teinte devinee', async ({ page }) => {
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
});
