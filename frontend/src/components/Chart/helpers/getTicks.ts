import moment from 'moment';
import * as R from 'ramda';
import * as d3Scale from 'd3-scale';

import { Period, IPoint } from '../Chart';

const POINTS_LENGTH = 21;

export function getTicks<P extends IPoint>(
  points: P[],
  valueKeys: Array<keyof P>,
  selectedPeriod: Period,
): { ticks: P[]; realPeriod: Period } {
  const firstPoint = R.head(points);
  if (!firstPoint) {
    return { ticks: [], realPeriod: 'all' };
  }

  const currentDate = Date.now();

  const firstPointDateByPeriod: Record<Period, () => number> = {
    all: () => firstPoint.date,
    '24h': () =>
      moment(currentDate)
        .subtract(1, 'day')
        .valueOf(),
    '3d': () =>
      moment(currentDate)
        .subtract(3, 'day')
        .valueOf(),
    '1w': () =>
      moment(currentDate)
        .subtract(1, 'week')
        .valueOf(),
    '2w': () =>
      moment(currentDate)
        .subtract(2, 'week')
        .valueOf(),
    '1m': () =>
      moment(currentDate)
        .subtract(1, 'month')
        .valueOf(),
    '3m': () =>
      moment(currentDate)
        .subtract(3, 'month')
        .valueOf(),
    '6m': () =>
      moment(currentDate)
        .subtract(6, 'month')
        .valueOf(),
  };

  const firstPointDate = Math.max(firstPointDateByPeriod[selectedPeriod](), firstPoint.date);
  // eslint-disable-next-line no-underscore-dangle
  const zeroPoint = getZeroPoint(currentDate, valueKeys);
  const lastPoint: P = {
    ...(R.last(points) || zeroPoint),
    date: currentDate,
  };

  const realPeriod = calculatePeriodByDuration(moment(lastPoint.date).diff(firstPointDate));
  const ticks = calculateTicks(
    [...points, lastPoint],
    valueKeys,
    firstPointDate,
    lastPoint.date,
    POINTS_LENGTH,
  );

  return { ticks, realPeriod };
}

function calculatePeriodByDuration(duration: number): Period {
  const mDuration = moment.duration(duration);
  const months = mDuration.asMonths();
  const weeks = mDuration.asWeeks();
  const days = mDuration.asDays();

  if (days <= 1) {
    return '24h';
  }
  if (weeks <= 1) {
    return '1w';
  }
  if (months <= 1) {
    return '1m';
  }
  if (months <= 6) {
    return '6m';
  }
  return 'all';
}

function calculateTicks<P extends IPoint>(
  points: P[],
  valueKeys: Array<keyof P>,
  start: number,
  stop: number,
  length: number,
): P[] {
  const scale = d3Scale
    .scaleLinear()
    .domain([start, stop])
    .range([0, length - 1]);

  const tickDates = Array.from(new Array(length), (_, i) => Math.floor(scale.invert(i)));

  return tickDates.map(date => getAnyPointOnScale(points, valueKeys, date));
}

function getAnyPointOnScale<P extends IPoint>(
  points: P[],
  valueKeys: Array<keyof P>,
  date: number,
): P {
  const zeroPoint = getZeroPoint(date, valueKeys);

  if (points.length <= 1) {
    return zeroPoint;
  }

  const sorted = [...points].sort(R.ascend(R.prop('date')));

  const leftPointIndex = sorted.findIndex(
    (item, i, arr) => arr[i + 1] && item.date <= date && date <= arr[i + 1].date,
  );

  const leftPoint = sorted[leftPointIndex] || zeroPoint;
  const rightPoint = sorted[leftPointIndex + 1] || zeroPoint;

  const coefficient = (date - leftPoint.date) / (rightPoint.date - leftPoint.date);

  return valueKeys.reduce<P>(
    (acc, cur) => ({
      ...acc,
      [cur]:
        Number(leftPoint[cur]) + (Number(rightPoint[cur]) - Number(leftPoint[cur])) * coefficient,
    }),
    {
      date,
    } as P,
  );
}

function getZeroPoint<P extends IPoint>(date: number, valueKeys: Array<keyof P>) {
  return valueKeys.reduce<P>((acc, cur) => ({ ...acc, [cur]: 0 }), {
    date,
  } as P);
}
