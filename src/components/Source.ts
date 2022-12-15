import { Brand, EqualsInterface, guard, HasEmptyIntance, JsonValue, SerializationInterface } from "./utils";

export type TermData<TermId> = {
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

export type SourceInterface<TermId, Source> = {
  all(source: Source): IterableIterator<[TermId, TermData<TermId>]>;
  get(source: Source, termId: TermId): TermData<TermId>;
  set(source: Source, termId: TermId, termData: TermData<TermId>): Source;
  rem(source: Source, termId: TermId): Source;
};

// TODO recursively remove embedded terms
export type SourceFacadeInterface<TermId, Source> = {
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

export type SourceFormattingInterface<TermId, Source> = {
  isRoot(source: Source, termId: TermId): boolean;
  getRoots(source: Source): Array<TermId>;
  getReferences(source: Source, termId: TermId): References<TermId>;
  getTermParameters(source: Source, termId: TermId): Array<TermId>;
  getTermBindings(source: Source, termId: TermId): Array<{ key: TermId; value: TermId | null }>;
};

type References<TermId> = {
  all: Set<TermId>;
  asReference: Set<TermId>;
  asBindingKey: Set<TermId>;
  asBindingValue: Map<TermId, TermId>;
  asParameter: Set<TermId>;
  asAnnotation: Set<TermId>;
};

export function createEmptyTermData<TermId>(): TermData<TermId> {
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

export type TermIdInterface<TermId> = {
  create(): TermId;
};

export function createSourceFacadeFromSourceInterface<TermId, Source>(
  sourceImplementation: SourceInterface<TermId, Source>,
  termIdImplementation: TermIdInterface<TermId>
): SourceFacadeInterface<TermId, Source> {
  return {
    create(source) {
      const newTermId = termIdImplementation.create();
      return [sourceImplementation.set(source, newTermId, createEmptyTermData()), newTermId] as [Source, TermId];
    },
    remove(source, termId) {
      source = sourceImplementation.rem(source, termId);
      for (const [id, termData] of sourceImplementation.all(source)) {
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
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), label });
    },
    setAnnotation(source, termId, annotationTermId) {
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), annotation: annotationTermId });
    },
    addParameter(source, termId, parameterTermId) {
      const termData = sourceImplementation.get(source, termId);
      const parameters = new Map(termData.parameters);
      parameters.set(parameterTermId, null);
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), parameters });
    },
    removeParameter(source, termId, parameterTermId) {
      const termData = sourceImplementation.get(source, termId);
      const parameters = new Map(termData.parameters);
      parameters.delete(parameterTermId);
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), parameters });
    },
    setType(source, termId, type) {
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), type });
    },
    setMode(source, termId, mode) {
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), mode });
    },
    setReference(source, termId, referenceTermId) {
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), reference: referenceTermId });
    },
    setBinding(source, termId, keyTermId, valueTermId) {
      const termData = sourceImplementation.get(source, termId);
      const bindings = new Map(termData.bindings);
      bindings.set(keyTermId, valueTermId);
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), bindings });
    },
    removeBinding(source, termId, keyTermId) {
      const termData = sourceImplementation.get(source, termId);
      const bindings = new Map(termData.bindings);
      bindings.delete(keyTermId);
      return sourceImplementation.set(source, termId, { ...sourceImplementation.get(source, termId), bindings });
    },
  };
}

