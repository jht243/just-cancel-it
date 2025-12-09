import React, { useState, useEffect, useMemo } from "react";
import {
  RotateCcw, Play, Minus, Plus, ChevronDown, Loader, HelpCircle, Info, X, ArrowRight, Check, Mail, TrendingUp, Target, MessageSquare, Heart, Printer
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

const COLORS = {
  primary: "#56C596", primaryDark: "#3aa87b", bg: "#FAFAFA", card: "#FFFFFF",
  textMain: "#1A1A1A", textSecondary: "#9CA3AF", border: "#F3F4F6",
  inputBg: "#F9FAFB", accentLight: "#E6F7F0", blue: "#5D9CEC", yellow: "#F59E0B",
  red: "#FF6B6B", orange: "#F2994A", orangeLight: "#FFF7ED", purple: "#8B5CF6"
};

const ALLOCATION_COLORS = ["#56C596", "#5D9CEC", "#F59E0B", "#F2994A", "#8B5CF6", "#EC4899", "#14B8A6", "#6366F1", "#A855F7"];

const ASSET_ASSUMPTIONS: Record<string, { mean: number; stdDev: number; name: string }> = {
  stocks: { mean: 0.10, stdDev: 0.18, name: "Stocks" },
  bonds: { mean: 0.05, stdDev: 0.06, name: "Bonds" },
  cash: { mean: 0.02, stdDev: 0.01, name: "Cash" },
  realEstate: { mean: 0.08, stdDev: 0.12, name: "Real Estate" },
  crypto: { mean: 0.15, stdDev: 0.60, name: "Crypto" },
  fourOhOneK: { mean: 0.08, stdDev: 0.14, name: "401k" },
  altInvestments: { mean: 0.09, stdDev: 0.20, name: "Alternative Investments" },
  startups: { mean: 0.20, stdDev: 0.70, name: "Startup Investments" },
  other: { mean: 0.06, stdDev: 0.15, name: "Other" }
};

// LocalStorage persistence
const STORAGE_KEY = "PORTFOLIO_OPTIMIZER_DATA";
const BANNER_STORAGE_KEY = "PORTFOLIO_BANNER_DISMISSED";
const EXPIRATION_HOURS = 72; // 3 days

interface SavedPortfolioData {
  allocation: AllocationInput;
  timeHorizon: string;
  inputMode: "percent" | "dollar";
  annualContribution: string;
  initialInvestment: string;
  investmentGoal: string;
  activePreset: string | null;
}

const DEFAULT_DATA: SavedPortfolioData = {
  allocation: { stocks: "60", bonds: "25", cash: "5", realEstate: "5", crypto: "0", fourOhOneK: "0", altInvestments: "0", startups: "0", other: "5" },
  timeHorizon: "10",
  inputMode: "percent",
  annualContribution: "6000",
  initialInvestment: "10000",
  investmentGoal: "growth",
  activePreset: "balanced"
};

const loadSavedData = (): SavedPortfolioData => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { data, timestamp } = JSON.parse(saved);
      const now = new Date().getTime();
      const hoursDiff = (now - timestamp) / (1000 * 60 * 60);
      if (hoursDiff < EXPIRATION_HOURS) {
        return { ...DEFAULT_DATA, ...data };
      }
    }
  } catch (e) {
    console.error("Failed to load saved portfolio data", e);
  }
  return DEFAULT_DATA;
};

const saveData = (data: SavedPortfolioData) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      data,
      timestamp: new Date().getTime()
    }));
  } catch (e) {
    console.error("Failed to save portfolio data", e);
  }
};

const clearSavedData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear saved data", e);
  }
};

interface AllocationInput { stocks: string; bonds: string; cash: string; realEstate: string; crypto: string; fourOhOneK: string; altInvestments: string; startups: string; other: string; }
interface SimulationResult { year: number; median: number; p10: number; p25: number; p75: number; p90: number; expected: number; }
interface PortfolioStats { expectedReturn: number; volatility: number; sharpeRatio: number; maxDrawdown: number; finalMedian: number; finalP10: number; finalP90: number; finalExpected: number; }

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

const ASSET_TOOLTIPS: Record<string, string> = {
  stocks: "Publicly traded company shares (ETFs, index funds, individual stocks)",
  bonds: "Fixed-income securities (government, corporate, municipal bonds)",
  cash: "Liquid assets (savings accounts, money market, CDs)",
  realEstate: "Total value of real estate holdings (property, REITs)",
  crypto: "Cryptocurrency holdings (Bitcoin, Ethereum, etc.)",
  fourOhOneK: "Employer-sponsored retirement account balance",
  altInvestments: "Alternative investments (commodities, hedge funds, private equity)",
  startups: "Early-stage company investments (angel, venture, equity crowdfunding)",
  other: "Any other investments not listed above"
};

const ASSET_LINKS: Record<string, string> = {
  stocks: "https://en.wikipedia.org/wiki/Stock",
  bonds: "https://en.wikipedia.org/wiki/Bond_(finance)",
  cash: "https://en.wikipedia.org/wiki/Cash_and_cash_equivalents",
  realEstate: "https://en.wikipedia.org/wiki/Real_estate_investing",
  crypto: "https://en.wikipedia.org/wiki/Cryptocurrency",
  fourOhOneK: "https://en.wikipedia.org/wiki/401(k)",
  altInvestments: "https://en.wikipedia.org/wiki/Alternative_investment",
  startups: "https://en.wikipedia.org/wiki/Startup_company",
  other: "https://en.wikipedia.org/wiki/Investment"
};

const InfoTooltip = ({ text, link, children }: { text: string; link?: string; children: React.ReactNode }) => {
  const [show, setShow] = React.useState(false);
  return (
    <div style={{ position: "relative", display: "inline-flex" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 6, padding: "8px 12px", backgroundColor: "#333", color: "white", fontSize: 11, borderRadius: 8, whiteSpace: "normal", zIndex: 1000, width: 200, textAlign: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
          <div style={{ marginBottom: link ? 8 : 0 }}>{text}</div>
          {link && <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.primary, fontSize: 10, fontWeight: 700, textDecoration: "none", display: "inline-block", padding: "4px 8px", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4 }}>LEARN MORE</a>}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid #333" }}></div>
          <div style={{ position: "absolute", width: "100%", height: "20px", top: "100%", left: 0 }}></div>
        </div>
      )}
    </div>
  );
};

