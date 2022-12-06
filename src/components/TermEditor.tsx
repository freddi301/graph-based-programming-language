import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface } from "./Source";
import { SerializationInterface } from "./utils";

// TODO: make buttons ergonomic for click

const shortIdLength = 5;

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
              <Term<TermId, Source>
                termId={termId}
                source={source}
                onSourceChange={onSourceChange}
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
            const [newSource] = sourceFacadeImplementation.create(source);
            onSourceChange(newSource);
          }}
        />
      </div>
    </div>
  );
}

type TermBaseProps<TermId, Source> = {
  source: Source;
  onSourceChange(source: Source): void;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
};
function Term<TermId, Source>({ termId, ...baseProps }: { termId: TermId } & TermBaseProps<TermId, Source>) {
  const {
    source,
    onSourceChange,
    sourceImplementation,
    sourceFacadeImplementation,
    termIdStringSerialization,
    sourceFormattingImplementation,
  } = baseProps;
  const termData = sourceImplementation.get(source, termId);
  const [isTermIdTooltipOpen, setTermIdTooltipOpen] = React.useState(false);
  const [labelText, setLabelText] = React.useState(termData.label);
  React.useLayoutEffect(() => {
    setLabelText(termData.label);
  }, [termData.label]);
  const updateLabel = () => {
    const newSource = sourceFacadeImplementation.setLabel(source, termId, labelText);
    onSourceChange(newSource);
  };
  const [showDelete, setShowDelete] = React.useState(false);
  const showEnclosingParentheses = !sourceFormattingImplementation.isRoot(source, termId);
  return (
    <span
      css={css`
        position: relative;
      `}
    >
      {isTermIdTooltipOpen && (
        <div
          css={css`
            position: absolute;
            top: 100%;
            left: 0px;
            background-color: var(--background-color);
            color: var(--text-color-secondary);
            padding: 4px 8px;
            border: 1px solid var(--border-color);
            z-index: 1;
            user-select: none;
          `}
        >
          {termIdStringSerialization.serialize(termId)}
        </div>
      )}
      {showDelete && (
        <div
          css={css`
            position: absolute;
            bottom: 100%;
            left: calc(1ch - 10px);
          `}
          onMouseEnter={() => {
            setShowDelete(true);
          }}
          onMouseLeave={() => {
            setShowDelete(false);
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
        </div>
      )}
      {showEnclosingParentheses && "("}
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
          color: var(--text-color);
          width: ${labelText.length ? `${labelText.length}ch` : `${shortIdLength}ch`};
        `}
        onBlur={() => {
          updateLabel();
        }}
        onMouseEnter={() => {
          setTermIdTooltipOpen(true);
          setShowDelete(true);
        }}
        onMouseLeave={() => {
          setTermIdTooltipOpen(false);
          setShowDelete(false);
        }}
      />
      {termData.annotation && " : "}
      <Selector
        label="Select annotation"
        value={termData.annotation}
        onChange={(selectedTermId) => {
          const newSource = sourceFacadeImplementation.setAnnotation(source, termId, selectedTermId);
          onSourceChange(newSource);
        }}
        {...baseProps}
      />
      {(termData.parameters.size > 0 || termData.reference || termData.bindings.size > 0) && termData.label !== "" && " = "}
      {termData.parameters.size > 0 && "("}
      {Array.from(termData.parameters.keys()).map((parameterTermId, index, array) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(parameterTermId)}>
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
            {index < array.length - 1 && ", "}
          </React.Fragment>
        );
      })}
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
      {termData.parameters.size > 0 && ")"}
      {termData.parameters.size > 0 && (
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
      <Selector
        label="Select reference"
        value={termData.reference}
        onChange={(selectedTermId) => {
          const newSource = sourceFacadeImplementation.setReference(source, termId, selectedTermId);
          onSourceChange(newSource);
        }}
        {...baseProps}
      />
      {termData.bindings.size > 0 && "("}
      {Array.from(termData.bindings.entries()).map(([bindingKeyTermId, bindingValueTermId], index, array) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(bindingKeyTermId)}>
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
            {" = "}
            <Selector
              label="Select binding value"
              value={bindingValueTermId}
              onChange={(selectedTermId) => {
                const newSource = sourceFacadeImplementation.setBinding(source, termId, bindingKeyTermId, selectedTermId);
                onSourceChange(newSource);
              }}
              {...baseProps}
            />
            {index < array.length - 1 && ", "}
          </React.Fragment>
        );
      })}
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
      {termData.bindings.size > 0 && ")"}
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
  const options = Array.from(sourceImplementation.all(source)).filter(([termId, termData]) => {
    const isSearching = searchText !== "";
    const matchesTermId = termIdStringSerialization.serialize(termId).includes(searchText.toLowerCase());
    const matchesTermLabel = termData.label.toLowerCase().includes(searchText.toLowerCase());
    if (isSearching && !(matchesTermId || matchesTermLabel)) return false;
    return true;
  });
  const [showHover, setShowHover] = React.useState(false);
  return (
    <React.Fragment>
      <span
        ref={containerRef}
        css={css`
          display: inline-block;
          position: relative;
        `}
      >
        {value && showHover && (
          <div
            css={css`
              position: absolute;
              bottom: 100%;
              left: calc(50% - 10px);
            `}
            onMouseEnter={() => {
              setShowHover(true);
            }}
            onMouseLeave={() => {
              setShowHover(false);
            }}
          >
            <SmallButton
              icon={<FontAwesomeIcon icon="minus" />}
              label="Remove term"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
            />
          </div>
        )}
        {(value || isOpen) && (
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
            autoFocus={isOpen}
            onKeyDown={(event) => {
              switch (event.key) {
                case "ArrowDown": {
                  event.preventDefault();
                  if (optionIndex === options.length - 1) setOptionIndex(null);
                  else if (optionIndex === null) setOptionIndex(0);
                  else setOptionIndex(optionIndex + 1);
                  break;
                }
                case "ArrowUp": {
                  event.preventDefault();
                  if (optionIndex === null) setOptionIndex(options.length - 1);
                  else if (optionIndex === 0) setOptionIndex(null);
                  else setOptionIndex(optionIndex - 1);
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
            onMouseEnter={() => {
              setShowHover(true);
            }}
            onMouseLeave={() => {
              setShowHover(false);
            }}
            onBlur={() => {
              setSearchText(termData?.label ?? "");
            }}
          />
        )}
        {!value && !isOpen && (
          <React.Fragment>
            <span
              onMouseEnter={() => {
                setShowHover(true);
              }}
              onMouseLeave={() => {
                setShowHover(false);
              }}
            >
              {" "}
            </span>
            {showHover && (
              <div
                css={css`
                  position: absolute;
                  bottom: 100%;
                  left: calc(50% - 10px);
                `}
                onMouseEnter={() => {
                  setShowHover(true);
                }}
                onMouseLeave={() => {
                  setShowHover(false);
                }}
              >
                <SmallButton
                  icon={<FontAwesomeIcon icon="plus" />}
                  label={label}
                  onClick={() => {
                    setIsOpen(true);
                  }}
                />
              </div>
            )}
          </React.Fragment>
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
                    setShowHover(false);
                  }}
                  css={css`
                    background-color: ${index === optionIndex ? "var(--hover-background-color)" : ""};
                    :hover {
                      background-color: var(--hover-background-color);
                      user-select: none;
                    }
                  `}
                >
                  {termIdStringSerialization.serialize(termId).slice(0, 5)} {termData.label}
                </div>
              );
            })}
          </div>
        )}
      </span>
      {value && !sourceFormattingImplementation.isRoot(source, value) && <Term termId={value} {...baseProps} />}
    </React.Fragment>
  );
}
