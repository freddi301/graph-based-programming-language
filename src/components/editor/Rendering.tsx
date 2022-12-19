import { SourceFormatting, SourceInsert, SourceStore, TermId } from "../Source";
import { Builder, getRole, Printer } from "./Formatting";
import React from "react";
import { getTermIdAtEditorNavigation, isInline, Navigation, navigationEquals, State } from "./State";
import { css } from "styled-components/macro";

export function stringBuilderFactory(): Builder<string> {
  let result = "";
  let line = 0;
  let column = 0;
  let maxColumn = 0;
  return {
    result() {
      return result;
    },
    y() {
      return line;
    },
    x() {
      return column;
    },
    append(chunk) {
      result += chunk;
      column += chunk.length;
    },
    newLine() {
      result += "\n";
      line += 1;
      column = 0;
      maxColumn = Math.max(maxColumn, column);
    },
    width() {
      return Math.max(maxColumn, column);
    },
    height() {
      return line + 1;
    },
  };
}

export function stringPrinterFactory<Source>({
  termId,
  source,
  store,
  formatting,
}: {
  termId: TermId;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): Printer<string> {
  const termData = store.get(source, termId);
  const termParameters = formatting.getTermParameters(source, termId);
  const termBindings = formatting.getTermBindings(source, termId);
  return {
    indentation(level) {
      return "  ".repeat(level);
    },
    termStart() {
      return "(";
    },
    label() {
      return termData.label;
    },
    annotationStart() {
      return ": ";
    },
    rightHandSideStart() {
      return " = ";
    },
    parametersStart() {
      return "(";
    },
    parametersSeparator() {
      return ", ";
    },
    parametersEnd() {
      return ")";
    },
    termType() {
      switch (termData.type) {
        case "lambda":
          return " => ";
        case "pi":
          return " -> ";
        default:
          throw new Error();
      }
    },
    termMode() {
      switch (termData.mode) {
        case "call":
          return "call ";
        case "match":
          return "match ";
        default:
          throw new Error();
      }
    },
    referenceStart() {
      return "";
    },
    bindingsStart() {
      return "(";
    },
    bindingAssignment() {
      return " = ";
    },
    bindingSeparator() {
      return ", ";
    },
    bindingsEnd() {
      return ")";
    },
    termEnd() {
      return ")";
    },
  };
}

export function reactBuilderFactory(): Builder<{ content: React.ReactNode; width: number }> {
  let result: Array<React.ReactNode> = [];
  let line = 0;
  let column = 0;
  let maxColumn = 0;
  return {
    result() {
      return { content: result, width: this.width() };
    },
    y() {
      return line;
    },
    x() {
      return column;
    },
    append(chunk) {
      result.push(<React.Fragment key={result.length}>{chunk.content}</React.Fragment>);
      column += chunk.width;
    },
    newLine() {
      result.push(
        <React.Fragment key={result.length}>
          <br />
        </React.Fragment>
      );
      line += 1;
      column = 0;
      maxColumn = Math.max(maxColumn, column);
    },
    width() {
      return Math.max(maxColumn, column);
    },
    height() {
      return line + 1;
    },
  };
}

export function reactPrinterFactory<Source>({
  navigation,
  termId,
  state,
  onStateChange,
  source,
  onSourceChange,
  store,
  insert,
  formatting,
  onKeyDownWithState,
  options,
}: {
  navigation: Navigation | null;
  termId: TermId;
  state: State;
  onStateChange(state: State): void;
  source: Source;
  onSourceChange(source: Source): void;
  store: SourceStore<Source>;
  insert: SourceInsert<Source>;
  formatting: SourceFormatting<Source>;
  onKeyDownWithState(state: State, event: React.KeyboardEvent): void;
  options: Array<TermId>;
}): Printer<{ content: React.ReactNode; width: number }> {
  const termData = store.get(source, termId);
  const termParameters = formatting.getTermParameters(source, termId);
  const termBindings = formatting.getTermBindings(source, termId);
  const print = stringPrinterFactory({ termId, source, store, formatting });
  const onClickSelectTerm = (event: React.MouseEvent) => {
    if (event.ctrlKey) {
      onStateChange({ navigation: { termId, part: "label" } });
    } else {
      onStateChange({ navigation: navigation || { termId, part: "label" } });
    }
  };
  const onClickSelectParameters = (event: React.MouseEvent) => {
    onStateChange({ navigation: { termId, part: "parameters" } });
  };
  const onClickSelectBindings = (event: React.MouseEvent) => {
    onStateChange({ navigation: { termId, part: "bindings" } });
  };
  const baseProps = { options, state, onStateChange, source, store, formatting, onKeyDownWithState };
  const showAnnotationStart = termData.annotation || (state.navigation?.part === "annotation" && termId === state.navigation.termId);
  const showRightHandStart =
    termData.label &&
    (termParameters.length > 0 ||
      termData.reference ||
      termBindings.length > 0 ||
      (state.navigation?.part === "parameters" && termId === state.navigation.termId) ||
      (state.navigation?.part === "reference" && termId === state.navigation.termId));
  const showParameters = termData.parameters.size > 0 || (state.navigation?.part === "parameters" && termId === state.navigation.termId);
  const showTermType = termData.parameters.size > 0 || (state.navigation?.part === "parameters" && termId === state.navigation.termId);
  const showTermMode =
    termData.mode === "match" || (termId === state.navigation?.termId && (termData.reference || termData.bindings.size > 0));
  const showBindings = termData.bindings.size > 0 || (state.navigation?.part === "bindings" && termId === state.navigation.termId);
  return {
    indentation(level) {
      return {
        content: <span>{print.indentation(level)}</span>,
        width: print.indentation(level).length,
      };
    },
    termStart() {
      return {
        content: <span onClick={onClickSelectTerm}>{print.termStart()}</span>,
        width: print.termStart().length,
      };
    },
    label() {
      const labelColor = (() => {
        switch (getRole({ navigation, termId, source, store, formatting })) {
          case "lambda":
            return "var(--text-color-lambda)";
          case "pi":
            return "var(--text-color-pi)";
          case "type":
            return "var(--text-color-type)";
          case "constructor":
            return "var(--text-color-constructor)";
          case "binding":
            return "var(--text-color-binding)";
          case "regular":
            return "var(--text-color)";
        }
      })();
      const showInput =
        state.navigation?.part === "label" &&
        termId === state.navigation.termId &&
        !(navigation && !isInline({ termId, navigation, source, store, formatting }));
      return {
        content: (
          <span
            css={css`
              color: ${labelColor};
              background-color: ${state.highlighted === termId ? "var(--hover-background-color)" : ""};
            `}
          >
            {showInput ? (
              <LabelInput
                termId={termId}
                state={state}
                onStateChange={onStateChange}
                source={source}
                onSourceChange={onSourceChange}
                store={store}
                insert={insert}
              />
            ) : (
              <span
                onClick={onClickSelectTerm}
                onMouseEnter={() => {
                  onStateChange({ ...state, highlighted: termId });
                }}
                onMouseLeave={() => {
                  onStateChange({ ...state, highlighted: undefined });
                }}
                className="term-label"
              >
                {print.label()}
              </span>
            )}
          </span>
        ),
        width: print.label().length,
      };
    },
    annotationStart() {
      return {
        content: showAnnotationStart && (
          <span>
            {print.annotationStart()}
            <Options navigation={{ termId, part: "annotation" }} {...baseProps} />
          </span>
        ),
        width: showAnnotationStart ? print.annotationStart().length : 0,
      };
    },
    parametersStart() {
      return {
        content: showParameters && (
          <span
            onClick={onClickSelectParameters}
            css={css`
              ${state.navigation?.termId === termId && state.navigation.part === "parameters" && navigationSelectedStyle};
            `}
          >
            {print.parametersStart()}
          </span>
        ),
        width: showParameters ? print.parametersStart().length : 0,
      };
    },
    parametersSeparator(parameterIndex) {
      const showParameterSeparator =
        parameterIndex < termParameters.length - 1 || (state.navigation?.part === "parameters" && termId === state.navigation.termId);
      return {
        content: showParameterSeparator && <span>{print.parametersSeparator(parameterIndex)}</span>,
        width: showParameterSeparator ? print.parametersSeparator(parameterIndex).length : 0,
      };
    },
    parametersEnd() {
      return {
        content: showParameters && (
          <span
            onClick={onClickSelectParameters}
            css={css`
              ${state.navigation?.termId === termId && state.navigation.part === "parameters" && navigationSelectedStyle};
            `}
          >
            <Options navigation={{ termId, part: "parameters" }} {...baseProps} />
            {print.parametersEnd()}
          </span>
        ),
        width: showParameters ? print.parametersEnd().length : 0,
      };
    },
    rightHandSideStart() {
      return {
        content: showRightHandStart && <span>{print.rightHandSideStart()}</span>,
        width: showRightHandStart ? print.rightHandSideStart().length : 0,
      };
    },
    termType() {
      return {
        content: showTermType && (
          <span
            onClick={() => {
              onKeyDownWithState({ navigation: { termId, part: "type" } }, { key: "Enter" } as any);
              onStateChange({ navigation: { termId, part: "type" } });
            }}
          >
            {print.termType()}
          </span>
        ),
        width: showTermType ? print.termType().length : 0,
      };
    },
    termMode() {
      return {
        content: showTermMode && (
          <span
            css={css`
              color: var(--text-color-keyword);
            `}
            onClick={() => {
              onKeyDownWithState({ navigation: { termId, part: "mode" } }, { key: "Enter" } as any);
              onStateChange({ navigation: { termId, part: "mode" } });
            }}
          >
            {print.termMode()}
          </span>
        ),
        width: showTermMode ? print.termMode().length : 0,
      };
    },
    referenceStart() {
      return {
        content: state.navigation?.part === "reference" && termId === state.navigation.termId && (
          <span>
            <Options navigation={{ termId, part: "reference" }} {...baseProps} />
          </span>
        ),
        width: 0,
      };
    },
    bindingsStart() {
      return {
        content: showBindings && (
          <span
            onClick={onClickSelectBindings}
            css={css`
              ${state.navigation?.termId === termId && state.navigation.part === "bindings" && navigationSelectedStyle};
            `}
          >
            {print.bindingsStart()}
          </span>
        ),
        width: showBindings ? print.bindingsStart().length : 0,
      };
    },
    bindingAssignment(bindingIndex) {
      return {
        content: (
          <span>
            {print.bindingAssignment(bindingIndex)}
            <Options navigation={{ termId, part: "binding", bindingIndex, subPart: "value" }} {...baseProps} />
          </span>
        ),
        width: print.bindingAssignment(bindingIndex).length,
      };
    },
    bindingSeparator(bindingIndex) {
      const showBindingSeparator =
        bindingIndex < termBindings.length - 1 || (state.navigation?.part === "bindings" && termId === state.navigation.termId);
      return {
        content: showBindingSeparator && <span>{print.bindingSeparator(bindingIndex)}</span>,
        width: showBindingSeparator ? print.bindingSeparator(bindingIndex).length : 0,
      };
    },
    bindingsEnd() {
      return {
        content: showBindings && (
          <span
            onClick={onClickSelectBindings}
            css={css`
              ${state.navigation?.termId === termId && state.navigation.part === "bindings" && navigationSelectedStyle};
            `}
          >
            <Options navigation={{ termId, part: "bindings" }} {...baseProps} />
            {print.bindingsEnd()}
          </span>
        ),
        width: showBindings ? print.bindingsEnd().length : 0,
      };
    },
    termEnd() {
      return {
        content: <span onClick={onClickSelectTerm}>{print.termEnd()}</span>,
        width: print.termEnd().length,
      };
    },
  };
}

const navigationSelectedStyle = css`
  background-color: var(--selection-background-color);
`;

function LabelInput<Source>({
  termId,
  state,
  onStateChange,
  source,
  onSourceChange,
  store,
  insert,
}: {
  termId: TermId;
  state: State;
  onStateChange(state: State): void;
  source: Source;
  onSourceChange(source: Source): void;
  store: SourceStore<Source>;
  insert: SourceInsert<Source>;
}) {
  const termData = store.get(source, termId);
  const [labelText, setLabelText] = React.useState(termData.label);
  React.useLayoutEffect(() => {
    setLabelText(termData.label);
  }, [termData.label]);
  const updateLabel = React.useCallback(() => {
    if (labelText !== termData.label) {
      const newSource = insert.setLabel(source, termId, labelText);
      onSourceChange(newSource);
    }
  }, [labelText, onSourceChange, source, insert, termData.label, termId]);
  const isLabelFocused = state.navigation?.termId === termId && state.navigation.part === "label";
  const labelInputRef = React.useRef<HTMLInputElement>(null);
  React.useLayoutEffect(() => {
    if (isLabelFocused) labelInputRef.current?.focus();
    else labelInputRef.current?.blur();
  }, [isLabelFocused]);
  return (
    <input
      ref={labelInputRef}
      value={labelText}
      onChange={(event) => {
        setLabelText(event.currentTarget.value);
        onStateChange({ text: event.currentTarget.value, navigation: state.navigation });
      }}
      css={css`
        background-color: transparent;
        outline: none;
        border: none;
        font-family: inherit;
        font-size: inherit;
        padding: 0;
        width: ${labelText.length ? `${labelText.length}ch` : `1px`};
        color: inherit;
      `}
      onBlur={() => {
        updateLabel();
      }}
      onClick={() => {
        onStateChange({ navigation: { termId, part: "label" } });
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" && event.currentTarget.selectionStart !== 0) {
          event.stopPropagation();
        }
        if (event.key === "ArrowRight" && event.currentTarget.selectionStart !== event.currentTarget.value.length) {
          event.stopPropagation();
        }
        if (event.key === "Backspace" && event.currentTarget.value) {
          event.stopPropagation();
        }
      }}
    />
  );
}

