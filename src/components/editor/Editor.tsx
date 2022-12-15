import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { keyboardAction } from "./keyboardAction";
import { getOptions, getTermIdAtEditorNavigation, isInline, Navigation, State } from "./State";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface, TermId } from "../Source";

const shortIdLength = 5;

export function TermEditor<Source>({
  source,
  onSourceChange,
  sourceImplementation,
  sourceFacadeImplementation,
  sourceFormattingImplementation,
}: {
  source: Source;
  onSourceChange(source: Source): void;
  sourceImplementation: SourceInterface<Source>;
  sourceFacadeImplementation: SourceFacadeInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}) {
  const [state, setState] = React.useState<State>({});
  const options = getOptions<Source>({ sourceImplementation, source, state: state });
  const ref = React.useRef<HTMLDivElement | null>(null);
  const onKeyDownWithState = (state: State, event: React.KeyboardEvent) => {
    setTimeout(() => {
      if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    });
    const changed = keyboardAction({
      state,
      event,
      source,
      sourceImplementation,
      sourceFacadeImplementation,
      sourceFormattingImplementation,
    });
    if (changed) {
      event.preventDefault?.();
      if (changed.state) setState(changed.state);
      if (changed.source) onSourceChange(changed.source);
    }
  };
  return (
    <div
      ref={ref}
      css={css`
        white-space: pre;
        padding: 1ch;
        height: 100%;
        box-sizing: border-box;
        outline: none;
      `}
      onKeyDown={(event) => onKeyDownWithState(state, event)}
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          ref.current?.focus();
          setState({});
        }
      }}
    >
      {sourceFormattingImplementation.getRoots(source).map((termId) => {
        return (
          <div
            key={termId}
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setState({ navigation: { termId, part: "label" } });
              }
            }}
          >
            <SmallButton
              icon={<FontAwesomeIcon icon="minus" />}
              label="Delete term"
              onClick={() => {
                onKeyDownWithState({ navigation: { termId, part: "label" } }, { key: "Backspace" } as any);
              }}
            />
            <Term<Source>
              termId={termId}
              navigation={undefined}
              source={source}
              onSourceChange={onSourceChange}
              state={state}
              onStateChange={setState}
              sourceFacadeImplementation={sourceFacadeImplementation}
              sourceImplementation={sourceImplementation}
              sourceFormattingImplementation={sourceFormattingImplementation}
              options={options}
              onKeyDownWithState={onKeyDownWithState}
            />
          </div>
        );
      })}
      <div>
        <Options
          label="New term"
          navigation={undefined}
          source={source}
          onSourceChange={onSourceChange}
          state={state}
          onStateChange={setState}
          sourceFacadeImplementation={sourceFacadeImplementation}
          sourceImplementation={sourceImplementation}
          sourceFormattingImplementation={sourceFormattingImplementation}
          options={options}
          onKeyDownWithState={onKeyDownWithState}
        />
      </div>
    </div>
  );
}

const navigationSelectedStyle = css`
  background-color: var(--selection-background-color);
`;

