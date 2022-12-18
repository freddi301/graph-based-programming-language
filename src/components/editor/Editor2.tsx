import React from "react";
import { css } from "styled-components/macro";
import { SourceFormatting, SourceStore } from "../Source";
import { format } from "./Formatting";
import { reactBuilderFactory, reactPrinterFactory } from "./Rendering";
import { State } from "./State";

export function Editor2<Source>({
  onStateChange,
  source,
  store,
  formatting,
}: {
  onStateChange(state: State): void;
  source: Source;
  store: SourceStore<Source>;
  formatting: SourceFormatting<Source>;
}) {
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
  return (
    <div
      ref={codeContainerRef}
      css={css`
        position: relative;
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
                    return reactPrinterFactory({ navigation, termId, source, store, formatting, onStateChange });
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
