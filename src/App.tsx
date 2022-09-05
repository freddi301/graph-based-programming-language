import React from "react";
import { css } from "styled-components/macro";
import { EditorState, RenderContextualActions } from "./components/Editor";
import { Formatter } from "./components/Formatter";
import { Source, TermData, TermId } from "./components/Source";
import { GlobalStyle } from "./components/theme";
import { naiveRepository, VersionControlUI } from "./components/VersionControl";
import { useLocalStorageState } from "./useLocalStorageState";

export default function App() {
  const [source, setSource] = React.useState(Source.empty);
  const [editorState, setEditorState] = React.useState(EditorState.empty);
  const formatter = Formatter(source);
  console.log(formatter.roots.toJS());
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
  const termData = source.terms.get(termId, TermData.empty);
  const actions = (children?: React.ReactNode) => (
    <RenderContextualActions
      source={source}
      onSourceChange={onSourceChange}
      editorState={editorState}
      onEditorStateChange={onEditorStateChange}
    >
      {children}
    </RenderContextualActions>
  );
  return (
    <React.Fragment>
      {editorState.type === "term" &&
        editorState.termId === termId &&
        !formatter.roots.has(termId) && (
          <strong
            css={css`
              color: var(--text-color-blue);
            `}
          >
            (
          </strong>
        )}
      {editorState.type === "term" &&
        editorState.termId === termId &&
        !formatter.roots.has(termId) && (
          <React.Fragment>{actions()} </React.Fragment>
        )}
      {(termData.parameters.size > 0 ||
        (editorState.type === "parameters" &&
          editorState.termId === termId)) && (
        <React.Fragment>
          (
          {Array.from(
            termData.parameters.entries(),
            ([parameterTermId], index) => {
              return (
                <React.Fragment key={parameterTermId}>
                  {editorState.type === "parameter" &&
                  editorState.termId === termId &&
                  editorState.parameterTermId === parameterTermId ? (
                    actions(
                      <RenderTerm
                        termId={parameterTermId}
                        source={source}
                        onClick={() => {}}
                      />
                    )
                  ) : (
                    <RenderTerm
                      termId={parameterTermId}
                      source={source}
                      onClick={() => {
                        onEditorStateChange({
                          type: "parameter",
                          termId,
                          parameterTermId: parameterTermId,
                          text: source.terms.get(parameterTermId)?.label ?? "",
                        });
                      }}
                    />
                  )}

                  {(index < termData.parameters.size - 1 ||
                    (editorState.type === "parameters" &&
                      editorState.termId === termId)) &&
                    ", "}
                </React.Fragment>
              );
            }
          )}
          {editorState.type === "parameters" &&
            editorState.termId === termId &&
            actions()}
          ){termData.type === "lambda" ? " => " : " -> "}
        </React.Fragment>
      )}
      {editorState.type === "reference" && editorState.termId === termId
        ? actions()
        : termData.reference && (
            <RenderTerm
              termId={termData.reference}
              source={source}
              onClick={() => {
                onEditorStateChange({
                  type: "reference",
                  termId: termId,
                  text:
                    (termData.reference &&
                      source.terms.get(termData.reference)?.label) ??
                    "",
                });
              }}
            />
          )}
      {(termData.bindings.size > 0 ||
        (editorState.type === "bindings" && editorState.termId === termId) ||
        (editorState.type === "binding" && editorState.termId === termId)) && (
        <React.Fragment>
          (
          {Array.from(
            termData.bindings.entries(),
            ([bindingKeyTermId, bindingValueTermId], index) => {
              return (
                <React.Fragment key={bindingKeyTermId}>
                  <RenderTerm
                    termId={bindingKeyTermId}
                    source={source}
                    onClick={() => {
                      onEditorStateChange({
                        type: "binding",
                        termId,
                        keyTermId: bindingKeyTermId,
                        text:
                          (bindingValueTermId &&
                            source.terms.get(bindingValueTermId)?.label) ??
                          "",
                      });
                    }}
                  />
                  {" = "}
                  {editorState.type === "binding" &&
                    editorState.termId === termId &&
                    editorState.keyTermId === bindingKeyTermId &&
                    actions()}
                  {bindingValueTermId ? (
                    formatter.roots.has(bindingValueTermId) ? (
                      <RenderTerm
                        termId={bindingValueTermId}
                        source={source}
                        onClick={() => {
                          onEditorStateChange({
                            type: "binding",
                            termId: termId,
                            keyTermId: bindingKeyTermId,
                            text:
                              source.terms.get(bindingValueTermId)?.label ?? "",
                          });
                        }}
                      />
                    ) : (
                      <RenderValue
                        termId={bindingValueTermId}
                        source={source}
                        onSourceChange={onSourceChange}
                        editorState={editorState}
                        onEditorStateChange={onEditorStateChange}
                        formatter={formatter}
                      />
                    )
                  ) : null}
                  {(index < termData.bindings.size - 1 ||
                    (editorState.type === "bindings" &&
                      editorState.termId === termId)) &&
                    ", "}
                </React.Fragment>
              );
            }
          )}
          {editorState.type === "bindings" &&
            editorState.termId === termId &&
            actions()}
          )
        </React.Fragment>
      )}
      {editorState.type === "term" &&
        editorState.termId === termId &&
        !formatter.roots.has(termId) && (
          <strong
            css={css`
              color: var(--text-color-blue);
            `}
          >
            )
          </strong>
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
  const actions = (children?: React.ReactNode) => (
    <RenderContextualActions
      source={source}
      onSourceChange={onSourceChange}
      editorState={editorState}
      onEditorStateChange={onEditorStateChange}
    >
      {children}
    </RenderContextualActions>
  );
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
      {[...formatter.roots.keys()].map((termId) => {
        const termData = source.terms.get(termId, TermData.empty);
        return (
          <React.Fragment key={termId}>
            {editorState.type === "term" && editorState.termId === termId ? (
              <RenderContextualActions
                source={source}
                onSourceChange={onSourceChange}
                editorState={editorState}
                onEditorStateChange={onEditorStateChange}
              />
            ) : (
              <RenderTerm
                termId={termId}
                source={source}
                onClick={() =>
                  onEditorStateChange({
                    type: "term",
                    termId: termId,
                    text: termData.label,
                  })
                }
              />
            )}
            {(termData.annotation ||
              (editorState.type === "annotation" &&
                editorState.termId === termId)) &&
              " : "}
            {editorState.type === "annotation" &&
              editorState.termId === termId &&
              actions()}
            {termData.annotation &&
              (formatter.roots.has(termData.annotation) ? (
                <RenderTerm
                  termId={termData.annotation}
                  source={source}
                  onClick={() =>
                    onEditorStateChange({
                      type: "annotation",
                      termId: termId,
                      text: termData.label,
                    })
                  }
                />
              ) : (
                <RenderValue
                  termId={termData.annotation}
                  source={source}
                  onSourceChange={onSourceChange}
                  editorState={editorState}
                  onEditorStateChange={onEditorStateChange}
                  formatter={formatter}
                />
              ))}
            {(termData.reference !== null ||
              termData.parameters.size > 0 ||
              termData.bindings.size > 0 ||
              (editorState.type === "reference" &&
                editorState.termId === termId) ||
              (editorState.type === "parameters" &&
                editorState.termId === termId) ||
              (editorState.type === "bindings" &&
                editorState.termId === termId)) &&
              " = "}
            <RenderValue
              termId={termId}
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
      {editorState.type === "root" && actions()}
    </div>
  );
}