const AllocationSlider = ({ label, value, onChange, color, inputMode = "percent", fieldKey, maxDollar = 100000 }: { label: string; value: string; onChange: (val: string) => void; color: string; inputMode?: "percent" | "dollar"; fieldKey?: string; maxDollar?: number; }) => {
  const numVal = parseFloat(value) || 0;
  const sliderPercent = inputMode === "percent" ? numVal : Math.min((numVal / maxDollar) * 100, 100);
  const tooltipText = fieldKey ? ASSET_TOOLTIPS[fieldKey] : "";
  const tooltipLink = fieldKey ? ASSET_LINKS[fieldKey] : "";
  return (
    <div style={{ width: "calc(50% - 8px)", flexShrink: 0, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <span style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          {tooltipText && (
            <InfoTooltip text={tooltipText} link={tooltipLink}>
              <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: COLORS.border, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 9, fontWeight: 700, color: COLORS.textSecondary, flexShrink: 0 }}>i</div>
            </InfoTooltip>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, backgroundColor: COLORS.inputBg, padding: "6px 10px", borderRadius: 8, borderLeft: "none", width: inputMode === "dollar" ? 110 : 65, justifyContent: "center", flexShrink: 0 }}>
          {inputMode === "dollar" && <span style={{ color: COLORS.primary, fontWeight: 600, fontSize: 13 }}>$</span>}
          <input type="text" value={inputMode === "dollar" ? (numVal > 0 ? numVal.toLocaleString() : value) : value} onChange={(e) => onChange(e.target.value.replace(/,/g, "").replace(/[^0-9]/g, ""))} placeholder="0" style={{ width: inputMode === "dollar" ? 75 : 32, border: "none", background: "transparent", textAlign: "right", fontSize: 14, fontWeight: 700, color: COLORS.textMain, outline: "none" }} />
          {inputMode === "percent" && <span style={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: 13 }}>%</span>}
        </div>
      </div>
      <input type="range" min={0} max={inputMode === "percent" ? 100 : maxDollar} value={numVal} onChange={(e) => onChange(e.target.value)} style={{ width: "100%", height: 6, borderRadius: 3, appearance: "none", background: `linear-gradient(to right, ${color} 0%, ${color} ${sliderPercent}%, ${COLORS.border} ${sliderPercent}%, ${COLORS.border} 100%)`, cursor: "pointer" }} />
    </div>
  );
};

function runMonteCarloSimulation(allocation: AllocationInput, timeHorizon: number, annualContribution: number, initialInvestment: number, inputMode: "percent" | "dollar", investmentGoal: string, numSimulations: number = 500): { results: SimulationResult[]; stats: PortfolioStats } {
  // Investment goal modifiers
  const goalModifiers: Record<string, { returnMult: number; riskMult: number }> = {
    preservation: { returnMult: 0.85, riskMult: 0.7 },
    income: { returnMult: 0.95, riskMult: 0.85 },
    growth: { returnMult: 1.0, riskMult: 1.0 }
  };
  const goalMod = goalModifiers[investmentGoal] || goalModifiers.growth;
  // If in dollar mode, calculate percentages from dollar amounts
  let allocationValues: Record<string, number>;
  let computedInitialInvestment = initialInvestment;
  
  if (inputMode === "dollar") {
    const total = (parseFloat(allocation.stocks) || 0) + (parseFloat(allocation.bonds) || 0) + (parseFloat(allocation.cash) || 0) + (parseFloat(allocation.realEstate) || 0) + (parseFloat(allocation.crypto) || 0) + (parseFloat(allocation.fourOhOneK) || 0) + (parseFloat(allocation.altInvestments) || 0) + (parseFloat(allocation.startups) || 0) + (parseFloat(allocation.other) || 0);
    computedInitialInvestment = total;
    allocationValues = {
      stocks: total > 0 ? (parseFloat(allocation.stocks) || 0) / total : 0,
      bonds: total > 0 ? (parseFloat(allocation.bonds) || 0) / total : 0,
      cash: total > 0 ? (parseFloat(allocation.cash) || 0) / total : 0,
      realEstate: total > 0 ? (parseFloat(allocation.realEstate) || 0) / total : 0,
      crypto: total > 0 ? (parseFloat(allocation.crypto) || 0) / total : 0,
      fourOhOneK: total > 0 ? (parseFloat(allocation.fourOhOneK) || 0) / total : 0,
      altInvestments: total > 0 ? (parseFloat(allocation.altInvestments) || 0) / total : 0,
      startups: total > 0 ? (parseFloat(allocation.startups) || 0) / total : 0,
      other: total > 0 ? (parseFloat(allocation.other) || 0) / total : 0
    };
  } else {
    allocationValues = {
      stocks: (parseFloat(allocation.stocks) || 0) / 100,
      bonds: (parseFloat(allocation.bonds) || 0) / 100,
      cash: (parseFloat(allocation.cash) || 0) / 100,
      realEstate: (parseFloat(allocation.realEstate) || 0) / 100,
      crypto: (parseFloat(allocation.crypto) || 0) / 100,
      fourOhOneK: (parseFloat(allocation.fourOhOneK) || 0) / 100,
      altInvestments: (parseFloat(allocation.altInvestments) || 0) / 100,
      startups: (parseFloat(allocation.startups) || 0) / 100,
      other: (parseFloat(allocation.other) || 0) / 100
    };
  }
  
  let portfolioReturn = 0;
  let weightedVol = 0; // Corr = 1
  let varianceSum = 0; // Corr = 0

  for (const [asset, weight] of Object.entries(allocationValues)) {
    const assumptions = ASSET_ASSUMPTIONS[asset];
    if (assumptions) {
      const weightedMean = weight * assumptions.mean * goalMod.returnMult;
      const weightedStd = weight * assumptions.stdDev * goalMod.riskMult;
      
      portfolioReturn += weightedMean;
      weightedVol += weightedStd;
      varianceSum += Math.pow(weightedStd, 2);
    }
  }
  
  // Heuristic: Portfolio volatility is between perfect correlation (weightedVol) and zero correlation (sqrt(varianceSum))
  // We average them to assume moderate correlation (~0.25-0.5)
  const uncorrelatedVol = Math.sqrt(varianceSum);
  const portfolioStdDev = (weightedVol + uncorrelatedVol) / 2;

  const monthlyReturn = portfolioReturn / 12;
  const monthlyStdDev = portfolioStdDev / Math.sqrt(12);
  const monthlyContribution = annualContribution / 12;
  const allPaths: number[][] = [];
  for (let sim = 0; sim < numSimulations; sim++) {
    const path: number[] = [computedInitialInvestment]; let value = computedInitialInvestment;
    for (let month = 1; month <= timeHorizon * 12; month++) {
      const u1 = Math.random(), u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const monthReturn = monthlyReturn + monthlyStdDev * z;
      value = Math.max(0, value * (1 + monthReturn) + monthlyContribution);
      if (month % 12 === 0) path.push(value);
    }
    allPaths.push(path);
  }
  const results: SimulationResult[] = [];
  for (let year = 0; year <= timeHorizon; year++) {
    const yearValues = allPaths.map((path) => path[year]).sort((a, b) => a - b);
    const percentile = (p: number) => yearValues[Math.min(Math.floor(p * yearValues.length), yearValues.length - 1)];
    const expected = yearValues.reduce((a, b) => a + b, 0) / yearValues.length;
    results.push({ year, p10: Math.round(percentile(0.1)), p25: Math.round(percentile(0.25)), median: Math.round(percentile(0.5)), p75: Math.round(percentile(0.75)), p90: Math.round(percentile(0.9)), expected: Math.round(expected) });
  }
  const finalValues = allPaths.map((path) => path[path.length - 1]).sort((a, b) => a - b);
  let maxDrawdown = 0;
  for (const path of allPaths.slice(0, 100)) { let peak = path[0]; for (const value of path) { if (value > peak) peak = value; maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak); } }
  const stats: PortfolioStats = { expectedReturn: portfolioReturn, volatility: portfolioStdDev, sharpeRatio: (portfolioReturn - 0.02) / portfolioStdDev, maxDrawdown, finalMedian: finalValues[Math.floor(finalValues.length * 0.5)], finalP10: finalValues[Math.floor(finalValues.length * 0.1)], finalP90: finalValues[Math.floor(finalValues.length * 0.9)], finalExpected: finalValues.reduce((a, b) => a + b, 0) / finalValues.length };
  return { results, stats };
}

