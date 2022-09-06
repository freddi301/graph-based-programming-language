export type Shortcut = `${"ctrl-" | ""}${"shift-" | ""}${
  | "alt-"
  | ""}${AllKeys}`;

export type Shortcuts = typeof defaultShortcuts;

export type ShortcutComponents = {
  key: string;
  ctrl?: true;
  shift?: true;
  alt?: true;
};

export function getShortuctComponents(shortcut: Shortcut): ShortcutComponents {
  return {
    ctrl: shortcut.includes("ctrl-") || undefined,
    shift: shortcut.includes("shift-") || undefined,
    alt: shortcut.includes("alt-") || undefined,
    key: shortcut,
  };
}

export const defaultShortcuts = ensure({
  undo: "ctrl-z",
  redo: "ctrl-shift-z",
  escape: "Escape",
});

function ensure<V extends Record<string, Shortcut>>(value: V) {
  return value;
}

type AllKeys = LowerCase | Punctuation | OtherKeys;
type OtherKeys = "Escape";
type Punctuation = "=";
type LowerCase =
  | "q"
  | "w"
  | "e"
  | "r"
  | "t"
  | "y"
  | "u"
  | "i"
  | "o"
  | "o"
  | "p"
  | "a"
  | "s"
  | "d"
  | "f"
  | "g"
  | "h"
  | "j"
  | "k"
  | "l"
  | "z"
  | "x"
  | "c"
  | "v"
  | "b"
  | "n"
  | "m";
