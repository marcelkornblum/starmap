import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'className' | 'style'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
}

export const Toggle = ({
  checked,
  onChange,
  label,
  disabled = false,
  ...rest
}: ToggleProps) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      className={styles.toggleContainer}
      data-checked={checked ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      role="switch"
      aria-checked={checked}
      aria-pressed={checked}
      disabled={disabled}
      onClick={handleClick}
      {...rest}
    >
      <div className={styles.switchTrack}>
        <div className={styles.switchThumb} />
      </div>
      {label && <span>{label}</span>}
    </button>
  );
};
