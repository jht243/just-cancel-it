import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw, Minus, Plus, ChevronDown, HelpCircle, X, ExternalLink, Zap, Mail, MessageSquare, Heart, Printer, Check, TrendingUp, Info
} from "lucide-react";

const COLORS = {
  primary: "#56C596", primaryDark: "#3aa87b", bg: "#FAFAFA", card: "#FFFFFF",
  textMain: "#1A1A1A", textSecondary: "#9CA3AF", border: "#F3F4F6",
  inputBg: "#F9FAFB", accentLight: "#E6F7F0", blue: "#5D9CEC", yellow: "#F59E0B",
  red: "#FF6B6B", orange: "#F2994A", orangeLight: "#FFF7ED", purple: "#8B5CF6",
  gold: "#F59E0B"
};

const CRYPTO_COLORS: Record<string, string> = {
  btc: "#F7931A",
  eth: "#627EEA",
  sol: "#9945FF",
  ada: "#0033AD",
  link: "#2A5ADA",
  avax: "#E84142",
  dot: "#E6007A",
  xrp: "#23292F",
  bnb: "#F3BA2F",
  doge: "#C2A633",
  matic: "#8247E5",
  atom: "#2E3148",
  uni: "#FF007A",
  other: "#8B5CF6"
};

// Crypto logos as inline SVGs
const CryptoLogo = ({ ticker, size = 20 }: { ticker: string; size?: number }) => {
  const logos: Record<string, React.ReactNode> = {
    BTC: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#F7931A" cx="16" cy="16" r="16"/><path fill="#FFF" d="M22.5 14.1c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6c-.4-.1-.8-.2-1.3-.3l.7-2.7-1.6-.4-.7 2.7c-.4-.1-.7-.2-1-.2v0l-2.3-.6-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.2c0 0 .1 0 .2.1-.1 0-.1 0-.2 0l-1.1 4.5c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.1.5c.4.1.8.2 1.2.3l-.7 2.8 1.6.4.7-2.7c.4.1.9.2 1.3.3l-.7 2.7 1.6.4.7-2.8c2.9.5 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.3 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4 1-5.1.7l.9-3.7c1.2.3 4.8.9 4.2 3zm.5-5.4c-.5 1.9-3.4.9-4.3.7l.8-3.3c1 .2 4 .7 3.5 2.6z"/></svg>,
    ETH: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#627EEA" cx="16" cy="16" r="16"/><path fill="#FFF" fillOpacity=".6" d="M16 4v8.9l7.5 3.3z"/><path fill="#FFF" d="M16 4L8.5 16.2l7.5-3.3z"/><path fill="#FFF" fillOpacity=".6" d="M16 21.9v6.1l7.5-10.4z"/><path fill="#FFF" d="M16 28v-6.1l-7.5-4.3z"/><path fill="#FFF" fillOpacity=".2" d="M16 20.6l7.5-4.4L16 12.9z"/><path fill="#FFF" fillOpacity=".6" d="M8.5 16.2l7.5 4.4v-7.7z"/></svg>,
    SOL: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#9945FF" cx="16" cy="16" r="16"/><path fill="#FFF" d="M9.5 19.8l2.1-2.1c.1-.1.3-.2.4-.2h11.5c.3 0 .4.3.2.5l-2.1 2.1c-.1.1-.3.2-.4.2H9.7c-.3 0-.4-.3-.2-.5zm2.1-5.6c.1-.1.3-.2.4-.2h11.5c.3 0 .4.3.2.5l-2.1 2.1c-.1.1-.3.2-.4.2H9.7c-.3 0-.4-.3-.2-.5l2.1-2.1zm9.8-2.4l-2.1-2.1c-.1-.1-.3-.2-.4-.2H7.4c-.3 0-.4.3-.2.5l2.1 2.1c.1.1.3.2.4.2h11.5c.3 0 .4-.3.2-.5z"/></svg>,
    ADA: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#0033AD" cx="16" cy="16" r="16"/><path fill="#FFF" d="M16 6a10 10 0 100 20 10 10 0 000-20zm0 2a8 8 0 110 16 8 8 0 010-16zm0 3a5 5 0 100 10 5 5 0 000-10z"/></svg>,
    LINK: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#2A5ADA" cx="16" cy="16" r="16"/><path fill="#FFF" d="M16 6l-1.8 1 6.4 3.7v7.4l1.8 1V11.7L16 8zm-7.5 4.3v7.4l6.4 3.7 1.8-1-6.4-3.7v-7.4l-1.8 1zm13.2 7.4l-1.8 1v7.4l-3.9 2.2-1.8-1-4.6-2.7v-4.3l-1.8 1v5.3L16 30l7.5-4.3V18.3l-1.8-1z"/></svg>,
    AVAX: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#E84142" cx="16" cy="16" r="16"/><path fill="#FFF" d="M11.5 20.5h-3c-.4 0-.6-.2-.4-.6l7.5-13c.2-.4.6-.4.8 0l1.7 3c.2.3.2.7 0 1l-5.9 9.3c-.2.2-.4.3-.7.3zm9 0h-3.3c-.4 0-.6-.2-.4-.6l3.4-5.3c.2-.4.6-.4.8 0l1.7 2.6c.2.3.2.7 0 1l-1.7 2.6c-.1.4-.3.7-.5.7z"/></svg>,
    DOT: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#E6007A" cx="16" cy="16" r="16"/><ellipse fill="#FFF" cx="16" cy="16" rx="4" ry="4"/><ellipse fill="#FFF" cx="16" cy="7" rx="2.5" ry="2.5"/><ellipse fill="#FFF" cx="16" cy="25" rx="2.5" ry="2.5"/><ellipse fill="#FFF" cx="8" cy="11.5" rx="2" ry="2"/><ellipse fill="#FFF" cx="24" cy="11.5" rx="2" ry="2"/><ellipse fill="#FFF" cx="8" cy="20.5" rx="2" ry="2"/><ellipse fill="#FFF" cx="24" cy="20.5" rx="2" ry="2"/></svg>,
    XRP: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#23292F" cx="16" cy="16" r="16"/><path fill="#FFF" d="M23.1 8h2.4l-5.7 5.6c-2.1 2-5.5 2-7.6 0L6.5 8h2.4l4.5 4.4c1.4 1.3 3.6 1.3 5 0L23.1 8zM8.9 24H6.5l5.7-5.6c2.1-2 5.5-2 7.6 0l5.7 5.6h-2.4l-4.5-4.4c-1.4-1.3-3.6-1.3-5 0L8.9 24z"/></svg>,
    BNB: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#F3BA2F" cx="16" cy="16" r="16"/><path fill="#FFF" d="M12.1 14.3L16 10.4l3.9 3.9 2.3-2.3L16 5.8 9.8 12l2.3 2.3zm-6.3 1.7l2.3-2.3 2.3 2.3-2.3 2.3-2.3-2.3zm6.3 1.7L16 21.6l3.9-3.9 2.3 2.3-6.2 6.2-6.2-6.2 2.3-2.3zm12.1-1.7l-2.3 2.3-2.3-2.3 2.3-2.3 2.3 2.3zM18.3 16L16 13.7 13.7 16 16 18.3 18.3 16z"/></svg>,
    DOGE: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#C2A633" cx="16" cy="16" r="16"/><path fill="#FFF" d="M13 9h5.5c4 0 6.5 3 6.5 7s-2.5 7-6.5 7H13V9zm3 3v8h2.5c2 0 3.5-1.5 3.5-4s-1.5-4-3.5-4H16z"/><path fill="#FFF" d="M11 15h8v2h-8z"/></svg>,
    MATIC: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#8247E5" cx="16" cy="16" r="16"/><path fill="#FFF" d="M21.1 12.3c-.4-.2-.9-.2-1.2 0l-2.9 1.7-2 1.1-2.9 1.7c-.4.2-.9.2-1.2 0l-2.3-1.3c-.4-.2-.6-.6-.6-1.1v-2.6c0-.4.2-.9.6-1.1l2.3-1.3c.4-.2.9-.2 1.2 0l2.3 1.3c.4.2.6.6.6 1.1v1.7l2-1.1v-1.7c0-.4-.2-.9-.6-1.1l-4.2-2.5c-.4-.2-.9-.2-1.2 0l-4.3 2.5c-.4.2-.6.6-.6 1.1v5c0 .4.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.2 0l2.9-1.7 2-1.1 2.9-1.7c.4-.2.9-.2 1.2 0l2.3 1.3c.4.2.6.6.6 1.1v2.6c0 .4-.2.9-.6 1.1l-2.2 1.3c-.4.2-.9.2-1.2 0l-2.3-1.3c-.4-.2-.6-.6-.6-1.1v-1.7l-2 1.1v1.7c0 .4.2.9.6 1.1l4.3 2.5c.4.2.9.2 1.2 0l4.3-2.5c.4-.2.6-.6.6-1.1v-5c0-.4-.2-.9-.6-1.1l-4.4-2.4z"/></svg>,
    ATOM: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#2E3148" cx="16" cy="16" r="16"/><ellipse fill="none" stroke="#FFF" strokeWidth="1.5" cx="16" cy="16" rx="10" ry="4" transform="rotate(-60 16 16)"/><ellipse fill="none" stroke="#FFF" strokeWidth="1.5" cx="16" cy="16" rx="10" ry="4" transform="rotate(60 16 16)"/><ellipse fill="none" stroke="#FFF" strokeWidth="1.5" cx="16" cy="16" rx="10" ry="4"/><circle fill="#FFF" cx="16" cy="16" r="2.5"/></svg>,
    UNI: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#FF007A" cx="16" cy="16" r="16"/><path fill="#FFF" d="M11 10c1.5 0 2.5.5 3.5 1.5.5.5 1 1.3 1.3 2 0 0 .2-.5.5-1 .5-1 1.5-2 3-2.5 0 0-1 1.5-1 3 0 1 .5 2 1 3 1 1.5 1.5 3 1.5 5 0 3-2.5 5.5-5.5 5.5s-5.5-2.5-5.5-5.5c0-2 .5-3.5 1.5-5 .5-1 1-2 1-3 0-1.5-1.3-3-1.3-3zm3 6c-.5 0-1 .5-1 1s.5 1 1 1 1-.5 1-1-.5-1-1-1zm4 0c-.5 0-1 .5-1 1s.5 1 1 1 1-.5 1-1-.5-1-1-1z"/></svg>,
    OTHER: <svg viewBox="0 0 32 32" width={size} height={size}><circle fill="#8B5CF6" cx="16" cy="16" r="16"/><circle fill="#FFF" cx="10" cy="16" r="2"/><circle fill="#FFF" cx="16" cy="16" r="2"/><circle fill="#FFF" cx="22" cy="16" r="2"/></svg>
  };
  return logos[ticker.toUpperCase()] || logos.OTHER;
};