export function Options<Source>({
  navigation,
  options,
  state,
  onStateChange,
  source,
  store,
  formatting,
  onKeyDownWithState,
}: {
  navigation: Navigation | undefined;
  options: Array<TermId>;
  state: State;
  onStateChange(state: State): void;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
  onKeyDownWithState(state: State, event: React.KeyboardEvent): void;
}) {
  const isAtPosition =
    navigation === state.navigation || (state.navigation && navigation && navigationEquals(navigation, state.navigation));
  const isOpen = state.text !== undefined && isAtPosition && options.length > 0 && navigation;
  const value = navigation ? getTermIdAtEditorNavigation({ navigation, source, store, formatting }) : null;
  return (
    <span
      css={css`
        display: inline-block;
        position: relative;
        user-select: none;
      `}
    >
      {isOpen && (
        <div
          css={css`
            position: absolute;
            width: 200px;
            background-color: var(--background-color-secondary);
            border: 1px solid var(--border-color);
            z-index: 1;
            top: 100%;
          `}
        >
          {options.map((termId, index) => {
            const termData = store.get(source, termId);
            return (
              <div
                key={termId}
                onClick={() => {
                  onKeyDownWithState({ navigation, text: state.text, optionIndex: index }, { key: "Enter" } as any);
                }}
                css={css`
                  background-color: ${index === state.optionIndex ? "var(--hover-background-color)" : ""};
                  :hover {
                    background-color: var(--hover-background-color);
                    user-select: none;
                  }
                `}
              >
                {termData.label || (
                  <span
                    css={css`
                      color: var(--text-color-comment);
                    `}
                  >
                    {termId.slice(0, 5)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
      {isAtPosition && !value && (
        <input
          value={state.text ?? ""}
          onChange={(event) => {
            onStateChange({ navigation: state.navigation, text: event.currentTarget.value });
          }}
          autoFocus={true}
          css={css`
            background-color: transparent;
            outline: none;
            border: none;
            font-family: inherit;
            font-size: inherit;
            padding: 0;
            color: var(--text-color);
            width: ${state.text?.length ? `${state.text.length}ch` : `1px`};
          `}
        />
      )}
    </span>
  );
}
