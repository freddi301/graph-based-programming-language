import React from "react";
import { GlobalStyle } from "./components/theme";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "./components/AppLayout";
import {
  createJsMapHasEmptyInstance,
  createJsMapSourceImplementation,
  createJsonValueSerializationFromSourceImplementation,
  createSourceFacadeFromSourceInterface,
  createSourceFormmattingImplementationFromSourceImplementation,
  SourceFacadeInterface,
  SourceFormattingInterface,
  SourceInterface,
  TermData,
  TermId,
} from "./components/Source";
import { HasEmptyIntance, JsonValue, SerializationInterface } from "./components/utils";
import { HistoryGraph, useHistory } from "./components/version-control/HistoryGraph";
import {
  createImmutableJsRepositoryFacadeImplementation,
  createImmutableJsRepositoryHasEmptyInstance,
  createImmutableJsRepositoryImplementation,
  createImmutableJsRepositoryStateJsonValueSerialization,
  HexSHA256,
  hexSHA256StringSerialization,
  RepositoryFacadeInterface,
  RepositoryInterface,
} from "./components/version-control/Repository";
import { css } from "styled-components/macro";
import { Button } from "./components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TermEditor } from "./components/editor/Editor";
import { LeftBar } from "./components/LeftBar";
import { format } from "./components/editor/Formatting";

library.add(fas);

function GenericApp<Source, CommitId, Repository>({
  sourceImplementation,
  sourceHasEmptyInstance,
  sourceJsonValueSerialization,
  repositoryFacadeImplementation,
  repositoryHasEmptyInstance,
  repositoryImplementation,
  repositoryJsonValueSerialization,
  commitIdStringSerialization,
  sourceFormattingImplementation,
  sourceFacadeImplementation,
}: {
  sourceImplementation: SourceInterface<Source>;
  sourceFacadeImplementation: SourceFacadeInterface<Source>;
  sourceHasEmptyInstance: HasEmptyIntance<Source>;
  sourceJsonValueSerialization: SerializationInterface<Source, JsonValue>;
  repositoryImplementation: RepositoryInterface<CommitId, Source, null, Repository>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, null, Repository>;
  repositoryHasEmptyInstance: HasEmptyIntance<Repository>;
  repositoryJsonValueSerialization: SerializationInterface<Promise<Repository>, Promise<JsonValue>>;
  commitIdStringSerialization: SerializationInterface<CommitId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<Source>;
}) {
  const [source, setSource] = React.useState(sourceHasEmptyInstance.empty());
  const history = useHistory({
    onSource: setSource,
    sourceHasEmptyInstance,
    repositoryFacadeImplementation,
    repositoryHasEmptyInstance,
    repositoryImplementation,
    repositoryJsonValueSerialization,
  });
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
    <React.Fragment>
      <GlobalStyle />
      <AppLayout
        top={null}
        left={
          <LeftBar
            tabs={[
              {
                label: "File",
                icon: <FontAwesomeIcon icon="file" />,
                sections: [
                  {
                    title: "UTILS",
                    content: (
                      <div
                        css={css`
                          padding: 8px;
                        `}
                      >
                        <Button
                          label="export current code as json"
                          icon={<FontAwesomeIcon icon="file-export" />}
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(sourceJsonValueSerialization.serialize(source))], {
                              type: "application/json",
                            });
                            const objectUrl = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = objectUrl;
                            a.download = "download";
                            a.onclick = () => {
                              setTimeout(() => URL.revokeObjectURL(objectUrl));
                            };
                            a.click();
                          }}
                        />
                        <Button
                          label="import json as current code"
                          icon={<FontAwesomeIcon icon="file-import" />}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.onchange = () => {
                              const file = input.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  try {
                                    const source = sourceJsonValueSerialization.deserialize(JSON.parse(reader.result as string));
                                    history.goto(null);
                                    setSource(source);
                                  } catch (error) {
                                    console.error(error);
                                  }
                                };
                                reader.readAsText(file);
                              }
                            };
                            input.click();
                          }}
                        />
                      </div>
                    ),
                  },
                ],
              },
              {
                label: "History",
                icon: <FontAwesomeIcon icon="clock-rotate-left" />,
                sections: [
                  {
                    title: "GRAPH",
                    content: (
                      <React.Fragment>
                        <div
                          css={css`
                            padding: 8px;
                          `}
                        >
                          <Button label="new history" icon={<FontAwesomeIcon icon="plus" />} onClick={() => history.goto(null)} />
                        </div>
                        <div>
                          <HistoryGraph
                            repository={history.repository}
                            selected={history.current}
                            onSelect={history.goto}
                            commitIdStringSerialization={commitIdStringSerialization}
                            repositoryFacadeImplementation={repositoryFacadeImplementation}
                            repositoryImplementation={repositoryImplementation}
                          />
                        </div>
                      </React.Fragment>
                    ),
                  },
                ],
              },
            ]}
          />
        }
        center={
          <TermEditor<Source>
            source={source}
            onSourceChange={(source) => {
              setSource(source);
              history.change(source);
            }}
            sourceImplementation={sourceImplementation}
            sourceFacadeImplementation={sourceFacadeImplementation}
            sourceFormattingImplementation={sourceFormattingImplementation}
          />
        }
        bottom={
          <div
            ref={codeContainerRef}
            css={css`
              position: relative;
            `}
          >
            <div
              css={css`
                position: absolute;
                white-space: pre;
                padding: 1ch;
              `}
            >
              {sourceFormattingImplementation
                .getRoots(source)
                .map((rootId) => {
                  return format({
                    maxWidth: charWidth,
                    rootId,
                    source,
                    sourceImplementation,
                    sourceFormattingImplementation,
                  });
                })
                .join("\n")}
            </div>
          </div>
        }
        right={
          <div
            css={css`
              padding: 0px 2ch;
            `}
          >
            Navigate with arrows
            <br />
            Esc to escape any action
            <br />
            Enter to select options
            <br />
            Ctrl + click to go to definition
            <br />
            Tab next option
            <br />
            Shift + Tab previous option
            <br />
            : to set annotation
            <br />
            ( to declare or set parameters
            <br />= to asign
            <br />) to close current parentheses
          </div>
        }
      />
    </React.Fragment>
  );
}