// Filter options
type RiskLevel = "low" | "medium" | "high";
type Category = "staking" | "lending" | "farming" | "cefi" | "options" | "mining";
type EaseLevel = "easy" | "medium" | "hard";

const RISK_OPTIONS: { value: RiskLevel | "all"; label: string }[] = [
  { value: "all", label: "All Risk" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" }
];

const CATEGORY_OPTIONS: { value: Category | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "staking", label: "Staking" },
  { value: "lending", label: "Lending" },
  { value: "farming", label: "Farming" },
  { value: "cefi", label: "CEX Earn" },
  { value: "options", label: "Options" },
  { value: "mining", label: "Mining" }
];

const EASE_OPTIONS: { value: EaseLevel | "all"; label: string }[] = [
  { value: "all", label: "All Difficulty" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" }
];

// Yield strategy data with referral links
const YIELD_STRATEGIES = [
  {
    id: "staking",
    name: "Liquid Staking",
    platform: "Lido / Ankr",
    description: "Stake ETH and receive liquid tokens (stETH) you can use in DeFi while earning yield",
    minApy: 4,
    maxApy: 7,
    risk: "low" as RiskLevel,
    category: "staking" as Category,
    ease: "easy" as EaseLevel,
    assets: ["eth"],
    referralUrl: "https://stake.lido.fi",
    icon: "🔒"
  },
  {
    id: "lending",
    name: "DeFi Lending",
    platform: "Aave",
    description: "Lend your BTC (as wBTC) or ETH to borrowers and earn interest",
    minApy: 2,
    maxApy: 8,
    risk: "medium" as RiskLevel,
    category: "lending" as Category,
    ease: "medium" as EaseLevel,
    assets: ["btc", "eth"],
    referralUrl: "https://app.aave.com",
    icon: "💰"
  },
  {
    id: "yield_farming",
    name: "Yield Farming",
    platform: "Uniswap / Curve",
    description: "Provide liquidity to DEX pools and earn trading fees plus token rewards",
    minApy: 5,
    maxApy: 15,
    risk: "high" as RiskLevel,
    category: "farming" as Category,
    ease: "hard" as EaseLevel,
    assets: ["eth", "sol", "other"],
    referralUrl: "https://app.uniswap.org",
    icon: "🌾"
  },
  {
    id: "cefi_earn",
    name: "CEX Earn Programs",
    platform: "Coinbase / Binance",
    description: "Earn rewards by holding crypto on major exchanges with flexible or locked terms",
    minApy: 1,
    maxApy: 6,
    risk: "low" as RiskLevel,
    category: "cefi" as Category,
    ease: "easy" as EaseLevel,
    assets: ["btc", "eth", "sol", "ada", "link", "avax", "dot", "xrp", "bnb", "doge", "matic", "atom", "uni", "other"],
    referralUrl: "https://www.coinbase.com/earn",
    icon: "🏦"
  },
  {
    id: "derivatives",
    name: "Options Premium",
    platform: "Deribit / Bybit",
    description: "Sell covered calls on your holdings to earn premium income",
    minApy: 5,
    maxApy: 20,
    risk: "high" as RiskLevel,
    category: "options" as Category,
    ease: "hard" as EaseLevel,
    assets: ["btc", "eth"],
    referralUrl: "https://www.deribit.com",
    icon: "📈"
  },
  {
    id: "mining",
    name: "Cloud Mining",
    platform: "GoMining",
    description: "Earn BTC through tokenized mining operations without hardware",
    minApy: 3,
    maxApy: 8,
    risk: "medium" as RiskLevel,
    category: "mining" as Category,
    ease: "medium" as EaseLevel,
    assets: ["btc"],
    referralUrl: "https://gomining.com/referral-program",
    icon: "⛏️"
  }
];

// LocalStorage persistence with 30-day expiry per SDK guidelines
const STORAGE_KEY = "CRYPTO_YIELD_OPTIMIZER_DATA";
const BANNER_STORAGE_KEY = "CRYPTO_YIELD_BANNER_DISMISSED";
const EXPIRATION_DAYS = 30;
const EXPIRATION_HOURS = EXPIRATION_DAYS * 24; // 720 hours

// CoinGecko ID mapping for price fetching
const COINGECKO_IDS: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  sol: "solana",
  ada: "cardano",
  link: "chainlink",
  avax: "avalanche-2",
  dot: "polkadot",
  xrp: "ripple",
  bnb: "binancecoin",
  doge: "dogecoin",
  matic: "matic-network",
  atom: "cosmos",
  uni: "uniswap",
  other: "bitcoin" // fallback
};

