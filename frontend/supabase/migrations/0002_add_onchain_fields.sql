alter table public.crowdfunding_submissions
  add column if not exists target_amount numeric,
  add column if not exists receiver_address text,
  add column if not exists deploy_tx_hash text,
  add column if not exists contract_address text;

create index if not exists idx_crowdfunding_submissions_contract_address
  on public.crowdfunding_submissions (contract_address);

