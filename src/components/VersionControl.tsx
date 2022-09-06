import React from "react";
import Immutable from "immutable";
import { css } from "styled-components/macro";
import { useLocalStorageState } from "./useLocalStorageState";
import { Source } from "./Source";

type Repository<CommitId extends string, Source> = {
  addCommit(params: {
    commitId: CommitId;
    source: Source;
    previous: Set<CommitId>;
    date: Date;
    author: string;
    description: string;
  }): Repository<CommitId, Source>;
  getCommit(params: { commitId: CommitId }):
    | {
        source: Source;
        date: Date;
        author: string;
        description: string;
      }
    | undefined;
  getRoots(): Set<CommitId>;
  getTips(): Set<CommitId>;
  getCommitsByDate(): Array<CommitId>;
  getNextCommits(commitId: CommitId): Set<CommitId>;
  getPreviousCommits(commitId: CommitId): Set<CommitId>;
  toJSON(sourceToJson: (source: Source) => string): string;
  fromJSON(
    json: string,
    jsonToSource: (json: string) => Source
  ): Repository<CommitId, Source>;
};

type CommitData<CommitId extends string, Source> = {
  commitId: CommitId;
  source: Source;
  previous: Set<CommitId>;
  date: Date;
  author: string;
  description: string;
};

type NaiveRepositoryState<CommitId extends string, Source> = {
  pendingCommitMap: Immutable.Map<
    CommitId,
    Immutable.Map<CommitId, CommitData<CommitId, Source>>
  >;
  commitMap: Immutable.Map<
    CommitId,
    { source: Source; date: Date; author: string; description: string }
  >;
  previousMap: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
  nextMap: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
  tips: Immutable.Set<CommitId>;
  roots: Immutable.Set<CommitId>;
  byDate: Immutable.List<CommitId>;
};

export function naiveRepository<CommitId extends string, Source>(
  state: NaiveRepositoryState<CommitId, Source> = {
    pendingCommitMap: Immutable.Map(),
    commitMap: Immutable.Map(),
    previousMap: Immutable.Map(),
    nextMap: Immutable.Map(),
    tips: Immutable.Set(),
    roots: Immutable.Set(),
    byDate: Immutable.List(),
  }
): Repository<CommitId, Source> {
  function isAncestor(childCommitId: CommitId, parentCommitId: CommitId) {
    const previous = state.previousMap.get(childCommitId);
    if (!previous) throw new Error();
    if (previous.has(parentCommitId)) return true;
    for (const parent of previous.keys()) {
      if (isAncestor(parent, parentCommitId)) return true;
    }
    return false;
  }
  function withoutUnnecessaryParents(parents: Set<CommitId>) {
    const without = new Set(parents);
    if (parents.size <= 1) return without;
    for (const youngerParent of parents) {
      for (const olderParent of parents) {
        if (isAncestor(youngerParent, olderParent)) without.delete(olderParent);
      }
    }
    return without;
  }
  return {
    addCommit(params) {
      if (state.commitMap.has(params.commitId)) return naiveRepository(state); // TODO remove when implemented checksum as commitId
      if (params.previous.size > 8) throw new Error();
      const missingPrevious = [...params.previous].find(
        (previous) => !state.commitMap.has(previous)
      );
      if (missingPrevious) {
        return naiveRepository<CommitId, Source>({
          ...state,
          pendingCommitMap: state.pendingCommitMap.update(
            missingPrevious,
            (
              pending = Immutable.Map<CommitId, CommitData<CommitId, Source>>()
            ) => pending.set(params.commitId, params)
          ),
        });
      }
      params = {
        ...params,
        previous: withoutUnnecessaryParents(params.previous),
      };
      const repositoryStateWithNewCommit: NaiveRepositoryState<
        CommitId,
        Source
      > = {
        pendingCommitMap: state.pendingCommitMap,
        commitMap: state.commitMap.set(params.commitId, {
          source: params.source,
          date: params.date,
          author: params.author,
          description: params.description,
        }),
        previousMap: state.previousMap.update(
          params.commitId,
          (previous = Immutable.Set<CommitId>()) =>
            [...params.previous].reduce(
              (previous, previousCommitId) => previous.add(previousCommitId),
              previous
            )
        ),
        nextMap: [...params.previous].reduce(
          (nextMap, previousCommitId) =>
            nextMap.update(previousCommitId, (next = Immutable.Set()) =>
              next.add(params.commitId)
            ),
          state.nextMap.update(
            params.commitId,
            (next = Immutable.Set()) => next
          )
        ),
        roots:
          params.previous.size === 0
            ? state.roots.add(params.commitId)
            : state.roots,
        tips: [...params.previous].reduce(
          (tips, previousCommitd) => tips.remove(previousCommitd),
          state.nextMap.get(params.commitId, Immutable.Set()).size === 0
            ? state.tips.add(params.commitId)
            : state.tips
        ),
        byDate: state.byDate
          .unshift(params.commitId)
          .sortBy((commitId) => state.commitMap.get(commitId)?.date),
      };
      const pending = state.pendingCommitMap.get(params.commitId);
      if (!pending) return naiveRepository(repositoryStateWithNewCommit);
      return pending.reduce(
        (repository, commitData) => repository.addCommit(commitData),
        naiveRepository({
          ...repositoryStateWithNewCommit,
          pendingCommitMap: state.pendingCommitMap.delete(params.commitId),
        })
      );
    },
    getCommit(params) {
      return state.commitMap.get(params.commitId);
    },
    getRoots() {
      return new Set(state.roots.toArray());
    },
    getTips() {
      return new Set(state.tips.toArray());
    },
    getCommitsByDate() {
      return state.byDate.reverse().toArray();
    },
    getNextCommits(commitId) {
      const next = state.nextMap.get(commitId);
      if (!next) throw new Error();
      return new Set(next.toArray());
    },
    getPreviousCommits(commitId) {
      const previous = state.previousMap.get(commitId);
      if (!previous) throw new Error();
      return new Set(previous.toArray());
    },
    toJSON(sourceToJson) {
      return JSON.stringify(
        Object.fromEntries(
          [...state.commitMap.entries()].map(([commitId, data]) => {
            return [
              commitId,
              {
                ...data,
                source: sourceToJson(data.source),
                previous: [...this.getPreviousCommits(commitId)],
              },
            ];
          })
        )
      );
    },
    fromJSON(json, jsonToSource) {
      return Object.entries(JSON.parse(json)).reduce(
        (repository, [commitId, { source, previous, ...data }]: any) =>
          repository.addCommit({
            ...data,
            commitId,
            source: jsonToSource(source),
            previous: new Set(previous),
            date: new Date(data.date),
          }),
        naiveRepository<CommitId, Source>(state)
      );
    },
  };
}

