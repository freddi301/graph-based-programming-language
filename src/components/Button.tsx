import { css } from "styled-components/macro";

type ButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick(): void;
  showLabel?: boolean;
  showIcon?: boolean;
};
export function Button({ label, onClick, icon, showLabel = true, showIcon = true }: ButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick()}
      title={label}
      css={css`
        background-color: var(--backgroun-color);
        :hover {
          background-color: var(--hover-background-color);
        }
        border: none;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        color: inherit;
        padding: 0px;
        height: 20px;
        min-width: 20px;
        cursor: pointer;
        border-radius: 4px;
        padding: 0px 4px;
      `}
    >
      {showIcon && icon}
      <span
        css={css`
          display: inline-block;
          width: 4px;
        `}
      />
      {showLabel && label}
    </button>
  );
}
