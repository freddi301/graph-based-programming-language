import { Map } from "immutable";
import { Brand } from "./Brand";

export type Source = {
  terms: Map<TermId, TermData>;
};
export const Source = {
  empty: { terms: Map() } as Source,
  setTerm(source: Source, termId: TermId, termData: TermData): Source {
    return { terms: source.terms.set(termId, termData) };
  },
  createTerm(source: Source, label: string): [Source, TermId] {
    const termId = TermId.create();
    return [
      { terms: source.terms.set(termId, { ...TermData.empty, label }) },
      termId,
    ];
  },
  removeTerm(source: Source, termId: TermId): Source {
    return { terms: source.terms.delete(termId) };
  },
  renameTerm(source: Source, termId: TermId, label: string): Source {
    return {
      terms: source.terms.update(termId, (termData = TermData.empty) => ({
        ...termData,
        label,
      })),
    };
  },
  changeTermType(
    source: Source,
    termId: TermId,
    type: "lambda" | "pi"
  ): Source {
    return {
      terms: source.terms.update(termId, (termData = TermData.empty) => ({
        ...termData,
        type,
      })),
    };
  },
  addParameter(
    source: Source,
    functionTermId: TermId,
    parameterTermId: TermId
  ): Source {
    return {
      terms: source.terms.update(
        functionTermId,
        (termData = TermData.empty) => ({
          ...termData,
          parameters: termData.parameters.set(parameterTermId, null),
        })
      ),
    };
  },
  removeParameter(
    source: Source,
    functionTermId: TermId,
    parameterTermId: TermId
  ): Source {
    return {
      terms: source.terms.update(
        functionTermId,
        (termData = TermData.empty) => ({
          ...termData,
          parameters: termData.parameters.delete(parameterTermId),
        })
      ),
    };
  },
  setReference(
    source: Source,
    termId: TermId,
    referenceTermId: TermId | null
  ): Source {
    return {
      terms: source.terms.update(termId, (termData = TermData.empty) => ({
        ...termData,
        reference: referenceTermId,
      })),
    };
  },
  setBinding(
    source: Source,
    termId: TermId,
    keyTermId: TermId,
    valueTermId: TermId | null
  ): Source {
    return {
      terms: source.terms.update(termId, (termData = TermData.empty) => ({
        ...termData,
        bindings: termData.bindings.set(keyTermId, valueTermId),
      })),
    };
  },
  removeBinding(source: Source, termId: TermId, keyTermId: TermId): Source {
    return {
      terms: source.terms.update(termId, (termData = TermData.empty) => ({
        ...termData,
        bindings: termData.bindings.delete(keyTermId),
      })),
    };
  },
  toJSON(source: Source): string {
    return JSON.stringify(
      Object.fromEntries(
        (function* () {
          for (const [key, value] of source.terms.entries()) {
            yield [
              key,
              {
                label: value.label,
                parameters: Object.fromEntries(
                  (function* () {
                    for (const [key] of value.parameters.entries()) {
                      yield [key, null];
                    }
                  })()
                ),
                reference: value.reference,
                bindings: Object.fromEntries(
                  (function* () {
                    for (const [key, val] of value.bindings.entries()) {
                      yield [key, val];
                    }
                  })()
                ),
              },
            ];
          }
        })()
      ),
      null,
      2
    );
  },
  fromJSON(json: string) {
    const parsed = JSON.parse(json);
    const source = Object.entries(parsed).reduce(
      (source, [termId, { label, parameters, reference, bindings }]: any) =>
        Source.setTerm(
          source,
          termId,
          Object.entries(bindings).reduce(
            (termData, [key, value]: any) => ({
              ...termData,
              bindings: termData.bindings.set(key, value),
            }),
            Object.entries(parameters).reduce(
              (termData, [key]) => ({
                ...termData,
                parameters: termData.parameters.set(key as TermId, null),
              }),
              { ...TermData.empty, label, reference }
            )
          )
        ),
      Source.empty
    );
    return source;
  },
};

export type TermId = Brand<string, "TermId">;
export const TermId = {
  create(): TermId {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("") as TermId;
  },
};

export type TermData = {
  label: string;
  parameters: Map<TermId, null>;
  reference: TermId | null;
  bindings: Map<TermId, TermId | null>;
  type: "lambda" | "pi";
};
export const TermData = {
  empty: {
    label: "",
    parameters: Map(),
    reference: null,
    bindings: Map(),
    type: "lambda",
  } as TermData,
};
