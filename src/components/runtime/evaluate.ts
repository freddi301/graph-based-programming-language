import { SourceFormatting, SourceStore, TermId } from "../Source";

export function evaluate<Source>({
  source,
  store,
  formatting,
}: {
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): {
  results: Map<TermId, TermId>;
  source: Source;
} {
  const results = new Map<TermId, TermId>();
  for (const termId of formatting.getRoots(source)) {
    const result = recu(termId, new Map());
    if (result && result !== termId) {
      results.set(termId, result);
    }
  }
  function recu(termId: TermId, scope: Map<TermId, TermId>): TermId | undefined {
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
    results,
    source,
  };
}
