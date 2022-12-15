import { SourceFacadeInterface, SourceFormattingInterface, SourceInterface, TermId } from "../Source";
import { getOptions, Navigation, State } from "./State";

export function keyboardAction<Source>({
  state,
  event,
  source,
  sourceImplementation,
  sourceFacadeImplementation,
  sourceFormattingImplementation,
}: {
  state: State;
  event: React.KeyboardEvent;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
  sourceFacadeImplementation: SourceFacadeInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}): { state?: State; source?: Source } | undefined {
  const roots = sourceFormattingImplementation.getRoots(source);
  const rootIndex = (state.navigation && roots.findIndex((ti) => ti === state.navigation!.termId)) ?? -1;
  const termData = state.navigation && sourceImplementation.get(source, state.navigation.termId);
  const termParameters = state.navigation && sourceFormattingImplementation.getTermParameters(source, state.navigation.termId);
  const termBindings = state.navigation && sourceFormattingImplementation.getTermBindings(source, state.navigation.termId);
  const parentPosition =
    state.navigation &&
    getParentPosition({
      termId: state.navigation.termId,
      source,
      sourceFormattingImplementation,
      sourceImplementation,
    });

  // #region Arrow navigation
  if (!state.text) {
    const onceMore = (navigation: Navigation, event: React.KeyboardEvent) =>
      keyboardAction({
        state: { ...state, navigation },
        event,
        source,
        sourceImplementation,
        sourceFacadeImplementation,
        sourceFormattingImplementation,
      });
    const navigate = (navigation: Navigation) => ({
      state: { navigation },
    });
    if (!state.navigation && event.key === "ArrowUp" && roots.length) {
      return navigate({ termId: roots[roots.length - 1], part: "label" });
    }
    if (state.navigation?.part === "label" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "annotation" });
    }
    if (state.navigation?.part === "label" && event.key === "ArrowLeft") {
      if (!parentPosition) return navigate(state.navigation);
      return onceMore(parentPosition, event);
    }
    if (state.navigation?.part === "label" && event.key === "ArrowUp") {
      if (rootIndex === 0) return navigate(state.navigation);
      if (rootIndex >= 0) return navigate({ termId: roots[rootIndex - 1], part: "label" });
      if (parentPosition) return navigate(parentPosition);
    }
    if (state.navigation?.part === "label" && event.key === "ArrowDown") {
      if (rootIndex >= 0 && roots[0] && !state.navigation) return navigate({ termId: roots[0], part: "label" });
      if (rootIndex >= 0 && rootIndex < roots.length - 1) return navigate({ termId: roots[rootIndex + 1], part: "label" });
      if (rootIndex >= roots.length - 1) return {};
    }
    if (state.navigation?.part === "annotation" && event.key === "ArrowRight") {
      if (termParameters?.length === 0) return navigate({ termId: state.navigation.termId, part: "parameters" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: 0 });
    }
    if (state.navigation?.part === "annotation" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "annotation" && event.key === "ArrowUp" && termData?.annotation) {
      return navigate({ termId: termData.annotation, part: "label" });
    }
    if (state.navigation?.part === "parameters" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "type" });
    }
    if (state.navigation?.part === "parameters" && event.key === "ArrowLeft" && termParameters) {
      if (termParameters.length === 0) return navigate({ termId: state.navigation.termId, part: "annotation" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: termParameters.length - 1 });
    }
    if (state.navigation?.part === "parameters" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "parameters" && event.key === "ArrowDown") {
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: 0 });
    }
    if (state.navigation?.part === "parameter" && event.key === "ArrowRight" && termParameters) {
      if (state.navigation.parameterIndex >= termParameters?.length - 1)
        return navigate({ termId: state.navigation.termId, part: "parameters" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: state.navigation.parameterIndex + 1 });
    }
    if (state.navigation?.part === "parameter" && event.key === "ArrowLeft") {
      if (state.navigation.parameterIndex === 0) return navigate({ termId: state.navigation.termId, part: "annotation" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: state.navigation.parameterIndex - 1 });
    }
    if (state.navigation?.part === "parameter" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "parameters" });
    }
    if (state.navigation?.part === "parameter" && event.key === "ArrowDown" && termParameters) {
      if (termParameters[state.navigation.parameterIndex])
        return navigate({ termId: termParameters[state.navigation.parameterIndex], part: "label" });
    }
    if (state.navigation?.part === "type" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "mode" });
    }
    if (state.navigation?.part === "type" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "parameters" });
    }
    if (state.navigation?.part === "type" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "mode" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "reference" });
    }
    if (state.navigation?.part === "mode" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "type" });
    }
    if (state.navigation?.part === "mode" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "reference" && event.key === "ArrowRight") {
      if (termBindings?.length === 0) return navigate({ termId: state.navigation.termId, part: "bindings" });
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: 0, subPart: "key" });
    }
    if (state.navigation?.part === "reference" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "mode" });
    }
    if (state.navigation?.part === "reference" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "reference" && event.key === "ArrowDown") {
      if (termData?.reference) return navigate({ termId: termData.reference, part: "label" });
    }
    if (state.navigation?.part === "bindings" && event.key === "ArrowRight") {
      if (!parentPosition) return navigate(state.navigation);
      return onceMore(parentPosition, event);
    }
    if (state.navigation?.part === "bindings" && event.key === "ArrowLeft" && termBindings) {
      if (termBindings.length === 0) return navigate({ termId: state.navigation.termId, part: "reference" });
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: termBindings.length - 1, subPart: "value" });
    }
    if (state.navigation?.part === "bindings" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "bindings" && event.key === "ArrowDown") {
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: 0, subPart: "key" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "key" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: state.navigation.bindingIndex, subPart: "value" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "key" && event.key === "ArrowLeft") {
      if (state.navigation.bindingIndex === 0) return navigate({ termId: state.navigation.termId, part: "reference" });
      return navigate({
        termId: state.navigation.termId,
        part: "binding",
        bindingIndex: state.navigation.bindingIndex - 1,
        subPart: "value",
      });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "key" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "bindings" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "key" && event.key === "ArrowDown") {
      if (termBindings?.[state.navigation.bindingIndex]?.key)
        return navigate({ termId: termBindings[state.navigation.bindingIndex].key, part: "label" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "value" && event.key === "ArrowRight" && termBindings) {
      if (state.navigation.bindingIndex >= termBindings.length - 1) return navigate({ termId: state.navigation.termId, part: "bindings" });
      return navigate({
        termId: state.navigation.termId,
        part: "binding",
        bindingIndex: state.navigation.bindingIndex + 1,
        subPart: "key",
      });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "value" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: state.navigation.bindingIndex, subPart: "key" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "value" && event.key === "ArrowUp") {
      return navigate({ termId: state.navigation.termId, part: "bindings" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "value" && event.key === "ArrowDown") {
      if (termBindings?.[state.navigation.bindingIndex]?.value)
        return navigate({ termId: termBindings[state.navigation.bindingIndex].value!, part: "label" });
    }
  }
  // #endregion

  // #region Option selection
  const options = getOptions({ state, source, sourceImplementation });
  const setIndex = (index: number | undefined) => {
    return {
      state: {
        navigation: state.navigation,
        text: state.text,
        optionIndex: index,
        highlighted: index !== undefined ? options[index] : undefined,
      },
    };
  };
  if (state.text !== undefined && state.navigation && termData && termParameters && termBindings) {
    if (event.key === "ArrowDown" || event.key === "Tab") {
      if (state.optionIndex === options.length - 1) return setIndex(undefined);
      if (state.optionIndex === undefined) return setIndex(0);
      return setIndex(state.optionIndex + 1);
    }
    if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
      if (state.optionIndex === undefined) return setIndex(options.length - 1);
      if (state.optionIndex === 0) return setIndex(undefined);
      return setIndex(state.optionIndex - 1);
    }
    if (event.key === "Enter") {
      const place = (source: Source, navigation: Navigation) => {
        return { source, state: { navigation } };
      };
      if (state.optionIndex === undefined) {
        const [newSource, newTermId] = sourceFacadeImplementation.create(source);
        const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, state.text);
        switch (state.navigation.part) {
          case "annotation":
            return place(
              sourceFacadeImplementation.setAnnotation(newSourceWithLabel, state.navigation.termId, newTermId),
              state.navigation
            );
          case "parameters":
            return place(sourceFacadeImplementation.addParameter(newSourceWithLabel, state.navigation.termId, newTermId), {
              termId: state.navigation.termId,
              part: "parameter",
              parameterIndex: termParameters.length,
            });
          case "reference":
            return place(sourceFacadeImplementation.setReference(newSourceWithLabel, state.navigation.termId, newTermId), state.navigation);
          case "bindings":
            return place(sourceFacadeImplementation.setBinding(newSourceWithLabel, state.navigation.termId, newTermId, null), {
              termId: state.navigation.termId,
              part: "binding",
              bindingIndex: termBindings.length,
              subPart: "key",
            });
          case "binding": {
            switch (state.navigation.subPart) {
              case "value":
                return place(
                  sourceFacadeImplementation.setBinding(
                    newSourceWithLabel,
                    state.navigation.termId,
                    termBindings.at(state.navigation.bindingIndex)!.key,
                    newTermId
                  ),
                  {
                    termId: state.navigation.termId,
                    part: "binding",
                    bindingIndex: state.navigation.bindingIndex,
                    subPart: "value",
                  }
                );
            }
            break;
          }
        }
      }
      if (state.optionIndex !== undefined && state.optionIndex < options.length) {
        const selectedTermId = options[state.optionIndex];
        const selectOption = (source: Source, navigation: Navigation) => ({ source, state: { navigation } });
        switch (state.navigation.part) {
          case "annotation": {
            const newSource = sourceFacadeImplementation.setAnnotation(source, state.navigation.termId, selectedTermId);
            return selectOption(newSource, state.navigation);
          }
          case "parameters": {
            const newSource = sourceFacadeImplementation.addParameter(source, state.navigation.termId, selectedTermId);
            return selectOption(newSource, {
              termId: state.navigation.termId,
              part: "parameter",
              parameterIndex: termParameters.length,
            });
          }
          case "reference": {
            const newSource = sourceFacadeImplementation.setReference(source, state.navigation.termId, selectedTermId);
            return selectOption(newSource, state.navigation);
          }
          case "bindings": {
            const newSource = sourceFacadeImplementation.setBinding(source, state.navigation.termId, selectedTermId, null);
            return selectOption(newSource, {
              termId: state.navigation.termId,
              part: "binding",
              bindingIndex: termBindings.length,
              subPart: "key",
            });
          }
          case "binding": {
            switch (state.navigation.subPart) {
              case "value": {
                const newSource = sourceFacadeImplementation.setBinding(
                  source,
                  state.navigation.termId,
                  termBindings.at(state.navigation.bindingIndex)!.key,
                  selectedTermId
                );
                return selectOption(newSource, state.navigation);
              }
            }
            break;
          }
        }
      }
    }
    if (event.key === "Escape") {
      return { state: { navigation: state.navigation } };
    }
  }
  // #endregion

  // #region Shorcuts
  const references = state.navigation && sourceFormattingImplementation.getReferences(source, state.navigation.termId);

  if (!state.navigation && event.key === "Enter" && state.text) {
    const [newSource, newTermId] = sourceFacadeImplementation.create(source);
    const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSource, newTermId, state.text);
    return { source: newSourceWithLabel, state: { navigation: { termId: newTermId, part: "label" } } };
  }
  if (state.navigation?.part === "type" && event.key === "Enter") {
    const termData = sourceImplementation.get(source, state.navigation.termId);
    const newType = (() => {
      switch (termData.type) {
        case "lambda":
          return "pi";
        case "pi":
          return "lambda";
      }
    })();
    const newSource = sourceFacadeImplementation.setType(source, state.navigation.termId, newType);
    return { source: newSource };
  }
  if (state.navigation?.part === "mode" && event.key === "Enter") {
    const termData = sourceImplementation.get(source, state.navigation.termId);
    const newMode = (() => {
      switch (termData.mode) {
        case "call":
          return "match";
        case "match":
          return "call";
      }
    })();
    const newSource = sourceFacadeImplementation.setMode(source, state.navigation.termId, newMode);
    return { source: newSource };
  }
  if (event.key === "Escape") {
    return { state: {} };
  }
  const [newSourceWithTerm, newTermId] = sourceFacadeImplementation.create(source);
  const newSourceWithLabel = sourceFacadeImplementation.setLabel(newSourceWithTerm, newTermId, state.text ?? "");
  if (event.key === ":") {
    if (!state.navigation) {
      return { source: newSourceWithLabel, state: { navigation: { termId: newTermId, part: "annotation" } } };
    }
    if (state.navigation.part === "label") {
      return { state: { navigation: { termId: state.navigation.termId, part: "annotation" } } };
    }
    if (state.navigation.part === "parameters") {
      const newSourceWithPlacement = sourceFacadeImplementation.addParameter(newSourceWithLabel, state.navigation.termId, newTermId);
      return { source: newSourceWithPlacement, state: { navigation: { termId: newTermId, part: "annotation" } } };
    }
  }
  if (event.key === "(") {
    if (!state.navigation) {
      return { source: newSourceWithLabel, state: { navigation: { termId: newTermId, part: "parameters" } } };
    }
    if (state.navigation.part === "label") {
      return { state: { navigation: { termId: state.navigation.termId, part: "parameters" } } };
    }
    if (state.navigation.part === "reference") {
      return { state: { navigation: { termId: state.navigation.termId, part: "bindings" } } };
    }
    if (state.navigation.part === "bindings") {
      const newSourceWithPlacement = sourceFacadeImplementation.setBinding(newSourceWithTerm, state.navigation.termId, newTermId, null);
      return { source: newSourceWithPlacement, state: { navigation: { termId: newTermId, part: "label" } } };
    }
  }
  if (event.key === ")") {
    if (state.navigation?.part === "label" && parentPosition) {
      return { state: { navigation: parentPosition } };
    }
    if (state.navigation?.part === "parameter" || state.navigation?.part === "parameters") {
      return { state: { navigation: { termId: state.navigation.termId, part: "type" } } };
    }
    if (state.navigation?.part === "binding" || state.navigation?.part === "bindings") {
      return { state: { navigation: { termId: state.navigation.termId, part: "label" } } };
    }
  }
  if (event.key === "=") {
    if (!state.navigation) {
      return { source: newSourceWithLabel, state: { navigation: { termId: newTermId, part: "reference" } } };
    }
    if (state.navigation.part === "label") {
      return { state: { navigation: { termId: state.navigation.termId, part: "reference" } } };
    }
    if (state.navigation.part === "parameters") {
      if (state.text) {
        const newSourceWithPlacement = sourceFacadeImplementation.addParameter(newSourceWithLabel, state.navigation.termId, newTermId);
        return { source: newSourceWithPlacement, state: { navigation: { termId: state.navigation.termId, part: "reference" } } };
      } else {
        return { state: { navigation: { termId: state.navigation.termId, part: "reference" } } };
      }
    }
    if (state.navigation.part === "binding" && state.navigation.subPart === "key") {
      return {
        state: {
          navigation: {
            termId: state.navigation.termId,
            part: "binding",
            bindingIndex: state.navigation.bindingIndex,
            subPart: "value",
          },
        },
      };
    }
  }
  if (event.key === ",") {
    if (state.navigation?.part === "parameters") {
      const newSourceWithPlacement = sourceFacadeImplementation.addParameter(newSourceWithLabel, state.navigation.termId, newTermId);
      return { source: newSourceWithPlacement, state: { navigation: { termId: state.navigation.termId, part: "parameters" } } };
    }
    if (state.navigation?.part === "parameter") {
      return {
        state: {
          navigation: {
            termId: state.navigation.termId,
            part: "parameter",
            parameterIndex: state.navigation.parameterIndex + 1,
          },
        },
      };
    }
    if (state.navigation?.part === "binding" && termBindings) {
      if (state.navigation.bindingIndex === termBindings.length - 1) {
        return { state: { navigation: { termId: state.navigation.termId, part: "bindings" } } };
      } else {
        return {
          state: {
            navigation: {
              termId: state.navigation.termId,
              part: "binding",
              bindingIndex: state.navigation.bindingIndex + 1,
              subPart: "key",
            },
          },
        };
      }
    }
    if (state.navigation?.part === "annotation") {
      if (references?.asParameter.size === 1) {
        return { state: { navigation: { termId: getOne(references.asParameter), part: "parameters" } } };
      }
    }
  }
  if (event.key === "Backspace" && !state.text && state.navigation && termParameters && termBindings) {
    if (state.navigation.part === "label") {
      return {
        source: sourceFacadeImplementation.remove(source, state.navigation.termId),
        state: rootIndex >= 0 ? {} : { navigation: state.navigation },
      };
    }
    if (state.navigation.part === "annotation") {
      return {
        source: sourceFacadeImplementation.setAnnotation(source, state.navigation.termId, null),
      };
    }
    if (state.navigation.part === "parameter") {
      return {
        source: sourceFacadeImplementation.removeParameter(
          source,
          state.navigation.termId,
          termParameters.at(state.navigation.parameterIndex)!
        ),
        state: {
          navigation:
            state.navigation.parameterIndex > 0
              ? { termId: state.navigation.termId, part: "parameter", parameterIndex: state.navigation.parameterIndex - 1 }
              : { termId: state.navigation.termId, part: "parameters" },
        },
      };
    }
    if (state.navigation.part === "reference") {
      return {
        source: sourceFacadeImplementation.setReference(source, state.navigation.termId, null),
      };
    }
    if (state.navigation.part === "binding" && state.navigation.subPart === "key") {
      return {
        source: sourceFacadeImplementation.removeBinding(
          source,
          state.navigation.termId,
          termBindings.at(state.navigation.bindingIndex)!.key
        ),
        state: {
          navigation:
            state.navigation.bindingIndex > 0
              ? { termId: state.navigation.termId, part: "binding", bindingIndex: state.navigation.bindingIndex - 1, subPart: "value" }
              : { termId: state.navigation.termId, part: "bindings" },
        },
      };
    }
    if (state.navigation.part === "binding" && state.navigation.subPart === "value") {
      return {
        source: sourceFacadeImplementation.setBinding(
          source,
          state.navigation.termId,
          termBindings.at(state.navigation.bindingIndex)!.key,
          null
        ),
      };
    }
  }
  // #endregion
}

