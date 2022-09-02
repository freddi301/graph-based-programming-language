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
    console.log(label, count);
    if (count.asReference + count.asBinding === 0) {
      if (count.asParameter > 0) return false;
      return true;
    }
    if (count.asReference + count.asBinding === 1) {
      if (label) return true;
      return false;
    }
    if (count.asReference + count.asBinding > 1) return true;
    throw new Error("booo");
  });
}

function getReferenceCounts(source: Source) {
  let countByTermId = Map<
    TermId,
    { asReference: number; asBinding: number; asParameter: number }
  >();
  const defualtCount = { asReference: 0, asBinding: 0, asParameter: 0 };
  for (const [termId] of source.terms.entries()) {
    countByTermId = countByTermId.update(
      termId,
      (count = defualtCount) => count
    );
    for (const [
      ,
      { parameters, reference, bindings },
    ] of source.terms.entries()) {
      for (const [val] of parameters.entries()) {
        if (val === termId) {
          countByTermId = countByTermId.update(
            termId,
            (count = defualtCount) => ({
              ...count,
              asParameter: count.asParameter + 1,
            })
          );
        }
      }
      if (reference && reference === termId) {
        countByTermId = countByTermId.update(
          termId,
          (count = defualtCount) => ({
            ...count,
            asReference: count.asReference + 1,
          })
        );
      }
      for (const [, val] of bindings.entries()) {
        if (val === termId) {
          countByTermId = countByTermId.update(
            termId,
            (count = defualtCount) => ({
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
