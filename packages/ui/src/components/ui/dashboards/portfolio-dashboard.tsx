import {
  Plus,
  Calendar,
  DotsThreeVertical,
  UploadSimple,
  ArrowsClockwise,
  MagnifyingGlass,
  Sparkle,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  price: number;
  holdingsValue: number;
  holdingsAmount: number;
  allocation: number;
  plValue: number;
  plPercentage: number;
  color: string;
}

export interface PortfolioData {
  totalBalance: number;
  totalPlValue: number;
  totalPlPercentage: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  chartData: ChartDataPoint[];
  assets: Asset[];
}

interface PortfolioComponentProps {
  data: PortfolioData;
}

const timeframeOptions = ["24H", "7D", "30D", "90D", "All"];

export const PortfolioDashboard: React.FC<PortfolioComponentProps> = ({ data }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState("7D");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        damping: 25,
        stiffness: 150,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", damping: 20, stiffness: 200 },
    },
  };

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center p-4 transition-colors duration-500"
      style={{ backgroundColor: theme === "dark" ? "#0a0a0a" : "#f4f4f5" }}
    >
      {/* Theme Toggle Button */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={`absolute top-8 right-8 z-50 rounded-xl border p-2.5 transition-all duration-300 ${
          theme === "dark"
            ? "border-[#1e1e1e] bg-[#0f0f0f] text-yellow-500"
            : "border-gray-200 bg-white text-slate-800 shadow-lg"
        }`}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-[#1e1e1e] bg-[#0f0f0f] shadow-2xl transition-all duration-500"
        style={{
          filter: theme === "light" ? "invert(0.94) hue-rotate(180deg)" : "none",
        }}
      >
        {/* Top Header  */}
        <div className="flex items-center justify-between bg-[#0f0f0f] px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium text-white">Portfolio</span>
            <span className="text-[10px] font-bold tracking-widest text-[#666666] uppercase">
              / RISK: {data.riskLevel}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-full bg-[#FF6B2B] px-3.5 py-1.5 text-xs font-bold text-black shadow-lg shadow-orange-950/20 transition-colors hover:bg-[#ff7b42]"
          >
            <Plus size={16} />
            Fund
          </motion.button>
        </div>

        <div className="rounded-xl border-t-[1.6px] border-b-[1.6px] border-[#1D1D1D] bg-[#171717] p-5">
          {/* Balance & Chart Filters */}
          <div className="mb-2 flex items-start justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-1 text-3xl font-bold tracking-tight text-white"
              >
                ${data.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </motion.h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#14E62B]">
                  +${data.totalPlValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="rounded-full bg-[#172C19] px-1.5 py-0.5 text-[10px] font-bold text-[#14E62B]">
                  +{data.totalPlPercentage}%
                </span>
              </div>
            </div>

            <div className="flex items-center rounded-full border border-[#2a2a2a] bg-[#1a1a1a] p-0.5">
              {timeframeOptions.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSelectedTimeframe(tf)}
                  className={`relative rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors duration-200 ${
                    selectedTimeframe === tf ? "text-[#BF5527]" : "text-[#555] hover:text-[#888]"
                  }`}
                >
                  {selectedTimeframe === tf && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 z-0 rounded-full border border-[#BF5527]/20 bg-[#32211A]"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{tf}</span>
                </button>
              ))}
              <button
                title="schedule"
                className="p-1.5 text-[#555] transition-colors hover:text-[#ffffff]"
              >
                <Calendar size={12} />
              </button>
            </div>
          </div>

          {/* Line Chart  */}
          <div className="mt-2 mb-3 h-[160px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B2B" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#FF6B2B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#1f1f1f" />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#444", fontSize: 9, fontWeight: 600 }}
                  dy={8}
                />
                <YAxis hide domain={["auto", "auto"]} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#FF6B2B"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  animationDuration={1500}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="border-t-[1.7px] border-dashed border-[#f1f1f1]/5 py-2.5" />

          {/* Assets Section Header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">{data.assets.length} Assets</h2>
            <button className="rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-2.5 py-1 text-[10px] font-bold text-[#666] transition-colors hover:text-white">
              View all
            </button>
          </div>

          {/* Allocation Bar */}
          <div className="mb-6 flex h-1.5 w-full overflow-hidden rounded-full bg-[#1a1a1a]">
            {data.assets.map((asset) => (
              <motion.div
                key={asset.id}
                initial={{ width: 0 }}
                animate={{ width: `${asset.allocation}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                style={{ backgroundColor: asset.color }}
                className="h-full rounded-sm opacity-90"
              />
            ))}
          </div>

          {/* Assets Table */}
          <div className="space-y-3">
            <div className="grid grid-cols-5 px-2 text-[9px] font-bold tracking-widest text-[#444] uppercase">
              <span className="col-span-1">Name</span>
              <span className="text-right">Price</span>
              <span className="text-right">Holdings</span>
              <span className="text-right">Allocation</span>
              <span className="text-right">P/L</span>
            </div>

            <div className="space-y-1">
              {data.assets.map((asset) => (
                <motion.div
                  key={asset.id}
                  variants={itemVariants}
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                  className="group grid cursor-pointer grid-cols-5 items-center rounded-xl p-2 transition-colors"
                >
                  <div className="col-span-1 flex items-center gap-2.5">
                    <div
                      className="h-5 w-0.5 rounded-full"
                      style={{ backgroundColor: asset.color }}
                    />
                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[#2a2a2a] bg-[#1a1a1a]">
                      <img src={asset.icon} alt={asset.name} className="h-4 w-4 object-contain" />
                    </div>
                    <span className="text-xs font-bold text-white">{asset.name}</span>
                  </div>

                  <span className="text-right text-[11px] font-medium text-[#777]">
                    ${asset.price.toLocaleString()}
                  </span>

                  <div className="flex flex-col text-right">
                    <span className="text-[11px] font-bold text-white">
                      ${asset.holdingsValue.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-medium text-[#555]">
                      {asset.holdingsAmount} {asset.symbol}
                    </span>
                  </div>

                  <span className="text-right text-[11px] font-semibold text-[#777]">
                    {asset.allocation}%
                  </span>

                  <div className="flex flex-col text-right">
                    <span
                      className={`text-[11px] font-bold ${asset.plValue >= 0 ? "text-[#14E62B]" : "text-[#A5343E]"}`}
                    >
                      {asset.plValue >= 0 ? "+" : ""}${Math.abs(asset.plValue).toLocaleString()}
                    </span>
                    <span
                      className={`text-[9px] font-bold ${asset.plPercentage >= 0 ? "text-[#14E62B]" : "text-[#A5343E]"}`}
                    >
                      {asset.plPercentage >= 0 ? "+" : ""}
                      {asset.plPercentage}%
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar  */}
        <div className="flex items-center justify-between bg-[#0d0d0d] px-5 py-3.5">
          <div className="flex items-center gap-3.5 text-[#555]">
            <DotsThreeVertical size={16} className="cursor-pointer hover:text-white" />
            <UploadSimple size={16} className="cursor-pointer hover:text-white" />
            <ArrowsClockwise size={16} className="cursor-pointer hover:text-white" />
            <MagnifyingGlass size={16} className="cursor-pointer hover:text-white" />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-1">
              <img
                src={data.assets[0].icon}
                className="h-3.5 w-3.5 rounded-full border border-black"
                alt="btc"
              />
              <img
                src={data.assets[1].icon}
                className="h-3.5 w-3.5 rounded-full border border-black"
                alt="eth"
              />
            </div>
            <span className="text-[8px] font-bold tracking-tighter whitespace-nowrap text-[#666] uppercase">
              BTC & ETH DRIVE 71% OF GAINS
            </span>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-transparent px-3 py-1 text-[10px] font-bold text-white transition-all hover:bg-[#1a1a1a]"
          >
            <Sparkle size={12} className="text-[#A17DFF]" />
            Rebalance
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};
