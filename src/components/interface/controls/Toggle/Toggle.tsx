import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
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
  className,
  ...rest
}: ToggleProps) => {
  const combinedClassName = className
    ? `${styles.toggleContainer} ${className}`
    : styles.toggleContainer;

  const handleClick = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      className={combinedClassName}
      data-checked={checked ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      role="switch"
      aria-checked={checked}
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
