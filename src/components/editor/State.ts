import { SourceFormattingInterface, SourceInterface } from "../Source";
import { SerializationInterface } from "../utils";

export type State<TermId> = {
  highlighted?: TermId;
  navigation?: Navigation<TermId>;
  optionIndex?: number;
  text?: string;
};

export type Navigation<TermId> =
  | {
      termId: TermId;
      part: "label";
    }
  | {
      termId: TermId;
      part: "annotation";
    }
  | {
      termId: TermId;
      part: "parameters";
    }
  | {
      termId: TermId;
      part: "parameter";
      parameterIndex: number;
    }
  | {
      termId: TermId;
      part: "type";
    }
  | {
      termId: TermId;
      part: "mode";
    }
  | {
      termId: TermId;
      part: "reference";
    }
  | {
      termId: TermId;
      part: "bindings";
    }
  | {
      termId: TermId;
      part: "binding";
      bindingIndex: number;
      subPart: "key";
    }
  | {
      termId: TermId;
      part: "binding";
      bindingIndex: number;
      subPart: "value";
    };

// TODO sort options by
// - correct type terms
// - in scope terms
// - most recently used terms
export function getOptions<TermId, Source>({
  state,
  source,
  sourceImplementation,
  termIdStringSerialization,
}: {
  state: State<TermId>;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
}) {
  return Array.from(sourceImplementation.all(source))
    .filter(([termId, termData]) => {
      const isSearching = Boolean(state.text);
      const matchesTermId = termIdStringSerialization.serialize(termId).includes(state.text?.toLowerCase() ?? "");
      const matchesTermLabel = termData.label.toLowerCase().includes(state.text?.toLowerCase() ?? "");
      if (isSearching && !(matchesTermId || matchesTermLabel)) return false;
      return true;
    })
    .map(([termId]) => termId);
}

export function getTermIdAtEditorNavigation<TermId, Source>({
  navigation,
  source,
  sourceImplementation,
  sourceFormattingImplementation,
}: {
  navigation: Navigation<TermId>;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}): TermId | null {
  const termData = sourceImplementation.get(source, navigation.termId);
  switch (navigation.part) {
    case "annotation":
      return termData.annotation;
    case "parameter":
      return sourceFormattingImplementation.getTermParameters(source, navigation.termId).at(navigation.parameterIndex) ?? null;
    case "reference":
      return termData.reference;
    case "binding":
      switch (navigation.subPart) {
        case "key":
          return sourceFormattingImplementation.getTermBindings(source, navigation.termId).at(navigation.bindingIndex)?.key ?? null;
        case "value":
          return sourceFormattingImplementation.getTermBindings(source, navigation.termId).at(navigation.bindingIndex)?.value ?? null;
      }
      break;
    default:
      return null;
  }
}

export function isInline<TermId, Source>({
  termId,
  navigation,
  source,
  sourceImplementation,
  sourceFormattingImplementation,
}: {
  navigation: Navigation<TermId>;
  termId: TermId;
  source: Source;
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
}): boolean {
  const references = sourceFormattingImplementation.getReferences(source, termId);
  if (navigation.part === "binding" && navigation.subPart === "key" && sourceImplementation.get(source, navigation.termId).mode === "match")
    return true;
  if (navigation.part === "parameter" && references.asParameter.size === 1) return true;
  return false;
}
