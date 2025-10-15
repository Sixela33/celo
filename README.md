## Celo Crowdfunding dApp (Foundry + Next.js + Supabase)

End-to-end example that deploys a crowdfunding factory on an EVM network (Celo), stores submissions in Supabase, and exposes a Next.js UI/API to create and view crowdfunding entries.

### Monorepo layout
- `contracts/`: Foundry workspace with Solidity contracts and deploy script
  - `src/CrowdFundFactory.sol`
  - `src/Crowdfund.sol`
  - `script/DeployFactory.sol`
  - `script/moveAbis.sh` (copies ABIs to the frontend)
- `frontend/`: Next.js app (App Router) with Supabase and EVM SDKs
  - `app/api/crowdfunding/route.ts` (writes to Supabase and deploys a new `Crowdfund` via the factory)
  - `app/crowdfunding/new/page.tsx` (submission form)
  - `app/crowdfunding/[task_id]/page.tsx` (detail page)
  - `abis/` (ABIs copied from `contracts/out`)
  - `lib/supabase/*` (SSR and client helpers)
- `frontend/supabase/migrations/`: SQL you can run in Supabase SQL Editor

---

## Prerequisites
- Node.js 20+ (LTS recommended)
- pnpm, npm, or yarn (examples use pnpm)
- Foundry toolchain (`forge`, `cast`). Install guide: https://book.getfoundry.sh/getting-started/installation
- A Supabase project (free tier is fine): https://supabase.com
- An EVM RPC for Celo (or your target chain) and a funded deployer private key
  - Celo Alfajores RPC example: `https://alfajores-forno.celo-testnet.org`

---

## 1) Contracts (Foundry)

### Configure the payment token
`CrowdFundFactory` expects an ERC20 token address for payments. The deploy script sets this via a variable in `script/DeployFactory.sol`:

```solidity
// script/DeployFactory.sol
address public paymentToken = 0x0000000000000000000000000000000000000000; // update to your ERC20
```

Replace the zero address with the ERC20 token you want to use on your target network (e.g. a test token on Alfajores). Then:

### Build
```bash
cd contracts
forge build
```

### Deploy
Use your RPC URL and funded private key.

```bash
export RPC_URL="https://alfajores-forno.celo-testnet.org" # or your RPC
export PRIVATE_KEY="<hex private key without 0x>"

forge script script/DeployFactory.sol:DeployFactory \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast -vvv
```

Take note of the printed factory address. You will set it in the frontend `.env.local` as `FACTORY_ADDRESS`.

### Copy ABIs to the frontend
After a successful build/deploy, copy the generated ABIs into the frontend:

```bash
cd contracts
bash script/moveAbis.sh
```

This will create/update `frontend/abis/CrowdFundFactory.json` and `frontend/abis/Crowdfund.json`.

---

## 2) Supabase setup
Create a new Supabase project. In the SQL Editor, run the migration files included in this repo (open and paste their contents):

1. `frontend/supabase/migrations/0001_create_crowdfunding_submissions.sql`
2. `frontend/supabase/migrations/0002_add_onchain_fields.sql`

These will create the `public.crowdfunding_submissions` table, relevant indexes, permissive RLS policies (suitable for development), and additional on-chain fields.

---

## 3) Frontend (Next.js)

### Install dependencies
```bash
cd frontend
pnpm install
# or: npm install
```

### Environment variables
Create `frontend/.env.local` with the following (update values accordingly):

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key

# Chain / deployment
RPC_URL=https://alfajores-forno.celo-testnet.org
PRIVATE_KEY=your-hex-private-key-without-0x
FACTORY_ADDRESS=0xYourFactoryAddressFromDeployment
```

Notes:
- `PRIVATE_KEY`, `FACTORY_ADDRESS`, and `RPC_URL` are used by `app/api/crowdfunding/route.ts` to deploy new `Crowdfund` contracts via the factory.
- Ensure the private key holds testnet funds on the selected network.

### Run the dev server
```bash
pnpm dev
# or: npm run dev
```

Open `http://localhost:3000/crowdfunding/new` to create a crowdfunding entry. The API will:
- Validate the payload
- Upsert a row into `public.crowdfunding_submissions`
- Call the factory to deploy a new `Crowdfund` contract
- Update the row with `deploy_tx_hash` and `contract_address`

You can view an entry at `http://localhost:3000/crowdfunding/<task_id>` after creation.

---

## End-to-end quick start
1. Install tools and create a Supabase project
2. Configure `paymentToken` in `contracts/script/DeployFactory.sol`
3. Build and deploy contracts with Foundry; record the factory address
4. Run `bash contracts/script/moveAbis.sh`
5. Run Supabase SQL migrations 0001 and 0002
6. Create `frontend/.env.local` with Supabase + chain vars
7. `pnpm -C frontend dev` and use the UI

---

## Troubleshooting
- "Private key not found" or 500 from the API route:
  - Ensure `PRIVATE_KEY`, `FACTORY_ADDRESS`, and `RPC_URL` exist in `frontend/.env.local`
- Empty `contract_address` after creation:
  - Check that the ABIs in `frontend/abis` are up-to-date; re-run `moveAbis.sh`
  - Verify your factory address is correct and on the same network as `RPC_URL`
- Out-of-gas or invalid opcode during deploy:
  - Confirm the `paymentToken` address in `DeployFactory.sol` is a valid ERC20 on your network
- No rows in Supabase:
  - Verify you ran both SQL migrations and that RLS policies were created

---

## Scripts reference
- Build contracts: `forge build`
- Test contracts: `forge test`
- Local node (optional): `anvil`
- Deploy factory: `forge script script/DeployFactory.sol:DeployFactory --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast`
- Copy ABIs to frontend: `bash script/moveAbis.sh`

---

## Tech stack
- Solidity, OpenZeppelin, Foundry
- Next.js (App Router), React, Tailwind, shadcn/ui
- Supabase (Postgres + RLS)
- Ethers v6, wagmi, RainbowKit


