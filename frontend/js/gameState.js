window.saveData = JSON.parse(localStorage.getItem("procoon_save"));

if (!window.saveData) {
    showAlertModal("No save data found", "Missing Save").then(() => location.href = "mainmenu.html");
    throw new Error("Missing save data");
}

saveData.version ??= 1;

if (saveData.version < 2) {
    saveData.land.sellQueue ??= [];
    saveData.assets.forEach(a => a.finance ??= { mode: "idle" });
    saveData.version = 2;
}

// INIT MARKET
if (!saveData.market) {
    saveData.market = {
        cycle: "expansion",
        cycleStart: new Date(2026, 0, 1).toISOString(),
        durationMonths: 24,
        volatility: 0.02
    };
}

// INIT PRICE CACHE
saveData.landPriceCache ??= {};

// ===============================
// CITY CONFIG (LAND MARKET)
// ===============================
window.CITY_CONFIG = {

  // ===== METRO =====
  jakarta: {
  name: "Jakarta",
  basePrice: 42_000_000, // REALISTIC CORE
  demand: 1.2,
  volatility: 0.06,
  tier: "metro"
},
  surabaya: {
  name: "Surabaya",
  basePrice: 18_000_000,
  demand: 1.05,
  volatility: 0.05,
  tier: "metro"
},

bandung: {
  name: "Bandung",
  basePrice: 16_000_000,
  demand: 1.0,
  volatility: 0.05,
  tier: "metro"
},

medan: {
  name: "Medan",
  basePrice: 14_000_000,
  demand: 0.95,
  volatility: 0.05,
  tier: "metro"
},

batam: {
  name: "Batam",
  basePrice: 22_000_000,
  demand: 1.1,
  volatility: 0.07,
  tier: "metro"
},

  // ===== PREMIUM =====
  bali: {
  name: "Bali",
  basePrice: 28_000_000,
  demand: 1.25,
  volatility: 0.07,
  tier: "premium"
},
  lombok:  { name: "Lombok",  basePrice: 11_000_000, demand: 1.05, volatility: 0.08, tier: "premium" },

  // ===== GROWTH =====
  semarang:{ name: "Semarang",basePrice: 7_500_000,  demand: 0.95, volatility: 0.05, tier: "growth" },
  yogyakarta:{name:"Yogyakarta",basePrice:7_000_000,demand:1.0,volatility:0.05,tier:"growth"},
  malang:  { name: "Malang",  basePrice: 6_500_000,  demand: 0.95, volatility: 0.05, tier: "growth" },
  solo:    { name: "Solo",    basePrice: 5_500_000,  demand: 0.9,  volatility: 0.04, tier: "growth" },
  palembang:{name:"Palembang",basePrice:6_800_000,demand:0.9,volatility:0.05,tier:"growth"},
  pontianak:{name:"Pontianak",basePrice:6_200_000,demand:0.9,volatility:0.05,tier:"growth"},
  banjarmasin:{name:"Banjarmasin",basePrice:6_500_000,demand:0.9,volatility:0.05,tier:"growth"},
  manado:  { name: "Manado",  basePrice: 7_200_000,  demand: 0.95, volatility: 0.06, tier: "growth" },

  // ===== FRONTIER (HIGH RISK) =====
  makassar:{ name: "Makassar",basePrice: 7_000_000,  demand: 0.9,  volatility: 0.07, tier: "frontier" },
  timika:  { name: "Timika",  basePrice: 25_000_000, demand: 1.30, volatility: 0.20, tier: "frontier" },
  sorong:  { name: "Sorong",  basePrice: 12_000_000, demand: 1.10, volatility: 0.15, tier: "frontier" },
  ambon:   { name: "Ambon",   basePrice: 6_000_000,  demand: 0.85, volatility: 0.08, tier: "frontier" },
  jayapura:{ name: "Jayapura",basePrice: 9_000_000,  demand: 1.0,  volatility: 0.12, tier: "frontier" },

  // ===== RURAL / LOW DEMAND =====
  pidie:   { name: "Pidie",   basePrice: 2_000_000,  demand: 0.8,  volatility: 0.04, tier: "rural" },
  garut:   { name: "Garut",   basePrice: 3_500_000,  demand: 0.85, volatility: 0.04, tier: "rural" },
  banyuwangi:{name:"Banyuwangi",basePrice:4_000_000,demand:0.9,volatility:0.04,tier:"rural"},
  wonosobo:{ name:"Wonosobo", basePrice:3_200_000,demand:0.8,volatility:0.03,tier:"rural"},
  parepare:{ name:"Parepare", basePrice:4_500_000,demand:0.85,volatility:0.04,tier:"rural"},
  lubuklinggau:{name:"Lubuk Linggau",basePrice:3_800_000,demand:0.85,volatility:0.04,tier:"rural"},
  lhokseumawe:{name:"Lhokseumawe",basePrice:4_200_000,demand:0.9,volatility:0.05,tier:"rural"},
  tegal:   { name: "Tegal",   basePrice: 4_000_000,  demand: 0.9,  volatility: 0.04, tier: "rural" }
};


