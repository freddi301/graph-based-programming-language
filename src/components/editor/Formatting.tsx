import { SourceFormattingInterface, SourceInterface } from "../Source";
import { isInline, Navigation } from "./State";

export function format<TermId, Source>({
  termId,
  navigation,
  ...base
}: {
  navigation: Navigation<TermId> | null;
  termId: TermId;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}): string {
  const { source, sourceImplementation, sourceFormattingImplementation } = base;
  const termData = sourceImplementation.get(source, termId);
  const termParameters = sourceFormattingImplementation.getTermParameters(source, termId);
  const termBindings = sourceFormattingImplementation.getTermBindings(source, termId);
  if (navigation && !isInline({ navigation, termId, source, sourceImplementation, sourceFormattingImplementation })) return termData.label;
  return (
    "(" +
    termData.label +
    " : " +
    (termData.annotation ? format({ termId: termData.annotation, navigation: { termId, part: "annotation" }, ...base }) : "") +
    " = " +
    "(" +
    termParameters
      .map((termId, parameterIndex) => format({ termId, navigation: { termId, part: "parameter", parameterIndex }, ...base }))
      .join(", ") +
    ")" +
    (termData.type === "lambda" ? " => " : " -> ") +
    (termData.mode === "match" ? "match " : "") +
    (termData.reference ? format({ termId: termData.reference, navigation: { termId, part: "reference" }, ...base }) : "") +
    "(" +
    termBindings
      .map(
        ({ key, value }, bindingIndex) =>
          format({ termId: key, navigation: { termId, part: "binding", bindingIndex, subPart: "key" }, ...base }) +
          " = " +
          (value ? format({ termId: value, navigation: { termId, part: "binding", bindingIndex, subPart: "value" }, ...base }) : "")
      )
      .join(", ") +
    ")" +
    ")"
  );
}
