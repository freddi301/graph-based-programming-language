import React from "react";
import { GlobalStyle } from "./components/theme";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { LeftSideTab, RenderLeftSideTabMemo } from "./components/LeftSideTab";
import { AppLayout } from "./components/AppLayout";
import {
  createJsMapHasEmptyInstance,
  createJsMapSourceImplementation,
  createJsonValueSerializationFromSourceImplementation,
  createSourceFacadeFromSourceInterface,
  createSourceFormmattingImplementationFromSourceImplementation,
  HexStringOf32Byte,
  hexStringOf32ByteStringSerialization,
  hexStringOf32ByteTermIdImplementation,
  SourceFacadeInterface,
  SourceFormattingInterface,
  SourceInterface,
  TermData,
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
import { CollapsibleSection } from "./components/CollapsibleSection";
import { css } from "styled-components/macro";
import { Button } from "./components/Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { TermEditor } from "./components/TermEditor";

library.add(fas);

function GenericApp<TermId, Source, CommitId, Repository>({
  sourceImplementation,
  sourceHasEmptyInstance,
  sourceJsonValueSerialization,
  repositoryFacadeImplementation,
  repositoryHasEmptyInstance,
  repositoryImplementation,
  repositoryJsonValueSerialization,
  commitIdStringSerialization,
  sourceFormattingImplementation,
  termIdStringSerialization,
  sourceFacadeImplementation,
}: {
  sourceImplementation: SourceInterface<TermId, Source>;
  sourceFacadeImplementation: SourceFacadeInterface<TermId, Source>;
  sourceHasEmptyInstance: HasEmptyIntance<Source>;
  sourceJsonValueSerialization: SerializationInterface<Source, JsonValue>;
  repositoryImplementation: RepositoryInterface<CommitId, Source, null, Repository>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, null, Repository>;
  repositoryHasEmptyInstance: HasEmptyIntance<Repository>;
  repositoryJsonValueSerialization: SerializationInterface<Promise<Repository>, Promise<JsonValue>>;
  commitIdStringSerialization: SerializationInterface<CommitId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
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
  const [selectedLeftSideTab, setSelectedLeftSideTab] = React.useState<LeftSideTab>("history");
  return (
    <React.Fragment>
      <GlobalStyle />
      <AppLayout
        top={null}
        leftLeft={leftSideTabs.map((tab) => (
          <RenderLeftSideTabMemo key={tab} tab={tab} onSelect={setSelectedLeftSideTab} isSelected={tab === selectedLeftSideTab} />
        ))}
        left={(() => {
          switch (selectedLeftSideTab) {
            case "version-control":
              return null;
            case "history":
              return (
                <div
                  css={css`
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                  `}
                >
                  <CollapsibleSection title="GRAPH">
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
                  </CollapsibleSection>
                  <CollapsibleSection title="UTILS">
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
                  </CollapsibleSection>
                </div>
              );
          }
        })()}
        center={
          <TermEditor<TermId, Source>
            source={source}
            onSourceChange={(source) => {
              setSource(source);
              history.change(source);
            }}
            sourceImplementation={sourceImplementation}
            sourceFacadeImplementation={sourceFacadeImplementation}
            termIdStringSerialization={termIdStringSerialization}
            sourceFormattingImplementation={sourceFormattingImplementation}
          />
        }
        bottom={null}
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

const leftSideTabs: Array<LeftSideTab> = ["version-control", "history"];

// choose implementations

export default function App() {
  type TermId = HexStringOf32Byte;
  type CommitId = HexSHA256;
  type Source = Map<string, TermData<TermId>>;
  type Info = null;
  const termIdStringSerialization = hexStringOf32ByteStringSerialization;
  const sourceImplementation = createJsMapSourceImplementation(hexStringOf32ByteStringSerialization);
  const termIdImplementation = hexStringOf32ByteTermIdImplementation;
  const sourceFacadeImplementation = createSourceFacadeFromSourceInterface(sourceImplementation, termIdImplementation);
  const sourceFormattingImplementation = createSourceFormmattingImplementationFromSourceImplementation(
    sourceImplementation,
    termIdStringSerialization
  );
  const sourceHasEmptyInstance = createJsMapHasEmptyInstance<TermId, TermData<TermId>>();
  const sourceJsonValueSerialization = createJsonValueSerializationFromSourceImplementation(
    sourceImplementation,
    sourceHasEmptyInstance,
    termIdStringSerialization
  );
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
      termIdStringSerialization={termIdStringSerialization}
      sourceFacadeImplementation={sourceFacadeImplementation}
    />
  );
}
