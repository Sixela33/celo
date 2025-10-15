"use client"
import React from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseUnits, type Abi } from 'viem'
import GoodDollar from '@/abis/GoodDollar.json'
import { Button } from '@/components/ui/button'

export default function MintButton() {
  const { address } = useAccount()
  const { writeContract, isPending } = useWriteContract()

  const GOOD_DOLLAR_ADDRESS = process.env.NEXT_PUBLIC_GOOD_DOLLAR_ADDRESS as `0x${string}` | undefined
  const GOOD_DOLLAR_ABI = (GoodDollar.abi as unknown) as Abi

  async function onMint() {
    if (!GOOD_DOLLAR_ADDRESS || !address) return
    await writeContract({
      address: GOOD_DOLLAR_ADDRESS,
      abi: GOOD_DOLLAR_ABI,
      functionName: 'mint',
      args: [address, parseUnits('100', 18)], // 100 G$
    })
  }

  const isDisabled = !GOOD_DOLLAR_ADDRESS || !address || isPending

  return (
    <Button onClick={onMint} disabled={isDisabled}>
      {isPending ? 'Minting…' : 'Mint 100 G$'}
    </Button>
  )
}
