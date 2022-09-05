import React from "react";

export function useLocalStorageState<State>(
  key: string,
  initial: State,
  serialize: (state: State) => string,
  deserialize: (serialized: string) => State
) {
  const [state, setState] = React.useState<State>(initial);
  React.useEffect(() => {
    const saved = window.localStorage.getItem(key);
    if (saved) setState(deserialize(saved));
  }, [deserialize, key]);
  const onStateChange = React.useCallback(
    (state: State) => {
      setState(state);
      window.localStorage.setItem(key, serialize(state));
    },
    [key, serialize]
  );
  return [state, onStateChange] as const;
}
