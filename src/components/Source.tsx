import { Equals, Hashable, HashUtils, ImmutableMap } from "./ImmutableMap";

export class Source {
  private constructor(public readonly terms: ImmutableMap<TermId, TermData>) {}
  static empty() {
    return new Source(ImmutableMap.empty());
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
    return new Source(this.terms.rem(termId));
  }
  renameTerm(termId: TermId, label: string) {
    return new Source(
      this.terms.set(termId, this.terms.get(termId).setLabel(label))
    );
  }
  addParameter(functionTermId: TermId, parameterTermId: TermId) {
    return new Source(
      this.terms.set(
        functionTermId,
        this.terms.get(functionTermId).addParameter(parameterTermId)
      )
    );
  }
  removeParameter(functionTermId: TermId, parameterTermId: TermId) {
    return new Source(
      this.terms.set(
        functionTermId,
        this.terms.get(functionTermId).removeParameter(parameterTermId)
      )
    );
  }
  setReference(termId: TermId, referenceTermId: TermId | null) {
    return new Source(
      this.terms.set(
        termId,
        this.terms.get(termId).setReference(referenceTermId)
      )
    );
  }
  setBinding(termId: TermId, keyTermId: TermId, valueTermId: TermId | null) {
    return new Source(
      this.terms.set(
        termId,
        this.terms.get(termId).setBinding(keyTermId, valueTermId)
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
export class TermId implements Equals, Hashable {
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
  hash(): number {
    return HashUtils.hashString(this.id);
  }
}
class TermData {
  private constructor(
    readonly label: string,
    readonly parameters: ImmutableMap<TermId, null>,
    readonly reference: TermId | null,
    readonly bindings: ImmutableMap<TermId, TermId>
  ) {}
  static empty() {
    return new TermData("", ImmutableMap.empty(), null, ImmutableMap.empty());
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
      this.parameters.rem(termId),
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
        : this.bindings.rem(keyTermId)
    );
  }
}
