"use client";
import {
  Pulse,
  ArrowDownRight,
  ArrowUpRight,
  ChartBar,
  Coins,
  Stack,
  Percent,
  Shield,
  TrendUp,
  Wallet,
} from "@phosphor-icons/react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface Web3Metric {
  id: string;
  label: string;
  value: string;
  change: number;
  hint?: string;
}

export interface Web3Protocol {
  id: string;
  name: string;
  category: string;
  tvl: string;
  apy: string;
  risk: "Low" | "Medium" | "High";
}

export interface Web3MarketRow {
  id: string;
  asset: string;
  symbol: string;
  price: string;
  change24h: number;
  volume: string;
}

export interface Web3ChartPoint {
  label: string;
  tvl: number;
  volume: number;
}

export interface Web3DashboardData {
  title?: string;
  subtitle?: string;
  metrics: Web3Metric[];
  protocols: Web3Protocol[];
  markets: Web3MarketRow[];
  chart: Web3ChartPoint[];
  userName?: string;
}

const DEFAULT_DATA: Web3DashboardData = {
  title: "Web3 control plane",
  subtitle: "Portfolio analytics, lending APYs, and DeFi ops in one admin surface.",
  userName: "Admin",
  metrics: [
    {
      id: "tvl",
      label: "Total value locked",
      value: "$48.2M",
      change: 4.8,
      hint: "Across 12 protocols",
    },
    { id: "volume", label: "24h volume", value: "$6.1M", change: -1.2, hint: "DEX + lending" },
    { id: "apy", label: "Blended APY", value: "8.4%", change: 0.6, hint: "Risk-weighted" },
    { id: "users", label: "Active wallets", value: "12.4k", change: 9.1, hint: "Last 7 days" },
  ],
  protocols: [
    { id: "1", name: "Aave V3", category: "Lending", tvl: "$18.4M", apy: "4.2%", risk: "Low" },
    { id: "2", name: "Uniswap V3", category: "DEX", tvl: "$9.8M", apy: "12.1%", risk: "Medium" },
    { id: "3", name: "Lido", category: "Staking", tvl: "$11.2M", apy: "3.6%", risk: "Low" },
    { id: "4", name: "Morpho", category: "Lending", tvl: "$4.1M", apy: "7.8%", risk: "Medium" },
    { id: "5", name: "Pendle", category: "Yield", tvl: "$2.7M", apy: "18.4%", risk: "High" },
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
    { id: "sol", asset: "Solana", symbol: "SOL", price: "$178", change24h: -3.2, volume: "$2.1B" },
    {
      id: "usdc",
      asset: "USD Coin",
      symbol: "USDC",
      price: "$1.00",
      change24h: 0.0,
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
};

function ChangeBadge({ change }: { change: number }) {
  const up = change > 0;
  const flat = change === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        flat && "text-muted-foreground",
        up && !flat && "text-emerald-500",
        !up && !flat && "text-rose-500",
      )}
    >
      {!flat &&
        (up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />)}
      {flat ? "0.0%" : `${up ? "+" : ""}${change.toFixed(1)}%`}
    </span>
  );
}

function riskColor(risk: Web3Protocol["risk"]) {
  if (risk === "Low") return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (risk === "High") return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
  return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
}

export function Web3Dashboard({
  data = DEFAULT_DATA,
  className,
  onSignOut,
}: {
  data?: Web3DashboardData;
  className?: string;
  onSignOut?: () => void;
}) {
  return (
    <div className={cn("min-h-screen bg-background text-foreground", className)}>
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Stack className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">Admin · Web3</p>
              <p className="text-xs text-muted-foreground">DeFi operations desk</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Live markets
            </Badge>
            <span className="hidden text-sm text-muted-foreground md:inline">
              {data.userName ?? "Admin"}
            </span>
            {onSignOut ? (
              <Button variant="outline" size="sm" onClick={onSignOut}>
                Sign out
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {data.title ?? "Web3 dashboard"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {data.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">
              <Wallet className="size-4" />
              Connect RPC
            </Button>
            <Button size="sm">
              <Pulse className="size-4" />
              Run health check
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <Card key={metric.id} className="border-border/80 shadow-none">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
                {metric.id === "tvl" ? (
                  <Coins className="size-4 text-muted-foreground" />
                ) : metric.id === "volume" ? (
                  <ChartBar className="size-4 text-muted-foreground" />
                ) : metric.id === "apy" ? (
                  <Percent className="size-4 text-muted-foreground" />
                ) : (
                  <TrendUp className="size-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tracking-tight">{metric.value}</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <ChangeBadge change={metric.change} />
                  {metric.hint ? (
                    <span className="truncate text-xs text-muted-foreground">{metric.hint}</span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="border-border/80 shadow-none lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">TVL & volume (7d)</CardTitle>
            </CardHeader>
            <CardContent className="h-72 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={36} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="tvl"
                    name="TVL ($M)"
                    stroke="var(--color-primary)"
                    fill="url(#tvlFill)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Volume mix</CardTitle>
            </CardHeader>
            <CardContent className="h-72 pt-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={28} />
                  <Tooltip />
                  <Bar
                    dataKey="volume"
                    name="Volume ($M)"
                    fill="var(--color-primary)"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/80 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Protocol positions</CardTitle>
              <Badge variant="outline">
                <Shield className="mr-1 size-3" />
                Risk scored
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.protocols.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 text-right">
                    <div>
                      <p className="text-xs text-muted-foreground">TVL</p>
                      <p className="text-sm font-medium">{p.tvl}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">APY</p>
                      <p className="text-sm font-medium text-emerald-500">{p.apy}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        riskColor(p.risk),
                      )}
                    >
                      {p.risk}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">Market insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.markets.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-3 py-2.5"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {m.asset} <span className="text-muted-foreground">({m.symbol})</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Vol {m.volume}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{m.price}</p>
                    <ChangeBadge change={m.change24h} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default Web3Dashboard;