function plotGraph<CommitId extends string, Source>(
  repository: Repository<CommitId, Source>
) {
  let coordinates = Immutable.Map<CommitId, { x: number; y: number }>();
  const commitsByDate = repository.getCommitsByDate();
  for (let i = 0; i < commitsByDate.length; i++) {
    const commitId = commitsByDate[i];
    coordinates = coordinates.set(commitId, { x: 0, y: i + 1 });
  }
  let x = 0;
  const loop = (commitId: CommitId) => {
    const coord = coordinates.get(commitId) as { x: number; y: number };
    if (coord.x === 0)
      coordinates = coordinates.set(commitId, { x, y: coord.y });
    const nextCommits = [...repository.getNextCommits(commitId)];
    for (let i = 0; i < nextCommits.length; i++) {
      const nextCommit = nextCommits[i];
      if (i > 0) x++;
      loop(nextCommit);
    }
  };
  for (const rootCommitId of repository.getRoots()) {
    x++;
    loop(rootCommitId);
  }
  return { coordinates, width: x, height: commitsByDate.length };
}

export function VersionControlGraph<CommitId extends string, Source>({
  repository,
  children,
}: {
  repository: Repository<CommitId, Source>;
  children: (coords: {
    commitId: CommitId;
    x: number;
    y: number;
    width: number;
    height: number;
  }) => React.ReactNode;
}) {
  const verticalGap = 20;
  const horizontalGap = 20;
  const graph = plotGraph(repository);
  return (
    <svg width={"100%"} height={graph.height * verticalGap}>
      {Array.from(graph.coordinates.entries(), ([commitId, { x, y }]) => {
        return (
          <g key={commitId}>
            <circle
              cx={x * horizontalGap - horizontalGap / 2}
              cy={y * verticalGap - verticalGap / 2}
              r={Math.min(verticalGap, horizontalGap) / 3}
              css={css`
                fill: var(--text-color);
              `}
            />
            {[...repository.getPreviousCommits(commitId)].map(
              (previousCommitId) => {
                const prev = graph.coordinates.get(previousCommitId) as {
                  x: number;
                  y: number;
                };
                const from = {
                  x: x * horizontalGap - horizontalGap / 2,
                  y: y * verticalGap - verticalGap / 2,
                };
                const to = {
                  x: prev.x * horizontalGap - horizontalGap / 2,
                  y: prev.y * verticalGap - verticalGap / 2,
                };
                let d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
                if (from.x > to.x) {
                  d = `
                    M ${from.x} ${from.y}
                    L ${to.x + (from.x - to.x)} ${to.y - verticalGap}
                    Q ${to.x + (from.x - to.x)} ${to.y} ${
                    to.x + (from.x - to.x) - horizontalGap
                  } ${to.y}
                    L ${to.x} ${to.y}`;
                }
                if (from.x < to.x) {
                  d = `
                    M ${from.x} ${from.y}
                    L ${from.x + (to.x - from.x) - horizontalGap} ${from.y}
                    Q ${from.x + (to.x - from.x)} ${from.y} ${
                    from.x + (to.x - from.x)
                  } ${from.y + verticalGap}
                    L ${to.x} ${to.y}`;
                }
                return (
                  <path
                    key={previousCommitId}
                    css={css`
                      stroke-width: ${Math.min(verticalGap, horizontalGap) / 6};
                      stroke: var(--text-color);
                      fill: transparent;
                    `}
                    d={d}
                  />
                );
              }
            )}
          </g>
        );
      })}
      {Array.from(graph.coordinates.entries(), ([commitId, { x, y }]) =>
        children({
          commitId,
          x: graph.width * horizontalGap,
          y: y * verticalGap - verticalGap / 2,
          width: "100%" as any as number,
          height: verticalGap,
        })
      )}
    </svg>
  );
}

