export type Shortcuts = typeof defaultShortcuts;

export type Shortcut = {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
};

export const defaultShortcuts = ensure({
  undo: { key: "z", ctrl: true },
  redo: { key: "z", ctrl: true, shift: true },
  escape: { key: "Escape" },
  newVariable: { key: "i", ctrl: true },
  focusAnnotation: { key: ":" },
  focusParameters: { key: " ", ctrl: false },
  focusTerm: { key: "h", ctrl: true },
  focusReference: { key: "=" },
  focusBindings: { key: "l", ctrl: true },
  wrap: { key: "o", ctrl: true },
  delete: { key: "d", ctrl: true },
  goto: { key: "g", ctrl: true },
  toggleLambdaPi: { key: "p", ctrl: true },
  useExisting: { key: "u", ctrl: true },
});

function ensure<V extends Record<string, Shortcut>>(value: V): { [K in keyof V]: Shortcut } {
  return value;
}