type TermBaseProps<Source> = {
  source: Source;
  onSourceChange(source: Source): void;
  state: State;
  onStateChange(stete: State): void;
  sourceImplementation: SourceInterface<Source>;
  sourceFacadeImplementation: SourceFacadeInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
  options: Array<TermId>;
  onKeyDownWithState(state: State, event: React.KeyboardEvent): void;
};
function Term<Source>({
  termId,
  navigation,
  ...baseProps
}: { termId: TermId; navigation: Navigation | undefined } & TermBaseProps<Source>) {
  const {
    source,
    onSourceChange,
    state,
    onStateChange,
    sourceImplementation,
    sourceFacadeImplementation,
    sourceFormattingImplementation,
    onKeyDownWithState,
  } = baseProps;
  const termData = sourceImplementation.get(source, termId);
  const [labelText, setLabelText] = React.useState(termData.label);
  React.useLayoutEffect(() => {
    setLabelText(termData.label);
  }, [termData.label]);
  const showStructure = termId === state.navigation?.termId;
  const showEnclosingParentheses = showStructure;
  const showAnnotationToken = showStructure || termData.annotation !== null;
  const showEqualsToken =
    showStructure || ((termData.parameters.size > 0 || termData.reference || termData.bindings.size > 0) && termData.label !== "");
  const showParametersParentheses = showStructure || termData.parameters.size > 0;
  const showArrowToken = showStructure || termData.parameters.size > 0;
  const showModeToken = showStructure || termData.mode === "match";
  const showBindingsParentheses = showStructure || termData.bindings.size > 0;
  const isRoot = sourceFormattingImplementation.isRoot(source, termId);
  const referencesCount = sourceFormattingImplementation.getReferences(source, termId);
  const labelColor = (() => {
    if (!termData.label) return "var(--text-color-comment)";
    if (navigation?.part === "binding" && navigation.subPart === "key") return "var(--text-color-binding)";
    if (termData.type === "lambda" && termData.parameters.size > 0) return "var(--text-color-lambda)";
    if (termData.type === "pi" && termData.parameters.size > 0) return "var(--text-color-pi)";
    if (referencesCount.asAnnotation) return "var(--text-color-type)";
    if (isRoot && termData.annotation && !termData.reference) return "var(--text-color-constructor)";
    return "var(--text-color)";
  })();
  const enclosingParenthesesStyle = css`
    background-color: ${showStructure ? "var(--selection-background-color)" : ""};
  `;
  const [ctrlIsPressed, setCtrlIsPressed] = React.useState(false);
  React.useLayoutEffect(() => {
    const onKeyDownUp = (event: KeyboardEvent) => {
      setCtrlIsPressed(event.ctrlKey);
    };
    document.addEventListener("keydown", onKeyDownUp);
    document.addEventListener("keyup", onKeyDownUp);
    return () => {
      document.addEventListener("keydown", onKeyDownUp);
      document.addEventListener("keyup", onKeyDownUp);
    };
  }, []);
  const updateLabel = React.useCallback(() => {
    if (labelText !== termData.label) {
      const newSource = sourceFacadeImplementation.setLabel(source, termId, labelText);
      onSourceChange(newSource);
    }
  }, [labelText, onSourceChange, source, sourceFacadeImplementation, termData.label, termId]);
  React.useLayoutEffect(() => {
    if (!showStructure) updateLabel();
  }, [showStructure, updateLabel]);
  const isLabelFocused = state.navigation?.termId === termId && state.navigation.part === "label";
  const labelInputRef = React.useRef<HTMLInputElement>(null);
  React.useLayoutEffect(() => {
    if (isLabelFocused) labelInputRef.current?.focus();
    else labelInputRef.current?.blur();
  }, [isLabelFocused]);
  const labelNode = (
    <span
      css={css`
        background-color: ${state.highlighted === termId ? "var(--hover-background-color)" : ""};
        color: ${labelColor};
        ${ctrlIsPressed
          ? css`
              cursor: pointer;
              :hover {
                text-decoration: underline;
              }
            `
          : ""}
      `}
      onMouseEnter={() => {
        onStateChange({ ...state, highlighted: termId });
      }}
      onMouseLeave={() => {
        onStateChange({ ...state, highlighted: undefined });
      }}
      onClick={(event) => {
        if (event.ctrlKey) {
          onStateChange({ navigation: { termId, part: "label" } });
        } else {
          onStateChange({ navigation: navigation || { termId, part: "label" } });
        }
      }}
    >
      {/* {labelText || (termId).slice(0, shortIdLength)} */}
      {labelText}
    </span>
  );
  if (navigation && !isInline({ navigation, termId, source, sourceImplementation, sourceFormattingImplementation })) {
    return labelNode;
  }
  return (
    <span
      css={css`
        background-color: ${state.highlighted === termId ? "var(--hover-background-color)" : ""};
        border-radius: 4px;
      `}
    >
      {showEnclosingParentheses && <span css={enclosingParenthesesStyle}>{"("}</span>}
      {showStructure ? (
        <input
          ref={labelInputRef}
          value={labelText}
          onChange={(event) => {
            setLabelText(event.currentTarget.value);
            onStateChange({ text: event.currentTarget.value, navigation: state.navigation });
          }}
          placeholder={termId}
          autoFocus={isLabelFocused}
          css={css`
            background-color: transparent;
            outline: none;
            border: none;
            font-family: inherit;
            font-size: inherit;
            padding: 0;
            color: ${labelColor};
            width: ${labelText.length ? `${labelText.length}ch` : `${shortIdLength}ch`};
          `}
          onBlur={() => {
            updateLabel();
          }}
          onMouseEnter={() => {
            onStateChange({ ...state, highlighted: termId });
          }}
          onMouseLeave={() => {
            onStateChange({ ...state, highlighted: undefined });
          }}
          onClick={() => {
            onStateChange({ navigation: { termId, part: "label" } });
          }}
        />
      ) : (
        labelNode
      )}
      {showAnnotationToken && " : "}
      <span
        css={css`
          ${state.navigation?.termId === termId && state.navigation.part === "annotation" && navigationSelectedStyle};
        `}
      >
        {showStructure && <Options label="Select annotation" navigation={{ termId, part: "annotation" }} {...baseProps} />}
        {termData.annotation && <Term termId={termData.annotation} navigation={{ termId, part: "annotation" }} {...baseProps} />}
      </span>
      {showEqualsToken && " = "}
      {showParametersParentheses && (
        <span
          css={css`
            ${state.navigation?.termId === termId && state.navigation.part === "parameters" && navigationSelectedStyle};
          `}
        >
          {"("}
        </span>
      )}
      {sourceFormattingImplementation.getTermParameters(source, termId).map((parameterTermId, index, array) => {
        return (
          <React.Fragment key={parameterTermId}>
            <span
              css={css`
                ${state.navigation?.termId === termId &&
                state.navigation.part === "parameter" &&
                index === state.navigation.parameterIndex &&
                navigationSelectedStyle};
              `}
            >
              {showStructure && (
                <Options label="Select parameter" navigation={{ termId, part: "parameter", parameterIndex: index }} {...baseProps} />
              )}
              <Term termId={parameterTermId} navigation={{ termId, part: "parameter", parameterIndex: index }} {...baseProps} />
            </span>
            {(index < array.length - 1 || showStructure) && ", "}
          </React.Fragment>
        );
      })}
      {showStructure && <Options label="Select parameter to add" navigation={{ termId, part: "parameters" }} {...baseProps} />}
      {showParametersParentheses && (
        <span
          css={css`
            ${state.navigation?.termId === termId && state.navigation.part === "parameters" && navigationSelectedStyle};
          `}
        >
          {")"}
        </span>
      )}
      <span
        css={css`
          ${state.navigation?.termId === termId && state.navigation.part === "type" && navigationSelectedStyle};
        `}
      >
        {showArrowToken && (
          <span
            onClick={() => {
              onKeyDownWithState({ navigation: { termId, part: "type" } }, { key: "Enter" } as any);
            }}
          >
            {(() => {
              switch (termData.type) {
                case "lambda":
                  return " => ";
                case "pi":
                  return " -> ";
              }
            })()}
          </span>
        )}
      </span>
      <span
        css={css`
          color: var(--text-color-keyword);
          ${state.navigation?.termId === termId && state.navigation.part === "mode" && navigationSelectedStyle};
        `}
      >
        {showModeToken && (
          <span
            onClick={() => {
              onKeyDownWithState({ navigation: { termId, part: "mode" } }, { key: "Enter" } as any);
            }}
          >
            {(() => {
              switch (termData.mode) {
                case "call":
                  return "call";
                case "match":
                  return "match";
              }
            })()}{" "}
          </span>
        )}
      </span>
      <span
        css={css`
          ${state.navigation?.termId === termId && state.navigation.part === "reference" && navigationSelectedStyle};
        `}
      >
        {showStructure && <Options label="Select reference" navigation={{ termId, part: "reference" }} {...baseProps} />}
        {termData.reference && <Term termId={termData.reference} navigation={{ termId, part: "reference" }} {...baseProps} />}
      </span>
      {showBindingsParentheses && (
        <React.Fragment>
          {termData.mode === "match" && termData.reference && " "}
          <span
            css={css`
              ${state.navigation?.termId === termId && state.navigation.part === "bindings" && navigationSelectedStyle};
            `}
          >
            {(() => {
              switch (termData.mode) {
                case "call":
                  return "(";
                case "match":
                  return "{";
              }
            })()}
          </span>
          {termData.mode === "match" && " "}
        </React.Fragment>
      )}
      {sourceFormattingImplementation
        .getTermBindings(source, termId)
        .map(({ key: bindingKeyTermId, value: bindingValueTermId }, index, array) => {
          return (
            <span key={bindingKeyTermId}>
              <span
                css={css`
                  ${state.navigation?.termId === termId &&
                  state.navigation.part === "binding" &&
                  state.navigation.subPart === "key" &&
                  index === state.navigation.bindingIndex &&
                  navigationSelectedStyle};
                `}
              >
                {showStructure && (
                  <Options
                    label="Select binding key"
                    navigation={{ termId, part: "binding", bindingIndex: index, subPart: "key" }}
                    {...baseProps}
                  />
                )}
                <Term
                  termId={bindingKeyTermId}
                  navigation={{ termId, part: "binding", bindingIndex: index, subPart: "key" }}
                  {...baseProps}
                />
              </span>
              {" = "}
              <span
                css={css`
                  ${state.navigation?.termId === termId &&
                  state.navigation.part === "binding" &&
                  state.navigation.subPart === "value" &&
                  index === state.navigation.bindingIndex &&
                  navigationSelectedStyle};
                `}
              >
                {showStructure && (
                  <Options
                    label="Select binding value"
                    navigation={{ termId, part: "binding", bindingIndex: index, subPart: "value" }}
                    {...baseProps}
                  />
                )}
                {bindingValueTermId && (
                  <Term
                    navigation={{ termId, part: "binding", bindingIndex: index, subPart: "value" }}
                    termId={bindingValueTermId}
                    {...baseProps}
                  />
                )}
              </span>
              {termData.mode === "match" && "; "}
              {termData.mode === "call" && (showStructure || index < array.length - 1) && ", "}
            </span>
          );
        })}
      {showStructure && <Options label="Select binding key to add" navigation={{ termId, part: "bindings" }} {...baseProps} />}
      {showBindingsParentheses && (
        <span
          css={css`
            ${state.navigation?.termId === termId && state.navigation.part === "bindings" && navigationSelectedStyle};
          `}
        >
          {(() => {
            switch (termData.mode) {
              case "call":
                return ")";
              case "match":
                return "}";
            }
          })()}
        </span>
      )}

      {showEnclosingParentheses && <span css={enclosingParenthesesStyle}>{")"}</span>}
    </span>
  );
}

