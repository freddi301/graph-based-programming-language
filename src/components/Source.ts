import { Brand, guard, HasEmptyIntance, JsonValue, SerializationInterface } from "./utils";

export type TermId = Brand<string, "TermId as hex string of 32 bytes">;

export type TermData = {
  label: string;
  annotation: TermId | null;
  parameters: Map<TermId, null>;
  type: TermType;
  mode: TermMode;
  reference: TermId | null;
  bindings: Map<TermId, TermId | null>;
};
export type TermType = "lambda" | "pi";
export type TermMode = "call" | "match";

export type SourceStore<Source> = {
  all(source: Source): IterableIterator<[TermId, TermData]>;
  get(source: Source, termId: TermId): TermData;
  set(source: Source, termId: TermId, termData: TermData): Source;
  rem(source: Source, termId: TermId): Source;
};

// TODO recursively remove embedded terms
export type SourceInsert<Source> = {
  create(source: Source): [Source, TermId];
  remove(source: Source, termId: TermId): Source;
  setLabel(source: Source, termId: TermId, label: string): Source;
  setAnnotation(source: Source, termId: TermId, annotationTermId: TermId | null): Source;
  addParameter(source: Source, termId: TermId, parameterTermId: TermId): Source;
  removeParameter(source: Source, termId: TermId, parameterTermId: TermId): Source;
  setType(source: Source, termId: TermId, type: TermType): Source;
  setMode(source: Source, termId: TermId, mode: TermMode): Source;
  setReference(source: Source, termId: TermId, referenceTermId: TermId | null): Source;
  setBinding(source: Source, termId: TermId, keyTermId: TermId, valueTermId: TermId | null): Source;
  removeBinding(source: Source, termId: TermId, keyTermId: TermId): Source;
};

export type SourceFormatting<Source> = {
  isRoot(source: Source, termId: TermId): boolean;
  getRoots(source: Source): Array<TermId>;
  getReferences(source: Source, termId: TermId): References;
  getTermParameters(source: Source, termId: TermId): Array<TermId>;
  getTermBindings(source: Source, termId: TermId): Array<{ key: TermId; value: TermId | null }>;
};

type References = {
  all: Set<TermId>;
  asReference: Set<TermId>;
  asBindingKey: Set<TermId>;
  asBindingValue: Map<TermId, TermId>;
  asParameter: Set<TermId>;
  asAnnotation: Set<TermId>;
};

// eslint-disable-next-line
export const TermId = {
  create() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("") as TermId;
  },
  isValid(value: unknown): value is TermId {
    if (typeof value !== "string") return false;
    return /^[0-9a-f]{64}$/.test(value);
  },
};

export function createEmptyTermData(): TermData {
  return {
    label: "",
    annotation: null,
    parameters: new Map(),
    type: "lambda",
    mode: "call",
    reference: null,
    bindings: new Map(),
  };
}

