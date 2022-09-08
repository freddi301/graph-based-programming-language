import React from "react";
import { css } from "styled-components/macro";
import { SerializationInterface } from "../utils";
import { RepositoryFacadeInterface } from "./Repository";

function plotGraph<CommitId, Source, Info, Repository>(
  repository: Repository,
  commitIdStringSerialization: SerializationInterface<CommitId, string>,
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, Info, Repository>
) {
  const coordinates = new Map<string, { x: number; y: number }>();
  let i = 0;
  for (const commitId of repositoryFacadeImplementation.getCommitsByDate(repository)) {
    coordinates.set(commitIdStringSerialization.serialize(commitId), { x: 0, y: ++i });
  }
  let x = 0;
  const loop = (commitId: CommitId) => {
    const coord = coordinates.get(commitIdStringSerialization.serialize(commitId));
    if (!coord) throw new Error();
    if (coord.x === 0) coordinates.set(commitIdStringSerialization.serialize(commitId), { x, y: coord.y });
    const nextCommitIds = repositoryFacadeImplementation.getNextCommits(repository, commitId);
    if (!nextCommitIds) throw new Error();
    let j = 0;
    for (const nextCommit of nextCommitIds) {
      if (j++ > 0) x++;
      loop(nextCommit);
    }
  };
  for (const rootCommitId of repositoryFacadeImplementation.getRoots(repository)) {
    x++;
    loop(rootCommitId);
  }
  return { coordinates, width: x, height: i };
}

export function CommitGraph<CommitId, Source, Info, Repository>({
  repository,
  children,
  commitIdStringSerialization,
  repositoryFacadeImplementation,
}: {
  repository: Repository;
  children: (coords: { commitId: CommitId; x: number; y: number; width: number; height: number }) => React.ReactNode;
  commitIdStringSerialization: SerializationInterface<CommitId, string>;
  repositoryFacadeImplementation: RepositoryFacadeInterface<CommitId, Source, Info, Repository>;
}) {
  const verticalGap = 20;
  const horizontalGap = 20;
  const graph = plotGraph(repository, commitIdStringSerialization, repositoryFacadeImplementation);
  return (
    <svg width={graph.width * horizontalGap + 200} height={graph.height * verticalGap}>
      {Array.from(graph.coordinates.entries(), ([commitId, { x, y }]) => {
        const previousCommits = repositoryFacadeImplementation.getPreviousCommits(
          repository,
          commitIdStringSerialization.deserialize(commitId)
        );
        if (!previousCommits) throw new Error();
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
            {[...previousCommits].map((previousCommitId) => {
              const prev = graph.coordinates.get(commitIdStringSerialization.serialize(previousCommitId));
              if (!prev) throw new Error();
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
                    Q ${to.x + (from.x - to.x)} ${to.y} ${to.x + (from.x - to.x) - horizontalGap} ${to.y}
                    L ${to.x} ${to.y}`;
              }
              if (from.x < to.x) {
                d = `
                    M ${from.x} ${from.y}
                    L ${from.x + (to.x - from.x) - horizontalGap} ${from.y}
                    Q ${from.x + (to.x - from.x)} ${from.y} ${from.x + (to.x - from.x)} ${from.y + verticalGap}
                    L ${to.x} ${to.y}`;
              }
              return (
                <path
                  key={commitIdStringSerialization.serialize(previousCommitId)}
                  css={css`
                    stroke-width: ${Math.min(verticalGap, horizontalGap) / 6};
                    stroke: var(--text-color);
                    fill: transparent;
                  `}
                  d={d}
                />
              );
            })}
          </g>
        );
      })}
      {Array.from(graph.coordinates.entries(), ([commitId, { x, y }]) =>
        children({
          commitId: commitIdStringSerialization.deserialize(commitId),
          x: graph.width * horizontalGap,
          y: y * verticalGap - verticalGap / 2,
          width: "100%" as any as number,
          height: verticalGap,
        })
      )}
    </svg>
  );
}
