import React from "react";
import { css } from "styled-components/macro";

export default function App() {
  const [state, setState] = React.useState(EditorState.empty());
  return (
    <div>
      <div>
        <input
          value={state.text}
          onChange={(event) =>
            setState(state.setText(event.currentTarget.value))
          }
        />
        <button
          onClick={() => {
            const [newSource, newTermId] = state.source.createTerm(state.text);
            setState(
              state
                .setSource(newSource)
                .setText("")
                .setFirstSelectedTerm(newTermId)
            );
          }}
        >
          create term
        </button>
        <button
          disabled={!state.firstSelectedTerm}
          onClick={() => {
            if (state.firstSelectedTerm) {
              setState(
                state
                  .setSource(state.source.removeTerm(state.firstSelectedTerm))
                  .setFirstSelectedTerm(null)
              );
            }
          }}
        >
          remove term
        </button>
        <button
          disabled={!state.firstSelectedTerm}
          onClick={() => {
            if (state.firstSelectedTerm) {
              setState(
                state.setSource(
                  state.source.renameTerm(state.firstSelectedTerm, state.text)
                )
              );
            }
          }}
        >
          rename term
        </button>
        <button
          disabled={!state.firstSelectedTerm || !state.secondSelectedTerm}
          onClick={() => {
            if (state.firstSelectedTerm && state.secondSelectedTerm) {
              setState(
                state.setSource(
                  state.source.addParameter(
                    state.firstSelectedTerm,
                    state.secondSelectedTerm
                  )
                )
              );
            }
          }}
        >
          add parameter
        </button>
        <button
          disabled={!state.firstSelectedTerm || !state.secondSelectedTerm}
          onClick={() => {
            if (state.firstSelectedTerm && state.secondSelectedTerm) {
              setState(
                state.setSource(
                  state.source.removeParameter(
                    state.firstSelectedTerm,
                    state.secondSelectedTerm
                  )
                )
              );
            }
          }}
        >
          remove parameter
        </button>
      </div>
      <div>
        {Array.from(state.source.terms.entries(), ([key, value]) => {
          return (
            <div key={key.id}>
              <TermView termId={key} state={state} onStateChange={setState} />
              {value.parameters.size > 0 && (
                <React.Fragment>
                  (
                  {Array.from(value.parameters.entries(), ([key], index) => {
                    return (
                      <React.Fragment key={key.id}>
                        <TermView
                          termId={key}
                          state={state}
                          onStateChange={setState}
                        />
                        {index < value.parameters.size - 1 && ", "}
                      </React.Fragment>
                    );
                  })}
                  )
                </React.Fragment>
              )}
            </div>
          );
        })}
      </div>
      <textarea
        value={state.source.toJSON()}
        onChange={(event) =>
          setState(state.setSource(Source.fromJSON(event.currentTarget.value)))
        }
      ></textarea>
    </div>
  );
}

function TermView({
  termId,
  state,
  onStateChange,
}: {
  termId: TermId;
  state: EditorState;
  onStateChange(state: EditorState): void;
}) {
  const { label } = state.source.terms.get(termId);
  return (
    <span
      onClick={(event) => {
        if (event.ctrlKey) {
          onStateChange(state.setSecondSelectedTerm(termId));
        } else {
          onStateChange(state.setFirstSelectedTerm(termId).setText(label));
        }
      }}
      css={css`
        text-decoration: ${state.firstSelectedTerm &&
        termId.equals(state.firstSelectedTerm)
          ? "underline solid"
          : state.secondSelectedTerm && termId.equals(state.secondSelectedTerm)
          ? "underline wavy"
          : ""};
      `}
    >
      {label}
    </span>
  );
}

