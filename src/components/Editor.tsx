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
      type: "annotation";
      termId: TermId;
      text: string;
    }
  | {
      type: "parameters";
      termId: TermId;
      text: string;
    }
  | {
      type: "parameter";
      termId: TermId;
      parameterTermId: TermId;
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
  shortcut?: { key: string; ctrl?: true; shift?: true; alt?: true };
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
      shortcut: { key: "i", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          create new variable{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {editorState.text}
          </strong>
        </span>
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
          shortcut: { key: "g", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              goto existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>
            </span>
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
          <span
            css={css`
              color: var(--text-color-secondary);
            `}
          >
            rename{" "}
            <strong
              css={css`
                color: var(--text-color);
              `}
            >
              {termData.label}
            </strong>{" "}
            to{" "}
            <strong
              css={css`
                color: var(--text-color);
              `}
            >
              {editorState.text}
            </strong>{" "}
          </span>
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

  if (editorState.type === "term") {
    const termData = source.terms.get(editorState.termId);
    if (termData) {
      contextualActions.push({
        shortcut: { key: ":" },
        display: (
          <span
            css={css`
              color: var(--text-color-secondary);
            `}
          >
            type
          </span>
        ),
        updated: {
          source,
          editorState: {
            type: "annotation",
            termId: editorState.termId,
            text: "",
          },
        },
      });
    }
  }

  if (editorState.type === "term") {
    const termData = source.terms.get(editorState.termId);
    if (termData) {
      contextualActions.push({
        shortcut: { key: "p", ctrl: true },
        display: (
          <span
            css={css`
              color: var(--text-color-secondary);
            `}
          >
            change to {termData.type === "pi" ? "=>" : "->"}
          </span>
        ),
        updated: {
          source: Source.changeTermType(
            source,
            editorState.termId,
            termData.type === "pi" ? "lambda" : "pi"
          ),
          editorState: editorState,
        },
      });
    }
  }

  if (
    editorState.type === "parameters" ||
    editorState.type === "reference" ||
    editorState.type === "bindings"
  ) {
    contextualActions.push({
      shortcut: { key: "h", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          term
        </span>
      ),
      updated: {
        source,
        editorState: {
          type: "term",
          termId: editorState.termId,
          text: source.terms.get(editorState.termId)?.label ?? "",
        },
      },
    });
  }

  if (
    editorState.type === "term" ||
    editorState.type === "reference" ||
    editorState.type === "bindings"
  ) {
    contextualActions.push({
      shortcut: { key: "j", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          parameters
        </span>
      ),
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
      shortcut: { key: "i", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          add new variable{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {editorState.text}
          </strong>{" "}
          as parameter
        </span>
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
          shortcut: { key: "u", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              use existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>{" "}
              as parameter
            </span>
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

  if (
    editorState.type === "parameters" ||
    editorState.type === "term" ||
    editorState.type === "bindings"
  ) {
    const termData = source.terms.get(editorState.termId);
    const referenceTermData =
      termData?.reference && source.terms.get(termData.reference);
    contextualActions.push({
      shortcut: { key: "k", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          reference
        </span>
      ),
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

  if (editorState.type === "parameter") {
    const termData = source.terms.get(editorState.parameterTermId);
    contextualActions.push({
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          remove{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {termData?.label}
          </strong>{" "}
          from parameters
        </span>
      ),
      updated: {
        source: source,
        editorState: {
          type: "parameters",
          termId: editorState.termId,
          text: "",
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
      shortcut: { key: "i", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          add new variable{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {editorState.text}
          </strong>{" "}
          as reference
        </span>
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
          shortcut: { key: "u", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              use existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>{" "}
              as reference
            </span>
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
      shortcut: { key: "l", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          bindings
        </span>
      ),
      updated: {
        source,
        editorState: { type: "bindings", termId: editorState.termId, text: "" },
      },
    });
  }

  if (editorState.type === "term") {
    contextualActions.push({
      shortcut: { key: "d", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          delete
        </span>
      ),
      updated: {
        source: Source.removeTerm(source, editorState.termId),
        editorState: { type: "root", text: "" },
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
      shortcut: { key: "i", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          add new variable{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {editorState.text}
          </strong>{" "}
          as binding key
        </span>
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
          shortcut: { key: "u", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              use existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>{" "}
              as binding key
            </span>
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
      shortcut: { key: "i", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          add new variable{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {editorState.text}
          </strong>{" "}
          as binding value
        </span>
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
          shortcut: { key: "u", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              use existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>{" "}
              as binding value
            </span>
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

  if (editorState.type === "binding" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        const [sourceWithNewTerm, newTermId] = Source.createTerm(source, "");
        const sourceWithAddedBindingValue = Source.setBinding(
          sourceWithNewTerm,
          editorState.termId,
          editorState.keyTermId,
          newTermId
        );
        const sourceWithSetReference = Source.setReference(
          sourceWithAddedBindingValue,
          newTermId,
          existingTermId
        );
        contextualActions.push({
          shortcut: { key: "o", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              add new anonymous variable as binding value
              <br />
              with reference as existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>
            </span>
          ),
          updated: {
            source: sourceWithSetReference,
            editorState: {
              type: "bindings",
              termId: newTermId,
              text: "",
            },
          },
        });
      }
    }
  }

  if (editorState.type !== "root") {
    contextualActions.push({
      shortcut: { key: "Escape" },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          escape
        </span>
      ),
      updated: {
        source,
        editorState: { type: "root", text: "" },
      },
    });
  }

  if (editorState.type === "annotation") {
    const [sourceWithNewTerm, newTermId] = Source.createTerm(
      source,
      editorState.text
    );
    const sourceWithAddedAnnotation = Source.setAnnotation(
      sourceWithNewTerm,
      editorState.termId,
      newTermId
    );
    contextualActions.push({
      shortcut: { key: "i", ctrl: true },
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          add new variable{" "}
          <strong
            css={css`
              color: var(--text-color);
            `}
          >
            {editorState.text}
          </strong>{" "}
          as annotation
        </span>
      ),
      updated: {
        source: sourceWithAddedAnnotation,
        editorState: {
          type: "annotation",
          termId: editorState.termId,
          text: editorState.text,
        },
      },
    });
  }

  if (editorState.type === "annotation" && editorState.text) {
    for (const [existingTermId, { label }] of source.terms.entries()) {
      if (label.includes(editorState.text)) {
        const sourceWithSetAnnotation = Source.setAnnotation(
          source,
          editorState.termId,
          existingTermId
        );
        contextualActions.push({
          shortcut: { key: "u", ctrl: true },
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              use existing variable{" "}
              <strong
                css={css`
                  color: var(--text-color);
                `}
              >
                {label}
              </strong>{" "}
              as annotation
            </span>
          ),
          updated: {
            source: sourceWithSetAnnotation,
            editorState: {
              type: "annotation",
              termId: editorState.termId,
              text: label,
            },
          },
        });
      }
    }
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
      if (
        event.key === "Enter" &&
        !isNaN(selectedActionIndex) &&
        actions[selectedActionIndex]
      ) {
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
      const shortcutAction = actions.find(
        (action) =>
          action.shortcut &&
          action.shortcut.key === event.key &&
          (action.shortcut.ctrl !== undefined
            ? action.shortcut.ctrl === event.ctrlKey
            : true) &&
          (action.shortcut.shift !== undefined
            ? action.shortcut.shift === event.shiftKey
            : true) &&
          (action.shortcut.alt !== undefined
            ? action.shortcut.alt === event.altKey
            : true)
      );
      if (shortcutAction) {
        event.preventDefault();
        onSourceChange(shortcutAction.updated.source);
        onEditorStateChange(shortcutAction.updated.editorState);
        setSelectedActionIndex(NaN);
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
            padding: 0;
            width: ${editorState.text.length
              ? `${editorState.text.length}ch`
              : "1px"};
          `}
        />
      )}
      <div
        css={css`
          left: 0px;
          top: 100%;
          position: absolute;
          width: 600px;
          max-height: 400px;
          overflow-y: scroll;
          background-color: var(--background-color-secondary);
          border: 1px solid var(--border-color);
          display: grid;
          grid-template-columns: max-content 1fr;
        `}
      >
        {actions.map((action, index) => {
          return (
            <React.Fragment key={index}>
              <div
                css={css`
                  grid-column: 1;
                  padding: 0 1em;
                  background-color: ${index === selectedActionIndex
                    ? "var(--hover-background-color)"
                    : ""};
                `}
              >
                {action.shortcut && (
                  <React.Fragment>
                    {action.shortcut.ctrl && "ctrl + "}
                    {action.shortcut.shift && "shift + "}
                    {action.shortcut.alt && "alt + "}
                    {action.shortcut.key}
                  </React.Fragment>
                )}
              </div>
              <div
                onClick={() => {
                  onSourceChange(action.updated.source);
                  onEditorStateChange(action.updated.editorState);
                }}
                css={css`
                  grid-column: 2;
                  user-select: none;
                  background-color: ${index === selectedActionIndex
                    ? "var(--hover-background-color)"
                    : ""};
                  :hover {
                    background-color: var(--hover-background-color);
                  }
                `}
              >
                {action.display}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
