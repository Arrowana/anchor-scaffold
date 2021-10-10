import { Button } from "@material-ui/core"
import { Provider, utils } from "@project-serum/anchor"
import { ASSOCIATED_TOKEN_PROGRAM_ID, MintLayout, Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, Keypair, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { FC } from "react"

type BoostrapProps = {
  provider: Provider
}

const Bootstrap: FC<BoostrapProps> = ({provider}) => {
  return <>
    <Button
      disabled={!provider.wallet.publicKey}
      variant="outlined"
      onClick={async () => {
        await provider.connection.requestAirdrop(provider.wallet.publicKey, 2_000_000_000);
        const mintKeypairs = [new Keypair(), new Keypair()];

        let tx = new Transaction({feePayer: provider.wallet.publicKey});

        for (const mintKeypair of mintKeypairs) {
          const ata = await utils.token.associatedAddress({ mint: mintKeypair.publicKey, owner: provider.wallet.publicKey});
          tx.add(...[
            SystemProgram.createAccount({
              fromPubkey: provider.wallet.publicKey,
              newAccountPubkey: mintKeypair.publicKey,
              lamports: await provider.connection.getMinimumBalanceForRentExemption(MintLayout.span),
              space: MintLayout.span,
              programId: TOKEN_PROGRAM_ID,
            }),
            Token.createInitMintInstruction(
              TOKEN_PROGRAM_ID,
              mintKeypair.publicKey,
              0,
              provider.wallet.publicKey,
              provider.wallet.publicKey,
            ),
            Token.createAssociatedTokenAccountInstruction(
              ASSOCIATED_TOKEN_PROGRAM_ID,
              TOKEN_PROGRAM_ID,
              mintKeypair.publicKey,
              ata,
              provider.wallet.publicKey,
              provider.wallet.publicKey,
            ),
            Token.createMintToInstruction(
              TOKEN_PROGRAM_ID,
              mintKeypair.publicKey,
              ata,
              provider.wallet.publicKey,
              [],
              1000,
            )
          ]);
        }

        const signature = await provider.send(tx, mintKeypairs);
        console.log(signature);
      }}
    >
      Boostrap - SOL aidrop & Create 2 tokens and mint some
    </Button>
  </>
};

export default Bootstrap;