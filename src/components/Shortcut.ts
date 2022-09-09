export type Shortcuts = typeof defaultShortcuts;

export type Shortcut = {
  key: string;
  ctrl?: true;
  shift?: true;
  alt?: true;
};

export const defaultShortcuts = ensure({
  undo: { key: "z", ctrl: true },
  redo: { key: "z", ctrl: true, shift: true },
  escape: { key: "Escape" },
  newVariable: { key: "i", ctrl: true },
  annotation: { key: ":" },
  parameters: { key: " " },
});

function ensure<V extends Record<string, Shortcut>>(value: V) {
  return value;
}