type InputMode = "dollar" | "amount";

interface CryptoHoldings {
  btc: string;
  eth: string;
  sol: string;
  ada: string;
  link: string;
  avax: string;
  dot: string;
  xrp: string;
  bnb: string;
  doge: string;
  matic: string;
  atom: string;
  uni: string;
  other: string;
}

interface CryptoPrices {
  [key: string]: number;
}

interface SavedYieldData {
  holdings: CryptoHoldings;
  amounts: CryptoHoldings;
  currentYieldPercent: string;
  inputMode: InputMode;
}

const DEFAULT_HOLDINGS: CryptoHoldings = { btc: "0", eth: "0", sol: "0", ada: "0", link: "0", avax: "0", dot: "0", xrp: "0", bnb: "0", doge: "0", matic: "0", atom: "0", uni: "0", other: "0" };

const DEFAULT_DATA: SavedYieldData = {
  holdings: DEFAULT_HOLDINGS,
  amounts: DEFAULT_HOLDINGS,
  currentYieldPercent: "1",
  inputMode: "dollar"
};

const loadSavedData = (): SavedYieldData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { data, timestamp } = JSON.parse(saved);
      const hoursDiff = (new Date().getTime() - timestamp) / (1000 * 60 * 60);
      if (hoursDiff < EXPIRATION_HOURS) return { ...DEFAULT_DATA, ...data };
    }
  } catch (e) { console.error("Failed to load saved yield data", e); }
  return DEFAULT_DATA;
};

const saveData = (data: SavedYieldData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, timestamp: new Date().getTime() }));
  } catch (e) { console.error("Failed to save yield data", e); }
};

const NumberControl = ({ value, onChange, min = 0, max = 10000000, step = 1, suffix, prefix, disabled = false }: {
  value: string; onChange: (val: string) => void; min?: number; max?: number; step?: number; suffix?: string; prefix?: string; disabled?: boolean;
}) => {
  const handleDec = () => { if (disabled) return; const num = parseFloat(value) || 0; if (num - step >= min) onChange(Math.round((num - step) * 100) / 100 + ""); };
  const handleInc = () => { if (disabled) return; const num = parseFloat(value) || 0; if (num + step <= max) onChange(Math.round((num + step) * 100) / 100 + ""); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (disabled) return; const val = e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, ""); onChange(val); };
  const btnStyle = { width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: disabled ? COLORS.border : "white", color: disabled ? COLORS.textSecondary : COLORS.primary, display: "flex" as const, alignItems: "center" as const, justifyContent: "center" as const, cursor: disabled ? "not-allowed" as const : "pointer" as const, boxShadow: "0 2px 4px rgba(0,0,0,0.05)" };
  return (
    <div style={{ backgroundColor: COLORS.inputBg, borderRadius: "12px", padding: "6px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", height: "44px", opacity: disabled ? 0.6 : 1 }}>
      <button onClick={handleDec} style={btnStyle} disabled={disabled}><Minus size={16} strokeWidth={3} /></button>
      <div style={{ flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
        {prefix && <span style={{ fontSize: "16px", fontWeight: 700, color: COLORS.textMain }}>{prefix}</span>}
        <input type="text" value={value ? Number(value).toLocaleString() : ""} onChange={handleChange} disabled={disabled} style={{ width: "100%", border: "none", background: "transparent", textAlign: "center", fontSize: "16px", fontWeight: 700, color: COLORS.textMain, outline: "none" }} />
        {suffix && <span style={{ fontSize: "14px", color: COLORS.textSecondary, fontWeight: 500 }}>{suffix}</span>}
      </div>
      <button onClick={handleInc} style={btnStyle} disabled={disabled}><Plus size={16} strokeWidth={3} /></button>
    </div>
  );
};

const CryptoSlider = ({ label, value, onChange, color, ticker, mode, price, dollarValue }: { 
  label: string; value: string; onChange: (val: string) => void; color: string; ticker: string; 
  mode: InputMode; price?: number; dollarValue?: number;
}) => {
  const numVal = parseFloat(value) || 0;
  const isDollarMode = mode === "dollar";
  const maxVal = isDollarMode ? 100000 : 1000;
  const sliderPercent = Math.min((numVal / maxVal) * 100, 100);
  const displayDollar = isDollarMode ? numVal : (dollarValue || 0);
  
  return (
    <div style={{ width: "calc(50% - 8px)", flexShrink: 0, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <CryptoLogo ticker={ticker} size={20} />
          <span style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: COLORS.inputBg, padding: "6px 10px", borderRadius: 8, width: 110, justifyContent: "center", flexShrink: 0 }}>
          {isDollarMode ? (
            <>
              <span style={{ color: COLORS.primary, fontWeight: 600, fontSize: 13 }}>$</span>
              <input type="text" value={numVal > 0 ? numVal.toLocaleString() : value} onChange={(e) => onChange(e.target.value.replace(/,/g, "").replace(/[^0-9]/g, ""))} placeholder="0" style={{ width: 75, border: "none", background: "transparent", textAlign: "right", fontSize: 14, fontWeight: 700, color: COLORS.textMain, outline: "none" }} />
            </>
          ) : (
            <>
              <input type="text" value={numVal > 0 ? numVal.toLocaleString(undefined, { maximumFractionDigits: 4 }) : value} onChange={(e) => onChange(e.target.value.replace(/,/g, "").replace(/[^0-9.]/g, ""))} placeholder="0" style={{ width: 60, border: "none", background: "transparent", textAlign: "right", fontSize: 14, fontWeight: 700, color: COLORS.textMain, outline: "none" }} />
              <span style={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{ticker}</span>
            </>
          )}
        </div>
      </div>
      {/* Show dollar equivalent when in amount mode */}
      {!isDollarMode && numVal > 0 && price && (
        <div style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 4, textAlign: "right" }}>
          ≈ ${displayDollar.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      )}
      <input type="range" min={0} max={maxVal} step={isDollarMode ? 100 : 0.01} value={numVal} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", height: 6, borderRadius: 3, appearance: "none", background: `linear-gradient(to right, ${color} 0%, ${color} ${sliderPercent}%, ${COLORS.border} ${sliderPercent}%, ${COLORS.border} 100%)`, cursor: "pointer" }} />
    </div>
  );
};

const InfoTooltip = ({ text, children }: { text: string; children: React.ReactNode }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6, padding: "8px 12px", backgroundColor: "#333", color: "white", fontSize: 11, borderRadius: 8, whiteSpace: "normal", zIndex: 1000, width: 200, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {text}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #333" }}></div>
        </div>
      )}
    </div>
  );
};

