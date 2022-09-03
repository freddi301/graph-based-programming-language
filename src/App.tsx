import React from "react";
import { css } from "styled-components/macro";
import { EditorState, RenderContextualActions } from "./components/Editor";
import { Formatter } from "./components/Formatter";
import { Source, TermData, TermId } from "./components/Source";
import { GlobalStyle } from "./components/theme";
import { naiveRepository, VersionControlUI } from "./components/VersionControl";

export default function App() {
  const [source, setSource] = React.useState(Source.empty);
  const [editorState, setEditorState] = React.useState(EditorState.empty);
  const formatter = Formatter(source);
  const [repository, setRepository] = useLocalStorageState(
    "repository",
    naiveRepository<string, Source>(),
    React.useCallback((repository) => repository.toJSON(Source.toJSON), []),
    React.useCallback(
      (serialized) =>
        naiveRepository<string, Source>().fromJSON(serialized, Source.fromJSON),
      []
    )
  );
  return (
    <React.Fragment>
      <GlobalStyle />
      <AppLayout
        top={null}
        left={
          <VersionControlUI
            source={source}
            onSource={setSource}
            repository={repository}
            onRepositoryChange={setRepository}
          />
        }
        center={
          <RenderRoot
            source={source}
            onSourceChange={setSource}
            editorState={editorState}
            onEditorStateChange={setEditorState}
            formatter={formatter}
          />
        }
        bottom={null}
        right={null}
      />
    </React.Fragment>
  );
}

function AppLayout({
  top,
  left,
  center,
  bottom,
  right,
}: {
  top: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  bottom: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div
      css={css`
        display: grid;
        width: 100vw;
        height: 100vh;
        grid-template-areas:
          "top top top"
          "left center right"
          "left bottom right";
        grid-template-columns: 400px 1fr 10px;
        grid-template-rows: 20px 1fr 400px;
      `}
    >
      <div
        css={css`
          grid-area: top;
          border-bottom: 1px solid var(--border-color);
          box-sizing: border-box;
        `}
      >
        {top}
      </div>
      <div
        css={css`
          grid-area: left;
          border-right: 1px solid var(--border-color);
          box-sizing: border-box;
        `}
      >
        {left}
      </div>
      <div
        css={css`
          grid-area: center;
          box-sizing: border-box;
        `}
      >
        {center}
      </div>
      <div
        css={css`
          grid-area: bottom;
          border-top: 1px solid var(--border-color);
          box-sizing: border-box;
        `}
      >
        {bottom}
      </div>
      <div
        css={css`
          grid-area: right;
          border-left: 1px solid var(--border-color);
          box-sizing: border-box;
        `}
      >
        {right}
      </div>
    </div>
  );
}

function RenderTerm({
  source,
  termId,
  onClick,
}: {
  termId: TermId;
  source: Source;
  onClick(): void;
}) {
  const { label } = source.terms.get(termId, TermData.empty);
  return <span onClick={onClick}>{label || `<${termId}>`}</span>;
}