export function createSourceInsertFromSourceStoreAndFormatting<Source>(
  store: SourceStore<Source>,
  formatting: SourceFormatting<Source>
): SourceInsert<Source> {
  function unset(source: Source, termId: TermId) {
    const termData = store.get(source, termId);
    const references = formatting.getReferences(source, termId);
    if (references.all.size <= 1) {
      source = store.rem(source, termId);
      if (termData.annotation) {
        source = unset(source, termData.annotation);
      }
      for (const [parameterTermId] of termData.parameters) {
        source = unset(source, parameterTermId);
      }
      if (termData.reference) {
        source = unset(source, termData.reference);
      }
      for (const [keyTermId, valueTermId] of termData.bindings) {
        source = unset(source, keyTermId);
        if (valueTermId) {
          source = unset(source, keyTermId);
        }
      }
    }
    return source;
  }
  return {
    create(source) {
      const newTermId = TermId.create();
      return [store.set(source, newTermId, createEmptyTermData()), newTermId] as [Source, TermId];
    },
    remove(source, termId) {
      // TODO fix, use unset too
      source = store.rem(source, termId);
      for (const [id, termData] of store.all(source)) {
        if (termData.annotation === termId) source = this.setAnnotation(source, id, null);
        if (termData.parameters.has(termId)) source = this.removeParameter(source, id, termId);
        if (termData.reference === termId) source = this.setReference(source, id, null);
        if (termData.bindings.has(termId)) source = this.removeBinding(source, id, termId);
        for (const [bindingKey, bindingValue] of termData.bindings.entries()) {
          if (bindingValue === termId) source = this.setBinding(source, id, bindingKey, null);
        }
      }
      return source;
    },
    setLabel(source, termId, label) {
      return store.set(source, termId, { ...store.get(source, termId), label });
    },
    setAnnotation(source, termId, annotationTermId) {
      const termData = store.get(source, termId);
      if (termData.annotation) {
        source = unset(source, termData.annotation);
      }
      return store.set(source, termId, { ...termData, annotation: annotationTermId });
    },
    addParameter(source, termId, parameterTermId) {
      const termData = store.get(source, termId);
      const parameters = new Map(termData.parameters);
      parameters.set(parameterTermId, null);
      return store.set(source, termId, { ...store.get(source, termId), parameters });
    },
    removeParameter(source, termId, parameterTermId) {
      const termData = store.get(source, termId);
      const parameters = new Map(termData.parameters);
      parameters.delete(parameterTermId);
      source = unset(source, parameterTermId);
      return store.set(source, termId, { ...termData, parameters });
    },
    setType(source, termId, type) {
      return store.set(source, termId, { ...store.get(source, termId), type });
    },
    setMode(source, termId, mode) {
      return store.set(source, termId, { ...store.get(source, termId), mode });
    },
    setReference(source, termId, referenceTermId) {
      const termData = store.get(source, termId);
      if (termData.reference) {
        source = unset(source, termData.reference);
      }
      return store.set(source, termId, { ...termData, reference: referenceTermId });
    },
    setBinding(source, termId, keyTermId, valueTermId) {
      const termData = store.get(source, termId);
      const bindings = new Map(termData.bindings);
      bindings.set(keyTermId, valueTermId);
      if (termData.bindings.get(keyTermId)) {
        source = unset(source, termData.bindings.get(keyTermId)!);
      }
      return store.set(source, termId, { ...termData, bindings });
    },
    removeBinding(source, termId, keyTermId) {
      const termData = store.get(source, termId);
      const bindings = new Map(termData.bindings);
      bindings.delete(keyTermId);
      source = unset(source, keyTermId);
      if (termData.bindings.get(keyTermId)) {
        source = unset(source, termData.bindings.get(keyTermId)!);
      }
      return store.set(source, termId, { ...termData, bindings });
    },
  };
}

export function createJsonValueSerializationFromSourceStore<Source>(
  store: SourceStore<Source>,
  sourceHasEmptyIntance: HasEmptyIntance<Source>
): SerializationInterface<Source, JsonValue> {
  return {
    serialize(source) {
      const result: JsonValue = {};
      for (const [termId, termData] of store.all(source)) {
        result[termId] = {
          label: termData.label,
          annotation: termData.annotation && termData.annotation,
          parameters: Object.fromEntries([...termData.parameters.entries()].map(([k]) => [k, null])),
          type: termData.type as string,
          mode: termData.mode as string,
          reference: termData.reference && termData.reference,
          bindings: Object.fromEntries([...termData.bindings.entries()].map(([k, v]) => [k, v])),
        };
      }
      return result;
    },
    deserialize(jsonValue) {
      if (!guard.isObject(jsonValue)) throw new Error();
      return Object.entries(jsonValue).reduce((source, [termId, termDataJsonValue]) => {
        if (!TermId.isValid(termId)) throw new Error();
        if (!guard.isObject(termDataJsonValue)) throw new Error();
        if (!("label" in termDataJsonValue && guard.isString(termDataJsonValue.label))) throw new Error();
        if (!("annotation" in termDataJsonValue && (TermId.isValid(termDataJsonValue.annotation) || termDataJsonValue.annotation === null)))
          throw new Error();
        if (!("parameters" in termDataJsonValue && guard.isObject(termDataJsonValue.parameters))) throw new Error();
        if (!("type" in termDataJsonValue && (termDataJsonValue.type === "lambda" || termDataJsonValue.type === "pi"))) throw new Error();
        if (!("mode" in termDataJsonValue && (termDataJsonValue.mode === "call" || termDataJsonValue.mode === "match"))) throw new Error();
        if (!("reference" in termDataJsonValue && (TermId.isValid(termDataJsonValue.reference) || termDataJsonValue.reference === null)))
          throw new Error();
        if (!("bindings" in termDataJsonValue && guard.isObject(termDataJsonValue.bindings))) throw new Error();
        const termData: TermData = {
          label: termDataJsonValue.label,
          annotation: termDataJsonValue.annotation,
          parameters: new Map(
            Object.entries(termDataJsonValue.parameters).map(([k, v]) => {
              if (!TermId.isValid(k)) throw new Error();
              return [k, null];
            })
          ),
          type: termDataJsonValue.type,
          mode: termDataJsonValue.mode,
          reference: termDataJsonValue.reference,
          bindings: new Map(
            Object.entries(termDataJsonValue.bindings).map(([k, v]) => {
              if (!TermId.isValid(k)) throw new Error();
              if (v !== null && !TermId.isValid(v)) throw new Error();
              return [k, v];
            })
          ),
        };
        return store.set(source, termId, termData);
      }, sourceHasEmptyIntance.empty());
    },
  };
}