const COIN_NAMES: Record<string, string> = {
  btc: "Bitcoin", eth: "Ethereum", sol: "Solana", ada: "Cardano", link: "Chainlink",
  avax: "Avalanche", dot: "Polkadot", xrp: "XRP", bnb: "BNB", doge: "Dogecoin",
  matic: "Polygon", atom: "Cosmos", uni: "Uniswap", other: "other crypto"
};

const StrategyCard = ({ strategy, potentialYield, onOptimize, userHeldAssets }: { 
  strategy: typeof YIELD_STRATEGIES[0]; potentialYield: number; onOptimize: () => void;
  userHeldAssets: string[];
}) => {
  const riskColors: Record<string, string> = { low: COLORS.primary, medium: COLORS.yellow, high: COLORS.red };
  const easeColors: Record<string, string> = { easy: COLORS.primary, medium: COLORS.blue, hard: COLORS.purple };
  const easeLabels: Record<string, string> = { easy: "Easy Setup", medium: "Medium Setup", hard: "Advanced Setup" };
  
  // Get the coins the user holds that this strategy supports
  const relevantUserCoins = strategy.assets.filter(asset => userHeldAssets.includes(asset));
  const coinCallout = relevantUserCoins.length > 0 
    ? relevantUserCoins.map(c => COIN_NAMES[c] || c.toUpperCase()).join(", ")
    : strategy.assets.map(c => COIN_NAMES[c] || c.toUpperCase()).join(", ");
  
  return (
    <div style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{ fontSize: 24 }}>{strategy.icon}</div>
          <div>
            <div style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 15 }}>{strategy.name}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{strategy.platform}</div>
          </div>
        </div>
        {potentialYield > 0 && (
          <div style={{ 
            backgroundColor: COLORS.accentLight, 
            padding: "6px 12px", 
            borderRadius: 20, 
            textAlign: "center",
            border: `1px solid ${COLORS.primary}`,
            marginLeft: 8,
            marginRight: 8
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.primary }}>+${potentialYield.toLocaleString()}</div>
            <div style={{ fontSize: 10, color: COLORS.primaryDark, fontWeight: 600 }}>per year</div>
          </div>
        )}
        <div style={{ textAlign: "right", flex: "0 0 auto" }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{strategy.minApy}-{strategy.maxApy}%</div>
          <div style={{ fontSize: 11, color: COLORS.textSecondary }}>APY Range</div>
        </div>
      </div>
      
      <div style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 1.5 }}>
        {strategy.description}
      </div>
      
      {/* Coin callout */}
      <div style={{ 
        display: "flex", alignItems: "center", gap: 6, 
        backgroundColor: COLORS.inputBg, padding: "8px 12px", borderRadius: 8, 
        marginBottom: 12, fontSize: 12, color: COLORS.textMain
      }}>
        <span style={{ fontSize: 14 }}>💡</span>
        <span>
          <strong>Use for your:</strong> {coinCallout}
        </span>
      </div>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: riskColors[strategy.risk], backgroundColor: `${riskColors[strategy.risk]}15`, padding: "4px 8px", borderRadius: 4, textTransform: "uppercase" }}>
            {strategy.risk} risk
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, color: easeColors[strategy.ease], backgroundColor: `${easeColors[strategy.ease]}15`, padding: "4px 8px", borderRadius: 4 }}>
            {easeLabels[strategy.ease]}
          </span>
        </div>
        <a 
          href={strategy.referralUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: "flex", alignItems: "center", gap: 6, 
            backgroundColor: COLORS.primary, color: "white", 
            padding: "8px 14px", borderRadius: 8, 
            fontSize: 13, fontWeight: 700, textDecoration: "none",
            boxShadow: "0 2px 8px rgba(86,197,150,0.3)"
          }}
          onClick={onOptimize}
        >
          Optimize <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

