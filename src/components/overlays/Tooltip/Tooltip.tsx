import { useId, isValidElement, cloneElement, type HTMLAttributes, type ReactNode, type ReactElement } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  text: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children?: ReactNode;
  id?: string;
}

export const Tooltip = ({
  text,
  position = 'top',
  children,
  id: customId,
  className,
  ...rest
}: TooltipProps) => {
  const generatedId = useId();
  const tooltipId = customId || generatedId;

  const combinedClassName = className
    ? `${styles.tooltip} ${className}`
    : styles.tooltip;

  const triggerElement = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': [
          (children.props as { 'aria-describedby'?: string })?.['aria-describedby'],
          tooltipId,
        ]
          .filter(Boolean)
          .join(' ') || undefined,
      })
    : children;

  return (
    <div className={styles.tooltipWrapper}>
      {triggerElement}
      <div
        id={tooltipId}
        className={combinedClassName}
        data-position={position}
        role="tooltip"
        {...rest}
      >
        {text}
      </div>
    </div>
  );
};