export default function PortfolioSimulator({ initialData }: { initialData?: any }) {
  // Load saved data from localStorage (persists for 72 hours)
  const savedData = loadSavedData();
  
  // Helper to check if initialData has relevant fields
  const hasInitial = (key: string) => initialData && initialData[key] !== undefined;
  
  // Check if initialData contains dollar allocation data
  const hasDollarAllocation = () => {
    if (!initialData) return false;
    const dollarKeys = ["stocks", "bonds", "cash", "real_estate", "crypto", "four_oh_one_k", "alt_investments", "startups", "other"];
    return dollarKeys.some(key => initialData[key] !== undefined && initialData[key] > 0);
  };
  
  // Check if initialData contains percent allocation data
  const hasPercentAllocation = () => {
    if (!initialData) return false;
    const percentKeys = ["stocks_percent", "bonds_percent", "cash_percent", "real_estate_percent", "crypto_percent", "four_oh_one_k_percent", "alt_investments_percent", "startups_percent", "other_percent"];
    return percentKeys.some(key => initialData[key] !== undefined && initialData[key] > 0);
  };

  const [allocation, setAllocation] = useState<AllocationInput>(() => {
    // If initialData has dollar allocation fields, use them (dollar mode)
    if (hasDollarAllocation()) {
      return {
        stocks: String(initialData.stocks || 0),
        bonds: String(initialData.bonds || 0),
        cash: String(initialData.cash || 0),
        realEstate: String(initialData.real_estate || 0),
        crypto: String(initialData.crypto || 0),
        fourOhOneK: String(initialData.four_oh_one_k || 0),
        altInvestments: String(initialData.alt_investments || 0),
        startups: String(initialData.startups || 0),
        other: String(initialData.other || 0)
      };
    }
    // If initialData has percent allocation fields, use them (percent mode)
    if (hasPercentAllocation()) {
      return {
        stocks: String(initialData.stocks_percent || 0),
        bonds: String(initialData.bonds_percent || 0),
        cash: String(initialData.cash_percent || 0),
        realEstate: String(initialData.real_estate_percent || 0),
        crypto: String(initialData.crypto_percent || 0),
        fourOhOneK: String(initialData.four_oh_one_k_percent || 0),
        altInvestments: String(initialData.alt_investments_percent || 0),
        startups: String(initialData.startups_percent || 0),
        other: String(initialData.other_percent || 0)
      };
    }
    return savedData.allocation;
  });

  const [timeHorizon, setTimeHorizon] = useState(() => {
    if (hasInitial("time_horizon")) return String(initialData.time_horizon);
    if (hasInitial("retirement_age") && hasInitial("current_age")) {
        return String(Math.max(1, initialData.retirement_age - initialData.current_age));
    }
    return savedData.timeHorizon;
  });

  // Switch to dollar mode if dollar allocation was provided, percent mode if percent allocation was provided
  const [inputMode, setInputMode] = useState<"percent" | "dollar">(() => {
    if (hasDollarAllocation()) return "dollar";
    if (hasPercentAllocation()) return "percent";
    return savedData.inputMode;
  });

  const [annualContribution, setAnnualContribution] = useState(() => {
    if (hasInitial("annual_contribution")) return String(initialData.annual_contribution);
    if (hasInitial("monthly_contribution")) return String(initialData.monthly_contribution * 12);
    // Legacy mapping
    if (hasInitial("monthly_contributions")) return String(initialData.monthly_contributions * 12);
    return savedData.annualContribution;
  });

  const [initialInvestment, setInitialInvestment] = useState(() => {
    if (hasInitial("initial_investment")) return String(initialData.initial_investment);
    if (hasInitial("current_retirement_savings")) return String(initialData.current_retirement_savings);
    return savedData.initialInvestment;
  });

  const [investmentGoal, setInvestmentGoal] = useState(() => {
    if (hasInitial("investment_goal")) return initialData.investment_goal;
    return savedData.investmentGoal;
  });

  const [activePreset, setActivePreset] = useState<string | null>(() => {
    if (hasInitial("risk_tolerance")) return initialData.risk_tolerance;
    return savedData.activePreset;
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{ results: SimulationResult[]; stats: PortfolioStats } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resultView, setResultView] = useState<"projection" | "allocation" | "summary">("projection");

  // Save data to localStorage whenever relevant state changes
  useEffect(() => {
    saveData({
      allocation,
      timeHorizon,
      inputMode,
      annualContribution,
      initialInvestment,
      investmentGoal,
      activePreset
    });
  }, [allocation, timeHorizon, inputMode, annualContribution, initialInvestment, investmentGoal, activePreset]);

  // Subscription State
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [showBanner, setShowBanner] = useState(() => {
    try {
        const dismissed = localStorage.getItem(BANNER_STORAGE_KEY);
        if (dismissed) {
            const timestamp = parseInt(dismissed, 10);
            const now = new Date().getTime();
            // 24 hours in milliseconds
            if (now - timestamp < 24 * 60 * 60 * 1000) {
                return false;
            }
        }
    } catch (e) {
        // Ignore storage errors
    }
    return true;
  });

  const handleDismissBanner = () => {
    setShowBanner(false);
    try {
        localStorage.setItem(BANNER_STORAGE_KEY, new Date().getTime().toString());
    } catch (e) {
        console.error("Failed to save banner dismissal", e);
    }
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
            body: JSON.stringify({
                email,
                topicId: "portfolio-optimizer",
                topicName: "Portfolio Optimizer Calculator"
            })
        });
        
        const data = await response.json();
        if (response.ok && data.success) {
            setSubscribeStatus("success");
            setSubscribeMessage(data.message);
            setTimeout(() => {
                setShowSubscribeModal(false);
                setEmail("");
                setSubscribeStatus("idle");
                setSubscribeMessage("");
            }, 3000);
        } else {
            setSubscribeStatus("error");
            setSubscribeMessage(data.error || "Failed to subscribe.");
        }
    } catch (e) {
        console.error("Subscribe error:", e);
        setSubscribeStatus("error");
        setSubscribeMessage("Network error. Please try again.");
    }
  };

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;

    setFeedbackStatus("submitting");
    try {
        const response = await fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event: "user_feedback",
                data: {
                    feedback: feedbackText,
                    calculatorType: "Portfolio Optimizer"
                }
            })
        });

        if (response.ok) {
            setFeedbackStatus("success");
            setTimeout(() => {
                setShowFeedbackModal(false);
                setFeedbackText("");
                setFeedbackStatus("idle");
            }, 2000);
        } else {
            setFeedbackStatus("error");
        }
    } catch (e) {
        console.error("Feedback error:", e);
        setFeedbackStatus("error");
    }
  };


  const totalAllocation = useMemo(() => (parseFloat(allocation.stocks) || 0) + (parseFloat(allocation.bonds) || 0) + (parseFloat(allocation.cash) || 0) + (parseFloat(allocation.realEstate) || 0) + (parseFloat(allocation.crypto) || 0) + (parseFloat(allocation.fourOhOneK) || 0) + (parseFloat(allocation.altInvestments) || 0) + (parseFloat(allocation.startups) || 0) + (parseFloat(allocation.other) || 0), [allocation]);
  const allocationValid = inputMode === "dollar" ? totalAllocation > 0 : totalAllocation === 100;

  useEffect(() => { if (allocationValid) runSimulation(); }, [allocation, timeHorizon, annualContribution, initialInvestment, inputMode, investmentGoal]);

  const runSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const result = runMonteCarloSimulation(allocation, parseInt(timeHorizon) || 10, parseFloat(annualContribution) || 0, parseFloat(initialInvestment) || 0, inputMode, investmentGoal, 500);
      setSimulationResult(result);
      setIsSimulating(false);
    }, 100);
  };

  const handleAllocationChange = (field: keyof AllocationInput, value: string) => { setAllocation((prev) => ({ ...prev, [field]: value })); setActivePreset(null); };
  
  const handleModeSwitch = (newMode: "percent" | "dollar") => {
    if (newMode === inputMode) return;
    // Reset allocations when switching modes to avoid confusion
    if (newMode === "percent") {
      setAllocation({ stocks: "60", bonds: "25", cash: "5", realEstate: "5", crypto: "0", fourOhOneK: "0", altInvestments: "0", startups: "0", other: "5" });
      setActivePreset("balanced");
    } else {
      setAllocation({ stocks: "0", bonds: "0", cash: "0", realEstate: "0", crypto: "0", fourOhOneK: "0", altInvestments: "0", startups: "0", other: "0" });
      setActivePreset(null);
    }
    setInputMode(newMode);
  };

  // Percent mode presets (Conservative/Balanced/Aggressive)
  const applyPercentPreset = (preset: "conservative" | "balanced" | "aggressive") => {
    setActivePreset(preset);
    if (preset === "conservative") { setAllocation({ stocks: "30", bonds: "50", cash: "15", realEstate: "5", crypto: "0", fourOhOneK: "0", altInvestments: "0", startups: "0", other: "0" }); }
    else if (preset === "balanced") { setAllocation({ stocks: "60", bonds: "25", cash: "5", realEstate: "5", crypto: "0", fourOhOneK: "0", altInvestments: "0", startups: "0", other: "5" }); }
    else { setAllocation({ stocks: "80", bonds: "10", cash: "2", realEstate: "5", crypto: "0", fourOhOneK: "0", altInvestments: "0", startups: "0", other: "3" }); }
  };

  // Dollar mode presets (Early Life/Mid Life/Late Life)
  const applyDollarPreset = (preset: "early" | "mid" | "late") => {
    setActivePreset(preset);
    // Early Life (20s-30s): Higher risk, growth-focused
    if (preset === "early") { setAllocation({ stocks: "65000", bonds: "5000", cash: "3000", realEstate: "5000", crypto: "5000", fourOhOneK: "10000", altInvestments: "2000", startups: "3000", other: "2000" }); }
    // Mid Life (40s-50s): Balanced approach
    else if (preset === "mid") { setAllocation({ stocks: "50000", bonds: "20000", cash: "5000", realEstate: "5000", crypto: "0", fourOhOneK: "15000", altInvestments: "0", startups: "0", other: "5000" }); }
    // Late Life (60s+): Conservative, capital preservation
    else { setAllocation({ stocks: "25000", bonds: "45000", cash: "15000", realEstate: "5000", crypto: "0", fourOhOneK: "10000", altInvestments: "0", startups: "0", other: "0" }); }
  };

  const resetToDefaults = () => { 
    clearSavedData(); // Clear localStorage
    setAllocation(DEFAULT_DATA.allocation); 
    setTimeHorizon(DEFAULT_DATA.timeHorizon); 
    setAnnualContribution(DEFAULT_DATA.annualContribution); 
    setInitialInvestment(DEFAULT_DATA.initialInvestment); 
    setInvestmentGoal(DEFAULT_DATA.investmentGoal); 
    setInputMode(DEFAULT_DATA.inputMode); 
    setActivePreset(DEFAULT_DATA.activePreset); 
    setSimulationResult(null); 
  };

  const pieData = [
    { name: "Stocks", value: parseFloat(allocation.stocks) || 0, color: ALLOCATION_COLORS[0] },
    { name: "Bonds", value: parseFloat(allocation.bonds) || 0, color: ALLOCATION_COLORS[1] },
    { name: "Cash", value: parseFloat(allocation.cash) || 0, color: ALLOCATION_COLORS[2] },
    { name: "Real Estate", value: parseFloat(allocation.realEstate) || 0, color: ALLOCATION_COLORS[3] },
    { name: "Crypto", value: parseFloat(allocation.crypto) || 0, color: ALLOCATION_COLORS[4] },
    { name: "401k", value: parseFloat(allocation.fourOhOneK) || 0, color: ALLOCATION_COLORS[5] },
    { name: "Alt Investments", value: parseFloat(allocation.altInvestments) || 0, color: ALLOCATION_COLORS[6] },
    { name: "Startups", value: parseFloat(allocation.startups) || 0, color: ALLOCATION_COLORS[7] },
    { name: "Other", value: parseFloat(allocation.other) || 0, color: ALLOCATION_COLORS[8] }
  ].filter((d) => d.value > 0);

  const getSuggestedAllocation = () => {
    const years = parseInt(timeHorizon) || 10;
    if (investmentGoal === "preservation" || years <= 3) return { stocks: 15, bonds: 50, cash: 20, realEstate: 5, crypto: 0, fourOhOneK: 10, altInvestments: 0, startups: 0, other: 0 };
    if (investmentGoal === "income" || years <= 7) return { stocks: 35, bonds: 30, cash: 5, realEstate: 10, crypto: 0, fourOhOneK: 15, altInvestments: 5, startups: 0, other: 0 };
    return { stocks: 50, bonds: 10, cash: 3, realEstate: 7, crypto: 5, fourOhOneK: 15, altInvestments: 5, startups: 3, other: 2 };
  };
  const suggestedAllocation = getSuggestedAllocation();
  const suggestedPieData = [
    { name: "Stocks", value: suggestedAllocation.stocks, color: ALLOCATION_COLORS[0] },
    { name: "Bonds", value: suggestedAllocation.bonds, color: ALLOCATION_COLORS[1] },
    { name: "Cash", value: suggestedAllocation.cash, color: ALLOCATION_COLORS[2] },
    { name: "Real Estate", value: suggestedAllocation.realEstate, color: ALLOCATION_COLORS[3] },
    { name: "Crypto", value: suggestedAllocation.crypto, color: ALLOCATION_COLORS[4] },
    { name: "401k", value: suggestedAllocation.fourOhOneK, color: ALLOCATION_COLORS[5] },
    { name: "Alt Investments", value: suggestedAllocation.altInvestments, color: ALLOCATION_COLORS[6] },
    { name: "Startups", value: suggestedAllocation.startups, color: ALLOCATION_COLORS[7] },
    { name: "Other", value: suggestedAllocation.other, color: ALLOCATION_COLORS[8] }
  ].filter((d) => d.value > 0);

  const styles = {
    container: { width: "100%", maxWidth: "600px", margin: "0 auto", backgroundColor: COLORS.bg, fontFamily: "'Inter', sans-serif", padding: "20px", boxSizing: "border-box" as const },
    card: { backgroundColor: COLORS.card, borderRadius: "24px", padding: "24px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)", marginBottom: "20px", width: "100%", boxSizing: "border-box" as const },
    row: { display: "flex", alignItems: "flex-start", marginBottom: "20px", gap: "16px" },
    column: { flex: 1, display: "flex", flexDirection: "column" as const },
    label: { fontWeight: 600, color: COLORS.textMain, fontSize: "15px", marginBottom: "0px" },
    subheaderLabel: { fontSize: "12px", color: COLORS.textSecondary, fontWeight: 400, marginTop: "0px", marginBottom: "8px", lineHeight: "1.3" },
    calcButton: { flex: 1, backgroundColor: COLORS.primary, color: "white", border: "none", padding: "14px", borderRadius: "16px", fontSize: "16px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", boxShadow: "0 4px 12px rgba(86, 197, 150, 0.2)" },
    strategyBtn: (active: boolean) => ({ flex: 1, padding: "8px", borderRadius: "8px", border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, backgroundColor: active ? COLORS.accentLight : "white", color: active ? COLORS.primaryDark : COLORS.textSecondary, fontWeight: 700, fontSize: "12px", cursor: "pointer", textAlign: "center" as const }),
    resultCard: { backgroundColor: COLORS.card, borderRadius: "24px", padding: "24px", boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)", marginTop: "24px" },
    footer: { display: "flex", justifyContent: "center", gap: "24px", marginTop: "40px", paddingTop: "24px", borderTop: `1px solid ${COLORS.border}` },
    footerBtn: { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary, fontSize: "14px", fontWeight: 600, padding: "8px" },
    modalOverlay: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "20px", paddingTop: "40px", overflowY: "auto" as const },
    modalContent: { backgroundColor: "white", borderRadius: "24px", padding: "24px", width: "100%", maxWidth: "560px", boxShadow: "0 20px 60px -10px rgba(0,0,0,0.2)", position: "relative" as const },
    modalClose: { position: "absolute" as const, top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary, padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
    input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: `1px solid ${COLORS.border}`, fontSize: "16px", backgroundColor: COLORS.inputBg, color: COLORS.textMain, marginBottom: "16px", boxSizing: "border-box" as const, outline: "none" }
  };

  return (
    <div style={styles.container}>
      <div style={{ fontSize: "28px", fontWeight: 800, color: COLORS.textMain, marginBottom: "10px" }}>The Strategic Portfolio Simulator</div>
      <div style={{ fontSize: "14px", color: COLORS.textSecondary, marginBottom: "20px", display: "flex", alignItems: "center", gap: 6 }}>
        <Check size={16} color={COLORS.primary} /> Aligned with Modern Portfolio Theory (MPT) & Historical Market Data™
      </div>

      {showBanner && (
      <div style={{
          backgroundColor: COLORS.accentLight,
          borderRadius: "16px",
          padding: "16px",
          marginBottom: "24px",
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          position: "relative"
      }}>
          <div style={{fontSize: "14px", fontWeight: 600, color: COLORS.primaryDark, paddingRight: "24px"}}>
              Want expert tips to reach your goals faster?
          </div>
          <div style={{display: "flex", alignItems: "center", gap: 12}}>
            <button className="btn-press" onClick={() => setShowSubscribeModal(true)} style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              backgroundColor: COLORS.primary,
              color: "white",
              borderRadius: "24px",
              border: "none",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(86, 197, 150, 0.25)",
              marginRight: 24
            }}>
                <Mail size={14} />
                Subscribe
            </button>
            <div 
                style={{cursor: "pointer", padding: 4, position: "absolute", top: 8, right: 8, color: COLORS.textSecondary}} 
                onClick={handleDismissBanner}
            >
                <X size={16} />
            </div>
          </div>
      </div>
      )}

      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textMain }}>Your Portfolio Allocation</div>
          <div style={{ display: "flex", gap: 4, backgroundColor: COLORS.inputBg, borderRadius: 8, padding: 2 }}>
            <div style={{ ...styles.strategyBtn(inputMode === "percent"), padding: "6px 12px", fontSize: 13 }} onClick={() => handleModeSwitch("percent")}>%</div>
            <div style={{ ...styles.strategyBtn(inputMode === "dollar"), padding: "6px 12px", fontSize: 13 }} onClick={() => handleModeSwitch("dollar")}>$</div>
          </div>
        </div>
        
        <div style={{ marginBottom: 20, padding: 12, backgroundColor: COLORS.inputBg, borderRadius: 12 }}>
          <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, fontWeight: 600 }}>⚡ Choose a starting allocation preset:</div>
          {inputMode === "percent" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={styles.strategyBtn(activePreset === "conservative")} onClick={() => applyPercentPreset("conservative")}><div>Conservative</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>Low risk</div></div>
              <div style={styles.strategyBtn(activePreset === "balanced")} onClick={() => applyPercentPreset("balanced")}><div>Balanced</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>Moderate</div></div>
              <div style={styles.strategyBtn(activePreset === "aggressive")} onClick={() => applyPercentPreset("aggressive")}><div>Aggressive</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>High risk</div></div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <div style={styles.strategyBtn(activePreset === "early")} onClick={() => applyDollarPreset("early")}><div>Early Life</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>20s-30s</div></div>
              <div style={styles.strategyBtn(activePreset === "mid")} onClick={() => applyDollarPreset("mid")}><div>Mid Life</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>40s-50s</div></div>
              <div style={styles.strategyBtn(activePreset === "late")} onClick={() => applyDollarPreset("late")}><div>Late Life</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>60s+</div></div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, width: "100%" }}>
          <AllocationSlider label="Stocks" value={allocation.stocks} onChange={(v) => handleAllocationChange("stocks", v)} color={ALLOCATION_COLORS[0]} inputMode={inputMode} fieldKey="stocks" />
          <AllocationSlider label="Bonds" value={allocation.bonds} onChange={(v) => handleAllocationChange("bonds", v)} color={ALLOCATION_COLORS[1]} inputMode={inputMode} fieldKey="bonds" />
          <AllocationSlider label="401k" value={allocation.fourOhOneK} onChange={(v) => handleAllocationChange("fourOhOneK", v)} color={ALLOCATION_COLORS[5]} inputMode={inputMode} fieldKey="fourOhOneK" />
          <AllocationSlider label="Cash" value={allocation.cash} onChange={(v) => handleAllocationChange("cash", v)} color={ALLOCATION_COLORS[2]} inputMode={inputMode} fieldKey="cash" />
          <AllocationSlider label="Real Estate" value={allocation.realEstate} onChange={(v) => handleAllocationChange("realEstate", v)} color={ALLOCATION_COLORS[3]} inputMode={inputMode} fieldKey="realEstate" />
          <AllocationSlider label="Crypto" value={allocation.crypto} onChange={(v) => handleAllocationChange("crypto", v)} color={ALLOCATION_COLORS[4]} inputMode={inputMode} fieldKey="crypto" />
          
          {/* Swap order based on mode */}
          {inputMode === "dollar" ? (
            <>
              <AllocationSlider label="Other" value={allocation.other} onChange={(v) => handleAllocationChange("other", v)} color={ALLOCATION_COLORS[8]} inputMode={inputMode} fieldKey="other" />
              <AllocationSlider label="Alt Investments" value={allocation.altInvestments} onChange={(v) => handleAllocationChange("altInvestments", v)} color={ALLOCATION_COLORS[6]} inputMode={inputMode} fieldKey="altInvestments" />
              <AllocationSlider label="Startups" value={allocation.startups} onChange={(v) => handleAllocationChange("startups", v)} color={ALLOCATION_COLORS[7]} inputMode={inputMode} fieldKey="startups" />
            </>
          ) : (
            <>
              <AllocationSlider label="Alt Investments" value={allocation.altInvestments} onChange={(v) => handleAllocationChange("altInvestments", v)} color={ALLOCATION_COLORS[6]} inputMode={inputMode} fieldKey="altInvestments" />
              <AllocationSlider label="Startups" value={allocation.startups} onChange={(v) => handleAllocationChange("startups", v)} color={ALLOCATION_COLORS[7]} inputMode={inputMode} fieldKey="startups" />
              <AllocationSlider label="Other" value={allocation.other} onChange={(v) => handleAllocationChange("other", v)} color={ALLOCATION_COLORS[8]} inputMode={inputMode} fieldKey="other" />
            </>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: allocationValid ? COLORS.accentLight : COLORS.orangeLight, borderRadius: 12, marginTop: 16, marginBottom: 20 }}>
          <span style={{ fontWeight: 600, color: allocationValid ? COLORS.primaryDark : COLORS.orange }}>Total {inputMode === "percent" ? "Allocation" : "Portfolio"}</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: allocationValid ? COLORS.primary : COLORS.orange }}>
            {inputMode === "percent" ? `${totalAllocation}%` : `$${totalAllocation.toLocaleString()}`}
            {inputMode === "percent" && !allocationValid && <span style={{ fontSize: 12, fontWeight: 400, marginLeft: 8 }}>(must equal 100%)</span>}
          </span>
        </div>

        <div style={styles.row}>
          <div style={styles.column}><div style={styles.label}>Time Horizon</div><div style={styles.subheaderLabel}>Years until you need the money</div><NumberControl value={timeHorizon} onChange={setTimeHorizon} min={1} max={50} suffix="years" /></div>
          {inputMode === "percent" && (
            <div style={styles.column}><div style={styles.label}>Initial Investment</div><div style={styles.subheaderLabel}>Starting portfolio value</div><NumberControl value={initialInvestment} onChange={setInitialInvestment} min={0} max={100000000} step={1000} prefix="$" /></div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginTop: 10, marginBottom: 10, color: COLORS.blue, fontWeight: 700, fontSize: 14 }} onClick={() => setShowAdvanced(!showAdvanced)}>
          {showAdvanced ? "HIDE ADVANCED OPTIONS" : "ADVANCED OPTIONS"}<ChevronDown size={16} style={{ transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </div>

        {showAdvanced && (<>
          <div style={{ marginBottom: 16 }}><div style={styles.label}>Annual Contribution</div><div style={styles.subheaderLabel}>Amount you plan to add each year</div><NumberControl value={annualContribution} onChange={setAnnualContribution} min={0} max={1000000} step={500} prefix="$" /></div>
          <div style={{ marginBottom: 16 }}><div style={{ fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8 }}>Investment Goal</div><div style={{ display: "flex", gap: 8 }}><div style={styles.strategyBtn(investmentGoal === "preservation")} onClick={() => setInvestmentGoal("preservation")}><div>Preservation</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>Protect capital</div></div><div style={styles.strategyBtn(investmentGoal === "income")} onClick={() => setInvestmentGoal("income")}><div>Income</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>Steady returns</div></div><div style={styles.strategyBtn(investmentGoal === "growth")} onClick={() => setInvestmentGoal("growth")}><div>Growth</div><div style={{ fontSize: 10, fontWeight: 400, marginTop: 2 }}>Maximize value</div></div></div></div>
        </>)}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}><button className="btn-press" style={{ ...styles.calcButton, opacity: allocationValid ? 1 : 0.5 }} onClick={runSimulation} disabled={!allocationValid || isSimulating}>{isSimulating ? <Loader size={20} className="spin" /> : <>Run Simulation <Play size={20} fill="white" /></>}</button></div>
      </div>

      {simulationResult && (<div style={styles.resultCard}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: `1px solid ${COLORS.border}`, paddingBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "18px", fontWeight: 700, color: COLORS.textMain }}>Simulation Results</span>
            <InfoTooltip text="Based on 500 Monte Carlo simulations. 'Expected' is the average outcome. 'Possible Range' shows the 10th (Worst Case) to 90th (Best Case) percentile outcomes. Volatility calculations assume moderate correlation between asset classes.">
              <HelpCircle size={16} color={COLORS.textSecondary} style={{ cursor: "pointer" }} />
            </InfoTooltip>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, gap: 16 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 14, color: COLORS.textMain, marginBottom: 4 }}>Expected Value</div><div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary }}>${Math.round(simulationResult.stats.finalExpected).toLocaleString()}</div><div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>Median: ${Math.round(simulationResult.stats.finalMedian).toLocaleString()}</div></div>
          <div style={{ flex: 1, borderLeft: `1px solid ${COLORS.border}`, paddingLeft: 16 }}><div style={{ fontSize: 14, color: COLORS.textMain, marginBottom: 4 }}>Possible Range</div><div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textMain }}>${Math.round(simulationResult.stats.finalP10).toLocaleString()} - ${Math.round(simulationResult.stats.finalP90).toLocaleString()}</div><div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>10th to 90th percentile</div></div>
        </div>

        <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
          <div style={{ padding: "8px 16px", borderBottom: resultView === "projection" ? `2px solid ${COLORS.primary}` : "none", fontWeight: 700, color: resultView === "projection" ? COLORS.primary : COLORS.textSecondary, cursor: "pointer", fontSize: 12, letterSpacing: 1 }} onClick={() => setResultView("projection")}>PROJECTION</div>
          <div style={{ padding: "8px 16px", borderBottom: resultView === "allocation" ? `2px solid ${COLORS.primary}` : "none", fontWeight: 700, color: resultView === "allocation" ? COLORS.primary : COLORS.textSecondary, cursor: "pointer", fontSize: 12, letterSpacing: 1 }} onClick={() => setResultView("allocation")}>ALLOCATION</div>
          <div style={{ padding: "8px 16px", borderBottom: resultView === "summary" ? `2px solid ${COLORS.primary}` : "none", fontWeight: 700, color: resultView === "summary" ? COLORS.primary : COLORS.textSecondary, cursor: "pointer", fontSize: 12, letterSpacing: 1 }} onClick={() => setResultView("summary")}>SUMMARY</div>
        </div>

        {resultView === "projection" && (<div style={{ height: 300, width: "100%", fontSize: 12 }}>
          <ResponsiveContainer><AreaChart data={simulationResult.results} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs><linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1} /><stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
            <XAxis dataKey="year" tick={{ fill: COLORS.textSecondary }} tickLine={false} axisLine={{ stroke: COLORS.border }} tickFormatter={(val) => `Yr ${val}`} />
            <YAxis tick={{ fill: COLORS.textSecondary }} tickFormatter={(val) => val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : `$${(val / 1000).toFixed(0)}K`} tickLine={false} axisLine={false} />
            <Tooltip content={({ active, payload, label }) => { if (active && payload && payload.length) { const data = payload[0].payload as SimulationResult; return (<div style={{ backgroundColor: "white", padding: 12, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", border: "1px solid #E5E7EB" }}><div style={{ fontWeight: 600, marginBottom: 8, fontSize: 12, color: COLORS.textSecondary }}>Year {label}</div><div style={{ marginBottom: 4 }}><span style={{ color: COLORS.primary, fontWeight: 600, fontSize: 12 }}>Best Case:</span> <span style={{ fontWeight: 700 }}>${data.p90.toLocaleString()}</span></div><div style={{ marginBottom: 4 }}><span style={{ color: COLORS.blue, fontWeight: 600, fontSize: 12 }}>Median:</span> <span style={{ fontWeight: 700 }}>${data.median.toLocaleString()}</span></div><div><span style={{ color: COLORS.red, fontWeight: 600, fontSize: 12 }}>Worst Case:</span> <span style={{ fontWeight: 700 }}>${data.p10.toLocaleString()}</span></div></div>); } return null; }} />
            <Area type="monotone" dataKey="p90" stroke={COLORS.primary} strokeDasharray="3 3" strokeWidth={1} fill="url(#colorP90)" name="90th" />
            <Area type="monotone" dataKey="p10" stroke={COLORS.red} strokeDasharray="3 3" fill="transparent" strokeWidth={1} name="10th" />
            <Area type="monotone" dataKey="median" stroke={COLORS.blue} fill="transparent" strokeWidth={2} name="Median" />
            <Area type="monotone" dataKey="expected" stroke={COLORS.primary} fill="transparent" strokeWidth={2} name="Expected" />
          </AreaChart></ResponsiveContainer>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, backgroundColor: COLORS.primary }}></div><span style={{ color: COLORS.textSecondary, fontSize: 11 }}>Expected</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, backgroundColor: COLORS.primary, borderStyle: "dashed" }}></div><span style={{ color: COLORS.textSecondary, fontSize: 11 }}>Best Case</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, backgroundColor: COLORS.blue }}></div><span style={{ color: COLORS.textSecondary, fontSize: 11 }}>Median</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 12, height: 2, backgroundColor: COLORS.red, borderStyle: "dashed" }}></div><span style={{ color: COLORS.textSecondary, fontSize: 11 }}>Worst Case</span></div>
          </div>
        </div>)}

        {resultView === "allocation" && (<div>
          <div style={{ display: "flex", alignItems: "center", padding: "0 16px", marginBottom: 24 }}>
            <div style={{ flex: 1.2 }}></div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>Current</div>
              <div style={{ width: 120, height: 120 }}><ResponsiveContainer><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" stroke="none">{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie></PieChart></ResponsiveContainer></div>
            </div>
            <div style={{ width: 40, display: "flex", justifyContent: "center" }}>
              <ArrowRight size={20} color={COLORS.textSecondary} strokeWidth={2.5} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8 }}>Optimized</div>
              <div style={{ width: 120, height: 120 }}><ResponsiveContainer><PieChart><Pie data={suggestedPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" stroke="none">{suggestedPieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie></PieChart></ResponsiveContainer></div>
            </div>
          </div>

          <div style={{ backgroundColor: COLORS.card, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", padding: "12px 16px", backgroundColor: COLORS.inputBg, borderBottom: `1px solid ${COLORS.border}`, fontSize: 12, fontWeight: 600, color: COLORS.textSecondary }}>
              <div style={{ flex: 1.2 }}>Asset Class</div>
              <div style={{ flex: 1, textAlign: "center" }}>Your Allocation</div>
              <div style={{ width: 40 }}></div>
              <div style={{ flex: 1, textAlign: "center" }}>Ideal Allocation</div>
            </div>
            <div style={{ padding: "0 16px" }}>
              {suggestedPieData.map((item, idx) => {
                const userItem = pieData.find(p => p.name === item.name);
                const userValue = userItem ? userItem.value : 0;
                const userTotal = inputMode === "dollar" ? totalAllocation : 100;
                const userPct = inputMode === "dollar" && userTotal > 0 ? (userValue / userTotal) * 100 : userValue;
                const targetPct = item.value;
                const diff = targetPct - userPct;
                const isDiff = Math.abs(diff) >= 1;
                
                return (
                  <div key={idx} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: idx === suggestedPieData.length - 1 ? "none" : `1px solid ${COLORS.border}` }}>
                    <div style={{ flex: 1.2, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: item.color, flexShrink: 0 }}></div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>{item.name}</span>
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMain }}>{Math.round(userPct)}%</span>
                    </div>
                    <div style={{ width: 40, textAlign: "center", display: "flex", justifyContent: "center" }}>
                      {isDiff && <ArrowRight size={16} color={COLORS.textSecondary} strokeWidth={2.5} />}
                    </div>
                    <div style={{ flex: 1, textAlign: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isDiff ? COLORS.primary : COLORS.textMain }}>{targetPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 16, padding: 12, backgroundColor: COLORS.inputBg, borderRadius: 12, fontSize: 12, color: COLORS.textSecondary, lineHeight: 1.5 }}><strong style={{ color: COLORS.textMain }}>Note:</strong> "Ideal Allocation" is derived from Modern Portfolio Theory (MPT) and historical market data, tailored to your goal ({investmentGoal}) and time horizon ({timeHorizon} years). This is a general guideline, not personalized financial advice.</div>
        </div>)}

        {resultView === "summary" && (<div style={{ backgroundColor: COLORS.inputBg, padding: 16, borderRadius: 16, fontSize: 14 }}>
          <div style={{ marginBottom: 20, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12 }}><div style={{ fontWeight: 800, color: COLORS.textMain, fontSize: 16 }}>Portfolio Statistics</div><div style={{ fontSize: 13, color: COLORS.textSecondary }}>Based on 500 Monte Carlo simulations</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ backgroundColor: "white", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}><div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Expected Annual Return</div><div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary }}>{(simulationResult.stats.expectedReturn * 100).toFixed(1)}%</div></div>
            <div style={{ backgroundColor: "white", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}><div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Volatility (Std Dev)</div><div style={{ fontSize: 24, fontWeight: 800, color: COLORS.orange }}>{(simulationResult.stats.volatility * 100).toFixed(1)}%</div></div>
            <div style={{ backgroundColor: "white", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}><div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Sharpe Ratio</div><div style={{ fontSize: 24, fontWeight: 800, color: COLORS.blue }}>{simulationResult.stats.sharpeRatio.toFixed(2)}</div><div style={{ fontSize: 11, color: COLORS.textSecondary }}>Risk-adjusted return</div></div>
            <div style={{ backgroundColor: "white", padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}` }}><div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>Max Drawdown</div><div style={{ fontSize: 24, fontWeight: 800, color: COLORS.red }}>-{(simulationResult.stats.maxDrawdown * 100).toFixed(0)}%</div><div style={{ fontSize: 11, color: COLORS.textSecondary }}>Worst peak-to-trough</div></div>
          </div>
          <div style={{ marginTop: 24 }}><div style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 14, marginBottom: 12 }}>Possible Outcomes After {timeHorizon} Years</div><div style={{ backgroundColor: "white", borderRadius: 12, overflow: "hidden", border: `1px solid ${COLORS.border}` }}><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", backgroundColor: COLORS.inputBg, padding: "12px 16px", fontWeight: 700, fontSize: 12, color: COLORS.textSecondary }}><div>Scenario</div><div style={{ textAlign: "right" }}>Portfolio Value</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}><div style={{ color: COLORS.primary, fontWeight: 600 }}>Best Case (90th)</div><div style={{ textAlign: "right", fontWeight: 700 }}>${Math.round(simulationResult.stats.finalP90).toLocaleString()}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}><div style={{ color: COLORS.blue, fontWeight: 600 }}>Median</div><div style={{ textAlign: "right", fontWeight: 700 }}>${Math.round(simulationResult.stats.finalMedian).toLocaleString()}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}` }}><div style={{ color: COLORS.orange, fontWeight: 600 }}>Expected</div><div style={{ textAlign: "right", fontWeight: 700 }}>${Math.round(simulationResult.stats.finalExpected).toLocaleString()}</div></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "12px 16px" }}><div style={{ color: COLORS.red, fontWeight: 600 }}>Worst Case (10th)</div><div style={{ textAlign: "right", fontWeight: 700 }}>${Math.round(simulationResult.stats.finalP10).toLocaleString()}</div></div></div></div>
          <div style={{ marginTop: 24, padding: 16, backgroundColor: "white", borderRadius: 12, border: `1px solid ${COLORS.border}` }}><div style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 14, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><HelpCircle size={16} color={COLORS.blue} />What This Means</div><div style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.7 }}>Based on your inputs, if you invest <strong style={{ color: COLORS.textMain }}>${inputMode === "dollar" ? totalAllocation.toLocaleString() : parseInt(initialInvestment).toLocaleString()}</strong> today and contribute <strong style={{ color: COLORS.textMain }}>${parseInt(annualContribution).toLocaleString()}/year</strong>, your portfolio <em>might</em> grow to approximately <strong style={{ color: COLORS.primary }}>${Math.round(simulationResult.stats.finalExpected).toLocaleString()}</strong> over {timeHorizon} years. Due to market volatility, actual results could range from <strong style={{ color: COLORS.red }}>${Math.round(simulationResult.stats.finalP10).toLocaleString()}</strong> to <strong style={{ color: COLORS.primary }}>${Math.round(simulationResult.stats.finalP90).toLocaleString()}</strong>.</div></div>
        </div>)}
      </div>)}

      <div style={{ backgroundColor: COLORS.orangeLight, borderRadius: "16px", padding: "16px", marginTop: "24px", display: "flex", gap: "12px", alignItems: "flex-start" }}>
        <Info size={20} color={COLORS.orange} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: "12px", color: COLORS.orange, lineHeight: 1.6 }}><strong>Important Disclaimer:</strong> This simulation is for educational purposes only and does not constitute financial advice. Results are hypothetical projections based on historical return assumptions. Actual market performance varies significantly, past performance does not guarantee future results, and you may lose money. Consult a licensed financial advisor before making investment decisions.</div>
      </div>

      <div style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "24px",
          boxShadow: "0 4px 12px -4px rgba(0,0,0,0.05)",
          marginBottom: "20px",
          marginTop: "24px"
      }}>
          <div style={{
              fontSize: "14px", 
              fontWeight: 600, 
              color: COLORS.textSecondary,
              marginBottom: "12px",
              textAlign: "center"
          }}>
              Related Calculators
          </div>
          <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%"
          }}>
              <div style={{ display: "flex", gap: "8px" }}>
                  <a href="/" style={{ textDecoration: "none", flex: 1 }}>
                  <button 
                    className="btn-press"
                    style={{
                        width: "100%",
                        padding: "12px 10px",
                        backgroundColor: COLORS.inputBg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: "10px",
                        color: COLORS.primary,
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.accentLight;
                        e.currentTarget.style.borderColor = COLORS.primary;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.inputBg;
                        e.currentTarget.style.borderColor = COLORS.border;
                    }}
                  >
                      <TrendingUp size={16} />
                      Portfolio Optimizer
                  </button>
                  </a>
                  <a href="/" style={{ textDecoration: "none", flex: 1 }}>
                  <button 
                    className="btn-press"
                    style={{
                        width: "100%",
                        padding: "12px 10px",
                        backgroundColor: COLORS.inputBg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: "10px",
                        color: COLORS.primary,
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.accentLight;
                        e.currentTarget.style.borderColor = COLORS.primary;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.inputBg;
                        e.currentTarget.style.borderColor = COLORS.border;
                    }}
                  >
                      <Target size={16} />
                      Mortgage Calculator
                  </button>
                  </a>
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                  <button 
                    className="btn-press"
                    style={{
                        flex: "0 1 50%",
                        padding: "12px 10px",
                        backgroundColor: COLORS.inputBg,
                        border: `1px solid ${COLORS.border}`,
                        borderRadius: "10px",
                        color: COLORS.primary,
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px"
                    }}
                  >
                      <Check size={16} />
                      Portfolio Analyzer
                  </button>
              </div>
          </div>
      </div>

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

      {showFeedbackModal && (
        <div style={styles.modalOverlay} onClick={() => setShowFeedbackModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowFeedbackModal(false)}>
              <X size={20} />
            </button>
            
            <div style={{fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: COLORS.textMain}}>
              Feedback
            </div>
            <div style={{fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px"}}>
              Help us improve the calculator.
            </div>

            {feedbackStatus === "success" ? (
                <div style={{textAlign: "center", padding: "20px", color: COLORS.primary, fontWeight: 600}}>
                    Thanks for your feedback!
                </div>
            ) : (
                <>
                    <textarea 
                        style={{...styles.input, height: "120px", resize: "none", fontFamily: "inherit"}}
                        placeholder="Tell us what you think..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                    />
                    {feedbackStatus === "error" && (
                        <div style={{color: COLORS.red, fontSize: "14px", marginBottom: "10px"}}>
                            Failed to send. Please try again.
                        </div>
                    )}
                    <button 
                        style={{...styles.calcButton, width: "100%"}} 
                        onClick={handleFeedbackSubmit}
                        disabled={feedbackStatus === "submitting" || !feedbackText.trim()}
                        className="btn-press"
                    >
                        {feedbackStatus === "submitting" ? "Sending..." : "Send Feedback"}
                    </button>
                </>
            )}
          </div>
        </div>
      )}

      {/* Subscription Modal */}
      {showSubscribeModal && (
        <div style={styles.modalOverlay} onClick={() => setShowSubscribeModal(false)}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowSubscribeModal(false)}>
              <X size={20} />
            </button>
            
            <div style={{fontSize: "24px", fontWeight: 800, marginBottom: "8px", color: COLORS.textMain}}>
              Sign Up For Portfolio Tips
            </div>
            <div style={{fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px"}}>
              Get personalized recommendations to improve your investment strategy.
            </div>

            {subscribeStatus === "success" ? (
                <div style={{textAlign: "center", padding: "20px", color: COLORS.primary, fontWeight: 600}}>
                    <div style={{fontSize: "40px", marginBottom: "10px"}}>🎉</div>
                    {subscribeMessage}
                </div>
            ) : (
                <>
                    <div style={{marginBottom: "16px"}}>
                        <label style={{display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: COLORS.textMain}}>Email Address</label>
                        <input 
                            style={styles.input}
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {subscribeStatus === "error" && (
                        <div style={{color: COLORS.red, fontSize: "14px", marginBottom: "16px", textAlign: "center"}}>
                            {subscribeMessage}
                        </div>
                    )}

                    <button 
                        style={{...styles.calcButton, width: "100%"}} 
                        onClick={handleSubscribe}
                        disabled={subscribeStatus === "loading"}
                        className="btn-press"
                    >
                        {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe"}
                    </button>
                    <div style={{fontSize: "11px", color: COLORS.textSecondary, textAlign: "center", marginTop: "12px", lineHeight: 1.4}}>
                        By subscribing, you agree to receive emails. Unsubscribe anytime. We retain your email until you unsubscribe.
                    </div>
                </>
            )}
          </div>
        </div>
      )}

      <style>{`input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; } input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 20px; width: 20px; border-radius: 50%; background: ${COLORS.primary}; cursor: pointer; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.2); margin-top: -6px; } .btn-press { transition: transform 0.1s ease, opacity 0.2s; } .btn-press:active { transform: scale(0.95); } .btn-press:hover { opacity: 0.7; } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; } @media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}
