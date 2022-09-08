import { Brand, guard, HasEmptyIntance, JsonValue, SerializationInterface } from "../utils";
import Immutable from "immutable";
import jsonStableStringify from "fast-json-stable-stringify";

export type RepositoryInterface<CommitId, Source, Info, Repository> = {
  all(repository: Repository): IterableIterator<[CommitId, CommitData<CommitId, Source, Info>]>;
  get(repository: Repository, commitId: CommitId): CommitData<CommitId, Source, Info> | null;
  add(repository: Repository, commit: CommitData<CommitId, Source, Info>): Promise<[Repository, CommitId]>;
  rem(repository: Repository, commitId: CommitId): Repository;
};

export type CommitData<CommitId, Source, Info> = {
  source: Source;
  previous: Set<CommitId>;
  date: Date;
  info: Info;
};

export type RepositoryFacadeInterface<CommitId, Source, Info, Repository> = {
  getRoots(repository: Repository): Set<CommitId>;
  getTips(repository: Repository): Set<CommitId>;
  getCommitsByDate(repository: Repository): IterableIterator<CommitId>;
  getNextCommits(repository: Repository, commitId: CommitId): Set<CommitId> | null;
  getPreviousCommits(repository: Repository, commitId: CommitId): Set<CommitId> | null;
};

export type HexSHA256 = Brand<string, "HexSHA256">;
export async function hexSHA256FromString(string: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(string))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("") as HexSHA256;
}
export const hexSHA256StringSerialization: SerializationInterface<HexSHA256, string> = {
  serialize(deserialized) {
    return deserialized;
  },
  deserialize(serialized) {
    return serialized as HexSHA256;
  },
};

type ImmutableJsRepositoryState<CommitId, Source, Info> = {
  waitingCommits: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
  pendingCommits: Immutable.Set<CommitId>;
  commitMap: Immutable.Map<
    CommitId,
    {
      source: Source;
      previous: Set<CommitId>;
      date: Date;
      info: Info;
    }
  >;
  previousMap: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
  nextMap: Immutable.Map<CommitId, Immutable.Set<CommitId>>;
  tips: Immutable.Set<CommitId>;
  roots: Immutable.Set<CommitId>;
  byDate: Immutable.List<CommitId>;
};

export function createImmutableJsRepositoryHasEmptyInstance<CommitId, Source, Info>(): HasEmptyIntance<
  ImmutableJsRepositoryState<CommitId, Source, Info>
> {
  return {
    empty() {
      return {
        waitingCommits: Immutable.Map(),
        pendingCommits: Immutable.Set(),
        commitMap: Immutable.Map(),
        previousMap: Immutable.Map(),
        nextMap: Immutable.Map(),
        tips: Immutable.Set(),
        roots: Immutable.Set(),
        byDate: Immutable.List(),
      };
    },
  };
}

export function createImmutableJsRepositoryImplementation<Source, Info>(
  sourceJsonValueSerialization: SerializationInterface<Source, JsonValue>,
  infoJsonValueSerialization: SerializationInterface<Info, JsonValue>
): RepositoryInterface<HexSHA256, Source, Info, ImmutableJsRepositoryState<HexSHA256, Source, Info>> {
  const implementation: RepositoryInterface<HexSHA256, Source, Info, ImmutableJsRepositoryState<HexSHA256, Source, Info>> = {
    all(repository) {
      return repository.commitMap.entries();
    },
    get(repository, commitId) {
      return repository.commitMap.get(commitId, null);
    },
    async add(repository, commit) {
      const commitId = await hexSHA256FromString(
        jsonStableStringify({
          source: sourceJsonValueSerialization.serialize(commit.source),
          previous: [...commit.previous].sort(),
          date: commit.date.getTime(),
          info: infoJsonValueSerialization.serialize(commit.info),
        })
      );
      function isAncestor(childCommitId: HexSHA256, parentCommitId: HexSHA256) {
        const previous = repository.previousMap.get(childCommitId);
        if (!previous) throw new Error();
        if (previous.has(parentCommitId)) return true;
        for (const parent of previous.keys()) {
          if (isAncestor(parent, parentCommitId)) return true;
        }
        return false;
      }
      function withoutUnnecessaryParents(parents: Set<HexSHA256>) {
        const without = new Set(parents);
        if (parents.size <= 1) return without;
        for (const youngerParent of parents) {
          for (const olderParent of parents) {
            if (isAncestor(youngerParent, olderParent)) without.delete(olderParent);
          }
        }
        return without;
      }
      if (repository.commitMap.has(commitId))
        return [repository, commitId] as [ImmutableJsRepositoryState<HexSHA256, Source, Info>, HexSHA256];
      if (commit.previous.size > 8) throw new Error();
      const missingPrevious = [...commit.previous].find((previous) => repository.pendingCommits.has(previous));
      if (missingPrevious) {
        return [
          {
            ...repository,
            commitMap: repository.commitMap.set(commitId, commit),
            pendingCommits: repository.pendingCommits.add(commitId),
            waitingCommits: repository.waitingCommits.update(missingPrevious, (pending = Immutable.Set<HexSHA256>()) =>
              pending.add(commitId)
            ),
          },
          commitId,
        ] as [ImmutableJsRepositoryState<HexSHA256, Source, Info>, HexSHA256];
      }
      commit = {
        ...commit,
        previous: withoutUnnecessaryParents(commit.previous),
      };
      const repositoryStateWithNewCommit: ImmutableJsRepositoryState<HexSHA256, Source, Info> = {
        waitingCommits: repository.waitingCommits,
        pendingCommits: repository.pendingCommits,
        commitMap: repository.commitMap.set(commitId, commit),
        previousMap: repository.previousMap.update(commitId, (previous = Immutable.Set()) =>
          [...commit.previous].reduce((previous, previousCommitId) => previous.add(previousCommitId), previous)
        ),
        nextMap: [...commit.previous].reduce(
          (nextMap, previousCommitId) => nextMap.update(previousCommitId, (next = Immutable.Set()) => next.add(commitId)),
          repository.nextMap.update(commitId, (next = Immutable.Set()) => next)
        ),
        roots: commit.previous.size === 0 ? repository.roots.add(commitId) : repository.roots,
        tips: [...commit.previous].reduce(
          (tips, previousCommitd) => tips.remove(previousCommitd),
          repository.nextMap.get(commitId, Immutable.Set()).size === 0 ? repository.tips.add(commitId) : repository.tips
        ),
        byDate: repository.byDate.unshift(commitId).sortBy((commitId) => repository.commitMap.get(commitId)?.date),
      };
      const waiting = repository.waitingCommits.get(commitId);
      if (!waiting) return [repositoryStateWithNewCommit, commitId] as [ImmutableJsRepositoryState<HexSHA256, Source, Info>, HexSHA256];
      return [
        await waiting.reduce(
          async (repository, commitId) => {
            const commit = implementation.get(await repository, commitId);
            if (!commit) throw new Error();
            const [newRepository] = await implementation.add(await repository, commit);
            return newRepository;
          },
          Promise.resolve({
            ...repositoryStateWithNewCommit,
            waitingCommits: repository.waitingCommits.delete(commitId),
          })
        ),
        commitId,
      ] as [ImmutableJsRepositoryState<HexSHA256, Source, Info>, HexSHA256];
    },
    rem(repository, commitId) {
      throw new Error("not implemented");
    },
  };
  return implementation;
}

