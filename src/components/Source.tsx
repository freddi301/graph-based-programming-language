import { Map, ValueObject, hash } from "immutable";

export class Source {
  private constructor(public readonly terms: Map<TermId, TermData>) {}
  static empty() {
    return new Source(Map());
  }
  setTerm(termId: TermId, termData: TermData) {
    return new Source(this.terms.set(termId, termData));
  }
  createTerm(label: string) {
    const termId = TermId.create();
    const termData = TermData.empty().setLabel(label);
    const newSource = new Source(this.terms.set(termId, termData));
    return [newSource, termId] as const;
  }
  removeTerm(termId: TermId) {
    return new Source(this.terms.remove(termId));
  }
  renameTerm(termId: TermId, label: string) {
    return new Source(
      this.terms.update(termId, TermData.empty(), (termData) =>
        termData.setLabel(label)
      )
    );
  }
  addParameter(functionTermId: TermId, parameterTermId: TermId) {
    return new Source(
      this.terms.update(functionTermId, TermData.empty(), (termData) =>
        termData.addParameter(parameterTermId)
      )
    );
  }
  removeParameter(functionTermId: TermId, parameterTermId: TermId) {
    return new Source(
      this.terms.update(functionTermId, TermData.empty(), (termData) =>
        termData.removeParameter(parameterTermId)
      )
    );
  }
  setReference(termId: TermId, referenceTermId: TermId | null) {
    return new Source(
      this.terms.update(termId, TermData.empty(), (termData) =>
        termData.setReference(referenceTermId)
      )
    );
  }
  setBinding(termId: TermId, keyTermId: TermId, valueTermId: TermId | null) {
    return new Source(
      this.terms.update(termId, TermData.empty(), (termData) =>
        termData.setBinding(keyTermId, valueTermId)
      )
    );
  }
  toJSON(): string {
    const terms = this.terms;
    return JSON.stringify(
      Object.fromEntries(
        (function* () {
          for (const [key, value] of terms.entries()) {
            yield [
              key.id,
              {
                label: value.label,
                parameters: Object.fromEntries(
                  (function* () {
                    for (const [key] of value.parameters.entries()) {
                      yield [key.id, null];
                    }
                  })()
                ),
                reference: value.reference?.id ?? null,
                bindings: Object.fromEntries(
                  (function* () {
                    for (const [key, val] of value.bindings.entries()) {
                      yield [key.id, val.id];
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
  }
  static fromJSON(json: string) {
    const parsed = JSON.parse(json);
    const source = Object.entries(parsed).reduce(
      (source, [termId, { label, parameters, reference, bindings }]: any) =>
        source.setTerm(
          TermId.fromString(termId),
          Object.entries(bindings).reduce(
            (termData, [key, value]: any) =>
              termData.setBinding(
                TermId.fromString(key),
                TermId.fromString(value)
              ),
            Object.entries(parameters).reduce(
              (termData, [key]) =>
                termData.addParameter(TermId.fromString(key)),
              TermData.empty()
                .setLabel(label)
                .setReference(reference ? TermId.fromString(reference) : null)
            )
          )
        ),
      Source.empty()
    );
    return source;
  }
}
export class TermId implements ValueObject {
  private constructor(public readonly id: string) {}
  static create() {
    return new TermId((Math.random() * 100000000000000000).toString(16));
  }
  static fromString(string: string) {
    return new TermId(string);
  }
  equals(other: this): boolean {
    return this.id === other.id;
  }
  hashCode(): number {
    return hash(this.id);
  }
}
export class TermData {
  private constructor(
    readonly label: string,
    readonly parameters: Map<TermId, null>,
    readonly reference: TermId | null,
    readonly bindings: Map<TermId, TermId>
  ) {}
  static empty() {
    return new TermData("", Map(), null, Map());
  }
  setLabel(label: string) {
    return new TermData(label, this.parameters, this.reference, this.bindings);
  }
  addParameter(termId: TermId) {
    return new TermData(
      this.label,
      this.parameters.set(termId, null),
      this.reference,
      this.bindings
    );
  }
  removeParameter(termId: TermId) {
    return new TermData(
      this.label,
      this.parameters.remove(termId),
      this.reference,
      this.bindings
    );
  }
  setReference(reference: TermId | null) {
    return new TermData(this.label, this.parameters, reference, this.bindings);
  }
  setBinding(keyTermId: TermId, valueTermId: TermId | null) {
    return new TermData(
      this.label,
      this.parameters,
      this.reference,
      valueTermId
        ? this.bindings.set(keyTermId, valueTermId)
        : this.bindings.remove(keyTermId)
    );
  }
}
