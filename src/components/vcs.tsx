import React from "react";
import Immutable from "immutable";
import { css } from "styled-components/macro";

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
        description: string;
      }
    | undefined;
  getRoots(): Set<CommitId>;
  getTips(): Set<CommitId>;
  getCommitsByDate(): Array<CommitId>;
  getNextCommits(commitId: CommitId): Set<CommitId>;
  getPreviousCommits(commitId: CommitId): Set<CommitId>;
};

export function naiveRepository<CommitId extends string, Source>(
  state: {
    commitMap: Immutable.Map<
      CommitId,
      { source: Source; date: Date; description: string }
    >;
    previousMap: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
    nextMap: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
    tips: Immutable.Set<CommitId>;
    roots: Immutable.Set<CommitId>;
    byDate: Immutable.List<CommitId>;
  } = {
    commitMap: Immutable.Map(),
    previousMap: Immutable.Map(),
    nextMap: Immutable.Map(),
    tips: Immutable.Set(),
    roots: Immutable.Set(),
    byDate: Immutable.List(),
  }
): Repository<CommitId, Source> {
  return {
    addCommit(params) {
      if (state.commitMap.has(params.commitId)) return naiveRepository(state);
      return naiveRepository({
        commitMap: state.commitMap.set(params.commitId, {
          source: params.source,
          date: params.date,
          description: params.description,
        }),
        previousMap: state.previousMap.update(
          params.commitId,
          (previous = Immutable.Set()) =>
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
          state.nextMap
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
      });
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
      return new Set(
        state.nextMap.get(commitId, Immutable.Set<CommitId>()).toArray()
      );
    },
    getPreviousCommits(commitId) {
      return new Set(
        state.previousMap.get(commitId, Immutable.Set<CommitId>()).toArray()
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

function VersionControlGraph<CommitId extends string, Source>({
  repository,
  selected,
  onSelect,
  width = 400,
}: {
  repository: Repository<CommitId, Source>;
  selected: Set<CommitId>;
  onSelect(commitIds: Set<CommitId>): void;
  width?: number;
}) {
  const verticalGap = 20;
  const horizontalGap = 20;
  const color = "white";
  const graph = plotGraph(repository);
  return (
    <svg width={width} height={graph.height * verticalGap}>
      {Array.from(graph.coordinates.entries(), ([commitId, { x, y }]) => {
        const commit = repository.getCommit({ commitId });
        return (
          <g key={commitId}>
            <circle
              cx={x * horizontalGap - horizontalGap / 2}
              cy={y * verticalGap - verticalGap / 2}
              r={Math.min(verticalGap, horizontalGap) / 3}
              fill={color}
            />
            <text
              x={graph.width * horizontalGap}
              y={y * verticalGap - verticalGap / 2}
              fill={color}
              dominantBaseline="middle"
            >
              {commit?.description}
            </text>
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
                    strokeWidth={Math.min(verticalGap, horizontalGap) / 6}
                    stroke={color}
                    fill="transparent"
                    d={d}
                  />
                );
              }
            )}
            <rect
              x={0}
              y={y * verticalGap - verticalGap}
              width={width}
              height={verticalGap}
              css={css`
                opacity: ${selected.has(commitId) ? "0.5" : "0"};
                fill: ${color};
                :hover {
                  fill: ${color};
                  opacity: 0.2;
                }
              `}
              onClick={(event) => {
                if (event.ctrlKey) {
                  onSelect(new Set([...selected, commitId]));
                } else {
                  onSelect(new Set([commitId]));
                }
              }}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function VersionControlUI<CommitId extends string, Source>({
  source,
}: {
  source: Source;
}) {
  const width = "400px";
  const [repository, setRepository] = React.useState(
    naiveRepository<CommitId, Source>()
  );
  const [selected, setSelected] = React.useState<Set<CommitId>>(new Set());
  const [author, setAuthor] = React.useState("");
  const [description, setDescription] = React.useState("");
  return (
    <div
      css={css`
        width: ${width};
      `}
    >
      <div
        css={css`
          width: ${width};
        `}
      >
        <label>author</label>:
        <input
          value={author}
          onChange={(event) => setAuthor(event.currentTarget.value)}
        />
      </div>
      <div
        css={css`
          width: ${width};
        `}
      >
        <label>description</label>:
        <textarea
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          css={css`
            width: 100%;
            box-sizing: border-box;
          `}
        />
      </div>
      <div>
        <div>previous({selected.size}):</div>
        {[...selected].map((commitId) => {
          return <div key={commitId}>{commitId}</div>;
        })}
      </div>
      <button
        onClick={() => {
          const commitId = Math.random().toString() as CommitId;
          setRepository(
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
        css={css`
          width: ${width};
        `}
      >
        commit
      </button>
      <p>the new commit will be based on selected commits</p>
      <p>click - select commit</p>
      <p>ctrl + click - select more commits</p>
      <div
        css={css`
          width: 400px;
          height: 400px;
          overflow: scroll;
        `}
      >
        <VersionControlGraph<CommitId, Source>
          repository={repository}
          selected={selected}
          onSelect={setSelected}
        />
      </div>
    </div>
  );
}
