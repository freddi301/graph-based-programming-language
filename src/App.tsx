import React from "react";
import { css } from "styled-components/macro";
import { Formatter } from "./components/Formatter";
import { Source, TermData, TermId } from "./components/Source";

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
        <button
          disabled={!state.firstSelectedTerm}
          onClick={() => {
            if (state.firstSelectedTerm) {
              setState(
                state.setSource(
                  state.source.setReference(
                    state.firstSelectedTerm,
                    state.secondSelectedTerm ?? null
                  )
                )
              );
            }
          }}
        >
          set reference
        </button>
        <button
          disabled={!state.firstSelectedTerm || !state.secondSelectedTerm}
          onClick={() => {
            if (state.firstSelectedTerm && state.secondSelectedTerm) {
              setState(
                state.setSource(
                  state.source.setBinding(
                    state.firstSelectedTerm,
                    state.secondSelectedTerm,
                    state.thirdSelectedTerm
                  )
                )
              );
            }
          }}
        >
          set binding
        </button>
      </div>
      <div
        onClick={(event) => {
          if (event.currentTarget === event.target) {
            if (event.altKey) {
              setState(state.setThirdSelectedTerm(null));
            } else if (event.ctrlKey) {
              setState(state.setSecondSelectedTerm(null));
            } else {
              setState(state.setFirstSelectedTerm(null));
            }
          }
        }}
      >
        {[...state.formatter.roots.keys()].map((key) => {
          const value = state.source.terms.get(key, TermData.empty());
          return (
            <React.Fragment key={key.id}>
              <TermView termId={key} state={state} onStateChange={setState} />
              {(value.reference !== null ||
                value.parameters.size > 0 ||
                value.bindings.size > 0) && (
                <React.Fragment> = </React.Fragment>
              )}
              <ValueView termId={key} state={state} onStateChange={setState} />
              <br />
            </React.Fragment>
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
  const { label } = state.source.terms.get(termId, TermData.empty());
  return (
    <span
      onClick={(event) => {
        if (event.altKey) {
          onStateChange(state.setThirdSelectedTerm(termId));
        } else if (event.ctrlKey) {
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
          : state.thirdSelectedTerm && termId.equals(state.thirdSelectedTerm)
          ? "underline dashed"
          : ""};
      `}
    >
      {label || `<${termId.id}>`}
    </span>
  );
}

function ValueView({
  termId,
  state,
  onStateChange,
}: {
  termId: TermId;
  state: EditorState;
  onStateChange(state: EditorState): void;
}) {
  const value = state.source.terms.get(termId, TermData.empty());
  return (
    <React.Fragment>
      {value.parameters.size > 0 && (
        <React.Fragment>
          (
          {Array.from(value.parameters.entries(), ([key], index) => {
            return (
              <React.Fragment key={key.id}>
                <TermView
                  termId={key}
                  state={state}
                  onStateChange={onStateChange}
                />
                {index < value.parameters.size - 1 && ", "}
              </React.Fragment>
            );
          })}
          ){" => "}
        </React.Fragment>
      )}
      {value.reference && (
        <TermView
          termId={value.reference}
          state={state}
          onStateChange={onStateChange}
        />
      )}
      {value.bindings.size > 0 && (
        <React.Fragment>
          (
          {Array.from(value.bindings.entries(), ([key, val], index) => {
            return (
              <React.Fragment key={key.id}>
                <TermView
                  termId={key}
                  state={state}
                  onStateChange={onStateChange}
                />
                {" = "}
                {state.formatter.roots.has(val) ? (
                  <TermView
                    termId={val}
                    state={state}
                    onStateChange={onStateChange}
                  />
                ) : (
                  <ValueView
                    termId={val}
                    state={state}
                    onStateChange={onStateChange}
                  />
                )}
                {index < value.bindings.size - 1 && ", "}
              </React.Fragment>
            );
          })}
          )
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

class EditorState {
  private constructor(
    public readonly source: Source,
    public readonly text: string,
    public readonly firstSelectedTerm: TermId | null,
    public readonly secondSelectedTerm: TermId | null,
    public readonly thirdSelectedTerm: TermId | null
  ) {}
  readonly formatter = new Formatter(this.source);
  static empty() {
    return new EditorState(Source.empty(), "", null, null, null);
  }
  setSource(source: Source) {
    return new EditorState(
      source,
      this.text,
      this.firstSelectedTerm,
      this.secondSelectedTerm,
      this.thirdSelectedTerm
    );
  }
  setText(text: string) {
    return new EditorState(
      this.source,
      text,
      this.firstSelectedTerm,
      this.secondSelectedTerm,
      this.thirdSelectedTerm
    );
  }
  setFirstSelectedTerm(termId: TermId | null) {
    return new EditorState(
      this.source,
      this.text,
      termId,
      this.secondSelectedTerm,
      this.thirdSelectedTerm
    );
  }
  setSecondSelectedTerm(termId: TermId | null) {
    return new EditorState(
      this.source,
      this.text,
      this.firstSelectedTerm,
      termId,
      this.thirdSelectedTerm
    );
  }
  setThirdSelectedTerm(termId: TermId | null) {
    return new EditorState(
      this.source,
      this.text,
      this.firstSelectedTerm,
      this.secondSelectedTerm,
      termId
    );
  }
}
