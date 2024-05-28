import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessionContext } from '../contexts/session';

type RequiredLoginProps = {
  onLogin?: Function;
  nextUrl?: undefined | string;
} & import('@mui/material').GridProps;

/**
 * @description
 * @param {{
 *  onLogin: Function,
 *  nextUrl: undefined | string,
 * } & import('@mui/material').GridProps} { onLogin = () => {}, nextUrl = undefined, ...rest }
 * @return {*}
 */
function RequiredLogin({ nextUrl = undefined, ...rest }: Readonly<RequiredLoginProps>) {
  const { session } = useSessionContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session.user) {
      // session.login(onLogin);
    } else if (session.user && nextUrl) {
      navigate(`${nextUrl}${window.location.search}`, { replace: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.user, session.login]);

  return (
    <Grid container justifyContent="center" {...rest}>
      {blocklet && (
        <Stack alignItems="center" justifyContent="center" gap={3} minHeight="60vh">
          <Box component="img" src={blocklet?.appLogo} width={80} borderRadius={80} />
          <Typography variant="h4">Todo List</Typography>
          <Typography variant="h5" component="div" color="text.secondary" textAlign="center">
            The decentralized AI Todo List access solution for blocklets
          </Typography>

          <Stack direction="row" gap={3}>
            <Button onClick={session.user ? session.switchDid : session.login} variant="contained">
              Login as Admin to access playground
            </Button>
          </Stack>
        </Stack>
      )}
    </Grid>
  );
}

export default RequiredLogin;
