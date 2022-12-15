import { SourceFormattingInterface, SourceInterface, TermId } from "../Source";

export type State = {
  highlighted?: TermId;
  navigation?: Navigation;
  optionIndex?: number;
  text?: string;
};

export type Navigation =
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
export function getOptions<Source>({
  state,
  source,
  sourceImplementation,
}: {
  state: State;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
}) {
  return Array.from(sourceImplementation.all(source))
    .filter(([termId, termData]) => {
      const isSearching = Boolean(state.text);
      const matchesTermId = termId.includes(state.text?.toLowerCase() ?? "");
      const matchesTermLabel = termData.label.toLowerCase().includes(state.text?.toLowerCase() ?? "");
      if (isSearching && !(matchesTermId || matchesTermLabel)) return false;
      return true;
    })
    .map(([termId]) => termId);
}

export function getTermIdAtEditorNavigation<Source>({
  navigation,
  source,
  sourceImplementation,
  sourceFormattingImplementation,
}: {
  navigation: Navigation;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
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

export function isInline<Source>({
  termId,
  navigation,
  source,
  sourceImplementation,
  sourceFormattingImplementation,
}: {
  navigation: Navigation;
  termId: TermId;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}): boolean {
  const references = sourceFormattingImplementation.getReferences(source, termId);
  if (navigation.part === "binding" && navigation.subPart === "key" && sourceImplementation.get(source, navigation.termId).mode === "match")
    return true;
  if (navigation.part === "parameter" && references.asParameter.size === 1) return true;
  return false;
}
