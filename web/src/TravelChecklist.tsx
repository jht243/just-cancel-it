import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  RotateCcw, ChevronDown, ChevronUp, X, Mail, MessageSquare, Heart, Printer, Check, Info,
  Plane, MapPin, Calendar, Users, Sun, Cloud, Snowflake, Umbrella, Baby, Dog, Cat, Plus,
  CheckCircle2, Circle, Luggage, Shirt, Droplets, Shield, Smartphone, Activity, Home, FileText,
  Mountain, Waves, Tent, Package, Star, PenLine
} from "lucide-react";

const COLORS = {
  primary: "#56C596", primaryDark: "#3aa87b", bg: "#FAFAFA", card: "#FFFFFF",
  textMain: "#1A1A1A", textSecondary: "#9CA3AF", border: "#F3F4F6",
  inputBg: "#F9FAFB", accentLight: "#E6F7F0", blue: "#5D9CEC", yellow: "#F59E0B",
  red: "#FF6B6B", orange: "#F2994A", orangeLight: "#FFF7ED", purple: "#8B5CF6",
  gold: "#F59E0B", teal: "#14B8A6"
};

// Geocoding search using OpenStreetMap Nominatim (free, worldwide coverage)
const searchDestinations = async (query: string): Promise<string[]> => {
  if (!query || query.length < 2) return [];
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&addressdetails=1&featuretype=city`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    return data.map((item: any) => {
      const city = item.address?.city || item.address?.town || item.address?.village || item.name;
      const state = item.address?.state;
      const country = item.address?.country;
      if (country === "United States" && state) {
        return `${city}, ${state}, USA`;
      }
      return country ? `${city}, ${country}` : city;
    }).filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i); // dedupe
  } catch (e) {
    console.error("Geocoding error:", e);
    return [];
  }
};

// Weather data interface
interface WeatherForecast {
  avgTemp: number;       // Average temperature in Celsius
  minTemp: number;       // Minimum temperature
  maxTemp: number;       // Maximum temperature
  precipitation: number; // Precipitation probability %
  conditions: string;    // Description
  suggestion: string;    // What to pack
}

// Geocode a city to get coordinates
const geocodeCity = async (cityName: string): Promise<{ lat: number; lon: number } | null> => {
  if (!cityName || cityName.length < 2) return null;
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
    return null;
  } catch (e) {
    console.error("Geocoding error:", e);
    return null;
  }
};

// Fetch weather forecast from Open-Meteo (free, no API key needed)
const fetchWeatherForecast = async (
  lat: number, 
  lon: number, 
  startDate: string, 
  endDate: string
): Promise<WeatherForecast | null> => {
  try {
    // Open-Meteo provides up to 16 days forecast
    const today = new Date();
    const start = new Date(startDate);
    
    // If trip is within forecast range (16 days), use forecast API
    const daysUntilTrip = Math.floor((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let url: string;
    let useClimateApi = false;
    
    if (daysUntilTrip <= 14 && daysUntilTrip >= 0) {
      // Use forecast API for near-term trips
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${startDate}&end_date=${endDate}`;
    } else {
      // For future dates, use the forecast API with current + 14 days to get seasonal estimate
      // This is more reliable than the climate API which can be unreliable
      const forecastStart = new Date();
      const forecastEnd = new Date();
      forecastEnd.setDate(forecastEnd.getDate() + 14);
      url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${forecastStart.toISOString().split('T')[0]}&end_date=${forecastEnd.toISOString().split('T')[0]}`;
      useClimateApi = true; // Flag that we're using seasonal estimate
    }
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.daily) {
      const temps = data.daily.temperature_2m_max || data.daily.temperature_2m_mean || [];
      const minTemps = data.daily.temperature_2m_min || [];
      const precip = data.daily.precipitation_probability_max || data.daily.precipitation_sum || [];
      
      const avgTemp = temps.length > 0 ? temps.reduce((a: number, b: number) => a + b, 0) / temps.length : 20;
      const minTemp = minTemps.length > 0 ? Math.min(...minTemps) : avgTemp - 5;
      const maxTemp = temps.length > 0 ? Math.max(...temps) : avgTemp + 5;
      const avgPrecip = precip.length > 0 ? precip.reduce((a: number, b: number) => a + b, 0) / precip.length : 30;
      
      // Determine conditions and suggestions based on actual weather
      let conditions = "";
      let suggestion = "";
      
      if (avgTemp >= 28) {
        conditions = "Hot & Tropical";
        suggestion = "Pack light, breathable clothing. Bring sunscreen, sunglasses, and stay hydrated!";
      } else if (avgTemp >= 22) {
        conditions = "Warm & Pleasant";
        suggestion = "Light summer clothes, but bring a light layer for evenings.";
      } else if (avgTemp >= 15) {
        conditions = "Mild";
        suggestion = "Pack layers - it can vary throughout the day. Light jacket recommended.";
      } else if (avgTemp >= 8) {
        conditions = "Cool";
        suggestion = "Bring warm layers, a jacket, and possibly a light sweater.";
      } else if (avgTemp >= 0) {
        conditions = "Cold";
        suggestion = "Pack warm clothing: coat, sweaters, warm layers, gloves, and a scarf.";
      } else {
        conditions = "Very Cold / Freezing";
        suggestion = "Heavy winter gear essential: thermal underwear, heavy coat, warm boots, hat, gloves.";
      }
      
      if (avgPrecip > 50) {
        conditions += " & Rainy";
        suggestion += " Rain gear and waterproof shoes highly recommended!";
      } else if (avgPrecip > 30) {
        conditions += " (possible rain)";
        suggestion += " Consider packing an umbrella.";
      }
      
      return {
        avgTemp: Math.round(avgTemp),
        minTemp: Math.round(minTemp),
        maxTemp: Math.round(maxTemp),
        precipitation: Math.round(avgPrecip),
        conditions,
        suggestion
      };
    }
    return null;
  } catch (e) {
    console.error("Weather API error:", e);
    return null;
  }
};

// Convert weather to Season type for backward compatibility
const weatherToSeason = (weather: WeatherForecast | null): Season => {
  if (!weather) return "variable";
  if (weather.avgTemp >= 28) return "tropical";
  if (weather.avgTemp >= 22) return "summer";
  if (weather.avgTemp >= 15) return "spring";
  if (weather.avgTemp < 10) return "winter";
  return "variable";
};

type Season = "summer" | "winter" | "spring" | "tropical" | "variable";
type TripPurpose = "leisure" | "business" | "adventure" | "beach" | "city";
type TravelerType = "adult" | "child" | "infant" | "senior" | "pet";
type PackingConstraint = "carry_on_only" | "checked_bags" | "minimal";

interface TravelerInfo {
  type: TravelerType;
  male: number;
  female: number;
}

interface TripProfile {
  destination: string;
  isInternational: boolean;
  climate: Season;
  tripDuration: number;
  startDate: string;
  endDate: string;
  travelers: TravelerInfo[];
  purpose: TripPurpose;
  packingConstraint: PackingConstraint;
  activities: string[];
  personalNotes: string;
  presets: string[];
}

interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  quantity?: string;
  essential: boolean;
  reason?: string;
  checked: boolean;
  gender?: "female" | "male"; // optional - for gender-specific items
}

interface SavedChecklist {
  id: string;
  name: string;
  savedAt: number;
  profile: TripProfile;
  checklist: ChecklistItem[];
  individualChecklists: Record<string, ChecklistItem[]>;
}

const SAVED_CHECKLISTS_KEY = "TRAVEL_SAVED_CHECKLISTS";

const DEFAULT_PROFILE: TripProfile = {
  destination: "", isInternational: false, climate: "summer", tripDuration: 5,
  startDate: "", endDate: "",
  travelers: [
    { type: "adult", male: 1, female: 0 },
    { type: "child", male: 0, female: 0 },
    { type: "infant", male: 0, female: 0 },
    { type: "pet", male: 0, female: 0 }
  ],
  purpose: "leisure", packingConstraint: "checked_bags", activities: [],
  personalNotes: "", presets: []
};

const STORAGE_KEY = "TRAVEL_CHECKLIST_DATA";
const BANNER_STORAGE_KEY = "TRAVEL_CHECKLIST_BANNER_DISMISSED";

// Scale quantity based on trip duration
// baseQty is designed for a 7-day trip, scale proportionally
const scaleQuantityForDuration = (baseQty: string | undefined, tripDuration: number): string | undefined => {
  if (!baseQty) return undefined;
  
  // Extract number from quantity string (e.g., "6", "6 pairs", "3")
  const match = baseQty.match(/^(\d+)/);
  if (!match) return baseQty;
  
  const baseNum = parseInt(match[1], 10);
  const suffix = baseQty.slice(match[1].length); // e.g., " pairs", ""
  
  // Scale proportionally: base is for 7 days
  // For a gym rat working out daily, they need ~tripDuration workout sets
  // But cap at reasonable maximums and minimum of 2
  const scaleFactor = tripDuration / 7;
  let scaled = Math.round(baseNum * scaleFactor);
  
  // Ensure minimum of 2 and maximum of 10 for most items
  scaled = Math.max(2, Math.min(scaled, 10));
  
  return `${scaled}${suffix}`;
};

// Traveler presets with their associated items
// gender: "female" = female only, "male" = male only, undefined = everyone
const TRAVELER_PRESETS: Record<string, { label: string; icon: string; items: { name: string; category: string; quantity?: string; gender?: "female" | "male" }[] }> = {
  lightSleeper: {
    label: "Light Sleeper",
    icon: "😴",
    items: [
      { name: "Eye mask", category: "personal" },
      { name: "Earplugs", category: "personal" },
      { name: "White noise app", category: "tech" },
      { name: "Melatonin", category: "health" },
      { name: "Lavender spray", category: "personal" },
    ]
  },
  gymRat: {
    label: "Gym Rat",
    icon: "💪",
    items: [
      { name: "Workout shirts", category: "workout", quantity: "6" },
      { name: "Workout shorts", category: "workout", quantity: "4" },
      { name: "Training shoes", category: "workout" },
      { name: "Workout socks", category: "workout", quantity: "6" },
      { name: "Sports bra", category: "workout", quantity: "5", gender: "female" },
      { name: "Compression shorts", category: "workout", quantity: "3" },
      { name: "Resistance bands", category: "activity" },
      { name: "Gym gloves", category: "activity" },
      { name: "Protein bars", category: "personal" },
      { name: "Shaker bottle", category: "personal" },
      { name: "Pre-workout", category: "personal" },
      { name: "Quick-dry towel", category: "workout" },
    ]
  },
  yoga: {
    label: "Yoga",
    icon: "🧘",
    items: [
      { name: "Yoga leggings", category: "workout", quantity: "2", gender: "female" },
      { name: "Sports bra", category: "workout", quantity: "2", gender: "female" },
      { name: "Yoga top", category: "workout", quantity: "2" },
      { name: "Travel yoga mat", category: "activity" },
      { name: "Yoga blocks", category: "activity" },
      { name: "Resistance bands", category: "activity" },
    ]
  },
  swimmer: {
    label: "Swimmer",
    icon: "🏊",
    items: [
      { name: "Swimsuit", category: "workout", quantity: "2" },
      { name: "Swim goggles", category: "activity" },
      { name: "Swim cap", category: "activity" },
      { name: "Waterproof bag", category: "personal" },
      { name: "Quick-dry towel", category: "toiletries" },
    ]
  },
  remoteWorker: {
    label: "Remote Worker",
    icon: "💻",
    items: [
      { name: "Laptop", category: "tech" },
      { name: "Laptop charger", category: "tech" },
      { name: "Portable monitor", category: "tech" },
      { name: "Wireless mouse", category: "tech" },
      { name: "Keyboard", category: "tech" },
      { name: "Mobile hotspot", category: "tech" },
      { name: "Webcam", category: "tech" },
      { name: "USB hub", category: "tech" },
    ]
  },
  contentCreator: {
    label: "Content Creator",
    icon: "📸",
    items: [
      { name: "Camera", category: "tech" },
      { name: "Camera charger", category: "tech" },
      { name: "Tripod", category: "tech" },
      { name: "Ring light", category: "tech" },
      { name: "Microphone", category: "tech" },
      { name: "SD cards", category: "tech", quantity: "3+" },
      { name: "Portable power bank", category: "tech" },
      { name: "Gimbal/stabilizer", category: "tech" },
    ]
  },
  gamer: {
    label: "Gamer",
    icon: "🎮",
    items: [
      { name: "Nintendo Switch", category: "tech" },
      { name: "Switch charger", category: "tech" },
      { name: "Game cartridges", category: "tech" },
      { name: "Switch case", category: "tech" },
      { name: "Extra controllers", category: "tech" },
      { name: "Portable stand", category: "tech" },
    ]
  },
  photographer: {
    label: "Photographer",
    icon: "📷",
    items: [
      { name: "Camera body", category: "tech" },
      { name: "Camera lenses", category: "tech", quantity: "2-3" },
      { name: "Lens filters", category: "tech" },
      { name: "Lens cleaning kit", category: "tech" },
      { name: "Tripod", category: "tech" },
      { name: "SD cards", category: "tech", quantity: "5+" },
      { name: "Extra batteries", category: "tech", quantity: "3+" },
      { name: "Camera bag", category: "tech" },
      { name: "External hard drive", category: "tech" },
    ]
  },
};

const loadSavedData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { data, timestamp } = JSON.parse(saved);
      if ((new Date().getTime() - timestamp) / (1000 * 60 * 60) < 720) {
        // Migrate old traveler format (count) to new format (male/female)
        if (data?.profile?.travelers) {
          data.profile.travelers = data.profile.travelers.map((t: any) => {
            if (typeof t.male === 'undefined' || typeof t.female === 'undefined') {
              // Old format - convert count to male
              return { type: t.type, male: t.count || 0, female: 0 };
            }
            return t;
          });
        }
        // Ensure personalNotes exists
        if (data?.profile && typeof data.profile.personalNotes === 'undefined') {
          data.profile.personalNotes = "";
        }
        // Ensure presets exists
        if (data?.profile && typeof data.profile.presets === 'undefined') {
          data.profile.presets = [];
        }
        return data;
      }
    }
  } catch (e) {
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

const saveData = (data: any) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, timestamp: new Date().getTime() })); } catch (e) {}
};

// Analytics tracking helper
const trackEvent = (event: string, data: Record<string, any> = {}) => {
  try {
    const serverUrl = window.location.hostname === "localhost" ? "" : "https://travel-checklist-q79n.onrender.com";
    fetch(`${serverUrl}/api/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data })
    }).catch(() => {}); // Silent fail
  } catch {}
};

