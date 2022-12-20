// BRAND

const brandPrivateSymbol = Symbol();
export type Brand<T, B extends string> = T & {
  [K in typeof brandPrivateSymbol]: B;
};
export function brand<T, B extends string>(value: T) {
  return value as any as Brand<T, B>;
}

// JSON VALUE

export type JsonValue = null | boolean | number | string | { [x: string]: JsonValue } | Array<JsonValue>;

// SERIALIZATION
export type SerializationInterface<Deserialized, Serialized> = {
  serialize(deserialized: Deserialized): Serialized;
  deserialize(serialized: Serialized): Deserialized;
};

// EMPTY
export type HasEmptyIntance<T> = {
  empty(): T;
};

// guard

export const guard = {
  isNumber(value: unknown): value is number {
    return typeof value === "number";
  },
  isString(value: unknown): value is string {
    return typeof value === "string";
  },
  isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  },
  isArray(value: unknown): value is Array<unknown> {
    return value instanceof Array;
  },
};
