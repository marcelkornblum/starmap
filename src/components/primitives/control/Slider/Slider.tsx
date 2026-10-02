import { useId, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Slider.module.css';

export interface SliderProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label?: ReactNode;
  disabled?: boolean;
}

export const Slider = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  disabled = false,
  className,
  ...rest
}: SliderProps) => {
  const generatedId = useId();
  const inputId = rest.id || generatedId;
  const combinedClassName = className
    ? `${styles.sliderContainer} ${className}`
    : styles.sliderContainer;

  return (
    <div className={combinedClassName} {...rest}>
      {label && (
        <div className={styles.labelRow}>
          <label htmlFor={inputId}>{label}</label>
          <span className={styles.valueText}>{value}</span>
        </div>
      )}
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={typeof label === 'string' ? label : undefined}
        className={styles.rangeInput}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
};
