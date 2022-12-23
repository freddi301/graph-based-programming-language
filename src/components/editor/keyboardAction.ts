import { SourceInsert, SourceFormatting, SourceStore, TermId } from "../Source";
import { getOptions, isInline, Navigation, State } from "./State";

export function keyboardAction<Source>({
  state,
  event,
  source,
  store,
  insert,
  formatting,
}: {
  state: State;
  event: { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean };
  source: Source;
  store: SourceStore<Source>;
  insert: SourceInsert<Source>;
  formatting: SourceFormatting<Source>;
}): { state?: State; source?: Source } | undefined {
  const roots = formatting.getRoots(source);
  const rootIndex = (state.navigation && roots.findIndex((ti) => ti === state.navigation!.termId)) ?? -1;
  const termData = state.navigation && store.get(source, state.navigation.termId);
  const termParameters = state.navigation && formatting.getTermParameters(source, state.navigation.termId);
  const termBindings = state.navigation && formatting.getTermBindings(source, state.navigation.termId);
  const parentPosition =
    state.navigation &&
    getParentPosition({
      termId: state.navigation.termId,
      source,
      formatting,
      store,
    });

  // #region Arrow navigation
  if (!state.text) {
    const onceMore = (navigation: Navigation, event: { key: string; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }) =>
      keyboardAction({
        state: { ...state, navigation },
        event,
        source,
        store,
        insert,
        formatting,
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
      return navigate(parentPosition);
    }
    if (state.navigation?.part === "label" && event.key === "ArrowUp" && !event.altKey) {
      if (rootIndex === 0) return navigate(state.navigation);
      if (rootIndex >= 0) return navigate({ termId: roots[rootIndex - 1], part: "label" });
      if (parentPosition) return navigate(parentPosition);
    }
    if (state.navigation?.part === "label" && event.key === "ArrowDown" && !event.altKey) {
      if (rootIndex >= 0 && roots[0] && !state.navigation) return navigate({ termId: roots[0], part: "label" });
      if (rootIndex >= 0 && rootIndex < roots.length - 1) return navigate({ termId: roots[rootIndex + 1], part: "label" });
      if (rootIndex >= roots.length - 1) return { state: {} };
    }
    if (state.navigation?.part === "annotation" && event.key === "ArrowRight") {
      if (
        !event.ctrlKey &&
        termData?.annotation &&
        isInline({ navigation: state.navigation, termId: termData.annotation, source, store, formatting })
      ) {
        return navigate({ termId: termData.annotation, part: "label" });
      }
      if (termParameters?.length === 0) return navigate({ termId: state.navigation.termId, part: "parameters" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: 0 });
    }
    if (state.navigation?.part === "annotation" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "label" });
    }
    if (state.navigation?.part === "parameters" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "type" });
    }
    if (state.navigation?.part === "parameters" && event.key === "ArrowLeft" && termParameters) {
      if (termParameters.length === 0) return navigate({ termId: state.navigation.termId, part: "annotation" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: termParameters.length - 1 });
    }
    if (state.navigation?.part === "parameter" && event.key === "ArrowRight" && termParameters) {
      if (
        !event.ctrlKey &&
        isInline({ navigation: state.navigation, termId: termParameters.at(state.navigation.parameterIndex)!, source, store, formatting })
      ) {
        return navigate({ termId: termParameters.at(state.navigation.parameterIndex)!, part: "label" });
      }
      if (state.navigation.parameterIndex >= termParameters?.length - 1) {
        return navigate({ termId: state.navigation.termId, part: "parameters" });
      }
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: state.navigation.parameterIndex + 1 });
    }
    if (state.navigation?.part === "parameter" && event.key === "ArrowLeft") {
      if (state.navigation.parameterIndex === 0) return navigate({ termId: state.navigation.termId, part: "annotation" });
      return navigate({ termId: state.navigation.termId, part: "parameter", parameterIndex: state.navigation.parameterIndex - 1 });
    }
    if (state.navigation?.part === "type" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "mode" });
    }
    if (state.navigation?.part === "type" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "parameters" });
    }
    if (state.navigation?.part === "mode" && event.key === "ArrowRight") {
      return navigate({ termId: state.navigation.termId, part: "reference" });
    }
    if (state.navigation?.part === "mode" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "type" });
    }
    if (state.navigation?.part === "reference" && event.key === "ArrowRight") {
      if (
        !event.ctrlKey &&
        termData?.reference &&
        isInline({ navigation: state.navigation, termId: termData.reference, source, store, formatting })
      ) {
        return navigate({ termId: termData.reference, part: "label" });
      }
      if (termBindings?.length === 0) return navigate({ termId: state.navigation.termId, part: "bindings" });
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: 0, subPart: "key" });
    }
    if (state.navigation?.part === "reference" && event.key === "ArrowLeft") {
      return navigate({ termId: state.navigation.termId, part: "mode" });
    }
    if (state.navigation?.part === "bindings" && event.key === "ArrowRight") {
      if (!parentPosition) return navigate(state.navigation);
      return onceMore(parentPosition, { key: "ArrowRight", ctrlKey: true });
    }
    if (state.navigation?.part === "bindings" && event.key === "ArrowLeft" && termBindings) {
      if (termBindings.length === 0) return navigate({ termId: state.navigation.termId, part: "reference" });
      return navigate({ termId: state.navigation.termId, part: "binding", bindingIndex: termBindings.length - 1, subPart: "value" });
    }
    if (state.navigation?.part === "binding" && state.navigation.subPart === "key" && event.key === "ArrowRight") {
      if (
        !event.ctrlKey &&
        termBindings &&
        isInline({ navigation: state.navigation, termId: termBindings[state.navigation.bindingIndex].key, source, store, formatting })
      ) {
        return navigate({ termId: termBindings[state.navigation.bindingIndex].key, part: "label" });
      }
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
    if (state.navigation?.part === "binding" && state.navigation.subPart === "value" && event.key === "ArrowRight" && termBindings) {
      if (
        !event.ctrlKey &&
        termBindings &&
        termBindings[state.navigation.bindingIndex].value &&
        isInline({ navigation: state.navigation, termId: termBindings[state.navigation.bindingIndex].value!, source, store, formatting })
      ) {
        return navigate({ termId: termBindings[state.navigation.bindingIndex].value!, part: "label" });
      }
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
  }
  // #endregion

  // #region ordering
  if (event.key === "ArrowUp" && event.altKey && rootIndex >= 0 && state.navigation) {
    const ordering = store.getOrdering(source);
    const currentOrdering = formatting.getOrdering(source, state.navigation.termId);
    const newOrdering = [...ordering];
    if (currentOrdering !== undefined && currentOrdering > 0) {
      newOrdering[currentOrdering] = ordering[currentOrdering - 1];
      newOrdering[currentOrdering - 1] = ordering[currentOrdering];
    }
    return { source: store.setOrdering(source, newOrdering) };
  }
  if (event.key === "ArrowDown" && event.altKey && rootIndex >= 0 && state.navigation) {
    const ordering = store.getOrdering(source);
    const currentOrdering = formatting.getOrdering(source, state.navigation.termId);
    const newOrdering = [...ordering];
    if (currentOrdering !== undefined && currentOrdering < roots.length - 1) {
      newOrdering[currentOrdering] = ordering[currentOrdering + 1];
      newOrdering[currentOrdering + 1] = ordering[currentOrdering];
    }
    return { source: store.setOrdering(source, newOrdering) };
  }
  // #endregion

  // #region Option selection
  const options = getOptions({ state, source, store });
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
    if (event.key === "ArrowDown") {
      if (state.optionIndex === options.length - 1) return setIndex(undefined);
      if (state.optionIndex === undefined) return setIndex(0);
      return setIndex(state.optionIndex + 1);
    }
    if (event.key === "ArrowUp") {
      if (state.optionIndex === undefined) return setIndex(options.length - 1);
      if (state.optionIndex === 0) return setIndex(undefined);
      return setIndex(state.optionIndex - 1);
    }
    if (event.key === "Enter") {
      const place = (source: Source, navigation: Navigation) => {
        return { source, state: { navigation } };
      };
      if (state.optionIndex === undefined) {
        const [newSource, newTermId] = insert.create(source);
        const newSourceWithLabel = insert.setLabel(newSource, newTermId, state.text);
        switch (state.navigation.part) {
          case "annotation":
            return place(insert.setAnnotation(newSourceWithLabel, state.navigation.termId, newTermId), state.navigation);
          case "parameters":
            return place(insert.addParameter(newSourceWithLabel, state.navigation.termId, newTermId), {
              termId: state.navigation.termId,
              part: "parameter",
              parameterIndex: termParameters.length,
            });
          case "reference":
            return place(insert.setReference(newSourceWithLabel, state.navigation.termId, newTermId), state.navigation);
          case "bindings":
            return place(insert.setBinding(newSourceWithLabel, state.navigation.termId, newTermId, null), {
              termId: state.navigation.termId,
              part: "binding",
              bindingIndex: termBindings.length,
              subPart: "key",
            });
          case "binding": {
            switch (state.navigation.subPart) {
              case "value":
                return place(
                  insert.setBinding(
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
            const newSource = insert.setAnnotation(source, state.navigation.termId, selectedTermId);
            return selectOption(newSource, state.navigation);
          }
          case "parameters": {
            const newSource = insert.addParameter(source, state.navigation.termId, selectedTermId);
            return selectOption(newSource, {
              termId: state.navigation.termId,
              part: "parameter",
              parameterIndex: termParameters.length,
            });
          }
          case "reference": {
            const newSource = insert.setReference(source, state.navigation.termId, selectedTermId);
            return selectOption(newSource, state.navigation);
          }
          case "bindings": {
            const newSource = insert.setBinding(source, state.navigation.termId, selectedTermId, null);
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
                const newSource = insert.setBinding(
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
  const references = state.navigation && formatting.getReferences(source, state.navigation.termId);
  const [newSourceWithTerm, newTermId] = insert.create(source);
  const newSourceWithLabel = insert.setLabel(newSourceWithTerm, newTermId, state.text ?? "");
  const newSourceWithLabelAndOrdering = state.navigation
    ? newSourceWithLabel
    : store.setOrdering(newSourceWithLabel, [...store.getOrdering(newSourceWithLabel), newTermId]);

  if (event.key === "Enter") {
    if (!state.navigation && state.text) {
      return { source: newSourceWithLabelAndOrdering, state: {} };
    }
    if (state.navigation?.part === "type") {
      const termData = store.get(source, state.navigation.termId);
      const newType = (() => {
        switch (termData.type) {
          case "lambda":
            return "pi";
          case "pi":
            return "lambda";
        }
      })();
      const newSource = insert.setType(source, state.navigation.termId, newType);
      return { source: newSource };
    }
    if (state.navigation?.part === "mode") {
      const termData = store.get(source, state.navigation.termId);
      const newMode = (() => {
        switch (termData.mode) {
          case "call":
            return "match";
          case "match":
            return "call";
        }
      })();
      const newSource = insert.setMode(source, state.navigation.termId, newMode);
      return { source: newSource };
    }
  }
  if (event.key === "Escape") {
    return { state: {} };
  }
  if (event.key === ":") {
    if (!state.navigation) {
      return { source: newSourceWithLabelAndOrdering, state: { navigation: { termId: newTermId, part: "annotation" } } };
    }
    if (state.navigation.part === "label") {
      return { state: { navigation: { termId: state.navigation.termId, part: "annotation" } } };
    }
    if (state.navigation.part === "parameters") {
      const newSourceWithPlacement = insert.addParameter(newSourceWithLabelAndOrdering, state.navigation.termId, newTermId);
      return { source: newSourceWithPlacement, state: { navigation: { termId: newTermId, part: "annotation" } } };
    }
  }
  if (event.key === "(") {
    if (!state.navigation) {
      return { source: newSourceWithLabelAndOrdering, state: { navigation: { termId: newTermId, part: "parameters" } } };
    }
    if (state.navigation.part === "label") {
      return { state: { navigation: { termId: state.navigation.termId, part: "parameters" } } };
    }
    if (state.navigation.part === "reference") {
      if (state.text) {
        const newSourceWithPlacement = insert.setReference(newSourceWithLabel, state.navigation.termId, newTermId);
        return { source: newSourceWithPlacement, state: { navigation: { termId: state.navigation.termId, part: "bindings" } } };
      }
      return { state: { navigation: { termId: state.navigation.termId, part: "bindings" } } };
    }
  }
  if (event.key === "(" && event.ctrlKey && state.navigation) {
    if (state.navigation.part === "annotation") {
      const newSourceWithPlacement = insert.setAnnotation(newSourceWithTerm, state.navigation.termId, newTermId);
      return { source: newSourceWithPlacement, state: { navigation: { termId: newTermId, part: "reference" } } };
    }
    if (state.navigation.part === "bindings") {
      const newSourceWithPlacement = insert.setBinding(newSourceWithTerm, state.navigation.termId, newTermId, null);
      return { source: newSourceWithPlacement, state: { navigation: { termId: newTermId, part: "reference" } } };
    }
    if (state.navigation.part === "binding" && state.navigation.subPart === "key" && termBindings?.[state.navigation.bindingIndex]) {
      const newSourceWithPlacement = insert.setBinding(
        newSourceWithTerm,
        state.navigation.termId,
        newTermId,
        termBindings[state.navigation.bindingIndex].value
      );
      const newSourceWithoutOld = insert.removeParameter(
        newSourceWithPlacement,
        state.navigation.termId,
        termBindings[state.navigation.bindingIndex].key
      );
      return { source: newSourceWithoutOld, state: { navigation: { termId: newTermId, part: "reference" } } };
    }
    if (state.navigation.part === "binding" && state.navigation.subPart === "value" && termBindings?.[state.navigation.bindingIndex]) {
      const newSourceWithPlacement = insert.setBinding(
        newSourceWithTerm,
        state.navigation.termId,
        termBindings[state.navigation.bindingIndex].key,
        newTermId
      );
      return { source: newSourceWithPlacement, state: { navigation: { termId: newTermId, part: "reference" } } };
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
      return { source: newSourceWithLabelAndOrdering, state: { navigation: { termId: newTermId, part: "reference" } } };
    }
    if (state.navigation.part === "label") {
      return { state: { navigation: { termId: state.navigation.termId, part: "reference" } } };
    }
    if (state.navigation.part === "parameters") {
      if (state.text) {
        const newSourceWithPlacement = insert.addParameter(newSourceWithLabelAndOrdering, state.navigation.termId, newTermId);
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
      const newSourceWithPlacement = insert.addParameter(newSourceWithLabelAndOrdering, state.navigation.termId, newTermId);
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
        source: insert.delete(source, state.navigation.termId),
        state:
          rootIndex >= 0
            ? { navigation: { termId: rootIndex > 0 ? roots[rootIndex - 1] : roots[rootIndex + 1], part: "label" } }
            : { navigation: state.navigation },
      };
    }
    if (state.navigation.part === "annotation") {
      return {
        source: insert.setAnnotation(source, state.navigation.termId, null),
      };
    }
    if (state.navigation.part === "parameter") {
      return {
        source: insert.removeParameter(source, state.navigation.termId, termParameters.at(state.navigation.parameterIndex)!),
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
        source: insert.setReference(source, state.navigation.termId, null),
      };
    }
    if (state.navigation.part === "binding" && state.navigation.subPart === "key") {
      return {
        source: insert.removeBinding(source, state.navigation.termId, termBindings.at(state.navigation.bindingIndex)!.key),
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
        source: insert.setBinding(source, state.navigation.termId, termBindings.at(state.navigation.bindingIndex)!.key, null),
      };
    }
  }
  // #endregion
}

function getParentPosition<Source>({
  termId,
  source,
  formatting,
  store,
}: {
  termId: TermId;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}): Navigation | undefined {
  const isRoot = formatting.isRoot(source, termId);
  const references = formatting.getReferences(source, termId);
  const parentTermId = ((): TermId | undefined => {
    if (references.all.size === 1) return getOne(references.all);
    if (!isRoot && references.asParameter.size === 1) return getOne(references.asParameter);
  })();
  const parentTermData = parentTermId ? store.get(source, parentTermId) : null;
  if (!parentTermData || !parentTermId) return;
  if (parentTermData.annotation === termId) return { termId: parentTermId, part: "annotation" };
  const parameters = formatting.getTermParameters(source, parentTermId);
  for (let parameterIndex = 0; parameterIndex < parameters.length; parameterIndex++) {
    if (parameters[parameterIndex] === termId) return { termId: parentTermId, part: "parameter", parameterIndex };
  }
  if (parentTermData.reference === termId) return { termId: parentTermId, part: "reference" };
  const bindings = formatting.getTermBindings(source, parentTermId);
  for (let bindingIndex = 0; bindingIndex < bindings.length; bindingIndex++) {
    if (bindings[bindingIndex].key === termId) return { termId: parentTermId, part: "binding", bindingIndex, subPart: "key" };
    if (bindings[bindingIndex].value === termId) return { termId: parentTermId, part: "binding", bindingIndex, subPart: "value" };
  }
}

function getOne<T>(set: Set<T>): T {
  if (set.size !== 1) throw new Error();
  return set.keys().next().value;
}
