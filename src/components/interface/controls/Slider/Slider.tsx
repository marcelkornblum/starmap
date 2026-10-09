import { useId, type InputHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Slider.module.css';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
  label?: ReactNode;
  disabled?: boolean;
  containerProps?: HTMLAttributes<HTMLDivElement>;
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
  containerProps,
  ...rest
}: SliderProps) => {
  const generatedId = useId();
  const inputId = rest.id || generatedId;
  const containerClassName = containerProps?.className
    ? `${styles.sliderContainer} ${containerProps.className}`
    : styles.sliderContainer;

  return (
    <div {...containerProps} className={containerClassName}>
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
        className={className ? `${styles.rangeInput} ${className}` : styles.rangeInput}
        onChange={(e) => onChange(Number(e.target.value))}
        {...rest}
      />
    </div>
  );
};