function SmallButton({ icon, label, onClick }: { icon: React.ReactNode; label: React.ReactNode; onClick(): void }) {
  const [showLabel, setShowLabel] = React.useState(false);
  return (
    <button
      css={css`
        position: relative;
        background-color: var(--background-color-secondary);
        :hover {
          background-color: var(--hover-background-color);
        }
        border: none;
        color: inherit;
        padding: 0px;
        width: 2ch;
        border-radius: 50%;
        font-size: inherit;
        font-family: inherit;
        user-select: none;
      `}
      onMouseEnter={() => {
        setShowLabel(true);
      }}
      onMouseLeave={() => {
        setShowLabel(false);
      }}
      onClick={() => {
        onClick();
      }}
    >
      {icon}
      {showLabel && (
        <div
          css={css`
            position: absolute;
            left: 50%;
            background-color: var(--background-color-secondary);
            color: var(--text-color);
            padding: 4px 8px;
            border: 1px solid var(--border-color);
            z-index: 1;
            width: max-content;
            user-select: none;
          `}
        >
          {label}
        </div>
      )}
    </button>
  );
}

function Options<Source>({
  label,
  options,
  onKeyDownWithState,
  navigation,
  source,
  state,
  sourceImplementation,
  onStateChange,
  sourceFormattingImplementation,
}: { label: string; navigation: Navigation | undefined } & TermBaseProps<Source>) {
  const navigationEquals = (a: Navigation, b: Navigation) => {
    if (a.termId !== b.termId) return false;
    if (a.part !== b.part) return false;
    if (a.part === "parameter" && b.part === "parameter" && a.parameterIndex !== b.parameterIndex) return false;
    if (a.part === "binding" && b.part === "binding" && (a.bindingIndex !== b.bindingIndex || a.subPart !== b.subPart)) return false;
    return true;
  };
  const isAtPosition =
    navigation === state.navigation || (state.navigation && navigation && navigationEquals(navigation, state.navigation));
  const isOpen = state.text !== undefined && isAtPosition && options.length > 0;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useLayoutEffect(() => {
    if (isAtPosition) inputRef.current?.focus();
  }, [isAtPosition, state]);
  const value = navigation
    ? getTermIdAtEditorNavigation({ navigation, source, sourceImplementation, sourceFormattingImplementation })
    : null;
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
            const termData = sourceImplementation.get(source, termId);
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
                onMouseEnter={() => {
                  onStateChange({ ...state, highlighted: termId });
                }}
                onMouseLeave={() => {
                  onStateChange({ ...state, highlighted: undefined });
                }}
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
      {value && (
        <SmallButton
          icon={<FontAwesomeIcon icon="minus" color="red" />}
          label="Remove term"
          onClick={() => {
            onKeyDownWithState({ navigation }, { key: "Backspace" } as any);
          }}
        />
      )}
      {!value && !isAtPosition && (
        <SmallButton
          icon={<FontAwesomeIcon icon="plus" style={{ visibility: "hidden" }} />}
          label={label}
          onClick={() => {
            onStateChange({ text: "", navigation });
          }}
        />
      )}
      {isAtPosition && !value && (
        <input
          ref={inputRef}
          value={state.text ?? ""}
          onChange={(event) => {
            onStateChange({ navigation: state.navigation, text: event.currentTarget.value });
          }}
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
