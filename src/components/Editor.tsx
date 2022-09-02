import React from "react";
import { css } from "styled-components/macro";
import { Source, TermId } from "./Source";

export type EditorState =
  | {
      type: "root";
      text: string;
    }
  | {
      type: "term";
      termId: TermId;
      text: string;
    }
  | {
      type: "parameters";
      termId: TermId;
      text: string;
    }
  | { type: "reference"; termId: TermId; text: string }
  | { type: "bindings"; termId: TermId; text: string }
  | { type: "binding"; termId: TermId; keyTermId: TermId; text: string };
export const EditorState = {
  empty: {
    type: "root",
    text: "",
  } as EditorState,
};

type ContextualAction = {
  display: React.ReactNode;
  updated: { source: Source; editorState: EditorState };
};

function deriveContextualActions(
  source: Source,
  editorState: EditorState
): Array<ContextualAction> {
  const contextualActions: Array<ContextualAction> = [];

  if (editorState.type === "root") {
    const [newSource, newTermId] = Source.createTerm(source, editorState.text);
    contextualActions.push({
      display: (
        <React.Fragment>
          create new variable <strong>{editorState.text}</strong>
        </React.Fragment>
      ),
      updated: {
        source: newSource,
        editorState: {
          type: "term",
          termId: newTermId,
          text: editorState.text,
        },
      },
    });
  }

  if (editorState.type === "root" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        contextualActions.push({
          display: (
            <React.Fragment>
              goto existing variable <strong>{label}</strong>
            </React.Fragment>
          ),
          updated: {
            source,
            editorState: { type: "term", termId: existingTermId, text: label },
          },
        });
      }
    }
  }

  if (editorState.type === "term") {
    const termData = source.terms.get(editorState.termId);
    if (termData && editorState.text !== termData.label) {
      contextualActions.push({
        display: (
          <React.Fragment>
            rename <strong>{termData.label}</strong> to{" "}
            <strong>{editorState.text}</strong>{" "}
          </React.Fragment>
        ),
        updated: {
          source: Source.renameTerm(
            source,
            editorState.termId,
            editorState.text
          ),
          editorState: {
            type: "term",
            termId: editorState.termId,
            text: editorState.text,
          },
        },
      });
    }
  }

  if (editorState.type === "term" || editorState.type === "reference") {
    contextualActions.push({
      display: <React.Fragment>parameters</React.Fragment>,
      updated: {
        source,
        editorState: {
          type: "parameters",
          termId: editorState.termId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "parameters") {
    const [sourceWithNewTerm, newTermId] = Source.createTerm(
      source,
      editorState.text
    );
    const sourceWithAddedParameter = Source.addParameter(
      sourceWithNewTerm,
      editorState.termId,
      newTermId
    );
    contextualActions.push({
      display: (
        <React.Fragment>
          add new variable <strong>{editorState.text}</strong> as parameter
        </React.Fragment>
      ),
      updated: {
        source: sourceWithAddedParameter,
        editorState: {
          type: "parameters",
          termId: editorState.termId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "parameters" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        const sourceWithAddedParameter = Source.addParameter(
          source,
          editorState.termId,
          existingTermId
        );
        contextualActions.push({
          display: (
            <React.Fragment>
              add existing variable <strong>{label}</strong> as parameter
            </React.Fragment>
          ),
          updated: {
            source: sourceWithAddedParameter,
            editorState: {
              type: "parameters",
              termId: editorState.termId,
              text: "",
            },
          },
        });
      }
    }
  }

  if (editorState.type === "parameters" || editorState.type === "term") {
    const termData = source.terms.get(editorState.termId);
    const referenceTermData =
      termData?.reference && source.terms.get(termData.reference);
    contextualActions.push({
      display: "reference",
      updated: {
        source,
        editorState: {
          type: "reference",
          termId: editorState.termId,
          text: referenceTermData?.label ?? "",
        },
      },
    });
  }

  if (editorState.type === "reference") {
    const [sourceWithNewTerm, newTermId] = Source.createTerm(
      source,
      editorState.text
    );
    const sourceWithAddedReference = Source.setReference(
      sourceWithNewTerm,
      editorState.termId,
      newTermId
    );
    contextualActions.push({
      display: (
        <React.Fragment>
          add new variable <strong>{editorState.text}</strong> as reference
        </React.Fragment>
      ),
      updated: {
        source: sourceWithAddedReference,
        editorState: {
          type: "reference",
          termId: editorState.termId,
          text: editorState.text,
        },
      },
    });
  }

  if (editorState.type === "reference" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        const sourceWithSetReference = Source.setReference(
          source,
          editorState.termId,
          existingTermId
        );
        contextualActions.push({
          display: (
            <React.Fragment>
              set existing variable <strong>{label}</strong> as reference
            </React.Fragment>
          ),
          updated: {
            source: sourceWithSetReference,
            editorState: {
              type: "reference",
              termId: editorState.termId,
              text: label,
            },
          },
        });
      }
    }
  }

  if (
    editorState.type === "reference" ||
    editorState.type === "term" ||
    editorState.type === "parameters"
  ) {
    contextualActions.push({
      display: <React.Fragment>bindings</React.Fragment>,
      updated: {
        source,
        editorState: { type: "bindings", termId: editorState.termId, text: "" },
      },
    });
  }

  if (editorState.type === "bindings") {
    const [sourceWithNewTerm, newTermId] = Source.createTerm(
      source,
      editorState.text
    );
    const sourceWithAddedBindingKey = Source.setBinding(
      sourceWithNewTerm,
      editorState.termId,
      newTermId,
      null
    );
    contextualActions.push({
      display: (
        <React.Fragment>
          add new variable <strong>{editorState.text}</strong> as binding key
        </React.Fragment>
      ),
      updated: {
        source: sourceWithAddedBindingKey,
        editorState: {
          type: "binding",
          termId: editorState.termId,
          keyTermId: newTermId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "bindings" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        const existingBindigValue =
          source.terms.get(editorState.termId)?.bindings.get(existingTermId) ??
          null;
        const text =
          (existingBindigValue &&
            source.terms.get(existingBindigValue)?.label) ??
          "";
        const sourceWithSetBindingKey = Source.setBinding(
          source,
          editorState.termId,
          existingTermId,
          existingBindigValue
        );
        contextualActions.push({
          display: (
            <React.Fragment>
              set existing variable <strong>{label}</strong> as binding key
            </React.Fragment>
          ),
          updated: {
            source: sourceWithSetBindingKey,
            editorState: {
              type: "binding",
              termId: editorState.termId,
              keyTermId: existingTermId,
              text,
            },
          },
        });
      }
    }
  }

  if (editorState.type === "binding") {
    const [sourceWithNewTerm, newTermId] = Source.createTerm(
      source,
      editorState.text
    );
    const sourceWithAddedBindingValue = Source.setBinding(
      sourceWithNewTerm,
      editorState.termId,
      editorState.keyTermId,
      newTermId
    );
    contextualActions.push({
      display: (
        <React.Fragment>
          add new variable <strong>{editorState.text}</strong> as binding value
        </React.Fragment>
      ),
      updated: {
        source: sourceWithAddedBindingValue,
        editorState: {
          type: "bindings",
          termId: editorState.termId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "binding" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        const sourceWithSetBindingValue = Source.setBinding(
          source,
          editorState.termId,
          editorState.keyTermId,
          existingTermId
        );
        contextualActions.push({
          display: (
            <React.Fragment>
              set existing variable <strong>{label}</strong> as binding value
            </React.Fragment>
          ),
          updated: {
            source: sourceWithSetBindingValue,
            editorState: {
              type: "bindings",
              termId: editorState.termId,
              text: "",
            },
          },
        });
      }
    }
  }

  if (editorState.type !== "root") {
    contextualActions.push({
      display: <React.Fragment>Escape</React.Fragment>,
      updated: {
        source,
        editorState: { type: "root", text: "" },
      },
    });
  }

  return contextualActions;
}

export function RenderContextualActions({
  children,
  source,
  onSourceChange,
  editorState,
  onEditorStateChange,
}: {
  children?: React.ReactNode;
  source: Source;
  onSourceChange(source: Source): void;
  editorState: EditorState;
  onEditorStateChange(editorState: EditorState): void;
}) {
  const actions = deriveContextualActions(source, editorState);
  const [selectedActionIndex, setSelectedActionIndex] = React.useState(NaN);
  React.useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && actions[selectedActionIndex]) {
        event.preventDefault();
        const action = actions[selectedActionIndex];
        onSourceChange(action.updated.source);
        onEditorStateChange(action.updated.editorState);
        setSelectedActionIndex(NaN);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedActionIndex((index) => {
          if (isNaN(index)) return actions.length - 1;
          if (index === 0) return NaN;
          return index - 1;
        });
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedActionIndex((index) => {
          if (isNaN(index)) return 0;
          if (index >= actions.length) return 0;
          return index + 1;
        });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [actions, onEditorStateChange, onSourceChange, selectedActionIndex]);
  return (
    <div
      css={css`
        display: inline-block;
        position: relative;
      `}
    >
      {children ?? (
        <input
          value={editorState.text}
          onChange={(event) =>
            onEditorStateChange({
              ...editorState,
              text: event.currentTarget.value,
            })
          }
          ref={(element) => element?.focus()}
          css={css`
            background-color: transparent;
            outline: none;
            border: none;
            font-family: inherit;
            font-size: inherit;
            color: inherit;
            width: ${editorState.text.length || 1}ch;
          `}
        />
      )}
      <div
        css={css`
          left: 0px;
          top: 100%;
          position: absolute;
          width: 400px;
          height: 400px;
          overflow-y: scroll;
          background-color: var(--background-color);
          border: 1px solid var(--border-color);
        `}
      >
        {actions.map((action, index) => {
          return (
            <div
              key={index}
              css={css`
                user-select: none;
                border-bottom: 1px solid var(--border-color);
                background-color: ${index === selectedActionIndex
                  ? "var(--action-hover-background-color)"
                  : ""};
              `}
              onMouseOver={() => {
                setSelectedActionIndex(index);
              }}
              onClick={() => {
                onSourceChange(action.updated.source);
                onEditorStateChange(action.updated.editorState);
              }}
            >
              {action.display}
            </div>
          );
        })}
      </div>
    </div>
  );
}
