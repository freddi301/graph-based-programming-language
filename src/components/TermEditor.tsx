import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { SourceFacadeInterface, SourceInterface } from "./Source";
import { SerializationInterface } from "./utils";

export function TermEditor<TermId, Source>({
  source,
  onSourceChange,
  sourceImplementation,
  sourceFacadeImplementation,
  termIdStringSerialization,
}: {
  source: Source;
  onSourceChange(source: Source): void;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
}) {
  const [selectedTerm, setSelectedTerm] = React.useState<TermId | null>(null);
  return (
    <div>
      {Array.from(sourceImplementation.all(source)).map(([termId, termData]) => {
        return (
          <div key={termIdStringSerialization.serialize(termId)}>
            <Term<TermId, Source>
              termId={termId}
              source={source}
              onSourceChange={onSourceChange}
              sourceFacadeImplementation={sourceFacadeImplementation}
              sourceImplementation={sourceImplementation}
              termIdStringSerialization={termIdStringSerialization}
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
            setSelectedTerm(newTermId);
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
};
function Term<TermId, Source>({
  termId,
  source,
  onSourceChange,
  sourceImplementation,
  sourceFacadeImplementation,
  termIdStringSerialization,
}: { termId: TermId } & TermBaseProps<TermId, Source>) {
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
      <SmallButton
        icon={<FontAwesomeIcon icon="minus" />}
        label="Delete term"
        onClick={() => {
          const newSource = sourceFacadeImplementation.remove(source, termId);
          onSourceChange(newSource);
        }}
      />
      {"("}
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
          width: ${labelText.length ? `${labelText.length}ch` : `${termIdStringSerialization.serialize(termId).length}ch`};
        `}
        onBlur={() => {
          updateLabel();
        }}
        onMouseEnter={() => {
          setTermIdTooltipOpen(true);
        }}
        onMouseLeave={() => {
          setTermIdTooltipOpen(false);
        }}
      />
      {" : "}
      <TermSelector
        value={termData.annotation}
        onChange={(selectedTermId) => {
          const newSource = sourceFacadeImplementation.setAnnotation(source, termId, selectedTermId);
          onSourceChange(newSource);
        }}
        source={source}
        sourceImplementation={sourceImplementation}
        termIdStringSerialization={termIdStringSerialization}
      />
      {" = "}
      {"("}
      {Array.from(termData.parameters.keys()).map((parameterTermId) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(parameterTermId)}>
            <TermSelector
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
                  sourceFacadeImplementation.removeParameter(source, termId, parameterTermId);
                }
              }}
              source={source}
              sourceImplementation={sourceImplementation}
              termIdStringSerialization={termIdStringSerialization}
            />
            {", "}
          </React.Fragment>
        );
      })}
      <TermSelector
        value={null}
        onChange={(selectedTermId) => {
          if (selectedTermId) {
            const newSource = sourceFacadeImplementation.addParameter(source, termId, selectedTermId);
            onSourceChange(newSource);
          }
        }}
        source={source}
        sourceImplementation={sourceImplementation}
        termIdStringSerialization={termIdStringSerialization}
      />
      {")"}
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
      <TermSelector
        value={termData.reference}
        onChange={(selectedTermId) => {
          const newSource = sourceFacadeImplementation.setReference(source, termId, selectedTermId);
          onSourceChange(newSource);
        }}
        source={source}
        sourceImplementation={sourceImplementation}
        termIdStringSerialization={termIdStringSerialization}
      />
      {"("}
      {Array.from(termData.bindings.entries()).map(([bindingKeyTermId, bindingValueTermId]) => {
        return (
          <React.Fragment key={termIdStringSerialization.serialize(bindingKeyTermId)}>
            <TermSelector
              value={bindingKeyTermId}
              onChange={(selectedTermId) => {
                if (selectedTermId) {
                  const newSource = sourceFacadeImplementation.setBinding(source, termId, selectedTermId, bindingValueTermId);
                  onSourceChange(newSource);
                } else {
                  sourceFacadeImplementation.removeBinding(source, termId, bindingKeyTermId);
                }
              }}
              source={source}
              sourceImplementation={sourceImplementation}
              termIdStringSerialization={termIdStringSerialization}
            />
            {" = "}
            <TermSelector
              value={bindingValueTermId}
              onChange={(selectedTermId) => {
                const newSource = sourceFacadeImplementation.setBinding(source, termId, bindingKeyTermId, selectedTermId);
                onSourceChange(newSource);
              }}
              source={source}
              sourceImplementation={sourceImplementation}
              termIdStringSerialization={termIdStringSerialization}
            />
            {", "}
          </React.Fragment>
        );
      })}
      <TermSelector
        value={null}
        onChange={(selectedTermId) => {
          if (selectedTermId) {
            const newSource = sourceFacadeImplementation.setBinding(source, termId, selectedTermId, null);
            onSourceChange(newSource);
          }
        }}
        source={source}
        sourceImplementation={sourceImplementation}
        termIdStringSerialization={termIdStringSerialization}
      />
      {")"}
      {")"}
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
        border: 1px solid var(--border-color);
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

function TermSelector<TermId, Source>({
  value,
  onChange,
  source,
  sourceImplementation,
  termIdStringSerialization,
}: {
  value: TermId | null;
  onChange(value: TermId | null): void;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
}) {
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
  return (
    <span
      ref={containerRef}
      css={css`
        display: inline-block;
        position: relative;
      `}
    >
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
            width: ${searchText.length
              ? `${searchText.length}ch`
              : value
              ? `${termIdStringSerialization.serialize(value).length}ch`
              : `1px`};
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
        />
      )}
      {!value && !isOpen && (
        <SmallButton
          icon={<FontAwesomeIcon icon="plus" />}
          label="Select term"
          onClick={() => {
            setIsOpen(true);
          }}
        />
      )}
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
                  setIsOpen(false);
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
  );
}
