import { SourceFormatting, SourceStore, TermId } from "../Source";
import { Builder, Printer } from "./Formatting";
import React from "react";

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
      return termData.label;
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
  termId,
  source,
  store,
  formatting,
}: {
  termId: TermId;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): Printer<{ content: React.ReactNode; width: number }> {
  const termData = store.get(source, termId);
  const termParameters = formatting.getTermParameters(source, termId);
  const termBindings = formatting.getTermBindings(source, termId);
  const print = stringPrinterFactory({ termId, source, store, formatting });
  return {
    indentation(level) {
      return {
        content: <span>{print.indentation(level)}</span>,
        width: print.indentation(level).length,
      };
    },
    termStart() {
      return {
        content: <span>{print.termStart()}</span>,
        width: print.termStart().length,
      };
    },
    label() {
      return {
        content: <span>{print.label()}</span>,
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
        content: <span>{print.parametersStart()}</span>,
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
        content: <span>{print.parametersEnd()}</span>,
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
        content: <span>{print.termMode()}</span>,
        width: print.termMode().length,
      };
    },
    bindingsStart() {
      return {
        content: <span>{print.bindingsStart()}</span>,
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
        content: <span>{print.bindingsEnd()}</span>,
        width: print.bindingsEnd().length,
      };
    },
    termEnd() {
      return {
        content: <span>{print.termEnd()}</span>,
        width: print.termEnd().length,
      };
    },
  };
}
