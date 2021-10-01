import { Box, Card, CardActions, CardContent, IconButton, makeStyles, TextField, Theme } from "@material-ui/core";
import { Send, SwapHoriz } from "@material-ui/icons";
import { BN, Idl, Program, Provider } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Transaction } from "@solana/web3.js";
import { useSnackbar } from "notistack";
import { FC, useEffect, useMemo, useState } from "react";
import EscrowIdl from "../utils/escrow.json";

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

type CreateEscrowProps = {
  program: Program
};

const CreateEscrow: FC<CreateEscrowProps> = ({program}) => {
  const classes = useStyles();
  const { enqueueSnackbar } = useSnackbar();
  const [depositAmount, setDepositAmount] = useState<string>()
  const [takerAmount, setTakerAmount] = useState<string>();

  return <form className={classes.root}
    >
    TODO: Add drop down for mints, hardcoded mints
    <TextField
      label="Deposit amount"
      type="number"
      value={depositAmount}
      onChange={({target}) => setDepositAmount(target.value)}
    />
    <TextField
      label="taker amount"
      type="number"
      value={takerAmount}
      onChange={({target}) => setTakerAmount(target.value)}
    />
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

        try {
          // const signature = program.rpc.initializeEscrow(
          //   new BN(depositAmount),
          //   new BN(takerAmount),
          //   {
          //     accounts: {
          //       initializer: program.provider.wallet.publicKey,
          //       initializerTokenAccount,
          //       depositTokenAccount,
          //       depositMint,
          //       initializerReceiveTokenAccount,
          //       escrowAccount: escrowAccountKeypair.publicKey,
          //       systemProgram: SystemProgram.programId,
          //       tokenProgram: TOKEN_PROGRAM_ID,
          //       rent: SYSVAR_RENT_PUBKEY,
          //     },
          //     signers: [escrowAccountKeypair]
          //   },
          // );
          //enqueueSnackbar(`Initialized escrow tx: ${signature}`);
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
    return new Program(EscrowIdl as Idl, ESCROW_PROGRAM_ID, provider);
  }, [wallet]);

  // useEffect(() => {
  //   program.account.escrowAccount.all()
  //     .then(setEscrowProgramAccounts);
  // }, [program]);

  return (
    <>
      {escrowProgramAccounts?.map(({publicKey, account}) => {
        return <Card 
          key={publicKey.toBase58()}
          title={publicKey.toBase58()}
          >
            <CardContent>
              {account.initializer.toBase58()}
              TODO: Add mints by querying token accounts
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
    </>
  );
}

export default Escrow;