function getParentPosition<Source>({
  termId,
  source,
  sourceFormattingImplementation,
  sourceImplementation,
}: {
  termId: TermId;
  source: Source;
  sourceImplementation: SourceInterface<Source>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}): Navigation | undefined {
  const isRoot = sourceFormattingImplementation.isRoot(source, termId);
  const references = sourceFormattingImplementation.getReferences(source, termId);
  const parentTermId = ((): TermId | undefined => {
    if (references.all.size === 1) return getOne(references.all);
    if (!isRoot && references.asParameter.size === 1) return getOne(references.asParameter);
  })();
  const parentTermData = parentTermId ? sourceImplementation.get(source, parentTermId) : null;
  if (!parentTermData || !parentTermId) return;
  if (parentTermData.annotation === termId) return { termId: parentTermId, part: "annotation" };
  const parameters = sourceFormattingImplementation.getTermParameters(source, parentTermId);
  for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
    if (parameters[parameterIndex] === termId) return { termId: parentTermId, part: "parameter", parameterIndex };
  }
  if (parentTermData.reference === termId) return { termId: parentTermId, part: "reference" };
  const bindings = sourceFormattingImplementation.getTermBindings(source, parentTermId);
  for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++) {
    if (bindings[bindingIndex].key === termId) return { termId: parentTermId, part: "binding", bindingIndex, subPart: "key" };
    if (bindings[bindingIndex].value === termId) return { termId: parentTermId, part: "binding", bindingIndex, subPart: "value" };
  }
}

function getOne<T>(set: Set<T>): T {
  if (set.size !== 1) throw new Error();
  return set.keys().next().value;
}
