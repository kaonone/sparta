import React, { memo } from 'react';
import Grid from '@material-ui/core/Grid';
import BN from 'bn.js';

import { useApi } from 'services/api';
import { useTranslate, tKeys as tKeysAll } from 'services/i18n';
import { MyStakeCost } from 'features/stake';
import { StakeButton, UnstakeButton } from 'features/cashExchange';
import { CashMetric, Metric, ShortAddress, ActivitiesCard, Loading } from 'components';
import { LendIcon } from 'components/icons';
import { getPledgeId } from 'model';
import { useSubscribable } from 'utils/react';
import { formatBalance } from 'utils/format';
import { Status, usePledgeSubscription } from 'generated/gql/pool';

import { useStyles } from './LoanApplicationCard.style';
import { Progress } from '../Progress/Progress';

const tKeys = tKeysAll.features.loanApplications;

interface IProps {
  lendValue: string;
  borrower: string;
  aprValue: string;
  stakedValue: string;
  descriptionHash: string;
  status: Status;
  proposalId: string;
}

const LoanApplicationCard = memo(function LoanApplicationCard(props: IProps) {
  const { lendValue, borrower, proposalId, aprValue, stakedValue, descriptionHash, status } = props;

  const classes = useStyles();
  const { t } = useTranslate();

  const api = useApi();
  const [aprDecimals, aprDecimalsMeta] = useSubscribable(
    () => api.loanModule.getAprDecimals$(),
    [],
    0,
  );
  const [account, accountMeta] = useSubscribable(() => api.web3Manager.account, []);

  const [description, descriptionMeta] = useSubscribable(
    () => api.swarmApi.read<string>(descriptionHash),
    [descriptionHash],
  );

  const expansionPanelDetails =
    descriptionMeta.error || descriptionMeta.loaded ? description : '⏳';

  const pledgeGqlResult = usePledgeSubscription({
    variables: {
      pledgeHash: account ? getPledgeId(account, borrower, proposalId) : '',
    },
  });
  const pledgePLocked = new BN(pledgeGqlResult.data?.pledge?.pLocked || '0');
  const needToShowUnstake = pledgePLocked.gtn(0);

  const [fullLoanStake] = useSubscribable(() => api.loanModule.calculateFullLoanStake$(lendValue), [
    lendValue,
  ]);

  const metricsList = React.useMemo(
    () => [
      <CashMetric
        title={t(tKeys.lend.getKey())}
        value={lendValue}
        token="dai"
        icon={<LendIcon className={classes.lendIcon} />}
      />,
      <Metric title={t(tKeys.to.getKey())} value={<ShortAddress address={borrower} />} />,
      <Metric
        title={t(tKeys.apr.getKey())}
        value={
          <Loading meta={aprDecimalsMeta}>
            {formatBalance({ amountInBaseUnits: aprValue, baseDecimals: aprDecimals })}%
          </Loading>
        }
      />,
      <span className={classes.highlightedMetric}>
        <Metric
          title={t(tKeys.myStake.getKey())}
          value={
            <Loading meta={accountMeta}>
              {account ? (
                <MyStakeCost
                  initialLoanSize={lendValue}
                  loanBody={lendValue}
                  status={status}
                  supporter={account}
                  borrower={borrower}
                  proposalId={proposalId}
                />
              ) : (
                '—'
              )}
            </Loading>
          }
        />
      </span>,
    ],
    [
      t,
      lendValue,
      borrower,
      aprValue,
      aprDecimals,
      aprDecimalsMeta,
      account,
      accountMeta,
      status,
      proposalId,
    ],
  );

  const rawProgressInPercents = fullLoanStake
    ? new BN(stakedValue).muln(10000).div(fullLoanStake)
    : new BN(0);
  const progressInPercents = Math.min(100, rawProgressInPercents.toNumber() / 100);
  const isMyProposal = !!account && account.toLowerCase() === borrower.toLowerCase();

  const asideContent = React.useMemo(
    () => (
      <Grid container spacing={2} justify="center" direction="column">
        <Grid item>
          <Progress progressInPercents={progressInPercents} />
        </Grid>
        {proposalId && (
          <Grid item>
            <Loading meta={accountMeta} progressVariant="linear">
              <StakeButton
                loanSize={lendValue}
                proposalId={proposalId}
                borrower={borrower}
                disabled={isMyProposal}
                variant="contained"
                color="primary"
                fullWidth
              />
            </Loading>
          </Grid>
        )}
        {needToShowUnstake && proposalId && (
          <Grid item>
            <Loading meta={[accountMeta]} progressVariant="linear">
              <UnstakeButton
                loanSize={lendValue}
                proposalId={proposalId}
                borrower={borrower}
                disabled={isMyProposal}
                variant="contained"
                color="primary"
                fullWidth
              />
            </Loading>
          </Grid>
        )}
      </Grid>
    ),
    [
      t,
      status,
      borrower,
      progressInPercents,
      isMyProposal,
      accountMeta,
      lendValue,
      needToShowUnstake,
      proposalId,
    ],
  );

  return (
    <ActivitiesCard
      metricsList={metricsList}
      expansionPanelDetails={expansionPanelDetails}
      asideContent={asideContent}
    />
  );
});

export { LoanApplicationCard };
