import React from "react";
import { css } from "styled-components/macro";
import { defaultShortcuts, Shortcut } from "./Shortcut";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface } from "./Source";
import { HasEmptyIntance } from "./utils";

export type EditorState<TermId> = { hoverLabel?: TermId; showSuggestions?: boolean } & (
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
  | { type: "binding"; termId: TermId; keyTermId: TermId; text: string }
);

export function createEditorStateHasEmptyInstance<TermId>(): HasEmptyIntance<EditorState<TermId>> {
  return {
    empty() {
      return {
        type: "root",
        text: "",
        showSuggestions: true,
      };
    },
  };
}

type ContextualAction<TermId, Source> = {
  shortcut?: Shortcut;
  display: React.ReactNode;
  updated: { source?: Source; editorState?: EditorState<TermId> };
};

function deriveContextualActions<TermId, Source>({
  source,
  editorState,
  sourceFacadeImplementation,
  sourceImplemetation,
  sourceFormattingImplementation,
}: {
  source: Source;
  editorState: EditorState<TermId>;
  sourceImplemetation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}): Array<ContextualAction<TermId, Source>> {
  const shortcuts = defaultShortcuts;
  const contextualActions: Array<ContextualAction<TermId, Source>> = [];

  if (editorState.type === "root") {
    const [newSource, newTermId] = sourceFacadeImplementation.create(source);
    const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, editorState.text);
    contextualActions.push({
      shortcut: shortcuts.newVariable,
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
          </strong>
        </span>
      ),
      updated: {
        source: newSourceWithLabel,
        editorState: {
          type: "term",
          termId: newTermId,
          text: editorState.text,
        },
      },
    });
  }

  if (editorState.type === "root" && editorState.text) {
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        contextualActions.push({
          shortcut: shortcuts.goto,
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
            editorState: { type: "term", termId: existingTermId, text: label },
          },
        });
      }
    }
  }

  if (editorState.type === "term") {
    const termData = sourceImplemetation.get(source, editorState.termId);
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
          source: sourceFacadeImplementation.setLabel(source, editorState.termId, editorState.text),
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
    const termData = sourceImplemetation.get(source, editorState.termId);
    if (termData) {
      contextualActions.push({
        shortcut: shortcuts.focusAnnotation,
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
          editorState: {
            type: "annotation",
            termId: editorState.termId,
            text: (termData.annotation && sourceImplemetation.get(source, termData.annotation)?.label) ?? "",
          },
        },
      });
    }
  }

  if (editorState.type === "root") {
    const [newSource, newTermId] = sourceFacadeImplementation.create(source);
    const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, editorState.text);
    contextualActions.push({
      shortcut: shortcuts.focusAnnotation,
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
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
            and go to annotation
          </span>
        </span>
      ),
      updated: {
        source: newSourceWithLabel,
        editorState: {
          type: "annotation",
          termId: newTermId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "parameters") {
    const [newSource, newTermId] = sourceFacadeImplementation.create(source);
    const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, editorState.text);
    const newSourceWithAddedParameter = sourceFacadeImplementation.addParameter(newSourceWithLabel, editorState.termId, newTermId);
    contextualActions.push({
      shortcut: shortcuts.focusAnnotation,
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
          as parameter and go to its annotation
        </span>
      ),
      updated: {
        source: newSourceWithAddedParameter,
        editorState: {
          type: "annotation",
          termId: newTermId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "term" || editorState.type === "parameters" || editorState.type === "parameter") {
    const termData = sourceImplemetation.get(source, editorState.termId);
    if (termData) {
      contextualActions.push({
        shortcut: shortcuts.toggleLambdaPi,
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
          source: sourceFacadeImplementation.setType(source, editorState.termId, termData.type === "pi" ? "lambda" : "pi"),
          editorState: editorState,
        },
      });
    }
  }

  if (editorState.type === "parameters" || editorState.type === "reference" || editorState.type === "bindings") {
    contextualActions.push({
      shortcut: shortcuts.focusTerm,
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
          focus whole term
        </span>
      ),
      updated: {
        editorState: {
          type: "term",
          termId: editorState.termId,
          text: sourceImplemetation.get(source, editorState.termId)?.label ?? "",
        },
      },
    });
  }

  if (editorState.type === "term" || editorState.type === "reference" || editorState.type === "bindings") {
    contextualActions.push({
      shortcut: shortcuts.focusParameters,
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
        editorState: {
          type: "parameters",
          termId: editorState.termId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "root") {
    const [newSource, newTermId] = sourceFacadeImplementation.create(source);
    const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, editorState.text);
    contextualActions.push({
      shortcut: shortcuts.focusParameters,
      display: (
        <span
          css={css`
            color: var(--text-color-secondary);
          `}
        >
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
            and go to parameters
          </span>
        </span>
      ),
      updated: {
        source: newSourceWithLabel,
        editorState: {
          type: "parameters",
          termId: newTermId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "parameters") {
    const [sourceWithNewTerm, newTermId] = sourceFacadeImplementation.create(source);
    const sourceWithNewTermWithLabel = sourceFacadeImplementation.setLabel(sourceWithNewTerm, newTermId, editorState.text);
    const sourceWithAddedParameter = sourceFacadeImplementation.addParameter(sourceWithNewTermWithLabel, editorState.termId, newTermId);
    contextualActions.push({
      shortcut: shortcuts.newVariable,
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
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        const sourceWithAddedParameter = sourceFacadeImplementation.addParameter(source, editorState.termId, existingTermId);
        contextualActions.push({
          shortcut: shortcuts.useExisting,
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
    editorState.type === "bindings" ||
    editorState.type === "annotation"
  ) {
    const termData = sourceImplemetation.get(source, editorState.termId);
    const referenceTermData = termData?.reference && sourceImplemetation.get(source, termData.reference);
    contextualActions.push({
      shortcut: shortcuts.focusReference,
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
        editorState: {
          type: "reference",
          termId: editorState.termId,
          text: referenceTermData?.label ?? "",
        },
      },
    });
  }

  if (editorState.type === "parameter") {
    const termData = sourceImplemetation.get(source, editorState.parameterTermId);
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
        editorState: {
          type: "parameters",
          termId: editorState.termId,
          text: "",
        },
      },
    });
  }

  if (editorState.type === "reference") {
    const [sourceWithNewTerm, newTermId] = sourceFacadeImplementation.create(source);
    const sourceWithNewTermWithLabel = sourceFacadeImplementation.setLabel(sourceWithNewTerm, newTermId, editorState.text);
    const sourceWithAddedReference = sourceFacadeImplementation.setReference(sourceWithNewTermWithLabel, editorState.termId, newTermId);
    contextualActions.push({
      shortcut: shortcuts.newVariable,
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
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        const sourceWithSetReference = sourceFacadeImplementation.setReference(source, editorState.termId, existingTermId);
        contextualActions.push({
          shortcut: shortcuts.useExisting,
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

  if (editorState.type === "reference" || editorState.type === "term" || editorState.type === "parameters") {
    contextualActions.push({
      shortcut: shortcuts.focusBindings,
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
        editorState: { type: "bindings", termId: editorState.termId, text: "" },
      },
    });
  }

  if (editorState.type === "term") {
    contextualActions.push({
      shortcut: shortcuts.delete,
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
        source: sourceFacadeImplementation.remove(source, editorState.termId),
        editorState: { type: "root", text: "" },
      },
    });
  }

  if (editorState.type === "bindings") {
    const [sourceWithNewTerm, newTermId] = sourceFacadeImplementation.create(source);
    const sourceWithNewTermWithLabel = sourceFacadeImplementation.setLabel(sourceWithNewTerm, newTermId, editorState.text);
    const sourceWithAddedBindingKey = sourceFacadeImplementation.setBinding(
      sourceWithNewTermWithLabel,
      editorState.termId,
      newTermId,
      null
    );
    contextualActions.push({
      shortcut: shortcuts.newVariable,
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
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        const existingBindigValue = sourceImplemetation.get(source, editorState.termId)?.bindings.get(existingTermId) ?? null;
        const text = (existingBindigValue && sourceImplemetation.get(source, existingBindigValue)?.label) ?? "";
        const sourceWithSetBindingKey = sourceFacadeImplementation.setBinding(
          source,
          editorState.termId,
          existingTermId,
          existingBindigValue
        );
        contextualActions.push({
          shortcut: shortcuts.useExisting,
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
    const [sourceWithNewTerm, newTermId] = sourceFacadeImplementation.create(source);
    const sourceWithNewTermWithLabel = sourceFacadeImplementation.setLabel(sourceWithNewTerm, newTermId, editorState.text);
    const sourceWithAddedBindingValue = sourceFacadeImplementation.setBinding(
      sourceWithNewTermWithLabel,
      editorState.termId,
      editorState.keyTermId,
      newTermId
    );
    contextualActions.push({
      shortcut: shortcuts.newVariable,
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
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        const sourceWithSetBindingValue = sourceFacadeImplementation.setBinding(
          source,
          editorState.termId,
          editorState.keyTermId,
          existingTermId
        );
        contextualActions.push({
          shortcut: shortcuts.useExisting,
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
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        const [sourceWithNewTerm, newTermId] = sourceFacadeImplementation.create(source);
        const sourceWithAddedBindingValue = sourceFacadeImplementation.setBinding(
          sourceWithNewTerm,
          editorState.termId,
          editorState.keyTermId,
          newTermId
        );
        const sourceWithSetReference = sourceFacadeImplementation.setReference(sourceWithAddedBindingValue, newTermId, existingTermId);
        contextualActions.push({
          shortcut: shortcuts.wrap,
          display: (
            <span
              css={css`
                color: var(--text-color-secondary);
              `}
            >
              add new anonymous variable as binding value
              <br />
              with reference set as existing variable{" "}
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
    const parents = sourceFormattingImplementation.getParents(source, editorState.termId);
    const onlyParent = parents.size === 1 && [...parents][0];
    contextualActions.push({
      shortcut: shortcuts.escape,
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
        editorState: onlyParent
          ? { type: "term", termId: onlyParent, text: sourceImplemetation.get(source, onlyParent).label }
          : { type: "root", text: "" },
      },
    });
  }

  if (editorState.type === "annotation") {
    const [sourceWithNewTerm, newTermId] = sourceFacadeImplementation.create(source);
    const sourceWithNewTermWithLabel = sourceFacadeImplementation.setLabel(sourceWithNewTerm, newTermId, editorState.text);
    const sourceWithAddedAnnotation = sourceFacadeImplementation.setAnnotation(sourceWithNewTermWithLabel, editorState.termId, newTermId);
    contextualActions.push({
      shortcut: shortcuts.newVariable,
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
          type: "term",
          termId: newTermId,
          text: editorState.text,
        },
      },
    });
  }

  if (editorState.type === "annotation" && editorState.text) {
    for (const [existingTermId, { label }] of sourceImplemetation.all(source)) {
      if (label.includes(editorState.text)) {
        const sourceWithSetAnnotation = sourceFacadeImplementation.setAnnotation(source, editorState.termId, existingTermId);
        contextualActions.push({
          shortcut: shortcuts.useExisting,
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

  contextualActions.push({
    shortcut: shortcuts.toggleSuggestions,
    display: (
      <span
        css={css`
          color: var(--text-color-secondary);
        `}
      >
        toggle suggestions
      </span>
    ),
    updated: {
      editorState: { ...editorState, showSuggestions: !editorState.showSuggestions },
    },
  });

  return contextualActions;
}

export function RenderContextualActions<TermId, Source>({
  children,
  source,
  onSourceChange,
  editorState,
  onEditorStateChange,
  sourceImplemetation,
  sourceFacadeImplementation,
  sourceFormattingImplementation,
}: {
  children?: React.ReactNode;
  source: Source;
  onSourceChange(source: Source): void;
  editorState: EditorState<TermId>;
  onEditorStateChange(editorState: EditorState<TermId>): void;
  sourceImplemetation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}) {
  const actions = deriveContextualActions({
    source,
    sourceImplemetation,
    sourceFacadeImplementation,
    editorState,
    sourceFormattingImplementation,
  });
  const [selectedActionIndex, setSelectedActionIndex] = React.useState(NaN);
  React.useLayoutEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter" && !isNaN(selectedActionIndex) && actions[selectedActionIndex]) {
        event.preventDefault();
        const action = actions[selectedActionIndex];
        if (action.updated.source) onSourceChange(action.updated.source);
        if (action.updated.editorState)
          onEditorStateChange({ showSuggestions: editorState.showSuggestions, ...action.updated.editorState });
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
      const shortcutActions = actions.filter(
        (action) =>
          action.shortcut &&
          action.shortcut.key === event.key &&
          (action.shortcut.ctrl !== undefined ? action.shortcut.ctrl === event.ctrlKey : true) &&
          (action.shortcut.shift !== undefined ? action.shortcut.shift === event.shiftKey : true) &&
          (action.shortcut.alt !== undefined ? action.shortcut.alt === event.altKey : true)
      );
      if (shortcutActions.length > 1) {
        console.log(shortcutActions);
        alert("overlapping shortcuts");
      }
      const shortcutAction = shortcutActions[0];
      if (shortcutAction) {
        event.preventDefault();
        if (shortcutAction.updated.source) onSourceChange(shortcutAction.updated.source);
        if (shortcutAction.updated.editorState)
          onEditorStateChange({ showSuggestions: editorState.showSuggestions, ...shortcutAction.updated.editorState });
        setSelectedActionIndex(NaN);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [actions, editorState, onEditorStateChange, onSourceChange, selectedActionIndex]);
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
            color: var(--text-color-secondary);
            padding: 0;
            width: ${editorState.text.length ? `${editorState.text.length}ch` : "1px"};
          `}
        />
      )}
      {editorState.showSuggestions && (
        <table
          css={css`
            z-index: 1;
            left: 0px;
            top: 100%;
            position: absolute;
            width: max-content;
            max-height: 400px;
            overflow-y: auto;
            background-color: var(--background-color-secondary);
            border: 1px solid var(--border-color);
            border-spacing: 0px;
          `}
        >
          <tbody>
            {actions.map((action, index) => {
              return (
                <tr
                  key={index}
                  css={css`
                    user-select: none;
                    background-color: ${index === selectedActionIndex ? "var(--hover-background-color)" : ""};
                    :hover {
                      background-color: var(--hover-background-color);
                    }
                  `}
                >
                  <td
                    css={css`
                      padding-left: 1ch;
                    `}
                  >
                    {action.shortcut && (
                      <React.Fragment>
                        {action.shortcut.ctrl && "Ctrl + "}
                        {action.shortcut.shift && "Shift + "}
                        {action.shortcut.alt && "Alt + "}
                        {remapKeyForDisplay(action.shortcut.key)}
                      </React.Fragment>
                    )}
                  </td>
                  <td
                    onClick={() => {
                      if (action.updated.source) onSourceChange(action.updated.source);
                      if (action.updated.editorState) onEditorStateChange(action.updated.editorState);
                    }}
                    css={css`
                      padding: 0px 1ch;
                    `}
                  >
                    {action.display}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function remapKeyForDisplay(key: string) {
  switch (key) {
    case " ":
      return "Space";
    default:
      return key;
  }
}
