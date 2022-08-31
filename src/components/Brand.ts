const brandPrivateSymbol = Symbol();
export type Brand<T, B extends string> = T & {
  [K in typeof brandPrivateSymbol]: B;
};
export function brand<T, B extends string>(value: T) {
  return value as any as Brand<T, B>;
}