export default function YieldOptimizer({ initialData }: { initialData?: any }) {
  const savedData = loadSavedData();
  
  // Input mode: dollar or amount
  const [inputMode, setInputMode] = useState<InputMode>(() => savedData.inputMode || "dollar");
  
  // Dollar holdings
  const [holdings, setHoldings] = useState<CryptoHoldings>(() => {
    if (initialData?.btc || initialData?.eth) {
      return {
        btc: String(initialData.btc || 0),
        eth: String(initialData.eth || 0),
        sol: String(initialData.sol || 0),
        ada: String(initialData.ada || 0),
        link: String(initialData.link || 0),
        avax: String(initialData.avax || 0),
        dot: String(initialData.dot || 0),
        xrp: String(initialData.xrp || 0),
        bnb: String(initialData.bnb || 0),
        doge: String(initialData.doge || 0),
        matic: String(initialData.matic || 0),
        atom: String(initialData.atom || 0),
        uni: String(initialData.uni || 0),
        other: String(initialData.other || 0)
      };
    }
    return savedData.holdings;
  });
  
  // Coin amount holdings
  const [amounts, setAmounts] = useState<CryptoHoldings>(() => savedData.amounts || DEFAULT_HOLDINGS);
  
  // Live crypto prices
  const [prices, setPrices] = useState<CryptoPrices>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  
  const [currentYieldPercent, setCurrentYieldPercent] = useState(() => {
    if (initialData?.current_yield_percent) return String(initialData.current_yield_percent);
    return savedData.currentYieldPercent;
  });
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBanner, setShowBanner] = useState(() => {
    try {
      const dismissed = localStorage.getItem(BANNER_STORAGE_KEY);
      if (dismissed) {
        const timestamp = parseInt(dismissed, 10);
        if (new Date().getTime() - timestamp < 24 * 60 * 60 * 1000) return false;
      }
    } catch (e) {}
    return true;
  });

  // Subscription State
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  // Filter State
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<Category | "all">("all");
  const [easeFilter, setEaseFilter] = useState<EaseLevel | "all">("all");

  // Fetch crypto prices from CoinGecko
  useEffect(() => {
    const fetchPrices = async () => {
      setPricesLoading(true);
      try {
        const ids = Object.values(COINGECKO_IDS).join(",");
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
        const data = await response.json();
        
        const priceMap: CryptoPrices = {};
        Object.entries(COINGECKO_IDS).forEach(([ticker, geckoId]) => {
          if (data[geckoId]?.usd) {
            priceMap[ticker] = data[geckoId].usd;
          }
        });
        setPrices(priceMap);
        console.log("Updated crypto prices:", priceMap);
      } catch (e) {
        console.error("Failed to fetch crypto prices", e);
      } finally {
        setPricesLoading(false);
      }
    };
    
    fetchPrices();
    // Refresh prices every 60 seconds
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Save data
  useEffect(() => {
    saveData({ holdings, amounts, currentYieldPercent, inputMode });
  }, [holdings, amounts, currentYieldPercent, inputMode]);

  // Calculate dollar values from amounts
  const getDollarValue = (ticker: string): number => {
    const amount = parseFloat(amounts[ticker as keyof CryptoHoldings]) || 0;
    const price = prices[ticker] || 0;
    return amount * price;
  };

  // Calculate totals based on input mode
  const totalPortfolio = useMemo(() => {
    let total = 0;
    if (inputMode === "dollar") {
      total = Object.values(holdings).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    } else {
      // Amount mode: calculate dollar values from amounts and prices
      total = Object.keys(amounts).reduce((acc, ticker) => {
        return acc + getDollarValue(ticker);
      }, 0);
    }
    console.log(`Recalculated total portfolio (${inputMode} mode):`, total);
    return total;
  }, [holdings, amounts, prices, inputMode]);

  const currentAnnualYield = useMemo(() => {
    const yieldPct = parseFloat(currentYieldPercent) || 0;
    return totalPortfolio * (yieldPct / 100);
  }, [totalPortfolio, currentYieldPercent]);

  // Calculate potential yield (using average optimized APY of 6%)
  const optimizedApy = 6; // Conservative average
  const potentialAnnualYield = useMemo(() => {
    return totalPortfolio * (optimizedApy / 100);
  }, [totalPortfolio]);

  const additionalYield = potentialAnnualYield - currentAnnualYield;

  // Get list of held assets based on input mode
  const userHeldAssets = useMemo(() => {
    if (inputMode === "dollar") {
      return Object.entries(holdings)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([key]) => key);
    } else {
      return Object.entries(amounts)
        .filter(([_, val]) => parseFloat(val) > 0)
        .map(([key]) => key);
    }
  }, [holdings, amounts, inputMode]);

  // Filter strategies based on holdings and filter selections
  const relevantStrategies = useMemo(() => {
    const heldAssets = userHeldAssets;
    
    let strategies = YIELD_STRATEGIES;
    
    // Filter by held assets (only if user has holdings)
    if (heldAssets.length > 0) {
      strategies = strategies.filter(s => 
        s.assets.some(asset => heldAssets.includes(asset))
      );
    }
    
    // Apply risk filter
    if (riskFilter !== "all") {
      strategies = strategies.filter(s => s.risk === riskFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== "all") {
      strategies = strategies.filter(s => s.category === categoryFilter);
    }
    
    // Apply ease filter
    if (easeFilter !== "all") {
      strategies = strategies.filter(s => s.ease === easeFilter);
    }
    
    // Sort by risk (low -> medium -> high)
    const riskOrder = { low: 0, medium: 1, high: 2 };
    strategies.sort((a, b) => riskOrder[a.risk] - riskOrder[b.risk]);
    
    return strategies;
  }, [userHeldAssets, riskFilter, categoryFilter, easeFilter]);

  // Calculate per-strategy potential yield
  const getStrategyPotentialYield = (strategy: typeof YIELD_STRATEGIES[0]) => {
    const avgApy = (strategy.minApy + strategy.maxApy) / 2;
    const relevantHoldings = strategy.assets.reduce((acc, asset) => {
      return acc + (parseFloat(holdings[asset as keyof CryptoHoldings]) || 0);
    }, 0);
    return Math.round(relevantHoldings * (avgApy / 100));
  };

  const handleDismissBanner = () => {
    setShowBanner(false);
    try { localStorage.setItem(BANNER_STORAGE_KEY, new Date().getTime().toString()); } catch (e) {}
  };

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      setSubscribeMessage("Please enter a valid email.");
      setSubscribeStatus("error");
      return;
    }
    setSubscribeStatus("loading");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, topicId: "crypto-yield-optimizer", topicName: "Crypto Yield Optimizer Updates" })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubscribeStatus("success");
        setSubscribeMessage(data.message);
        setTimeout(() => { setShowSubscribeModal(false); setEmail(""); setSubscribeStatus("idle"); setSubscribeMessage(""); }, 3000);
      } else {
        setSubscribeStatus("error");
        setSubscribeMessage(data.error || "Failed to subscribe.");
      }
    } catch (e) {
      setSubscribeStatus("error");
      setSubscribeMessage("Network error. Please try again.");
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus("submitting");
    try {
      const response = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "user_feedback", data: { feedback: feedbackText, calculatorType: "Crypto Yield Optimizer" } })
      });
      if (response.ok) {
        setFeedbackStatus("success");
        setTimeout(() => { setShowFeedbackModal(false); setFeedbackText(""); setFeedbackStatus("idle"); }, 2000);
      } else {
        setFeedbackStatus("error");
      }
    } catch (e) {
      setFeedbackStatus("error");
    }
  };

  const handleOptimizeClick = (strategyId: string) => {
    // Track click for analytics
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "referral_click", data: { strategy: strategyId, portfolioValue: totalPortfolio } })
      });
    } catch (e) {}
  };

  const resetToDefaults = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHoldings(DEFAULT_DATA.holdings);
    setAmounts(DEFAULT_DATA.amounts);
    setCurrentYieldPercent(DEFAULT_DATA.currentYieldPercent);
    setInputMode("dollar");
  };

  const styles = {
    container: { width: "100%", maxWidth: "600px", margin: "0 auto", backgroundColor: COLORS.bg, fontFamily: "'Inter', sans-serif", padding: "20px", boxSizing: "border-box" as const },
    card: { backgroundColor: COLORS.card, borderRadius: "24px", padding: "24px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)", marginBottom: "20px", width: "100%", boxSizing: "border-box" as const },
    row: { display: "flex", alignItems: "flex-start", marginBottom: "20px", gap: "16px" },
    column: { flex: 1, display: "flex", flexDirection: "column" as const },
    label: { fontWeight: 600, color: COLORS.textMain, fontSize: "15px", marginBottom: "0px" },
    subheaderLabel: { fontSize: "12px", color: COLORS.textSecondary, fontWeight: 400, marginTop: "0px", marginBottom: "8px", lineHeight: "1.3" },
    strategyBtn: (active: boolean) => ({ flex: 1, padding: "8px", borderRadius: "8px", border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, backgroundColor: active ? COLORS.accentLight : "white", color: active ? COLORS.primaryDark : COLORS.textSecondary, fontWeight: 700, fontSize: "12px", cursor: "pointer", textAlign: "center" as const }),
    footer: { display: "flex", justifyContent: "center", gap: "24px", marginTop: "40px", paddingTop: "24px", borderTop: `1px solid ${COLORS.border}` },
    footerBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary, fontSize: "14px", fontWeight: 600, padding: "8px" },
    modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "20px", paddingTop: "40px", overflowY: "auto" as const },
    modalContent: { backgroundColor: "white", borderRadius: "24px", padding: "24px", width: "100%", maxWidth: "560px", boxShadow: "0 20px 60px -10px rgba(0,0,0,0.2)", position: "relative" as const },
    modalClose: { position: "absolute" as const, top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary, padding: "8px" },
    input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "16px", backgroundColor: COLORS.inputBg, color: COLORS.textMain, marginBottom: "16px", boxSizing: "border-box" as const, outline: "none" }
  };

  return (
    <div style={styles.container}>
      <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.textMain, marginBottom: "10px" }}>The DeFi Yield Maximizer</div>
      <div style={{ fontSize: "14px", color: COLORS.textSecondary, marginBottom: "20px", display: "flex", alignItems: "center", gap: 6 }}>
        <Check size={16} color={COLORS.primary} /> Powered by Live DeFi Protocol APY Data™
      </div>

      {showBanner && (
        <div style={{ backgroundColor: COLORS.accentLight, borderRadius: "16px", padding: "16px", marginBottom: "24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", position: "relative" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: COLORS.primaryDark, paddingRight: "24px" }}>
            Get weekly yield optimization tips & alerts!
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="btn-press" onClick={() => setShowSubscribeModal(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", backgroundColor: COLORS.primary, color: "white", borderRadius: "24px", border: "none", fontSize: "13px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(86, 197, 150, 0.25)", marginRight: 24 }}>
              <Mail size={14} /> Subscribe
            </button>
            <div style={{ cursor: "pointer", padding: 4, position: "absolute", top: 8, right: 8, color: COLORS.textSecondary }} onClick={handleDismissBanner}>
              <X size={16} />
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Input Card */}
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textMain }}>Add Portfolio Below</div>
          <div style={{ display: "flex", gap: 4, backgroundColor: COLORS.inputBg, borderRadius: 8, padding: 2 }}>
            <div style={{ ...styles.strategyBtn(inputMode === "dollar"), padding: "6px 12px", fontSize: 13 }} onClick={() => setInputMode("dollar")}>$</div>
            <div style={{ ...styles.strategyBtn(inputMode === "amount"), padding: "6px 12px", fontSize: 13 }} onClick={() => setInputMode("amount")}>Amount</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 }}>
          {inputMode === "dollar" ? "Enter the USD value of each asset you hold" : "Enter how many coins the portfolio has"}
          {inputMode === "amount" && pricesLoading && <span style={{ marginLeft: 8, color: COLORS.primary }}>Loading prices...</span>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, width: "100%" }}>
          <CryptoSlider label="Bitcoin" value={inputMode === "dollar" ? holdings.btc : amounts.btc} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, btc: v })) : setAmounts(a => ({ ...a, btc: v }))} color={CRYPTO_COLORS.btc} ticker="BTC" mode={inputMode} price={prices.btc} dollarValue={getDollarValue("btc")} />
          <CryptoSlider label="Ethereum" value={inputMode === "dollar" ? holdings.eth : amounts.eth} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, eth: v })) : setAmounts(a => ({ ...a, eth: v }))} color={CRYPTO_COLORS.eth} ticker="ETH" mode={inputMode} price={prices.eth} dollarValue={getDollarValue("eth")} />
          <CryptoSlider label="Solana" value={inputMode === "dollar" ? holdings.sol : amounts.sol} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, sol: v })) : setAmounts(a => ({ ...a, sol: v }))} color={CRYPTO_COLORS.sol} ticker="SOL" mode={inputMode} price={prices.sol} dollarValue={getDollarValue("sol")} />
          <CryptoSlider label="Cardano" value={inputMode === "dollar" ? holdings.ada : amounts.ada} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, ada: v })) : setAmounts(a => ({ ...a, ada: v }))} color={CRYPTO_COLORS.ada} ticker="ADA" mode={inputMode} price={prices.ada} dollarValue={getDollarValue("ada")} />
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 4, marginBottom: 4, color: COLORS.blue, fontWeight: 700, fontSize: 14, width: "100%" }} onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? "HIDE MORE ASSETS" : "SHOW MORE ASSETS"} <ChevronDown size={16} style={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
          </div>
          
          {showAdvanced && (
            <>
              <CryptoSlider label="XRP" value={inputMode === "dollar" ? holdings.xrp : amounts.xrp} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, xrp: v })) : setAmounts(a => ({ ...a, xrp: v }))} color={CRYPTO_COLORS.xrp} ticker="XRP" mode={inputMode} price={prices.xrp} dollarValue={getDollarValue("xrp")} />
              <CryptoSlider label="BNB" value={inputMode === "dollar" ? holdings.bnb : amounts.bnb} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, bnb: v })) : setAmounts(a => ({ ...a, bnb: v }))} color={CRYPTO_COLORS.bnb} ticker="BNB" mode={inputMode} price={prices.bnb} dollarValue={getDollarValue("bnb")} />
              <CryptoSlider label="Chainlink" value={inputMode === "dollar" ? holdings.link : amounts.link} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, link: v })) : setAmounts(a => ({ ...a, link: v }))} color={CRYPTO_COLORS.link} ticker="LINK" mode={inputMode} price={prices.link} dollarValue={getDollarValue("link")} />
              <CryptoSlider label="Avalanche" value={inputMode === "dollar" ? holdings.avax : amounts.avax} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, avax: v })) : setAmounts(a => ({ ...a, avax: v }))} color={CRYPTO_COLORS.avax} ticker="AVAX" mode={inputMode} price={prices.avax} dollarValue={getDollarValue("avax")} />
              <CryptoSlider label="Polkadot" value={inputMode === "dollar" ? holdings.dot : amounts.dot} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, dot: v })) : setAmounts(a => ({ ...a, dot: v }))} color={CRYPTO_COLORS.dot} ticker="DOT" mode={inputMode} price={prices.dot} dollarValue={getDollarValue("dot")} />
              <CryptoSlider label="Dogecoin" value={inputMode === "dollar" ? holdings.doge : amounts.doge} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, doge: v })) : setAmounts(a => ({ ...a, doge: v }))} color={CRYPTO_COLORS.doge} ticker="DOGE" mode={inputMode} price={prices.doge} dollarValue={getDollarValue("doge")} />
              <CryptoSlider label="Polygon" value={inputMode === "dollar" ? holdings.matic : amounts.matic} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, matic: v })) : setAmounts(a => ({ ...a, matic: v }))} color={CRYPTO_COLORS.matic} ticker="MATIC" mode={inputMode} price={prices.matic} dollarValue={getDollarValue("matic")} />
              <CryptoSlider label="Cosmos" value={inputMode === "dollar" ? holdings.atom : amounts.atom} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, atom: v })) : setAmounts(a => ({ ...a, atom: v }))} color={CRYPTO_COLORS.atom} ticker="ATOM" mode={inputMode} price={prices.atom} dollarValue={getDollarValue("atom")} />
              <CryptoSlider label="Uniswap" value={inputMode === "dollar" ? holdings.uni : amounts.uni} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, uni: v })) : setAmounts(a => ({ ...a, uni: v }))} color={CRYPTO_COLORS.uni} ticker="UNI" mode={inputMode} price={prices.uni} dollarValue={getDollarValue("uni")} />
              <CryptoSlider label="Other Crypto" value={inputMode === "dollar" ? holdings.other : amounts.other} onChange={(v) => inputMode === "dollar" ? setHoldings(h => ({ ...h, other: v })) : setAmounts(a => ({ ...a, other: v }))} color={CRYPTO_COLORS.other} ticker="OTHER" mode={inputMode} price={prices.other} dollarValue={getDollarValue("other")} />
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: totalPortfolio > 0 ? COLORS.accentLight : COLORS.inputBg, borderRadius: 12, marginTop: 16, marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: totalPortfolio > 0 ? COLORS.primaryDark : COLORS.textSecondary }}>Total Portfolio Value</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: totalPortfolio > 0 ? COLORS.primary : COLORS.textSecondary }}>${Math.round(totalPortfolio).toLocaleString()}</span>
        </div>

        {/* Current Yield Input */}
        <div style={styles.row}>
          <div style={styles.column}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={styles.label}>Current Annual Yield</div>
              <InfoTooltip text="What percentage return are you currently earning on your crypto? (Staking, lending, etc.) Enter 0 if you're just holding.">
                <HelpCircle size={14} color={COLORS.textSecondary} style={{ cursor: "pointer" }} />
              </InfoTooltip>
            </div>
            <div style={styles.subheaderLabel}>What you're earning now (APY %)</div>
            <NumberControl value={currentYieldPercent} onChange={setCurrentYieldPercent} min={0} max={100} step={0.5} suffix="%" />
          </div>
        </div>
      </div>

      {/* Big Potential Yield Display */}
      {totalPortfolio > 0 && (
        <div style={{ ...styles.card, background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryDark} 100%)`, color: "white", textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
            This Portfolio <span style={{ borderBottom: "3px solid rgba(255,255,255,0.8)", paddingBottom: 4 }}>Could Be Earning</span>
          </div>
          <div style={{ fontSize: 52, fontWeight: 900, marginBottom: 4, textShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
            ${Math.round(potentialAnnualYield).toLocaleString()}
            <span style={{ fontSize: 22, fontWeight: 600, opacity: 0.8 }}>/year</span>
          </div>
          
          {additionalYield > 0 && (
            <div style={{ fontSize: 16, fontWeight: 700, backgroundColor: "rgba(255,255,255,0.25)", display: "inline-block", padding: "10px 20px", borderRadius: 24, marginTop: 12, border: "2px solid rgba(255,255,255,0.3)" }}>
              💸 +${Math.round(additionalYield).toLocaleString()} more than earning now!
            </div>
          )}
          
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 16 }}>
            Based on ~{optimizedApy}% average optimized APY across strategies
          </div>
        </div>
      )}

      {/* Current vs Optimized Comparison */}
      {totalPortfolio > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 16, padding: 16, textAlign: "center", border: `1px solid ${COLORS.border}` }}>
            <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Current Yield</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.textMain }}>${Math.round(currentAnnualYield).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: COLORS.textSecondary }}>{currentYieldPercent || 0}% APY</div>
          </div>
          <div style={{ flex: 1, backgroundColor: COLORS.accentLight, borderRadius: 16, padding: 16, textAlign: "center", border: `2px solid ${COLORS.primary}` }}>
            <div style={{ fontSize: 12, color: COLORS.primaryDark, marginBottom: 4 }}>Optimized Yield</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary }}>${Math.round(potentialAnnualYield).toLocaleString()}</div>
            <div style={{ fontSize: 12, color: COLORS.primaryDark }}>~{optimizedApy}% APY</div>
          </div>
        </div>
      )}

      {/* Strategy Options */}
      {totalPortfolio > 0 && (
        <div style={styles.card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textMain, marginBottom: 8 }}>Recommended Yield Strategies</div>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 }}>These strategies are customized based on your choices above</div>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {/* Risk Filter */}
            <select 
              value={riskFilter} 
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "all")}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 8, 
                border: `1px solid ${riskFilter !== "all" ? COLORS.primary : COLORS.border}`,
                backgroundColor: riskFilter !== "all" ? COLORS.accentLight : COLORS.inputBg,
                color: COLORS.textMain,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
              }}
            >
              {RISK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            {/* Category Filter */}
            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value as Category | "all")}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 8, 
                border: `1px solid ${categoryFilter !== "all" ? COLORS.primary : COLORS.border}`,
                backgroundColor: categoryFilter !== "all" ? COLORS.accentLight : COLORS.inputBg,
                color: COLORS.textMain,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
              }}
            >
              {CATEGORY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            {/* Ease Filter */}
            <select 
              value={easeFilter} 
              onChange={(e) => setEaseFilter(e.target.value as EaseLevel | "all")}
              style={{ 
                padding: "8px 12px", 
                borderRadius: 8, 
                border: `1px solid ${easeFilter !== "all" ? COLORS.primary : COLORS.border}`,
                backgroundColor: easeFilter !== "all" ? COLORS.accentLight : COLORS.inputBg,
                color: COLORS.textMain,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                outline: "none"
              }}
            >
              {EASE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            
            {/* Clear Filters */}
            {(riskFilter !== "all" || categoryFilter !== "all" || easeFilter !== "all") && (
              <button
                onClick={() => { setRiskFilter("all"); setCategoryFilter("all"); setEaseFilter("all"); }}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: COLORS.red,
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Results count */}
          <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 12 }}>
            Showing {relevantStrategies.length} of {YIELD_STRATEGIES.length} strategies
          </div>
          
          {relevantStrategies.length > 0 ? (
            relevantStrategies.map(strategy => (
              <StrategyCard 
                key={strategy.id} 
                strategy={strategy} 
                potentialYield={getStrategyPotentialYield(strategy)}
                onOptimize={() => handleOptimizeClick(strategy.id)}
                userHeldAssets={userHeldAssets}
              />
            ))
          ) : (
            <div style={{ textAlign: "center", padding: 24, color: COLORS.textSecondary }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              <div style={{ fontWeight: 600 }}>No strategies match your filters</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try adjusting your filter criteria</div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {totalPortfolio === 0 && (
        <div style={{ ...styles.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.textMain, marginBottom: 8 }}>Enter Your Holdings</div>
          <div style={{ fontSize: 14, color: COLORS.textSecondary }}>Add your crypto holdings above to see how much more you could be earning</div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ backgroundColor: COLORS.orangeLight, borderRadius: "16px", padding: "16px", marginTop: "24px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Info size={20} color={COLORS.orange} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: "12px", color: COLORS.orange, lineHeight: 1.6 }}>
          <strong>Important Disclaimer:</strong> Yield estimates are for educational purposes only. Actual returns vary based on market conditions, platform fees, and risk factors. DeFi protocols carry smart contract risks. Staking may have lock-up periods. Always do your own research (DYOR) before investing.
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer} className="no-print">
        <button style={styles.footerBtn} onClick={() => setShowSubscribeModal(true)} className="btn-press">
          <Mail size={16} /> Subscribe
        </button>
        <button style={styles.footerBtn} onClick={resetToDefaults} className="btn-press">
          <RotateCcw size={16} /> Reset
        </button>
        <button style={styles.footerBtn} className="btn-press">
          <Heart size={16} /> Donate
        </button>
        <button style={styles.footerBtn} onClick={() => setShowFeedbackModal(true)} className="btn-press">
          <MessageSquare size={16} /> Feedback
        </button>
        <button style={styles.footerBtn} onClick={() => window.print()} className="btn-press">
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSubscribeModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowSubscribeModal(false)}><X size={20} /></button>
            <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: COLORS.textMain }}>Stay Updated</div>
            <div style={{ fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px" }}>Get weekly yield optimization tips and new strategy alerts.</div>
            {subscribeStatus === "success" ? (
              <div style={{ textAlign: "center", padding: "20px", color: COLORS.primary, fontWeight: 600 }}><Check size={24} style={{ marginBottom: 8 }} /><br />{subscribeMessage}</div>
            ) : (
              <>
                <input type="email" style={styles.input} placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                {subscribeMessage && <div style={{ color: subscribeStatus === "error" ? COLORS.red : COLORS.primary, fontSize: "14px", marginBottom: "10px" }}>{subscribeMessage}</div>}
                <button style={{ width: "100%", backgroundColor: COLORS.primary, color: "white", border: "none", padding: "14px", borderRadius: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }} onClick={handleSubscribe} disabled={subscribeStatus === "loading"}>
                  {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowFeedbackModal(false)}><X size={20} /></button>
            <div style={{ fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: COLORS.textMain }}>Feedback</div>
            <div style={{ fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px" }}>Help us improve the yield optimizer.</div>
            {feedbackStatus === "success" ? (
              <div style={{ textAlign: "center", padding: "20px", color: COLORS.primary, fontWeight: 600 }}>Thanks for your feedback!</div>
            ) : (
              <>
                <textarea style={{ ...styles.input, height: "120px", resize: "none", fontFamily: "inherit" }} placeholder="Tell us what you think..." value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} />
                {feedbackStatus === "error" && <div style={{ color: COLORS.red, fontSize: "14px", marginBottom: "10px" }}>Failed to send. Please try again.</div>}
                <button style={{ width: "100%", backgroundColor: COLORS.primary, color: "white", border: "none", padding: "14px", borderRadius: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }} onClick={handleFeedbackSubmit} disabled={feedbackStatus === "submitting" || !feedbackText.trim()}>
                  {feedbackStatus === "submitting" ? "Sending..." : "Send Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
