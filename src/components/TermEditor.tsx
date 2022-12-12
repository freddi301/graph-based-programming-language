import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface } from "./Source";
import { SerializationInterface } from "./utils";

const shortIdLength = 5;

type EditorState<TermId> = {
  hoveredTermId?: TermId;
  navigation?: EditorNavigation<TermId>;
  optionIndex?: number;
  searchText?: string;
};

export function TermEditor<TermId, Source>({
  source,
  onSourceChange,
  sourceImplementation,
  sourceFacadeImplementation,
  termIdStringSerialization,
  sourceFormattingImplementation,
}: {
  source: Source;
  onSourceChange(source: Source): void;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}) {
  const [editorState, setEditorState] = React.useState<EditorState<TermId>>({});
  const options = getOptions<TermId, Source>({ sourceImplementation, source, editorState, termIdStringSerialization });
  const selectOption = (selectedTermId: TermId | null) => {
    const navigation = editorState.navigation;
    if (!navigation) return;
    const termId = navigation.termId;
    if (!termId) return;
    const termData = sourceImplementation.get(source, termId);
    switch (navigation?.part) {
      case "annotation": {
        const newSource = sourceFacadeImplementation.setAnnotation(source, termId, selectedTermId);
        onSourceChange(newSource);
        break;
      }
      case "parameters": {
        if (selectedTermId) {
          const newSource = sourceFacadeImplementation.addParameter(source, termId, selectedTermId);
          onSourceChange(newSource);
        }
        break;
      }
      case "parameter": {
        const parameterTermId = Array.from(termData.parameters.keys()).at(navigation.parameterIndex)!;
        if (selectedTermId) {
          const newSource = sourceFacadeImplementation.addParameter(
            sourceFacadeImplementation.removeParameter(source, termId, parameterTermId),
            termId,
            selectedTermId
          );
          onSourceChange(newSource);
        } else {
          const newSource = sourceFacadeImplementation.removeParameter(source, termId, parameterTermId);
          onSourceChange(newSource);
        }
        break;
      }
      case "reference": {
        const newSource = sourceFacadeImplementation.setReference(source, termId, selectedTermId);
        onSourceChange(newSource);
        break;
      }
      case "bindings": {
        if (selectedTermId) {
          const newSource = sourceFacadeImplementation.setBinding(source, termId, selectedTermId, null);
          onSourceChange(newSource);
          setEditorState({ ...editorState, navigation: { termId, part: "binding", bindingIndex: termData.bindings.size, subPart: "key" } });
        }
        break;
      }
      case "binding": {
        const bindingKeyTermId = Array.from(sourceImplementation.get(source, termId).bindings.keys()).at(navigation.bindingIndex)!;
        const bindingValueTermId = Array.from(sourceImplementation.get(source, termId).bindings.values()).at(navigation.bindingIndex)!;
        switch (navigation.subPart) {
          case "key": {
            if (selectedTermId) {
              const newSource = sourceFacadeImplementation.setBinding(source, termId, selectedTermId, bindingValueTermId);
              onSourceChange(newSource);
            } else {
              const newSource = sourceFacadeImplementation.removeBinding(source, termId, bindingKeyTermId);
              onSourceChange(newSource);
            }
            break;
          }
          case "value": {
            const newSource = sourceFacadeImplementation.setBinding(source, termId, bindingKeyTermId, selectedTermId);
            onSourceChange(newSource);
            break;
          }
        }
        break;
      }
    }
    setEditorState({ ...editorState, searchText: undefined, hoveredTermId: undefined, optionIndex: undefined });
    ref.current?.focus();
  };
  const ref = React.useRef<HTMLDivElement | null>(null);
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
      onKeyDown={(event) => {
        setTimeout(() => {
          if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
        });
        if (editorState.searchText !== undefined && editorState.navigation) {
          const setIndex = (index: number | undefined) => {
            setEditorState({ ...editorState, optionIndex: index, hoveredTermId: index !== undefined ? options[index] : undefined });
          };
          switch (event.key) {
            case "ArrowDown": {
              event.preventDefault();
              if (editorState.optionIndex === options.length - 1) setIndex(undefined);
              else if (editorState.optionIndex === undefined) setIndex(0);
              else setIndex(editorState.optionIndex + 1);
              break;
            }
            case "ArrowUp": {
              event.preventDefault();
              if (editorState.optionIndex === undefined) setIndex(options.length - 1);
              else if (editorState.optionIndex === 0) setIndex(undefined);
              else setIndex(editorState.optionIndex - 1);
              break;
            }
            case "Enter": {
              event.preventDefault();
              if (editorState.optionIndex === undefined) {
                const [newSource, newTermId] = sourceFacadeImplementation.create(source);
                const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, editorState.searchText ?? "");
                const placed = ((source): { source: Source; navigation: EditorNavigation<TermId> } => {
                  const navigation = editorState.navigation;
                  if (!navigation) return { source, navigation };
                  const termData = sourceImplementation.get(source, navigation.termId);
                  switch (navigation.part) {
                    case "annotation":
                      return { source: sourceFacadeImplementation.setAnnotation(source, navigation.termId, newTermId), navigation };
                    case "parameters":
                      return {
                        source: sourceFacadeImplementation.addParameter(source, navigation.termId, newTermId),
                        navigation: { termId: navigation.termId, part: "parameter", parameterIndex: termData.parameters.size },
                      };
                    case "reference":
                      return { source: sourceFacadeImplementation.setReference(source, navigation.termId, newTermId), navigation };
                    case "bindings":
                      return {
                        source: sourceFacadeImplementation.setBinding(source, navigation.termId, newTermId, null),
                        navigation: { termId: navigation.termId, part: "binding", bindingIndex: termData.bindings.size, subPart: "key" },
                      };
                    case "binding": {
                      switch (navigation.subPart) {
                        case "key":
                          return { source, navigation };
                        case "value":
                          return {
                            source: sourceFacadeImplementation.setBinding(
                              source,
                              navigation.termId,
                              Array.from(termData.bindings.keys()).at(navigation.bindingIndex)!,
                              newTermId
                            ),
                            navigation: {
                              termId: navigation.termId,
                              part: "binding",
                              bindingIndex: navigation.bindingIndex,
                              subPart: "value",
                            },
                          };
                      }
                      break;
                    }
                    default:
                      return { source, navigation };
                  }
                })(newSourceWithLabel);
                onSourceChange(placed.source);
                setEditorState({
                  ...editorState,
                  hoveredTermId: undefined,
                  searchText: undefined,
                  navigation: placed.navigation,
                  optionIndex: undefined,
                });
              } else if (editorState.optionIndex !== undefined && editorState.optionIndex < options.length) {
                selectOption(options[editorState.optionIndex]);
              }
              break;
            }
            case "Escape": {
              event.preventDefault();
              setEditorState({ ...editorState, searchText: undefined });
              break;
            }
          }
        } else if (!editorState.navigation) {
          const [newSource, newTermId] = sourceFacadeImplementation.create(source);
          onSourceChange(newSource);
          setEditorState({ ...editorState, hoveredTermId: undefined, navigation: { termId: newTermId, part: "label" } });
        } else {
          const nav = (direction: NavigationDirection) => {
            event?.preventDefault();
            setEditorState({
              ...editorState,
              navigation: editorNavigate({
                navigation: editorState.navigation,
                direction,
                source,
                sourceFacadeImplementation,
                sourceFormattingImplementation,
                sourceImplementation,
                termIdStringSerialization,
              }),
            });
          };
          switch (event.key) {
            case "ArrowLeft":
              return nav("left");
            case "ArrowUp":
              return nav("up");
            case "ArrowRight":
              return nav("right");
            case "ArrowDown":
              return nav("down");
            case "Enter": {
              event.preventDefault();
              if (editorState.navigation.part === "type") {
                const termData = sourceImplementation.get(source, editorState.navigation.termId);
                const newType = (() => {
                  switch (termData.type) {
                    case "lambda":
                      return "pi";
                    case "pi":
                      return "lambda";
                  }
                })();
                const newSource = sourceFacadeImplementation.setType(source, editorState.navigation.termId, newType);
                onSourceChange(newSource);
              }
              if (editorState.navigation.part === "mode") {
                const termData = sourceImplementation.get(source, editorState.navigation.termId);
                const newMode = (() => {
                  switch (termData.mode) {
                    case "call":
                      return "match";
                    case "match":
                      return "call";
                  }
                })();
                const newSource = sourceFacadeImplementation.setMode(source, editorState.navigation.termId, newMode);
                onSourceChange(newSource);
              }
              break;
            }
            case "Escape": {
              event.preventDefault();
              setEditorState({ ...editorState, navigation: undefined });
              break;
            }
          }
        }
      }}
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          ref.current?.focus();
          setEditorState({ ...editorState, navigation: undefined });
        }
      }}
    >
      {Array.from(sourceImplementation.all(source))
        .filter(([termId]) => sourceFormattingImplementation.isRoot(source, termId))
        .map(([termId, termData]) => {
          return (
            <div
              key={termIdStringSerialization.serialize(termId)}
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setEditorState({ ...editorState, navigation: { termId, part: "label" } });
                }
              }}
            >
              <SmallButton
                icon={<FontAwesomeIcon icon="minus" />}
                label="Delete term"
                onClick={() => {
                  const newSource = sourceFacadeImplementation.remove(source, termId);
                  onSourceChange(newSource);
                }}
              />
              <Term<TermId, Source>
                termId={termId}
                navigation={undefined}
                source={source}
                onSourceChange={onSourceChange}
                editorState={editorState}
                onEditorStateChange={setEditorState}
                sourceFacadeImplementation={sourceFacadeImplementation}
                sourceImplementation={sourceImplementation}
                termIdStringSerialization={termIdStringSerialization}
                sourceFormattingImplementation={sourceFormattingImplementation}
                options={options}
                onSelectOption={selectOption}
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
          editorState={editorState}
          onEditorStateChange={setEditorState}
          sourceFacadeImplementation={sourceFacadeImplementation}
          sourceImplementation={sourceImplementation}
          termIdStringSerialization={termIdStringSerialization}
          sourceFormattingImplementation={sourceFormattingImplementation}
          options={options}
          onSelectOption={selectOption}
        />
      </div>
    </div>
  );
}

