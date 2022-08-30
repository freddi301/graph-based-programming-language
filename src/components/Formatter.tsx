import { Map } from "immutable";
import { Source, TermData, TermId } from "./Source";

export class Formatter {
  constructor(private source: Source) {}
  readonly roots = this.getRoots();
  private getRoots() {
    const referenceCounts = this.getReferenceCounts();
    return referenceCounts.filter((count, key) => {
      const { label } = this.source.terms.get(key, TermData.empty());
      return count !== 1 || label;
    });
  }
  private getReferenceCounts() {
    let countByTermId = Map<TermId, number>();
    for (const [termId] of this.source.terms.entries()) {
      countByTermId = countByTermId.update(termId, (count = 0) => count);
      for (const [, { reference, bindings }] of this.source.terms.entries()) {
        if (reference && reference.equals(termId)) {
          countByTermId = countByTermId.update(
            termId,
            (count = 0) => count + 1
          );
        }
        for (const [, val] of bindings.entries()) {
          if (val.equals(termId)) {
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
}
