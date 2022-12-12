import React from "react";
import { css } from "styled-components/macro";
import { defaultShortcuts } from "../Shortcut";
import { useLocalStorageState } from "../useLocalStorageState";
import { HasEmptyIntance, JsonValue, SerializationInterface } from "../utils";
import { CommitGraph } from "./CommitGraph";
import { RepositoryFacadeInterface, RepositoryInterface } from "./Repository";

export function useHistory<CommitId, Source, Repository>({
  onSource,
  sourceHasEmptyInstance,
  repositoryFacadeImplementation,
  repositoryHasEmptyInstance,
  repositoryJsonValueSerialization,
  repositoryImplementation,
}: {
  onSource(source: Source): void;
  sourceHasEmptyInstance: HasEmptyIntance<Source>;
  repositoryImplementation: RepositoryInterface<CommitId, Source, null, Repository>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, null, Repository>;
  repositoryHasEmptyInstance: HasEmptyIntance<Repository>;
  repositoryJsonValueSerialization: SerializationInterface<Promise<Repository>, Promise<JsonValue>>;
}) {
  const [repository, setRepository] = useLocalStorageState(
    "history",
    repositoryHasEmptyInstance.empty(),
    React.useCallback(
      async (deserialized) => {
        const serialized = JSON.stringify(await repositoryJsonValueSerialization.serialize(Promise.resolve(deserialized)));
        if (process.env.NODE_ENV === "development") {
          try {
            await repositoryJsonValueSerialization.deserialize(JSON.parse(serialized));
          } catch (error) {
            console.error(error);
            console.log(JSON.parse(serialized));
          }
        }
        return serialized;
      },
      [repositoryJsonValueSerialization]
    ),
    React.useCallback(
      async (serialized) => await repositoryJsonValueSerialization.deserialize(JSON.parse(serialized)),
      [repositoryJsonValueSerialization]
    )
  );
  const [current, setCurrent] = React.useState<CommitId | null>(null);
  const change = async (source: Source) => {
    const [newRepository, newCommitId] = await repositoryImplementation.add(repository, {
      source,
      previous: new Set(current ? [current] : []),
      date: new Date(),
      info: null,
    });
    setRepository(newRepository);
    setCurrent(newCommitId);
  };
  const goto = (commitId: CommitId | null) => {
    if (commitId == null) {
      onSource(sourceHasEmptyInstance.empty());
      setCurrent(null);
    } else {
      const commit = repositoryImplementation.get(repository, commitId);
      if (commit) {
        onSource(commit.source);
        setCurrent(commitId);
      }
    }
  };
  const undo = React.useCallback(() => {
    if (current) {
      const previous = repositoryFacadeImplementation.getPreviousCommits(repository, current);
      if (previous?.size === 1) {
        const previousCommitId = [...previous][0];
        const previousCommit = repositoryImplementation.get(repository, previousCommitId);
        if (previousCommit) {
          setCurrent(previousCommitId);
          onSource(previousCommit.source);
        }
      }
    }
  }, [current, onSource, repository, repositoryFacadeImplementation, repositoryImplementation]);
  const redo = React.useCallback(() => {
    if (current) {
      const next = repositoryFacadeImplementation.getNextCommits(repository, current);
      if (next?.size === 1) {
        const nextCommitId = [...next][0];
        const nextCommit = repositoryImplementation.get(repository, nextCommitId);
        if (nextCommit) {
          setCurrent(nextCommitId);
          onSource(nextCommit.source);
        }
      }
    }
  }, [current, onSource, repository, repositoryFacadeImplementation, repositoryImplementation]);
  React.useLayoutEffect(() => {
    const shortcuts = defaultShortcuts;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === shortcuts.redo.key &&
        event.ctrlKey === shortcuts.redo.ctrl &&
        event.shiftKey === shortcuts.redo.shift
      ) {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key.toLowerCase() === shortcuts.undo.key && event.ctrlKey === shortcuts.undo.ctrl) {
        event.preventDefault();
        undo();
        return;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);
  return {
    repository,
    current,
    change,
    goto,
    undo,
    redo,
  };
}

export function HistoryGraph<CommitId, Source, Info, Repository>({
  repository,
  selected,
  onSelect,
  commitIdStringSerialization,
  repositoryFacadeImplementation,
  repositoryImplementation,
}: {
  repository: Repository;
  selected: CommitId | null;
  onSelect(commitId: CommitId | null): void;
  commitIdStringSerialization: SerializationInterface<CommitId, string>;
  repositoryImplementation: RepositoryInterface<CommitId, Source, Info, Repository>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, Info, Repository>;
}) {
  const dateFormatter = Intl.DateTimeFormat(undefined, {
    timeStyle: "medium",
    dateStyle: "medium",
  });
  return (
    <CommitGraph<CommitId, Source, Info, Repository>
      repository={repository}
      commitIdStringSerialization={commitIdStringSerialization}
      repositoryFacadeImplementation={repositoryFacadeImplementation}
    >
      {({ commitId, x, y, width, height }) => {
        const commit = repositoryImplementation.get(repository, commitId);
        return (
          <React.Fragment key={commitIdStringSerialization.serialize(commitId)}>
            <text
              x={x}
              y={y}
              css={css`
                fill: var(--text-color);
                user-select: none;
              `}
              dominantBaseline="middle"
            >
              {dateFormatter.format(commit?.date)}
            </text>
            <rect
              x={0}
              y={y - height / 2}
              width={width}
              height={height}
              css={css`
                opacity: 0.5;
                fill: ${selected === commitId ? "var(--background-color)" : "transparent"};
                :hover {
                  fill: var(--hover-background-color);
                }
              `}
              onClick={() => {
                onSelect(commitId);
              }}
            />
          </React.Fragment>
        );
      }}
    </CommitGraph>
  );
}