if (!saveData.landPriceCache) {
    saveData.landPriceCache = {};
}


const RENT_MARKET_CONFIG = {

    // =====================
    // HOUSE (MONTHLY RENT)
    // =====================
    "House-Low": {
        min: 10000000,
        max: 16000000,
        maintenance: 1500000,
        baseDemand: 0.85
    },
    "House-Middle": {
        min: 18000000,
        max: 28000000,
        maintenance: 2500000,
        baseDemand: 0.75
    },
    "House-High": {
        min: 30000000,
        max: 45000000,
        maintenance: 4000000,
        baseDemand: 0.6
    },

    // =====================
    // SHOPHOUSE (MONTHLY RENT)
    // =====================
    "ShopHouse-Standard": {
        min: 15000000,
        max: 25000000,
        maintenance: 3500000,
        baseDemand: 0.7
    },
    "ShopHouse-Prime": {
        min: 25000000,
        max: 40000000,
        maintenance: 5000000,
        baseDemand: 0.6
    },
    "ShopHouse-Premium": {
        min: 55000000,
        max: 75000000,
        maintenance: 7000000,
        baseDemand: 0.5
    },

    // =====================
    // APARTMENT (MONTHLY / UNIT)
    // =====================
    "Apartment-Studio": {
        min: 6000000,
        max: 9000000,
        maintenance: 1200000,
        baseDemand: 0.9
    },
    "Apartment-2BR": {
        min: 11000000,
        max: 18000000,
        maintenance: 1800000,
        baseDemand: 0.75
    },
    "Apartment-Penthouse": {
        min: 30000000,
        max: 48000000,
        maintenance: 3500000,
        baseDemand: 0.45
    }
};

window.MARKET_CYCLE_CONFIG = {
    normal: {
    sellMultiplier: 1.0,
    demand: 1.0,
    quickSellDiscount: [0.08, 0.10],
    premiumBonus: [0.06, 0.10]
    },
    boom: {
        sellMultiplier: 1.12,
        demand: 1.15,
        quickSellDiscount: [0.07, 0.09],
        premiumBonus: [0.10, 0.15]
    },
    expansion: {
        sellMultiplier: 1.05,
        demand: 1.0,
        quickSellDiscount: [0.08, 0.10],
        premiumBonus: [0.08, 0.12]
    },
    stagnant: {
        sellMultiplier: 1.0,
        demand: 0.9,
        quickSellDiscount: [0.09, 0.11],
        premiumBonus: [0.05, 0.08]
    },
    recession: {
        sellMultiplier: 0.85,
        demand: 0.7,
        quickSellDiscount: [0.11, 0.14],
        premiumBonus: [0.03, 0.06]
    }
};