export function createJsonValueSerializationFromSourceImplementation<TermId, Source>(
  sourceImplementation: SourceInterface<TermId, Source>,
  sourceHasEmptyIntance: HasEmptyIntance<Source>,
  termIdStringSerialization: SerializationInterface<TermId, string>
): SerializationInterface<Source, JsonValue> {
  return {
    serialize(source) {
      const result: JsonValue = {};
      for (const [termId, termData] of sourceImplementation.all(source)) {
        result[termIdStringSerialization.serialize(termId)] = {
          label: termData.label,
          annotation: termData.annotation && termIdStringSerialization.serialize(termData.annotation),
          parameters: Object.fromEntries([...termData.parameters.entries()].map(([k]) => [termIdStringSerialization.serialize(k), null])),
          type: termData.type as string,
          mode: termData.mode as string,
          reference: termData.reference && termIdStringSerialization.serialize(termData.reference),
          bindings: Object.fromEntries(
            [...termData.bindings.entries()].map(([k, v]) => [
              termIdStringSerialization.serialize(k),
              v && termIdStringSerialization.serialize(v),
            ])
          ),
        };
      }
      return result;
    },
    deserialize(jsonValue) {
      if (!guard.isObject(jsonValue)) throw new Error();
      return Object.entries(jsonValue).reduce((source, [termIdString, termDataJsonValue]) => {
        const termId = termIdStringSerialization.deserialize(termIdString);
        if (!guard.isObject(termDataJsonValue)) throw new Error();
        if (!("label" in termDataJsonValue && guard.isString(termDataJsonValue.label))) throw new Error();
        if (!("annotation" in termDataJsonValue && (guard.isString(termDataJsonValue.annotation) || termDataJsonValue.annotation === null)))
          throw new Error();
        if (!("parameters" in termDataJsonValue && guard.isObject(termDataJsonValue.parameters))) throw new Error();
        if (!("type" in termDataJsonValue && (termDataJsonValue.type === "lambda" || termDataJsonValue.type === "pi"))) throw new Error();
        if (!("mode" in termDataJsonValue && (termDataJsonValue.mode === "call" || termDataJsonValue.mode === "match"))) throw new Error();
        if (!("reference" in termDataJsonValue && (guard.isString(termDataJsonValue.reference) || termDataJsonValue.reference === null)))
          throw new Error();
        if (!("bindings" in termDataJsonValue && guard.isObject(termDataJsonValue.bindings))) throw new Error();
        const termData: TermData<TermId> = {
          label: termDataJsonValue.label,
          annotation: termDataJsonValue.annotation === null ? null : termIdStringSerialization.deserialize(termDataJsonValue.annotation),
          parameters: new Map(
            Object.entries(termDataJsonValue.parameters).map(([k, v]) => [termIdStringSerialization.deserialize(k), null])
          ),
          type: termDataJsonValue.type,
          mode: termDataJsonValue.mode,
          reference: termDataJsonValue.reference === null ? null : termIdStringSerialization.deserialize(termDataJsonValue.reference),
          bindings: new Map(
            Object.entries(termDataJsonValue.bindings).map(([k, v]) => {
              if (!(guard.isString(v) || v === null)) throw new Error();
              return [termIdStringSerialization.deserialize(k), v === null ? null : termIdStringSerialization.deserialize(v)];
            })
          ),
        };
        return sourceImplementation.set(source, termId, termData);
      }, sourceHasEmptyIntance.empty());
    },
  };
}

export function createJsMapSourceImplementation<TermId>(): SourceInterface<TermId, Map<TermId, TermData<TermId>>> {
  return {
    *all(source) {
      for (const [key, value] of source) {
        yield [key, value] as [TermId, TermData<TermId>];
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

export type HexStringOf32Byte = Brand<string, "HexStringOf32Byte">;
export const hexStringOf32ByteTermIdImplementation: TermIdInterface<HexStringOf32Byte> = {
  create() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("") as HexStringOf32Byte;
  },
};
export const hexStringOf32ByteStringSerialization: SerializationInterface<HexStringOf32Byte, string> = {
  serialize(deserialized) {
    return deserialized;
  },
  deserialize(serialized) {
    return serialized as HexStringOf32Byte;
  },
};
export const hexStringOf32ByteEqualsImplementation: EqualsInterface<HexStringOf32Byte> = {
  equals(a, b) {
    return a === b;
  },
};

export function createSourceFormmattingImplementationFromSourceImplementation<TermId, Source>(
  sourceImplementation: SourceInterface<TermId, Source>
): SourceFormattingInterface<TermId, Source> {
  function getReferences(source: Source) {
    const referencesById = new Map<TermId, References<TermId>>();
    for (const [termId] of sourceImplementation.all(source)) {
      const references: References<TermId> = {
        all: new Set(),
        asAnnotation: new Set(),
        asParameter: new Set(),
        asReference: new Set(),
        asBindingKey: new Set(),
        asBindingValue: new Map(),
      };
      for (const [parentTermId, { annotation, parameters, reference, bindings }] of sourceImplementation.all(source)) {
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
  const implementation: SourceFormattingInterface<TermId, Source> = {
    isRoot(source, termId) {
      const term = sourceImplementation.get(source, termId);
      const counts = getReferences(source).get(termId)!;
      const { label } = sourceImplementation.get(source, termId);
      if (counts.asParameter.size === 1) return false;
      if (
        counts.asAnnotation.size === 1 &&
        counts.asBindingValue.size + counts.asParameter.size + counts.asReference.size === 0 &&
        !term.annotation
      )
        return false;
      if (counts.asReference.size + counts.asBindingValue.size === 1 && counts.asAnnotation.size + counts.asParameter.size === 0 && !label)
        return false;
      if (
        counts.asAnnotation.size +
          counts.asParameter.size +
          counts.asReference.size +
          counts.asBindingKey.size +
          counts.asBindingValue.size ===
          1 &&
        !term.label
      )
        return false;
      return true;
    },
    getRoots(source) {
      const roots = Array.from(sourceImplementation.all(source))
        .filter(([termId]) => this.isRoot(source, termId))
        .map(([termId]) => termId);
      // TODO order by bottom-up usage
      return roots;
    },
    getReferences(source, termId) {
      return getReferences(source).get(termId)!;
    },
    getTermParameters(source, termId) {
      // TODO order by bottom-up usage
      return Array.from(sourceImplementation.get(source, termId).parameters.keys());
    },
    getTermBindings(source, termId) {
      // TODO order by (decide what)
      return Array.from(sourceImplementation.get(source, termId).bindings.entries()).map(([key, value]) => ({ key, value }));
    },
  };
  return implementation;
}
