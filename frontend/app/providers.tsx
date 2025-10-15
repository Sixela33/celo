"use client";
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  celo,
  celoSepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

const config = getDefaultConfig({
  appName: 'Celo Crowdfund',
  projectId: process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID! || 'your-project-id',
  chains: [celo, celoSepolia],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider>
        {children}
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
  )
}