// ===============================
// LAND PRICE ENGINE (STABLE)
// ===============================
window.getLandPriceDetail = function (cityId) {
    const city = CITY_CONFIG[cityId];
    if (!city || !window.gameTime) return null;

    saveData.landPriceCache ??= {};

    const year = window.gameTime.getFullYear();
    const month = window.gameTime.getMonth();
    const monthKey = `${year}-${month}`;

    saveData.landPriceCache[cityId] ??= {};

    // 🔒 RETURN CACHED MONTHLY PRICE
    if (saveData.landPriceCache[cityId][monthKey]) {
        return saveData.landPriceCache[cityId][monthKey];
    }

    let price = city.basePrice;

    // ===== DEMAND (VERY SOFT) =====
    // demand 0.8 – 1.3 → effect max ±5%
    price *= 1 + (city.demand - 1) * 0.25;

    // ===== MARKET CYCLE (DAMPENED) =====
    const cycle =
        MARKET_CYCLE_CONFIG[saveData.market?.cycle] ||
        MARKET_CYCLE_CONFIG.normal;

    // sellMultiplier 0.85 – 1.12 → real effect ±4%
    price *= 1 + (cycle.sellMultiplier - 1) * 0.3;

    // ===== MONTHLY VOLATILITY (NOT DAILY) =====
    // volatility = yearly volatility
    const monthlyVol = city.volatility / 12;
    price *= 1 + randomRange(-monthlyVol, monthlyVol);

    price = Math.floor(price);

    const result = {
        basePrice: city.basePrice,
        finalPrice: price,
        year,
        month,
        cycle: saveData.market?.cycle || "normal"
    };

    saveData.landPriceCache[cityId][monthKey] = result;
    return result;
};



function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

window._dailyHandlers ||= [];

window.registerDailyHandler = function (fn) {
    window._dailyHandlers.push(fn);
};

// ===============================
// GAME CORE — DAILY UPDATE (FINAL)
// ===============================
window.onNewGameDay = function () {
    window._dailyHandlers.forEach(fn => fn());

    // DAILY RESET (ONLY RESET ENTRY POINT)
    saveData.finance.dailyIncome = 0;
    saveData.finance.dailyExpense = 0;
    saveData.finance.assetIncome = [];

    // ===== MONTHLY OCCUPANCY UPDATE (CHECK MONTH CHANGE) =====
    const currentMonth = window.gameTime.getMonth();
    const currentYear = window.gameTime.getFullYear();
    const monthKey = `${currentYear}-${currentMonth}`;

    if (saveData._lastOccupancyMonth !== monthKey) {
        saveData._lastOccupancyMonth = monthKey;
        updateMonthlyOccupancy();
    }

    if (!Array.isArray(saveData.assets)) return;

    saveData.assets.forEach(asset => {
        if (asset.finance?.mode !== "rented") return;

        const key = `${asset.name}-${asset.variant}`;
        const cfg = RENT_MARKET_CONFIG[key];
        if (!cfg) return;

        const price = asset.finance.rentPrice;

        // ⚠️ OCCUPANCY IS ALREADY UPDATED WHEN MONTH CHANGES
        // No need to recalculate again here

        const dailyRent = Math.floor(price / 30);
        const income = asset.finance.occupiedUnits * dailyRent;

        let maintenanceRate = 0.25;
        if (asset.name === "ShopHouse") maintenanceRate = 0.3;
        if (asset.name === "Apartment") maintenanceRate = 0.35;

        const maintenance = asset.units * Math.floor(dailyRent * maintenanceRate);

        saveData.finance.dailyIncome += income;
        saveData.finance.dailyExpense += maintenance;

        saveData.finance.assetIncome.push({
            name: asset.name,
            variant: asset.variant,
            income,
            source: "rent",
            period: "daily"
        });
    });

    // ===============================
    // LOAN SYSTEM: HYBRID AUTO-PAY WITH BUFFER
    // ===============================
    if (Array.isArray(saveData.finance.loans)) {
      saveData.finance.loans.forEach(loan => {
        if (loan.status !== "active") return;

        const today = new Date(window.gameTime);
        const due = new Date(loan.nextDueDate);

        // Defensive defaults for older saves
        if (typeof loan.monthlyRate !== 'number') {
            if (typeof loan.annualRate === 'number') loan.monthlyRate = loan.annualRate / 12;
            else if (typeof loan.rate === 'number') loan.monthlyRate = loan.rate;
            else loan.monthlyRate = 0;
        }
        if (typeof loan.autoPayEnabled !== 'boolean') loan.autoPayEnabled = false;
        if (typeof loan.reminderSent !== 'boolean') loan.reminderSent = false;

        // ===============================
        // 🔔 REMINDER 3 DAYS BEFORE DUE
        // ===============================
        const daysLeft = Math.ceil((due - today) / 86400000);
        if (daysLeft === 3 && !loan.reminderSent) {
          showToast(
            `⏰ Loan payment due in 3 days (${formatRupiah(
              loan.monthlyInstallment
            )})`,
            "warning",
            4000
          );
          loan.reminderSent = true;
        }

        if (today < due) {
          return;
        }

        // Reset reminder flag on due date
        loan.reminderSent = false;

        // ===============================
        // AUTO-PAY LOGIC (if enabled)
        // ===============================
        if (loan.autoPayEnabled && today.getDate() === 5) {
          const paidKey = `${today.getFullYear()}-${today.getMonth()}`;
          if (loan.lastPaidMonth === paidKey) return; // already paid this month

          // Buffer check: cash >= installment + (3× daily income)
          const dailyIncome = saveData.finance.dailyIncome || 0;
          const buffer = dailyIncome * 3;
          const safeBalance = loan.monthlyInstallment + buffer;

          if (saveData.finance.cash >= safeBalance) {
            // Safe auto-pay
            saveData.finance.cash -= loan.monthlyInstallment;

            const interest = Math.floor(
                loan.outstandingPrincipal * (loan.monthlyRate || 0)
            );
            const principalPaid = loan.monthlyInstallment - interest;

            loan.outstandingPrincipal -= principalPaid;
            loan.remainingMonths--;
            loan.lastPaidMonth = paidKey;

            const nextDue = new Date(due);
            nextDue.setMonth(nextDue.getMonth() + 1);
            nextDue.setDate(5);
            loan.nextDueDate = nextDue.toISOString();

            saveData.finance.history.push({
              date: today.toDateString(),
              income: 0,
              expense: loan.monthlyInstallment,
              net: -loan.monthlyInstallment,
              note: `Auto-Pay Loan #${loan.id.substr(-4)} (principal ${formatRupiah(principalPaid)}, interest ${formatRupiah(interest)})`
            });

            if (loan.remainingMonths <= 0 || loan.outstandingPrincipal <= 0) {
              loan.status = "paid";
              loan.outstandingPrincipal = 0;
              showToast(`✅ Loan #${loan.id.substr(-4)} fully paid (auto)`, "success");
            } else {
              showToast(`💳 Auto-Pay: Loan #${loan.id.substr(-4)} (${formatRupiah(loan.monthlyInstallment)})`, "success");
            }
          } else {
            // Insufficient cash for buffer-protected auto-pay
            showToast(
              `⚠️ Auto-Pay skipped: Loan #${loan.id.substr(-4)} - insufficient buffer (need ${formatRupiah(safeBalance)})`,
              "warning",
              5000
            );
          }
        }
        // If auto-pay is OFF, user must pay manually via Finance page
      });
    }



    localStorage.setItem("procoon_save", JSON.stringify(saveData));
};

