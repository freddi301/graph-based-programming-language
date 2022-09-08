import React from "react";

export function useLocalStorageState<State>(
  key: string,
  initial: State,
  serialize: (state: State) => string | Promise<string>,
  deserialize: (serialized: string) => State | Promise<State>
) {
  const [state, setState] = React.useState<State>(initial);
  React.useEffect(() => {
    const saved = window.localStorage.getItem(key);
    if (saved) Promise.resolve(deserialize(saved)).then(setState);
  }, [deserialize, key]);
  const onStateChange = React.useCallback(
    (state: State) => {
      setState(state);
      Promise.resolve(serialize(state)).then((serialized) => window.localStorage.setItem(key, serialized));
    },
    [key, serialize]
  );
  return [state, onStateChange] as const;
}
