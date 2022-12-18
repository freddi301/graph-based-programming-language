import { SourceFormatting, SourceStore, TermId } from "../Source";
import { Builder, getRole, Printer } from "./Formatting";
import React from "react";
import { Navigation, State } from "./State";
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
      return maxColumn;
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
    label() {
      return termData.label || termId;
    },
    annotationStart() {
      return " : ";
    },
    termStart() {
      return "(";
    },
    termEnd() {
      return ")";
    },
    rightHandSideStart() {
      return " = ";
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
    bindingAssignment() {
      return " = ";
    },
    bindingsStart() {
      return "(";
    },
    bindingsEnd() {
      return ")";
    },
    bindingSeparator() {
      return ", ";
    },
    parametersEnd() {
      return ")";
    },
    parametersSeparator() {
      return ", ";
    },
    parametersStart() {
      return "(";
    },
    termMode() {
      if (termData.mode === "match") {
        return "match ";
      }
      return "";
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
      return { content: result, width: maxColumn };
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
      return maxColumn;
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
  source,
  onStateChange,
  store,
  formatting,
}: {
  navigation: Navigation | null;
  termId: TermId;
  state: State;
  onStateChange(state: State): void;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
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
      return {
        content: (
          <span
            onClick={onClickSelectTerm}
            onMouseEnter={() => {
              onStateChange({ ...state, highlighted: termId });
            }}
            onMouseLeave={() => {
              onStateChange({ ...state, highlighted: undefined });
            }}
            className="term-label"
            css={css`
              color: ${labelColor};
              background-color: ${state.highlighted === termId ? "var(--hover-background-color)" : ""};
            `}
          >
            {print.label()}
          </span>
        ),
        width: print.label().length,
      };
    },
    annotationStart() {
      return {
        content: <span>{print.annotationStart()}</span>,
        width: print.annotationStart().length,
      };
    },
    parametersStart() {
      return {
        content: <span onClick={onClickSelectParameters}>{print.parametersStart()}</span>,
        width: print.parametersStart().length,
      };
    },
    parametersSeparator() {
      return {
        content: <span>{print.parametersSeparator()}</span>,
        width: print.parametersSeparator().length,
      };
    },
    parametersEnd() {
      return {
        content: <span onClick={onClickSelectParameters}>{print.parametersEnd()}</span>,
        width: print.parametersEnd().length,
      };
    },
    rightHandSideStart() {
      return {
        content: <span>{print.rightHandSideStart()}</span>,
        width: print.rightHandSideStart().length,
      };
    },
    termType() {
      return {
        content: <span>{print.termType()}</span>,
        width: print.termType().length,
      };
    },
    termMode() {
      return {
        content: (
          <span
            css={css`
              color: var(--text-color-keyword);
            `}
          >
            {print.termMode()}
          </span>
        ),
        width: print.termMode().length,
      };
    },
    bindingsStart() {
      return {
        content: <span onClick={onClickSelectBindings}>{print.bindingsStart()}</span>,
        width: print.bindingsStart().length,
      };
    },
    bindingAssignment() {
      return {
        content: <span>{print.bindingAssignment()}</span>,
        width: print.bindingAssignment().length,
      };
    },
    bindingSeparator() {
      return {
        content: <span>{print.bindingSeparator()}</span>,
        width: print.bindingSeparator().length,
      };
    },
    bindingsEnd() {
      return {
        content: <span onClick={onClickSelectBindings}>{print.bindingsEnd()}</span>,
        width: print.bindingsEnd().length,
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
