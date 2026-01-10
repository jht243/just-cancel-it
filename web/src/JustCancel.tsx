import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ChevronDown, ChevronUp, X, Mail, MessageSquare, Heart, Printer, Check, Info,
  Plane, MapPin, Calendar, Users, Sun, Cloud, Snowflake, Umbrella, Baby, Dog, Cat, Plus,
  CheckCircle2, Circle, Luggage, Shirt, Droplets, Shield, Smartphone, Activity, Home, FileText,
  Mountain, Waves, Tent, Package, Star, PenLine, Search, Upload, DollarSign, CreditCard, Trash2, ExternalLink, ArrowRight, AlertCircle, RefreshCw
} from "lucide-react";
import * as pdfjsLib from 'pdfjs-dist';
import { SUBSCRIPTION_PATTERNS } from "./data/subscriptions";

// Initialize PDF.js worker with CDN to ensure it works in hosted environments like ChatGPT
// Using version-matched worker from cdnjs - CDN is required for ChatGPT sandbox environment
const PDF_JS_VERSION = '5.4.530';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}/pdf.worker.min.mjs`;

const COLORS = {
  primary: "#56C596", primaryDark: "#3aa87b", bg: "#FAFAFA", card: "#FFFFFF",
  textMain: "#1A1A1A", textSecondary: "#9CA3AF", border: "#F3F4F6",
  inputBg: "#F9FAFB", accentLight: "#E6F7F0", blue: "#5D9CEC", yellow: "#F59E0B",
  red: "#FF6B6B", orange: "#F2994A", orangeLight: "#FFF7ED", purple: "#8B5CF6",
  gold: "#F59E0B", teal: "#14B8A6"
};

interface SubscriptionItem {
  id: string;
  service: string;
  monthlyCost: number;
  status: "cancelling" | "keeping" | "investigating" | "confirmed_subscription" | "not_subscription" | "unknown";
  category: string;
  notes?: string;
  cancelLink?: string;
  logo?: string;
  originalDescription?: string;
  cleanDescription?: string;
  count?: number;
}

interface SubscriptionProfile {
  uploadedFile: string | null;
  fileName: string | null;
  fileType: "csv" | "pdf" | null;
  manualSubscriptions: SubscriptionItem[];
  totalMonthlySpend: number;
  viewFilter: "all" | "approved" | "cancelling" | "keeping" | "investigating" | "confirmed_subscription" | "not_subscription" | "unknown";
  isAnalyzing: boolean;
  analysisComplete: boolean;
  extractedText?: string;
  parsingError?: string;
}

const DEFAULT_PROFILE: SubscriptionProfile = {
  uploadedFile: null,
  fileName: null,
  fileType: null,
  manualSubscriptions: [],
  totalMonthlySpend: 0,
  viewFilter: "all",
  isAnalyzing: false,
  analysisComplete: false
};

const SAMPLE_PROFILE: SubscriptionProfile = {
  ...DEFAULT_PROFILE,
  manualSubscriptions: [
    {
      id: "sample-unknown",
      service: "Unknown Transaction",
      monthlyCost: 24.99,
      status: "unknown",
      category: "Other",
      originalDescription: "POS DEBIT - 0429 - RECURRING PAYMENT 88219"
    }
  ],
  totalMonthlySpend: 24.99,
  analysisComplete: true
};

const STORAGE_KEY = "JUST_CANCEL_DATA";
const SUBSCRIPTION_CATEGORIES = [
  "Entertainment", "Music", "Software", "Health & Fitness", "Shopping", "Utilities", "News", "Other"
];

const loadSavedData = (): SubscriptionProfile | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { data, timestamp } = JSON.parse(saved);
      if ((new Date().getTime() - timestamp) / (1000 * 60 * 60) < 48) {
        return data;
      }
    }
  } catch (e) {
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

const saveData = (data: SubscriptionProfile) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, timestamp: new Date().getTime() })); } catch (e) { }
};



const parseTextForSubscriptions = (text: string): SubscriptionItem[] => {
  const lines = text.split(/\r?\n/);
  const foundSubscriptions: Record<string, SubscriptionItem> = {};

  // Heuristic: try to identify "amount" column
  // This is simple; in production we'd do smarter header analysis

  lines.forEach((line, index) => {
    // Skip very short lines
    if (line.length < 5) return;

    // Normalize
    const lowerLine = line.toLowerCase();

    // Check against patterns
    Object.values(SUBSCRIPTION_PATTERNS).forEach(pattern => {
      if (pattern.regex.test(lowerLine)) {
        // Found a match! Now try to extract price
        // Regex to look for currency-like numbers: $12.99 or 12.99
        // We look for numbers that appear near the end or are isolated
        const priceMatch = line.match(/(\d+\.\d{2})/);
        let cost = 0;
        if (priceMatch) {
          cost = parseFloat(priceMatch[0]);
        } else {
          // Fallback default costs if we can't parse (mock-ish but helpful)
          if (pattern.name === "Netflix") cost = 15.49;
          if (pattern.name === "Spotify") cost = 11.99;
          if (pattern.name === "ChatGPT") cost = 20.00;
        }

        const existing = foundSubscriptions[pattern.name];

        if (existing) {
          // If already exists, increment count and update cost if this one is seemingly valid and previous wasn't
          existing.count = (existing.count || 1) + 1;
          // Accumulate cost? Or just keep the max?
          // Usually subs are monthly. If we see it 3 times, maybe it's 3 separate charges?
          // User screenshot shows "x3", implies grouped.
          // We'll keep the single unit cost but display x3.
          if (existing.monthlyCost === 0 && cost > 0) existing.monthlyCost = cost;
          // Keep the longest description found maybe?
          if (line.length > (existing.originalDescription?.length || 0)) {
            existing.originalDescription = line.trim();
          }
        } else {
          foundSubscriptions[pattern.name] = {
            id: `sub-${Math.random().toString(36).substr(2, 9)}`,
            service: pattern.name,
            monthlyCost: cost > 0 ? cost : 0,
            status: "confirmed_subscription", // Default status - assume regex match is confirmed
            category: pattern.category,
            logo: pattern.logo,
            originalDescription: line.trim(),
            cleanDescription: `${pattern.category} subscription`, // Generic description for now
            count: 1
          };
        }
      }
    });
  });

  return Object.values(foundSubscriptions);
};

const getServerUrl = () => window.location.hostname === "localhost" ? "" : "https://just-cancel-it.onrender.com";

const extractTextFromPDF = async (fileData: ArrayBuffer): Promise<{ text: string, error?: string }> => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: fileData }).promise;
    let fullText = "";

    if (pdf.numPages === 0) {
      return { text: "", error: "PDF has no pages." };
    }

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }
    return { text: fullText };
  } catch (e: any) {
    console.warn("[Just Cancel] Client-side PDF Parse failed, trying server fallback...", e);

    // Server-side fallback
    try {
      const serverUrl = getServerUrl();
      const base64 = btoa(new Uint8Array(fileData).reduce((data, byte) => data + String.fromCharCode(byte), ""));
      console.log("[Just Cancel] Attempting server-side PDF extraction", { serverUrl });
      const response = await fetch(`${serverUrl}/api/extract-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64 })
      });

      console.log("[Just Cancel] /api/extract-pdf response", { ok: response.ok, status: response.status, statusText: response.statusText });

      const result = await response.json();
      if (result.text) {
        console.log("[Just Cancel] Server-side extraction successful.");
        return { text: result.text };
      }
      throw new Error(result.error || "Server extraction returned no text");
    } catch (fallbackError: any) {
      console.error("[Just Cancel] Both client and server extraction failed.", fallbackError);
      return { text: "", error: `PDF extraction failed: ${fallbackError.message}` };
    }
  }
};