class EditorState {
  private constructor(
    public readonly source: Source,
    public readonly text: string,
    public readonly firstSelectedTerm: TermId | null,
    public readonly secondSelectedTerm: TermId | null
  ) {}
  static empty() {
    return new EditorState(Source.empty(), "", null, null);
  }
  setSource(source: Source) {
    return new EditorState(
      source,
      this.text,
      this.firstSelectedTerm,
      this.secondSelectedTerm
    );
  }
  setText(text: string) {
    return new EditorState(
      this.source,
      text,
      this.firstSelectedTerm,
      this.secondSelectedTerm
    );
  }
  setFirstSelectedTerm(termId: TermId | null) {
    return new EditorState(
      this.source,
      this.text,
      termId,
      this.secondSelectedTerm
    );
  }
  setSecondSelectedTerm(termId: TermId | null) {
    return new EditorState(
      this.source,
      this.text,
      this.firstSelectedTerm,
      termId
    );
  }
}

class Source {
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
      (source, [termId, { label, parameters }]: any) =>
        source.setTerm(
          TermId.fromString(termId),
          Object.entries(parameters).reduce(
            (termData, [key]) => termData.addParameter(TermId.fromString(key)),
            TermData.empty().setLabel(label)
          )
        ),
      Source.empty()
    );
    return source;
  }
}

class ImmutableMap<Key extends Equals & Hashable, Value> {
  private constructor(
    private buckets: Record<number, Array<{ key: Key; value: Value }>>,
    public readonly size: number
  ) {}
  static empty<Key extends Equals & Hashable, Value>() {
    return new ImmutableMap<Key, Value>({}, 0);
  }
  has(key: Key): boolean {
    const hash = key.hash();
    const bucket = this.buckets[hash];
    if (!bucket) return false;
    return bucket.some((entry) => entry.key.equals(key));
  }
  get(key: Key): Value {
    const hash = key.hash();
    const bucket = this.buckets[hash];
    if (!bucket) throw new Error();
    const entry = bucket.find((entry) => entry.key.equals(key));
    if (!entry) throw new Error();
    return entry.value;
  }
  set(key: Key, value: Value): ImmutableMap<Key, Value> {
    const hash = key.hash();
    const existingBucket = this.buckets[hash];
    const entry = { key, value };
    if (!existingBucket) {
      return new ImmutableMap(
        { ...this.buckets, [hash]: [entry] },
        this.size + 1
      );
    }
    if (existingBucket.some((existingEntry) => existingEntry.key.equals(key))) {
      return new ImmutableMap(
        {
          ...this.buckets,
          [hash]: [
            entry,
            ...existingBucket.filter(
              (existingEntry) => !existingEntry.key.equals(key)
            ),
          ],
        },
        this.size
      );
    } else {
      return new ImmutableMap(
        {
          ...this.buckets,
          [hash]: [entry, ...existingBucket],
        },
        this.size + 1
      );
    }
  }
  rem(key: Key): ImmutableMap<Key, Value> {
    const hash = key.hash();
    const existingList = this.buckets[hash];
    if (!existingList) throw new Error();
    return new ImmutableMap(
      {
        ...this.buckets,
        [hash]: existingList.filter(
          (existingEntry) => !existingEntry.key.equals(key)
        ),
      },
      this.size - 1
    );
  }
  *entries() {
    for (const bucket of Object.values(this.buckets)) {
      for (const { key, value } of bucket) {
        yield [key, value] as const;
      }
    }
  }
}

class TermId implements Equals, Hashable {
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
    readonly parameters: ImmutableMap<TermId, null>
  ) {}
  static empty() {
    return new TermData("", ImmutableMap.empty());
  }
  setLabel(label: string) {
    return new TermData(label, this.parameters);
  }
  addParameter(termId: TermId) {
    return new TermData(this.label, this.parameters.set(termId, null));
  }
  removeParameter(termId: TermId) {
    return new TermData(this.label, this.parameters.rem(termId));
  }
}

interface Equals {
  equals(other: this): boolean;
}

interface Hashable {
  hash(): number;
}

class HashUtils {
  static hashString(string: string) {
    let hashed = 0;
    for (let ii = 0; ii < string.length; ii++) {
      hashed = (31 * hashed + string.charCodeAt(ii)) | 0;
    }
    return HashUtils.smi(hashed);
  }
  static smi(i32: number) {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xbfffffff);
  }
}
