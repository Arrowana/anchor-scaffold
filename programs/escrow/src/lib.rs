use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("BVn1pCovTMx6UHEVcCjXJN1h4E7KA8G6EyZtydaSzpu8");

#[program]
pub mod escrow {
    use super::*;

    pub const ESCROW_PDA_SEED: &[u8] = b"escrow";

    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        deposit_amount: u64,
        taker_amount: u64,
    ) -> ProgramResult {
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.initializer = *ctx.accounts.initializer.key;
        escrow_account.deposit_token_account =
            *ctx.accounts.deposit_token_account.to_account_info().key;
        escrow_account.initializer_receive_token_account = *ctx
            .accounts
            .initializer_receive_token_account
            .to_account_info()
            .key;
        escrow_account.deposit_amount = deposit_amount;
        escrow_account.taker_amount = taker_amount;

        token::transfer(ctx.accounts.into_transfer_to_deposit(), deposit_amount)?;

        Ok(())
    }

    pub fn exchange(
        ctx: Context<Exchange>,
        expected_deposit_amount: u64,
        expected_taker_amount: u64,
    ) -> ProgramResult {
        let escrow_account = ctx.accounts.escrow_account.clone();

        let escrow_address = escrow_account.key();
        let (_pda, bump_seed) = Pubkey::find_program_address(
            &[ESCROW_PDA_SEED, escrow_address.as_ref()],
            ctx.program_id,
        );
        let seeds = &[ESCROW_PDA_SEED, escrow_address.as_ref(), &[bump_seed]];

        // We can get more than expected, for less but nothing else
        if expected_deposit_amount < escrow_account.deposit_amount
            || expected_taker_amount > escrow_account.taker_amount
        {
            return Err(EscrowError::UnexpectedEscrowState.into());
        }

        token::transfer(
            ctx.accounts
                .into_transfer_to_taker_context()
                .with_signer(&[&seeds[..]]),
            ctx.accounts.deposit_token_account.amount, // We have checked amount above so we deplete the amount so the token account can always be closed
        )?;

        token::transfer(
            ctx.accounts.into_transfer_to_initializer_context(),
            ctx.accounts.escrow_account.taker_amount,
        )?;

        // Initializer gets back the rent by closing the deposit token account as well

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,
    #[account(mut)]
    pub initializer_token_account: Account<'info, TokenAccount>,
    #[account(
        init,
        seeds = [&escrow::ESCROW_PDA_SEED, escrow_account.key.as_ref()],
        bump,
        payer = initializer,
        token::mint = deposit_mint,
        token::authority = deposit_token_account
    )]
    pub deposit_token_account: Account<'info, TokenAccount>,
    pub deposit_mint: Account<'info, Mint>,
    pub initializer_receive_token_account: Account<'info, TokenAccount>,
    #[account(init, payer = initializer, space = 8 + EscrowAccount::LEN)]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Exchange<'info> {
    pub taker: Signer<'info>,
    #[account(mut)]
    pub taker_deposit_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub taker_receive_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub deposit_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub initializer_receive_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub initializer: UncheckedAccount<'info>,
    #[account(
        mut,
        has_one = initializer,
        has_one = deposit_token_account,
        has_one = initializer_receive_token_account,
        close = initializer
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct EscrowAccount {
    pub initializer: Pubkey,
    pub deposit_token_account: Pubkey,
    pub initializer_receive_token_account: Pubkey,
    pub deposit_amount: u64,
    pub taker_amount: u64,
}

impl EscrowAccount {
    pub const LEN: usize = 32 + 32 + 32 + 8 + 8;
}

impl<'info> InitializeEscrow<'info> {
    fn into_transfer_to_deposit(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.initializer_token_account.to_account_info(),
            to: self.deposit_token_account.to_account_info(),
            authority: self.initializer.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> Exchange<'info> {
    fn into_transfer_to_taker_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.deposit_token_account.to_account_info(),
            to: self.taker_receive_token_account.to_account_info(),
            authority: self.deposit_token_account.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

impl<'info> Exchange<'info> {
    fn into_transfer_to_initializer_context(
        &self,
    ) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        let cpi_accounts = Transfer {
            from: self.taker_deposit_token_account.to_account_info(),
            to: self.initializer_receive_token_account.to_account_info(),
            authority: self.taker.to_account_info(),
        };
        let cpi_program = self.token_program.to_account_info();
        CpiContext::new(cpi_program, cpi_accounts)
    }
}

#[error]
pub enum EscrowError {
    #[msg("Unexpected escrow state")]
    UnexpectedEscrowState,
}
