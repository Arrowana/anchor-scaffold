import { Toolbar } from '@material-ui/core';
import { LinkOff } from '@material-ui/icons';
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-material-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import React, { FC } from 'react';

const Navigation: FC = () => {
  const { wallet } = useWallet();

  return (
    <Toolbar style={{ display: 'flex' }}>
        <div style={{flexGrow:1}}>
            <img src="ram-logo.png" alt="RAM logo" style={{maxWidth: 150}} />
        </div>
        <WalletMultiButton />
        {wallet && <WalletDisconnectButton startIcon={<LinkOff />} style={{ marginLeft: 8 }} />}
    </Toolbar>
  );
};

export default Navigation;