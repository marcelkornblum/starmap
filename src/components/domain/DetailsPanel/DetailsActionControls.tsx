import { Button, Cluster } from '../../interface';

export interface DetailsActionControlsProps {
  readonly id: string;
  readonly directionsHref: string;
  readonly centerHref?: string;
  readonly systemDetailsHref?: string;
}

export const DetailsActionControls = ({
  id,
  directionsHref,
  centerHref,
  systemDetailsHref,
}: DetailsActionControlsProps) => {
  const resolvedCenterHref =
    centerHref ??
    `/galaxy?center=${encodeURIComponent(id)}&focus=${encodeURIComponent(id)}`;

  return (
    <Cluster gap="default" data-testid="details-cta-group">
      {systemDetailsHref ? (
        <Button
          href={systemDetailsHref}
          variant="default"
          data-testid="details-button-system-details"
        >
          Details
        </Button>
      ) : null}
      <Button
        href={resolvedCenterHref}
        variant="default"
        data-testid="details-button-center"
      >
        Centre
      </Button>
      <Button
        href={directionsHref}
        variant="primary"
        data-testid="details-button-directions"
      >
        Directions
      </Button>
    </Cluster>
  );
};
