import * as React from 'react';
import { GetProps } from '_helpers';

import { RowsLayout, Hint, Link, Typography } from 'components';

import { Header } from '../Header/Header';
import { PageNavigation } from '../PageNavigation/PageNavigation';
import { useStyles } from './BaseLayout.style';

interface IProps {
  title: React.ReactNode;
  actions?: React.ReactNode[];
  backRoutePath?: string;
  showBalances?: boolean;
  showEra?: boolean;
  hidePageNavigation?: boolean;
  children: React.ReactNode;
}

function BaseLayout(props: IProps) {
  const { children, backRoutePath, title, hidePageNavigation } = props;

  const headerProps: GetProps<typeof Header> = {
    backRoutePath,
    title,
  };

  const classes = useStyles();

  return (
    <RowsLayout spacing={3} className={classes.rootRowsLayout}>
      <RowsLayout.ContentBlock>
        <Header {...headerProps} />
      </RowsLayout.ContentBlock>
      {!hidePageNavigation && (
        <RowsLayout.ContentBlock>
          <PageNavigation />
        </RowsLayout.ContentBlock>
      )}
      <RowsLayout.ContentBlock>
        <Hint>
          <div>
            <Typography>
              This is Alpha version, please use it at it your own risk. Use small amounts of funds
              to start (we recommend no more than 10 DAI).
            </Typography>
            <Typography>
              Please reach out in our{' '}
              <Link
                href="https://discord.com/invite/Y58CGUW"
                target="_blank"
                rel="noopener noreferrer"
              >
                Discord
              </Link>{' '}
              for any questions or issues!
            </Typography>
          </div>
        </Hint>
      </RowsLayout.ContentBlock>
      <RowsLayout.ContentBlock fillIn>{children}</RowsLayout.ContentBlock>
    </RowsLayout>
  );
}

export { BaseLayout };
