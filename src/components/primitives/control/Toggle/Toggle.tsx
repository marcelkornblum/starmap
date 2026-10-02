import type { HTMLAttributes, ReactNode, KeyboardEvent } from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!disabled && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      className={combinedClassName}
      data-checked={checked ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      {...rest}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.switchTrack}>
        <div className={styles.switchThumb} />
      </div>
      {label && <span>{label}</span>}
    </div>
  );
};
