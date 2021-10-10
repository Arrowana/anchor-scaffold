import { Card, CardActions, CardContent, IconButton, makeStyles, MenuItem, Select, TextField, Theme } from "@material-ui/core";
import { Send, SwapHoriz } from "@material-ui/icons";
import { BN, Program, Provider, IdlAccounts } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import Bootstrap from "../components/Boostrap";
import { FC, useEffect, useMemo, useState } from "react";
import { Escrow as EscrowIdl } from "../../../target/types/escrow";
import EscrowJson from "../utils/idls/escrow.json";

const ESCROW_PROGRAM_ID = new PublicKey("BVn1pCovTMx6UHEVcCjXJN1h4E7KA8G6EyZtydaSzpu8");
const ESCROW_PDA_SEED: string = "escrow";

class StubWallet {
  publicKey: PublicKey = undefined as unknown as PublicKey;
  async signTransaction(tx: Transaction): Promise<Transaction> {
    throw new Error("Not implemented");
  }
  async signAllTransactions(txs: Transaction[]): Promise<Transaction[]> {
    throw new Error("Not implemented");
  }
}
const STUB_WALLET = new StubWallet();

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    '& .MuiTextField-root': {
      margin: theme.spacing(1),
      width: '25ch',
    },
  },
}));

type EscrowProgram = Program<EscrowIdl>;
type EscrowAccount = IdlAccounts<EscrowIdl>["escrowAccount"];

type CreateEscrowProps = {
  program: EscrowProgram
};

interface TokenAccountWithMint {
  address: PublicKey,
  mint: PublicKey,
};

const getTokenAccounts = async (
  connection: Connection,
  ownerAddress: PublicKey
): Promise<TokenAccountWithMint[]> => {
  const parsedTokenAccounts = (
    await connection.getParsedTokenAccountsByOwner(ownerAddress, {
      programId: TOKEN_PROGRAM_ID,
    })
  ).value;
  return parsedTokenAccounts
    .map(({ pubkey, account }) => ({address: pubkey, mint: new PublicKey(account.data.parsed.info.mint)}));
};

const CreateEscrow: FC<CreateEscrowProps> = ({program}) => {
  const classes = useStyles();
  const { enqueueSnackbar } = useSnackbar();
  const [depositAmount, setDepositAmount] = useState<string>()
  const [takerAmount, setTakerAmount] = useState<string>();
  const [tokenAccounts, setTokenAccounts] = useState<TokenAccountWithMint[]>();
  const [depositMint, setDepositMint] = useState<string>('');
  const [takerMint, setTakerMint] = useState<string>('');

  useEffect(() => {
    if (!program.provider.wallet.publicKey) {
      setTokenAccounts(undefined);
      return;
    }
    const update = async () => {
      setTokenAccounts(
        await getTokenAccounts(program.provider.connection, program.provider.wallet.publicKey)
      );
    }
    const intervalId = setInterval(update, 2000);
    return () => clearInterval(intervalId);
  }, [program.provider]);

  return <form className={classes.root}
    >
      Create an Escrow account
    <TextField
      label="Deposit amount"
      type="number"
      value={depositAmount}
      onChange={({target}) => setDepositAmount(target.value)}
    />
    <Select
      value={depositMint}
      displayEmpty
      autoWidth
      onChange={(e) => setDepositMint(e.target.value as string)}
    >
      <MenuItem value="" disabled>Select mint</MenuItem>
      {tokenAccounts?.map(({mint}) =>
        <MenuItem value={mint.toBase58()}>{mint.toBase58()}</MenuItem>
      )}
    </Select>
    <TextField
      label="taker amount"
      type="number"
      value={takerAmount}
      onChange={({target}) => setTakerAmount(target.value)}
    />
    <Select
      value={takerMint}
      displayEmpty
      autoWidth
      onChange={(e) => setTakerMint(e.target.value as string)}
    >
      <MenuItem value="" disabled>Select mint</MenuItem>
      {tokenAccounts?.map(({mint}) =>
        <MenuItem value={mint.toBase58()}>{mint.toBase58()}</MenuItem>
      )}
    </Select>

    <IconButton
      disabled={!(depositAmount && takerAmount)}
      onClick={async () => {
        if (!(depositAmount && takerAmount)) {
          throw new Error('Unexpected invalid state')
        }
        const escrowAccountKeypair = new Keypair();
        const [depositTokenAccount, _] = await PublicKey.findProgramAddress(
          [Buffer.from(ESCROW_PDA_SEED), escrowAccountKeypair.publicKey.toBytes()],
          ESCROW_PROGRAM_ID
        );

        const initializerTokenAccount = tokenAccounts?.find(({mint}) => mint.toBase58() === depositMint)?.address;
        if (!initializerTokenAccount) {
          throw new Error('Could not find initializerTokenAccount');
        }

        const initializerReceiveTokenAccount = tokenAccounts?.find(({mint}) => mint.toBase58() === takerMint)?.address;
        if (!initializerReceiveTokenAccount) {
          throw new Error('Could not find initializerTokenAccount');
        }

        try {
          const signature = program.rpc.initializeEscrow(
            new BN(depositAmount),
            new BN(takerAmount),
            {
              accounts: {
                initializer: program.provider.wallet.publicKey,
                initializerTokenAccount,
                depositTokenAccount,
                depositMint: new PublicKey(depositMint),
                initializerReceiveTokenAccount,
                escrowAccount: escrowAccountKeypair.publicKey,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
              },
              signers: [escrowAccountKeypair]
            },
          );
          enqueueSnackbar(`Initialized escrow tx: ${signature}`);
        } catch(e) {
          enqueueSnackbar('Error', {variant: 'error'});
        }
      }}
    >
      <Send />
    </IconButton>
  </form>
}

const Escrow: FC = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [escrowProgramAccounts, setEscrowProgramAccounts] = useState<any[]>()

  const program = useMemo(() => {
    const provider = new Provider(connection, wallet || STUB_WALLET, {});
    return new Program<EscrowIdl>(EscrowJson as EscrowIdl, ESCROW_PROGRAM_ID, provider);
  }, [wallet]);

  useEffect(() => {
    program.account.escrowAccount.all()
      .then(setEscrowProgramAccounts);
  }, [program]);

  return (
    <>
      {escrowProgramAccounts?.map(({publicKey, account}) => {
        return <Card 
          key={publicKey.toBase58()}
          title={publicKey.toBase58()}
          >
            <CardContent>
              {account.initializer.toBase58()}
              {account.depositAmount.toString()} for {account.takerAmount.toString()}
            </CardContent>
            <CardActions>
              <IconButton>
                <SwapHoriz />
              </IconButton> 
            </CardActions>
        </Card>
      })}
      <CreateEscrow program={program} />
      <Bootstrap provider={program.provider} />
    </>
  );
}

export default Escrow;