import { SourceFormattingInterface, SourceInterface, TermId } from "../Source";
import { isInline, Navigation } from "./State";

const indentation = "  ";

export function format<Source>({
  rootId,
  maxWidth,
  source,
  sourceImplementation,
  sourceFormattingImplementation,
}: {
  rootId: TermId;
  maxWidth: number;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}) {
  const inline = (navigation: Navigation | null, termId: TermId): string => {
    return multiline(0, navigation, termId, Infinity, new StringBuilder());
  };
  const multiline = (level: number, navigation: Navigation | null, termId: TermId, maxWidth: number, builder: StringBuilder) => {
    const termData = sourceImplementation.get(source, termId);
    const termParameters = sourceFormattingImplementation.getTermParameters(source, termId);
    const termBindings = sourceFormattingImplementation.getTermBindings(source, termId);
    const newline = () => {
      builder.append("\n");
      builder.append(indentation.repeat(level));
    };
    if (navigation && !isInline({ termId, navigation, source, sourceImplementation, sourceFormattingImplementation })) {
      builder.append(termData.label);
      return builder.result;
    }
    if (termData.label) {
      builder.append(termData.label);
    }
    if (termData.annotation) {
      builder.append(" : ");
      const inlineAnnotation = inline({ termId, part: "annotation" }, termData.annotation);
      if (builder.column + inlineAnnotation.length <= maxWidth) {
        builder.append(inlineAnnotation);
      } else {
        builder.append("(");
        newline();
        builder.append(indentation);
        multiline(level + 1, { termId, part: "annotation" }, termData.annotation, maxWidth, builder);
        newline();
        builder.append(")");
      }
    }
    if (termData.label && (termParameters.length > 0 || termData.reference || termBindings.length > 0)) {
      builder.append(" = ");
    }
    if (termParameters.length > 0) {
      builder.append("(");
      const inlineParameters = termParameters
        .map((parameterTermId, parameterIndex) => inline({ termId, part: "parameter", parameterIndex }, parameterTermId))
        .join(", ");
      if (builder.column + inlineParameters.length <= maxWidth) {
        builder.append(inlineParameters);
        builder.append(")");
      } else {
        newline();
        termParameters.forEach((parameterTermId, parameterIndex) => {
          builder.append(indentation);
          multiline(level + 1, { termId, part: "parameter", parameterIndex }, parameterTermId, maxWidth, builder);
          builder.append(",");
          newline();
        });
        builder.append(")");
      }
    }
    if (termParameters.length > 0) {
      switch (termData.type) {
        case "lambda":
          builder.append(" => ");
          break;
        case "pi":
          builder.append(" -> ");
          break;
      }
    }
    if (termData.mode === "match") {
      builder.append("match ");
      if (maxWidth === Infinity) builder.append(" ".repeat(1000));
    }
    if (termData.reference) {
      const inlineReference = inline({ termId, part: "reference" }, termData.reference);
      if (builder.column + inlineReference.length <= maxWidth) {
        builder.append(inlineReference);
      } else {
        builder.append("(");
        newline();
        builder.append(indentation);
        multiline(level + 1, { termId, part: "reference" }, termData.reference, maxWidth, builder);
        newline();
        builder.append(")");
      }
    }
    if (termBindings.length > 0) {
      builder.append("(");
      const inlineBindings = termBindings
        .map(
          (binding, bindingIndex) =>
            inline({ termId, part: "binding", bindingIndex, subPart: "key" }, binding.key) +
            " = " +
            (binding.value ? inline({ termId, part: "binding", bindingIndex, subPart: "value" }, binding.value) : "")
        )
        .join(", ");
      if (builder.column + inlineBindings.length <= maxWidth && termData.mode !== "match") {
        builder.append(inlineBindings);
        builder.append(")");
      } else {
        newline();
        termBindings.forEach((binding, bindingIndex) => {
          builder.append(indentation);
          multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "key" }, binding.key, maxWidth, builder);
          builder.append(" = ");
          if (binding.value)
            multiline(level + 1, { termId, part: "binding", bindingIndex, subPart: "value" }, binding.value, maxWidth, builder);
          builder.append(",");
          newline();
        });
        builder.append(")");
      }
    }
    return builder.result;
  };
  return multiline(0, null, rootId, maxWidth, new StringBuilder());
}

class StringBuilder {
  result = "";
  line = 0;
  column = 0;
  append(string: string) {
    const lines = string.split("\n");
    if (lines.length === 1) {
      this.result += string;
      this.column += string.length;
    } else {
      this.result += string;
      this.line = lines.length - 1;
      this.column = lines.at(-1)!.length;
    }
  }
}
