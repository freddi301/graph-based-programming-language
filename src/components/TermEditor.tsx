import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface } from "./Source";
import { SerializationInterface } from "./utils";

// TODO: make buttons ergonomic for click

const shortIdLength = 5;

type EditorState<TermId> = {
  focusedTermId?: TermId;
  hoveredTermId?: TermId;
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
    >
      {Array.from(sourceImplementation.all(source))
        .filter(([termId]) => sourceFormattingImplementation.isRoot(source, termId))
        .map(([termId, termData]) => {
          return (
            <div key={termIdStringSerialization.serialize(termId)}>
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
                atRoot={true}
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
            setEditorState({ ...editorState, hoveredTermId: undefined, focusedTermId: newTermId });
          }}
        />
      </div>
    </div>
  );
}

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
function Term<TermId, Source>({ termId, atRoot, ...baseProps }: { termId: TermId; atRoot: boolean } & TermBaseProps<TermId, Source>) {
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
  const showStructure = termId === editorState.focusedTermId;
  const showEnclosingParentheses = !sourceFormattingImplementation.isRoot(source, termId) || termId === editorState.focusedTermId; // TODO better, and highlight parentheses
  const showAnnotationToken = showStructure || termData.annotation !== null;
  const showEqualsToken =
    showStructure || ((termData.parameters.size > 0 || termData.reference || termData.bindings.size > 0) && termData.label !== "");
  const showParametersParentheses = showStructure || termData.parameters.size > 0;
  const showArrowToken = showStructure || termData.parameters.size > 0;
  const showBindingsParentheses = showStructure || termData.bindings.size > 0;
  const isRoot = sourceFormattingImplementation.isRoot(source, termId);
  if (isRoot && !atRoot) {
    return (
      <span
        css={css`
          background-color: ${editorState.hoveredTermId === termId ? "var(--hover-background-color)" : "transparent"};
          color: ${termData.label ? "var(--text-color)" : "var(--text-color-secondary)"};
        `}
        onMouseEnter={() => {
          onEditorStateChange({ ...editorState, hoveredTermId: termId });
        }}
        onMouseLeave={() => {
          onEditorStateChange({ ...editorState, hoveredTermId: undefined });
        }}
        onClick={() => {
          onEditorStateChange({ ...editorState, focusedTermId: termId });
        }}
      >
        {labelText || termIdStringSerialization.serialize(termId).slice(0, shortIdLength)}
      </span>
    );
  }
  return (
    <span
      css={css`
        position: relative;
      `}
    >
      {showEnclosingParentheses && "("}
      <input
        value={labelText}
        onChange={(event) => setLabelText(event.currentTarget.value)}
        placeholder={termIdStringSerialization.serialize(termId)}
        css={css`
          background-color: ${editorState.hoveredTermId === termId ? "var(--hover-background-color)" : "transparent"};
          outline: none;
          border: none;
          font-family: inherit;
          font-size: inherit;
          padding: 0;
          color: var(--text-color);
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
          onEditorStateChange({ ...editorState, focusedTermId: termId });
        }}
      />
      {showAnnotationToken && " : "}
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
      {termData.annotation && <Term termId={termData.annotation} atRoot={false} {...baseProps} />}
      {showEqualsToken && " = "}
      {showParametersParentheses && "("}
      {Array.from(termData.parameters.keys()).map((parameterTermId, index, array) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(parameterTermId)}>
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
            <Term termId={parameterTermId} atRoot={false} {...baseProps} />
            {index < array.length - 1 && ", "}
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
      {termData.reference && <Term termId={termData.reference} atRoot={false} {...baseProps} />}
      {showBindingsParentheses && "("}
      {Array.from(termData.bindings.entries()).map(([bindingKeyTermId, bindingValueTermId], index, array) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(bindingKeyTermId)}>
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
            <Term termId={bindingKeyTermId} atRoot={false} {...baseProps} />
            {" = "}
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
            {bindingValueTermId && <Term atRoot={false} termId={bindingValueTermId} {...baseProps} />}
            {index < array.length - 1 && ", "}
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
      {showEnclosingParentheses && ")"}
    </span>
  );
}

function SmallButton({ icon, label, onClick }: { icon: React.ReactNode; label: React.ReactNode; onClick(): void }) {
  const [showLabel, setShowLabel] = React.useState(false);
  return (
    <button
      css={css`
        position: relative;
        background-color: var(--background-color);
        :hover {
          background-color: var(--hover-background-color);
        }
        border: 1px solid var(--border-color-secondary);
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
                  {termIdStringSerialization.serialize(termId).slice(0, 5)} {termData.label}
                </div>
              );
            })}
          </div>
        )}
      </span>
    </React.Fragment>
  );
}
