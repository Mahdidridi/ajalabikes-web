import type { JsonLdObject } from '@/lib/jsonld';

/**
 * Un bloc de donnees structurees : UNE balise `<script type="application/ld+json">`
 * par objet, rendue cote serveur dans la page — Google la lit ou qu'elle
 * soit dans le document. Balise native, pas `next/script` : c'est de la
 * donnee, pas du code a executer.
 *
 * `<` est remplace par son code Unicode echappe : `JSON.stringify` ne protege pas d'un
 * `</script>` glisse dans une valeur venue de l'API.
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