const navigationSelectedStyle = css`
  background-color: var(--selection-background-color);
`;

type TermBaseProps<TermId, Source> = {
  source: Source;
  onSourceChange(source: Source): void;
  editorState: EditorState<TermId>;
  onEditorStateChange(editorState: EditorState<TermId>): void;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
  options: Array<TermId>;
  onSelectOption(termId: TermId | null): void;
};
function Term<TermId, Source>({
  termId,
  navigation,
  ...baseProps
}: { termId: TermId; navigation: EditorNavigation<TermId> | undefined } & TermBaseProps<TermId, Source>) {
  const {
    source,
    onSourceChange,
    editorState,
    onEditorStateChange,
    sourceImplementation,
    sourceFacadeImplementation,
    termIdStringSerialization,
    sourceFormattingImplementation,
  } = baseProps;
  const termData = sourceImplementation.get(source, termId);
  const [labelText, setLabelText] = React.useState(termData.label);
  React.useLayoutEffect(() => {
    setLabelText(termData.label);
  }, [termData.label]);
  const showStructure = termId === editorState.navigation?.termId;
  const showEnclosingParentheses = showStructure;
  const showAnnotationToken = showStructure || termData.annotation !== null;
  const showEqualsToken =
    showStructure || ((termData.parameters.size > 0 || termData.reference || termData.bindings.size > 0) && termData.label !== "");
  const showParametersParentheses = showStructure || termData.parameters.size > 0;
  const showArrowToken = showStructure || termData.parameters.size > 0;
  const showModeToken = showStructure || termData.mode === "match";
  const showBindingsParentheses = showStructure || termData.bindings.size > 0;
  const isRoot = sourceFormattingImplementation.isRoot(source, termId);
  const referencesCount = sourceFormattingImplementation.getReferencesCount(source, termId);
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
  const isLabelFocused = editorState.navigation?.termId === termId && editorState.navigation.part === "label";
  const labelInputRef = React.useRef<HTMLInputElement>(null);
  React.useLayoutEffect(() => {
    if (isLabelFocused) labelInputRef.current?.focus();
    else labelInputRef.current?.blur();
  }, [isLabelFocused]);
  const labelNode = (
    <span
      css={css`
        background-color: ${editorState.hoveredTermId === termId ? "var(--hover-background-color)" : ""};
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
        onEditorStateChange({ ...editorState, hoveredTermId: termId });
      }}
      onMouseLeave={() => {
        onEditorStateChange({ ...editorState, hoveredTermId: undefined });
      }}
      onClick={(event) => {
        if (event.ctrlKey) {
          onEditorStateChange({ ...editorState, navigation: { termId, part: "label" } });
        } else {
          onEditorStateChange({ ...editorState, navigation: navigation || { termId, part: "label" } });
        }
      }}
    >
      {/* {labelText || termIdStringSerialization.serialize(termId).slice(0, shortIdLength)} */}
      {labelText}
    </span>
  );
  const parentTermData = navigation ? sourceImplementation.get(source, navigation.termId) : null;
  const isPatternMatchLeftSide =
    navigation && navigation.part === "binding" && navigation.subPart === "key" && parentTermData && parentTermData.mode === "match";
  if (
    (isRoot && navigation) ||
    (!isRoot && referencesCount.asParameter.size === 1 && navigation?.part !== "parameter") ||
    (navigation?.part === "binding" && navigation.subPart === "key" && !isPatternMatchLeftSide)
  ) {
    return labelNode;
  }
  return (
    <span
      css={css`
        background-color: ${editorState.hoveredTermId === termId ? "var(--hover-background-color)" : ""};
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
          }}
          placeholder={termIdStringSerialization.serialize(termId)}
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
            onEditorStateChange({ ...editorState, hoveredTermId: termId });
          }}
          onMouseLeave={() => {
            onEditorStateChange({ ...editorState, hoveredTermId: undefined });
          }}
          onClick={() => {
            onEditorStateChange({ ...editorState, navigation: { termId, part: "label" } });
          }}
        />
      ) : (
        !isPatternMatchLeftSide && labelNode
      )}
      {showAnnotationToken && " : "}
      <span
        css={css`
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "annotation" && navigationSelectedStyle};
        `}
      >
        {showStructure && <Options label="Select annotation" navigation={{ termId, part: "annotation" }} {...baseProps} />}
        {termData.annotation && <Term termId={termData.annotation} navigation={{ termId, part: "annotation" }} {...baseProps} />}
      </span>
      {showEqualsToken && " = "}
      {showParametersParentheses && (
        <span
          css={css`
            ${editorState.navigation?.termId === termId && editorState.navigation.part === "parameters" && navigationSelectedStyle};
          `}
        >
          {"("}
        </span>
      )}
      {Array.from(termData.parameters.keys()).map((parameterTermId, index, array) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(parameterTermId)}>
            <span
              css={css`
                ${editorState.navigation?.termId === termId &&
                editorState.navigation.part === "parameter" &&
                index === editorState.navigation.parameterIndex &&
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
            ${editorState.navigation?.termId === termId && editorState.navigation.part === "parameters" && navigationSelectedStyle};
          `}
        >
          {")"}
        </span>
      )}
      <span
        css={css`
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "type" && navigationSelectedStyle};
        `}
      >
        {showArrowToken && (
          <span
            onClick={() => {
              switch (termData.type) {
                case "lambda": {
                  const newSource = sourceFacadeImplementation.setType(source, termId, "pi");
                  onSourceChange(newSource);
                  break;
                }
                case "pi": {
                  const newSource = sourceFacadeImplementation.setType(source, termId, "lambda");
                  onSourceChange(newSource);
                  break;
                }
              }
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
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "mode" && navigationSelectedStyle};
        `}
      >
        {showModeToken && (
          <span
            onClick={() => {
              switch (termData.mode) {
                case "call": {
                  const newSource = sourceFacadeImplementation.setMode(source, termId, "match");
                  onSourceChange(newSource);
                  break;
                }
                case "match": {
                  const newSource = sourceFacadeImplementation.setMode(source, termId, "call");
                  onSourceChange(newSource);
                  break;
                }
              }
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
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "reference" && navigationSelectedStyle};
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
              ${editorState.navigation?.termId === termId && editorState.navigation.part === "bindings" && navigationSelectedStyle};
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
      {Array.from(termData.bindings.entries()).map(([bindingKeyTermId, bindingValueTermId], index, array) => {
        return (
          <span key={termIdStringSerialization.serialize(bindingKeyTermId)}>
            <span
              css={css`
                ${editorState.navigation?.termId === termId &&
                editorState.navigation.part === "binding" &&
                editorState.navigation.subPart === "key" &&
                index === editorState.navigation.bindingIndex &&
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
                ${editorState.navigation?.termId === termId &&
                editorState.navigation.part === "binding" &&
                editorState.navigation.subPart === "value" &&
                index === editorState.navigation.bindingIndex &&
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
            ${editorState.navigation?.termId === termId && editorState.navigation.part === "bindings" && navigationSelectedStyle};
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

function Options<TermId, Source>({
  label,
  options,
  onSelectOption,
  navigation,
  source,
  editorState,
  sourceImplementation,
  onEditorStateChange,
  onSourceChange,
  sourceFacadeImplementation,
  sourceFormattingImplementation,
  termIdStringSerialization,
}: { label: string; navigation: EditorNavigation<TermId> | undefined } & TermBaseProps<TermId, Source>) {
  const navigationEquals = (a: EditorNavigation<TermId>, b: EditorNavigation<TermId>) => {
    if (a.termId !== b.termId) return false;
    if (a.part !== b.part) return false;
    if (a.part === "parameter" && b.part === "parameter" && a.parameterIndex !== b.parameterIndex) return false;
    if (a.part === "binding" && b.part === "binding" && (a.bindingIndex !== b.bindingIndex || a.subPart !== b.subPart)) return false;
    return true;
  };
  const isAtPosition =
    navigation === editorState.navigation || (editorState.navigation && navigation && navigationEquals(navigation, editorState.navigation));
  const isOpen = editorState.searchText !== undefined && isAtPosition && options.length > 0;
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useLayoutEffect(() => {
    if (isAtPosition) inputRef.current?.focus();
  }, [isAtPosition, editorState]);
  const value = navigation ? getTermIdAtEditorNavigation({ navigation, source, sourceImplementation }) : null;
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
                key={termIdStringSerialization.serialize(termId)}
                onClick={() => {
                  onSelectOption(termId);
                }}
                css={css`
                  background-color: ${index === editorState.optionIndex ? "var(--hover-background-color)" : ""};
                  :hover {
                    background-color: var(--hover-background-color);
                    user-select: none;
                  }
                `}
                onMouseEnter={() => {
                  onEditorStateChange({ ...editorState, hoveredTermId: termId });
                }}
                onMouseLeave={() => {
                  onEditorStateChange({ ...editorState, hoveredTermId: undefined });
                }}
              >
                {termData.label || (
                  <span
                    css={css`
                      color: var(--text-color-comment);
                    `}
                  >
                    {termIdStringSerialization.serialize(termId).slice(0, 5)}
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
            onSelectOption(null);
            onEditorStateChange({ ...editorState, searchText: undefined });
          }}
        />
      )}
      {!value && !isAtPosition && (
        <SmallButton
          icon={<FontAwesomeIcon icon="plus" style={{ visibility: "hidden" }} />}
          label={label}
          onClick={() => {
            onEditorStateChange({ ...editorState, searchText: "", navigation });
          }}
        />
      )}
      {isAtPosition && !value && (
        <input
          ref={inputRef}
          value={editorState.searchText ?? ""}
          onChange={(event) => {
            onEditorStateChange({ ...editorState, searchText: event.currentTarget.value, optionIndex: undefined });
          }}
          css={css`
            background-color: transparent;
            outline: none;
            border: none;
            font-family: inherit;
            font-size: inherit;
            padding: 0;
            color: var(--text-color);
            width: ${editorState.searchText?.length ? `${editorState.searchText.length}ch` : `1px`};
          `}
        />
      )}
    </span>
  );
}

// TODO sort options
// - that in scope terms come first
// - most recently used terms comes first
// - correct type terms comes first
function getOptions<TermId, Source>({
  sourceImplementation,
  source,
  editorState,
  termIdStringSerialization,
}: {
  sourceImplementation: SourceInterface<TermId, Source>;
  source: Source;
  editorState: EditorState<TermId>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
}) {
  return Array.from(sourceImplementation.all(source))
    .filter(([termId, termData]) => {
      const isSearching = Boolean(editorState.searchText);
      const matchesTermId = termIdStringSerialization.serialize(termId).includes(editorState.searchText?.toLowerCase() ?? "");
      const matchesTermLabel = termData.label.toLowerCase().includes(editorState.searchText?.toLowerCase() ?? "");
      if (isSearching && !(matchesTermId || matchesTermLabel)) return false;
      return true;
    })
    .map(([termId]) => termId);
}

type NavigationDirection = "left" | "right" | "up" | "down";

type EditorNavigation<TermId> =
  | {
      termId: TermId;
      part: "label";
    }
  | {
      termId: TermId;
      part: "annotation";
    }
  | {
      termId: TermId;
      part: "parameters";
    }
  | {
      termId: TermId;
      part: "parameter";
      parameterIndex: number;
    }
  | {
      termId: TermId;
      part: "type";
    }
  | {
      termId: TermId;
      part: "mode";
    }
  | {
      termId: TermId;
      part: "reference";
    }
  | {
      termId: TermId;
      part: "bindings";
    }
  | {
      termId: TermId;
      part: "binding";
      bindingIndex: number;
      subPart: "key";
    }
  | {
      termId: TermId;
      part: "binding";
      bindingIndex: number;
      subPart: "value";
    };

function editorNavigate<TermId, Source>({
  navigation,
  direction,
  source,
  sourceImplementation,
  sourceFacadeImplementation,
  sourceFormattingImplementation,
  termIdStringSerialization,
}: {
  navigation?: EditorNavigation<TermId>;
  direction: NavigationDirection;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}): EditorNavigation<TermId> | undefined {
  const roots = Array.from(sourceImplementation.all(source))
    .filter(([termId]) => sourceFormattingImplementation.isRoot(source, termId))
    .map(([termId]) => termId);
  if (!navigation) {
    switch (direction) {
      case "up": {
        if (roots.length) return { termId: roots[roots.length - 1], part: "label" };
        break;
      }
      case "down": {
        if (roots.length) return { termId: roots[0], part: "label" };
        break;
      }
    }
    return;
  }
  const onceMore = (direction: NavigationDirection, navigation?: EditorNavigation<TermId>) =>
    editorNavigate({
      navigation,
      direction,
      source,
      sourceImplementation,
      sourceFacadeImplementation,
      sourceFormattingImplementation,
      termIdStringSerialization,
    });
  const { termId } = navigation;
  const termData = sourceImplementation.get(source, termId);
  const rootIndex = roots.findIndex((ti) => ti === termId);
  const parentPosition = getParentPosition({
    termId,
    source,
    sourceFacadeImplementation,
    sourceFormattingImplementation,
    sourceImplementation,
    termIdStringSerialization,
  });
  switch (navigation?.part) {
    case "label": {
      switch (direction) {
        case "right":
          return { termId, part: "annotation" };
        case "left":
          return onceMore("left", parentPosition);
        case "up": {
          if (rootIndex === 0) return;
          if (rootIndex >= 0) return { termId: roots[rootIndex - 1], part: "label" };
          if (parentPosition) return parentPosition;
          break;
        }
        case "down": {
          if (rootIndex >= 0 && roots[0] && !navigation) return { termId: roots[0], part: "label" };
          if (rootIndex >= 0 && rootIndex < roots.length - 1) return { termId: roots[rootIndex + 1], part: "label" };
          if (rootIndex >= roots.length - 1) return;
          break;
        }
      }
      break;
    }
    case "annotation": {
      switch (direction) {
        case "right":
          if (termData.parameters.size === 0) return { termId, part: "parameters" };
          return { termId, part: "parameter", parameterIndex: 0 };
        case "left":
          return { termId, part: "label" };
        case "up":
          return { termId, part: "label" };
        case "down": {
          if (termData.annotation) return { termId: termData.annotation, part: "label" };
          break;
        }
      }
      break;
    }
    case "parameters": {
      switch (direction) {
        case "right":
          return { termId, part: "type" };
        case "left":
          if (termData.parameters.size === 0) return { termId, part: "annotation" };
          return { termId, part: "parameter", parameterIndex: termData.parameters.size - 1 };
        case "up":
          return { termId, part: "label" };
        case "down":
          return { termId, part: "parameter", parameterIndex: 0 };
      }
      break;
    }
    case "parameter": {
      const parameters = Array.from(termData.parameters.keys());
      switch (direction) {
        case "right":
          if (navigation.parameterIndex >= termData.parameters.size - 1) return { termId, part: "parameters" };
          return { termId, part: "parameter", parameterIndex: navigation.parameterIndex + 1 };
        case "left":
          if (navigation.parameterIndex === 0) return { termId, part: "annotation" };
          return { termId, part: "parameter", parameterIndex: navigation.parameterIndex - 1 };
        case "up":
          return { termId, part: "parameters" };
        case "down": {
          if (parameters[navigation.parameterIndex]) return { termId: parameters[navigation.parameterIndex], part: "label" };
          break;
        }
      }
      break;
    }
    case "type": {
      switch (direction) {
        case "right":
          return { termId, part: "mode" };
        case "left":
          return { termId, part: "parameters" };
        case "up":
          return { termId, part: "label" };
      }
      break;
    }
    case "mode": {
      switch (direction) {
        case "right":
          return { termId, part: "reference" };
        case "left":
          return { termId, part: "type" };
        case "up":
          return { termId, part: "label" };
      }
      break;
    }
    case "reference": {
      switch (direction) {
        case "right":
          if (termData.bindings.size === 0) return { termId, part: "bindings" };
          return { termId, part: "binding", bindingIndex: 0, subPart: "key" };
        case "left":
          return { termId, part: "type" };
        case "up":
          return { termId, part: "label" };
        case "down": {
          if (termData.reference) return { termId: termData.reference, part: "label" };
          break;
        }
      }
      break;
    }
    case "bindings": {
      switch (direction) {
        case "right":
          return onceMore("right", parentPosition);
        case "left":
          if (termData.bindings.size === 0) return { termId, part: "reference" };
          return { termId, part: "binding", bindingIndex: termData.bindings.size - 1, subPart: "value" };
        case "up":
          return { termId, part: "label" };
        case "down":
          return { termId, part: "binding", bindingIndex: 0, subPart: "key" };
      }
      break;
    }
    case "binding": {
      switch (navigation.subPart) {
        case "key": {
          const keys = Array.from(termData.bindings.keys());
          switch (direction) {
            case "right":
              return { termId, part: "binding", bindingIndex: navigation.bindingIndex, subPart: "value" };
            case "left":
              if (navigation.bindingIndex === 0) return { termId, part: "reference" };
              return { termId, part: "binding", bindingIndex: navigation.bindingIndex - 1, subPart: "value" };
            case "up":
              return { termId, part: "bindings" };
            case "down": {
              if (keys[navigation.bindingIndex]) return { termId: keys[navigation.bindingIndex], part: "label" };
              break;
            }
          }
          break;
        }
        case "value": {
          const values = Array.from(termData.bindings.values());
          switch (direction) {
            case "right":
              if (navigation.bindingIndex >= termData.bindings.size - 1) return { termId, part: "bindings" };
              return { termId, part: "binding", bindingIndex: navigation.bindingIndex + 1, subPart: "key" };
            case "left":
              return { termId, part: "binding", bindingIndex: navigation.bindingIndex, subPart: "key" };
            case "up":
              return { termId, part: "bindings" };
            case "down": {
              if (values[navigation.bindingIndex]) return { termId: values[navigation.bindingIndex]!, part: "label" };
              break;
            }
          }
          break;
        }
      }
    }
  }
}

function getParentPosition<TermId, Source>({
  termId,
  source,
  sourceFacadeImplementation,
  sourceFormattingImplementation,
  sourceImplementation,
  termIdStringSerialization,
}: {
  termId: TermId;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}): EditorNavigation<TermId> | undefined {
  const isRoot = sourceFormattingImplementation.isRoot(source, termId);
  const referencesCount = sourceFormattingImplementation.getReferencesCount(source, termId);
  const parents = sourceFormattingImplementation.getParents(source, termId);
  const parentTermId = ((): TermId | undefined => {
    if (parents.size === 1) return Array.from(parents.keys()).at(0);
    if (!isRoot && referencesCount.asParameter.size === 1) return Array.from(referencesCount.asParameter.keys()).at(0);
  })();
  const parentTermData = parentTermId ? sourceImplementation.get(source, parentTermId) : null;
  if (!parentTermData || !parentTermId) return;
  if (parentTermData.annotation === termId) return { termId: parentTermId, part: "annotation" };
  const parameters = Array.from(parentTermData.parameters.keys());
  for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
    if (parameters[parameterIndex] === termId) return { termId: parentTermId, part: "parameter", parameterIndex };
  }
  if (parentTermData.reference === termId) return { termId: parentTermId, part: "reference" };
  const bindings = Array.from(parentTermData.bindings.entries());
  for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++) {
    if (bindings[bindingIndex][0] === termId) return { termId: parentTermId, part: "binding", bindingIndex, subPart: "key" };
    if (bindings[bindingIndex][1] === termId) return { termId: parentTermId, part: "binding", bindingIndex, subPart: "value" };
  }
}

function getTermIdAtEditorNavigation<TermId, Source>({
  navigation,
  source,
  sourceImplementation,
}: {
  navigation: EditorNavigation<TermId>;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
}): TermId | null {
  const termData = sourceImplementation.get(source, navigation.termId);
  switch (navigation.part) {
    case "annotation":
      return termData.annotation;
    case "parameter":
      return Array.from(termData.parameters.keys()).at(navigation.parameterIndex) ?? null;
    case "reference":
      return termData.reference;
    case "binding":
      switch (navigation.subPart) {
        case "key":
          return Array.from(termData.bindings.keys()).at(navigation.bindingIndex) ?? null;
        case "value":
          return Array.from(termData.bindings.values()).at(navigation.bindingIndex) ?? null;
      }
      break;
    default:
      return null;
  }
}
