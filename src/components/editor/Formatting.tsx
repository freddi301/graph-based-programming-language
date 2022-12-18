import { SourceFormatting, SourceStore, TermId } from "../Source";
import { isInline, Navigation } from "./State";

export function format<Source, Chunk>({
  rootId,
  maxWidth,
  builderFactory,
  printerFactory,
  source,
  store,
  formatting,
}: {
  rootId: TermId;
  maxWidth: number;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
  printerFactory(params: {
    termId: TermId;
    source: Source;
    store: SourceStore<Source>;
    formatting: SourceFormatting<Source>;
  }): Printer<Chunk>;
  builderFactory(): Builder<Chunk>;
}) {
  const multiline = (level: number, navigation: Navigation | null, termId: TermId, maxWidth: number, builder: Builder<Chunk>) => {
    const printer = printerFactory({ termId, source, store, formatting });
    const termData = store.get(source, termId);
    const termParameters = formatting.getTermParameters(source, termId);
    const termBindings = formatting.getTermBindings(source, termId);
    if (navigation && !isInline({ termId, navigation, source, store, formatting })) {
      builder.append(printer.label());
      return builder.result;
    }
    if (termData.label) {
      builder.append(printer.label());
    }
    if (termData.annotation) {
      builder.append(printer.annotationStart());
      const inlineAnnotation = builderFactory();
      multiline(NaN, { termId, part: "annotation" }, termData.annotation, Infinity, inlineAnnotation);
      if (builder.column() + inlineAnnotation.size().columns <= maxWidth) {
        builder.append(inlineAnnotation.result());
      } else {
        builder.append(printer.termStart());
        builder.append(printer.newLine());
        builder.append(printer.indentation(level + 1));
        multiline(level + 1, { termId, part: "annotation" }, termData.annotation, maxWidth, builder);
        builder.append(printer.newLine());
        builder.append(printer.indentation(level));
        builder.append(printer.termEnd());
      }
    }
    if (termData.label && (termParameters.length > 0 || termData.reference || termBindings.length > 0)) {
      builder.append(printer.rightHandSideStart());
    }
    if (termParameters.length > 0) {
      builder.append(printer.termStart());
      const inlineParameters = builderFactory();
      termParameters.forEach((parameterTermId, parameterIndex) => {
        multiline(NaN, { termId, part: "parameter", parameterIndex }, parameterTermId, Infinity, inlineParameters);
        if (parameterIndex < termParameters.length - 1) inlineParameters.append(printer.parametersSeparator());
      });
      if (builder.column() + inlineParameters.size().columns <= maxWidth) {
        builder.append(inlineParameters.result());
        builder.append(printer.parametersEnd());
      } else {
        builder.append(printer.newLine());
        termParameters.forEach((parameterTermId, parameterIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "parameter", parameterIndex }, parameterTermId, maxWidth, builder);
          builder.append(printer.parametersSeparator());
          if (parameterIndex < termParameters.length - 1) builder.append(printer.newLine());
        });
        builder.append(printer.parametersEnd());
      }
    }
    if (termParameters.length > 0) {
      builder.append(printer.termType());
    }
    if (termData.mode === "match") {
      builder.append(printer.termMode());
    }
    if (termData.reference) {
      const inlineReference = builderFactory();
      multiline(NaN, { termId, part: "reference" }, termData.reference, Infinity, inlineReference);
      if (builder.column() + inlineReference.size().columns <= maxWidth) {
        builder.append(inlineReference.result());
      } else {
        builder.append(printer.termStart());
        builder.append(printer.newLine());
        builder.append(printer.indentation(level + 1));
        multiline(level + 1, { termId, part: "reference" }, termData.reference, maxWidth, builder);
        builder.append(printer.newLine());
        builder.append(printer.indentation(level));
        builder.append(printer.termEnd());
      }
    }
    if (termBindings.length > 0) {
      builder.append(printer.bindingsStart());
      const inlineBindings = builderFactory();
      termBindings.forEach((binding, bindingIndex) => {
        multiline(NaN, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, Infinity, inlineBindings);
        inlineBindings.append(printer.bindingAssignment());
        if (binding.value)
          multiline(NaN, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, Infinity, inlineBindings);
        if (bindingIndex < termBindings.length - 1) inlineBindings.append(printer.bindingSeparator());
      });
      if (builder.column() + inlineBindings.size().columns <= maxWidth && termData.mode !== "match") {
        builder.append(inlineBindings.result());
        builder.append(printer.bindingsEnd());
      } else {
        builder.append(printer.newLine());
        termBindings.forEach((binding, bindingIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, maxWidth, builder);
          builder.append(printer.bindingAssignment());
          if (binding.value)
            multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, maxWidth, builder);
          if (bindingIndex < termBindings.length - 1) builder.append(printer.bindingSeparator());
          builder.append(printer.newLine());
        });
        builder.append(printer.termEnd());
      }
    }
  };
  const builder = builderFactory();
  multiline(0, null, rootId, maxWidth, builder);
  return builder;
}

type Printer<Chunk> = {
  newLine(): Chunk;
  indentation(level: number): Chunk;
  termStart(): Chunk;
  label(): Chunk;
  annotationStart(): Chunk;
  parametersStart(): Chunk;
  parametersSeparator(): Chunk;
  parametersEnd(): Chunk;
  rightHandSideStart(): Chunk;
  termType(): Chunk;
  termMode(): Chunk;
  bindingsStart(): Chunk;
  bindingAssignment(): Chunk;
  bindingSeparator(): Chunk;
  bindingsEnd(): Chunk;
  termEnd(): Chunk;
};

type Builder<Chunk> = {
  result(): Chunk;
  line(): number;
  column(): number;
  append(chunk: Chunk): void;
  size(): { lines: number; columns: number };
};

export function stringBuilderFactory(): Builder<string> {
  let result = "";
  let line = 0;
  let column = 0;
  let maxColumn = 0;
  return {
    result() {
      return result;
    },
    line() {
      return line;
    },
    column() {
      return column;
    },
    append(chunk: string) {
      const lines = chunk.split("\n");
      if (lines.length === 1) {
        result += chunk;
        column += chunk.length;
      } else {
        result += chunk;
        line = lines.length - 1;
        column = lines.at(-1)!.length;
        maxColumn = Math.max(column + lines.at(0)!.length, ...lines.map((line) => line.length));
      }
    },
    size() {
      return {
        lines: line + 1,
        columns: maxColumn,
      };
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
    newLine() {
      return "\n";
    },
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
