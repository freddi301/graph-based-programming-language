import React from "react";
import { css } from "styled-components/macro";
import { EditorState } from "./components/Editor";
import { Formatter } from "./components/Formatter";
import { Source, TermData, TermId } from "./components/Source";
import { VersionControlUI } from "./components/vcs";

export default function App() {
  const [source, setSource] = React.useState(Source.empty);
  const [editorState, setEditorState] = React.useState(EditorState.empty);
  const formatter = Formatter(editorState.source);
  return (
    <div
      css={css`
        display: flex;
      `}
    >
      <VersionControlUI source={editorState.source} />
      <div>
        <div>
          <input
            value={editorState.text}
            onChange={(event) => {
              setEditorState((editorState) => ({
                ...editorState,
                text: event.currentTarget.value,
              }));
            }}
          />
          <button
            onClick={() => {
              const [newSource, newTermId] = Source.createTerm(
                editorState.source,
                editorState.text
              );
              setSource(newSource);
              setEditorState((editorState) => ({
                ...editorState,
                text: "",
                firstSelectedTerm: newTermId,
              }));
            }}
          >
            create term
          </button>
          <button
            disabled={!editorState.firstSelectedTerm}
            onClick={() => {
              if (editorState.firstSelectedTerm) {
                setSource(
                  Source.removeTerm(source, editorState.firstSelectedTerm)
                );
                setEditorState((editorState) => ({
                  ...editorState,
                  firstSelectedTerm: null,
                }));
              }
            }}
          >
            remove term
          </button>
          <button
            disabled={!editorState.firstSelectedTerm}
            onClick={() => {
              if (editorState.firstSelectedTerm) {
                setSource(
                  Source.renameTerm(
                    source,
                    editorState.firstSelectedTerm,
                    editorState.text
                  )
                );
              }
            }}
          >
            rename term
          </button>
          <button
            disabled={
              !editorState.firstSelectedTerm || !editorState.secondSelectedTerm
            }
            onClick={() => {
              if (
                editorState.firstSelectedTerm &&
                editorState.secondSelectedTerm
              ) {
                setSource(
                  Source.addParameter(
                    source,
                    editorState.firstSelectedTerm,
                    editorState.secondSelectedTerm
                  )
                );
              }
            }}
          >
            add parameter
          </button>
          <button
            disabled={
              !editorState.firstSelectedTerm || !editorState.secondSelectedTerm
            }
            onClick={() => {
              if (
                editorState.firstSelectedTerm &&
                editorState.secondSelectedTerm
              ) {
                setSource(
                  Source.removeParameter(
                    source,
                    editorState.firstSelectedTerm,
                    editorState.secondSelectedTerm
                  )
                );
              }
            }}
          >
            remove parameter
          </button>
          <button
            disabled={!editorState.firstSelectedTerm}
            onClick={() => {
              if (editorState.firstSelectedTerm) {
                setSource(
                  Source.setReference(
                    source,
                    editorState.firstSelectedTerm,
                    editorState.secondSelectedTerm
                  )
                );
              }
            }}
          >
            set reference
          </button>
          <button
            disabled={
              !editorState.firstSelectedTerm || !editorState.secondSelectedTerm
            }
            onClick={() => {
              if (
                editorState.firstSelectedTerm &&
                editorState.secondSelectedTerm
              ) {
                setSource(
                  Source.addBinding(
                    source,
                    editorState.firstSelectedTerm,
                    editorState.secondSelectedTerm,
                    editorState.thirdSelectedTerm
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
                setEditorState((editorState) => ({
                  ...editorState,
                  thirdSelectedTerm: null,
                }));
              } else if (event.ctrlKey) {
                setEditorState((editorState) => ({
                  ...editorState,
                  secondSelectedTerm: null,
                }));
              } else {
                setEditorState((editorState) => ({
                  ...editorState,
                  firstSelectedTerm: null,
                }));
              }
            }
          }}
        >
          {[...formatter.roots.keys()].map((key) => {
            const value = editorState.source.terms.get(key, TermData.empty);
            return (
              <React.Fragment key={key}>
                <TermView
                  termId={key}
                  state={editorState}
                  onStateChange={setEditorState}
                />
                {(value.reference !== null ||
                  value.parameters.size > 0 ||
                  value.bindings.size > 0) && (
                  <React.Fragment> = </React.Fragment>
                )}
                <ValueView
                  termId={key}
                  state={editorState}
                  onStateChange={setEditorState}
                  formatter={formatter}
                />
                <br />
              </React.Fragment>
            );
          })}
        </div>
        <textarea
          value={Source.toJSON(editorState.source)}
          onChange={(event) => {
            setSource(Source.fromJSON(event.currentTarget.value));
          }}
        ></textarea>
      </div>
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
  const { label } = state.source.terms.get(termId, TermData.empty);
  return (
    <span
      onClick={(event) => {
        if (event.altKey) {
          onStateChange({ ...state, thirdSelectedTerm: termId });
        } else if (event.ctrlKey) {
          onStateChange({ ...state, secondSelectedTerm: termId });
        } else {
          onStateChange({ ...state, firstSelectedTerm: termId });
        }
      }}
      css={css`
        text-decoration: ${state.firstSelectedTerm &&
        termId === state.firstSelectedTerm
          ? "underline solid"
          : state.secondSelectedTerm && termId === state.secondSelectedTerm
          ? "underline wavy"
          : state.thirdSelectedTerm && termId === state.thirdSelectedTerm
          ? "underline dashed"
          : ""};
      `}
    >
      {label || `<${termId}>`}
    </span>
  );
}

function ValueView({
  termId,
  state,
  onStateChange,
  formatter,
}: {
  termId: TermId;
  state: EditorState;
  onStateChange(state: EditorState): void;
  formatter: Formatter;
}) {
  const value = state.source.terms.get(termId, TermData.empty);
  return (
    <React.Fragment>
      {value.parameters.size > 0 && (
        <React.Fragment>
          (
          {Array.from(value.parameters.entries(), ([key], index) => {
            return (
              <React.Fragment key={key}>
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
              <React.Fragment key={key}>
                <TermView
                  termId={key}
                  state={state}
                  onStateChange={onStateChange}
                />
                {" = "}
                {val ? (
                  formatter.roots.has(val) ? (
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
                      formatter={formatter}
                    />
                  )
                ) : null}
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