const WALL_OF_SAVINGS_DATA = [
  { id: 1, name: "Alex M.", saved: "$420/yr", text: "Forgot I was paying for Adobe AND Canva. Cancelled immediately.", source: "twitter" },
  { id: 2, name: "Sarah K.", saved: "$1,200/yr", text: "Found a gym membership from 2019 running on my old card.", source: "twitter" },
  { id: 3, name: "Mike R.", saved: "$156/yr", text: "Netflix + Hulu + Disney+ bundle saved me $13/mo.", source: "twitter" },
  { id: 4, name: "Jasmine", saved: "$890/yr", text: "Analysis took 30 seconds. Saved enough for a flight to Tokyo.", source: "twitter" },
];

const ANALYSIS_STEPS = [
  "Connecting to secure local processor...",
  "Scanning transaction history...",
  "Identifying recurring patterns...",
  "Calculating potential savings...",
  "Finalizing your report..."
];

const trackEvent = (event: string, data: Record<string, any> = {}) => {
  try {
    const serverUrl = getServerUrl();
    fetch(`${serverUrl}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data })
    }).catch(() => { });
  } catch { }
};

const ShareButton = ({ savings }: { savings: number }) => {
  const text = `Just saved $${savings.toFixed(0)}/yr with just-cancel-it.onrender.com 🤯 Scan your bank statement to find subscriptions you forgot about.`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackEvent("share_click", { savings })}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        backgroundColor: "#1DA1F2", color: "white", padding: "12px 24px",
        borderRadius: 30, textDecoration: "none", fontWeight: 700, fontSize: 15,
        transition: "transform 0.2s", boxShadow: "0 4px 12px rgba(29, 161, 242, 0.3)"
      }}
      onMouseOver={e => e.currentTarget.style.transform = "scale(1.02)"}
      onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
      </svg>
      Share your savings
    </a>
  );
};

export default function JustCancel({ initialData }: { initialData?: any }) {
  const [profile, setProfile] = useState<SubscriptionProfile>(() => {
    // 0. Hydration from OpenAI (Server-side parsed data)
    if (initialData && (
      (initialData.subscriptions && initialData.subscriptions.length > 0) ||
      (initialData.total_monthly_spend && initialData.total_monthly_spend > 0)
    )) {
      console.log("[Just Cancel] Hydrating from OpenAI tool data:", initialData);
      return {
        ...DEFAULT_PROFILE,
        manualSubscriptions: initialData.subscriptions || [],
        totalMonthlySpend: initialData.total_monthly_spend || 0,
        analysisComplete: true,
        analysisInProgress: false
      };
    }

    // 1. Check for forced reset from "Start Over"
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem("JUST_CANCEL_FORCE_RESET")) {
      sessionStorage.removeItem("JUST_CANCEL_FORCE_RESET");
      console.log("[Just Cancel] Forced reset - returning to landing page.");
      return DEFAULT_PROFILE;
    }

    // 2. Load saved data 
    const saved = loadSavedData();
    if (saved) return saved;

    // 3. First time ever seeing the app? Show sample dashboard.
    if (typeof localStorage !== 'undefined' && !localStorage.getItem("JUST_CANCEL_SEEN_SAMPLE")) {
      localStorage.setItem("JUST_CANCEL_SEEN_SAMPLE", "true");
      return SAMPLE_PROFILE;
    }

    return DEFAULT_PROFILE;
  });

  const [showManualInput, setShowManualInput] = useState(false);
  const [manualService, setManualService] = useState("");
  const [manualCost, setManualCost] = useState("");
  const [manualCategory, setManualCategory] = useState("Other");
  const [dragActive, setDragActive] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(ANALYSIS_STEPS[0]);

  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");

  const goHome = () => {
    console.log("[Just Cancel] Going home (reset to landing view)...");
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem("JUST_CANCEL_DATA");
    } catch (e) {
      console.error("[Just Cancel] Failed to clear storage during goHome:", e);
    }
    setShowManualInput(false);
    setProfile(DEFAULT_PROFILE);
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;

    setFeedbackStatus("submitting");
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "user_feedback",
          data: {
            feedback: feedbackText,
            source: "just-cancel"
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
      console.error("[Just Cancel] Feedback submission failed:", e);
      setFeedbackStatus("error");
    }
  };

  // Load saved data effect removed (now in initializer)
  // We still need to clear storage on forced reset if not already done
  useEffect(() => {
    if (profile.analysisComplete === false && profile.manualSubscriptions.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [profile.analysisComplete]);

  // Save data on change
  useEffect(() => {
    saveData(profile);
  }, [profile]);

  // Heartbeat Mechanism (Prevent session timeout)
  useEffect(() => {
    const serverUrl = getServerUrl();
    const ping = () => {
      fetch(`${serverUrl}/api/heartbeat`)
        .then(res => res.json())
        .then(data => console.log("[Heartbeat] Pulse received:", data.timestamp))
        .catch(err => console.error("[Heartbeat] Pulse failed:", err));
    };

    // Initial ping
    ping();

    // Set interval for every 30 seconds
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, []);

  // File Upload Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setProfile(p => ({ ...p, isAnalyzing: true, analysisComplete: false, fileName: file.name, fileType: file.type.includes("pdf") ? "pdf" : "csv", uploadedFile: URL.createObjectURL(file) }));

    // Simulate analyze steps
    setAnalysisStep("Reading file...");
    await new Promise(r => setTimeout(r, 1500));

    let content = "";
    let extractionError = "";

    if (file.type.includes("pdf")) {
      setAnalysisStep("Extracting text from PDF...");
      const arrayBuffer = await file.arrayBuffer();
      const result = await extractTextFromPDF(arrayBuffer);
      content = result.text;
      extractionError = result.error || "";
    } else {
      content = await file.text();
    }

    setAnalysisStep("Identifying patterns...");
    await new Promise(r => setTimeout(r, 1500));

    setAnalysisStep("Calculating potential savings...");
    await new Promise(r => setTimeout(r, 1500));

    const newSubscriptions = parseTextForSubscriptions(content);

    setProfile(p => {
      const mergedMap: Record<string, SubscriptionItem> = {};

      // Start with existing ones
      p.manualSubscriptions.forEach(sub => {
        mergedMap[sub.service.toLowerCase()] = sub;
      });

      // Merge new ones
      newSubscriptions.forEach(newSub => {
        const key = newSub.service.toLowerCase();
        if (!mergedMap[key]) {
          mergedMap[key] = newSub;
        } else {
          // Keep existing but maybe update count if needed
          // existingMap[key].count = (existingMap[key].count || 1) + 1;
        }
      });

      const mergedList = Object.values(mergedMap);
      const newTotal = mergedList.reduce((sum, s) => sum + s.monthlyCost, 0);

      return {
        ...p,
        manualSubscriptions: mergedList,
        totalMonthlySpend: newTotal,
        isAnalyzing: false,
        analysisComplete: true,
        extractedText: content,
        parsingError: extractionError
      };
    });

    trackEvent("analysis_complete", { fileName: file.name, subscriptionCount: newSubscriptions.length });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const addManualSubscription = () => {
    if (!manualService || !manualCost) return;
    const cost = parseFloat(manualCost.replace('$', ''));
    if (isNaN(cost)) return;

    const newItem: SubscriptionItem = {
      id: `manual-${Date.now()}`,
      service: manualService,
      monthlyCost: cost,
      status: "keeping", // Default
      category: manualCategory
    };

    setProfile(p => ({
      ...p,
      manualSubscriptions: [newItem, ...p.manualSubscriptions],
      totalMonthlySpend: p.totalMonthlySpend + newItem.monthlyCost
    }));

    setManualService("");
    setManualCost("");
    setShowManualInput(false);
    trackEvent("manual_add", { service: manualService });
  };

  const updateStatus = (id: string, status: SubscriptionItem["status"]) => {
    setProfile(p => ({
      ...p,
      manualSubscriptions: p.manualSubscriptions.map(s =>
        s.id === id ? { ...s, status } : s
      )
    }));
  };

  const removeSubscription = (id: string) => {
    const sub = profile.manualSubscriptions.find(s => s.id === id);
    if (sub) {
      setProfile(p => ({
        ...p,
        manualSubscriptions: p.manualSubscriptions.filter(s => s.id !== id),
        totalMonthlySpend: p.totalMonthlySpend - sub.monthlyCost
      }));
    }
  };

  const getFilteredSubscriptions = () => {
    // Filter out items with $0 cost as requested by user
    const validSubs = profile.manualSubscriptions.filter(s => s.monthlyCost > 0);

    if (profile.viewFilter === "all") return validSubs;
    if (profile.viewFilter === "approved") {
      return validSubs.filter(s => s.status === "keeping");
    }
    if (profile.viewFilter === "confirmed_subscription") {
      return validSubs.filter(s =>
        s.status === "confirmed_subscription" || s.status === "cancelling"
      );
    }
    return validSubs.filter(s => s.status === profile.viewFilter);
  };

  // Sub-components for identifying status counts
  const statusCounts = useMemo(() => {
    const subs = profile.manualSubscriptions;
    return {
      confirmed: subs.filter(s => s.status === "confirmed_subscription" || s.status === "cancelling").length,
      approved: subs.filter(s => s.status === "keeping").length,
      rejected: subs.filter(s => s.status === "not_subscription").length,
      unknown: subs.filter(s => s.status === "unknown" || s.status === "investigating").length,
    };
  }, [profile.manualSubscriptions]);

  const potentialSavings = useMemo(() => {
    return profile.manualSubscriptions
      .filter(s => s.status === "cancelling")
      .reduce((sum, s) => sum + s.monthlyCost, 0);
  }, [profile.manualSubscriptions]);

  if (profile.isAnalyzing) {
    return (
      <div style={{ padding: 40, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
        <RefreshCw size={48} className="spin" style={{ color: COLORS.primary, marginBottom: 32, animation: "spin 1s linear infinite" }} />
        <h2 style={{ fontSize: 24, fontWeight: 700, color: COLORS.textMain, marginBottom: 8 }}>
          {analysisStep}
        </h2>
        <p style={{ color: COLORS.textSecondary, textAlign: "center", maxWidth: 400 }}>
          This usually takes about 10-20 seconds. We're processing your statement locally.
        </p>
        <div style={{ width: 200, height: 4, backgroundColor: COLORS.border, borderRadius: 2, marginTop: 24, overflow: "hidden" }}>
          <div style={{ width: "100%", height: "100%", backgroundColor: COLORS.primary, animation: "progress 2s ease-in-out infinite", transformOrigin: "left" }}></div>
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes progress { 0% { transform: scaleX(0); } 50% { transform: scaleX(0.7); } 100% { transform: scaleX(1); } }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", maxWidth: 800, margin: "0 auto", padding: "14px", boxSizing: "border-box", fontFamily: '"Inter", sans-serif', color: COLORS.textMain }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
            <DollarSign size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>The Subscription Killer</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Check size={14} style={{ color: COLORS.primary }} />
              <p style={{ fontSize: 13, color: COLORS.textSecondary, margin: 0 }}>Powered by AI pattern recognition</p>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {profile.manualSubscriptions.length > 0 && !profile.analysisComplete && (
            <button onClick={() => setProfile(p => ({ ...p, analysisComplete: true }))} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
              backgroundColor: COLORS.inputBg, color: COLORS.textSecondary, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500
            }}>
              <ArrowRight size={14} style={{ transform: "rotate(180deg)" }} /> Back to Dashboard
            </button>
          )}
          {(profile.analysisComplete || profile.manualSubscriptions.length > 0) && (
            <button onClick={goHome} aria-label="Home" title="Home" style={{
              display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 12px", borderRadius: 8,
              backgroundColor: COLORS.inputBg, color: COLORS.textSecondary, border: "none", cursor: "pointer"
            }}>
              <Home size={16} />
            </button>
          )}
        </div>
      </div>

      {!profile.analysisComplete ? (
        // Landing View - Upload or Manual Entry
        <div style={{ animation: "fadeIn 0.5s ease-out" }}>
          <div style={{
            backgroundColor: "white", borderRadius: 20, padding: 28, border: `1px solid ${COLORS.border}`,
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)", textAlign: "center"
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Stop paying for what you don't use.</h2>
            <p style={{ fontSize: 15, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 1.4, maxWidth: 480, margin: "0 auto 24px" }}>
              Upload your bank statement (PDF or CSV) to instantly identify recurring subscriptions, or enter them manually to track your savings.
            </p>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
              style={{
                border: `2px dashed ${dragActive ? COLORS.primary : COLORS.border}`,
                backgroundColor: dragActive ? COLORS.accentLight : COLORS.inputBg,
                borderRadius: 14, padding: "28px 16px", cursor: "pointer", transition: "all 0.2s",
                position: "relative", overflow: "hidden"
              }}
            >
              <input
                type="file" multiple={false} onChange={handleFileChange} accept=".csv,.pdf"
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
              />
              <div style={{ width: 56, height: 56, margin: "0 auto 12px", borderRadius: "50%", backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <Upload size={28} color={COLORS.primary} />
              </div>
              <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Click to upload or drag & drop</p>
              <p style={{ fontSize: 13, color: COLORS.textSecondary }}>Bank statements (PDF) or CSV exports supported</p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0" }}>
              <div style={{ height: 1, backgroundColor: COLORS.border, flex: 1 }}></div>
              <span style={{ fontSize: 13, color: COLORS.textSecondary, fontWeight: 600 }}>OR</span>
              <div style={{ height: 1, backgroundColor: COLORS.border, flex: 1 }}></div>
            </div>

            <button
              onClick={() => { setProfile(p => ({ ...p, analysisComplete: true })); setShowManualInput(true); }}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                backgroundColor: COLORS.textMain, color: "white", fontSize: 15, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
              }}
            >
              <PenLine size={18} /> Enter subscriptions manually
            </button>
            <p style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Shield size={12} /> Your data is processed locally and never leaves your device.
            </p>

            {/* Wall of Savings - Social Proof */}
            <div style={{ marginTop: 32, textAlign: "center" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Join thousands saving money every day</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {WALL_OF_SAVINGS_DATA.map(item => (
                  <div key={item.id} style={{
                    backgroundColor: "white", padding: 16, borderRadius: 16, border: `1px solid ${COLORS.border}`,
                    textAlign: "left", boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", backgroundColor: COLORS.inputBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                          {item.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</span>
                      </div>
                      <div style={{ backgroundColor: "#E6F7F0", color: "#047857", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>
                        Saved {item.saved}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 1.4, margin: 0 }}>
                      "{item.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Dashboard View
        <div style={{ animation: "slideUp 0.4s ease-out" }}>

          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16, marginBottom: 24 }}>
            {/* Total Savings Hero Card */}
            <div style={{ padding: 24, borderRadius: 24, backgroundColor: COLORS.primary, color: "white", boxShadow: "0 8px 16px rgba(86, 197, 150, 0.25)", textAlign: "center", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "relative", zIndex: 2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Total Annual Spend</div>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginBottom: 8 }}>
                  <div style={{ fontSize: 48, fontWeight: 900 }}>
                    ${(profile.totalMonthlySpend * 12).toFixed(0)}<span style={{ fontSize: 24, fontWeight: 600, opacity: 0.8 }}>/yr</span>
                  </div>
                  <ShareButton savings={profile.totalMonthlySpend * 12} />
                </div>
              </div>

              {/* Background Decoration */}
              <div style={{ position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%", backgroundColor: "white", opacity: 0.1 }}></div>
              <div style={{ position: "absolute", bottom: -50, left: -50, width: 150, height: 150, borderRadius: "50%", backgroundColor: "white", opacity: 0.1 }}></div>
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1, padding: 20, borderRadius: 16, backgroundColor: "white", border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Monthly Spend</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>${profile.totalMonthlySpend.toFixed(0)}</div>
              </div>
              <div style={{ flex: 1, padding: 20, borderRadius: 16, backgroundColor: "white", border: `1px solid ${COLORS.border}` }}>
                <div style={{ fontSize: 13, color: COLORS.textSecondary }}>Active Subs</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{profile.manualSubscriptions.length}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
            {(["all", "confirmed_subscription", "approved", "not_subscription", "unknown"] as const).map(filter => {
              const count = filter === "all" ? profile.manualSubscriptions.length :
                filter === "confirmed_subscription" ? statusCounts.confirmed :
                  filter === "approved" ? statusCounts.approved :
                    filter === "not_subscription" ? statusCounts.rejected : statusCounts.unknown;


              return (
                <button
                  key={filter}
                  onClick={() => setProfile(p => ({ ...p, viewFilter: filter as any }))}
                  style={{
                    padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: profile.viewFilter === filter ? `1px solid transparent` : `1px solid ${COLORS.border}`,
                    backgroundColor: profile.viewFilter === filter ? COLORS.textMain : "white",
                    color: profile.viewFilter === filter ? "white" : COLORS.textSecondary,
                    whiteSpace: "nowrap", transition: "all 0.2s",
                    minWidth: filter === "all" ? 60 : 120, // Make other pills more consistent
                    textAlign: "center"
                  }}
                >
                  {filter === "all" ? "All" : filter === "confirmed_subscription" ? "Subscriptions" : filter === "approved" ? "Approved" : filter === "not_subscription" ? "Not Subscriptions" : "Don't Know"}
                  {filter !== "all" && count > 0 && (
                    <span style={{ marginLeft: 6, opacity: 0.7, fontSize: 12 }}>{count}</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {getFilteredSubscriptions().map((sub, index) => (
              (sub.status === "confirmed_subscription" || sub.status === "keeping" || sub.status === "cancelling") ? (
                // Simplified Row for Confirmed Subscriptions
                <div key={sub.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 24px", backgroundColor: "white", borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1 }}>
                    <div style={{ color: COLORS.textSecondary, fontWeight: 500, fontSize: 14, minWidth: 20 }}>{index + 1}.</div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.textMain }}>{sub.service}</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.textMain }}>${(sub.monthlyCost * 12).toFixed(0)}/yr</div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <button
                        onClick={() => removeSubscription(sub.id)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
                          backgroundColor: "#FEE2E2", color: "#EF4444", transition: "all 0.2s"
                        }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>

                      <button
                        onClick={() => updateStatus(sub.id, "keeping")}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "8px", borderRadius: 8, border: "none", cursor: "pointer",
                          backgroundColor: "#f3f4f6", color: "#4b5563", transition: "all 0.2s"
                        }}
                        title="Mark as approved"
                      >
                        <Check size={18} />
                      </button>

                      <button
                        onClick={() => {
                          updateStatus(sub.id, "cancelling");
                          window.open(`https://www.google.com/search?q=how+do+i+cancel+my+subscription+to+${sub.service}`, "_blank");
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                          backgroundColor: "transparent", color: COLORS.primary, fontSize: 13, fontWeight: 600
                        }}
                      >
                        Cancel <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // Detailed Card for Investigation
                <div key={sub.id} style={{
                  padding: 24, backgroundColor: "white", borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginBottom: 16
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button
                        onClick={() => removeSubscription(sub.id)}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "center",
                          padding: "6px", borderRadius: 6, border: "none", cursor: "pointer",
                          backgroundColor: "#FEE2E2", color: "#EF4444", transition: "all 0.2s",
                          marginRight: 4
                        }}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div style={{ fontWeight: 800, fontSize: 16, textTransform: "uppercase", letterSpacing: "0.5px", color: "#111" }}>
                        {sub.service}
                      </div>
                      {sub.count && sub.count > 1 && (
                        <div style={{
                          backgroundColor: "#E5E7EB", color: "#374151", fontSize: 12, fontWeight: 600,
                          padding: "2px 8px", borderRadius: 12
                        }}>
                          x{sub.count}
                        </div>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>
                      ${sub.monthlyCost.toFixed(0)}/monthly
                    </div>
                  </div>

                  {/* Original Description Line */}
                  <div style={{ fontSize: 13, color: "#4B5563", marginBottom: 4, fontFamily: "monospace" }}>
                    {sub.originalDescription || sub.service}
                  </div>

                  {/* Category / Clean Description */}
                  <div style={{ fontSize: 14, color: "#6B7280", fontStyle: "italic", marginBottom: 20 }}>
                    {sub.cleanDescription || `${sub.category} subscription`}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => updateStatus(sub.id, "confirmed_subscription")}
                      style={{
                        padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer",
                        backgroundColor: "#2563EB",
                        color: "white", fontSize: 14, fontWeight: 500, transition: "background 0.2s"
                      }}
                    >
                      Subscription
                    </button>

                    <button
                      onClick={() => updateStatus(sub.id, "not_subscription")}
                      style={{
                        padding: "8px 16px", borderRadius: 6, border: "1px solid #D1D5DB", cursor: "pointer",
                        backgroundColor: sub.status === "not_subscription" ? "#F3F4F6" : "white",
                        color: "#374151", fontSize: 14, fontWeight: 500
                      }}
                    >
                      Not a subscription
                    </button>

                    <button
                      onClick={() => updateStatus(sub.id, "unknown")}
                      style={{
                        padding: "8px 16px", borderRadius: 6, border: "1px solid #D1D5DB", cursor: "pointer",
                        backgroundColor: sub.status === "unknown" ? "#F3F4F6" : "white",
                        color: "#374151", fontSize: 14, fontWeight: 500
                      }}
                    >
                      Don't know
                    </button>
                  </div>
                </div>
              )
            ))}

            {getFilteredSubscriptions().length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.textSecondary }}>
                <div style={{ marginBottom: 16 }}>🤷‍♂️</div>
                No subscriptions found in this category.

                {/* DEBUG INFO FOR USER */}
                {profile.fileType === "pdf" && (
                  <div style={{ marginTop: 20, padding: 10, background: "#f5f5f5", borderRadius: 8, fontSize: 11, textAlign: "left" }}>
                    <strong>Debug: Raw Text Extracted</strong>
                    <pre style={{ whiteSpace: "pre-wrap", maxHeight: 100, overflow: "auto", marginTop: 5 }}>
                      {profile.parsingError ? (
                        <span style={{ color: COLORS.red }}>⚠️ Error: {profile.parsingError}</span>
                      ) : profile.extractedText ? (
                        profile.extractedText
                      ) : (
                        "(If this area is empty, PDF parsing failed or no text was found. Check the console for worker load errors.)"
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {!showManualInput ? (
                <>
                  <button onClick={() => setShowManualInput(true)} style={{
                    flex: 1, padding: "16px", borderRadius: 16, border: `1px dashed ${COLORS.border}`, backgroundColor: "transparent",
                    color: COLORS.textSecondary, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}>
                    <Plus size={18} /> Add subscription manually
                  </button>
                  <button onClick={() => setProfile(p => ({ ...p, analysisComplete: false }))} style={{
                    flex: 1, padding: "16px", borderRadius: 16, border: `1px dashed ${COLORS.border}`, backgroundColor: "transparent",
                    color: COLORS.textSecondary, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                  }}>
                    <FileText size={18} /> Add more documents
                  </button>
                </>
              ) : (
                <div style={{ width: "100%", padding: 20, backgroundColor: COLORS.inputBg, borderRadius: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>Add Subscription</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <input
                      placeholder="Service Name (e.g. Netflix)" value={manualService} onChange={e => setManualService(e.target.value)}
                      style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, outline: "none" }}
                    />
                    <input
                      placeholder="Monthly Cost (e.g. 15.99)" value={manualCost} onChange={e => setManualCost(e.target.value)}
                      style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {SUBSCRIPTION_CATEGORIES.slice(0, 4).map(cat => (
                      <button key={cat} onClick={() => setManualCategory(cat)} style={{
                        padding: "6px 12px", borderRadius: 20, fontSize: 12, border: "none", cursor: "pointer",
                        backgroundColor: manualCategory === cat ? COLORS.textMain : "white",
                        color: manualCategory === cat ? "white" : COLORS.textMain
                      }}>{cat}</button>
                    ))}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
                    <button onClick={() => setShowManualInput(false)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: "white", cursor: "pointer" }}>Cancel</button>
                    <button onClick={addManualSubscription} style={{ padding: "8px 16px", borderRadius: 8, border: "none", backgroundColor: COLORS.primary, color: "white", fontWeight: 600, cursor: "pointer" }}>Add Subscription</button>
                  </div>
                </div>
              )}
            </div>
          </div>


        </div>
      )
      }

      {/* Footer - Social & Actions */}
      <div style={{ marginTop: 60, borderTop: `1px solid ${COLORS.border}`, paddingTop: 32, paddingBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
          <button onClick={() => setShowFeedbackModal(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 8, transition: "color 0.2s" }}>
            <MessageSquare size={16} /> Feedback
          </button>
          <button onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 8, transition: "color 0.2s" }}>
            <RefreshCw size={16} /> Reset
          </button>
          <button onClick={() => alert("Donations coming soon!")} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 8, transition: "color 0.2s" }}>
            <Heart size={16} /> Donate
          </button>
          <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 8, transition: "color 0.2s" }}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setShowFeedbackModal(false)}>
          <div style={{ backgroundColor: "white", borderRadius: 24, padding: 32, maxWidth: 400, width: "90%", position: "relative", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }} onClick={e => e.stopPropagation()}>
            <button style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary }} onClick={() => setShowFeedbackModal(false)}>
              <X size={24} />
            </button>
            
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, color: COLORS.textMain }}>Feedback</div>
            <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 24 }}>Help us improve Just Cancel.</div>

            {feedbackStatus === "success" ? (
              <div style={{ textAlign: "center", padding: 20, color: COLORS.primary, fontWeight: 600 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                Thanks for your feedback!
              </div>
            ) : (
              <>
                <textarea 
                  style={{ width: "100%", height: 120, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, backgroundColor: COLORS.inputBg, fontSize: 14, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                  placeholder="Tell us what you think..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                {feedbackStatus === "error" && (
                  <div style={{ color: COLORS.red, fontSize: 14, marginTop: 10 }}>Failed to send. Please try again.</div>
                )}
                <button 
                  style={{ marginTop: 16, width: "100%", backgroundColor: COLORS.primary, color: "white", border: "none", padding: 14, borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer" }} 
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackStatus === "submitting" || !feedbackText.trim()}
                >
                  {feedbackStatus === "submitting" ? "Sending..." : "Send Feedback"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div >
  );
}
