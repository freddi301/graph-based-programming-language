import { SourceFormatting, SourceStore, TermId } from "../Source";

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

export const navigationEquals = (a: Navigation, b: Navigation) => {
  if (a.termId !== b.termId) return false;
  if (a.part !== b.part) return false;
  if (a.part === "parameter" && b.part === "parameter" && a.parameterIndex !== b.parameterIndex) return false;
  if (a.part === "binding" && b.part === "binding" && (a.bindingIndex !== b.bindingIndex || a.subPart !== b.subPart)) return false;
  return true;
};

// TODO sort options by
// - correct type terms
// - in scope terms
// - most recently used terms
export function getOptions<Source>({ state, source, store }: { state: State; source: Source; store: SourceStore<Source> }) {
  return Array.from(store.all(source))
    .filter(([termId, termData]) => (state.text?.trim() ? termData.label.includes(state.text) : true))
    .sort(([x, a], [y, b]) => a.label.localeCompare(b.label))
    .map(([termId]) => termId);
}

export function getTermIdAtEditorNavigation<Source>({
  navigation,
  source,
  store,
  formatting,
}: {
  navigation: Navigation;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): TermId | null {
  const termData = store.get(source, navigation.termId);
  switch (navigation.part) {
    case "annotation":
      return termData.annotation;
    case "parameter":
      return formatting.getTermParameters(source, navigation.termId).at(navigation.parameterIndex) ?? null;
    case "reference":
      return termData.reference;
    case "binding":
      switch (navigation.subPart) {
        case "key":
          return formatting.getTermBindings(source, navigation.termId).at(navigation.bindingIndex)?.key ?? null;
        case "value":
          return formatting.getTermBindings(source, navigation.termId).at(navigation.bindingIndex)?.value ?? null;
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
  store,
  formatting,
}: {
  navigation: Navigation;
  termId: TermId;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): boolean {
  const termData = store.get(source, termId);
  const references = formatting.getReferences(source, termId);
  if (formatting.isRoot(source, termId)) return false;
  if (
    references.asAnnotation.size +
      references.asParameter.size +
      references.asReference.size +
      references.asBindingKey.size +
      references.asBindingValue.size >
      0 &&
    !termData.annotation &&
    !termData.bindings.size &&
    !termData.parameters.size &&
    !termData.reference
  )
    return false;
  if (navigation.part !== "parameter" && references.asParameter.size === 1) return false;
  return true;
}
