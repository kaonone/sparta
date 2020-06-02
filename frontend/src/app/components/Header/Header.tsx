import * as React from 'react';
import { withRouter, RouteComponentProps, Link } from 'react-router-dom';

import { Back, InfoIcon } from 'components/icons';
import { Grid, IconButton, Typography, Tooltip } from 'components';
import { AuthButton } from 'features/auth';

import { useStyles } from './Header.style';

interface IOwnProps {
  backRoutePath?: string;
  title: React.ReactNode;
}

type IProps = IOwnProps & RouteComponentProps;

function HeaderComponent(props: IProps) {
  const { title, backRoutePath } = props;
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Grid container alignItems="center" spacing={3}>
        {backRoutePath && (
          <Grid item>
            <IconButton component={Link} to={backRoutePath} className={classes.backButton}>
              <Back />
            </IconButton>
          </Grid>
        )}

        <Grid item xs zeroMinWidth>
          <Typography variant="h4" noWrap className={classes.title}>
            {title}{' '}
            <Tooltip
              title="Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid, nobis!"
              placement="right"
            >
              <span>
                <InfoIcon className={classes.infoIcon} />
              </span>
            </Tooltip>
          </Typography>
        </Grid>

        <Grid item>
          <Grid container spacing={2}>
            {/* <Grid item>
              <Button
                href="https://wiki.akropolis.io/poolfaq/"
                target="_blank"
                rel="noopener noreferrer"
                color="secondary"
                variant="outlined"
              >
                FAQ
              </Button>
            </Grid> */}
            <Grid item>
              <AuthButton color="secondary" />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </div>
  );
}

export const Header = withRouter(HeaderComponent);
