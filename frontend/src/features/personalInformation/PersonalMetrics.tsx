import React from 'react';
import BN from 'bn.js';
import { of } from 'rxjs';

import { useMyUserSubscription } from 'generated/gql/pool';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { useApi } from 'services/api';
import { useSubscribable } from 'utils/react';
import { Loading, MetricsList, CashMetric } from 'components';
import { zeroAddress } from 'utils/mock';
import { max } from 'utils/bn';

const tKeys = tKeysAll.features.personalInformation;

type Props = Pick<React.ComponentProps<typeof MetricsList>, 'orientation' | 'withDividers'>;

function PersonalMetrics(props: Props) {
  const { t } = useTranslate();

  const api = useApi();
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);

  const myUserResult = useMyUserSubscription({
    variables: {
      address: account?.toLowerCase() || '',
    },
  });

  const myUser = myUserResult.data?.user;
  const lCredit = new BN(myUser?.credit || '0');
  const prevLAvailableBalance = new BN(myUser?.lBalance || '0');
  const pAvailableBalance = new BN(myUser?.pBalance || '0');
  const pInterestSum = new BN(myUser?.pInterestSum || '0');
  const pLockedSum = new BN(myUser?.pLockedSum || '0');
  const unlockLiquiditySum = new BN(myUser?.unlockLiquiditySum || '0');

  const [{ user: lAvailableBalance }, lAvailableBalanceMeta] = useSubscribable(
    () =>
      pAvailableBalance.isZero()
        ? of({ user: new BN(0) })
        : api.fundsModule.getPtkToDaiExitInfo$(pAvailableBalance.toString()),
    [pAvailableBalance.toString()],
    { user: new BN(0) },
  );

  const [defiYield, defiYieldMeta] = useSubscribable(
    () => api.defiModule.getAvailableInterest$(account || zeroAddress),
    [api, account],
    new BN(0),
  );

  const [unclaimedDistributions, unclaimedDistributionsMeta] = useSubscribable(
    () => api.tokens.getUnclaimedDistributions$(account || zeroAddress),
    [account],
    new BN(0),
  );

  const [lIncreasing, lIncreasingMeta] = useSubscribable(
    () =>
      api.fundsModule.getAvailableBalanceIncreasing$(
        account || zeroAddress,
        pLockedSum
          .add(pInterestSum)
          .add(unclaimedDistributions)
          .toString(),
        unlockLiquiditySum.toString(),
      ),
    [account],
    new BN(0),
  );

  const currentProfit = max(
    new BN(0),
    lAvailableBalance.add(lIncreasing).sub(prevLAvailableBalance),
  );

  return (
    <Loading
      gqlResults={myUserResult}
      meta={[
        accountMeta,
        lAvailableBalanceMeta,
        unclaimedDistributionsMeta,
        lIncreasingMeta,
        defiYieldMeta,
      ]}
    >
      <MetricsList {...props}>
        <CashMetric
          title={t(tKeys.availableBalance.getKey())}
          value={lAvailableBalance.toString()}
          token="dai"
        />
        <CashMetric
          title={t(tKeys.currentProfit.getKey())}
          value={currentProfit.toString()}
          token="dai"
        />
        <CashMetric title={t(tKeys.defiYield.getKey())} value={defiYield.toString()} token="dai" />
        <CashMetric title={t(tKeys.credit.getKey())} value={lCredit.toString()} token="dai" />
      </MetricsList>
    </Loading>
  );
}

export { PersonalMetrics };
