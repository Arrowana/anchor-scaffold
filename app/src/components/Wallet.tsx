import { WalletAdapterNetwork, WalletError } from '@solana/wallet-adapter-base';
import { WalletDialogProvider } from '@solana/wallet-adapter-material-ui';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import {
    getLedgerWallet,
    getPhantomWallet,
    getSolflareWallet,
    getSolletWallet,
    getSolletExtensionWallet,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useSnackbar } from 'notistack';
import React, { FC, useCallback, useMemo } from 'react';
import Navigation from './Navigation';

const getCluster = (network: string) => {
  if (network === 'localnet') return 'http://localhost:8899';
  //return clusterApiUrl(network);
  throw new Error('Not implemented')
}

const Wallet: FC = ({children}) => {
  const network = 'localnet'; // WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => getCluster(network), [network]);

  // @solana/wallet-adapter-wallets imports all the adapters but supports tree shaking --
  // Only the wallets you want to support will be compiled into your application
  const wallets = useMemo(
    () => [
        getPhantomWallet(),
        getSolflareWallet(),
        //@ts-ignore
        getSolletWallet({ network }),
        //@ts-ignore
        getSolletExtensionWallet({ network }),
        getLedgerWallet(),
    ],
    [network]
  );

  const { enqueueSnackbar } = useSnackbar();
  const onError = useCallback(
    (error: WalletError) => {
        enqueueSnackbar(error.message ? `${error.name}: ${error.message}` : error.name, { variant: 'error' });
        console.error(error);
    },
    [enqueueSnackbar]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} onError={onError} autoConnect>
            <WalletDialogProvider>
                <Navigation />
                {children}
            </WalletDialogProvider>
        </WalletProvider>
    </ConnectionProvider>
  );
};

export default Wallet;