import moment from 'moment';

import { Period } from '../Chart';

export function makeFormatDateByPeriod(period: Period, firstDate: number) {
  const monthAgo = moment(Date.now())
    .subtract(1, 'months')
    .endOf('day')
    .valueOf();
  return (date: number) => {
    const mDate = moment(date);
    const formatByPeriod: Record<Period, string> = {
      '24h': `${mDate.format('H')}H`,
      '3d': `${mDate.format('H')}H`,
      '1w': mDate.format('ddd'),
      '2w': mDate.format('DD MMM'),
      '1m': mDate.format('DD MMM'),
      '3m': mDate.format('DD MMM'),
      '6m': monthAgo < firstDate ? mDate.format('DD MMM') : mDate.format('MMM'),
      all: mDate.format('DD MMM'),
    };
    return formatByPeriod[period];
  };
}
