import { Source, TermId } from "./Source";

export type EditorState = {
  source: Source;
  text: string;
  firstSelectedTerm: TermId | null;
  secondSelectedTerm: TermId | null;
  thirdSelectedTerm: TermId | null;
};
export const EditorState = {
  empty: {
    source: Source.empty,
    text: "",
    firstSelectedTerm: null,
    secondSelectedTerm: null,
    thirdSelectedTerm: null,
  } as EditorState,
};
