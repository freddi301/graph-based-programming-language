import { Brand, guard, HasEmptyIntance, JsonValue, SerializationInterface } from "./utils";

export type SourceInterface<TermId, Source> = {
  all(source: Source): IterableIterator<[TermId, TermData<TermId>]>;
  get(source: Source, termId: TermId): TermData<TermId>;
  set(source: Source, termId: TermId, termData: TermData<TermId>): Source;
  rem(source: Source, termId: TermId): Source;
};

// TODO recursively remove terms
export type SourceFacadeInterface<TermId, Source> = {
  create(source: Source): [Source, TermId];
  remove(source: Source, termId: TermId): Source;
  setLabel(source: Source, termId: TermId, label: string): Source;
  setAnnotation(source: Source, termId: TermId, annotationTermId: TermId | null): Source;
  addParameter(source: Source, termId: TermId, parameterTermId: TermId): Source;
  removeParameter(source: Source, termId: TermId, parameterTermId: TermId): Source;
  setType(source: Source, termId: TermId, type: TermType): Source;
  setReference(source: Source, termId: TermId, referenceTermId: TermId | null): Source;
  setBinding(source: Source, termId: TermId, keyTermId: TermId, valueTermId: TermId | null): Source;
  removeBinding(source: Source, termId: TermId, keyTermId: TermId): Source;
};

export type TermType = "lambda" | "pi";

export type TermData<TermId> = {
  label: string;
  annotation: TermId | null;
  parameters: Map<TermId, null>;
  type: TermType;
  reference: TermId | null;
  bindings: Map<TermId, TermId | null>;
};

export function createEmptyTermData<TermId>(): TermData<TermId> {
  return {
    label: "",
    annotation: null,
    parameters: new Map(),
    type: "lambda",
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
      return sourceImplementation.rem(source, termId);
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
          reference: termData.reference && termIdStringSerialization.serialize(termData.reference),
          bindings: Object.fromEntries(
            [...termData.parameters.entries()].map(([k, v]) => [
              termIdStringSerialization.serialize(k),
              v && termIdStringSerialization.serialize(k),
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
          reference: termDataJsonValue.reference === null ? null : termIdStringSerialization.deserialize(termDataJsonValue.reference),
          bindings: new Map(
            Object.entries(termDataJsonValue.bindings).map(([k, v]) => {
              if (!guard.isString(v)) throw new Error();
              return [termIdStringSerialization.deserialize(k), termIdStringSerialization.deserialize(v)];
            })
          ),
        };
        return sourceImplementation.set(source, termId, termData);
      }, sourceHasEmptyIntance.empty());
    },
  };
}

export function createJsMapSourceImplementation<TermId>(
  termIdStringSerialization: SerializationInterface<TermId, string>
): SourceInterface<TermId, Map<string, TermData<TermId>>> {
  return {
    *all(source) {
      for (const [key, value] of source) {
        yield [termIdStringSerialization.deserialize(key), value] as [TermId, TermData<TermId>];
      }
    },
    get(source, termId) {
      return source.get(termIdStringSerialization.serialize(termId)) ?? createEmptyTermData();
    },
    set(source, termId, termData) {
      const newMap = new Map(source);
      newMap.set(termIdStringSerialization.serialize(termId), termData);
      return newMap;
    },
    rem(source, termId) {
      const newMap = new Map(source);
      newMap.delete(termIdStringSerialization.serialize(termId));
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

export type SourceFormattingInterface<TermId, Source> = {
  isRoot(source: Source, termId: TermId): boolean;
  getParents(source: Source, termId: TermId): Set<TermId>;
  getReferencesCount(source: Source, termId: TermId): ReferenceCounts<TermId>;
};

type ReferenceCounts<TermId> = {
  asReference: number;
  asBindingKey: number;
  asBindingValue: number;
  asParameter: Set<TermId>;
  asAnnotation: number;
};
export function createSourceFormmattingImplementationFromSourceImplementation<TermId, Source>(
  sourceImplementation: SourceInterface<TermId, Source>,
  termIdStringSerialization: SerializationInterface<TermId, string>
): SourceFormattingInterface<TermId, Source> {
  function getReferences(source: Source) {
    const countByTermId = new Map<string, ReferenceCounts<TermId>>();
    const parentsById = new Map<string, Set<TermId>>();
    for (const [termId] of sourceImplementation.all(source)) {
      const counts: ReferenceCounts<TermId> = {
        asReference: 0,
        asBindingKey: 0,
        asBindingValue: 0,
        asParameter: new Set(),
        asAnnotation: 0,
      };
      const parents = new Set<TermId>();
      for (const [parentTermId, { annotation, parameters, reference, bindings }] of sourceImplementation.all(source)) {
        if (annotation && annotation === termId) {
          counts.asAnnotation += 1;
          parents.add(parentTermId);
        }
        for (const [val] of parameters.entries()) {
          if (val === termId) {
            counts.asParameter.add(parentTermId);
            parents.add(parentTermId);
          }
        }
        if (reference && reference === termId) {
          counts.asReference += 1;
          parents.add(parentTermId);
        }
        for (const [key, val] of bindings.entries()) {
          if (key === termId) {
            counts.asBindingKey += 1;
            parents.add(parentTermId);
          }
          if (val === termId) {
            counts.asBindingValue += 1;
            parents.add(parentTermId);
          }
        }
        countByTermId.set(termIdStringSerialization.serialize(termId), counts);
        parentsById.set(termIdStringSerialization.serialize(termId), parents);
      }
    }
    return {
      counts: countByTermId,
      parents: parentsById,
    };
  }
  const implementation: SourceFormattingInterface<TermId, Source> = {
    isRoot(source, termId) {
      const term = sourceImplementation.get(source, termId);
      const counts = getReferences(source).counts.get(termIdStringSerialization.serialize(termId))!;
      const { label } = sourceImplementation.get(source, termId);
      if (counts.asParameter.size === 1) return false;
      if (counts.asAnnotation === 1 && counts.asBindingValue + counts.asParameter.size + counts.asReference === 0 && !term.annotation)
        return false;
      if (counts.asReference + counts.asBindingValue === 1 && counts.asAnnotation + counts.asParameter.size === 0 && !label) return false;
      return true;
    },
    getParents(source, termId) {
      return getReferences(source).parents.get(termIdStringSerialization.serialize(termId)) ?? new Set();
    },
    getReferencesCount(source, termId) {
      return getReferences(source).counts.get(termIdStringSerialization.serialize(termId))!;
    },
  };
  return implementation;
}