// Parse personal notes - adds items to CORRECT categories + extras to "personal"
const parsePersonalNotes = (notes: string): ChecklistItem[] => {
  const items: ChecklistItem[] = [];
  const lower = notes.toLowerCase();
  
  // ============ TECH DEVICES ============
  // iPad / Tablet
  if (lower.includes("ipad") || lower.includes("tablet") || lower.includes("surface")) {
    items.push({ id: "note-ipad", name: "iPad / Tablet", category: "tech", essential: false, checked: false });
    items.push({ id: "note-ipad-charger", name: "iPad charger", category: "tech", essential: false, checked: false });
    items.push({ id: "note-ipad-case", name: "iPad case / stand", category: "tech", essential: false, checked: false });
    items.push({ id: "note-stylus", name: "Apple Pencil / stylus", category: "tech", essential: false, checked: false });
  }
  
  // Laptop / Computer
  if (lower.includes("laptop") || lower.includes("macbook") || lower.includes("computer") || lower.includes("work")) {
    items.push({ id: "note-laptop", name: "Laptop", category: "tech", essential: false, checked: false });
    items.push({ id: "note-laptop-charger", name: "Laptop charger", category: "tech", essential: false, checked: false });
    items.push({ id: "note-laptop-sleeve", name: "Laptop sleeve", category: "tech", essential: false, checked: false });
    items.push({ id: "note-mouse", name: "Wireless mouse", category: "tech", essential: false, checked: false });
  }
  
  // Kindle / E-reader
  if (lower.includes("kindle") || lower.includes("e-reader") || lower.includes("ereader") || lower.includes("nook")) {
    items.push({ id: "note-kindle", name: "Kindle / E-reader", category: "tech", essential: false, checked: false });
    items.push({ id: "note-kindle-charger", name: "Kindle charger", category: "tech", essential: false, checked: false });
  }
  
  // Gaming
  if (lower.includes("switch") || lower.includes("nintendo") || lower.includes("gaming") || lower.includes("playstation") || lower.includes("xbox") || lower.includes("steam deck") || lower.includes("game")) {
    items.push({ id: "note-switch", name: "Nintendo Switch / gaming device", category: "tech", essential: false, checked: false });
    items.push({ id: "note-switch-charger", name: "Gaming device charger", category: "tech", essential: false, checked: false });
    items.push({ id: "note-switch-case", name: "Gaming device case", category: "tech", essential: false, checked: false });
    items.push({ id: "note-game-controller", name: "Extra controllers", category: "tech", essential: false, checked: false });
  }
  
  // Phone accessories
  if (lower.includes("phone") || lower.includes("iphone") || lower.includes("android") || lower.includes("charger")) {
    items.push({ id: "note-phone-charger", name: "Phone charger", category: "tech", essential: false, checked: false });
    items.push({ id: "note-power-bank", name: "Power bank", category: "tech", essential: false, checked: false });
    items.push({ id: "note-phone-cable", name: "Extra charging cables", category: "tech", essential: false, checked: false });
  }
  
  // Watch
  if (lower.includes("watch") || lower.includes("apple watch") || lower.includes("smartwatch") || lower.includes("fitbit") || lower.includes("garmin")) {
    items.push({ id: "note-smartwatch", name: "Smartwatch", category: "tech", essential: false, checked: false });
    items.push({ id: "note-watch-charger", name: "Watch charger", category: "tech", essential: false, checked: false });
  }
  
  // Headphones / Audio
  if (lower.includes("airpods") || lower.includes("earbuds") || lower.includes("headphone") || lower.includes("beats") || lower.includes("bose") || lower.includes("sony")) {
    items.push({ id: "note-headphones", name: "Headphones / AirPods", category: "tech", essential: false, checked: false });
    items.push({ id: "note-headphones-case", name: "Headphones case", category: "tech", essential: false, checked: false });
  }
  
  // Speaker
  if (lower.includes("speaker") || lower.includes("bluetooth speaker") || lower.includes("jbl") || lower.includes("bose speaker")) {
    items.push({ id: "note-speaker", name: "Bluetooth speaker", category: "tech", essential: false, checked: false });
    items.push({ id: "note-speaker-charger", name: "Speaker charger", category: "tech", essential: false, checked: false });
  }
  
  // Camera / Photography
  if (lower.includes("camera") || lower.includes("dslr") || lower.includes("gopro") || lower.includes("photo") || lower.includes("vlog") || lower.includes("drone")) {
    items.push({ id: "note-camera", name: "Camera", category: "tech", essential: false, checked: false });
    items.push({ id: "note-camera-batteries", name: "Camera batteries", category: "tech", essential: false, checked: false });
    items.push({ id: "note-sd-cards", name: "Memory cards", category: "tech", essential: false, checked: false });
    items.push({ id: "note-camera-charger", name: "Camera charger", category: "tech", essential: false, checked: false });
    items.push({ id: "note-tripod", name: "Tripod", category: "personal", essential: false, checked: false });
    items.push({ id: "note-camera-bag", name: "Camera bag", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("drone")) {
    items.push({ id: "note-drone", name: "Drone", category: "tech", essential: false, checked: false });
    items.push({ id: "note-drone-batteries", name: "Drone batteries", category: "tech", essential: false, checked: false });
  }
  if (lower.includes("gopro") || lower.includes("action cam")) {
    items.push({ id: "note-gopro", name: "GoPro / action camera", category: "tech", essential: false, checked: false });
    items.push({ id: "note-gopro-mount", name: "GoPro mounts", category: "tech", essential: false, checked: false });
  }
  
  // ============ READING / ENTERTAINMENT ============
  if (lower.includes("book") || lower.includes("read") || lower.includes("novel") || lower.includes("magazine")) {
    items.push({ id: "note-books", name: "Books / reading material", category: "personal", essential: false, checked: false });
    items.push({ id: "note-booklight", name: "Book light", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("podcast") || lower.includes("audiobook") || lower.includes("audible")) {
    items.push({ id: "note-headphones-audio", name: "Headphones for audio", category: "tech", essential: false, checked: false });
  }
  if (lower.includes("netflix") || lower.includes("movie") || lower.includes("stream") || lower.includes("download")) {
    items.push({ id: "note-download-content", name: "Download offline content", category: "preDeparture", essential: false, checked: false });
  }
  
  // ============ FITNESS / WORKOUT ============
  if (lower.includes("gym") || lower.includes("workout") || lower.includes("exercise") || lower.includes("fitness") || lower.includes("lift") || lower.includes("weights") || lower.includes("crossfit")) {
    items.push({ id: "note-gym-shirts", name: "Workout shirts", category: "workout", quantity: "3", essential: false, checked: false });
    items.push({ id: "note-gym-shorts", name: "Workout shorts", category: "workout", quantity: "3", essential: false, checked: false });
    items.push({ id: "note-sports-bra", name: "Sports bra", category: "workout", quantity: "3", essential: false, checked: false, gender: "female" });
    items.push({ id: "note-gym-shoes", name: "Training shoes", category: "workout", essential: false, checked: false });
    items.push({ id: "note-gym-socks", name: "Workout socks", category: "workout", quantity: "3", essential: false, checked: false });
    items.push({ id: "note-gym-gloves", name: "Workout gloves", category: "activity", essential: false, checked: false });
    items.push({ id: "note-gym-towel", name: "Gym towel", category: "personal", essential: false, checked: false });
    items.push({ id: "note-gym-bottle", name: "Water bottle", category: "personal", essential: false, checked: false });
    items.push({ id: "note-gym-bands", name: "Resistance bands", category: "activity", essential: false, checked: false });
    items.push({ id: "note-gym-lock", name: "Gym padlock", category: "personal", essential: false, checked: false });
    items.push({ id: "note-protein", name: "Protein powder / bars", category: "personal", essential: false, checked: false });
  }
  
  // Running / Jogging
  if (lower.includes("run") || lower.includes("jog") || lower.includes("marathon") || lower.includes("5k") || lower.includes("10k")) {
    items.push({ id: "note-run-shoes", name: "Running shoes", category: "workout", essential: false, checked: false });
    items.push({ id: "note-run-shorts", name: "Running shorts", category: "workout", essential: false, checked: false });
    items.push({ id: "note-run-shirt", name: "Running shirt", category: "workout", essential: false, checked: false });
    items.push({ id: "note-run-socks", name: "Athletic socks", category: "workout", quantity: "3 pairs", essential: false, checked: false });
    items.push({ id: "note-run-watch", name: "Sports watch / GPS", category: "tech", essential: false, checked: false });
    items.push({ id: "note-run-belt", name: "Running belt", category: "personal", essential: false, checked: false });
    items.push({ id: "note-run-armband", name: "Phone armband", category: "personal", essential: false, checked: false });
  }
  
  // Yoga / Meditation
  if (lower.includes("yoga") || lower.includes("meditat") || lower.includes("pilates") || lower.includes("stretch")) {
    items.push({ id: "note-yoga-pants", name: "Yoga leggings", category: "workout", quantity: "2", essential: false, checked: false, gender: "female" });
    items.push({ id: "note-yoga-top", name: "Yoga top", category: "workout", quantity: "2", essential: false, checked: false });
    items.push({ id: "note-yoga-bra", name: "Sports bra", category: "workout", quantity: "2", essential: false, checked: false, gender: "female" });
    items.push({ id: "note-yoga-mat", name: "Travel yoga mat", category: "activity", essential: false, checked: false });
    items.push({ id: "note-yoga-strap", name: "Yoga strap", category: "activity", essential: false, checked: false });
  }
  
  // Swimming
  if (lower.includes("swim") || lower.includes("pool") || lower.includes("lap") || lower.includes("water aerobics")) {
    items.push({ id: "note-swim-suit", name: "Swimsuit", category: "workout", quantity: "2", essential: false, checked: false });
    items.push({ id: "note-swim-goggles", name: "Swim goggles", category: "activity", essential: false, checked: false });
    items.push({ id: "note-swim-cap", name: "Swim cap", category: "activity", essential: false, checked: false });
    items.push({ id: "note-swim-towel", name: "Quick-dry towel", category: "personal", essential: false, checked: false });
  }
  
  // ============ OUTDOOR ACTIVITIES ============
  // Hiking
  if (lower.includes("hike") || lower.includes("hiking") || lower.includes("trail") || lower.includes("trek") || lower.includes("backpack")) {
    items.push({ id: "note-hiking-boots", name: "Hiking boots", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-hiking-socks", name: "Hiking socks", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-hiking-pants", name: "Hiking pants", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-daypack", name: "Daypack", category: "personal", essential: false, checked: false });
    items.push({ id: "note-hiking-poles", name: "Hiking poles", category: "personal", essential: false, checked: false });
    items.push({ id: "note-water-bladder", name: "Hydration bladder", category: "personal", essential: false, checked: false });
    items.push({ id: "note-headlamp", name: "Headlamp", category: "personal", essential: false, checked: false });
  }
  
  // Camping
  if (lower.includes("camp") || lower.includes("tent") || lower.includes("outdoor")) {
    items.push({ id: "note-tent", name: "Tent", category: "personal", essential: false, checked: false });
    items.push({ id: "note-sleeping-bag", name: "Sleeping bag", category: "personal", essential: false, checked: false });
    items.push({ id: "note-sleeping-pad", name: "Sleeping pad", category: "personal", essential: false, checked: false });
    items.push({ id: "note-flashlight", name: "Flashlight / lantern", category: "personal", essential: false, checked: false });
    items.push({ id: "note-bug-spray", name: "Bug spray", category: "toiletries", essential: false, checked: false });
  }
  
  // Beach
  if (lower.includes("beach") || lower.includes("ocean") || lower.includes("sand") || lower.includes("sunbath")) {
    items.push({ id: "note-beach-towel", name: "Beach towel", category: "personal", essential: false, checked: false });
    items.push({ id: "note-beach-bag", name: "Beach bag", category: "personal", essential: false, checked: false });
    items.push({ id: "note-flip-flops", name: "Flip flops / sandals", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-beach-umbrella", name: "Beach umbrella", category: "personal", essential: false, checked: false });
    items.push({ id: "note-cooler", name: "Cooler bag", category: "personal", essential: false, checked: false });
  }
  
  // Skiing / Snowboarding
  if (lower.includes("ski") || lower.includes("snowboard") || lower.includes("snow") || lower.includes("slope")) {
    items.push({ id: "note-ski-jacket", name: "Ski jacket", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-ski-pants", name: "Ski pants", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-thermal", name: "Thermal underwear", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-ski-goggles", name: "Ski goggles", category: "personal", essential: false, checked: false });
    items.push({ id: "note-ski-gloves", name: "Ski gloves", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-hand-warmers", name: "Hand warmers", category: "personal", essential: false, checked: false });
  }
  
  // Golf
  if (lower.includes("golf") || lower.includes("course")) {
    items.push({ id: "note-golf-clubs", name: "Golf clubs", category: "personal", essential: false, checked: false });
    items.push({ id: "note-golf-shoes", name: "Golf shoes", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-golf-glove", name: "Golf glove", category: "personal", essential: false, checked: false });
    items.push({ id: "note-golf-balls", name: "Golf balls", category: "personal", essential: false, checked: false });
  }
  
  // Tennis
  if (lower.includes("tennis") || lower.includes("racket") || lower.includes("court")) {
    items.push({ id: "note-tennis-racket", name: "Tennis racket", category: "personal", essential: false, checked: false });
    items.push({ id: "note-tennis-shoes", name: "Tennis shoes", category: "clothing", essential: false, checked: false });
  }
  
  // Scuba / Snorkeling
  if (lower.includes("scuba") || lower.includes("snorkel") || lower.includes("dive") || lower.includes("diving")) {
    items.push({ id: "note-snorkel-mask", name: "Snorkel mask", category: "personal", essential: false, checked: false });
    items.push({ id: "note-snorkel-fins", name: "Fins", category: "personal", essential: false, checked: false });
    items.push({ id: "note-rash-guard", name: "Rash guard", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-dive-cert", name: "Dive certification card", category: "documents", essential: false, checked: false });
  }
  
  // Surfing
  if (lower.includes("surf") || lower.includes("wave")) {
    items.push({ id: "note-wetsuit", name: "Wetsuit", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-rash-guard-surf", name: "Rash guard", category: "clothing", essential: false, checked: false });
    items.push({ id: "note-surf-wax", name: "Surf wax", category: "personal", essential: false, checked: false });
  }
  
  // ============ HEALTH & WELLNESS ============
  // Sleep
  if (lower.includes("light sleeper") || lower.includes("trouble sleep") || lower.includes("can't sleep") || lower.includes("insomnia") || lower.includes("jet lag")) {
    items.push({ id: "note-earplugs", name: "Earplugs", category: "personal", essential: false, checked: false });
    items.push({ id: "note-sleepmask", name: "Sleep mask", category: "personal", essential: false, checked: false });
    items.push({ id: "note-melatonin", name: "Melatonin", category: "health", essential: false, checked: false });
    items.push({ id: "note-sleepaid", name: "Sleep aid", category: "health", essential: false, checked: false });
  }
  
  // Medications
  if (lower.includes("allerg") || lower.includes("hay fever")) {
    items.push({ id: "note-allergy", name: "Allergy medication", category: "health", essential: false, checked: false });
    items.push({ id: "note-antihistamine", name: "Antihistamines", category: "health", essential: false, checked: false });
  }
  if (lower.includes("motion sick") || lower.includes("car sick") || lower.includes("seasick") || lower.includes("nausea")) {
    items.push({ id: "note-motion", name: "Motion sickness meds", category: "health", essential: false, checked: false });
    items.push({ id: "note-ginger", name: "Ginger candies", category: "personal", essential: false, checked: false });
    items.push({ id: "note-sea-bands", name: "Sea bands", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("headache") || lower.includes("migraine") || lower.includes("pain")) {
    items.push({ id: "note-painkillers", name: "Pain relievers", category: "health", essential: false, checked: false });
  }
  if (lower.includes("vitamin") || lower.includes("supplement")) {
    items.push({ id: "note-vitamins", name: "Vitamins / supplements", category: "health", essential: false, checked: false });
  }
  
  // Vision
  if (lower.includes("contact") || lower.includes("lens")) {
    items.push({ id: "note-contacts", name: "Contact lenses", category: "health", essential: false, checked: false });
    items.push({ id: "note-contact-solution", name: "Contact solution", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-contact-case", name: "Contact case", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-backup-glasses", name: "Backup glasses", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("glasses") || lower.includes("eyewear") || lower.includes("spectacle")) {
    items.push({ id: "note-glasses", name: "Glasses", category: "personal", essential: false, checked: false });
    items.push({ id: "note-glasses-case", name: "Glasses case", category: "personal", essential: false, checked: false });
    items.push({ id: "note-glasses-cleaner", name: "Glasses cleaner", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("sunglass")) {
    items.push({ id: "note-sunglasses", name: "Sunglasses", category: "personal", essential: false, checked: false });
  }
  
  // ============ PERSONAL CARE ============
  // Skincare
  if (lower.includes("skincare") || lower.includes("skin care") || lower.includes("moistur") || lower.includes("dry skin") || lower.includes("face")) {
    items.push({ id: "note-moisturizer", name: "Moisturizer", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-facewash", name: "Face wash", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-serum", name: "Serums", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-lipbalm", name: "Lip balm", category: "toiletries", essential: false, checked: false });
  }
  
  // Hair
  if (lower.includes("hair") || lower.includes("curly") || lower.includes("straighten")) {
    items.push({ id: "note-hairdryer", name: "Hair dryer", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-straightener", name: "Hair straightener / curler", category: "toiletries", essential: false, checked: false });
    items.push({ id: "note-hair-products", name: "Hair products", category: "toiletries", essential: false, checked: false });
  }
  
  // ============ COMFORT / TRAVEL AIDS ============
  if (lower.includes("pillow") || lower.includes("neck") || lower.includes("long flight") || lower.includes("plane")) {
    items.push({ id: "note-pillow", name: "Travel pillow", category: "personal", essential: false, checked: false });
    items.push({ id: "note-blanket", name: "Travel blanket", category: "personal", essential: false, checked: false });
    items.push({ id: "note-compression", name: "Compression socks", category: "clothing", essential: false, checked: false });
  }
  
  // ============ FOOD & DRINK ============
  if (lower.includes("coffee") || lower.includes("caffeine") || lower.includes("espresso")) {
    items.push({ id: "note-coffee-mug", name: "Travel coffee mug", category: "personal", essential: false, checked: false });
    items.push({ id: "note-coffee-instant", name: "Instant coffee", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("tea")) {
    items.push({ id: "note-tea-bags", name: "Tea bags", category: "personal", essential: false, checked: false });
    items.push({ id: "note-tea-mug", name: "Travel tea mug", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("snack") || lower.includes("hungry") || lower.includes("munchies") || lower.includes("food")) {
    items.push({ id: "note-snacks", name: "Travel snacks", category: "personal", essential: false, checked: false });
    items.push({ id: "note-snack-container", name: "Snack containers", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("water bottle") || lower.includes("hydrat") || lower.includes("thirsty")) {
    items.push({ id: "note-water", name: "Reusable water bottle", category: "personal", essential: false, checked: false });
    items.push({ id: "note-electrolytes", name: "Electrolyte packets", category: "health", essential: false, checked: false });
  }
  if (lower.includes("diet") || lower.includes("vegan") || lower.includes("vegetarian") || lower.includes("gluten") || lower.includes("celiac")) {
    items.push({ id: "note-dietary-snacks", name: "Dietary-specific snacks", category: "personal", essential: false, checked: false });
  }
  
  // ============ WRITING / ART ============
  if (lower.includes("journal") || lower.includes("diary") || lower.includes("write") || lower.includes("pen")) {
    items.push({ id: "note-journal", name: "Travel journal", category: "personal", essential: false, checked: false });
    items.push({ id: "note-pens", name: "Nice pens", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("draw") || lower.includes("sketch") || lower.includes("art") || lower.includes("paint")) {
    items.push({ id: "note-sketchbook", name: "Sketchbook", category: "personal", essential: false, checked: false });
    items.push({ id: "note-pencils", name: "Pencils / colored pencils", category: "personal", essential: false, checked: false });
    items.push({ id: "note-art-supplies", name: "Art supplies", category: "personal", essential: false, checked: false });
  }
  
  // ============ MUSIC ============
  if (lower.includes("guitar") || lower.includes("ukulele") || lower.includes("instrument") || lower.includes("music") && lower.includes("play")) {
    items.push({ id: "note-instrument", name: "Musical instrument", category: "personal", essential: false, checked: false });
  }
  
  // ============ BUSINESS / WORK ============
  if (lower.includes("meeting") || lower.includes("conference") || lower.includes("presentation") || lower.includes("business")) {
    items.push({ id: "note-business-cards", name: "Business cards", category: "documents", essential: false, checked: false });
    items.push({ id: "note-portfolio", name: "Portfolio / folder", category: "personal", essential: false, checked: false });
    items.push({ id: "note-notebook-biz", name: "Professional notebook", category: "personal", essential: false, checked: false });
  }
  
  // ============ SPECIFIC ITEMS MENTIONED ============
  // Direct item mentions - catch specific product names
  if (lower.includes("umbrella")) {
    items.push({ id: "note-umbrella", name: "Travel umbrella", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("binocular")) {
    items.push({ id: "note-binoculars", name: "Binoculars", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("passport")) {
    items.push({ id: "note-passport-copy", name: "Passport copies", category: "documents", essential: false, checked: false });
  }
  if (lower.includes("cash") || lower.includes("money") || lower.includes("currency")) {
    items.push({ id: "note-cash", name: "Cash / local currency", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("adapter") || lower.includes("converter") || lower.includes("plug")) {
    items.push({ id: "note-adapter", name: "Power adapter", category: "tech", essential: false, checked: false });
  }
  if (lower.includes("extension") || lower.includes("power strip")) {
    items.push({ id: "note-power-strip", name: "Power strip", category: "tech", essential: false, checked: false });
  }
  if (lower.includes("lock") || lower.includes("padlock") || lower.includes("tsa")) {
    items.push({ id: "note-tsa-lock", name: "TSA-approved lock", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("packing cube") || lower.includes("organizer")) {
    items.push({ id: "note-packing-cubes", name: "Packing cubes", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("laundry") || lower.includes("wash clothes")) {
    items.push({ id: "note-laundry-bag", name: "Laundry bag", category: "personal", essential: false, checked: false });
    items.push({ id: "note-detergent", name: "Travel detergent", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("sewing") || lower.includes("needle")) {
    items.push({ id: "note-sewing-kit", name: "Mini sewing kit", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("duct tape") || lower.includes("tape")) {
    items.push({ id: "note-tape", name: "Travel duct tape", category: "personal", essential: false, checked: false });
  }
  if (lower.includes("ziplock") || lower.includes("plastic bag")) {
    items.push({ id: "note-ziplocks", name: "Ziplock bags", category: "personal", essential: false, checked: false });
  }
  
  // Deduplicate by id
  return items.filter((item, idx, arr) => arr.findIndex(i => i.id === item.id) === idx);
};

const getTravelerTotal = (travelers: TravelerInfo[], type: TravelerType) => {
  const t = travelers.find(tr => tr.type === type);
  return t ? t.male + t.female : 0;
};

// Individual traveler for per-person checklists
interface IndividualTraveler {
  id: string;
  label: string;
  type: TravelerType;
  gender: "male" | "female";
}

// Generate list of individual travelers from profile
const getIndividualTravelers = (travelers: TravelerInfo[]): IndividualTraveler[] => {
  const individuals: IndividualTraveler[] = [];
  let adultM = 0, adultF = 0, childM = 0, childF = 0;
  
  travelers.forEach(t => {
    if (t.type === "adult") {
      for (let i = 0; i < t.male; i++) {
        adultM++;
        individuals.push({ id: `adult-m-${adultM}`, label: t.male === 1 && t.female === 0 ? "Adult (M)" : `Adult ${adultM} (M)`, type: "adult", gender: "male" });
      }
      for (let i = 0; i < t.female; i++) {
        adultF++;
        individuals.push({ id: `adult-f-${adultF}`, label: t.female === 1 && t.male === 0 ? "Adult (F)" : `Adult ${adultF} (F)`, type: "adult", gender: "female" });
      }
    }
    if (t.type === "child") {
      for (let i = 0; i < t.male; i++) {
        childM++;
        individuals.push({ id: `child-m-${childM}`, label: `Boy ${childM}`, type: "child", gender: "male" });
      }
      for (let i = 0; i < t.female; i++) {
        childF++;
        individuals.push({ id: `child-f-${childF}`, label: `Girl ${childF}`, type: "child", gender: "female" });
      }
    }
  });
  
  return individuals;
};

const generateChecklist = (profile: TripProfile): ChecklistItem[] => {
  const items: ChecklistItem[] = [];
  const { isInternational, climate, tripDuration, travelers, purpose, packingConstraint, activities, personalNotes } = profile;
  const hasChildren = getTravelerTotal(travelers, "child") > 0;
  const hasInfants = getTravelerTotal(travelers, "infant") > 0;
  const hasPets = getTravelerTotal(travelers, "pet") > 0;
  const hasFemales = travelers.some(t => t.female > 0 && (t.type === "adult" || t.type === "child"));
  const hasMales = travelers.some(t => t.male > 0 && (t.type === "adult" || t.type === "child"));
  const isCarryOnOnly = packingConstraint === "carry_on_only";
  const baseOutfits = Math.min(tripDuration, 7);
  
  // Analyze destination for climate hints
  const destLower = profile.destination.toLowerCase();
  const isColdDestination = destLower.includes("alaska") || destLower.includes("iceland") || 
    destLower.includes("norway") || destLower.includes("sweden") || destLower.includes("finland") ||
    destLower.includes("canada") || destLower.includes("switzerland") || destLower.includes("austria") ||
    destLower.includes("colorado") || destLower.includes("aspen") || destLower.includes("ski") ||
    destLower.includes("mountain") || destLower.includes("alps");
  
  // Effective climate - override if destination strongly suggests different climate
  const effectiveClimate = isColdDestination && climate !== "winter" ? "winter" : climate;

  // DOCUMENTS
  items.push({ id: "doc-id", name: "ID / Driver's license", category: "documents", essential: true, checked: false });
  if (isInternational) {
    items.push({ id: "doc-passport", name: "Passport", category: "documents", essential: true, checked: false });
    items.push({ id: "doc-visa", name: "Visa / ESTA", category: "documents", essential: true, checked: false });
  }
  items.push({ id: "doc-insurance", name: "Travel insurance", category: "documents", essential: true, checked: false });
  items.push({ id: "doc-itinerary", name: "Itinerary", category: "documents", essential: true, checked: false });
  items.push({ id: "doc-credit", name: "Credit cards", category: "documents", essential: true, checked: false });
  items.push({ id: "doc-cash", name: "Emergency cash", category: "documents", essential: true, checked: false });
  if (purpose === "business") {
    items.push({ id: "doc-business", name: "Business cards", category: "documents", essential: true, checked: false });
  }

  // Check if destination is beach-related (destLower already defined above)
  const isBeachDestination = destLower.includes("miami") || destLower.includes("hawaii") || destLower.includes("cancun") || 
    destLower.includes("bahamas") || destLower.includes("caribbean") || destLower.includes("maldives") || 
    destLower.includes("cabo") || destLower.includes("punta cana") || destLower.includes("florida") ||
    destLower.includes("bali") || destLower.includes("thailand") || destLower.includes("fiji") ||
    destLower.includes("beach") || destLower.includes("island") || destLower.includes("coast") ||
    purpose === "beach" || effectiveClimate === "tropical";

  // CLOTHING - EVERYONE
  items.push({ id: "cloth-underwear", name: "Underwear", category: "clothing", quantity: `${Math.min(tripDuration + 1, 8)}`, essential: true, checked: false });
  items.push({ id: "cloth-socks", name: "Socks", category: "clothing", quantity: `${Math.min(tripDuration + 1, 8)}`, essential: true, checked: false });
  items.push({ id: "cloth-sleepwear", name: "Sleepwear", category: "clothing", essential: true, checked: false });
  
  // FEMALE-SPECIFIC CLOTHING
  if (hasFemales) {
    items.push({ id: "cloth-bras", name: "Bras", category: "clothing", quantity: `${Math.min(tripDuration, 5)}`, essential: true, checked: false, gender: "female" });
    items.push({ id: "cloth-dresses", name: "Dresses", category: "clothing", quantity: `${Math.ceil(baseOutfits / 3)}`, essential: false, checked: false, gender: "female" });
    items.push({ id: "cloth-skirts", name: "Skirts", category: "clothing", quantity: `${Math.ceil(baseOutfits / 4)}`, essential: false, checked: false, gender: "female" });
    items.push({ id: "cloth-blouses", name: "Blouses / tops", category: "clothing", quantity: `${Math.ceil(baseOutfits / 2)}`, essential: true, checked: false, gender: "female" });
  }
  
  // SUMMER / TROPICAL / BEACH CLOTHING
  if (effectiveClimate === "summer" || effectiveClimate === "tropical" || isBeachDestination) {
    items.push({ id: "cloth-tshirts", name: "T-shirts", category: "clothing", quantity: `${baseOutfits}`, essential: true, checked: false });
    items.push({ id: "cloth-shorts", name: "Shorts", category: "clothing", quantity: `${Math.ceil(baseOutfits / 2)}`, essential: true, checked: false });
    items.push({ id: "cloth-tankstops", name: "Tank tops", category: "clothing", quantity: `${Math.ceil(baseOutfits / 2)}`, essential: false, checked: false });
    items.push({ id: "cloth-swimwear", name: "Swimwear", category: "clothing", quantity: "2", essential: true, checked: false });
    items.push({ id: "cloth-coverup", name: "Beach cover-up", category: "clothing", essential: false, checked: false });
    items.push({ id: "cloth-sunhat", name: "Sun hat", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-sunglasses", name: "Sunglasses", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-flipflops", name: "Flip-flops / sandals", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-lightdress", name: "Sundress", category: "clothing", essential: false, checked: false, gender: "female" });
  }
  
  // WINTER / COLD CLOTHING
  if (effectiveClimate === "winter") {
    items.push({ id: "cloth-sweaters", name: "Sweaters", category: "clothing", quantity: `${Math.ceil(baseOutfits / 2)}`, essential: true, checked: false });
    items.push({ id: "cloth-longsleeve", name: "Long-sleeve shirts", category: "clothing", quantity: `${baseOutfits}`, essential: true, checked: false });
    items.push({ id: "cloth-coat", name: "Winter coat", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-gloves", name: "Gloves", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-scarf", name: "Scarf", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-beanie", name: "Beanie / winter hat", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-boots", name: "Warm boots", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-thermals", name: "Thermal underwear", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-warmjeans", name: "Jeans / warm pants", category: "clothing", quantity: `${Math.ceil(baseOutfits / 2)}`, essential: true, checked: false });
    items.push({ id: "cloth-fleece", name: "Fleece jacket", category: "clothing", essential: false, checked: false });
  }
  
  // SPRING / VARIABLE WEATHER
  if (effectiveClimate === "spring" || effectiveClimate === "variable") {
    items.push({ id: "cloth-layers", name: "Layering pieces", category: "clothing", quantity: `${baseOutfits}`, essential: true, checked: false });
    items.push({ id: "cloth-raincoat", name: "Rain jacket", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-lightjacket", name: "Light jacket", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-jeans", name: "Jeans / pants", category: "clothing", quantity: `${Math.ceil(baseOutfits / 2)}`, essential: true, checked: false });
  }
  
  // GENERAL ITEMS
  items.push({ id: "cloth-walking", name: "Walking shoes", category: "clothing", essential: true, checked: false });
  items.push({ id: "cloth-belt", name: "Belt", category: "clothing", essential: true, checked: false });
  if (purpose === "business") {
    items.push({ id: "cloth-formal", name: "Formal attire", category: "clothing", essential: true, checked: false });
    items.push({ id: "cloth-dressshoes", name: "Dress shoes", category: "clothing", essential: true, checked: false });
  }
  if (tripDuration > 5) {
    items.push({ id: "cloth-laundry", name: "Laundry bag", category: "clothing", essential: false, checked: false });
  }

  // TOILETRIES
  if (isCarryOnOnly) {
    items.push({ id: "toil-bag", name: "TSA toiletry bag", category: "toiletries", essential: true, checked: false });
  } else {
    items.push({ id: "toil-full", name: "Shampoo & soap", category: "toiletries", essential: true, checked: false });
  }
  items.push({ id: "toil-basics", name: "Toothbrush & paste", category: "toiletries", essential: true, checked: false });
  items.push({ id: "toil-floss", name: "Floss", category: "toiletries", essential: true, checked: false });
  items.push({ id: "toil-deo", name: "Deodorant", category: "toiletries", essential: true, checked: false });
  items.push({ id: "toil-brush", name: "Brush / comb", category: "toiletries", essential: true, checked: false });
  items.push({ id: "toil-facewash", name: "Face cleanser", category: "toiletries", essential: true, checked: false });
  items.push({ id: "toil-facelotion", name: "Face lotion / moisturizer", category: "toiletries", essential: true, checked: false });
  items.push({ id: "toil-handlotion", name: "Hand lotion", category: "toiletries", essential: false, checked: false });
  items.push({ id: "toil-contacts-solution", name: "Contact lens solution", category: "toiletries", essential: false, checked: false });
  items.push({ id: "toil-contacts-case", name: "Contact lens case", category: "toiletries", essential: false, checked: false });
  items.push({ id: "toil-nailclippers", name: "Nail clippers / file", category: "toiletries", essential: false, checked: false });
  items.push({ id: "toil-tweezers", name: "Tweezers", category: "toiletries", essential: false, checked: false });
  if (effectiveClimate === "summer" || effectiveClimate === "tropical" || purpose === "beach" || isBeachDestination) {
    items.push({ id: "toil-sun", name: "Sunscreen SPF 30+", category: "toiletries", essential: true, checked: false });
    items.push({ id: "toil-aftersun", name: "After-sun / aloe vera", category: "toiletries", essential: false, checked: false });
    items.push({ id: "toil-lipsunscreen", name: "Lip balm with SPF", category: "toiletries", essential: false, checked: false });
  }
  // Gender-specific toiletries
  if (hasMales) {
    items.push({ id: "toil-razor-m", name: "Razor & shaving cream", category: "toiletries", essential: false, checked: false });
  }
  if (hasFemales) {
    items.push({ id: "toil-makeup", name: "Makeup", category: "toiletries", essential: false, checked: false });
    items.push({ id: "toil-makeup-remover", name: "Makeup remover", category: "toiletries", essential: false, checked: false });
    items.push({ id: "toil-feminine", name: "Feminine hygiene products", category: "toiletries", essential: true, checked: false });
    items.push({ id: "toil-birthcontrol", name: "Birth control", category: "health", essential: true, checked: false });
    items.push({ id: "toil-hairtools", name: "Hair tools", category: "toiletries", essential: false, checked: false });
  }

  // HEALTH
  items.push({ id: "health-meds", name: "Medications", category: "health", essential: true, checked: false });
  items.push({ id: "health-firstaid", name: "First aid kit", category: "health", essential: true, checked: false });
  items.push({ id: "health-sanitizer", name: "Hand sanitizer", category: "health", essential: true, checked: false });

  // TECH
  items.push({ id: "tech-phone", name: "Phone & charger", category: "tech", essential: true, checked: false });
  items.push({ id: "tech-powerbank", name: "Power bank", category: "tech", essential: true, checked: false });
  if (isInternational) {
    items.push({ id: "tech-adapter", name: "Power adapter", category: "tech", essential: true, checked: false });
  }
  items.push({ id: "tech-headphones", name: "Noise-canceling headphones", category: "tech", essential: true, checked: false });
  if (purpose === "business") {
    items.push({ id: "tech-laptop", name: "Laptop", category: "tech", essential: true, checked: false });
  }

  // COMFORT (standard for all trips)
  items.push({ id: "comfort-neckpillow", name: "Travel neck pillow", category: "personal", essential: true, checked: false });
  items.push({ id: "comfort-snacks", name: "Snacks", category: "personal", essential: true, checked: false });

  // ACTIVITY
  if (purpose === "beach" || activities.includes("beach") || isBeachDestination) {
    items.push({ id: "act-beach", name: "Beach towel", category: "activity", essential: true, checked: false });
    items.push({ id: "act-beachbag", name: "Beach bag", category: "activity", essential: false, checked: false });
    items.push({ id: "act-snorkel", name: "Snorkel gear", category: "activity", essential: false, checked: false });
    items.push({ id: "act-waterproof", name: "Waterproof phone pouch", category: "activity", essential: false, checked: false });
    items.push({ id: "act-cooler", name: "Portable cooler / beach drinks", category: "activity", essential: false, checked: false });
  }
  if (purpose === "adventure" || activities.includes("hiking")) {
    items.push({ id: "act-daypack", name: "Daypack", category: "activity", essential: true, checked: false });
    items.push({ id: "act-bottle", name: "Water bottle", category: "activity", essential: true, checked: false });
  }

  // FAMILY
  if (hasChildren || hasInfants) {
    items.push({ id: "fam-snacks", name: "Kid snacks", category: "family", essential: true, checked: false });
    items.push({ id: "fam-entertainment", name: "Kid entertainment", category: "family", essential: true, checked: false });
  }
  if (hasInfants) {
    items.push({ id: "fam-diapers", name: "Diapers & wipes", category: "family", essential: true, checked: false });
    items.push({ id: "fam-formula", name: "Formula / food", category: "family", essential: true, checked: false });
  }
  if (hasPets) {
    items.push({ id: "fam-petfood", name: "Pet food", category: "family", essential: true, checked: false });
    items.push({ id: "fam-petcarrier", name: "Pet carrier", category: "family", essential: true, checked: false });
  }

  // PERSONAL (from notes)
  if (personalNotes) {
    const noteItems = parsePersonalNotes(personalNotes);
    // Filter by gender - skip if gender-specific and that gender not present
    const filteredNoteItems = noteItems.filter(item => {
      if (item.gender === "female" && !hasFemales) return false;
      if (item.gender === "male" && !hasMales) return false;
      return true;
    });
    items.push(...filteredNoteItems);
  }

  // PRESETS (from selected traveler types)
  if (profile.presets && profile.presets.length > 0) {
    profile.presets.forEach(presetKey => {
      const preset = TRAVELER_PRESETS[presetKey];
      if (preset) {
        preset.items.forEach(item => {
          // Filter by gender - skip if gender-specific and that gender not present
          if (item.gender === "female" && !hasFemales) return;
          if (item.gender === "male" && !hasMales) return;
          
          items.push({
            id: `preset-${presetKey}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            essential: false,
            checked: false
          });
        });
      }
    });
  }

  // PRE-DEPARTURE
  items.push({ id: "pre-confirm", name: "Confirm all reservations", category: "preDeparture", essential: true, checked: false });
  items.push({ id: "pre-checkin", name: "Online flight check-in", category: "preDeparture", essential: true, checked: false });
  items.push({ id: "pre-bank", name: "Notify bank of travel dates", category: "preDeparture", essential: true, checked: false });
  if (isInternational) {
    items.push({ id: "pre-phone", name: "Set up international phone plan", category: "preDeparture", essential: true, checked: false });
  }
  items.push({ id: "pre-home", name: "Home prep (mail, plants, thermostat)", category: "preDeparture", essential: false, checked: false });

  return items;
};

const CATEGORY_INFO: Record<string, { name: string; color: string; icon: React.ReactNode }> = {
  documents: { name: "📄 Documents", color: COLORS.blue, icon: <FileText size={20} /> },
  clothing: { name: "👕 Everyday Clothing", color: COLORS.purple, icon: <Shirt size={20} /> },
  workout: { name: "🏋️ Workout Clothing", color: COLORS.orange, icon: <Activity size={20} /> },
  toiletries: { name: "🧴 Toiletries", color: COLORS.teal, icon: <Droplets size={20} /> },
  health: { name: "🏥 Health & Safety", color: COLORS.red, icon: <Shield size={20} /> },
  tech: { name: "📱 Tech", color: COLORS.orange, icon: <Smartphone size={20} /> },
  activity: { name: "🎿 Activities", color: COLORS.gold, icon: <Activity size={20} /> },
  family: { name: "👨‍👩‍👧‍👦 Family", color: COLORS.primary, icon: <Users size={20} /> },
  personal: { name: "⭐ Your Essentials", color: COLORS.gold, icon: <Star size={20} /> },
  preDeparture: { name: "✈️ Pre-Departure", color: COLORS.primaryDark, icon: <Home size={20} /> }
};

const DestinationAutocomplete = ({ value, onChange, style }: { value: string; onChange: (val: string) => void; style?: React.CSSProperties }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [userHasFocused, setUserHasFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search - only opens dropdown if user has actively focused the input
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      const results = await searchDestinations(value);
      setSuggestions(results);
      setIsLoading(false);
      // Only auto-open if user has actively interacted with the input
      if (results.length > 0 && userHasFocused) setIsOpen(true);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value, userHasFocused]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && suggestions.length > 0) {
        onChange(suggestions[highlightedIndex]);
      }
      setIsOpen(false);
      setUserHasFocused(false); // Require another click to reopen
      (e.target as HTMLInputElement).blur(); // Remove focus
      return;
    }
    if (e.key === "Escape") {
      setIsOpen(false);
      setUserHasFocused(false);
      return;
    }
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    }
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", ...style }}>
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setHighlightedIndex(-1); setUserHasFocused(true); }}
        onFocus={() => { setUserHasFocused(true); }}
        onBlur={() => { setTimeout(() => { setUserHasFocused(false); setIsOpen(false); }, 150); }}
        onKeyDown={handleKeyDown}
        placeholder="Start typing any city..."
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        data-lpignore="true"
        data-form-type="other"
        data-1p-ignore="true"
        aria-autocomplete="list"
        role="combobox"
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12,
          border: `1px solid ${COLORS.border}`, fontSize: 16,
          backgroundColor: COLORS.inputBg, color: COLORS.textMain,
          boxSizing: "border-box", outline: "none"
        }}
      />
      {isOpen && (suggestions.length > 0 || isLoading) && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          backgroundColor: "white", borderRadius: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          border: `1px solid ${COLORS.border}`, zIndex: 100, overflow: "hidden"
        }}>
          {isLoading ? (
            <div style={{ padding: "12px 16px", color: COLORS.textSecondary, fontSize: 14 }}>Searching...</div>
          ) : (
            suggestions.map((dest: string, idx: number) => (
              <div
                key={dest + idx}
                onClick={() => { onChange(dest); setIsOpen(false); }}
                onMouseEnter={() => setHighlightedIndex(idx)}
                style={{
                  padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  backgroundColor: highlightedIndex === idx ? COLORS.accentLight : "white",
                  borderBottom: idx < suggestions.length - 1 ? `1px solid ${COLORS.border}` : "none"
                }}
              >
                <MapPin size={16} color={COLORS.primary} />
                <span style={{ fontWeight: 500, color: COLORS.textMain }}>{dest}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const ToggleButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} style={{
    padding: "10px 16px", borderRadius: 12,
    border: active ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
    backgroundColor: active ? COLORS.accentLight : "white",
    color: active ? COLORS.primaryDark : COLORS.textSecondary,
    fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
  }}>{children}</button>
);

const TravelerCounter = ({ count, onChange, label, icon }: { count: number; onChange: (c: number) => void; label: string; icon: React.ReactNode }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: COLORS.inputBg, borderRadius: 12, flex: 1 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: COLORS.primary }}>{icon}</span>
      <span style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 13 }}>{label}</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={() => onChange(Math.max(0, count - 1))} style={{ width: 28, height: 28, borderRadius: 6, border: "none", backgroundColor: "white", color: COLORS.primary, cursor: "pointer", fontSize: 16 }}>-</button>
      <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center", fontSize: 14 }}>{count}</span>
      <button type="button" onClick={() => onChange(count + 1)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", backgroundColor: "white", color: COLORS.primary, cursor: "pointer", fontSize: 16 }}>+</button>
    </div>
  </div>
);

const ChecklistItemRow = ({ item, onToggle, onRemove }: { item: ChecklistItem; onToggle: () => void; onRemove?: () => void }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
    backgroundColor: item.checked ? COLORS.accentLight : "white", borderRadius: 12,
    border: `1px solid ${item.checked ? COLORS.primary : COLORS.border}`, flex: 1, minWidth: 0
  }}>
    <div onClick={onToggle} style={{ color: item.checked ? COLORS.primary : COLORS.textSecondary, flexShrink: 0, cursor: "pointer" }}>
      {item.checked ? <CheckCircle2 size={20} /> : <Circle size={20} />}
    </div>
    <div onClick={onToggle} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
      <div style={{ fontWeight: 600, color: item.checked ? COLORS.primaryDark : COLORS.textMain, fontSize: 13, textDecoration: item.checked ? "line-through" : "none" }}>
        {item.name}
      </div>
    </div>
    {item.quantity && (
      <div style={{ 
        flexShrink: 0, backgroundColor: COLORS.primary, color: "white", 
        padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 
      }}>
        {item.quantity}
      </div>
    )}
    {onRemove && (
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} style={{ 
        flexShrink: 0, background: "none", border: "none", padding: 4, cursor: "pointer", color: COLORS.textSecondary,
        opacity: 0.5, transition: "opacity 0.2s"
      }} onMouseEnter={(e) => e.currentTarget.style.opacity = "1"} onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}>
        <X size={16} />
      </button>
    )}
  </div>
);

// Add Item Input Component
const AddItemInput = ({ category, onAdd }: { category: string; onAdd: (name: string, quantity?: string) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  const handleAdd = () => {
    if (name.trim()) {
      onAdd(name.trim(), quantity.trim() || undefined);
      setName("");
      setQuantity("");
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button onClick={() => setIsAdding(true)} style={{
        width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px dashed ${COLORS.border}`,
        backgroundColor: "transparent", color: COLORS.textSecondary, fontSize: 13, fontWeight: 600,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        marginTop: 8
      }}>
        <Plus size={16} /> Add item
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name"
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        style={{
          flex: 1, padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
          fontSize: 13, outline: "none", backgroundColor: COLORS.inputBg
        }}
      />
      <input
        type="text"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="Qty"
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        style={{
          width: 50, padding: "10px 8px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
          fontSize: 13, outline: "none", backgroundColor: COLORS.inputBg, textAlign: "center"
        }}
      />
      <button onClick={handleAdd} style={{
        padding: "10px 14px", borderRadius: 8, border: "none", backgroundColor: COLORS.primary,
        color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer"
      }}>Add</button>
      <button onClick={() => { setIsAdding(false); setName(""); setQuantity(""); }} style={{
        padding: "10px", borderRadius: 8, border: "none", backgroundColor: COLORS.inputBg,
        color: COLORS.textSecondary, cursor: "pointer"
      }}><X size={16} /></button>
    </div>
  );
};

export default function TravelChecklist({ initialData }: { initialData?: any }) {
  const saved = loadSavedData();
  const [profile, setProfile] = useState<TripProfile>(saved?.profile || DEFAULT_PROFILE);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(saved?.checklist || []);
  const [individualChecklists, setIndividualChecklists] = useState<Record<string, ChecklistItem[]>>(saved?.individualChecklists || {});
  const [checklistGenerated, setChecklistGenerated] = useState(saved?.checklistGenerated || false);
  const [selectedTab, setSelectedTab] = useState<string>(saved?.selectedTab || "shared"); // "shared" or traveler id
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ documents: true, clothing: true, workout: true, toiletries: true, health: true, tech: true, activity: true, family: true, preDeparture: true, personal: true });
  const [showBanner, setShowBanner] = useState(() => { try { const d = localStorage.getItem(BANNER_STORAGE_KEY); return !d || (new Date().getTime() - parseInt(d)) > 86400000; } catch { return true; } });
  const [expandedTravelers, setExpandedTravelers] = useState<Record<string, boolean>>({ children: false, infants: false, pets: false });
  
  // Saved checklists state
  const [savedChecklists, setSavedChecklists] = useState<SavedChecklist[]>(() => {
    try {
      const data = localStorage.getItem(SAVED_CHECKLISTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch { return []; }
  });
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveChecklistName, setSaveChecklistName] = useState("");
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [showSavedList, setShowSavedList] = useState(false);
  
  // Subscribe state
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [subscribeMessage, setSubscribeMessage] = useState("");
  
  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  
  // Weather state
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // Per-individual preferences (notes and presets unique to each traveler)
  const [individualPrefs, setIndividualPrefs] = useState<Record<string, { notes: string; presets: string[] }>>(saved?.individualPrefs || {});
  
  // Track previous traveler info to detect single->multi transition and who gets presets
  const prevTravelerCountRef = useRef<number>(0);
  const wasLastGenerationSinglePerson = useRef<boolean>(true);
  const originalSingleTravelerRef = useRef<{ type: string; gender: string } | null>(null);
  
  // Get list of individual travelers
  const individuals = useMemo(() => getIndividualTravelers(profile.travelers), [profile.travelers]);

  useEffect(() => { 
    saveData({ profile, checklist, checklistGenerated, individualChecklists, individualPrefs, selectedTab }); 
  }, [profile, checklist, checklistGenerated, individualChecklists, individualPrefs, selectedTab]);
  
  // Fix selectedTab on load: if multiple travelers and selectedTab is invalid, auto-select first traveler
  useEffect(() => {
    if (checklistGenerated && individuals.length > 1) {
      const validTabs = individuals.map(i => i.id);
      if (selectedTab === "shared" || !validTabs.includes(selectedTab)) {
        // Auto-select first traveler
        setSelectedTab(individuals[0].id);
      }
    }
  }, [checklistGenerated, individuals, selectedTab]);
  
  // Regenerate individual checklists if missing but checklistGenerated is true (handles legacy data)
  useEffect(() => {
    if (checklistGenerated && individuals.length > 0 && Object.keys(individualChecklists).length === 0) {
      // Need to regenerate individual checklists
      const indivLists: Record<string, ChecklistItem[]> = {};
      const newPrefs: Record<string, { notes: string; presets: string[] }> = {};
      
      individuals.forEach((t) => {
        const individualProfile: TripProfile = {
          ...profile,
          presets: [],
          travelers: [{
            type: t.type as "adult" | "child" | "infant" | "senior" | "pet",
            male: t.gender === "male" ? 1 : 0,
            female: t.gender === "female" ? 1 : 0
          }]
        };
        const items = generateChecklist(individualProfile);
        indivLists[t.id] = items.map(item => ({ ...item, id: `${t.id}-${item.id}` }));
        newPrefs[t.id] = individualPrefs[t.id] || { notes: "", presets: [] };
      });
      
      setIndividualChecklists(indivLists);
      if (Object.keys(individualPrefs).length === 0) {
        setIndividualPrefs(newPrefs);
      }
    }
  }, [checklistGenerated, individuals, individualChecklists, profile]);

  // Hydrate profile from initialData (ChatGPT integration)
  useEffect(() => {
    if (!initialData || Object.keys(initialData).length === 0) {
      console.log("[TravelChecklist] No initialData to hydrate");
      return;
    }
    
    console.log("[TravelChecklist] Hydrating from initialData:", initialData);
    
    try {
      const updates: Partial<TripProfile> = {};
      
      // Destination
      if (initialData.destination) {
        updates.destination = String(initialData.destination);
      }
      
      // Calculate trip duration in days
      let tripDurationDays = 7; // Default to 1 week
      if (initialData.trip_duration) {
        tripDurationDays = Number(initialData.trip_duration);
      } else if (initialData.trip_weeks) {
        tripDurationDays = Number(initialData.trip_weeks) * 7;
      }
      
      // Helper to format date as YYYY-MM-DD
      const formatDate = (d: Date): string => {
        return d.toISOString().split('T')[0];
      };
      
      // Helper to get next occurrence of a day of week (0=Sunday, 6=Saturday)
      const getNextDayOfWeek = (dayOfWeek: number, weeksAhead: number = 0): Date => {
        const today = new Date();
        const currentDay = today.getDay();
        let daysUntil = dayOfWeek - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        const result = new Date(today);
        result.setDate(today.getDate() + daysUntil + (weeksAhead * 7));
        return result;
      };
      
      // Helper to get first day of a month
      const getFirstOfMonth = (monthName: string): Date => {
        const months: Record<string, number> = {
          january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
          july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
        };
        const monthNum = months[monthName.toLowerCase()];
        if (monthNum === undefined) return new Date();
        
        const today = new Date();
        let year = today.getFullYear();
        // If the month has already passed this year, use next year
        if (monthNum < today.getMonth() || (monthNum === today.getMonth() && today.getDate() > 1)) {
          year++;
        }
        return new Date(year, monthNum, 1);
      };
      
      // Dates - handle exact dates, relative timing, or month-based
      let startDate: Date | null = null;
      let endDate: Date | null = null;
      
      // Priority 1: Exact dates provided
      if (initialData.start_date) {
        startDate = new Date(initialData.start_date);
        if (initialData.end_date) {
          endDate = new Date(initialData.end_date);
        }
      }
      
      // Priority 2: Relative departure timing (e.g., "in two weeks", "next weekend")
      if (!startDate && initialData.departure_timing) {
        const today = new Date();
        const timing = initialData.departure_timing;
        
        switch (timing) {
          case "this_week":
            // Start tomorrow
            startDate = new Date(today);
            startDate.setDate(today.getDate() + 1);
            break;
          case "next_week":
            // Start 7 days from now
            startDate = new Date(today);
            startDate.setDate(today.getDate() + 7);
            break;
          case "in_two_weeks":
            // Start 14 days from now (user said "in two weeks" so give them a week to prepare)
            startDate = new Date(today);
            startDate.setDate(today.getDate() + 7);
            break;
          case "in_three_weeks":
            startDate = new Date(today);
            startDate.setDate(today.getDate() + 14);
            break;
          case "this_weekend":
            // Next Saturday
            startDate = getNextDayOfWeek(6, 0);
            if (!initialData.trip_duration && !initialData.trip_weeks) {
              tripDurationDays = 2; // Weekend = 2 days
            }
            break;
          case "next_weekend":
            // Saturday after next
            startDate = getNextDayOfWeek(6, 1);
            if (!initialData.trip_duration && !initialData.trip_weeks) {
              tripDurationDays = 2;
            }
            break;
          case "next_month":
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            startDate = nextMonth;
            break;
          case "in_two_months":
            const twoMonths = new Date(today.getFullYear(), today.getMonth() + 2, 1);
            startDate = twoMonths;
            break;
        }
      }
      
      // Priority 3: Month-based (e.g., "in December", "in January")
      if (!startDate && initialData.trip_month) {
        startDate = getFirstOfMonth(initialData.trip_month);
      }
      
      // Calculate end date if we have a start date but no end date
      if (startDate && !endDate) {
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + tripDurationDays - 1);
      }
      
      // Apply dates to updates
      if (startDate && !isNaN(startDate.getTime())) {
        updates.startDate = formatDate(startDate);
      }
      if (endDate && !isNaN(endDate.getTime())) {
        updates.endDate = formatDate(endDate);
      }
      
      // Set trip duration
      if (startDate && endDate) {
        const diff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) updates.tripDuration = diff;
      } else if (tripDurationDays > 0) {
        updates.tripDuration = tripDurationDays;
      }
      
      // International flag
      if (typeof initialData.is_international === "boolean") {
        updates.isInternational = initialData.is_international;
      }
      
      // Climate
      if (initialData.climate && ["summer", "winter", "spring", "tropical", "variable"].includes(initialData.climate)) {
        updates.climate = initialData.climate as TripProfile["climate"];
      }
      
      // Purpose
      if (initialData.purpose && ["leisure", "business", "adventure", "beach", "city"].includes(initialData.purpose)) {
        updates.purpose = initialData.purpose as TripProfile["purpose"];
      }
      
      // Packing constraint
      if (initialData.packing_constraint && ["carry_on_only", "checked_bags", "minimal"].includes(initialData.packing_constraint)) {
        updates.packingConstraint = initialData.packing_constraint as TripProfile["packingConstraint"];
      }
      
      // Activities
      if (Array.isArray(initialData.activities)) {
        updates.activities = initialData.activities;
      }
      
      // Travelers - build from detailed breakdown or total count
      const newTravelers = [...DEFAULT_PROFILE.travelers];
      let hasTravelerData = false;
      
      // Detailed breakdown
      if (initialData.adult_males && Number(initialData.adult_males) > 0) {
        const adultIdx = newTravelers.findIndex(t => t.type === "adult");
        if (adultIdx >= 0) newTravelers[adultIdx] = { ...newTravelers[adultIdx], male: Number(initialData.adult_males) };
        hasTravelerData = true;
      }
      if (initialData.adult_females && Number(initialData.adult_females) > 0) {
        const adultIdx = newTravelers.findIndex(t => t.type === "adult");
        if (adultIdx >= 0) newTravelers[adultIdx] = { ...newTravelers[adultIdx], female: Number(initialData.adult_females) };
        hasTravelerData = true;
      }
      if (initialData.male_children && Number(initialData.male_children) > 0) {
        const childIdx = newTravelers.findIndex(t => t.type === "child");
        if (childIdx >= 0) newTravelers[childIdx] = { ...newTravelers[childIdx], male: Number(initialData.male_children) };
        hasTravelerData = true;
      }
      if (initialData.female_children && Number(initialData.female_children) > 0) {
        const childIdx = newTravelers.findIndex(t => t.type === "child");
        if (childIdx >= 0) newTravelers[childIdx] = { ...newTravelers[childIdx], female: Number(initialData.female_children) };
        hasTravelerData = true;
      }
      if (initialData.infants && Number(initialData.infants) > 0) {
        const infantIdx = newTravelers.findIndex(t => t.type === "infant");
        if (infantIdx >= 0) newTravelers[infantIdx] = { ...newTravelers[infantIdx], male: Number(initialData.infants) };
        hasTravelerData = true;
      }
      
      // Legacy: has_children / has_infants / has_pets booleans
      if (initialData.has_children && !initialData.male_children && !initialData.female_children) {
        const childIdx = newTravelers.findIndex(t => t.type === "child");
        if (childIdx >= 0) newTravelers[childIdx] = { ...newTravelers[childIdx], male: 1 };
        hasTravelerData = true;
      }
      if (initialData.has_infants && !initialData.infants) {
        const infantIdx = newTravelers.findIndex(t => t.type === "infant");
        if (infantIdx >= 0) newTravelers[infantIdx] = { ...newTravelers[infantIdx], male: 1 };
        hasTravelerData = true;
      }
      if (initialData.has_pets) {
        const petIdx = newTravelers.findIndex(t => t.type === "pet");
        if (petIdx >= 0) newTravelers[petIdx] = { ...newTravelers[petIdx], male: 1 };
        hasTravelerData = true;
      }
      
      // Fallback: total travelers count (assume adult males if no breakdown)
      if (!hasTravelerData && initialData.travelers && Number(initialData.travelers) > 0) {
        const adultIdx = newTravelers.findIndex(t => t.type === "adult");
        if (adultIdx >= 0) newTravelers[adultIdx] = { ...newTravelers[adultIdx], male: Number(initialData.travelers) };
        hasTravelerData = true;
      }
      
      // Default to 1 adult male if no travelers specified
      if (!hasTravelerData) {
        const adultIdx = newTravelers.findIndex(t => t.type === "adult");
        if (adultIdx >= 0) newTravelers[adultIdx] = { ...newTravelers[adultIdx], male: 1 };
      }
      
      updates.travelers = newTravelers;
      
      // Apply all updates
      if (Object.keys(updates).length > 0) {
        console.log("[TravelChecklist] Applying hydration updates:", updates);
        setProfile(p => ({ ...p, ...updates }));
      }
    } catch (e) {
      console.error("[TravelChecklist] Failed to hydrate from initialData:", e);
    }
  }, []); // Run once on mount

  const updateTravelerGender = (type: TravelerType, gender: "male" | "female", count: number) => {
    setProfile(p => ({ ...p, travelers: p.travelers.map(t => t.type === type ? { ...t, [gender]: count } : t) }));
  };
  const getTraveler = (type: TravelerType) => profile.travelers.find(t => t.type === type) || { type, male: 0, female: 0 };
  
  // Calculate duration from dates
  const calculatedDuration = useMemo(() => {
    if (profile.startDate && profile.endDate) {
      const start = new Date(profile.startDate);
      const end = new Date(profile.endDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return diff > 0 ? diff : profile.tripDuration;
    }
    return profile.tripDuration;
  }, [profile.startDate, profile.endDate, profile.tripDuration]);
  
  // Update profile duration when dates change
  useEffect(() => {
    if (profile.startDate && profile.endDate && calculatedDuration !== profile.tripDuration) {
      setProfile(p => ({ ...p, tripDuration: calculatedDuration }));
    }
  }, [calculatedDuration]);
  
  // Fetch weather forecast when destination or dates change
  useEffect(() => {
    const fetchWeather = async () => {
      if (!profile.destination || profile.destination.length < 3) {
        setWeatherForecast(null);
        return;
      }
      
      setWeatherLoading(true);
      
      // Get coordinates for the destination
      const coords = await geocodeCity(profile.destination);
      if (!coords) {
        setWeatherLoading(false);
        setWeatherForecast(null);
        return;
      }
      
      // Determine dates to check - use user dates or default to 3 months from now
      let startDate = profile.startDate;
      let endDate = profile.endDate;
      
      if (!startDate || !endDate) {
        const futureDate = new Date();
        futureDate.setMonth(futureDate.getMonth() + 3);
        startDate = futureDate.toISOString().split('T')[0];
        const endFuture = new Date(futureDate);
        endFuture.setDate(endFuture.getDate() + (profile.tripDuration || 7));
        endDate = endFuture.toISOString().split('T')[0];
      }
      
      const weather = await fetchWeatherForecast(coords.lat, coords.lon, startDate, endDate);
      setWeatherForecast(weather);
      
      // Auto-update climate based on weather data
      if (weather) {
        const suggestedClimate = weatherToSeason(weather);
        if (suggestedClimate !== profile.climate) {
          setProfile(p => ({ ...p, climate: suggestedClimate }));
        }
      }
      
      setWeatherLoading(false);
    };
    
    // Debounce the weather fetch
    const timeoutId = setTimeout(fetchWeather, 1000);
    return () => clearTimeout(timeoutId);
  }, [profile.destination, profile.startDate, profile.endDate, profile.tripDuration]);

  // Regenerate entire checklist when key profile fields change (travelers, climate, purpose, activities)
  // This preserves checked state for items that remain
  useEffect(() => {
    if (!checklistGenerated) return;
    
    // Generate fresh checklist based on current profile
    const freshChecklist = generateChecklist(profile);
    const freshIds = new Set(freshChecklist.map(item => item.id));
    
    setChecklist(currentItems => {
      // Build a map of current checked states
      const checkedMap = new Map(currentItems.map(item => [item.id, item.checked]));
      
      // Apply checked state to fresh items that existed before
      const updatedItems = freshChecklist.map(item => ({
        ...item,
        checked: checkedMap.has(item.id) ? checkedMap.get(item.id)! : item.checked
      }));
      
      // Keep custom items (added manually by user) that don't start with standard prefixes
      const customItems = currentItems.filter(item => 
        item.id.startsWith('custom-') && !freshIds.has(item.id)
      );
      
      return [...updatedItems, ...customItems];
    });
  }, [
    profile.destination,  // IMPORTANT: destination affects beach/cold detection
    profile.travelers, 
    profile.climate, 
    profile.purpose, 
    profile.activities, 
    profile.isInternational, 
    profile.tripDuration,
    profile.packingConstraint,
    profile.presets,
    profile.personalNotes,
    checklistGenerated
  ]);

  const toggleActivity = (id: string) => setProfile(p => ({ ...p, activities: p.activities.includes(id) ? p.activities.filter(a => a !== id) : [...p.activities, id] }));
  const togglePreset = (id: string) => setProfile(p => ({ ...p, presets: p.presets.includes(id) ? p.presets.filter(a => a !== id) : [...p.presets, id] }));
  
  // Per-individual preference functions
  const toggleIndividualPreset = (travelerId: string, presetId: string) => {
    setIndividualPrefs(prev => {
      const current = prev[travelerId] || { notes: "", presets: [] };
      const newPresets = current.presets.includes(presetId) 
        ? current.presets.filter(p => p !== presetId) 
        : [...current.presets, presetId];
      return { ...prev, [travelerId]: { ...current, presets: newPresets } };
    });
  };
  
  const updateIndividualNotes = (travelerId: string, notes: string) => {
    setIndividualPrefs(prev => {
      const current = prev[travelerId] || { notes: "", presets: [] };
      return { ...prev, [travelerId]: { ...current, notes } };
    });
  };
  
  const getIndividualPrefs = (travelerId: string) => {
    return individualPrefs[travelerId] || { notes: "", presets: [] };
  };
  
  const handleGenerate = () => { 
    // Track checklist generation
    trackEvent("widget_generate_checklist", {
      destination: profile.destination,
      tripDuration: profile.tripDuration,
      isInternational: profile.isInternational,
      purpose: profile.purpose,
      climate: profile.climate,
      travelerCount: getIndividualTravelers(profile.travelers).length
    });
    
    // Generate shared checklist
    setChecklist(generateChecklist(profile)); 
    
    // Generate individual checklists for each person using the SAME generateChecklist logic
    const indivLists: Record<string, ChecklistItem[]> = {};
    const travelers = getIndividualTravelers(profile.travelers);
    
    // Check if we have shared presets that need to be transferred to an individual
    // This happens when transitioning from single-person (shared mode) to multi-person
    const sharedPresets = profile.presets || [];
    const sharedNotes = profile.personalNotes || "";
    const hasSharedPresets = sharedPresets.length > 0;
    const isMultiPerson = travelers.length > 1;
    
    // Use refs to detect transition from single to multi person
    const wasLastSingle = wasLastGenerationSinglePerson.current;
    const originalTraveler = originalSingleTravelerRef.current;
    
    // Determine who should inherit the shared presets (if any)
    let presetInheritingTravelerId: string | null = null;
    if (hasSharedPresets && isMultiPerson && wasLastSingle && originalTraveler) {
      // Transitioning from single to multi - find the original person by type and gender
      // Check if presets were already transferred to any individual
      const alreadyTransferred = Object.values(individualPrefs).some(p => p.presets.length > 0);
      
      if (!alreadyTransferred) {
        // Find the traveler that matches the original single person's type and gender
        const match = travelers.find(t => t.type === originalTraveler.type && t.gender === originalTraveler.gender);
        presetInheritingTravelerId = match?.id || null;
      }
    }
    
    // Initialize per-individual preferences (preserve existing if any)
    const newPrefs: Record<string, { notes: string; presets: string[] }> = {};
    travelers.forEach((t) => {
      // Create a modified profile for this individual traveler
      // IMPORTANT: Clear presets from individual profile - we handle them via individualPrefs
      const individualProfile: TripProfile = {
        ...profile,
        presets: [], // Don't include shared presets in individual generation
        travelers: [{
          type: t.type as "adult" | "child" | "infant" | "senior" | "pet",
          male: t.gender === "male" ? 1 : 0,
          female: t.gender === "female" ? 1 : 0
        }]
      };
      // Generate using the same comprehensive checklist logic
      const items = generateChecklist(individualProfile);
      // Prefix item IDs to make them unique per traveler
      indivLists[t.id] = items.map(item => ({ ...item, id: `${t.id}-${item.id}` }));
      
      // Determine preferences for this traveler
      if (individualPrefs[t.id] && individualPrefs[t.id].presets.length > 0) {
        // Traveler already has individual prefs with presets - keep them
        newPrefs[t.id] = individualPrefs[t.id];
      } else if (t.id === presetInheritingTravelerId) {
        // This traveler should inherit the shared presets
        newPrefs[t.id] = { notes: sharedNotes, presets: [...sharedPresets] };
      } else if (individualPrefs[t.id]) {
        // Has prefs but no presets - keep notes, empty presets
        newPrefs[t.id] = individualPrefs[t.id];
      } else {
        // New traveler - start with empty prefs
        newPrefs[t.id] = { notes: "", presets: [] };
      }
    });
    
    // Update refs for next time
    prevTravelerCountRef.current = travelers.length;
    wasLastGenerationSinglePerson.current = travelers.length <= 1;
    // Save the original single traveler's info for preset transfer
    if (travelers.length === 1) {
      originalSingleTravelerRef.current = { type: travelers[0].type, gender: travelers[0].gender };
    } else if (travelers.length > 1 && !wasLastSingle) {
      // Already multi-person, clear the original
      originalSingleTravelerRef.current = null;
    }
    // Note: We keep originalSingleTravelerRef when transitioning from single to multi
    // so the preset transfer can happen on subsequent generates if needed
    
    setIndividualPrefs(newPrefs);
    setIndividualChecklists(indivLists);
    setChecklistGenerated(true); 
    setSelectedTab(travelers.length > 1 ? travelers[0].id : "shared");
    
    // Scroll to the content section (after the trip summary) after a short delay for render
    setTimeout(() => {
      const contentSection = document.getElementById('checklist-content-section');
      if (contentSection) {
        contentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 100);
  };
  
  const toggleItem = (id: string) => {
    trackEvent("widget_check_item", { itemId: id, tab: selectedTab });
    if (selectedTab === "shared") {
      setChecklist(items => items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
    } else {
      setIndividualChecklists(prev => ({
        ...prev,
        [selectedTab]: prev[selectedTab]?.map(i => i.id === id ? { ...i, checked: !i.checked } : i) || []
      }));
    }
  };

  const removeItem = (id: string) => {
    if (selectedTab === "shared") {
      setChecklist(items => items.filter(i => i.id !== id));
    } else {
      setIndividualChecklists(prev => ({
        ...prev,
        [selectedTab]: prev[selectedTab]?.filter(i => i.id !== id) || []
      }));
    }
  };

  const addItem = (category: string, name: string, quantity?: string) => {
    trackEvent("widget_add_custom_item", { category, itemName: name, tab: selectedTab });
    const newItem: ChecklistItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      quantity,
      essential: false,
      checked: false
    };
    if (selectedTab === "shared") {
      setChecklist(items => [...items, newItem]);
    } else {
      setIndividualChecklists(prev => ({
        ...prev,
        [selectedTab]: [...(prev[selectedTab] || []), newItem]
      }));
    }
  };
  
  const toggleCategory = (cat: string) => setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  const resetAll = () => { 
    trackEvent("widget_clear_data", {});
    localStorage.removeItem(STORAGE_KEY); 
    localStorage.removeItem(SAVED_CHECKLISTS_KEY);
    setProfile(DEFAULT_PROFILE); 
    setChecklist([]); 
    setIndividualChecklists({}); 
    setIndividualPrefs({});
    setSavedChecklists([]);
    setChecklistGenerated(false); 
    setSelectedTab("shared"); 
  };

  // Subscribe handler
  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      setSubscribeMessage("Please enter a valid email.");
      setSubscribeStatus("error");
      return;
    }
    setSubscribeStatus("loading");
    try {
      const serverUrl = window.location.hostname === "localhost" ? "" : "https://travel-checklist-q79n.onrender.com";
      const response = await fetch(`${serverUrl}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          topicId: "travel-tips",
          topicName: "Travel Checklist Updates"
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

  // Feedback handler
  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return;
    setFeedbackStatus("submitting");
    try {
      const serverUrl = window.location.hostname === "localhost" ? "" : "https://travel-checklist-q79n.onrender.com";
      const response = await fetch(`${serverUrl}/api/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "user_feedback",
          data: { feedback: feedbackText, destination: profile.destination }
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

  // Save checklist functions
  const persistSavedChecklists = (lists: SavedChecklist[]) => {
    try { localStorage.setItem(SAVED_CHECKLISTS_KEY, JSON.stringify(lists)); } catch (e) {}
  };

  const handleSaveChecklist = () => {
    if (!saveChecklistName.trim()) return;
    trackEvent("widget_save_checklist", { name: saveChecklistName.trim(), isUpdate: !!editingChecklistId });
    
    const newSaved: SavedChecklist = {
      id: editingChecklistId || `saved-${Date.now()}`,
      name: saveChecklistName.trim(),
      savedAt: Date.now(),
      profile: { ...profile },
      checklist: [...checklist],
      individualChecklists: { ...individualChecklists }
    };

    let updated: SavedChecklist[];
    if (editingChecklistId) {
      updated = savedChecklists.map(sc => sc.id === editingChecklistId ? newSaved : sc);
    } else {
      updated = [...savedChecklists, newSaved];
    }
    
    setSavedChecklists(updated);
    persistSavedChecklists(updated);
    setShowSaveModal(false);
    setSaveChecklistName("");
    setEditingChecklistId(null);
  };

  const loadSavedChecklist = (sc: SavedChecklist) => {
    setProfile(sc.profile);
    setChecklist(sc.checklist);
    setIndividualChecklists(sc.individualChecklists);
    setChecklistGenerated(true);
    setSelectedTab("shared");
    setShowSavedList(false);
  };

  const duplicateChecklist = (sc: SavedChecklist) => {
    setSaveChecklistName(`${sc.name} (Copy)`);
    setProfile(sc.profile);
    setChecklist(sc.checklist);
    setIndividualChecklists(sc.individualChecklists);
    setChecklistGenerated(true);
    setEditingChecklistId(null);
    setShowSaveModal(true);
    setShowSavedList(false);
  };

  const deleteSavedChecklist = (id: string) => {
    const updated = savedChecklists.filter(sc => sc.id !== id);
    setSavedChecklists(updated);
    persistSavedChecklists(updated);
  };

  const openSaveModal = (existingId?: string) => {
    if (existingId) {
      const existing = savedChecklists.find(sc => sc.id === existingId);
      if (existing) {
        setSaveChecklistName(existing.name);
        setEditingChecklistId(existingId);
      }
    } else {
      setSaveChecklistName(profile.destination ? `${profile.destination} Trip` : "My Checklist");
      setEditingChecklistId(null);
    }
    setShowSaveModal(true);
  };

  // Get current checklist based on selected tab
  const currentChecklist = useMemo(() => {
    if (selectedTab === "shared") return checklist;
    
    // For individual tabs, start with base items and add preset items
    const baseItems = individualChecklists[selectedTab] || [];
    const prefs = individualPrefs[selectedTab] || { notes: "", presets: [] };
    const traveler = individuals.find(t => t.id === selectedTab);
    const isFemale = traveler?.gender === "female";
    const isMale = traveler?.gender === "male";
    const tripDuration = profile.tripDuration || 7;
    
    // Add items from selected presets, scaling quantities based on trip duration
    const presetItems: ChecklistItem[] = [];
    prefs.presets.forEach(presetId => {
      const preset = TRAVELER_PRESETS[presetId];
      if (preset) {
        preset.items.forEach((item, idx) => {
          // Filter by gender
          if (item.gender === "female" && !isFemale) return;
          if (item.gender === "male" && !isMale) return;
          // Check if item already exists (by name)
          const exists = baseItems.some(bi => bi.name === item.name) || presetItems.some(pi => pi.name === item.name);
          if (!exists) {
            presetItems.push({
              id: `${selectedTab}-preset-${presetId}-${idx}`,
              name: item.name,
              category: item.category,
              quantity: scaleQuantityForDuration(item.quantity, tripDuration),
              essential: false,
              checked: false
            });
          }
        });
      }
    });
    
    return [...baseItems, ...presetItems];
  }, [selectedTab, checklist, individualChecklists, individualPrefs, individuals, profile.tripDuration]);

  const progress = useMemo(() => {
    if (!currentChecklist.length) return { checked: 0, total: 0, percent: 0 };
    const checked = currentChecklist.filter(i => i.checked).length;
    return { checked, total: currentChecklist.length, percent: Math.round((checked / currentChecklist.length) * 100) };
  }, [currentChecklist]);

  const groupedItems = useMemo(() => {
    const categoryOrder = ["documents", "clothing", "workout", "toiletries", "health", "tech", "activity", "family", "personal", "preDeparture"];
    const groups: Record<string, ChecklistItem[]> = {};
    currentChecklist.forEach(item => { if (!groups[item.category]) groups[item.category] = []; groups[item.category].push(item); });
    // Sort by category order
    const sortedGroups: Record<string, ChecklistItem[]> = {};
    categoryOrder.forEach(cat => { if (groups[cat]) sortedGroups[cat] = groups[cat]; });
    // Add any remaining categories not in the order
    Object.keys(groups).forEach(cat => { if (!sortedGroups[cat]) sortedGroups[cat] = groups[cat]; });
    return sortedGroups;
  }, [currentChecklist]);

  const styles = {
    container: { width: "100%", maxWidth: 600, margin: "0 auto", backgroundColor: COLORS.bg, fontFamily: "'Inter', sans-serif", padding: 20, boxSizing: "border-box" as const },
    card: { backgroundColor: COLORS.card, borderRadius: 24, padding: 24, boxShadow: "0 10px 40px -10px rgba(0,0,0,0.08)", marginBottom: 20, width: "100%", boxSizing: "border-box" as const },
    label: { fontWeight: 600, color: COLORS.textMain, fontSize: 15, marginBottom: 8, display: "block" },
    input: { width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 16, backgroundColor: COLORS.inputBg, color: COLORS.textMain, boxSizing: "border-box" as const, outline: "none" },
    select: { width: "100%", padding: "12px 16px", borderRadius: 12, border: `1px solid ${COLORS.border}`, fontSize: 16, backgroundColor: COLORS.inputBg, color: COLORS.textMain, cursor: "pointer", outline: "none" },
    footer: { display: "flex", justifyContent: "center", gap: 24, marginTop: 40, paddingTop: 24, borderTop: `1px solid ${COLORS.border}`, flexWrap: "wrap" as const },
    footerBtn: { display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", color: COLORS.textSecondary, fontSize: 14, fontWeight: 600, padding: 8 }
  };

  // Inject print styles
  useEffect(() => {
    const styleId = 'travel-checklist-print-styles';
    if (document.getElementById(styleId)) return;
    
    const printStyles = document.createElement('style');
    printStyles.id = styleId;
    printStyles.textContent = `
      @media print {
        /* Hide screen-only elements */
        .no-print, button, .footer-actions, [data-no-print] { display: none !important; }
        
        /* Reset page */
        body { background: white !important; margin: 0; padding: 0; }
        
        /* Hide the screen view */
        .screen-view { display: none !important; }
        
        /* Show print view */
        .print-view { display: block !important; }
        
        /* Print view styling */
        .print-view {
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 11px;
          color: #000;
          padding: 15px;
        }
        
        .print-header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        
        .print-header h1 {
          font-size: 18px;
          margin: 0 0 5px 0;
        }
        
        .print-header .trip-info {
          font-size: 12px;
          color: #555;
        }
        
        .print-columns {
          /* No special layout - sections stack vertically */
        }
        
        .print-category {
          margin-bottom: 12px;
          break-inside: avoid;
        }
        
        .print-category h2 {
          font-size: 11px;
          font-weight: 700;
          margin: 0 0 4px 0;
          padding-bottom: 2px;
          border-bottom: 1px solid #999;
          background: #f5f5f5;
          padding: 3px 5px;
        }
        
        .print-items {
          column-count: 4;
          column-gap: 10px;
        }
        
        /* Pre-departure section stays single column */
        .print-category.pre-departure .print-items {
          column-count: 2;
        }
        
        .print-item {
          display: flex;
          align-items: flex-start;
          gap: 4px;
          padding: 1px 0;
          font-size: 9px;
          break-inside: avoid;
          line-height: 1.3;
        }
        
        .print-checkbox {
          width: 12px;
          height: 12px;
          border: 1px solid #333;
          display: inline-block;
          flex-shrink: 0;
        }
        
        .print-checkbox.checked {
          background: #333;
        }
        
        .print-footer {
          margin-top: 8px;
          padding-top: 5px;
          border-top: 1px solid #ccc;
          text-align: center;
          font-size: 8px;
          color: #666;
          page-break-before: avoid;
          break-before: avoid;
        }

        @page {
          size: auto;
          margin: 8mm;
        }
        
        /* Prevent orphan elements creating new pages */
        .print-view * {
          orphans: 3;
          widows: 3;
        }
      }
      
      /* Hide print view on screen */
      @media screen {
        .print-view { display: none !important; }
      }
    `;
    document.head.appendChild(printStyles);
  }, []);

  return (
    <div style={styles.container}>
      {/* Screen view - hidden when printing */}
      <div className="screen-view">
      <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.textMain, marginBottom: 10 }}>✈️ Smart Travel Checklist</div>
      <div style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
        <Check size={16} color={COLORS.primary} /> Personalized packing lists powered by smart rules
      </div>

      {/* My Saved Checklists Section - at top, only when there are saved checklists */}
      {savedChecklists.length > 0 && (
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <div 
            onClick={() => setShowSavedList(!showSavedList)} 
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Heart size={20} color={COLORS.primary} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>My Saved Checklists</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "white", backgroundColor: COLORS.primary, padding: "2px 8px", borderRadius: 10 }}>{savedChecklists.length}</span>
            </div>
            {showSavedList ? <ChevronUp size={20} color={COLORS.textSecondary} /> : <ChevronDown size={20} color={COLORS.textSecondary} />}
          </div>
          
          {showSavedList && (
            <div style={{ marginTop: 16 }}>
              {savedChecklists.map(sc => (
                <div key={sc.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", backgroundColor: COLORS.inputBg, borderRadius: 12,
                  marginBottom: 8
                }}>
                  <div style={{ flex: 1, cursor: "pointer" }} onClick={() => loadSavedChecklist(sc)}>
                    <div style={{ fontWeight: 700, color: COLORS.textMain, fontSize: 14 }}>{sc.name}</div>
                    <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
                      📍 {sc.profile.destination} • 📅 {sc.profile.tripDuration} days • {sc.checklist.filter(i => i.checked).length}/{sc.checklist.length} packed
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>
                      Saved {new Date(sc.savedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={() => duplicateChecklist(sc)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "none", backgroundColor: COLORS.blue, color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Duplicate
                    </button>
                    <button 
                      onClick={() => deleteSavedChecklist(sc.id)}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "none", backgroundColor: COLORS.red, color: "white", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showBanner && (
        <div style={{ backgroundColor: COLORS.accentLight, borderRadius: 16, padding: 16, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.primaryDark }}>Get travel tips & packing hacks!</div>
          <button onClick={() => setShowSubscribeModal(true)} style={{ background: COLORS.primary, color: "white", border: "none", borderRadius: 24, padding: "10px 16px", fontWeight: 700, cursor: "pointer", marginRight: 24 }}><Mail size={14} /> Subscribe</button>
          <div style={{ position: "absolute", top: 8, right: 8, cursor: "pointer", color: COLORS.textSecondary }} onClick={() => { setShowBanner(false); localStorage.setItem(BANNER_STORAGE_KEY, Date.now().toString()); }}><X size={16} /></div>
        </div>
      )}

      {!checklistGenerated && (
        <div style={styles.card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.textMain, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><MapPin size={20} color={COLORS.primary} /> Trip Details</div>

          {/* Row 1: Destination + Trip Type */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Where are you going?</label>
              <DestinationAutocomplete value={profile.destination} onChange={(val) => setProfile(p => ({ ...p, destination: val }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Trip type</label>
              <div style={{ display: "flex", gap: 8 }}>
                <ToggleButton active={profile.isInternational} onClick={() => setProfile(p => ({ ...p, isInternational: true }))}><Plane size={16} /> International</ToggleButton>
                <ToggleButton active={!profile.isInternational} onClick={() => setProfile(p => ({ ...p, isInternational: false }))}><MapPin size={16} /> Domestic</ToggleButton>
              </div>
            </div>
          </div>

          {/* Row 2: Travel Dates */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={styles.label}><Calendar size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Dates of Travel</label>
              {(profile.startDate || profile.endDate) && (
                <button 
                  onClick={() => setProfile(p => ({ ...p, startDate: "", endDate: "" }))}
                  style={{ background: "none", border: "none", color: COLORS.textSecondary, fontSize: 12, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", gap: 4 }}
                >
                  <X size={14} /> Clear dates
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <input type="date" style={styles.input} value={profile.startDate} onChange={(e) => setProfile(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", alignItems: "center", color: COLORS.textSecondary }}>to</div>
              <div style={{ flex: 1 }}>
                <input type="date" style={styles.input} value={profile.endDate} min={profile.startDate || undefined} onChange={(e) => setProfile(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Weather Forecast Display */}
          {profile.destination && (
            <div style={{ 
              marginBottom: 20, 
              padding: 16, 
              borderRadius: 16, 
              background: weatherForecast 
                ? (weatherForecast.avgTemp >= 25 ? "linear-gradient(135deg, #FEF3C7, #FDE68A)" 
                  : weatherForecast.avgTemp >= 15 ? "linear-gradient(135deg, #D1FAE5, #A7F3D0)"
                  : weatherForecast.avgTemp >= 5 ? "linear-gradient(135deg, #DBEAFE, #BFDBFE)"
                  : "linear-gradient(135deg, #E0E7FF, #C7D2FE)")
                : COLORS.inputBg
            }}>
              {weatherLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textSecondary }}>
                  <Cloud size={18} /> Checking weather forecast...
                </div>
              ) : weatherForecast ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {weatherForecast.avgTemp >= 25 ? <Sun size={24} color="#F59E0B" /> 
                        : weatherForecast.avgTemp >= 15 ? <Cloud size={24} color="#10B981" />
                        : weatherForecast.avgTemp >= 5 ? <Cloud size={24} color="#3B82F6" />
                        : <Snowflake size={24} color="#6366F1" />}
                      <span style={{ fontSize: 18, fontWeight: 700 }}>{weatherForecast.conditions}</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 24, fontWeight: 800 }}>{weatherForecast.avgTemp}°C</div>
                      <div style={{ fontSize: 11, color: COLORS.textSecondary }}>
                        {Math.round(weatherForecast.avgTemp * 9/5 + 32)}°F
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 }}>
                    Low {weatherForecast.minTemp}°C / High {weatherForecast.maxTemp}°C • {weatherForecast.precipitation}% chance of rain
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>
                    💡 {weatherForecast.suggestion}
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: COLORS.textSecondary }}>
                  <Cloud size={18} /> Enter dates to see weather forecast
                </div>
              )}
            </div>
          )}

          {/* Row 3: Purpose + Luggage */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Purpose</label>
              <select style={styles.select} value={profile.purpose} onChange={(e) => setProfile(p => ({ ...p, purpose: e.target.value as TripPurpose }))}>
                <option value="leisure">🏖️ Leisure</option>
                <option value="business">💼 Business</option>
                <option value="adventure">🏔️ Adventure</option>
                <option value="beach">🏝️ Beach</option>
                <option value="city">🏙️ City</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}><Luggage size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Luggage</label>
              <select style={styles.select} value={profile.packingConstraint} onChange={(e) => setProfile(p => ({ ...p, packingConstraint: e.target.value as PackingConstraint }))}>
                <option value="carry_on_only">✋ Carry-on only</option>
                <option value="checked_bags">🧳 Checked bags</option>
                <option value="minimal">🎒 Minimal / backpack</option>
              </select>
            </div>
          </div>

          {/* Duration - only show if no dates entered */}
          {!(profile.startDate && profile.endDate) && (
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Duration: {profile.tripDuration} days</label>
              <input type="range" min={1} max={30} value={profile.tripDuration} onChange={(e) => setProfile(p => ({ ...p, tripDuration: parseInt(e.target.value) }))} style={{ width: "100%" }} />
            </div>
          )}

          {/* Travelers with gender */}
          <div style={{ marginBottom: 20 }}>
            <label style={styles.label}><Users size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Travelers</label>
            
            {/* Adults - always visible */}
            <div style={{ backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.textMain, marginBottom: 8 }}>Adults</div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>♂ Male</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => updateTravelerGender("adult", "male", Math.max(0, getTraveler("adult").male - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                    <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("adult").male}</span>
                    <button onClick={() => updateTravelerGender("adult", "male", getTraveler("adult").male + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                  <span style={{ fontSize: 13, color: COLORS.textSecondary }}>♀ Female</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => updateTravelerGender("adult", "female", Math.max(0, getTraveler("adult").female - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                    <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("adult").female}</span>
                    <button onClick={() => updateTravelerGender("adult", "female", getTraveler("adult").female + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Children / Infants / Pets - compact row with Add buttons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              {/* Children */}
              <div 
                onClick={() => !expandedTravelers.children && setExpandedTravelers(p => ({ ...p, children: true }))}
                style={{ 
                  flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 10, padding: "10px 12px", 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: expandedTravelers.children ? "default" : "pointer",
                  border: (getTraveler("child").male + getTraveler("child").female) > 0 ? `2px solid ${COLORS.primary}` : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Users size={14} color={COLORS.primary} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Children</span>
                  {(getTraveler("child").male + getTraveler("child").female) > 0 && (
                    <span style={{ backgroundColor: COLORS.primary, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                      {getTraveler("child").male + getTraveler("child").female}
                    </span>
                  )}
                </div>
                {!expandedTravelers.children && <Plus size={14} color={COLORS.primary} />}
                {expandedTravelers.children && <X size={14} color={COLORS.textSecondary} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setExpandedTravelers(p => ({ ...p, children: false })); }} />}
              </div>

              {/* Infants */}
              <div 
                onClick={() => !expandedTravelers.infants && setExpandedTravelers(p => ({ ...p, infants: true }))}
                style={{ 
                  flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 10, padding: "10px 12px", 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: expandedTravelers.infants ? "default" : "pointer",
                  border: (getTraveler("infant").male + getTraveler("infant").female) > 0 ? `2px solid ${COLORS.primary}` : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Baby size={14} color={COLORS.primary} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Infants</span>
                  {(getTraveler("infant").male + getTraveler("infant").female) > 0 && (
                    <span style={{ backgroundColor: COLORS.primary, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                      {getTraveler("infant").male + getTraveler("infant").female}
                    </span>
                  )}
                </div>
                {!expandedTravelers.infants && <Plus size={14} color={COLORS.primary} />}
                {expandedTravelers.infants && <X size={14} color={COLORS.textSecondary} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setExpandedTravelers(p => ({ ...p, infants: false })); }} />}
              </div>

              {/* Pets */}
              <div 
                onClick={() => !expandedTravelers.pets && setExpandedTravelers(p => ({ ...p, pets: true }))}
                style={{ 
                  flex: 1, backgroundColor: COLORS.inputBg, borderRadius: 10, padding: "10px 12px", 
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  cursor: expandedTravelers.pets ? "default" : "pointer",
                  border: (getTraveler("pet").male + getTraveler("pet").female) > 0 ? `2px solid ${COLORS.primary}` : "none"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Dog size={14} color={COLORS.primary} />
                  <span style={{ fontWeight: 600, fontSize: 12 }}>Pets</span>
                  {(getTraveler("pet").male + getTraveler("pet").female) > 0 && (
                    <span style={{ backgroundColor: COLORS.primary, color: "white", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 10 }}>
                      {getTraveler("pet").male + getTraveler("pet").female}
                    </span>
                  )}
                </div>
                {!expandedTravelers.pets && <Plus size={14} color={COLORS.primary} />}
                {expandedTravelers.pets && <X size={14} color={COLORS.textSecondary} style={{ cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setExpandedTravelers(p => ({ ...p, pets: false })); }} />}
              </div>
            </div>

            {/* Children expanded */}
            {expandedTravelers.children && (
              <div style={{ backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>♂ Boys</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => updateTravelerGender("child", "male", Math.max(0, getTraveler("child").male - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("child").male}</span>
                      <button type="button" onClick={() => updateTravelerGender("child", "male", getTraveler("child").male + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>♀ Girls</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => updateTravelerGender("child", "female", Math.max(0, getTraveler("child").female - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("child").female}</span>
                      <button type="button" onClick={() => updateTravelerGender("child", "female", getTraveler("child").female + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Infants expanded */}
            {expandedTravelers.infants && (
              <div style={{ backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>♂ Boys</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => updateTravelerGender("infant", "male", Math.max(0, getTraveler("infant").male - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("infant").male}</span>
                      <button type="button" onClick={() => updateTravelerGender("infant", "male", getTraveler("infant").male + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: COLORS.textSecondary }}>♀ Girls</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => updateTravelerGender("infant", "female", Math.max(0, getTraveler("infant").female - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("infant").female}</span>
                      <button type="button" onClick={() => updateTravelerGender("infant", "female", getTraveler("infant").female + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pets expanded - Dogs & Cats */}
            {expandedTravelers.pets && (
              <div style={{ backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Dog size={14} color={COLORS.textSecondary} />
                      <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Dogs</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => updateTravelerGender("pet", "male", Math.max(0, getTraveler("pet").male - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("pet").male}</span>
                      <button type="button" onClick={() => updateTravelerGender("pet", "male", getTraveler("pet").male + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", padding: "8px 12px", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Cat size={14} color={COLORS.textSecondary} />
                      <span style={{ fontSize: 13, color: COLORS.textSecondary }}>Cats</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" onClick={() => updateTravelerGender("pet", "female", Math.max(0, getTraveler("pet").female - 1))} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>-</button>
                      <span style={{ fontWeight: 700, minWidth: 16, textAlign: "center" }}>{getTraveler("pet").female}</span>
                      <button type="button" onClick={() => updateTravelerGender("pet", "female", getTraveler("pet").female + 1)} style={{ width: 24, height: 24, borderRadius: 6, border: "none", backgroundColor: COLORS.inputBg, color: COLORS.primary, cursor: "pointer" }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Callout for multiple travelers */}
            {individuals.length > 1 && (
              <div style={{ 
                marginTop: 12, 
                padding: "10px 14px", 
                backgroundColor: COLORS.accentLight, 
                borderRadius: 10,
                display: "flex", 
                alignItems: "center", 
                gap: 8 
              }}>
                <Info size={16} color={COLORS.primary} />
                <span style={{ fontSize: 13, color: COLORS.primaryDark }}>
                  In the next step, you can customize preferences for each traveler
                </span>
              </div>
            )}
          </div>

          {/* Personal Notes - only show for single traveler */}
          {individuals.length <= 1 && (
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}><PenLine size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Tell us about yourself</label>
              <textarea
                value={profile.personalNotes}
                onChange={(e) => setProfile(p => ({ ...p, personalNotes: e.target.value }))}
                placeholder="E.g., I always travel with my Kindle, I'm a light sleeper, I need my workout gear, I get motion sick..."
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  border: `1px solid ${COLORS.border}`, fontSize: 14,
                  backgroundColor: COLORS.inputBg, color: COLORS.textMain,
                  boxSizing: "border-box", outline: "none", minHeight: 80, resize: "vertical",
                  fontFamily: "inherit", lineHeight: 1.5
                }}
              />
              <div style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 6 }}>
                We'll suggest items based on your preferences
              </div>
            </div>
          )}

          {/* Traveler Presets - only show for single traveler */}
          {individuals.length <= 1 && (
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>🎯 I'm a...</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {Object.entries(TRAVELER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePreset(key)}
                    style={{
                      padding: "12px 14px", borderRadius: 12,
                      border: profile.presets.includes(key) ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`,
                      backgroundColor: profile.presets.includes(key) ? COLORS.accentLight : "white",
                      color: profile.presets.includes(key) ? COLORS.primaryDark : COLORS.textSecondary,
                      fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                    }}
                  >
                    {preset.icon} {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleGenerate} disabled={!profile.destination} style={{
            width: "100%", padding: 16, borderRadius: 16, border: "none",
            backgroundColor: profile.destination ? COLORS.primary : COLORS.border,
            color: profile.destination ? "white" : COLORS.textSecondary,
            fontSize: 18, fontWeight: 800, cursor: profile.destination ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10
          }}><Package size={22} /> Generate Packing List</button>
        </div>
      )}

      {checklistGenerated && (
        <div>
          <div style={{ ...styles.card, background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, opacity: 0.9, marginBottom: 4 }}>Trip to</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{profile.destination}</div>
              </div>
              <button onClick={() => setChecklistGenerated(false)} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "8px 12px", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, opacity: 0.9, alignItems: "center" }}>
              <span>📅 {profile.tripDuration} days</span>
              <span>{profile.isInternational ? "✈️ International" : "🚗 Domestic"}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {getTraveler("adult").male > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, backgroundColor: "#E3F4FC", padding: "2px 8px", borderRadius: 10, color: "#1a365d" }}><span>👨</span> {getTraveler("adult").male}</span>}
                {getTraveler("adult").female > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, backgroundColor: "#FCE4EC", padding: "2px 8px", borderRadius: 10, color: "#831843" }}><span>👩</span> {getTraveler("adult").female}</span>}
                {getTraveler("child").male > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, backgroundColor: "#E3F4FC", padding: "2px 8px", borderRadius: 10, color: "#1a365d" }}><span>👦</span> {getTraveler("child").male}</span>}
                {getTraveler("child").female > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, backgroundColor: "#FCE4EC", padding: "2px 8px", borderRadius: 10, color: "#831843" }}><span>👧</span> {getTraveler("child").female}</span>}
                {getTraveler("infant").male + getTraveler("infant").female > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>👶 {getTraveler("infant").male + getTraveler("infant").female}</span>}
                {getTraveler("pet").male > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>🐕 {getTraveler("pet").male}</span>}
                {getTraveler("pet").female > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>🐈 {getTraveler("pet").female}</span>}
              </span>
              <button onClick={() => { trackEvent("widget_print_share", { destination: profile.destination }); window.print(); }} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 8, padding: "6px 10px", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

          {/* Content section starts here - scroll target */}
          <div id="checklist-content-section">

          {/* Traveler Tabs - only show if multiple travelers */}
          {individuals.length > 1 && (
            <div style={{ ...styles.card, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 8, textTransform: "uppercase" }}>Packing For</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {individuals.map(t => {
                  const genderColor = t.gender === "female" ? "#FFB6C1" : "#89CFF0"; // Pink for female, baby blue for male
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTab(t.id)}
                      style={{
                        padding: "8px 16px", borderRadius: 20, 
                        border: selectedTab === t.id ? `2px solid ${t.gender === "female" ? "#FF69B4" : "#4A90D9"}` : "none",
                        backgroundColor: selectedTab === t.id ? genderColor : COLORS.inputBg,
                        color: COLORS.textMain,
                        fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6
                      }}
                    >
                      {t.type === "adult" ? (t.gender === "female" ? "👩" : "👨") : 
                       t.type === "child" ? (t.gender === "female" ? "👧" : "👦") : "👶"}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-individual Notes & Presets - only show when multiple travelers */}
          {individuals.length > 1 && selectedTab !== "shared" && (
            <div style={{ ...styles.card, padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 14, marginBottom: 8, display: "block" }}>
                  <PenLine size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />
                  About {individuals.find(t => t.id === selectedTab)?.label || "this traveler"}
                </label>
                <textarea
                  value={getIndividualPrefs(selectedTab).notes}
                  onChange={(e) => updateIndividualNotes(selectedTab, e.target.value)}
                  placeholder="E.g., I always travel with my Kindle, I'm a light sleeper..."
                  style={{
                    width: "100%", padding: "12px 16px", borderRadius: 12,
                    border: `1px solid ${COLORS.border}`, fontSize: 14,
                    backgroundColor: COLORS.inputBg, color: COLORS.textMain,
                    minHeight: 60, resize: "vertical", boxSizing: "border-box",
                    fontFamily: "inherit", lineHeight: 1.5
                  }}
                />
              </div>
              <div>
                <label style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 14, marginBottom: 8, display: "block" }}>🎯 Travel Style</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {Object.entries(TRAVELER_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleIndividualPreset(selectedTab, key)}
                      style={{
                        padding: "10px 12px", borderRadius: 20, border: "none",
                        backgroundColor: getIndividualPrefs(selectedTab).presets.includes(key) ? COLORS.primary : COLORS.inputBg,
                        color: getIndividualPrefs(selectedTab).presets.includes(key) ? "white" : COLORS.textSecondary,
                        fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                      }}
                    >
                      {preset.icon} {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shared Preset Toggles - only when single traveler or shared tab */}
          {(individuals.length <= 1 || selectedTab === "shared") && (
            <div style={{ ...styles.card, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, marginBottom: 10, textTransform: "uppercase" }}>🎯 Travel Style</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {Object.entries(TRAVELER_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePreset(key)}
                    style={{
                      padding: "10px 12px", borderRadius: 20, border: "none",
                      backgroundColor: profile.presets.includes(key) ? COLORS.primary : COLORS.inputBg,
                      color: profile.presets.includes(key) ? "white" : COLORS.textSecondary,
                      fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4
                    }}
                  >
                    {preset.icon} {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div id="progress-section" style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Progress</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.primary }}>{progress.checked}/{progress.total}</div>
            </div>
            <div style={{ height: 12, backgroundColor: COLORS.inputBg, borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", backgroundColor: progress.percent === 100 ? COLORS.primary : COLORS.blue, borderRadius: 6, width: `${progress.percent}%`, transition: "width 0.3s" }} />
            </div>
            {progress.percent === 100 && <div style={{ textAlign: "center", marginTop: 12, color: COLORS.primary, fontWeight: 700 }}>🎉 All packed!</div>}
          </div>

          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} style={styles.card}>
              <div onClick={() => toggleCategory(category)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", marginBottom: expandedCategories[category] ? 16 : 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{CATEGORY_INFO[category]?.name || category}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.textSecondary, backgroundColor: COLORS.inputBg, padding: "4px 8px", borderRadius: 12 }}>{items.filter(i => i.checked).length}/{items.length}</span>
                </div>
                {expandedCategories[category] ? <ChevronUp size={20} color={COLORS.textSecondary} /> : <ChevronDown size={20} color={COLORS.textSecondary} />}
              </div>
              {expandedCategories[category] && (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ width: "calc(50% - 4px)" }}>
                        <ChecklistItemRow item={item} onToggle={() => toggleItem(item.id)} onRemove={() => removeItem(item.id)} />
                      </div>
                    ))}
                  </div>
                  <AddItemInput category={category} onAdd={(name, qty) => addItem(category, name, qty)} />
                </>
              )}
            </div>
          ))}

          {/* Save Checklist Button */}
          <button onClick={() => openSaveModal()} style={{
            width: "100%", padding: 16, borderRadius: 16, border: "none",
            background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.primaryDark})`,
            color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)", marginTop: 8
          }}>
            <Heart size={20} /> Save This Checklist
          </button>
          </div>{/* End checklist-content-section */}
        </div>
      )}

      {!checklistGenerated && (
        <div style={{ ...styles.card, textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧳</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Enter Your Trip Details</div>
          <div style={{ fontSize: 14, color: COLORS.textSecondary }}>Fill in the form above to generate a personalized packing checklist</div>
        </div>
      )}

      <div style={{ backgroundColor: COLORS.orangeLight, borderRadius: 16, padding: 16, marginTop: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Info size={20} color={COLORS.orange} style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 12, color: COLORS.orange, lineHeight: 1.6 }}>
          <strong>Note:</strong> This checklist is generated based on your trip profile. Always verify items based on your specific needs and destination requirements.
        </div>
      </div>


      {/* Save Modal */}
      {showSaveModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "flex-start", justifyContent: "center", paddingTop: "20px", zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white", borderRadius: 20, padding: 24,
            width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.3)", marginTop: 0
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                {editingChecklistId ? "Update Checklist" : "Save Checklist"}
              </h3>
              <button onClick={() => { setShowSaveModal(false); setSaveChecklistName(""); setEditingChecklistId(null); }} style={{
                background: "none", border: "none", cursor: "pointer", padding: 4
              }}><X size={20} color={COLORS.textSecondary} /></button>
            </div>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontWeight: 600, color: COLORS.textMain, fontSize: 14, marginBottom: 8, display: "block" }}>
                Checklist Name
              </label>
              <input
                type="text"
                value={saveChecklistName}
                onChange={(e) => setSaveChecklistName(e.target.value)}
                placeholder="e.g., Paris Summer 2024"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveChecklist()}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  border: `1px solid ${COLORS.border}`, fontSize: 16,
                  backgroundColor: COLORS.inputBg, outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            
            <div style={{ display: "flex", gap: 12 }}>
              <button 
                onClick={() => { setShowSaveModal(false); setSaveChecklistName(""); setEditingChecklistId(null); }}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12, border: `1px solid ${COLORS.border}`,
                  backgroundColor: "white", color: COLORS.textMain, fontSize: 14, fontWeight: 600, cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveChecklist}
                disabled={!saveChecklistName.trim()}
                style={{
                  flex: 1, padding: "12px 16px", borderRadius: 12, border: "none",
                  backgroundColor: saveChecklistName.trim() ? COLORS.primary : COLORS.border,
                  color: saveChecklistName.trim() ? "white" : COLORS.textSecondary,
                  fontSize: 14, fontWeight: 600, cursor: saveChecklistName.trim() ? "pointer" : "not-allowed"
                }}
              >
                {editingChecklistId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.footer} className="no-print">
        <button style={styles.footerBtn} onClick={resetAll}><RotateCcw size={16} /> Reset</button>
        <button style={styles.footerBtn}><Heart size={16} /> Donate</button>
        <button style={styles.footerBtn} onClick={() => setShowFeedbackModal(true)}><MessageSquare size={16} /> Feedback</button>
        <button style={styles.footerBtn} onClick={() => { trackEvent("widget_print_share", { destination: profile.destination }); window.print(); }}><Printer size={16} /> Print</button>
      </div>
      </div>{/* End screen-view */}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "flex-start", justifyContent: "center", paddingTop: "20px", zIndex: 1000
        }} onClick={() => setShowFeedbackModal(false)}>
          <div style={{
            backgroundColor: "white", borderRadius: 16, padding: 24, width: "90%", maxWidth: 400, marginTop: 0
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Feedback</h3>
              <button onClick={() => setShowFeedbackModal(false)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 4
              }}><X size={20} color={COLORS.textSecondary} /></button>
            </div>
            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 16 }}>
              Help us improve the travel checklist.
            </p>
            {feedbackStatus === "success" ? (
              <div style={{ textAlign: "center", padding: 20, color: COLORS.primary, fontWeight: 600 }}>
                Thanks for your feedback!
              </div>
            ) : (
              <>
                <textarea
                  style={{ ...styles.input, height: 120, resize: "none", fontFamily: "inherit" }}
                  placeholder="Tell us what you think..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
                {feedbackStatus === "error" && (
                  <div style={{ color: "#EF4444", fontSize: 14, marginTop: 8, marginBottom: 8 }}>
                    Failed to send. Please try again.
                  </div>
                )}
                <button
                  style={{
                    width: "100%", marginTop: 12, padding: "14px 16px", borderRadius: 12, border: "none",
                    backgroundColor: feedbackText.trim() ? COLORS.primary : COLORS.border,
                    color: "white", fontSize: 14, fontWeight: 600,
                    cursor: feedbackText.trim() ? "pointer" : "not-allowed"
                  }}
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

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)", display: "flex",
          alignItems: "flex-start", justifyContent: "center", paddingTop: "20px", zIndex: 1000
        }} onClick={() => setShowSubscribeModal(false)}>
          <div style={{
            backgroundColor: "white", borderRadius: 16, padding: 24, width: "90%", maxWidth: 400, marginTop: 0
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Sign Up For Travel Tips</h3>
              <button onClick={() => setShowSubscribeModal(false)} style={{
                background: "none", border: "none", cursor: "pointer", padding: 4
              }}><X size={20} color={COLORS.textSecondary} /></button>
            </div>
            <p style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 }}>
              Get personalized packing tips and travel hacks.
            </p>
            {subscribeStatus === "success" ? (
              <div style={{ textAlign: "center", padding: 20, color: COLORS.primary, fontWeight: 600 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                {subscribeMessage}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 14, fontWeight: 600, marginBottom: 8, color: COLORS.textMain }}>Email Address</label>
                  <input
                    style={styles.input}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                {subscribeStatus === "error" && (
                  <div style={{ color: "#EF4444", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
                    {subscribeMessage}
                  </div>
                )}
                <button
                  style={{
                    width: "100%", padding: "14px 16px", borderRadius: 12, border: "none",
                    backgroundColor: COLORS.primary, color: "white", fontSize: 14, fontWeight: 600,
                    cursor: subscribeStatus === "loading" ? "wait" : "pointer"
                  }}
                  onClick={handleSubscribe}
                  disabled={subscribeStatus === "loading"}
                >
                  {subscribeStatus === "loading" ? "Subscribing..." : "Subscribe"}
                </button>
                <div style={{ fontSize: 11, color: COLORS.textSecondary, textAlign: "center", marginTop: 12, lineHeight: 1.4 }}>
                  By subscribing, you agree to receive emails. Unsubscribe anytime.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Print-only view - hidden on screen, shown when printing */}
      {checklistGenerated && (
        <div className="print-view">
          <div className="print-header">
            <h1>✈️ Travel Checklist {profile.startDate && profile.endDate ? 
              `${new Date(profile.startDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })} - ${new Date(profile.endDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}` 
              : ''}</h1>
            <div className="trip-info">
              <strong>{profile.destination}</strong> • {profile.tripDuration} days • {profile.isInternational ? "International" : "Domestic"}
              {weatherForecast && ` • ${weatherForecast.avgTemp}°C ${weatherForecast.conditions}`}
            </div>
          </div>
          
          <div className="print-columns">
            {Object.entries(groupedItems).map(([category, items]) => (
              <div key={category} className={`print-category ${category === 'preDeparture' ? 'pre-departure' : ''}`}>
                <h2>{CATEGORY_INFO[category]?.name || category}</h2>
                <div className="print-items">
                  {items.map((item) => (
                    <div key={item.id} className="print-item">
                      <span className={`print-checkbox ${item.checked ? 'checked' : ''}`}></span>
                      <span>{item.name}{item.quantity && Number(item.quantity) > 1 ? ` (×${item.quantity})` : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="print-footer">
            Generated by Smart Travel Checklist • {progress.checked}/{progress.total} items packed
          </div>
        </div>
      )}
    </div>
  );
}
