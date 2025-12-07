import React, { useState, useEffect } from "react";
import {
  RotateCcw,
  Play,
  Minus,
  Plus,
  ChevronDown,
  Printer,
  Heart,
  Loader,
  Mail,
  MessageSquare,
  HelpCircle,
  ArrowRight,
  Check,
  X,
  TrendingUp,
  Target
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';

const COLORS = {
  primary: "#56C596", // Mint Green
  primaryDark: "#3aa87b",
  bg: "#FAFAFA",
  card: "#FFFFFF",
  textMain: "#1A1A1A",
  textSecondary: "#9CA3AF",
  border: "#F3F4F6",
  inputBg: "#F9FAFB",
  accentLight: "#E6F7F0",
  blue: "#5D9CEC",
  yellow: "#F59E0B",
  red: "#FF6B6B",
  orange: "#F2994A",
  orangeLight: "#FFF7ED",
  saveGreen: "#4D7C0F",
  tableHeader: "#2563EB"
};

interface CalculatorValues {
  currentAge: string;
  income: string;
  savings: string;
  contributions: string;
  budget: string;
  otherIncome: string;
  retirementAge: string;
  lifeExpectancy: string;
  preRetireRate: string;
  postRetireRate: string;
  inflation: string;
  incomeIncrease: string;
  contributionMode: "$" | "%";
  budgetMode: "$" | "%";
}

interface CalculatorData {
  values: CalculatorValues;
  touched: Partial<Record<keyof CalculatorValues, boolean>>;
  result: any | null;
}

const NumberControl = ({ 
  value, 
  onChange, 
  min = 0, 
  max = 10000000, 
  step = 1, 
  label,
  suffix,
  prefix
}: {
  value: string;
  onChange: (val: string) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
  prefix?: string;
}) => {
  const handleDec = () => {
    const num = parseFloat(value) || 0;
    if (num - step >= min) onChange(Math.round((num - step) * 100) / 100 + "");
  };

  const handleInc = () => {
    const num = parseFloat(value) || 0;
    if (num + step <= max) onChange(Math.round((num + step) * 100) / 100 + "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/,/g, ''); 
    const val = raw.replace(/[^0-9.]/g, '');
    onChange(val);
  };

  const btnStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "white",
    color: COLORS.primary,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
  };

  return (
    <div style={{
      backgroundColor: COLORS.inputBg,
      borderRadius: "12px",
      padding: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "8px",
      height: "44px"
    }}>
      <button onClick={handleDec} style={btnStyle}><Minus size={16} strokeWidth={3} /></button>
      
      <div style={{flex: 1, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"}}>
          {prefix && <span style={{fontSize: "16px", fontWeight: 700, color: COLORS.textMain}}>{prefix}</span>}
          <input 
            type="text" 
            value={value ? Number(value).toLocaleString() : ""} 
            onChange={handleChange}
            style={{
              width: "100%", 
              border: "none", 
              background: "transparent", 
              textAlign: "center", 
              fontSize: "16px", 
              fontWeight: 700, 
              color: COLORS.textMain,
              outline: "none"
            }}
          />
          {suffix && <span style={{fontSize: "14px", color: COLORS.textSecondary, fontWeight: 500}}>{suffix}</span>}
      </div>

      <button onClick={handleInc} style={btnStyle}><Plus size={16} strokeWidth={3} /></button>
    </div>
  );
};

const DEFAULT_VALUES: CalculatorValues = {
  currentAge: "35",
  income: "60000",
  savings: "30000",
  contributions: "500",
  budget: "2561",
  otherIncome: "0",
  retirementAge: "67",
  lifeExpectancy: "95",
  preRetireRate: "7",
  postRetireRate: "5",
  inflation: "3",
  incomeIncrease: "2",
  contributionMode: "$",
  budgetMode: "$"
};

const CALCULATOR_TYPES = ["Portfolio Optimizer"] as const;
type CalculatorType = typeof CALCULATOR_TYPES[number];

const STORAGE_KEY = "PORTFOLIO_OPTIMIZER_DATA";
const EXPIRATION_DAYS = 30;

const loadSavedData = (): Record<CalculatorType, CalculatorData> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { data, timestamp } = JSON.parse(saved);
      const now = new Date().getTime();
      const daysDiff = (now - timestamp) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < EXPIRATION_DAYS) {
        const merged: Record<CalculatorType, CalculatorData> = {
            "Portfolio Optimizer": { values: { ...DEFAULT_VALUES }, touched: {}, result: null }
        };

        if (data["Portfolio Optimizer"]) {
            merged["Portfolio Optimizer"] = {
                ...merged["Portfolio Optimizer"],
                ...data["Portfolio Optimizer"],
                values: { ...merged["Portfolio Optimizer"].values, ...data["Portfolio Optimizer"].values }
            };
        }
        return merged;
      }
    }
  } catch (e) {
    console.error("Failed to load saved data", e);
  }
  
  return {
    "Portfolio Optimizer": { values: { ...DEFAULT_VALUES }, touched: {}, result: null }
  };
};

