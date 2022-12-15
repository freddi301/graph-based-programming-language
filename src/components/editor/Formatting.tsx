import { SourceFormattingInterface, SourceInterface, TermId } from "../Source";
import { isInline, Navigation } from "./State";

const indentation = "  ";

export function format<Source>({
  termId,
  navigation,
  level,
  maxWidth,
  ...base
}: {
  level: number;
  maxWidth: number;
  navigation: Navigation | null;
  termId: TermId;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}): string {
  const { source, sourceImplementation, sourceFormattingImplementation } = base;
  const termData = sourceImplementation.get(source, termId);
  const termParameters = sourceFormattingImplementation.getTermParameters(source, termId);
  const termBindings = sourceFormattingImplementation.getTermBindings(source, termId);
  const indent = (level: number) => indentation.repeat(level);
  if (navigation && !isInline({ navigation, termId, source, sourceImplementation, sourceFormattingImplementation }))
    return indent(level) + termData.label;
  const inLineVersion =
    indent(level) +
    termData.label +
    " : " +
    (termData.annotation
      ? format({ level: 0, maxWidth, termId: termData.annotation, navigation: { termId, part: "annotation" }, ...base })
      : "") +
    " = " +
    "(" +
    termParameters
      .map((termId, parameterIndex) =>
        format({ level: 0, maxWidth, termId, navigation: { termId, part: "parameter", parameterIndex }, ...base })
      )
      .join(", ") +
    ")" +
    (termData.type === "lambda" ? " => " : " -> ") +
    (termData.mode === "match" ? "match " : "") +
    (termData.reference
      ? format({ level: 0, maxWidth, termId: termData.reference, navigation: { termId, part: "reference" }, ...base })
      : "") +
    "(" +
    termBindings
      .map(
        ({ key, value }, bindingIndex) =>
          format({ level: 0, maxWidth, termId: key, navigation: { termId, part: "binding", bindingIndex, subPart: "key" }, ...base }) +
          " = " +
          (value
            ? format({
                level: 0,
                maxWidth,
                termId: value,
                navigation: { termId, part: "binding", bindingIndex, subPart: "value" },
                ...base,
              })
            : "")
      )
      .join(", ") +
    ")";
  if (inLineVersion.length <= maxWidth) return inLineVersion;
  return (
    indent(level) +
    termData.label +
    " : " +
    "(\n" +
    indent(level) +
    (termData.annotation
      ? format({
          level: level + 1,
          maxWidth: maxWidth - indentation.length,
          termId: termData.annotation,
          navigation: { termId, part: "annotation" },
          ...base,
        })
      : "") +
    "\n" +
    indent(level) +
    ")" +
    " = " +
    "(" +
    "\n" +
    termParameters
      .map((termId, parameterIndex) =>
        format({
          level: level + 1,
          maxWidth: maxWidth - indentation.length,
          termId,
          navigation: { termId, part: "parameter", parameterIndex },
          ...base,
        })
      )
      .join(", \n") +
    "\n" +
    indent(level) +
    ")" +
    (termData.type === "lambda" ? " => " : " -> ") +
    (termData.mode === "match" ? "match " : "") +
    "(" +
    "\n" +
    (termData.reference
      ? format({
          level: level + 1,
          maxWidth: maxWidth - indentation.length,
          termId: termData.reference,
          navigation: { termId, part: "reference" },
          ...base,
        })
      : "") +
    "\n" +
    indent(level) +
    ")" +
    "(" +
    "\n" +
    termBindings
      .map(
        ({ key, value }, bindingIndex) =>
          indent(level + 1) +
          "(" +
          "\n" +
          format({
            level: level + 2,
            maxWidth: maxWidth - indentation.length,
            termId: key,
            navigation: { termId, part: "binding", bindingIndex, subPart: "key" },
            ...base,
          }) +
          "\n" +
          indent(level + 1) +
          ")" +
          " = " +
          "(" +
          "\n" +
          (value
            ? format({
                level: level + 2,
                maxWidth: maxWidth - indentation.length,
                termId: value,
                navigation: { termId, part: "binding", bindingIndex, subPart: "value" },
                ...base,
              })
            : "") +
          "\n" +
          indent(level + 1) +
          ")"
      )
      .join(", \n") +
    "\n" +
    indent(level) +
    ")"
  );
}