export function createJsMapSourceStore(): SourceStore<Map<TermId, TermData>> {
  return {
    *all(source) {
      for (const [key, value] of source) {
        yield [key, value] as [TermId, TermData];
      }
    },
    get(source, termId) {
      return source.get(termId) ?? createEmptyTermData();
    },
    set(source, termId, termData) {
      const newMap = new Map(source);
      newMap.set(termId, termData);
      return newMap;
    },
    rem(source, termId) {
      const newMap = new Map(source);
      newMap.delete(termId);
      return newMap;
    },
  };
}
export function createJsMapHasEmptyInstance<K, V>(): HasEmptyIntance<Map<K, V>> {
  return {
    empty() {
      return new Map();
    },
  };
}

export function createSourceFormmattingFromSourceStore<Source>(store: SourceStore<Source>): SourceFormatting<Source> {
  function createEmptyReferences(): References {
    return {
      all: new Set(),
      asAnnotation: new Set(),
      asParameter: new Set(),
      asReference: new Set(),
      asBindingKey: new Set(),
      asBindingValue: new Map(),
    };
  }
  function getReferences(source: Source, except: Set<TermId>) {
    const referencesById = new Map<TermId, References>();
    for (const [termId] of store.all(source)) {
      const references = createEmptyReferences();
      for (const [parentTermId, { annotation, parameters, reference, bindings }] of store.all(source)) {
        if (except.has(parentTermId)) continue;
        if (annotation && annotation === termId) {
          references.asAnnotation.add(parentTermId);
          references.all.add(parentTermId);
        }
        for (const [val] of parameters.entries()) {
          if (val === termId) {
            references.asParameter.add(parentTermId);
            references.all.add(parentTermId);
          }
        }
        if (reference && reference === termId) {
          references.asReference.add(parentTermId);
          references.all.add(parentTermId);
        }
        for (const [key, val] of bindings.entries()) {
          if (key === termId) {
            references.asBindingKey.add(parentTermId);
            references.all.add(parentTermId);
          }
          if (val === termId) {
            references.asBindingValue.set(key, parentTermId);
            references.all.add(parentTermId);
          }
        }
        referencesById.set(termId, references);
      }
    }
    return referencesById;
  }
  const implementation: SourceFormatting<Source> = {
    isRoot(source, termId) {
      const termData = store.get(source, termId);
      const references = this.getReferences(source, termId);
      if (references.asParameter.size === 1) return false;
      if (
        references.asAnnotation.size === 1 &&
        references.asBindingKey.size + references.asBindingValue.size + references.asParameter.size + references.asReference.size === 0 &&
        !termData.annotation &&
        !termData.label
      )
        return false;
      if (
        references.asAnnotation.size +
          references.asParameter.size +
          references.asReference.size +
          references.asBindingKey.size +
          references.asBindingValue.size ===
          1 &&
        !termData.label
      )
        return false;
      return true;
    },
    getRoots(source) {
      const remainingRoots = new Set<TermId>();
      const except = new Set<TermId>();
      const orderedRoots: Array<TermId> = [];
      for (const [termId] of store.all(source)) {
        if (this.isRoot(source, termId)) {
          remainingRoots.add(termId);
        } else {
          except.add(termId);
        }
      }
      while (true) {
        const startRemainingSize = remainingRoots.size;
        const references = getReferences(source, new Set(except));
        for (const termId of Array.from(remainingRoots)) {
          if (references.get(termId)!.all.size === 0) {
            orderedRoots.push(termId);
            remainingRoots.delete(termId);
            except.add(termId);
          }
        }
        const endReminingSize = remainingRoots.size;
        if (startRemainingSize === endReminingSize) break;
      }
      for (const termId of remainingRoots) {
        orderedRoots.unshift(termId);
      }
      return orderedRoots.reverse();
    },
    getReferences(source, termId) {
      return getReferences(source, new Set()).get(termId) ?? createEmptyReferences();
    },
    getTermParameters(source, termId) {
      // TODO order by bottom-up usage
      return Array.from(store.get(source, termId).parameters.keys());
    },
    getTermBindings(source, termId) {
      // TODO order by (decide what)
      return Array.from(store.get(source, termId).bindings.entries()).map(([key, value]) => ({ key, value }));
    },
  };
  return implementation;
}
