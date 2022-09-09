import React from "react";
import { createEditorStateHasEmptyInstance, EditorState } from "./components/Editor";
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
import { RenderRoot } from "./components/RenderSource";
import { CollapsibleSection } from "./components/CollapsibleSection";
import { css } from "styled-components/macro";

library.add(fas);

function GenericApp<TermId, Source, CommitId, Repository>({
  sourceImplementation,
  sourceHasEmptyInstance,
  editorStateHasEmptyInstance,
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
  editorStateHasEmptyInstance: HasEmptyIntance<EditorState<TermId>>;
  repositoryImplementation: RepositoryInterface<CommitId, Source, null, Repository>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, null, Repository>;
  repositoryHasEmptyInstance: HasEmptyIntance<Repository>;
  repositoryJsonValueSerialization: SerializationInterface<Promise<Repository>, Promise<JsonValue>>;
  commitIdStringSerialization: SerializationInterface<CommitId, string>;
  sourceFormattingImplementation: SourceFormattingInterface<TermId, Source>;
  termIdStringSerialization: SerializationInterface<TermId, string>;
}) {
  const [source, setSource] = React.useState(sourceHasEmptyInstance.empty());
  const [editorState, setEditorState] = React.useState(editorStateHasEmptyInstance.empty());
  const history = useHistory({
    onSource: setSource,
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
                    <HistoryGraph
                      repository={history.repository}
                      selected={history.current}
                      onSelect={history.goto}
                      commitIdStringSerialization={commitIdStringSerialization}
                      repositoryFacadeImplementation={repositoryFacadeImplementation}
                      repositoryImplementation={repositoryImplementation}
                    />
                  </CollapsibleSection>
                </div>
              );
          }
        })()}
        center={
          <RenderRoot
            source={source}
            onSourceChange={(source) => {
              setSource(source);
              history.change(source);
            }}
            editorState={editorState}
            onEditorStateChange={setEditorState}
            sourceFormattingImplementation={sourceFormattingImplementation}
            sourceImplementation={sourceImplementation}
            termIdStringSerialization={termIdStringSerialization}
            sourceFacadeImplementation={sourceFacadeImplementation}
          />
        }
        bottom={null}
        right={null}
      />
    </React.Fragment>
  );
}

const leftSideTabs: Array<LeftSideTab> = ["version-control", "history"];

// choose implemnetations

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
  const editorStateHasEmptyInstance = createEditorStateHasEmptyInstance<TermId>();
  const repositoryHasEmptyInstance = createImmutableJsRepositoryHasEmptyInstance<CommitId, Source, Info>();
  return (
    <GenericApp
      commitIdStringSerialization={commitIdStringSerialization}
      editorStateHasEmptyInstance={editorStateHasEmptyInstance}
      repositoryFacadeImplementation={repositoryFacadeImplementation}
      repositoryHasEmptyInstance={repositoryHasEmptyInstance}
      repositoryImplementation={repositoryImplementation}
      repositoryJsonValueSerialization={repositoryJsonValueSerialization}
      sourceFormattingImplementation={sourceFormattingImplementation}
      sourceHasEmptyInstance={sourceHasEmptyInstance}
      sourceImplementation={sourceImplementation}
      termIdStringSerialization={termIdStringSerialization}
      sourceFacadeImplementation={sourceFacadeImplementation}
    />
  );
}
