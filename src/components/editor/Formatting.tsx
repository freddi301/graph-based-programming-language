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
    navigationPaths: Array<Navigation>;
    termId: TermId;
    source: Source;
    store: SourceStore<Source>;
    formatting: SourceFormatting<Source>;
  }): Printer<Chunk>;
  builderFactory(): Builder<Chunk>;
}) {
  const multiline = (
    level: number,
    navigation: Navigation | null,
    termId: TermId,
    maxWidth: number,
    builder: Builder<Chunk>,
    navigationPaths: Array<Navigation>,
    skipStartEnd: boolean
  ) => {
    navigationPaths = navigation ? [...navigationPaths, navigation] : navigationPaths;
    const printer = printerFactory({ navigation, termId, source, store, formatting, navigationPaths });
    const termData = store.get(source, termId);
    const termParameters = formatting.getTermParameters(source, termId);
    const termBindings = formatting.getTermBindings(source, termId);
    if (navigation && !isInline({ termId, navigation, source, store, formatting })) {
      builder.append(printer.label());
      return builder.result;
    }
    if (!skipStartEnd) builder.append(printer.termStart());
    builder.append(printer.label());
    builder.append(printer.annotationStart());
    if (termData.annotation) {
      const annotationPrinter = printerFactory({
        navigation: { termId, part: "annotation" },
        termId: termData.annotation,
        source,
        store,
        formatting,
        navigationPaths: [...navigationPaths, { termId, part: "annotation" }],
      });
      const inlineAnnotation = builderFactory();
      multiline(NaN, { termId, part: "annotation" }, termData.annotation, Infinity, inlineAnnotation, navigationPaths, false);
      if (builder.x() + inlineAnnotation.width() <= maxWidth && inlineAnnotation.height() === 1) {
        builder.append(inlineAnnotation.result());
      } else {
        builder.append(annotationPrinter.termStart());
        builder.newLine();
        builder.append(annotationPrinter.indentation(level + 1));
        multiline(level + 1, { termId, part: "annotation" }, termData.annotation, maxWidth, builder, navigationPaths, true);
        builder.newLine();
        builder.append(annotationPrinter.indentation(level));
        builder.append(annotationPrinter.termEnd());
      }
    }
    builder.append(printer.rightHandSideStart());
    builder.append(printer.parametersStart());
    if (termParameters.length > 0) {
      const inlineParameters = builderFactory();
      termParameters.forEach((parameterTermId, parameterIndex) => {
        multiline(NaN, { termId, part: "parameter", parameterIndex }, parameterTermId, Infinity, inlineParameters, navigationPaths, false);
        inlineParameters.append(printer.parametersSeparator(parameterIndex));
      });
      if (builder.x() + inlineParameters.width() <= maxWidth && inlineParameters.height() === 1) {
        builder.append(inlineParameters.result());
      } else {
        builder.newLine();
        termParameters.forEach((parameterTermId, parameterIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(level + 1, { termId, part: "parameter", parameterIndex }, parameterTermId, maxWidth, builder, navigationPaths, false);
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
      const referencePrinter = printerFactory({
        navigation: { termId, part: "reference" },
        termId: termData.reference,
        source,
        store,
        formatting,
        navigationPaths: [...navigationPaths, { termId, part: "reference" }],
      });
      const inlineReference = builderFactory();
      multiline(NaN, { termId, part: "reference" }, termData.reference, Infinity, inlineReference, navigationPaths, false);
      if (builder.x() + inlineReference.width() <= maxWidth && inlineReference.height() === 1) {
        builder.append(inlineReference.result());
      } else {
        builder.append(referencePrinter.termStart());
        builder.newLine();
        builder.append(referencePrinter.indentation(level + 1));
        multiline(level + 1, { termId, part: "reference" }, termData.reference, maxWidth, builder, navigationPaths, true);
        builder.newLine();
        builder.append(referencePrinter.indentation(level));
        builder.append(referencePrinter.termEnd());
      }
    }
    builder.append(printer.bindingsStart());
    if (termBindings.length > 0) {
      const inlineBindings = builderFactory();
      termBindings.forEach((binding, bindingIndex) => {
        multiline(
          NaN,
          { termId, part: "binding", bindingIndex, subPart: "key" },
          binding.key,
          Infinity,
          inlineBindings,
          navigationPaths,
          false
        );
        inlineBindings.append(printer.bindingAssignment(bindingIndex));
        if (binding.value)
          multiline(
            NaN,
            { termId, part: "binding", bindingIndex, subPart: "value" },
            binding.value,
            Infinity,
            inlineBindings,
            navigationPaths,
            false
          );
        inlineBindings.append(printer.bindingSeparator(bindingIndex));
      });
      if (builder.x() + inlineBindings.width() <= maxWidth && termData.mode !== "match" && inlineBindings.height() === 1) {
        builder.append(inlineBindings.result());
      } else {
        builder.newLine();
        termBindings.forEach((binding, bindingIndex) => {
          builder.append(printer.indentation(level + 1));
          multiline(
            level + 1,
            { termId, part: "binding", bindingIndex, subPart: "key" },
            binding.key,
            maxWidth,
            builder,
            navigationPaths,
            false
          );
          builder.append(printer.bindingAssignment(bindingIndex));
          if (binding.value)
            multiline(
              level + 1,
              { termId, part: "binding", bindingIndex, subPart: "value" },
              binding.value,
              maxWidth,
              builder,
              navigationPaths,
              false
            );
          builder.append(printer.bindingSeparator(bindingIndex));
          builder.newLine();
        });
        builder.append(printer.indentation(level));
      }
    }
    builder.append(printer.bindingsEnd());
    if (!skipStartEnd) builder.append(printer.termEnd());
  };
  const builder = builderFactory();
  multiline(0, null, termId, maxWidth, builder, [], true);
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
