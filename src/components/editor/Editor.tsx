import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import { css } from "styled-components/macro";
import { evaluate } from "../runtime/evaluate";
import { SourceFormatting, SourceInsert, SourceStore, TermId } from "../Source";
import { format } from "./Formatting";
import { keyboardAction } from "./keyboardAction";
import { navigationSelectedStyle, Options, reactBuilderFactory, reactPrinterFactory } from "./Rendering";
import { getOptions, Navigation, State } from "./State";

export function Editor<Source>({
  state,
  onStateChange,
  source,
  onSourceChange,
  store,
  insert,
  formatting,
}: {
  state: State;
  onStateChange(state: State): void;
  source: Source;
  onSourceChange(source: Source): void;
  store: SourceStore<Source>;
  insert: SourceInsert<Source>;
  formatting: SourceFormatting<Source>;
}) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  // #region resizing
  const [maxWidth, setMaxWidth] = React.useState(0);
  const [height, setHeight] = React.useState(0);
  React.useLayoutEffect(() => {
    const onResize = () => {
      if (containerRef.current) {
        setMaxWidth(Math.trunc(containerRef.current.offsetWidth / 9 - 6));
        setHeight(containerRef.current.offsetHeight);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  // #endregion
  // #region keyboard based styles
  const [ctrlIsPressed, setCtrlIsPressed] = React.useState(false);
  React.useLayoutEffect(() => {
    const onKeyDownUp = (event: KeyboardEvent) => {
      setCtrlIsPressed(event.ctrlKey);
    };
    document.addEventListener("keydown", onKeyDownUp);
    document.addEventListener("keyup", onKeyDownUp);
    return () => {
      document.addEventListener("keydown", onKeyDownUp);
      document.addEventListener("keyup", onKeyDownUp);
    };
  }, []);
  // #endregion
  // #region keyboard control
  const onKeyDownWithState = (state: State, event: React.KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
    }
    setTimeout(() => {
      if (!contentRef.current?.contains(document.activeElement)) contentRef.current?.focus();
    });
    const changed = keyboardAction({
      state,
      event,
      source,
      store,
      insert,
      formatting,
    });
    if (changed) {
      event.preventDefault?.();
      if (changed.state) onStateChange(changed.state);
      if (changed.source) onSourceChange(changed.source);
    }
  };
  // #endregion
  const options = getOptions<Source>({ store, source, state });
  const evaluated = React.useMemo(() => {
    return evaluate({ source, store, formatting });
  }, [source, formatting, store]);
  const [running, setRunning] = React.useState<Record<TermId, boolean>>({});
  const orderingWidth = store.getOrdering(source).length.toString().length;
  const [collapsed, setCollapsed] = React.useState<Record<TermId, boolean>>({});
  return (
    <div
      ref={containerRef}
      css={css`
        width: 100%;
        height: 100%;
        position: relative;
        overflow: auto;
        ${ctrlIsPressed &&
        css`
          .term-label {
            cursor: pointer;
            :hover {
              text-decoration: underline;
            }
          }
        `}
        .${navigationToCssClass(state.navigation)} {
          ${navigationSelectedStyle}
        }
      `}
      onKeyDown={(event) => onKeyDownWithState(state, event)}
    >
      <div
        ref={contentRef}
        css={css`
          position: absolute;
          min-width: 100%;
          min-height: 100%;
          outline: none;
          padding-top: 1ch;
          padding-bottom: calc(${height}px - 4ch);
          box-sizing: border-box;
        `}
        tabIndex={0}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            contentRef.current?.focus();
            onStateChange({});
          }
        }}
      >
        {formatting.getRoots(source).map((termId) => {
          const evaluatedTermId = evaluated.results.get(termId);
          const isRunning = running[termId];
          const isCollapsed = collapsed[termId];
          const ordering = formatting.getOrdering(source, termId);
          const displayOrdering = ordering !== undefined ? ordering + 1 : undefined;
          return (
            <div
              key={termId}
              css={css`
                display: grid;
                grid-template-columns: 2ch ${orderingWidth + 1}ch 2ch 1fr;
                grid-template-rows: max-content max-content;
                grid-template-areas: "control ordering collapse source" "control ordering collapse result";
                :hover {
                  .highlight {
                    background-color: var(--hover-background-color);
                  }
                }
                :hover {
                  .action {
                    opacity: 1;
                  }
                }
                .action {
                  cursor: pointer;
                }
              `}
            >
              <div
                className="highlight"
                css={css`
                  grid-area: control;
                  padding-left: 1ch;
                  .action {
                    opacity: ${isRunning ? 1 : 0};
                    transition: 0.2s;
                  }
                `}
              >
                {isRunning ? (
                  <FontAwesomeIcon
                    className="action"
                    icon="pause"
                    onClick={() => setRunning({ ...running, [termId]: false })}
                    style={{ width: "1ch" }}
                  />
                ) : (
                  <FontAwesomeIcon
                    className="action"
                    icon="play"
                    onClick={() => setRunning({ ...running, [termId]: true })}
                    style={{ width: "1ch" }}
                  />
                )}
              </div>
              <div
                className="highlight"
                css={css`
                  grid-area: ordering;
                  text-align: right;
                  color: var(--text-color-comment);
                  user-select: none;
                  padding-left: 1ch;
                `}
                onClick={() => {
                  if (ordering !== undefined) {
                    onSourceChange(insert.unsetOrdering(source, termId));
                  } else {
                    onSourceChange(store.setOrdering(source, [...store.getOrdering(source), termId]));
                  }
                }}
                draggable={true}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", termId);
                }}
                onDragOver={(event) => {
                  if (ordering !== undefined) {
                    event.preventDefault();
                  }
                }}
                onDrop={(event) => {
                  if (ordering !== undefined) {
                    const arrivingTermId = event.dataTransfer.getData("text/plain") as TermId;
                    const arrivingOrdering = formatting.getOrdering(source, arrivingTermId);
                    if (arrivingOrdering !== undefined) {
                      onSourceChange(store.setOrdering(source, moveItem(arrivingOrdering, ordering, store.getOrdering(source))));
                    } else {
                      onSourceChange(store.setOrdering(source, moveItem(0, ordering + 1, [arrivingTermId, ...store.getOrdering(source)])));
                    }
                  }
                }}
              >
                {displayOrdering}
              </div>
              <div
                className="highlight"
                css={css`
                  grid-area: collapse;
                  .action {
                    opacity: ${isCollapsed ? 1 : 0};
                    transition: 0.2s;
                  }
                  padding-left: 0.5ch;
                  padding-right: 0.5ch;
                `}
              >
                {isCollapsed ? (
                  <FontAwesomeIcon
                    className="action"
                    icon="chevron-right"
                    onClick={() => setCollapsed({ ...collapsed, [termId]: false })}
                    style={{ width: "1ch" }}
                  />
                ) : (
                  <FontAwesomeIcon
                    className="action"
                    icon="chevron-down"
                    onClick={() => setCollapsed({ ...collapsed, [termId]: true })}
                    style={{ width: "1ch" }}
                  />
                )}
              </div>
              <div
                css={css`
                  grid-area: source;
                  white-space: pre;
                  line-height: var(--code-line-height);
                  height: ${isCollapsed ? "var(--code-line-height)" : ""};
                  overflow: ${isCollapsed ? "hidden" : ""};
                `}
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    onStateChange({ navigation: { termId, part: "label" } });
                  }
                }}
              >
                {
                  format({
                    maxWidth,
                    termId,
                    source,
                    store,
                    formatting,
                    builderFactory: reactBuilderFactory,
                    printerFactory({ navigation, termId, source, store, formatting, navigationPaths }) {
                      return reactPrinterFactory({
                        navigation,
                        termId,
                        state,
                        onStateChange,
                        source,
                        onSourceChange,
                        store,
                        insert,
                        formatting,
                        onKeyDownWithState,
                        options,
                        navigationPaths,
                      });
                    },
                  }).result().content
                }
              </div>
              {evaluatedTermId && isRunning && !isCollapsed && (
                <div
                  css={css`
                    grid-area: result;
                    white-space: pre;
                    border: 2px dashed var(--border-color-secondary);
                  `}
                >
                  {
                    format({
                      maxWidth,
                      termId: evaluatedTermId,
                      source,
                      store,
                      formatting,
                      builderFactory: reactBuilderFactory,
                      printerFactory({ navigation, termId, source, store, formatting, navigationPaths }) {
                        return reactPrinterFactory({
                          navigation,
                          termId,
                          source,
                          store,
                          formatting,
                          navigationPaths,
                          insert,
                          state,
                          options: [],
                          onStateChange,
                          onKeyDownWithState(state, event) {},
                          onSourceChange(source) {},
                        });
                      },
                    }).result().content
                  }
                </div>
              )}
            </div>
          );
        })}
        <div
          css={css`
            padding: 0px 1ch 0px ${5 + orderingWidth}ch;
          `}
        >
          <Options
            navigation={undefined}
            source={source}
            state={state}
            onStateChange={onStateChange}
            store={store}
            formatting={formatting}
            options={options}
            onKeyDownWithState={onKeyDownWithState}
          />
        </div>
      </div>
    </div>
  );
}

