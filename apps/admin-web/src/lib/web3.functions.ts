import { createServerFn } from "@tanstack/react-start";
import { Result, unwrapResult } from "@workspace/result";
import type { Web3DashboardData } from "@workspace/ui/components/ui/web3-dashboard";

import { requireAuthMiddleware } from "./auth.middleware";

const demoWeb3Metrics = {
  title: "Web3 control plane",
  subtitle: "Operator view for TVL, lending APYs, markets, and protocol risk.",
  metrics: [
    {
      id: "tvl",
      label: "Total value locked",
      value: "$48.2M",
      change: 4.8,
      hint: "Across 12 protocols",
    },
    {
      id: "volume",
      label: "24h volume",
      value: "$6.1M",
      change: -1.2,
      hint: "DEX + lending",
    },
    {
      id: "apy",
      label: "Blended APY",
      value: "8.4%",
      change: 0.6,
      hint: "Risk-weighted",
    },
    {
      id: "users",
      label: "Active wallets",
      value: "12.4k",
      change: 9.1,
      hint: "Last 7 days",
    },
  ],
  protocols: [
    {
      id: "1",
      name: "Aave V3",
      category: "Lending",
      tvl: "$18.4M",
      apy: "4.2%",
      risk: "Low" as const,
    },
    {
      id: "2",
      name: "Uniswap V3",
      category: "DEX",
      tvl: "$9.8M",
      apy: "12.1%",
      risk: "Medium" as const,
    },
    {
      id: "3",
      name: "Lido",
      category: "Staking",
      tvl: "$11.2M",
      apy: "3.6%",
      risk: "Low" as const,
    },
    {
      id: "4",
      name: "Morpho",
      category: "Lending",
      tvl: "$4.1M",
      apy: "7.8%",
      risk: "Medium" as const,
    },
    {
      id: "5",
      name: "Pendle",
      category: "Yield",
      tvl: "$2.7M",
      apy: "18.4%",
      risk: "High" as const,
    },
  ],
  markets: [
    {
      id: "eth",
      asset: "Ethereum",
      symbol: "ETH",
      price: "$3,412",
      change24h: 2.4,
      volume: "$1.2B",
    },
    {
      id: "btc",
      asset: "Bitcoin",
      symbol: "BTC",
      price: "$97,840",
      change24h: 1.1,
      volume: "$28.4B",
    },
    {
      id: "sol",
      asset: "Solana",
      symbol: "SOL",
      price: "$178",
      change24h: -3.2,
      volume: "$2.1B",
    },
    {
      id: "usdc",
      asset: "USD Coin",
      symbol: "USDC",
      price: "$1.00",
      change24h: 0,
      volume: "$4.8B",
    },
  ],
  chart: [
    { label: "Mon", tvl: 42, volume: 4.2 },
    { label: "Tue", tvl: 43.5, volume: 5.1 },
    { label: "Wed", tvl: 44.1, volume: 4.8 },
    { label: "Thu", tvl: 45.8, volume: 6.2 },
    { label: "Fri", tvl: 46.4, volume: 5.9 },
    { label: "Sat", tvl: 47.2, volume: 4.1 },
    { label: "Sun", tvl: 48.2, volume: 6.1 },
  ],
} satisfies Omit<Web3DashboardData, "userName">;

/**
 * Authenticated admin metrics payload via Result + unwrap at the Start edge.
 */
export const getWeb3Dashboard = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }): Promise<Web3DashboardData> => {
    return unwrapResult(
      Result.ok({
        ...demoWeb3Metrics,
        userName: context.user.name || context.user.email,
      }),
    );
  });
