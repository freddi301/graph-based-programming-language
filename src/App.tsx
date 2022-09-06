import React from "react";
import { css } from "styled-components/macro";
import { EditorState, RenderContextualActions } from "./components/Editor";
import { Formatter } from "./components/Formatter";
import { Source, TermData, TermId } from "./components/Source";
import { GlobalStyle } from "./components/theme";
import {
  naiveRepository,
  VersionControlGraph,
  VersionControlUI,
} from "./components/VersionControl";
import { useLocalStorageState } from "./components/useLocalStorageState";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { LeftSideTab, RenderLeftSideTabMemo } from "./components/LeftSideTab";
import { AppLayout } from "./components/AppLayout";

library.add(fas);

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
  const [selectedLeftSideTab, setSelectedLeftSideTab] =
    React.useState<LeftSideTab>("version-control");
  return (
    <React.Fragment>
      <GlobalStyle />
      <AppLayout
        top={null}
        leftLeft={leftSideTabs.map((tab) => (
          <RenderLeftSideTabMemo
            key={tab}
            tab={tab}
            onSelect={setSelectedLeftSideTab}
            isSelected={tab === selectedLeftSideTab}
          />
        ))}
        left={(() => {
          switch (selectedLeftSideTab) {
            case "version-control":
              return (
                <VersionControlUI
                  source={source}
                  onSource={setSource}
                  repository={repository}
                  onRepositoryChange={setRepository}
                />
              );
          }
        })()}
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

const leftSideTabs: Array<LeftSideTab> = ["version-control", "history"];

function RenderLabel({
  source,
  termId,
  onClick,
  editorState,
  onEditorStateChange,
}: {
  termId: TermId;
  source: Source;
  editorState: EditorState;
  onEditorStateChange(editorState: EditorState): void;
  onClick(): void;
}) {
  const { label } = source.terms.get(termId, TermData.empty);
  const [isTooltipOpen, seIsTooltipOpen] = React.useState(false);
  return (
    <span
      onClick={onClick}
      css={css`
        position: relative;
        background-color: ${termId === editorState.hoverLabel
          ? "var(--hover-background-color)"
          : ""};
      `}
      onMouseEnter={() => {
        onEditorStateChange({ ...editorState, hoverLabel: termId });
        seIsTooltipOpen(true);
      }}
      onMouseLeave={() => {
        onEditorStateChange({ ...editorState, hoverLabel: undefined });
        seIsTooltipOpen(false);
      }}
    >
      {label || `<${termId}>`}
      {isTooltipOpen && (
        <div
          css={css`
            position: absolute;
            background-color: var(--background-color-secondary);
            z-index: 1;
          `}
        >
          {termId}
        </div>
      )}
    </span>
  );
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
  const showEnclosingParentheses =
    editorState.type !== "root" && editorState.termId === termId;
  return (
    <React.Fragment>
      {showEnclosingParentheses && (
        <strong
          css={css`
            color: var(--text-color-blue);
          `}
        >
          {"("}
        </strong>
      )}
      {editorState.type === "term" && editorState.termId === termId ? (
        <React.Fragment>{actions()}</React.Fragment>
      ) : (
        termData.label && (
          <RenderLabel
            termId={termId}
            source={source}
            editorState={editorState}
            onEditorStateChange={onEditorStateChange}
            onClick={() => {
              onEditorStateChange({
                type: "term",
                termId,
                text: termData.label,
              });
            }}
          />
        )
      )}
      {editorState.type === "annotation" && editorState.termId === termId ? (
        <React.Fragment>
          {" : "}
          {actions()}
        </React.Fragment>
      ) : (
        termData.annotation && (
          <React.Fragment>
            {" : "}
            {formatter.roots.has(termData.annotation) ? (
              <RenderLabel
                termId={termData.annotation}
                source={source}
                editorState={editorState}
                onEditorStateChange={onEditorStateChange}
                onClick={() => {
                  onEditorStateChange({
                    type: "annotation",
                    termId,
                    text:
                      (termData.annotation &&
                        source.terms.get(termData.annotation)?.label) ??
                      "",
                  });
                }}
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
            )}
          </React.Fragment>
        )
      )}
      {((editorState.type === "reference" &&
        editorState.termId === termId &&
        termData.label !== "") ||
        (editorState.type === "parameter" && editorState.termId === termId) ||
        (termData.reference && termData.label !== "")) &&
        " = "}
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
                      <RenderLabel
                        termId={parameterTermId}
                        source={source}
                        editorState={editorState}
                        onEditorStateChange={onEditorStateChange}
                        onClick={() => {}}
                      />
                    )
                  ) : (
                    <RenderLabel
                      termId={parameterTermId}
                      source={source}
                      editorState={editorState}
                      onEditorStateChange={onEditorStateChange}
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
            <RenderLabel
              termId={termData.reference}
              source={source}
              editorState={editorState}
              onEditorStateChange={onEditorStateChange}
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
                  <RenderLabel
                    termId={bindingKeyTermId}
                    source={source}
                    editorState={editorState}
                    onEditorStateChange={onEditorStateChange}
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
                      <RenderLabel
                        termId={bindingValueTermId}
                        source={source}
                        editorState={editorState}
                        onEditorStateChange={onEditorStateChange}
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
      {showEnclosingParentheses && (
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
  return (
    <div
      css={css`
        padding: 1em;
      `}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onEditorStateChange({ type: "root", text: "" });
        }
      }}
    >
      {[...formatter.roots.keys()].map((termId) => {
        return (
          <div key={termId}>
            <RenderValue
              termId={termId}
              source={source}
              onSourceChange={onSourceChange}
              editorState={editorState}
              onEditorStateChange={onEditorStateChange}
              formatter={formatter}
            />
          </div>
        );
      })}
      {editorState.type === "root" && (
        <div>
          <RenderContextualActions
            source={source}
            onSourceChange={onSourceChange}
            editorState={editorState}
            onEditorStateChange={onEditorStateChange}
          />
        </div>
      )}
    </div>
  );
}
