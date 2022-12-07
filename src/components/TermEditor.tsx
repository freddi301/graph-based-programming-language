import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface } from "./Source";
import { SerializationInterface } from "./utils";

const shortIdLength = 5;

type EditorState<TermId> = {
  hoveredTermId?: TermId;
  navigation?: EditorNavigation<TermId>;
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
  return (
    <div
      css={css`
        white-space: pre;
        padding: 1ch;
      `}
      onKeyDown={(event) => {
        const nav = (direction: NavigationDirection) => {
          event?.preventDefault();
          setEditorState({
            ...editorState,
            navigation:
              editorNavigate({
                navigation: editorState.navigation,
                direction,
                source,
                sourceFacadeImplementation,
                sourceFormattingImplementation,
                sourceImplementation,
                termIdStringSerialization,
              }) ?? editorState.navigation,
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
        }
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) setEditorState({ ...editorState, navigation: undefined });
      }}
    >
      {Array.from(sourceImplementation.all(source))
        .filter(([termId]) => sourceFormattingImplementation.isRoot(source, termId))
        .map(([termId, termData]) => {
          return (
            <div
              key={termIdStringSerialization.serialize(termId)}
              css={css`
                width: max-content;
              `}
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
                atPosition="root"
                source={source}
                onSourceChange={onSourceChange}
                editorState={editorState}
                onEditorStateChange={setEditorState}
                sourceFacadeImplementation={sourceFacadeImplementation}
                sourceImplementation={sourceImplementation}
                termIdStringSerialization={termIdStringSerialization}
                sourceFormattingImplementation={sourceFormattingImplementation}
              />
            </div>
          );
        })}
      <div>
        <SmallButton
          icon={<FontAwesomeIcon icon="plus" />}
          label="Create new term"
          onClick={() => {
            const [newSource, newTermId] = sourceFacadeImplementation.create(source);
            onSourceChange(newSource);
            setEditorState({ ...editorState, hoveredTermId: undefined, navigation: { termId: newTermId, part: "label" } });
          }}
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
};
function Term<TermId, Source>({
  termId,
  atPosition,
  ...baseProps
}: { termId: TermId; atPosition: "root" | "annotation" | "parameter" | "reference" | "binding-key" | "binding-value" } & TermBaseProps<
  TermId,
  Source
>) {
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
  const updateLabel = () => {
    const newSource = sourceFacadeImplementation.setLabel(source, termId, labelText);
    onSourceChange(newSource);
  };
  const showStructure = termId === editorState.navigation?.termId;
  const showEnclosingParentheses = showStructure;
  const enclosingParenthesesStyle = css`
    background-color: ${showStructure ? "var(--selection-background-color)" : ""};
  `;
  const showAnnotationToken = showStructure || termData.annotation !== null;
  const showEqualsToken =
    showStructure || ((termData.parameters.size > 0 || termData.reference || termData.bindings.size > 0) && termData.label !== "");
  const showParametersParentheses = showStructure || termData.parameters.size > 0;
  const showArrowToken = showStructure || termData.parameters.size > 0;
  const showBindingsParentheses = showStructure || termData.bindings.size > 0;
  const isRoot = sourceFormattingImplementation.isRoot(source, termId);
  const referencesCount = sourceFormattingImplementation.getReferencesCount(source, termId);
  const labelColor = (() => {
    if (!termData.label) return "var(--text-color-comment)";
    if (atPosition === "binding-key") return "var(--text-color-binding)";
    if (termData.type === "lambda" && termData.parameters.size > 0) return "var(--text-color-lambda)";
    if (termData.type === "pi" && termData.parameters.size > 0) return "var(--text-color-pi)";
    if (referencesCount.asAnnotation) return "var(--text-color-type)";
    if (isRoot && termData.annotation && !termData.reference) return "var(--text-color-constructor)";
    return "var(--text-color)";
  })();
  if (
    (isRoot && atPosition !== "root") ||
    (!isRoot && referencesCount.asParameter.size === 1 && atPosition !== "parameter") ||
    atPosition === "binding-key"
  ) {
    return (
      <span
        css={css`
          background-color: ${editorState.hoveredTermId === termId ? "var(--hover-background-color)" : ""};
          color: ${labelColor};
          :hover {
            text-decoration: underline;
          }
        `}
        onMouseEnter={() => {
          onEditorStateChange({ ...editorState, hoveredTermId: termId });
        }}
        onMouseLeave={() => {
          onEditorStateChange({ ...editorState, hoveredTermId: undefined });
        }}
        onClick={(event) => {
          onEditorStateChange({ ...editorState, navigation: { termId, part: "label" } });
        }}
      >
        {labelText || termIdStringSerialization.serialize(termId).slice(0, shortIdLength)}
      </span>
    );
  }
  return (
    <span
      css={css`
        background-color: ${editorState.hoveredTermId === termId ? "var(--hover-background-color)" : ""};
        border-radius: 4px;
      `}
    >
      {showEnclosingParentheses && <span css={enclosingParenthesesStyle}>{"("}</span>}
      {(showStructure || termData.label || isRoot) && (
        <input
          value={labelText}
          onChange={(event) => setLabelText(event.currentTarget.value)}
          placeholder={termIdStringSerialization.serialize(termId)}
          css={css`
            background-color: transparent;
            outline: none;
            border: none;
            font-family: inherit;
            font-size: inherit;
            padding: 0;
            color: ${labelColor};
            width: ${labelText.length ? `${labelText.length}ch` : `${shortIdLength}ch`};
            ${editorState.navigation?.termId === termId && editorState.navigation.part === "label" && navigationSelectedStyle};
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
      )}
      {showAnnotationToken && " : "}
      <span
        css={css`
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "annotation" && navigationSelectedStyle};
        `}
      >
        {showStructure && (
          <Selector
            label="Select annotation"
            value={termData.annotation}
            onChange={(selectedTermId) => {
              const newSource = sourceFacadeImplementation.setAnnotation(source, termId, selectedTermId);
              onSourceChange(newSource);
            }}
            {...baseProps}
          />
        )}
        {termData.annotation && <Term termId={termData.annotation} atPosition="annotation" {...baseProps} />}
      </span>
      {showEqualsToken && " = "}
      <span
        css={css`
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "parameters" && navigationSelectedStyle};
        `}
      >
        {showParametersParentheses && "("}
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
                  <Selector
                    label="Select parameter"
                    value={parameterTermId}
                    onChange={(selectedTermId) => {
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
                    }}
                    {...baseProps}
                  />
                )}
                <Term termId={parameterTermId} atPosition="parameter" {...baseProps} />
              </span>

              {(index < array.length - 1 || showStructure) && ", "}
            </React.Fragment>
          );
        })}
        {showStructure && (
          <Selector
            label="Select parameter to add"
            value={null}
            onChange={(selectedTermId) => {
              if (selectedTermId) {
                const newSource = sourceFacadeImplementation.addParameter(source, termId, selectedTermId);
                onSourceChange(newSource);
              }
            }}
            {...baseProps}
          />
        )}
        {showParametersParentheses && ")"}
      </span>
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
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "reference" && navigationSelectedStyle};
        `}
      >
        {showStructure && (
          <Selector
            label="Select reference"
            value={termData.reference}
            onChange={(selectedTermId) => {
              const newSource = sourceFacadeImplementation.setReference(source, termId, selectedTermId);
              onSourceChange(newSource);
            }}
            {...baseProps}
          />
        )}
        {termData.reference && <Term termId={termData.reference} atPosition="reference" {...baseProps} />}
      </span>
      <span
        css={css`
          ${editorState.navigation?.termId === termId && editorState.navigation.part === "bindings" && navigationSelectedStyle};
        `}
      >
        {showBindingsParentheses && "("}
        {Array.from(termData.bindings.entries()).map(([bindingKeyTermId, bindingValueTermId], index, array) => {
          return (
            <React.Fragment key={termIdStringSerialization.serialize(bindingKeyTermId)}>
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
                  <Selector
                    label="Select binding key"
                    value={bindingKeyTermId}
                    onChange={(selectedTermId) => {
                      if (selectedTermId) {
                        const newSource = sourceFacadeImplementation.setBinding(source, termId, selectedTermId, bindingValueTermId);
                        onSourceChange(newSource);
                      } else {
                        const newSource = sourceFacadeImplementation.removeBinding(source, termId, bindingKeyTermId);
                        onSourceChange(newSource);
                      }
                    }}
                    {...baseProps}
                  />
                )}
                <Term termId={bindingKeyTermId} atPosition="binding-key" {...baseProps} />
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
                  <Selector
                    label="Select binding value"
                    value={bindingValueTermId}
                    onChange={(selectedTermId) => {
                      const newSource = sourceFacadeImplementation.setBinding(source, termId, bindingKeyTermId, selectedTermId);
                      onSourceChange(newSource);
                    }}
                    {...baseProps}
                  />
                )}
                {bindingValueTermId && <Term atPosition="binding-value" termId={bindingValueTermId} {...baseProps} />}
              </span>
              {(index < array.length - 1 || showStructure) && ", "}
            </React.Fragment>
          );
        })}
        {showStructure && (
          <Selector
            label="Select binding key to add"
            value={null}
            onChange={(selectedTermId) => {
              if (selectedTermId) {
                const newSource = sourceFacadeImplementation.setBinding(source, termId, selectedTermId, null);
                onSourceChange(newSource);
              }
            }}
            {...baseProps}
          />
        )}
        {showBindingsParentheses && ")"}
      </span>
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
        width: 20px;
        height: 20px;
        border-radius: 50%;
        font-size: inherit;
        font-family: inherit;
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

