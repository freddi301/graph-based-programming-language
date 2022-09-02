import { Map } from "immutable";
import { Source, TermData, TermId } from "./Source";

export type Formatter = ReturnType<typeof Formatter>;
export function Formatter(source: Source) {
  const roots = getRoots(source);
  return { roots };
}

function getRoots(source: Source) {
  const referenceCounts = getReferenceCounts(source);
  return referenceCounts.filter((count, key) => {
    const { label } = source.terms.get(key, TermData.empty);
    return count !== 1 || label;
  });
}

function getReferenceCounts(source: Source) {
  let countByTermId = Map<TermId, number>();
  for (const [termId] of source.terms.entries()) {
    countByTermId = countByTermId.update(termId, (count = 0) => count);
    for (const [, { reference, bindings }] of source.terms.entries()) {
      if (reference && reference === termId) {
        countByTermId = countByTermId.update(termId, (count = 0) => count + 1);
      }
      for (const [, val] of bindings.entries()) {
        if (val === termId) {
          countByTermId = countByTermId.update(
            termId,
            (count = 0) => count + 1
          );
        }
      }
    }
  }
  return countByTermId;
}
