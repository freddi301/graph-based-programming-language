export class ImmutableMap<Key extends Equals & Hashable, Value> {
  private constructor(
    private buckets: Record<number, Array<{ key: Key; value: Value }>>,
    public readonly size: number
  ) {}
  static empty<Key extends Equals & Hashable, Value>() {
    return new ImmutableMap<Key, Value>({}, 0);
  }
  has(key: Key): boolean {
    const hash = key.hash();
    const bucket = this.buckets[hash];
    if (!bucket) return false;
    return bucket.some((entry) => entry.key.equals(key));
  }
  get(key: Key): Value {
    const hash = key.hash();
    const bucket = this.buckets[hash];
    if (!bucket) throw new Error();
    const entry = bucket.find((entry) => entry.key.equals(key));
    if (!entry) throw new Error();
    return entry.value;
  }
  set(key: Key, value: Value): ImmutableMap<Key, Value> {
    const hash = key.hash();
    const existingBucket = this.buckets[hash];
    const entry = { key, value };
    if (!existingBucket) {
      return new ImmutableMap(
        { ...this.buckets, [hash]: [entry] },
        this.size + 1
      );
    }
    if (existingBucket.some((existingEntry) => existingEntry.key.equals(key))) {
      return new ImmutableMap(
        {
          ...this.buckets,
          [hash]: [
            entry,
            ...existingBucket.filter(
              (existingEntry) => !existingEntry.key.equals(key)
            ),
          ],
        },
        this.size
      );
    } else {
      return new ImmutableMap(
        {
          ...this.buckets,
          [hash]: [entry, ...existingBucket],
        },
        this.size + 1
      );
    }
  }
  rem(key: Key): ImmutableMap<Key, Value> {
    const hash = key.hash();
    const existingList = this.buckets[hash];
    if (!existingList) throw new Error();
    return new ImmutableMap(
      {
        ...this.buckets,
        [hash]: existingList.filter(
          (existingEntry) => !existingEntry.key.equals(key)
        ),
      },
      this.size - 1
    );
  }
  *entries() {
    for (const bucket of Object.values(this.buckets)) {
      for (const { key, value } of bucket) {
        yield [key, value] as const;
      }
    }
  }
}

export interface Equals {
  equals(other: this): boolean;
}

export interface Hashable {
  hash(): number;
}

export class HashUtils {
  static hashString(string: string) {
    let hashed = 0;
    for (let ii = 0; ii < string.length; ii++) {
      hashed = (31 * hashed + string.charCodeAt(ii)) | 0;
    }
    return HashUtils.smi(hashed);
  }
  static smi(i32: number) {
    return ((i32 >>> 1) & 0x40000000) | (i32 & 0xbfffffff);
  }
}
