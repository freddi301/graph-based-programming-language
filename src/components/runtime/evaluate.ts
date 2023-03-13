import { SourceStore, TermId } from "../Source";

export function evaluate<Source>({ termId, source, store }: { termId: TermId; source: Source; store: SourceStore<Source> }): {
  result: TermId | undefined;
  source: Source;
} {
  let credit = 100;
  function recu(termId: TermId, scope: Map<TermId, TermId>): TermId | undefined {
    if (credit-- <= 0) {
      return undefined;
    }
    const termData = store.get(source, termId);
    if (termData.mode === "call" && termData.reference) {
      const newScope = new Map(scope);
      termData.bindings.forEach((value, key) => value && newScope.set(key, value));
      return recu(termData.reference, newScope);
    }
    if (termData.mode === "match") {
      for (const [bindingKey, bindingValue] of termData.bindings) {
        if (termData.reference) {
          const reference = recu(scope.get(termData.reference) ?? termData.reference, scope);
          if (bindingKey === reference && bindingValue) return recu(bindingValue, scope);
        }
      }
    }
    return scope.get(termId) ?? termId;
  }
  return {
    result: recu(termId, new Map()),
    source,
  };
}