export function createImmutableJsRepositoryFacadeImplementation<CommitId, Source, Info>(): RepositoryFacadeInterface<
  CommitId,
  Source,
  Info,
  ImmutableJsRepositoryState<CommitId, Source, Info>
> {
  return {
    getRoots(repository) {
      return new Set(repository.roots.values());
    },
    getTips(repository) {
      return new Set(repository.tips.values());
    },
    getCommitsByDate(repository) {
      return repository.byDate.reverse().values();
    },
    getPreviousCommits(repository, commitId) {
      const previous = repository.previousMap.get(commitId);
      if (!previous) throw new Error();
      return new Set(previous.values());
    },
    getNextCommits(repository, commitId) {
      const next = repository.nextMap.get(commitId);
      if (!next) throw new Error();
      return new Set(next.values());
    },
  };
}

export function createImmutableJsRepositoryStateJsonValueSerialization<CommitId, Source, Info>(
  sourceJsonValueSerialization: SerializationInterface<Source, JsonValue>,
  commitIdStringSerialization: SerializationInterface<CommitId, string>,
  infoJsonValueSerialization: SerializationInterface<Info, JsonValue>,
  immutableJsRepositoryStateHasEmptyInstance: HasEmptyIntance<ImmutableJsRepositoryState<CommitId, Source, Info>>,
  immutableJsRepositoryStateRepositoryImplementation: RepositoryInterface<
    CommitId,
    Source,
    Info,
    ImmutableJsRepositoryState<CommitId, Source, Info>
  >
): SerializationInterface<Promise<ImmutableJsRepositoryState<CommitId, Source, Info>>, Promise<JsonValue>> {
  return {
    async serialize(deserialized) {
      return [...(await deserialized).commitMap.entries()].map(([commitId, data]): JsonValue => {
        return {
          source: sourceJsonValueSerialization.serialize(data.source),
          previous: [...data.previous].map((previousCommitId) => commitIdStringSerialization.serialize(previousCommitId)),
          date: data.date.getTime(),
          info: infoJsonValueSerialization.serialize(data.info),
        };
      });
    },
    async deserialize(serialized) {
      const value = await serialized;
      if (!guard.isArray(value)) throw new Error();
      return value.reduce(async (repository, item) => {
        if (!guard.isObject(item)) throw new Error();
        if (!("source" in item)) throw new Error();
        if (!("previous" in item && guard.isArray(item.previous))) throw new Error();
        if (!("date" in item && guard.isNumber(item.date))) throw new Error();
        if (!("info" in item)) throw new Error();
        const [newRepository] = await immutableJsRepositoryStateRepositoryImplementation.add(await repository, {
          source: sourceJsonValueSerialization.deserialize(item.source),
          previous: new Set(
            item.previous.map((previousCommitId) => {
              if (!guard.isString(previousCommitId)) throw new Error();
              return commitIdStringSerialization.deserialize(previousCommitId);
            })
          ),
          date: new Date(item.date),
          info: infoJsonValueSerialization.deserialize(item.info),
        });
        return newRepository;
      }, Promise.resolve(immutableJsRepositoryStateHasEmptyInstance.empty()));
    },
  };
}
