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
    if (
      count.asParameter === 1 &&
      count.asBinding + count.asAnnotation + count.asReference === 0
    )
      return false;
    if (label) return true;
    if (
      count.asAnnotation === 1 &&
      count.asBinding + count.asParameter + count.asReference === 0
    )
      return false;
    if (
      count.asReference + count.asBinding === 1 &&
      count.asAnnotation + count.asParameter === 0
    )
      return false;
    return true;
  });
}

function getReferenceCounts(source: Source) {
  type Counts = {
    asReference: number;
    asBinding: number;
    asParameter: number;
    asAnnotation: number;
  };
  let countByTermId = Map<TermId, Counts>();
  const defaultCount: Counts = {
    asReference: 0,
    asBinding: 0,
    asParameter: 0,
    asAnnotation: 0,
  };
  for (const [termId] of source.terms.entries()) {
    countByTermId = countByTermId.update(
      termId,
      (count = defaultCount) => count
    );
    for (const [
      ,
      { annotation, parameters, reference, bindings },
    ] of source.terms.entries()) {
      if (annotation && annotation === termId) {
        countByTermId = countByTermId.update(
          termId,
          (count = defaultCount) => ({
            ...count,
            asAnnotation: count.asAnnotation + 1,
          })
        );
      }

      for (const [val] of parameters.entries()) {
        if (val === termId) {
          countByTermId = countByTermId.update(
            termId,
            (count = defaultCount) => ({
              ...count,
              asParameter: count.asParameter + 1,
            })
          );
        }
      }

      if (reference && reference === termId) {
        countByTermId = countByTermId.update(
          termId,
          (count = defaultCount) => ({
            ...count,
            asReference: count.asReference + 1,
          })
        );
      }

      for (const [, val] of bindings.entries()) {
        if (val === termId) {
          countByTermId = countByTermId.update(
            termId,
            (count = defaultCount) => ({
              ...count,
              asBinding: count.asBinding + 1,
            })
          );
        }
      }
    }
  }
  return countByTermId;
}