// ===== MONTHLY OCCUPANCY UPDATE =====
window.updateMonthlyOccupancy = function () {
    if (!Array.isArray(saveData.assets)) return;

    saveData.assets.forEach(asset => {
        if (asset.finance?.mode !== "rented") return;

        const price = asset.finance.rentPrice;

        // Calculate new occupancy based on current rent
        const sim = calculateRentSimulation(asset, price);
        if (!sim) return;

        // Random occupancy within range using weighted distribution
        const newOccupancy = calculateDailyOccupancy(asset.units, sim.minOcc, sim.maxOcc, sim.demandPercent);
        
        asset.finance.occupiedUnits = newOccupancy;
        asset.finance.occRange = { min: sim.minOcc, max: sim.maxOcc };
    });

    localStorage.setItem("procoon_save", JSON.stringify(saveData));
};

// ===== DYNAMIC MONTHLY OCCUPANCY =====
window.calculateDailyOccupancy = function (totalUnits, minOcc, maxOcc, demandPercent) {
    // Weighted random distribution
    // More frequent in 45-65% of max range, but can swing to extremes
    
    const range = maxOcc - minOcc;
    const mid = minOcc + (range / 2);
    
    // Probability: 60% near middle, 40% random
    if (Math.random() < 0.6) {
        // Stay near middle ±20% of range
        const variance = range * 0.2;
        const randomOffset = (Math.random() - 0.5) * variance * 2;
        const occ = Math.round(mid + randomOffset);
        return Math.max(minOcc, Math.min(maxOcc, occ));
    } else {
        // Random across full range
        return minOcc + Math.floor(Math.random() * (range + 1));
    }
};

