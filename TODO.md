Store editor state for every commit and restore it
Optionally hide structure
Refactor keyboard interaction as (editorState) => Record<Key, {editorState: EditorState} | null>
Indentation
Add record/record type (when no reference but has bindings)
Refactor purpose dei term + keyword viola (data type, constructor, parameter/attribute, function, lambda, variable, record, record type)
Remove Term -> delete if no more occurences, and recursively for children
If focus in label input do not navigate on left/right arrow
Order roots as bottom-up usage
Positional arguments
Binary operator (with relative precedence, left-roght associativity)

Filesystem api (current directory)

- save to file/folder (history/commit)
- load from file/folder (add to in memory) (history/commit)
  Every commit is stored in a file with hash as name
  A history is a folder of commit files

In history panel let multi-select commits
Diff view
Merge algorithm
Merge view
Collapsible history lines

Refer to termid in another module (but cannot redefine, {moduleId, termid} in termdata, moduleId null means current module)
A module is identified with crypto-hash of a commit
Module must mark exports
Module dependencies graph

Options subpanels (left right arrows)

- right type + alphabetical order
- right type + last recently used
- any type + last recently used
- any type + alphabetical order

Esempi con più implementazioni: map, set, list (to left, to right), vector, number, natural, natural signed, Boolean, byte, string, functor, monad, monoid
