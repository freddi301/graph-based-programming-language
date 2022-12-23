import React from "react";
import { GlobalStyle } from "./components/theme";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { AppLayout } from "./components/AppLayout";
import {
  createJsMapSourceHasEmptyInstance,
  createJsMapSourceStore,
  createJsonValueSerializationFromSourceStore,
  createSourceInsertFromSourceStoreAndFormatting,
  createSourceFormmattingFromSourceStore,
  SourceInsert,
  SourceFormatting,
  SourceStore,
  TermId,
  JsMapSource,
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
import { LeftBar } from "./components/LeftBar";
import { State } from "./components/editor/State";
import { Editor } from "./components/editor/Editor";
import { reactPrinterFactory } from "./components/editor/Rendering";
import { Help } from "./components/editor/Help";

library.add(fas);

function GenericApp<Source, CommitId, Repository>({
  store,
  sourceHasEmptyInstance,
  sourceJsonValueSerialization,
  repositoryFacadeImplementation,
  repositoryHasEmptyInstance,
  repositoryImplementation,
  repositoryJsonValueSerialization,
  commitIdStringSerialization,
  formatting,
  insert,
}: {
  store: SourceStore<Source>;
  insert: SourceInsert<Source>;
  sourceHasEmptyInstance: HasEmptyIntance<Source>;
  formatting: SourceFormatting<Source>;
  sourceJsonValueSerialization: SerializationInterface<Source, JsonValue>;
  repositoryImplementation: RepositoryInterface<CommitId, Source, null, Repository>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, null, Repository>;
  repositoryHasEmptyInstance: HasEmptyIntance<Repository>;
  repositoryJsonValueSerialization: SerializationInterface<Promise<Repository>, Promise<JsonValue>>;
  commitIdStringSerialization: SerializationInterface<CommitId, string>;
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
  const [state, setState] = React.useState<State>({});
  // #region restore state
  // TODO better
  const stateByCommitId = React.useRef(new Map<string, State>());
  const historyCurrent = history.current;
  React.useLayoutEffect(() => {
    if (historyCurrent) {
      const restored = stateByCommitId.current.get(commitIdStringSerialization.serialize(historyCurrent));
      if (restored) {
        setState(restored);
      }
    }
  }, [commitIdStringSerialization, historyCurrent]);
  React.useLayoutEffect(() => {
    if (historyCurrent) {
      stateByCommitId.current.set(commitIdStringSerialization.serialize(historyCurrent), state);
    }
  }, [commitIdStringSerialization, historyCurrent, state]);
  // #endregion
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
                            input.accept = ".json";
                            input.onchange = () => {
                              const file = input.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = () => {
                                  try {
                                    const source = sourceJsonValueSerialization.deserialize(JSON.parse(reader.result as string));
                                    history.goto(null);
                                    history.change(source);
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
              {
                label: "References",
                icon: <FontAwesomeIcon icon="link" />,
                sections: (() => {
                  if (state.navigation?.part !== "label") return [];
                  const references = formatting.getReferences(source, state.navigation.termId);
                  if (!references) return [];
                  function list(set: Set<TermId>) {
                    return Array.from(set.keys()).map((termId) => {
                      return (
                        <div
                          key={termId}
                          css={css`
                            padding: 0px 2ch;
                          `}
                        >
                          {
                            reactPrinterFactory({
                              navigation: null,
                              termId,
                              source,
                              store,
                              formatting,
                              state,
                              onStateChange: setState,
                              onKeyDownWithState(state, event) {},
                              options: [],
                              insert,
                              onSourceChange() {},
                              navigationPaths: [],
                            }).label().content
                          }
                        </div>
                      );
                    });
                  }
                  return [
                    { title: `ALL (${references.all.size})`, content: list(references.all) },
                    { title: `AS ANNOTATION (${references.asAnnotation.size})`, content: list(references.asAnnotation) },
                    { title: `AS PARAMETER (${references.asParameter.size})`, content: list(references.asParameter) },
                    { title: `AS REFERENCE (${references.asReference.size})`, content: list(references.asReference) },
                    { title: `AS BINDING KEY (${references.asBindingKey.size})`, content: list(references.asBindingKey) },
                    {
                      title: `AS BINDING VALUE (${references.asBindingValue.size})`,
                      content: list(new Set(references.asBindingValue.keys())),
                    },
                  ];
                })(),
              },
            ]}
          />
        }
        center={
          <Editor
            state={state}
            onStateChange={setState}
            source={source}
            onSourceChange={(source) => {
              setSource(source);
              history.change(source);
            }}
            store={store}
            insert={insert}
            formatting={formatting}
          />
        }
        bottom={null}
        right={<Help />}
      />
    </React.Fragment>
  );
}

/** choose implementations */
export default function App() {
  type CommitId = HexSHA256;
  type Source = JsMapSource;
  type Info = null;
  const store = createJsMapSourceStore();
  const formatting = createSourceFormmattingFromSourceStore(store);
  const insert = createSourceInsertFromSourceStoreAndFormatting(store, formatting);
  const sourceHasEmptyInstance = createJsMapSourceHasEmptyInstance();
  const sourceJsonValueSerialization = createJsonValueSerializationFromSourceStore(store, sourceHasEmptyInstance);
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
      formatting={formatting}
      sourceHasEmptyInstance={sourceHasEmptyInstance}
      store={store}
      insert={insert}
    />
  );
}
