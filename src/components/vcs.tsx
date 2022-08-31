import React from "react";
import Immutable from "immutable";
import { css } from "styled-components/macro";

type Repository<CommitId extends string, Source> = {
  addCommit(params: {
    commitId: CommitId;
    source: Source;
    previous: Set<CommitId>;
    date: Date;
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
  repository
    .getCommitsByDate()
    .forEach(
      (commitId, index) =>
        (coordinates = coordinates.set(commitId, { x: 0, y: index + 1 }))
    );
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
  return [coordinates, x] as const;
}

function VersionControlGraph<CommitId extends string, Source>({
  repository,
  selected,
  onSelect,
}: {
  repository: Repository<CommitId, Source>;
  selected: CommitId | null;
  onSelect(commitId: CommitId): void;
}) {
  const verticalGap = 20;
  const horizontalGap = 20;
  const color = "white";
  const width = 400;
  const height = 600;
  const [coordinates, graphWidth] = plotGraph(repository);
  return (
    <svg width={width} height={height}>
      {Array.from(coordinates.entries(), ([commitId, { x, y }]) => {
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
              x={graphWidth * horizontalGap}
              y={y * verticalGap - verticalGap / 2}
              fill={color}
              dominantBaseline="middle"
            >
              {commit?.description}
            </text>
            {[...repository.getPreviousCommits(commitId)].map(
              (previousCommitId) => {
                const prev = coordinates.get(previousCommitId) as {
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
                    Q ${to.x + (from.x - to.x)} ${to.y} ${to.x} ${to.y}`;
                }
                if (from.x < to.x) {
                  d = `
                    M ${from.x} ${from.y}
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
                opacity: ${commitId === selected ? "0.5" : "0"};
                fill: ${color};
                :hover {
                  fill: ${color};
                  opacity: 0.2;
                }
              `}
              onClick={() => onSelect(commitId)}
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
  const [currentCommitId, setCurrentCommitId] = React.useState<CommitId | null>(
    null
  );
  const [description, setDescription] = React.useState("");
  React.useEffect(() => {
    setCurrentCommitId("3" as any);
    setRepository((repository) =>
      repository
        .addCommit({
          commitId: "1" as CommitId,
          date: new Date("2001"),
          description: "first",
          source: null as any,
          previous: new Set([]),
        })
        .addCommit({
          commitId: "2" as CommitId,
          date: new Date("2002"),
          description: "second",
          source: null as any,
          previous: new Set(["1" as CommitId]),
        })
        .addCommit({
          commitId: "3" as CommitId,
          date: new Date("2003"),
          description: "third",
          source: null as any,
          previous: new Set(["1" as CommitId]),
        })
    );
  }, []);
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
        <textarea
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
          css={css`
            width: 100%;
            box-sizing: border-box;
          `}
        />
      </div>
      <button
        onClick={() => {
          const commitId = Math.random().toString() as CommitId;
          setRepository(
            repository.addCommit({
              commitId,
              date: new Date(),
              previous: new Set(currentCommitId ? [currentCommitId] : []),
              source,
              description,
            })
          );
          setDescription("");
          setCurrentCommitId(commitId);
        }}
        css={css`
          width: ${width};
        `}
      >
        commit
      </button>
      <VersionControlGraph<CommitId, Source>
        repository={repository}
        selected={currentCommitId}
        onSelect={setCurrentCommitId}
      />
    </div>
  );
}