export function navigationToCssClass(navigation: Navigation | null | undefined) {
  switch (navigation?.part) {
    case "annotation":
      return `navigation-${navigation.termId}-annotation`;
    case "parameter":
      return `navigation-${navigation.termId}-parameter-${navigation.parameterIndex}`;
    case "type":
      return `navigation-${navigation.termId}-type`;
    case "mode":
      return `navigation-${navigation.termId}-mode`;
    case "reference":
      return `navigation-${navigation.termId}-reference`;
    case "binding":
      switch (navigation.subPart) {
        case "key":
          return `navigation-${navigation.termId}-binding-${navigation.bindingIndex}-key`;
        case "value":
          return `navigation-${navigation.termId}-binding-${navigation.bindingIndex}-value`;
      }
  }
  return "";
}

function moveItem<T>(fromIndex: number, toIndex: number, array: Array<T>): Array<T> {
  if (fromIndex < toIndex) {
    return [...array.slice(0, fromIndex), ...array.slice(fromIndex + 1, toIndex + 1), array[fromIndex], ...array.slice(toIndex + 1)];
  }
  if (fromIndex > toIndex) {
    return [...array.slice(0, toIndex), array[fromIndex], ...array.slice(toIndex, fromIndex), ...array.slice(fromIndex + 1)];
  }
  return array;
}
