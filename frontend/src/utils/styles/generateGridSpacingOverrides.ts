import { Spacing } from '@material-ui/core/styles/createSpacing';

export function generateGridSpacingOverrides(
  spacing: Spacing,
): Record<
  typeof gridSpacingClasses[number],
  {
    width: string;
  }
> {
  return gridSpacingClasses.reduce(
    (acc, cur, index) => ({
      ...acc,
      [cur]: { width: `calc(100% + ${spacing(index + 1)}px + 1px)` },
    }),
    {} as Record<
      typeof gridSpacingClasses[number],
      {
        width: string;
      }
    >,
  );
}

const gridSpacingClasses = [
  'spacing-xs-1',
  'spacing-xs-2',
  'spacing-xs-3',
  'spacing-xs-4',
  'spacing-xs-5',
  'spacing-xs-6',
  'spacing-xs-7',
  'spacing-xs-8',
  'spacing-xs-9',
  'spacing-xs-10',
] as const;
