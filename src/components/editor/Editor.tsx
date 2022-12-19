import React from "react";
import { css } from "styled-components/macro";
import { SourceFormatting, SourceInsert, SourceStore } from "../Source";
import { format } from "./Formatting";
import { keyboardAction } from "./keyboardAction";
import { Options, reactBuilderFactory, reactPrinterFactory } from "./Rendering";
import { getOptions, State } from "./State";

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
  React.useLayoutEffect(() => {
    const onResize = () => {
      if (containerRef.current) {
        setMaxWidth(Math.trunc(containerRef.current.offsetWidth / 9));
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
          padding: 1ch;
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
          return (
            <div
              key={termId}
              css={css`
                white-space: pre;
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
                  printerFactory({ navigation, termId, source, store, formatting }) {
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
                    });
                  },
                }).result().content
              }
            </div>
          );
        })}
        <div>
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

// css={css`
//   ${state.navigation?.termId === termId &&
//   state.navigation.part === "binding" &&
//   state.navigation.subPart === "value" &&
//   index === state.navigation.bindingIndex &&
//   navigationSelectedStyle};
// `}

// css={css`
//   ${state.navigation?.termId === termId &&
//   state.navigation.part === "binding" &&
//   state.navigation.subPart === "key" &&
//   index === state.navigation.bindingIndex &&
//   navigationSelectedStyle};
// `}

// css={css`
//   ${state.navigation?.termId === termId && state.navigation.part === "reference" && navigationSelectedStyle};
// `}

// css={css`
//   ${state.navigation?.termId === termId && state.navigation.part === "mode" && navigationSelectedStyle};
// `}

// css={css`
//   ${state.navigation?.termId === termId && state.navigation.part === "type" && navigationSelectedStyle};
// `}

// css={css`
//   ${state.navigation?.termId === termId &&
//   state.navigation.part === "parameter" &&
//   index === state.navigation.parameterIndex &&
//   navigationSelectedStyle};
// `}

// css={css`
//   ${state.navigation?.termId === termId && state.navigation.part === "annotation" && navigationSelectedStyle};
// `}