/** choose implementations */
export default function App() {
  type CommitId = HexSHA256;
  type Source = Map<string, TermData>;
  type Info = null;
  const sourceImplementation = createJsMapSourceImplementation();
  const sourceFacadeImplementation = createSourceFacadeFromSourceInterface(sourceImplementation);
  const sourceFormattingImplementation = createSourceFormmattingImplementationFromSourceImplementation(sourceImplementation);
  const sourceHasEmptyInstance = createJsMapHasEmptyInstance<TermId, TermData>();
  const sourceJsonValueSerialization = createJsonValueSerializationFromSourceImplementation(sourceImplementation, sourceHasEmptyInstance);
  const commitIdStringSerialization = hexSHA256StringSerialization;
  const infoJsonValueSerialization: SerializationInterface<Info, JsonValue> = {
    serialize(deserialized) {
      return deserialized;
    },
    deserialize(serialized) {
      if (serialized !== null) throw new Error();
      return serialized;
    },
  };
  const immutableJsRepositoryStateHasEmptyInstance = createImmutableJsRepositoryHasEmptyInstance<CommitId, Source, Info>();
  const repositoryImplementation = createImmutableJsRepositoryImplementation(sourceJsonValueSerialization, infoJsonValueSerialization);
  const repositoryFacadeImplementation = createImmutableJsRepositoryFacadeImplementation<CommitId, Source, Info>();
  const repositoryJsonValueSerialization = createImmutableJsRepositoryStateJsonValueSerialization(
    sourceJsonValueSerialization,
    commitIdStringSerialization,
    infoJsonValueSerialization,
    immutableJsRepositoryStateHasEmptyInstance,
    repositoryImplementation
  );
  const repositoryHasEmptyInstance = createImmutableJsRepositoryHasEmptyInstance<CommitId, Source, Info>();
  return (
    <GenericApp
      commitIdStringSerialization={commitIdStringSerialization}
      repositoryFacadeImplementation={repositoryFacadeImplementation}
      repositoryHasEmptyInstance={repositoryHasEmptyInstance}
      repositoryImplementation={repositoryImplementation}
      repositoryJsonValueSerialization={repositoryJsonValueSerialization}
      sourceJsonValueSerialization={sourceJsonValueSerialization}
      sourceFormattingImplementation={sourceFormattingImplementation}
      sourceHasEmptyInstance={sourceHasEmptyInstance}
      sourceImplementation={sourceImplementation}
      sourceFacadeImplementation={sourceFacadeImplementation}
    />
  );
}