function Selector<TermId, Source>({
  value,
  onChange,
  label,
  ...baseProps
}: {
  value: TermId | null;
  onChange(value: TermId | null): void;
  label: React.ReactNode;
} & TermBaseProps<TermId, Source>) {
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
  const termData = value && sourceImplementation.get(source, value);
  const [searchText, setSearchText] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLSpanElement>(null);
  React.useLayoutEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as any)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, []);
  React.useLayoutEffect(() => {
    setSearchText(termData?.label ?? "");
  }, [termData?.label]);
  const [optionIndex, setOptionIndex] = React.useState<number | null>(null);
  // TODO sort options
  // - that in scope terms come first
  // - most recently used terms comes first
  // - correct type terms comes first
  const options = Array.from(sourceImplementation.all(source)).filter(([termId, termData]) => {
    const isSearching = searchText !== "";
    const matchesTermId = termIdStringSerialization.serialize(termId).includes(searchText.toLowerCase());
    const matchesTermLabel = termData.label.toLowerCase().includes(searchText.toLowerCase());
    if (isSearching && !(matchesTermId || matchesTermLabel)) return false;
    return true;
  });
  return (
    <React.Fragment>
      <span
        ref={containerRef}
        css={css`
          display: inline-block;
          position: relative;
        `}
      >
        {value && (
          <SmallButton
            icon={<FontAwesomeIcon icon="minus" />}
            label="Remove term"
            onClick={() => {
              onChange(null);
              setIsOpen(false);
            }}
          />
        )}
        {isOpen && (
          <input
            value={searchText}
            placeholder={value ? termIdStringSerialization.serialize(value) : ""}
            onChange={(event) => setSearchText(event.currentTarget.value)}
            onClick={() => {
              setIsOpen(!isOpen);
            }}
            css={css`
              background-color: transparent;
              outline: none;
              border: none;
              font-family: inherit;
              font-size: inherit;
              padding: 0;
              color: var(--text-color);
              width: ${searchText.length ? `${searchText.length}ch` : value ? `${shortIdLength}ch` : `1px`};
            `}
            onKeyDown={(event) => {
              const setIndex = (index: number | null) => {
                setOptionIndex(index);
                onEditorStateChange({ ...editorState, hoveredTermId: index ? options[index][0] : undefined });
              };
              switch (event.key) {
                case "ArrowDown": {
                  event.preventDefault();
                  if (optionIndex === options.length - 1) setIndex(null);
                  else if (optionIndex === null) setIndex(0);
                  else setIndex(optionIndex + 1);
                  break;
                }
                case "ArrowUp": {
                  event.preventDefault();
                  if (optionIndex === null) setIndex(options.length - 1);
                  else if (optionIndex === 0) setIndex(null);
                  else setIndex(optionIndex - 1);
                  break;
                }
                case "Enter": {
                  event.preventDefault();
                  if (optionIndex !== null && optionIndex < options.length) {
                    onChange(options[optionIndex][0]);
                    setSearchText("");
                  }
                  break;
                }
              }
            }}
            onBlur={() => {
              setSearchText(termData?.label ?? "");
            }}
            autoFocus={isOpen}
          />
        )}
        {!value && (
          <SmallButton
            icon={<FontAwesomeIcon icon="plus" style={{ visibility: "hidden" }} />}
            label={label}
            onClick={() => {
              setIsOpen(!isOpen);
            }}
          />
        )}
        {isOpen && (
          <div
            css={css`
              position: absolute;
              width: 200px;
              background-color: var(--background-color);
              border: 1px solid var(--border-color);
              z-index: 1;
              padding: 0px 0.5ch;
            `}
          >
            {options.map(([termId, termData], index) => {
              return (
                <div
                  key={termIdStringSerialization.serialize(termId)}
                  onClick={() => {
                    onChange(termId);
                    setSearchText("");
                    setIsOpen(false);
                  }}
                  css={css`
                    background-color: ${index === optionIndex ? "var(--hover-background-color)" : ""};
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
      </span>
    </React.Fragment>
  );
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
  if (!navigation) return;
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
  const roots = Array.from(sourceImplementation.all(source))
    .filter(([termId]) => sourceFormattingImplementation.isRoot(source, termId))
    .map(([termId]) => termId);
  const rootIndex = roots.findIndex((ti) => ti === termId);
  const parentPosition = getParentPosition({
    termId,
    source,
    sourceFacadeImplementation,
    sourceFormattingImplementation,
    sourceImplementation,
    termIdStringSerialization,
  });
  switch (navigation.part) {
    case "label": {
      switch (direction) {
        case "right":
          return { termId, part: "annotation" };
        case "left":
          return onceMore("left", parentPosition);
        case "up": {
          if (rootIndex === 0) return { termId: roots[roots.length - 1], part: "label" };
          if (rootIndex >= 0) return { termId: roots[rootIndex - 1], part: "label" };
          if (parentPosition) return parentPosition;
          break;
        }
        case "down": {
          if (rootIndex >= 0 && rootIndex < roots.length - 1) return { termId: roots[rootIndex + 1], part: "label" };
          if (rootIndex >= roots.length - 1) return { termId: roots[0], part: "label" };
          break;
        }
      }
      break;
    }
    case "annotation": {
      switch (direction) {
        case "right":
          return { termId, part: "parameters" };
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
          return { termId, part: "annotation" };
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
          if (navigation.parameterIndex >= termData.parameters.size - 1) return { termId, part: "type" };
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
          return { termId, part: "reference" };
        case "left":
          return { termId, part: "parameters" };
        case "up":
          return { termId, part: "label" };
      }
      break;
    }
    case "reference": {
      switch (direction) {
        case "right":
          return { termId, part: "bindings" };
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
          return { termId, part: "reference" };
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
              if (navigation.bindingIndex >= termData.parameters.size - 1) return onceMore("right", parentPosition);
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