function RenderValue({
  termId,
  source,
  onSourceChange,
  formatter,
  editorState,
  onEditorStateChange,
}: {
  termId: TermId;
  source: Source;
  onSourceChange(source: Source): void;
  formatter: Formatter;
  editorState: EditorState;
  onEditorStateChange(editorState: EditorState): void;
}) {
  const value = source.terms.get(termId, TermData.empty);
  return (
    <React.Fragment>
      {(value.parameters.size > 0 ||
        (editorState.type === "parameters" &&
          editorState.termId === termId)) && (
        <React.Fragment>
          (
          {Array.from(value.parameters.entries(), ([key], index) => {
            return (
              <React.Fragment key={key}>
                {editorState.type === "parameter" &&
                editorState.termId === termId &&
                editorState.parameterTermId === key ? (
                  <RenderContextualActions
                    source={source}
                    onSourceChange={onSourceChange}
                    editorState={editorState}
                    onEditorStateChange={onEditorStateChange}
                  >
                    <RenderTerm
                      termId={key}
                      source={source}
                      onClick={() => {}}
                    />
                  </RenderContextualActions>
                ) : (
                  <RenderTerm
                    termId={key}
                    source={source}
                    onClick={() => {
                      onEditorStateChange({
                        type: "parameter",
                        termId,
                        parameterTermId: key,
                        text: source.terms.get(key)?.label ?? "",
                      });
                    }}
                  />
                )}

                {(index < value.parameters.size - 1 ||
                  (editorState.type === "parameters" &&
                    editorState.termId === termId)) &&
                  ", "}
              </React.Fragment>
            );
          })}
          {editorState.type === "parameters" &&
            editorState.termId === termId && (
              <RenderContextualActions
                source={source}
                onSourceChange={onSourceChange}
                editorState={editorState}
                onEditorStateChange={onEditorStateChange}
              />
            )}
          ){" => "}
        </React.Fragment>
      )}
      {editorState.type === "reference" && editorState.termId === termId ? (
        <RenderContextualActions
          source={source}
          onSourceChange={onSourceChange}
          editorState={editorState}
          onEditorStateChange={onEditorStateChange}
        />
      ) : (
        value.reference && (
          <RenderTerm
            termId={value.reference}
            source={source}
            onClick={() => {
              onEditorStateChange({
                type: "reference",
                termId: termId,
                text:
                  (value.reference &&
                    source.terms.get(value.reference)?.label) ??
                  "",
              });
            }}
          />
        )
      )}
      {(value.bindings.size > 0 ||
        (editorState.type === "bindings" && editorState.termId === termId) ||
        (editorState.type === "binding" && editorState.termId === termId)) && (
        <React.Fragment>
          (
          {Array.from(value.bindings.entries(), ([key, val], index) => {
            return (
              <React.Fragment key={key}>
                <RenderTerm
                  termId={key}
                  source={source}
                  onClick={() => {
                    onEditorStateChange({
                      type: "binding",
                      termId,
                      keyTermId: key,
                      text: source.terms.get(key)?.label ?? "",
                    });
                  }}
                />
                {" = "}
                {editorState.type === "binding" &&
                  editorState.termId === termId &&
                  editorState.keyTermId === key && (
                    <RenderContextualActions
                      source={source}
                      onSourceChange={onSourceChange}
                      editorState={editorState}
                      onEditorStateChange={onEditorStateChange}
                    />
                  )}
                {val ? (
                  formatter.roots.has(val) ? (
                    <RenderTerm
                      termId={val}
                      source={source}
                      onClick={() => {
                        onEditorStateChange({
                          type: "binding",
                          termId: termId,
                          keyTermId: key,
                          text: source.terms.get(key)?.label ?? "",
                        });
                      }}
                    />
                  ) : (
                    <RenderValue
                      termId={val}
                      source={source}
                      onSourceChange={onSourceChange}
                      editorState={editorState}
                      onEditorStateChange={onEditorStateChange}
                      formatter={formatter}
                    />
                  )
                ) : null}
                {(index < value.bindings.size - 1 ||
                  (editorState.type === "bindings" &&
                    editorState.termId === termId)) &&
                  ", "}
              </React.Fragment>
            );
          })}
          {editorState.type === "bindings" && editorState.termId === termId && (
            <RenderContextualActions
              source={source}
              onSourceChange={onSourceChange}
              editorState={editorState}
              onEditorStateChange={onEditorStateChange}
            />
          )}
          )
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

export function RenderRoot({
  source,
  onSourceChange,
  formatter,
  editorState,
  onEditorStateChange,
}: {
  source: Source;
  onSourceChange(source: Source): void;
  formatter: Formatter;
  editorState: EditorState;
  onEditorStateChange(editorState: EditorState): void;
}) {
  return (
    <div
      css={css`
        padding: 1em;
        min-height: 100%;
      `}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onEditorStateChange({ type: "root", text: "" });
        }
      }}
    >
      {[...formatter.roots.keys()].map((key) => {
        const value = source.terms.get(key, TermData.empty);
        return (
          <React.Fragment key={key}>
            {editorState.type === "term" && editorState.termId === key ? (
              <RenderContextualActions
                source={source}
                onSourceChange={onSourceChange}
                editorState={editorState}
                onEditorStateChange={onEditorStateChange}
              />
            ) : (
              <RenderTerm
                termId={key}
                source={source}
                onClick={() =>
                  onEditorStateChange({
                    type: "term",
                    termId: key,
                    text: value.label,
                  })
                }
              />
            )}
            {(value.reference !== null ||
              value.parameters.size > 0 ||
              value.bindings.size > 0 ||
              (editorState.type === "reference" &&
                editorState.termId === key) ||
              (editorState.type === "parameters" &&
                editorState.termId === key)) && (
              <React.Fragment> = </React.Fragment>
            )}
            <RenderValue
              termId={key}
              source={source}
              onSourceChange={onSourceChange}
              editorState={editorState}
              onEditorStateChange={onEditorStateChange}
              formatter={formatter}
            />
            <br />
          </React.Fragment>
        );
      })}
      {editorState.type === "root" && (
        <RenderContextualActions
          source={source}
          onSourceChange={onSourceChange}
          editorState={editorState}
          onEditorStateChange={onEditorStateChange}
        />
      )}
    </div>
  );
}

function useLocalStorageState<State>(
  key: string,
  initial: State,
  serialize: (state: State) => string,
  deserialize: (serialized: string) => State
) {
  const [state, setState] = React.useState<State>(initial);
  React.useEffect(() => {
    const saved = window.localStorage.getItem(key);
    if (saved) setState(deserialize(saved));
  }, [deserialize, key]);
  const onStateChange = React.useCallback(
    (state: State) => {
      setState(state);
      window.localStorage.setItem(key, serialize(state));
    },
    [key, serialize]
  );
  return [state, onStateChange] as const;
}
