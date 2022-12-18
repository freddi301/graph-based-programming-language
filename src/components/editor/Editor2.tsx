import React from "react";
import { css } from "styled-components/macro";
import { SourceFormatting, SourceStore } from "../Source";
import { format } from "./Formatting";
import { reactBuilderFactory, reactPrinterFactory } from "./Rendering";
import { State } from "./State";

export function Editor2<Source>({
  state,
  onStateChange,
  source,
  store,
  formatting,
}: {
  state: State;
  onStateChange(state: State): void;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}) {
  // #region resizing
  const [charWidth, setCharWidth] = React.useState(0);
  const codeContainerRef = React.useRef<HTMLDivElement | null>(null);
  React.useLayoutEffect(() => {
    const onResize = () => {
      if (codeContainerRef.current) {
        setCharWidth(codeContainerRef.current.offsetWidth / 8);
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
  return (
    <div
      ref={codeContainerRef}
      css={css`
        position: relative;
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
    >
      <div
        css={css`
          position: absolute;
        `}
      >
        {formatting.getRoots(source).map((rootId) => {
          return (
            <div
              key={rootId}
              css={css`
                white-space: pre;
                padding: 0px 1ch;
              `}
            >
              {
                format({
                  maxWidth: charWidth,
                  rootId,
                  source,
                  store,
                  formatting,
                  builderFactory: reactBuilderFactory,
                  printerFactory({ navigation, termId, source, store, formatting }) {
                    return reactPrinterFactory({ navigation, termId, source, store, formatting, state, onStateChange });
                  },
                }).result().content
              }
            </div>
          );
        })}
      </div>
    </div>
  );
}
