import React from "react";
import { css } from "styled-components/macro";
import { EditorState, RenderContextualActions } from "./Editor";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface } from "./Source";
import { SerializationInterface } from "./utils";

type RenderSourceBaseProps<TermId, Source> = {
  source: Source;
  onSourceChange(source: Source): void;
  editorState: EditorState<TermId>;
  onEditorStateChange(editorState: EditorState<TermId>): void;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
};

function RenderLabel<TermId, Source>({
  termId,
  onClick,
  ...baseProps
}: {
  termId: TermId;
  onClick(): void;
} & RenderSourceBaseProps<TermId, Source>) {
  const { source, editorState, onEditorStateChange, sourceImplementation, termIdStringSerialization } = baseProps;
  const { label } = sourceImplementation.get(source, termId);
  const [isTooltipOpen, seIsTooltipOpen] = React.useState(false);
  return (
    <span
      onClick={onClick}
      css={css`
        position: relative;
        background-color: ${termId === editorState.hoverLabel ? "var(--hover-background-color)" : ""};
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
      {label || `<${termIdStringSerialization.serialize(termId)}>`}
      {isTooltipOpen && (
        <div
          css={css`
            position: absolute;
            background-color: var(--background-color-secondary);
            z-index: 1;
          `}
        >
          {termIdStringSerialization.serialize(termId)}
        </div>
      )}
    </span>
  );
}

function RenderValue<TermId, Source>({
  termId,
  ...baseProps
}: {
  termId: TermId;
} & RenderSourceBaseProps<TermId, Source>) {
  const {
    source,
    onSourceChange,
    editorState,
    onEditorStateChange,
    sourceImplementation,
    termIdStringSerialization,
    sourceFormattingImplementation,
    sourceFacadeImplementation,
  } = baseProps;
  const termData = sourceImplementation.get(source, termId);
  const actions = (children?: React.ReactNode) => (
    <RenderContextualActions
      source={source}
      onSourceChange={onSourceChange}
      editorState={editorState}
      onEditorStateChange={onEditorStateChange}
      sourceImplemetation={sourceImplementation}
      sourceFacadeImplementation={sourceFacadeImplementation}
      sourceFormattingImplementation={sourceFormattingImplementation}
    >
      {children}
    </RenderContextualActions>
  );
  const showEnclosingParentheses = editorState.type !== "root" && editorState.termId === termId;
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
            onClick={() => {
              onEditorStateChange({
                type: "term",
                termId,
                text: termData.label,
              });
            }}
            {...baseProps}
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
            {sourceFormattingImplementation.isRoot(source, termData.annotation) ? (
              <RenderLabel
                termId={termData.annotation}
                onClick={() => {
                  onEditorStateChange({
                    type: "annotation",
                    termId,
                    text: (termData.annotation && sourceImplementation.get(source, termData.annotation)?.label) ?? "",
                  });
                }}
                {...baseProps}
              />
            ) : (
              <RenderValue termId={termData.annotation} {...baseProps} />
            )}
          </React.Fragment>
        )
      )}
      {((editorState.type === "reference" && editorState.termId === termId && termData.label !== "") ||
        (editorState.type === "parameter" && editorState.termId === termId) ||
        (editorState.type === "term" && editorState.termId === termId && termData.parameters.size > 0) ||
        (termData.reference && termData.label !== "")) &&
        " = "}
      {(termData.parameters.size > 0 || (editorState.type === "parameters" && editorState.termId === termId)) && (
        <React.Fragment>
          {"("}
          {Array.from(termData.parameters.entries(), ([parameterTermId], index) => {
            return (
              <React.Fragment key={termIdStringSerialization.serialize(parameterTermId)}>
                {editorState.type === "parameter" && editorState.termId === termId && editorState.parameterTermId === parameterTermId ? (
                  actions()
                ) : sourceFormattingImplementation.isRoot(source, parameterTermId) ? (
                  <RenderLabel
                    termId={parameterTermId}
                    onClick={() => {
                      onEditorStateChange({
                        type: "parameter",
                        termId,
                        parameterTermId: parameterTermId,
                        text: sourceImplementation.get(source, parameterTermId)?.label ?? "",
                      });
                    }}
                    {...baseProps}
                  />
                ) : (
                  <RenderValue termId={parameterTermId} {...baseProps} />
                )}
                {(index < termData.parameters.size - 1 || (editorState.type === "parameters" && editorState.termId === termId)) && ", "}
              </React.Fragment>
            );
          })}
          {editorState.type === "parameters" && editorState.termId === termId && actions()}
          {")"}
        </React.Fragment>
      )}
      {(termData.parameters.size > 0 || (editorState.type === "parameters" && editorState.termId === termId)) &&
        (termData.type === "lambda" ? " => " : " -> ")}
      {editorState.type === "reference" && editorState.termId === termId
        ? actions()
        : termData.reference &&
          (sourceFormattingImplementation.isRoot(source, termData.reference) ? (
            <RenderLabel
              termId={termData.reference}
              onClick={() => {
                onEditorStateChange({
                  type: "reference",
                  termId: termId,
                  text: (termData.reference && sourceImplementation.get(source, termData.reference)?.label) ?? "",
                });
              }}
              {...baseProps}
            />
          ) : (
            <RenderValue termId={termData.reference} {...baseProps} />
          ))}
      {(termData.bindings.size > 0 ||
        (editorState.type === "bindings" && editorState.termId === termId) ||
        (editorState.type === "binding" && editorState.termId === termId)) && (
        <React.Fragment>
          (
          {Array.from(termData.bindings.entries(), ([bindingKeyTermId, bindingValueTermId], index) => {
            return (
              <React.Fragment key={termIdStringSerialization.serialize(bindingKeyTermId)}>
                <RenderLabel
                  termId={bindingKeyTermId}
                  onClick={() => {
                    onEditorStateChange({
                      type: "binding",
                      termId,
                      keyTermId: bindingKeyTermId,
                      text: (bindingValueTermId && sourceImplementation.get(source, bindingValueTermId)?.label) ?? "",
                    });
                  }}
                  {...baseProps}
                />
                {" = "}
                {editorState.type === "binding" && editorState.termId === termId && editorState.keyTermId === bindingKeyTermId && actions()}
                {bindingValueTermId ? (
                  sourceFormattingImplementation.isRoot(source, bindingValueTermId) ? (
                    <RenderLabel
                      termId={bindingValueTermId}
                      onClick={() => {
                        onEditorStateChange({
                          type: "binding",
                          termId: termId,
                          keyTermId: bindingKeyTermId,
                          text: sourceImplementation.get(source, bindingValueTermId)?.label ?? "",
                        });
                      }}
                      {...baseProps}
                    />
                  ) : (
                    <RenderValue termId={bindingValueTermId} {...baseProps} />
                  )
                ) : null}
                {(index < termData.bindings.size - 1 || (editorState.type === "bindings" && editorState.termId === termId)) && ", "}
              </React.Fragment>
            );
          })}
          {editorState.type === "bindings" && editorState.termId === termId && actions()})
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

export function RenderRoot<CommitId, Source>({ ...baseProps }: RenderSourceBaseProps<CommitId, Source>) {
  const {
    source,
    onSourceChange,
    editorState,
    onEditorStateChange,
    sourceFormattingImplementation,
    sourceImplementation,
    termIdStringSerialization,
    sourceFacadeImplementation,
  } = baseProps;
  return (
    <div
      css={css`
        padding: 1ch;
      `}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onEditorStateChange({ type: "root", text: "" });
        }
      }}
    >
      {[...sourceImplementation.all(source)]
        .filter(([termId]) => sourceFormattingImplementation.isRoot(source, termId))
        .map(([termId]) => {
          return (
            <div key={termIdStringSerialization.serialize(termId)}>
              <RenderValue termId={termId} {...baseProps} />
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
            sourceImplemetation={sourceImplementation}
            sourceFacadeImplementation={sourceFacadeImplementation}
            sourceFormattingImplementation={sourceFormattingImplementation}
          />
        </div>
      )}
    </div>
  );
}
