import { SourceFormatting, SourceStore, TermId } from "../Source";
import { isInline, Navigation } from "./State";

export function format<Source, Chunk>({
  termId,
  maxWidth,
  builderFactory,
  printerFactory,
  source,
  store,
  formatting,
}: {
  termId: TermId;
  maxWidth: number;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
  printerFactory(params: {
    navigation: Navigation | null;
    termId: TermId;
    source: Source;
    store: SourceStore<Source>;
    formatting: SourceFormatting<Source>;
  }): Printer<Chunk>;
  builderFactory(): Builder<Chunk>;
}) {
  const multiline = (level: number, navigation: Navigation | null, termId: TermId, maxWidth: number, builder: Builder<Chunk>) => {
    const printer = printerFactory({ navigation, termId, source, store, formatting });
    const termData = store.get(source, termId);
    const termParameters = formatting.getTermParameters(source, termId);
    const termBindings = formatting.getTermBindings(source, termId);
    if (navigation && !isInline({ termId, navigation, source, store, formatting })) {
      builder.append(printer.label());
      return builder.result;
    }
    builder.append(printer.label());
    builder.append(printer.annotationStart());
    if (termData.annotation) {
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
    builder.append(printer.rightHandSideStart());
    builder.append(printer.parametersStart());
    if (termParameters.length > 0) {
      const inlineParameters = builderFactory();
      termParameters.forEach((parameterTermId, parameterIndex) => {
        multiline(NaN, { termId, part: "parameter", parameterIndex }, parameterTermId, Infinity, inlineParameters);
        inlineParameters.append(printer.parametersSeparator(parameterIndex));
      });
      if (builder.x() + inlineParameters.width() <= maxWidth && inlineParameters.height() === 1) {
        builder.append(inlineParameters.result());
      } else {
        builder.newLine();
        termParameters.forEach((parameterTermId, parameterIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "parameter", parameterIndex }, parameterTermId, maxWidth, builder);
          builder.append(printer.parametersSeparator(parameterIndex));
          builder.newLine();
        });
      }
    }
    builder.append(printer.parametersEnd());
    builder.append(printer.termType());
    builder.append(printer.termMode());
    builder.append(printer.referenceStart());
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
    builder.append(printer.bindingsStart());
    if (termBindings.length > 0) {
      const inlineBindings = builderFactory();
      termBindings.forEach((binding, bindingIndex) => {
        multiline(NaN, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, Infinity, inlineBindings);
        inlineBindings.append(printer.bindingAssignment(bindingIndex));
        if (binding.value)
          multiline(NaN, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, Infinity, inlineBindings);
        inlineBindings.append(printer.bindingSeparator(bindingIndex));
      });
      if (builder.x() + inlineBindings.width() <= maxWidth && termData.mode !== "match" && inlineBindings.height() === 1) {
        builder.append(inlineBindings.result());
      } else {
        builder.newLine();
        termBindings.forEach((binding, bindingIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, maxWidth, builder);
          builder.append(printer.bindingAssignment(bindingIndex));
          if (binding.value)
            multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, maxWidth, builder);
          builder.append(printer.bindingSeparator(bindingIndex));
          builder.newLine();
        });
        builder.append(printer.indentation(level));
      }
    }
    builder.append(printer.bindingsEnd());
  };
  const builder = builderFactory();
  multiline(0, null, termId, maxWidth, builder);
  return builder;
}

export type Printer<Chunk> = {
  indentation(level: number): Chunk;
  termStart(): Chunk;
  label(): Chunk;
  annotationStart(): Chunk;
  parametersStart(): Chunk;
  parametersSeparator(parameterIndex: number): Chunk;
  parametersEnd(): Chunk;
  rightHandSideStart(): Chunk;
  termType(): Chunk;
  termMode(): Chunk;
  referenceStart(): Chunk;
  bindingsStart(): Chunk;
  bindingAssignment(bindingIndex: number): Chunk;
  bindingSeparator(bindingIndex: number): Chunk;
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

type TermRole = "lambda" | "pi" | "type" | "constructor" | "binding" | "regular";

export function getRole<Source>({
  navigation,
  termId,
  source,
  store,
  formatting,
}: {
  navigation: Navigation | null;
  termId: TermId;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): TermRole {
  const termData = store.get(source, termId);
  const references = formatting.getReferences(source, termId);
  const isRoot = formatting.isRoot(source, termId);
  if (navigation?.part === "binding" && navigation.subPart === "key") return "binding";
  if (termData.type === "lambda" && termData.parameters.size > 0) return "lambda";
  if (termData.type === "pi" && termData.parameters.size > 0) return "pi";
  if (references.asAnnotation.size > 0) return "type";
  if (isRoot && termData.annotation && !termData.reference) return "constructor";
  return "regular";
}
