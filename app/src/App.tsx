import React, { FC } from 'react';
import './App.css';
import { deepPurple, grey } from '@material-ui/core/colors';
import { createTheme, CssBaseline, ThemeProvider } from '@material-ui/core';
import { SnackbarProvider } from 'notistack';
import Wallet from './components/Wallet';
import EscrowPage from './pages/EscrowPage';

const theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: deepPurple[700],
    },
    background: {
      default: grey[900]
    }
  },
  overrides: {
    MuiButtonBase: {
      root: {
          justifyContent: 'flex-start',
      },
    },
    MuiButton: {
      root: {
          textTransform: undefined,
          padding: '12px 16px',
      },
      startIcon: {
          marginRight: 8,
      },
      endIcon: {
          marginLeft: 8,
      },
    },
  },
});

const App: FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider>
        <Wallet>
          <EscrowPage />
        </Wallet>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default App;
