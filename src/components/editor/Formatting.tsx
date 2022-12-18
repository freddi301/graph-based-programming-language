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
      if (builder.x() + inlineAnnotation.width() <= maxWidth && inlineAnnotation.height() === 1) {
        builder.append(inlineAnnotation.result());
      } else {
        builder.append(printer.termStart());
        builder.newLine();
        builder.append(printer.indentation(level + 1));
        multiline(level + 1, { termId, part: "annotation" }, termData.annotation, maxWidth, builder);
        builder.newLine();
        builder.append(printer.indentation(level));
        builder.append(printer.termEnd());
      }
    }
    if (termData.label && (termParameters.length > 0 || termData.reference || termBindings.length > 0)) {
      builder.append(printer.rightHandSideStart());
    }
    if (termParameters.length > 0) {
      const inlineParameters = builderFactory();
      termParameters.forEach((parameterTermId, parameterIndex) => {
        multiline(NaN, { termId, part: "parameter", parameterIndex }, parameterTermId, Infinity, inlineParameters);
        if (parameterIndex < termParameters.length - 1) inlineParameters.append(printer.parametersSeparator());
      });
      builder.append(printer.termStart());
      if (builder.x() + inlineParameters.width() <= maxWidth && inlineParameters.height() === 1) {
        builder.append(inlineParameters.result());
        builder.append(printer.parametersEnd());
      } else {
        builder.newLine();
        termParameters.forEach((parameterTermId, parameterIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "parameter", parameterIndex }, parameterTermId, maxWidth, builder);
          if (parameterIndex < termParameters.length - 1) builder.append(printer.parametersSeparator());
          builder.newLine();
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
      if (builder.x() + inlineReference.width() <= maxWidth && inlineReference.height() === 1) {
        builder.append(inlineReference.result());
      } else {
        builder.append(printer.termStart());
        builder.newLine();
        builder.append(printer.indentation(level + 1));
        multiline(level + 1, { termId, part: "reference" }, termData.reference, maxWidth, builder);
        builder.newLine();
        builder.append(printer.indentation(level));
        builder.append(printer.termEnd());
      }
    }
    if (termBindings.length > 0) {
      const inlineBindings = builderFactory();
      termBindings.forEach((binding, bindingIndex) => {
        multiline(NaN, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, Infinity, inlineBindings);
        inlineBindings.append(printer.bindingAssignment());
        if (binding.value)
          multiline(NaN, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, Infinity, inlineBindings);
        if (bindingIndex < termBindings.length - 1) inlineBindings.append(printer.bindingSeparator());
      });
      builder.append(printer.bindingsStart());
      if (builder.x() + inlineBindings.width() <= maxWidth && termData.mode !== "match" && inlineBindings.height() === 1) {
        builder.append(inlineBindings.result());
        builder.append(printer.bindingsEnd());
      } else {
        builder.newLine();
        termBindings.forEach((binding, bindingIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, maxWidth, builder);
          builder.append(printer.bindingAssignment());
          if (binding.value)
            multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, maxWidth, builder);
          if (bindingIndex < termBindings.length - 1) builder.append(printer.bindingSeparator());
          builder.newLine();
        });
        builder.append(printer.indentation(level));
        builder.append(printer.termEnd());
      }
    }
  };
  const builder = builderFactory();
  multiline(0, null, rootId, maxWidth, builder);
  return builder;
}

export type Printer<Chunk> = {
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

export type Builder<Chunk> = {
  y(): number;
  x(): number;
  append(chunk: Chunk): void;
  newLine(): void;
  width(): number;
  height(): number;
  result(): Chunk;
};
