import * as React from 'react';
import { GetProps } from '_helpers';

import { RowsLayout } from 'components';

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
      <RowsLayout.ContentBlock fillIn>{children}</RowsLayout.ContentBlock>
    </RowsLayout>
  );
}

export { BaseLayout };