export default function PortfolioOptimizerHelloWorld({ initialData }: { initialData?: any }) {
  const [calculatorType, setCalculatorType] = useState<CalculatorType>("Portfolio Optimizer");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [calculators, setCalculators] = useState<Record<CalculatorType, CalculatorData>>(() => {
    const loaded = loadSavedData();
    if (initialData && Object.keys(initialData).length > 0) {
       try {
         const current = loaded["Portfolio Optimizer"];
         loaded["Portfolio Optimizer"] = {
           ...current,
           values: {
             ...current.values,
             currentAge: initialData.current_age ? String(initialData.current_age) : current.values.currentAge,
             income: initialData.annual_pre_tax_income ? String(initialData.annual_pre_tax_income) : current.values.income,
             savings: initialData.current_retirement_savings ? String(initialData.current_retirement_savings) : current.values.savings,
             contributions: initialData.monthly_contributions ? String(initialData.monthly_contributions) : current.values.contributions,
             budget: initialData.monthly_budget_in_retirement ? String(initialData.monthly_budget_in_retirement) : current.values.budget,
             otherIncome: initialData.other_retirement_income ? String(initialData.other_retirement_income) : current.values.otherIncome,
             retirementAge: initialData.retirement_age ? String(initialData.retirement_age) : current.values.retirementAge,
             lifeExpectancy: initialData.life_expectancy ? String(initialData.life_expectancy) : current.values.lifeExpectancy,
             preRetireRate: initialData.pre_retirement_rate_of_return ? String(initialData.pre_retirement_rate_of_return) : current.values.preRetireRate,
             postRetireRate: initialData.post_retirement_rate_of_return ? String(initialData.post_retirement_rate_of_return) : current.values.postRetireRate,
             inflation: initialData.inflation_rate ? String(initialData.inflation_rate) : current.values.inflation,
             incomeIncrease: initialData.annual_income_increase ? String(initialData.annual_income_increase) : current.values.incomeIncrease
           },
           touched: {} // Reset touched on fresh load
         };
       } catch (e) {
         console.error("Failed to apply initialData:", e);
       }
    }
    return loaded;
  });

  // Subscription State
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  const [showBanner, setShowBanner] = useState(true);

  // Personal Notes State
  const [personalNotes, setPersonalNotes] = useState("");

  // Feedback State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

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
                topicId: "portfolio-news",
                topicName: "Portfolio Optimizer Updates"
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
                    calculatorType
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

  useEffect(() => {
    const dataToSave = {
        data: calculators,
        timestamp: new Date().getTime()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [calculators]);

  const currentCalc = calculators[calculatorType];
  const { 
    currentAge, income, savings, contributions, budget, otherIncome,
    retirementAge, lifeExpectancy, preRetireRate, postRetireRate, inflation, incomeIncrease,
    contributionMode, budgetMode
  } = currentCalc.values;

  const updateVal = (field: keyof CalculatorValues, value: any) => {
    setCalculators(prev => {
      const next = { ...prev };
      next[calculatorType] = {
        ...next[calculatorType],
        values: {
          ...next[calculatorType].values,
          [field]: value
        },
        touched: {
          ...next[calculatorType].touched,
          [field]: true
        }
      };
      return next;
    });
  };

  const updateResult = (result: any) => {
    setCalculators(prev => ({
      ...prev,
      [calculatorType]: {
        ...prev[calculatorType],
        result
      }
    }));
  };

  const calculateRetirement = () => {
    const currentAgeNum = parseFloat(currentAge);
    const retirementAgeNum = parseFloat(retirementAge);
    const lifeExpectancyNum = parseFloat(lifeExpectancy);
    const incomeNum = parseFloat(income);
    let savingsNum = parseFloat(savings);
    
    if (isNaN(currentAgeNum) || isNaN(retirementAgeNum) || isNaN(incomeNum) || isNaN(savingsNum)) {
      console.warn("Calculation skipped due to invalid inputs:", { currentAge, retirementAge, income, savings });
      return;
    }

    // Advanced Calculation Logic
    const preRate = parseFloat(preRetireRate) / 100;
    const postRate = parseFloat(postRetireRate) / 100;
    const infl = parseFloat(inflation) / 100;
    const incIncrease = parseFloat(incomeIncrease) / 100;
    
    // Parse Personal Notes for adjustments (non-destructive)
    const noteText = personalNotes.toLowerCase();
    let budgetAdj = 0; // Annual adjustment to expenses
    let incomeAdj = 0; // Annual adjustment to income
    let savingsAdj = 0; // Lump sum adjustment to final wealth
    
    // 1. Sentence-based analysis
    const sentences = noteText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
        const amountMatch = sentence.match(/[\$]?([0-9,]+)/);
        if (amountMatch) {
            const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
            if (!isNaN(amount) && amount > 0) {
                const isMonthly = sentence.includes("month") || sentence.includes("/mo");
                const multiplier = isMonthly ? 12 : 1;
                const isRecurring = isMonthly || sentence.includes("year") || sentence.includes("annual");

                if (isRecurring) {
                    // Income Streams
                    if (sentence.includes("pension") || sentence.includes("social security") || sentence.includes("annuity") || 
                        sentence.includes("earn") || sentence.includes("salary") || sentence.includes("rent") || sentence.includes("income")) {
                        incomeAdj += amount * multiplier;
                    }
                    // Budget Reductions
                    else if (sentence.includes("save") || sentence.includes("cut") || sentence.includes("reduce") || sentence.includes("lower")) {
                        budgetAdj -= amount * multiplier;
                    }
                    // Budget Increases (Default for recurring costs)
                    else {
                        budgetAdj += amount * multiplier;
                    }
                } else {
                    // One-time Positive
                    if (sentence.includes("inherit") || sentence.includes("gift") || sentence.includes("sell") || 
                        sentence.includes("windfall") || sentence.includes("bonus") || sentence.includes("profit")) {
                        savingsAdj += amount;
                    }
                    // One-time Negative
                    else if (sentence.includes("debt") || sentence.includes("loan") || sentence.includes("owe") || 
                             sentence.includes("cost") || sentence.includes("buy") || sentence.includes("purchase") || 
                             sentence.includes("spend") || sentence.includes("pay") || sentence.includes("college") || 
                             sentence.includes("wedding") || sentence.includes("renovation") || sentence.includes("surgery")) {
                        savingsAdj -= amount;
                    }
                }
            }
        }
    }
    
    // 2. Global keyword analysis for recurring budget impacts (fallback)
    if (noteText.includes("wife") || noteText.includes("husband") || noteText.includes("spouse") || 
        noteText.includes("sick") || noteText.includes("care") || noteText.includes("disabled") || 
        noteText.includes("support") || noteText.includes("mother") || noteText.includes("father")) {
        budgetAdj += (1500 * 12); 
    }

    // 1. Calculate "What you'll need" at Retirement Age (Gross Need)
    const yearsPre = retirementAgeNum - currentAgeNum;
    const yearsPost = lifeExpectancyNum - retirementAgeNum;
    
    // Gross expenses and income in retirement (annual)
    const annualExpensesToday = (parseFloat(budget) * 12) + budgetAdj;
    const annualIncomeToday = (parseFloat(otherIncome) * 12) + incomeAdj;
    
    // Monthly shortfall logic for graph/gap analysis
    const monthlyShortfallToday = Math.max(0, parseFloat(budget) - parseFloat(otherIncome));
    const annualShortfallToday = monthlyShortfallToday * 12;
    const annualShortfallAtRetire = annualShortfallToday * Math.pow(1 + infl, yearsPre);
    
    // Gross Need Calculation (Total Cost of Retirement)
    const annualExpensesAtRetire = annualExpensesToday * Math.pow(1 + infl, yearsPre);
    const annualIncomeAtRetire = annualIncomeToday * Math.pow(1 + infl, yearsPre);
    
    // Need: Present value of all retirement expenses (Gross)
    // Use a fixed 4% safe withdrawal rate assumption - independent of investment strategy choice
    // Assuming Start-of-Year withdrawals (Need money at beginning of period)
    const safeWithdrawalRate = 0.04;
    
    let grossNeedAtRetirement = 0;
    let incomeValueAtRetirement = 0;
    let netNeedAtRetirement = 0; // Shortfall funded by portfolio

    for (let i = 0; i < yearsPost; i++) {
        // Discounted Values
        const yearlyExpense = annualExpensesAtRetire * Math.pow(1 + infl, i);
        const yearlyIncome = annualIncomeAtRetire * Math.pow(1 + infl, i);
        const yearlyShortfall = annualShortfallAtRetire * Math.pow(1 + infl, i);
        
        const discountFactor = Math.pow(1 + safeWithdrawalRate, i);
        
        grossNeedAtRetirement += yearlyExpense / discountFactor;
        incomeValueAtRetirement += yearlyIncome / discountFactor;
        netNeedAtRetirement += yearlyShortfall / discountFactor;
    }

    // 2. Required Contribution Calculation (Gap Analysis for Portfolio)
    const fvSavings = savingsNum * Math.pow(1 + preRate, yearsPre);
    const gap = netNeedAtRetirement - fvSavings;
    
    let initialAnnualContribNeeded = 0;
    let accumFactor = 0;
    for (let k = 0; k < yearsPre; k++) {
        accumFactor += Math.pow(1 + incIncrease, k) * Math.pow(1 + preRate, yearsPre - 1 - k);
    }
    if (accumFactor > 0) {
        initialAnnualContribNeeded = gap / accumFactor;
    }
    
    // 3. Calculate "What you'll have" using proper FV formula (Liquid Portfolio)
    let annualContrib = parseFloat(contributions);
    if (contributionMode === "%") {
        annualContrib = incomeNum * (parseFloat(contributions) / 100);
    } else {
        annualContrib = annualContrib * 12; // Convert monthly to annual
    }
    
    // Future value of initial savings
    const fvInitial = savingsNum * Math.pow(1 + preRate, yearsPre);
    
    // Future value of contributions
    let fvContributions = 0;
    if (contributionMode === "$") {
        // Fixed contributions: standard annuity formula
        // FV = PMT * [((1+r)^n - 1) / r]
        fvContributions = annualContrib * (Math.pow(1 + preRate, yearsPre) - 1) / preRate;
    } else {
        // % of income: contributions grow with income (growing annuity)
        if (Math.abs(preRate - incIncrease) < 0.0001) {
            fvContributions = annualContrib * yearsPre * Math.pow(1 + preRate, yearsPre - 1);
        } else {
            fvContributions = annualContrib * (Math.pow(1 + preRate, yearsPre) - Math.pow(1 + incIncrease, yearsPre)) / (preRate - incIncrease);
        }
    }
    
    // Graph still tracks liquid assets
    const whatYouHaveLiquid = Math.round(fvInitial + fvContributions);
    
    // Calculate College Tuition Adjustment (Lump Sum Deduction from final wealth)
    let collegeCost = 0;
    if (helpWithCollege && familyPlan !== "none") {
        // Approximate total cost for tuition assistance
        // Small Family (1-2 kids): ~$300,000
        // Large Family (3+ kids): ~$600,000
        collegeCost = familyPlan === "small" ? 300000 : 600000;
    }

    // Summary "Have" includes income value to compare against Gross Need
    const totalWealthAtRetirement = whatYouHaveLiquid + incomeValueAtRetirement + savingsAdj - collegeCost;
    
    // 4. Generate Graph Data for visualization
    const graphData = [];
    
    let simCurrent = savingsNum;
    let simIdeal = savingsNum;
    
    let simSalary = incomeNum;
    let simCurrentContrib = annualContrib;
    let simIdealContrib = Math.max(0, initialAnnualContribNeeded);
    
    let runOutAgeCurrent = null;
    let runOutAgeIdeal = null;
    
    const totalYears = lifeExpectancyNum - currentAgeNum;
    
    for (let yr = 0; yr <= totalYears; yr++) {
        const age = currentAgeNum + yr;
        const isRetired = age > retirementAgeNum; // Changed: retire AFTER this age
        
        graphData.push({
            age,
            current: Math.round(simCurrent),
            recommended: Math.round(simIdeal)
        });
        
        if (isRetired) {
            // Drawdown phase
            const yearsIntoRetirement = age - retirementAgeNum;
            const payout = annualShortfallAtRetire * Math.pow(1 + infl, yearsIntoRetirement - 1);
            
            // Current Path
            if (simCurrent > 0) {
                simCurrent = simCurrent * (1 + postRate) - payout;
                if (simCurrent < 0) {
                    simCurrent = 0;
                    if (!runOutAgeCurrent) runOutAgeCurrent = age;
                }
            }
            
            // Ideal Path
            if (simIdeal > 0) {
                simIdeal = simIdeal * (1 + postRate) - payout;
                if (simIdeal < 0) {
                    simIdeal = 0;
                    if (!runOutAgeIdeal) runOutAgeIdeal = age;
                }
            }
            
        } else {
            // Accumulation phase (including retirement year)
            simCurrent = simCurrent * (1 + preRate) + simCurrentContrib;
            simIdeal = simIdeal * (1 + preRate) + simIdealContrib;
            
            simSalary *= (1 + incIncrease);
            
            if (contributionMode === "%") {
                simCurrentContrib = simSalary * (parseFloat(contributions) / 100);
            }
            simIdealContrib *= (1 + incIncrease);
        }
    }
    const whatYouNeed = grossNeedAtRetirement;

    updateResult({
        have: Math.round(totalWealthAtRetirement),
        need: Math.round(whatYouNeed),
        graphData,
        runOutAgeCurrent: runOutAgeCurrent || lifeExpectancyNum,
        runOutAgeIdeal: runOutAgeIdeal || lifeExpectancyNum,
        monthlyContribNeeded: Math.round(initialAnnualContribNeeded / 12),
        currentMonthlyContrib: Math.round(simCurrentContrib / 12),
        monthlyShortfall: monthlyShortfallToday
    });
  };

  const calculate = () => {
      calculateRetirement();
  };

  useEffect(() => {
    calculate();
  }, [currentCalc.values, personalNotes]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resultView, setResultView] = useState<"graph" | "summary" | "tips">("graph");

  const toggleMode = (field: "contributionMode" | "budgetMode") => {
    const current = currentCalc.values[field];
    updateVal(field, current === "$" ? "%" : "$");
  };

  // Smart Defaults: Auto-calculate budget based on income if budget hasn't been touched
  useEffect(() => {
    const incomeNum = parseFloat(income);
    if (!isNaN(incomeNum) && !currentCalc.touched.budget) {
      // 75% replacement rate rule of thumb
      const suggestedAnnualBudget = incomeNum * 0.75;
      const suggestedMonthlyBudget = Math.round(suggestedAnnualBudget / 12);
      
      setCalculators(prev => {
        const next = { ...prev };
        next[calculatorType] = {
          ...next[calculatorType],
          values: {
            ...next[calculatorType].values,
            budget: String(suggestedMonthlyBudget)
          }
          // Do NOT mark as touched so it continues to update until user manually overrides
        };
        return next;
      });
    }
  }, [income, currentCalc.touched.budget, calculatorType]);

  const handleInvestmentStrategy = (strategy: "conservative" | "moderate" | "aggressive") => {
    let pre = "6";
    let post = "5";
    
    if (strategy === "conservative") {
        pre = "4";
        post = "3";
    } else if (strategy === "aggressive") {
        pre = "9";
        post = "7";
    } else {
        // Moderate
        pre = "7";
        post = "5";
    }

    setCalculators(prev => {
        const next = { ...prev };
        next[calculatorType] = {
          ...next[calculatorType],
          values: {
            ...next[calculatorType].values,
            preRetireRate: pre,
            postRetireRate: post
          },
          touched: {
            ...next[calculatorType].touched,
            preRetireRate: true,
            postRetireRate: true
          }
        };
        return next;
      });
  };

  const resetToDefaults = () => {
    // Clear localStorage entirely for true "clear saved data"
    localStorage.removeItem(STORAGE_KEY);
    
    setCalculators(prev => {
      const next = { ...prev };
      next[calculatorType] = {
        values: { 
          ...DEFAULT_VALUES,
          preRetireRate: "7",  // Moderate investment strategy
          postRetireRate: "5"
        },
        touched: {},
        result: null
      };
      return next;
    });
    setTravelPlan("moderate");
    setFamilyPlan("none");
    setHelpWithCollege(false);
    setSavingsDetails({ savings: "", checking: "", crypto: "", retirement: "", stockPortfolio: "" });
    setIncomeDetails({ socialSecurity: "", realEstate: "", trust: "", investments: "", other: "" });
    setPersonalNotes("");
  };

  const [travelPlan, setTravelPlan] = useState<"low" | "moderate" | "high">("moderate");
  const [familyPlan, setFamilyPlan] = useState<"none" | "small" | "large">("none");
  const [helpWithCollege, setHelpWithCollege] = useState(false);

  const getTravelCost = (plan: "low" | "moderate" | "high") => {
    if (plan === "low") return 200;
    if (plan === "moderate") return 800;
    return 2500; // high
  };

  const handleTravelPlanChange = (newPlan: "low" | "moderate" | "high") => {
    const oldCost = getTravelCost(travelPlan);
    const newCost = getTravelCost(newPlan);
    const diff = newCost - oldCost;
    
    const currentBudget = parseFloat(budget) || 0;
    const newBudget = Math.max(0, currentBudget + diff);
    
    setTravelPlan(newPlan);
    updateVal("budget", String(Math.round(newBudget)));
  };

  const getFamilyCost = (plan: "none" | "small" | "large") => {
    if (plan === "none") return 0;
    if (plan === "small") return 300; // 1-2 kids: visits, gifts in retirement
    return 600; // large family: 3+ kids
  };

  const getCollegeContribReduction = (plan: "none" | "small" | "large") => {
    if (plan === "none") return 0;
    if (plan === "small") return 400; // reduce monthly contributions by $400
    return 800; // large family: reduce by $800
  };

  const handleFamilyPlanChange = (newPlan: "none" | "small" | "large") => {
    const oldCost = getFamilyCost(familyPlan);
    const newCost = getFamilyCost(newPlan);
    const budgetDiff = newCost - oldCost;
    
    const currentBudget = parseFloat(budget) || 0;
    const newBudget = Math.max(0, currentBudget + budgetDiff);
    
    // No longer modifying contributions directly for college help
    // College cost is now calculated as a lump sum deduction in calculateRetirement
    
    setFamilyPlan(newPlan);
    updateVal("budget", String(Math.round(newBudget)));
  };

  const handleCollegeToggle = (checked: boolean) => {
    // No longer modifying contributions directly
    setHelpWithCollege(checked);
  };

  // "Smart Estimate" for budget
  const applySmartBudget = () => {
      const incomeNum = parseFloat(income);
      if (!isNaN(incomeNum)) {
          // 75% replacement rate
          const suggested = Math.round((incomeNum * 0.75) / 12);
          updateVal("budget", String(suggested));
      }
  };

  const [savingsDetails, setSavingsDetails] = useState({
    savings: "",
    checking: "",
    crypto: "",
    retirement: "",
    stockPortfolio: ""
  });
  const [showSavingsModal, setShowSavingsModal] = useState(false);

  const [incomeDetails, setIncomeDetails] = useState({
    socialSecurity: "",
    realEstate: "",
    trust: "",
    investments: "",
    other: ""
  });
  const [showIncomeModal, setShowIncomeModal] = useState(false);

  const updateSavingsTotal = (details: typeof savingsDetails) => {
    const total = [
      details.savings, 
      details.checking, 
      details.crypto, 
      details.retirement,
      details.stockPortfolio
    ].reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    updateVal("savings", String(total));
  };

  const handleSavingsDetailChange = (field: keyof typeof savingsDetails, value: string) => {
    const newDetails = { ...savingsDetails, [field]: value };
    setSavingsDetails(newDetails);
    updateSavingsTotal(newDetails);
  };

  
  const updateIncomeTotal = (details: typeof incomeDetails) => {
    const total = [
      details.socialSecurity,
      details.realEstate,
      details.trust,
      details.investments,
      details.other
    ].reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    updateVal("otherIncome", String(total));
  };

  const handleIncomeDetailChange = (field: keyof typeof incomeDetails, value: string) => {
    const newDetails = { ...incomeDetails, [field]: value };
    setIncomeDetails(newDetails);
    updateIncomeTotal(newDetails);
  };

  const handleEstimateSocialSecurity = () => {
    const annualIncome = parseFloat(income) || 0;
    const estimated = Math.min(Math.round((annualIncome * 0.4) / 12), 3800);
    const newDetails = { ...incomeDetails, socialSecurity: String(estimated) };
    setIncomeDetails(newDetails);
    updateIncomeTotal(newDetails);
  };

  const generateTips = () => {
    if (!currentCalc.result) return [];
    
    const tips = [];
    const { have, need, monthlyContribNeeded, currentMonthlyContrib } = currentCalc.result;
    const shortfall = need - have;
    const incomeNum = parseFloat(income);
    
    // 1. The Gap (Always first if exists)
    if (shortfall > 0) {
        tips.push({
            title: "Increase Monthly Savings",
            desc: `You are saving $${currentMonthlyContrib.toLocaleString()}/mo. To reach your goal, aim for $${monthlyContribNeeded.toLocaleString()}/mo (+$${(monthlyContribNeeded - currentMonthlyContrib).toLocaleString()}).`,
            icon: "💰",
            priority: "high"
        });
    }

    // 2. Savings Rate (Target 15% or 20%)
    if (incomeNum > 0) {
        const currentRate = (currentMonthlyContrib * 12) / incomeNum;
        const targetRate = 0.15; // 15%
        if (currentRate < targetRate) {
            const targetMonthly = Math.round((incomeNum * targetRate) / 12);
            tips.push({
                title: "Boost Your Savings Rate",
                desc: `Your savings rate is ${(currentRate * 100).toFixed(1)}%. Experts recommend 15% ($${targetMonthly.toLocaleString()}/mo) for a secure retirement.`,
                icon: "📈",
                priority: "high"
            });
        }
    }

    // 3. Budget Check (Target 80% replacement ratio logic)
    const budgetNum = parseFloat(budget);
    if (incomeNum > 0 && (budgetNum * 12) > (incomeNum * 0.85)) {
         const targetBudget = Math.round((incomeNum * 0.8) / 12);
         tips.push({
            title: "Review Retirement Budget",
            desc: `Your planned spending ($${budgetNum.toLocaleString()}/mo) is high relative to your income. Reducing it to ~$${targetBudget.toLocaleString()}/mo would drastically lower your savings target.`,
            icon: "📉",
            priority: "medium"
        });
    }
    
    // 4. Investment Strategy Check
    if (shortfall > 0 && (preRetireRate === "4" || preRetireRate === "6")) {
         tips.push({
            title: "Optimize Asset Allocation",
            desc: "Your 4-6% return assumption is conservative. A balanced portfolio (60/40 stocks/bonds) historically returns ~7-8% over long periods.",
            icon: "📊",
            priority: "medium"
        });
    }

    // 5. Delay Retirement Check
    if (shortfall > 0 && parseInt(retirementAge) < 67) {
         tips.push({
            title: "Consider Delaying Retirement",
            desc: `Retiring at ${parseInt(retirementAge) + 2} instead of ${retirementAge} gives your money 2 more years to grow and reduces the withdrawal period.`,
            icon: "⏳",
            priority: "medium"
        });
    }

    // Fillers to ensure 3 tips
    const fillerTips = [
        {
            title: "Maximize Tax Advantages",
            desc: `Ensure you are contributing at least enough to get any employer 401(k) match (often free money!).`,
            icon: "🏛️",
            priority: "low"
        },
        {
            title: "Emergency Fund",
            desc: `Before aggressive investing, ensure you have 3-6 months of expenses ($${(budgetNum * 3).toLocaleString()} - $${(budgetNum * 6).toLocaleString()}) in cash.`,
            icon: "🛡️",
            priority: "low"
        },
        {
            title: "Debt Management",
            desc: "Pay off high-interest debt (>7%) before increasing retirement contributions further.",
            icon: "💳",
            priority: "low"
        }
    ];

    // Add fillers if we have space
    let fillerIndex = 0;
    while (tips.length < 3 && fillerIndex < fillerTips.length) {
        // Avoid duplicates if logic is similar (simple check here - titles are unique enough)
        const isDuplicate = tips.some(t => t.title === fillerTips[fillerIndex].title);
        if (!isDuplicate) {
             tips.push(fillerTips[fillerIndex]);
        }
        fillerIndex++;
    }
    
    return tips;
  };

  const styles = {
    container: {
      width: "100%",
      maxWidth: "600px",
      margin: "0 auto",
      backgroundColor: COLORS.bg,
      fontFamily: "'Inter', sans-serif",
      padding: "20px",
      boxSizing: "border-box" as const
    },
    title: {
      fontSize: "28px",
      fontWeight: 800,
      color: COLORS.textMain,
      marginBottom: "10px",
      textAlign: "left" as const
    },
    subheader: {
      fontSize: "14px",
      color: COLORS.textSecondary,
      marginBottom: "20px",
      marginTop: "-5px"
    },
    card: {
      backgroundColor: COLORS.card,
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)",
      marginBottom: "20px"
    },
    row: {
      display: "flex",
      alignItems: "flex-start",
      marginBottom: "20px",
      gap: "16px"
    },
    column: {
      flex: 1,
      display: "flex",
      flexDirection: "column" as const
    },
    label: {
      fontWeight: 600,
      color: COLORS.textMain,
      fontSize: "15px",
      marginBottom: "0px"
    },
    subheaderLabel: {
        fontSize: "12px",
        color: COLORS.textSecondary,
        fontWeight: 400,
        marginTop: "0px",
        marginBottom: "8px",
        lineHeight: "1.3",
        maxWidth: "90%"
    },
    toggleContainer: {
      display: "flex",
      gap: "4px",
      backgroundColor: COLORS.inputBg,
      borderRadius: "8px",
      padding: "2px",
      alignItems: "center"
    },
    toggleBtn: (isActive: boolean) => ({
      padding: "4px 12px",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: 600,
      fontSize: "14px",
      color: isActive ? "white" : COLORS.textSecondary,
      backgroundColor: isActive ? COLORS.blue : "transparent",
      transition: "all 0.2s"
    }),
    buttonRow: {
      display: "flex",
      gap: "12px",
      marginTop: "10px"
    },
    calcButton: {
      flex: 1,
      backgroundColor: COLORS.primary,
      color: "white",
      border: "none",
      padding: "14px",
      borderRadius: "16px",
      fontSize: "16px",
      fontWeight: 700,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(86, 197, 150, 0.2)"
    },
    resultCard: {
      backgroundColor: COLORS.card,
      borderRadius: "24px",
      padding: "24px",
      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)",
      marginTop: "24px"
    },
    resultHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "20px",
      borderBottom: `1px solid ${COLORS.border}`,
      paddingBottom: "16px"
    },
    resultTitle: {
        fontSize: "18px",
        fontWeight: 700,
        color: COLORS.textMain
    },
    list: {
      fontSize: "14px",
      lineHeight: "1.8",
      color: COLORS.textSecondary,
      backgroundColor: COLORS.inputBg,
      padding: "16px",
      borderRadius: "16px"
    },
    listItem: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "8px",
        borderBottom: "1px dashed #E5E7EB",
        paddingBottom: "8px"
    },
    footer: {
      display: "flex",
      justifyContent: "center",
      gap: "24px",
      marginTop: "40px",
      paddingTop: "24px",
      borderTop: `1px solid ${COLORS.border}`
    },
    footerBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: COLORS.textSecondary,
      fontSize: "14px",
      fontWeight: 600,
      transition: "color 0.2s",
      padding: "8px"
    },
    sectionTitle: {
      fontSize: "20px",
      fontWeight: 700,
      color: COLORS.textMain,
      marginBottom: "16px",
      paddingLeft: "4px"
    },
    bottomModalOverlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
      paddingBottom: "40px"
    },
    modalOverlay: {
      position: "fixed" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      zIndex: 1000,
      padding: "20px",
      paddingTop: "40px",
      overflowY: "auto" as const
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: "24px",
      padding: "24px",
      width: "100%",
      maxWidth: "560px",
      boxShadow: "0 20px 60px -10px rgba(0,0,0,0.2)",
      position: "relative" as const
    },
    modalClose: {
      position: "absolute" as const,
      top: "16px",
      right: "16px",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: COLORS.textSecondary,
      padding: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    },
    input: {
      width: "100%",
      padding: "12px 16px",
      borderRadius: "12px",
      border: `1px solid ${COLORS.border}`,
      fontSize: "16px",
      backgroundColor: COLORS.inputBg,
      color: COLORS.textMain,
      marginBottom: "16px",
      boxSizing: "border-box" as const,
      outline: "none"
    },
    headerRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px"
    },
    strategyBtn: (active: boolean) => ({
        flex: 1,
        padding: "8px",
        borderRadius: "8px",
        border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
        backgroundColor: active ? COLORS.accentLight : "white",
        color: active ? COLORS.primaryDark : COLORS.textSecondary,
        fontWeight: 700,
        fontSize: "12px",
        cursor: "pointer",
        textAlign: "center" as const
    }),
    subscribeBtn: {
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
      textDecoration: "none",
      transition: "transform 0.2s, box-shadow 0.2s",
      boxShadow: "0 4px 12px rgba(86, 197, 150, 0.25)",
      whiteSpace: "nowrap"
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div style={styles.title}>Portfolio Optimizer Pro</div>
      </div>
      <div style={{...styles.subheader, display: 'flex', alignItems: 'center', gap: 6}}>
        <Check size={16} color={COLORS.primary} /> Aligned with Certified Financial Planner™ (CFP®) principles
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
            <button style={{...styles.subscribeBtn, marginRight: 24}} className="btn-press" onClick={() => setShowSubscribeModal(true)}>
                <Mail size={14} />
                Subscribe
            </button>
            <div 
                style={{cursor: "pointer", padding: 4, position: "absolute", top: 8, right: 8, color: COLORS.textSecondary}} 
                onClick={() => setShowBanner(false)}
            >
                <X size={16} />
            </div>
          </div>
      </div>
      )}

      <div style={styles.card}>
        <div style={styles.row}>
            <div style={styles.column}>
                <div style={styles.label}>Current age</div>
                <div style={styles.subheaderLabel}>Age you are now</div>
                <NumberControl 
                    value={currentAge}
                    onChange={(v) => updateVal("currentAge", v)}
                    min={18} max={100} 
                />
            </div>

            <div style={styles.column}>
                <div style={styles.label}>Annual pre-tax income</div>
                <div style={styles.subheaderLabel}>Your yearly earnings before tax</div>
                <NumberControl 
                    value={income}
                    onChange={(v) => updateVal("income", v)}
                    min={0} max={10000000} step={1000}
                    prefix="$"
                />
            </div>
        </div>

        <div style={styles.row}>
            <div style={styles.column}>
                <div style={styles.label}>Current Savings</div>
                <div style={styles.subheaderLabel}>Total amount saved for retirement</div>
                <NumberControl 
                    value={savings}
                    onChange={(v) => updateVal("savings", v)}
                    min={0} max={10000000} step={1000}
                    prefix="$"
                />
                <div 
                    style={{fontSize: 12, color: COLORS.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'flex-end', marginTop: 4}}
                    onClick={() => setShowSavingsModal(true)}
                >
                    <span>+ Add Details</span>
                </div>
            </div>

            <div style={styles.column}>
                <div style={styles.label}>Other Monthly Income</div>
                <div style={styles.subheaderLabel}>Monthly income from other sources</div>
                <NumberControl 
                    value={otherIncome}
                    onChange={(v) => updateVal("otherIncome", v)}
                    min={0} max={100000} step={100}
                    prefix="$"
                />
                <div 
                    style={{fontSize: 12, color: COLORS.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'flex-end', marginTop: 4}}
                    onClick={() => setShowIncomeModal(true)}
                >
                    <span>+ Add Details</span>
                </div>
            </div>
        </div>

        <div style={styles.row}>
            <div style={styles.column}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={styles.label}>Monthly contributions</div>
                </div>
                <div style={styles.subheaderLabel}>Amount you save each month</div>
                <NumberControl 
                    value={contributions}
                    onChange={(v) => updateVal("contributions", v)}
                    min={0} max={100000} step={100}
                    prefix="$"
                />
            </div>

            <div style={styles.column}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div style={styles.label}>Monthly budget in retirement</div>
                </div>
                <div style={styles.subheaderLabel}>Estimated monthly spending</div>
                <NumberControl 
                    value={budget}
                    onChange={(v) => updateVal("budget", v)}
                    min={0} max={100000} step={100}
                    prefix="$"
                />
                <div 
                    style={{fontSize: 12, color: COLORS.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'flex-end', marginTop: 4}}
                    onClick={applySmartBudget}
                >
                    <span>🪄 Estimate</span>
                </div>
            </div>
        </div>

        <div 
            style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginTop: 20, marginBottom: 20, color: COLORS.blue, fontWeight: 700, fontSize: 14}}
            onClick={() => setShowAdvanced(!showAdvanced)}
        >
            {showAdvanced ? "HIDE ADVANCED DETAILS" : "ADVANCED DETAILS"}
            <ChevronDown size={16} style={{transform: showAdvanced ? "rotate(180deg)" : "none", transition: "transform 0.2s"}} />
        </div>

        {showAdvanced && (
            <>
                <div style={styles.row}>
                    <div style={styles.column}>
                        <div style={styles.label}>Retirement age</div>
                        <div style={styles.subheaderLabel}>Age you plan to retire</div>
                        <NumberControl 
                            value={retirementAge}
                            onChange={(v) => updateVal("retirementAge", v)}
                            min={parseInt(currentAge) + 1} max={100} 
                        />
                    </div>

                    <div style={styles.column}>
                        <div style={styles.label}>Life expectancy</div>
                        <div style={styles.subheaderLabel}>Estimated age of lifespan</div>
                        <NumberControl 
                            value={lifeExpectancy}
                            onChange={(v) => updateVal("lifeExpectancy", v)}
                            min={parseInt(retirementAge) + 1} max={120} 
                        />
                    </div>
                </div>

                <div style={{marginBottom: 16, marginTop: 16}}>
                    <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Investment Strategy</div>
                    <div style={{display: "flex", gap: 8}}>
                        <div style={styles.strategyBtn(preRetireRate === "4" && postRetireRate === "3")} onClick={() => handleInvestmentStrategy("conservative")}>
                            <div>Conservative</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>Bonds & Stability</div>
                        </div>
                        <div style={styles.strategyBtn(preRetireRate === "7" && postRetireRate === "5")} onClick={() => handleInvestmentStrategy("moderate")}>
                            <div>Moderate</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>Balanced Growth</div>
                        </div>
                        <div style={styles.strategyBtn(preRetireRate === "9" && postRetireRate === "7")} onClick={() => handleInvestmentStrategy("aggressive")}>
                            <div>Aggressive</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>Max Returns</div>
                        </div>
                    </div>
                </div>

                <div style={{marginBottom: 16}}>
                    <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Post-Retirement Travel Plans</div>
                    <div style={{display: "flex", gap: 8}}>
                        <div style={styles.strategyBtn(travelPlan === "low")} onClick={() => handleTravelPlanChange("low")}>
                            <div>Conservative</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>Local trips</div>
                        </div>
                        <div style={styles.strategyBtn(travelPlan === "moderate")} onClick={() => handleTravelPlanChange("moderate")}>
                            <div>Moderate</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>1-2 trips/year</div>
                        </div>
                        <div style={styles.strategyBtn(travelPlan === "high")} onClick={() => handleTravelPlanChange("high")}>
                            <div>Aggressive</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>Frequent travel</div>
                        </div>
                    </div>
                </div>

                <div style={{marginBottom: 16}}>
                    <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Family Plans</div>
                    <div style={{display: "flex", gap: 8, marginBottom: 12}}>
                        <div style={styles.strategyBtn(familyPlan === "none")} onClick={() => handleFamilyPlanChange("none")}>
                            <div>No Family</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>No children</div>
                        </div>
                        <div style={styles.strategyBtn(familyPlan === "small")} onClick={() => handleFamilyPlanChange("small")}>
                            <div>Small Family</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>1-2 children</div>
                        </div>
                        <div style={styles.strategyBtn(familyPlan === "large")} onClick={() => handleFamilyPlanChange("large")}>
                            <div>Large Family</div>
                            <div style={{fontSize: 10, fontWeight: 400, marginTop: 2}}>3+ children</div>
                        </div>
                    </div>
                    {familyPlan !== "none" && (
                        <label style={{display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: COLORS.textSecondary}}>
                            <input 
                                type="checkbox" 
                                checked={helpWithCollege}
                                onChange={(e) => handleCollegeToggle(e.target.checked)}
                                style={{width: 16, height: 16, accentColor: COLORS.primary}}
                            />
                            Check here if you plan to help with college tuition
                        </label>
                    )}
                </div>

                <div style={{marginBottom: 16, borderTop: `1px dashed ${COLORS.border}`, paddingTop: 16}}>
                    <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Additional Notes</div>
                    <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}>
                        Add any extra details about your retirement plans here.
                    </div>
                    <textarea 
                        value={personalNotes}
                        onChange={(e) => setPersonalNotes(e.target.value)}
                        placeholder="Type here..."
                        style={{
                            width: "100%", 
                            height: "52px", 
                            padding: "10px 12px", 
                            borderRadius: "12px", 
                            border: `1px solid ${COLORS.border}`, 
                            fontSize: "14px", 
                            fontFamily: "inherit",
                            marginBottom: "8px",
                            resize: "vertical",
                            backgroundColor: COLORS.card,
                            boxSizing: "border-box"
                        }}
                    />
                </div>
            </>
        )}

        <div style={styles.buttonRow}>
            <button className="btn-press" style={styles.calcButton} onClick={calculate} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader size={20} className="spin" /> : <>Calculate <Play size={20} fill="white" /></>}
            </button>
        </div>
      </div>

      {currentCalc.result && (
        <div style={styles.resultCard}>
            <div style={styles.resultHeader}>
                <span style={styles.resultTitle}>Retirement savings at age {currentCalc.values.retirementAge}</span>
            </div>
            
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 24, gap: 16}}>
                <div style={{flex: 1}}>
                    <div style={{fontSize: 14, color: COLORS.textMain, marginBottom: 4}}>What you'll have</div>
                    {(() => {
                        const have = currentCalc.result.have;
                        const need = currentCalc.result.need;
                        const ratio = need > 0 ? have / need : 1;
                        
                        let color = COLORS.primary; // Green
                        let message = "You're on track!";
                        
                        if (ratio < 0.8) {
                            color = COLORS.red;
                            message = "You're falling short.";
                        } else if (ratio < 1.0) {
                            color = COLORS.yellow;
                            message = "You're getting close.";
                        }

                        return (
                            <>
                                <div style={{fontSize: 28, fontWeight: 800, color: color}}>${have.toLocaleString()}</div>
                                <div style={{fontSize: 14, fontWeight: 600, color: color, marginTop: 4}}>{message}</div>
                            </>
                        );
                    })()}
                </div>
                <div style={{flex: 1, borderLeft: `1px solid ${COLORS.border}`, paddingLeft: 16}}>
                    <div style={{fontSize: 14, color: COLORS.textMain, marginBottom: 4}}>What you'll need</div>
                    <div style={{fontSize: 28, fontWeight: 800, color: COLORS.textMain}}>${currentCalc.result.need.toLocaleString()}</div>
                </div>
            </div>

            {/* Tabs */}
            <div style={{display: 'flex', borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24}}>
                <div 
                    style={{padding: '8px 16px', borderBottom: resultView === 'graph' ? `2px solid ${COLORS.primary}` : 'none', fontWeight: 700, color: resultView === 'graph' ? COLORS.primary : COLORS.textSecondary, cursor: 'pointer', fontSize: 12, letterSpacing: 1}}
                    onClick={() => setResultView('graph')}
                >GRAPH VIEW</div>
                <div 
                    style={{padding: '8px 16px', borderBottom: resultView === 'summary' ? `2px solid ${COLORS.primary}` : 'none', fontWeight: 700, color: resultView === 'summary' ? COLORS.primary : COLORS.textSecondary, cursor: 'pointer', fontSize: 12, letterSpacing: 1}}
                    onClick={() => setResultView('summary')}
                >SUMMARY VIEW</div>
                <div 
                    style={{padding: '8px 16px', borderBottom: resultView === 'tips' ? `2px solid ${COLORS.primary}` : 'none', fontWeight: 700, color: resultView === 'tips' ? COLORS.primary : COLORS.textSecondary, cursor: 'pointer', fontSize: 12, letterSpacing: 1}}
                    onClick={() => setResultView('tips')}
                >TIPS</div>
            </div>

            {resultView === 'graph' && (
                <div style={{height: 300, width: '100%', fontSize: 12}}>
                    <ResponsiveContainer>
                        <AreaChart data={currentCalc.result.graphData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                            <defs>
                                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                            <XAxis dataKey="age" tick={{fill: COLORS.textSecondary}} tickLine={false} axisLine={{stroke: COLORS.border}} minTickGap={30} />
                            <YAxis tick={{fill: COLORS.textSecondary}} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}m`} tickLine={false} axisLine={false} />
                            <Tooltip 
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const rec = payload.find(p => p.name === 'Recommended')?.value as number;
                                        const cur = payload.find(p => p.name === 'Current path')?.value as number;
                                        const diff = (cur !== undefined && rec !== undefined) ? cur - rec : 0;
                                        return (
                                            <div style={{backgroundColor: 'white', padding: 12, borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', border: '1px solid #E5E7EB'}}>
                                                <div style={{fontWeight: 600, marginBottom: 8, fontSize: 12, color: COLORS.textSecondary}}>Age {label}</div>
                                                <div style={{display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4}}>
                                                    <span style={{color: COLORS.blue, fontWeight: 600, fontSize: 12}}>Recommended</span>
                                                    <span style={{fontWeight: 700, color: COLORS.textMain, fontSize: 12}}>${rec?.toLocaleString()}</span>
                                                </div>
                                                <div style={{display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 8}}>
                                                    <span style={{color: COLORS.primary, fontWeight: 600, fontSize: 12}}>Current path</span>
                                                    <span style={{fontWeight: 700, color: COLORS.textMain, fontSize: 12}}>${cur?.toLocaleString()}</span>
                                                </div>
                                                <div style={{display: 'flex', justifyContent: 'space-between', gap: 16, borderTop: '1px dashed #E5E7EB', paddingTop: 4}}>
                                                    <span style={{color: COLORS.textSecondary, fontSize: 12}}>Difference</span>
                                                    <span style={{fontWeight: 700, color: diff >= 0 ? COLORS.primary : COLORS.red, fontSize: 12}}>{diff >= 0 ? '+' : ''}${diff.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area type="monotone" dataKey="recommended" stroke={COLORS.blue} strokeDasharray="5 5" fill="transparent" strokeWidth={2} name="Recommended" />
                            <Area type="monotone" dataKey="current" stroke={COLORS.primary} fill="url(#colorCurrent)" strokeWidth={2} name="Current path" />
                            <ReferenceDot x={parseInt(currentCalc.values.retirementAge)} y={currentCalc.result.have} r={4} fill={COLORS.primary} stroke="white" strokeWidth={2} />
                            <ReferenceDot x={parseInt(currentCalc.values.retirementAge)} y={currentCalc.result.need} r={4} fill={COLORS.blue} stroke="white" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div style={{display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                            <div style={{width: 12, height: 2, backgroundColor: COLORS.blue}}></div>
                            <span style={{color: COLORS.textSecondary, fontSize: 12}}>Recommended</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
                            <div style={{width: 12, height: 2, backgroundColor: COLORS.primary}}></div>
                            <span style={{color: COLORS.textSecondary, fontSize: 12}}>Current path</span>
                        </div>
                    </div>
                </div>
            )}

            {resultView === 'summary' && (
                <div style={styles.list}>
                    <div style={{marginBottom: 20, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12}}>
                        <div style={{fontWeight: 800, color: COLORS.textMain, fontSize: 16}}>Plan Analysis</div>
                        <div style={{fontSize: 13, color: COLORS.textSecondary}}>Comparison of your current trajectory vs. your goals</div>
                    </div>

                    {/* Row 1: Contribution */}
                    <div style={{marginBottom: 24}}>
                        <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Monthly Contributions</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)"}}>
                            <div style={{flex: 1}}>
                                <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500}}>Current Contribution</div>
                                <div style={{fontSize: 18, fontWeight: 800, color: COLORS.textMain}}>${currentCalc.result.currentMonthlyContrib.toLocaleString()}</div>
                            </div>
                            <div style={{color: COLORS.textSecondary, opacity: 0.5}}><ArrowRight size={24} /></div>
                             <div style={{flex: 1}}>
                                <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500}}>Required Contribution</div>
                                <div style={{fontSize: 18, fontWeight: 800, color: COLORS.blue}}>${currentCalc.result.monthlyContribNeeded.toLocaleString()}</div>
                            </div>
                        </div>
                        {(() => {
                            const diff = currentCalc.result.monthlyContribNeeded - currentCalc.result.currentMonthlyContrib;
                            if (diff > 0) {
                                return (
                                    <div style={{fontSize: 13, color: COLORS.textSecondary, marginTop: 8, paddingLeft: 4, display: 'flex', gap: 6}}>
                                        <span>💡</span>
                                        <span>To meet your goal, increase contributions by <span style={{fontWeight: 700, color: COLORS.textMain}}>${diff.toLocaleString()}</span> /mo.</span>
                                    </div>
                                );
                            } else {
                                return (
                                    <div style={{fontSize: 13, color: COLORS.primary, marginTop: 8, paddingLeft: 4, fontWeight: 600, display: 'flex', gap: 6}}>
                                        <span>✅</span>
                                        <span>You are contributing enough to meet your goal!</span>
                                    </div>
                                );
                            }
                        })()}
                    </div>

                    {/* Row 2: Total Savings */}
                     <div style={{marginBottom: 24}}>
                        <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Total Savings at Retirement</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)"}}>
                            <div style={{flex: 1}}>
                                <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500}}>Projected Outcome</div>
                                <div style={{fontSize: 18, fontWeight: 800, color: COLORS.textMain}}>${currentCalc.result.have.toLocaleString()}</div>
                            </div>
                            <div style={{color: COLORS.textSecondary, opacity: 0.5}}><ArrowRight size={24} /></div>
                             <div style={{flex: 1}}>
                                <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500}}>Retirement Goal</div>
                                <div style={{fontSize: 18, fontWeight: 800, color: COLORS.blue}}>${currentCalc.result.need.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Row 3: Run Out Age */}
                     <div>
                        <div style={{fontSize: 14, fontWeight: 600, color: COLORS.textMain, marginBottom: 8}}>Sustainability</div>
                        <div style={{display: 'flex', alignItems: 'center', gap: 12, backgroundColor: 'white', padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)"}}>
                            <div style={{flex: 1}}>
                                <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500}}>Funds last until</div>
                                <div style={{fontSize: 18, fontWeight: 800, color: currentCalc.result.runOutAgeCurrent < parseInt(currentCalc.values.lifeExpectancy) ? COLORS.red : COLORS.primary}}>Age {currentCalc.result.runOutAgeCurrent}</div>
                            </div>
                            <div style={{color: COLORS.textSecondary, opacity: 0.5}}><ArrowRight size={24} /></div>
                             <div style={{flex: 1}}>
                                <div style={{fontSize: 12, color: COLORS.textSecondary, marginBottom: 4, fontWeight: 500}}>Target Duration</div>
                                <div style={{fontSize: 18, fontWeight: 800, color: COLORS.blue}}>Age {currentCalc.values.lifeExpectancy}+</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {resultView === 'tips' && (
                <div style={styles.list}>
                    <div style={{marginBottom: 20, borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12}}>
                        <div style={{fontWeight: 800, color: COLORS.textMain, fontSize: 16}}>Personalized Recommendations</div>
                        <div style={{fontSize: 13, color: COLORS.textSecondary}}>Actionable steps to improve your retirement outlook</div>
                    </div>
                    <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
                        {generateTips().map((tip, idx) => (
                            <div key={idx} style={{backgroundColor: 'white', padding: 16, borderRadius: 12, border: `1px solid ${COLORS.border}`, boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: 'flex', gap: 16}}>
                                <div style={{fontSize: 24, backgroundColor: COLORS.inputBg, width: 48, height: 48, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0}}>
                                    {tip.icon}
                                </div>
                                <div>
                                    <div style={{fontSize: 14, fontWeight: 700, color: COLORS.textMain, marginBottom: 4}}>{tip.title}</div>
                                    <div style={{fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.5}}>{tip.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      <div style={{
          backgroundColor: COLORS.card,
          borderRadius: "16px",
          padding: "16px",
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
              {/* First row - 2 buttons */}
              <div style={{ display: "flex", gap: "8px" }}>
                  <button 
                    className="btn-press"
                    style={{
                        flex: 1,
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
                  <button 
                    className="btn-press"
                    style={{
                        flex: 1,
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
              </div>
              {/* Second row - 1 button centered */}
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
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.accentLight;
                        e.currentTarget.style.borderColor = COLORS.primary;
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = COLORS.inputBg;
                        e.currentTarget.style.borderColor = COLORS.border;
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
        <div style={styles.bottomModalOverlay} onClick={() => setShowFeedbackModal(false)}>
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

      {/* Savings Details Modal */}
      {showSavingsModal && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <button style={styles.modalClose} onClick={() => setShowSavingsModal(false)}><X size={20} /></button>
                <div style={{marginBottom: 24, textAlign: "center"}}>
                    <div style={{fontSize: 20, fontWeight: 800, color: COLORS.textMain, marginBottom: 8}}>Current Savings Breakdown</div>
                </div>
                
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
                    <div>
                        <div style={styles.label}>Savings Account</div>
                        <NumberControl 
                            value={savingsDetails.savings}
                            onChange={(v) => handleSavingsDetailChange("savings", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>Checking Account</div>
                        <NumberControl 
                            value={savingsDetails.checking}
                            onChange={(v) => handleSavingsDetailChange("checking", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>Stock Portfolio</div>
                        <NumberControl 
                            value={savingsDetails.stockPortfolio}
                            onChange={(v) => handleSavingsDetailChange("stockPortfolio", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>Crypto Accounts</div>
                        <NumberControl 
                            value={savingsDetails.crypto}
                            onChange={(v) => handleSavingsDetailChange("crypto", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>401k / Retirement Accounts</div>
                        <NumberControl 
                            value={savingsDetails.retirement}
                            onChange={(v) => handleSavingsDetailChange("retirement", v)}
                            prefix="$"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowSavingsModal(false)}
                    style={{
                        marginTop: 24,
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        backgroundColor: COLORS.primary,
                        color: "white",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: "pointer"
                    }}
                >
                    Save
                </button>
            </div>
        </div>
      )}

      {/* Income Details Modal */}
      {showIncomeModal && (
        <div style={styles.modalOverlay}>
            <div style={styles.modalContent}>
                <button style={styles.modalClose} onClick={() => setShowIncomeModal(false)}><X size={20} /></button>
                <div style={{marginBottom: 24, textAlign: "center"}}>
                    <div style={{fontSize: 20, fontWeight: 800, color: COLORS.textMain, marginBottom: 8}}>Other Monthly Income</div>
                    <div style={{fontSize: 14, color: COLORS.textSecondary}}>Enter monthly income amounts</div>
                </div>
                
                <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16}}>
                    <div>
                        <div style={styles.label}>Social Security Payment</div>
                        <NumberControl 
                            value={incomeDetails.socialSecurity}
                            onChange={(v) => handleIncomeDetailChange("socialSecurity", v)}
                            prefix="$"
                        />
                        <div 
                            style={{fontSize: 12, color: COLORS.primary, fontWeight: 700, cursor: 'pointer', display: 'flex', justifyContent: 'flex-end', marginTop: 4}}
                            onClick={handleEstimateSocialSecurity}
                        >
                            <span>🪄 Estimate</span>
                        </div>
                    </div>
                    <div>
                        <div style={styles.label}>Real Estate</div>
                        <NumberControl 
                            value={incomeDetails.realEstate}
                            onChange={(v) => handleIncomeDetailChange("realEstate", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>Trust Fund</div>
                        <NumberControl 
                            value={incomeDetails.trust}
                            onChange={(v) => handleIncomeDetailChange("trust", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>Investment Funds</div>
                        <NumberControl 
                            value={incomeDetails.investments}
                            onChange={(v) => handleIncomeDetailChange("investments", v)}
                            prefix="$"
                        />
                    </div>
                    <div>
                        <div style={styles.label}>Other</div>
                        <NumberControl 
                            value={incomeDetails.other}
                            onChange={(v) => handleIncomeDetailChange("other", v)}
                            prefix="$"
                        />
                    </div>
                </div>
                
                <button 
                    onClick={() => setShowIncomeModal(false)}
                    style={{
                        marginTop: 24,
                        width: "100%",
                        padding: "14px",
                        borderRadius: "12px",
                        border: "none",
                        backgroundColor: COLORS.primary,
                        color: "white",
                        fontSize: "16px",
                        fontWeight: 700,
                        cursor: "pointer"
                    }}
                >
                    Save
                </button>
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
              Sign Up For Retirement Tips
            </div>
            <div style={{fontSize: "14px", color: COLORS.textSecondary, marginBottom: "24px"}}>
              Get personalized recommendations to improve your retirement planning.
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

      <style>{`
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
        }
        .btn-press {
          transition: transform 0.1s ease, opacity 0.2s;
        }
        .btn-press:active {
          transform: scale(0.95);
        }
        .btn-press:hover {
          opacity: 0.7;
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        .spin {
            animation: spin 1s linear infinite;
        }
        @media print {
          body {
            background-color: white;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