// ===== RENT SIMULATION (MOVED FROM ASSETS.JS AND FIXED) =====
window.calculateRentSimulation = function (asset, price) {
    const key = `${asset.name}-${asset.variant}`;
    const cfg = RENT_MARKET_CONFIG[key];
    if (!cfg || !price) return null;

    const marketPrice = (cfg.min + cfg.max) / 2;
    const ratio = price / marketPrice;

    // ===== MORE SENSITIVE ELASTICITY =====
    let elasticity;
    if (ratio <= 0.7)       elasticity = 1.25;         // Very cheap → near full capacity
    else if (ratio <= 0.85) elasticity = 1.1;         // Cheap
    else if (ratio <= 1.0)  elasticity = 0.95;        // Fair market
    else if (ratio <= 1.1)  elasticity = 0.85;        // Slightly expensive
    else if (ratio <= 1.25) elasticity = 0.65;        // Expensive
    else if (ratio <= 1.5)  elasticity = 0.35;        // Very expensive
    else if (ratio < 2.0)   elasticity = 0.1;         // Extreme
    else                    elasticity = 0;            // Dead market

    if (ratio >= 2) {
        return {
            minOcc: 0,
            maxOcc: 0,
            demandPercent: 0,
            maintenance: Math.floor((price / 30) * 0.25),
            risk: "Dead Market",
            warning: "Rent is too expensive. There are no tenants at all."
        };
    }

    // ===== DEMAND CALCULATION =====
    const demand = Math.max(0.05, Math.min(0.95, cfg.baseDemand * elasticity));
    const maxCap = Math.floor(asset.units * 0.97);  // Max capacity 97%
    
    // ===== BASE OCCUPANCY =====
    const baseOcc = Math.floor(asset.units * demand);
    
    // ===== WIDER RANGE =====
    // Range: 8-12 units for small, 15-25 units for medium/large
    let rangeSize;
    if (asset.units < 50) {
        rangeSize = 6 + Math.floor(Math.random() * 4);  // 6-10 units
    } else if (asset.units < 150) {
        rangeSize = 12 + Math.floor(Math.random() * 8);  // 12-20 units
    } else {
        rangeSize = 20 + Math.floor(Math.random() * 15); // 20-35 units
    }

    let minOcc = baseOcc - rangeSize;
    let maxOcc = baseOcc + rangeSize;

    if (minOcc < 0) minOcc = 0;
    if (maxOcc > maxCap) maxOcc = maxCap;
    if (minOcc > maxOcc) minOcc = maxOcc;

    let risk, warning;
    if (ratio < 0.8) {
        risk = "Low margin";
        warning = "Rent is too low. Units fill quickly but profits are small.";
    } else if (ratio > 1.2) {
        risk = "High vacancy";
        warning = "Price is too expensive. Tenant occupancy will drop sharply.";
    } else {
        risk = "Healthy";
        warning = "Price is balanced with the market.";
    }

    return {
        minOcc: Math.max(0, minOcc),
        maxOcc: Math.min(asset.units, maxOcc),
        demandPercent: Math.round(demand * 100),
        maintenance: Math.floor((price / 30) * 0.25),
        risk,
        warning
    };

};



// ===============================
// GAME CORE — FINANCE PROCESS
// ===============================
window.processDailyFinance = function () {
    const f = saveData.finance;

    const net = f.dailyIncome - f.dailyExpense;
    f.cash += net;

    if (typeof window.renderGlobalCash === "function") {
    window.renderGlobalCash();
    }

    f.history.push({
  date: window.gameTime.toDateString(),
  income: f.dailyIncome,
  expense: f.dailyExpense,
  net,
  source: "daily"
});

    localStorage.setItem("procoon_save", JSON.stringify(saveData));
};


saveData.finance ??= {};
saveData.finance.cash ??= 0;
saveData.finance.dailyIncome ??= 0;
saveData.finance.dailyExpense ??= 0;
saveData.finance.assetIncome ??= [];
saveData.finance.history ??= [];
saveData.finance.loans ??= [];
saveData.lastProcessedDay ??= null;

window.isRunning = true;

