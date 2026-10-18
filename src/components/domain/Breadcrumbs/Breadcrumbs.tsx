export interface BreadcrumbItem {
  readonly label: string;
  readonly href?: string;
}

export interface BreadcrumbsProps {
  readonly items: readonly BreadcrumbItem[];
}

/**
 * Domain Component (`<Breadcrumbs>`): renders semantic breadcrumb navigation
 * at the top of a view.
 */
export const Breadcrumbs = ({ items }: BreadcrumbsProps) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" data-testid="view-breadcrumbs">
      <ol data-testid="breadcrumbs-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}:${index}`}
              data-testid="breadcrumb-item"
            >
              {item.href && !isLast ? (
                <a href={item.href} data-testid="breadcrumb-link">
                  {item.label}
                </a>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  data-testid="breadcrumb-current"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