export function VersionControlUI<CommitId extends string, Source>({
  source,
  onSource,
  repository,
  onRepositoryChange,
}: {
  source: Source;
  repository: Repository<CommitId, Source>;
  onRepositoryChange(repository: Repository<CommitId, Source>): void;
  onSource(source: Source): void;
}) {
  const [selected, setSelected] = React.useState<Set<CommitId>>(new Set());
  const [author, setAuthor] = React.useState("");
  const [description, setDescription] = React.useState("");
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        height: 100%;
        background-color: var(--background-color-secondary);
      `}
    >
      <CollapsibleSection title="CREATE COMMIT">
        <div>
          <label>author</label>:
          <input
            value={author}
            onChange={(event) => setAuthor(event.currentTarget.value)}
            css={css`
              ${inputCss}
            `}
          />
        </div>
        <div>
          <label>description</label>:
          <textarea
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            css={css`
              width: 100%;
              height: 200px;
              box-sizing: border-box;
              ${inputCss}
            `}
          />
        </div>
        <button
          onClick={() => {
            if (!author.trim() || !description.trim()) {
              alert("provide an author and a description for the commit");
              return;
            }
            const commitId = Math.random().toString() as CommitId;
            onRepositoryChange(
              repository.addCommit({
                commitId,
                source,
                previous: new Set(selected.size > 0 ? [...selected] : []),
                date: new Date(),
                author,
                description,
              })
            );
            setDescription("");
            setSelected(new Set([commitId]));
          }}
          css={css``}
        >
          commit
        </button>
        <div>
          <div>previous({selected.size}):</div>
          {[...selected].map((commitId) => {
            return <div key={commitId}>{commitId}</div>;
          })}
        </div>
        <p>the new commit will be based on selected commits</p>
        <p>click - select commit</p>
        <p>ctrl + click - select more commits</p>
      </CollapsibleSection>
      <CollapsibleSection title="COMMIT GRAPH">
        <VersionControlGraph<CommitId, Source> repository={repository}>
          {({ commitId, x, y, width, height }) => {
            const commit = repository.getCommit({ commitId });
            return (
              <React.Fragment>
                <text
                  x={x}
                  y={y}
                  css={css`
                    fill: var(--text-color);
                    user-select: none;
                  `}
                  dominantBaseline="middle"
                >
                  {commit?.description}
                </text>
                <rect
                  x={0}
                  y={y - height / 2}
                  width={width}
                  height={height}
                  css={css`
                    opacity: 0.5;
                    fill: ${selected.has(commitId)
                      ? "var(--background-color)"
                      : "transparent"};
                    :hover {
                      fill: var(--hover-background-color);
                    }
                  `}
                  onClick={(event) => {
                    if (event.ctrlKey) {
                      setSelected(new Set([...selected, commitId]));
                    } else {
                      setSelected(
                        new Set([...selected][0] === commitId ? [] : [commitId])
                      );
                    }
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    if (commit) onSource(commit.source);
                    setSelected(new Set([commitId]));
                  }}
                />
              </React.Fragment>
            );
          }}
        </VersionControlGraph>
      </CollapsibleSection>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = React.useState(true);
  return (
    <div
      css={css`
        flex-grow: ${isOpen ? 1 : 0};
        display: flex;
        flex-direction: column;
      `}
    >
      <div
        css={css`
          background-color: var(--background-color);
          padding: 0px 1em;
          user-select: none;
          cursor: pointer;
        `}
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        {title}
      </div>
      {isOpen && (
        <div
          css={css`
            flex-grow: 1;
            background-color: var(--background-color-secondary);
            position: relative;
          `}
        >
          <div
            css={css`
              position: absolute;
              width: 100%;
              height: 100%;
              overflow: auto;
              padding: 0.5em 1em;
              box-sizing: border-box;
            `}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCss = css`
  background-color: var(--background-color);
  outline: none;
  border: none;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
`;

export function useHistory({ onSource }: { onSource(source: Source): void }) {
  type CommitId = string;
  const [repository, setRepository] = useLocalStorageState(
    "history",
    naiveRepository<CommitId, Source>(),
    React.useCallback((repository) => repository.toJSON(Source.toJSON), []),
    React.useCallback(
      (serialized) =>
        naiveRepository<CommitId, Source>().fromJSON(
          serialized,
          Source.fromJSON
        ),
      []
    )
  );
  const [current, setCurrent] = React.useState<CommitId | null>(null);
  const undo = () => {
    if (current) {
      const previous = repository.getPreviousCommits(current);
      if (previous.size === 1) {
        const previousCommitId = [...previous][0];
        const previousCommit = repository.getCommit({
          commitId: previousCommitId,
        });
        if (previousCommit) {
          setCurrent(previousCommitId);
          onSource(previousCommit.source);
        }
      }
    }
  };
  const redo = () => {
    if (current) {
      const next = repository.getNextCommits(current);
      if (next.size === 1) {
        const nextCommitId = [...next][0];
        const nextCommit = repository.getCommit({
          commitId: nextCommitId,
        });
        if (nextCommit) {
          setCurrent(nextCommitId);
          onSource(nextCommit.source);
        }
      }
    }
  };
  const change = (source: Source) => {
    const commitId = Math.random().toString() as CommitId;
    setRepository(
      repository.addCommit({
        commitId,
        source,
        previous: new Set(current ? [current] : []),
        date: new Date(),
        author: "",
        description: "",
      })
    );
    setCurrent(commitId);
  };
  const goto = (commitId: CommitId) => {
    const commit = repository.getCommit({ commitId });
    if (commit) {
      onSource(commit.source);
      setCurrent(commitId);
    }
  };
  return {
    repository,
    current,
    change,
    undo,
    redo,
    goto,
  };
}

export function HistoryGraph<CommitId extends string, Source>({
  repository,
  selected,
  onSelect,
}: {
  repository: Repository<CommitId, Source>;
  selected: CommitId | null;
  onSelect(commitId: CommitId): void;
}) {
  const dateFormatter = Intl.DateTimeFormat(undefined, {
    timeStyle: "medium",
    dateStyle: "medium",
  });
  return (
    <VersionControlGraph<CommitId, Source> repository={repository}>
      {({ commitId, x, y, width, height }) => {
        const commit = repository.getCommit({ commitId });
        return (
          <React.Fragment>
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
                fill: ${selected === commitId
                  ? "var(--background-color)"
                  : "transparent"};
                :hover {
                  fill: var(--hover-background-color);
                }
              `}
              onClick={(event) => {
                onSelect(commitId);
              }}
            />
          </React.Fragment>
        );
      }}
    </VersionControlGraph>
  );
}
