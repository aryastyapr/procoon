// ================== GLOBAL UI ACTIONS ==================

window.goTo = function(page){
    window.location.href = page;
};

window.goBack = function(){
    window.location.href = "dashboard.html";
};

window.toggleTime = function(){
    console.log("toggleTime called");
    window.isRunning = !window.isRunning;
    console.log("isRunning set to:", window.isRunning);
    const btn = document.getElementById("timeToggle");
    if (btn) {
        btn.innerText = window.isRunning ? "⏸️ Pause" : "▶️ Play";
    }
};

// ================== GAME TICK SYSTEM ==================
window._gameTickHandlers = [];

window.registerGameTick = function (fn) {
    window._gameTickHandlers.push(fn);
};

window.onGameTimeTick = function () {
    window._gameTickHandlers.forEach(fn => fn());
};

// ================== SYSTEM MENU ==================
window.toggleSystemMenu = function(){
    const systemMenu = document.getElementById("systemMenu");
    const hamburger = document.querySelector(".hamburger");
    if (!systemMenu) return;

    const isOpen = !systemMenu.classList.contains("hidden");

    if (isOpen) {
        systemMenu.classList.add("hidden");
        hamburger?.classList.remove("active");
        window.isRunning = true;
    } else {
        systemMenu.classList.remove("hidden");
        hamburger?.classList.add("active");
        window.isRunning = false;
    }
};

// ================== FORMATTING & MATH UTILS ==================

window.formatRupiah = function(num){
    if (typeof num !== "number") num = 0;
    return "Rp " + num.toLocaleString("id-ID");
};

// Helper untuk input value
window.formatRupiahInput = function(num) {
    if (!num || isNaN(num)) return "";
    return num.toLocaleString("id-ID");
};

window.parseRupiah = function(str) {
    if (typeof str !== 'string') return 0;
    return parseInt(str.replace(/\./g, "")) || 0;
};

window.randomRange = function(min, max) {
    return min + Math.random() * (max - min);
};

window.diffMonths = function(fromISO, toDate) {
    const from = new Date(fromISO);
    // Handle jika toDate string ISO
    const to = toDate instanceof Date ? toDate : new Date(toDate);
    
    return (
        (to.getFullYear() - from.getFullYear()) * 12 +
        (to.getMonth() - from.getMonth())
    );
};

window.showToast = function(message, type = "success", duration = 3000) {
    let container = document.getElementById("toastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

// ================== ECONOMY LOGIC (CENTRALIZED) ==================

// Menghitung harga jual aset (Dipakai di Dashboard & Assets)
window.calculateFinalSellPrice = function(asset, mode) {
    const market = saveData.market;
    if (!market) return asset.cost;

    const cycleCfg = window.MARKET_CYCLE_CONFIG?.[market.cycle];
    if (!cycleCfg) return asset.cost;

    // hitung market value SEKARANG
    const monthsHeld = diffMonths(
        asset.completedAt,
        window.gameTime
    );

    const appreciationRate = 0.035;
    const monthlyRate = appreciationRate / 12;

    const appreciatedValue =
        asset.cost * Math.pow(1 + monthlyRate, monthsHeld);

    const marketValue = Math.floor(
        appreciatedValue * cycleCfg.sellMultiplier
    );

    // MARKET SELL = PURE MARKET VALUE
    if (mode === "market") {
        return marketValue;
    }

    // PREMIUM SELL = BONUS RANGE
    if (mode === "premium") {
        const bonus = randomRange(
            cycleCfg.premiumBonus[0],
            cycleCfg.premiumBonus[1]
        );
        return Math.floor(marketValue * (1 + bonus));
    }

    // QUICK (fallback)
    return marketValue;
};

// ================== LAND ENGINE UTILS ==================

window.getLandPriceDetail = function (cityId) {
    const city = CITY_CONFIG?.[cityId];
    if (!city || !saveData.market) return null;

    const monthKey =
        window.gameTime.getFullYear() + "-" + window.gameTime.getMonth();

    if (!saveData.landPriceCache[monthKey]) {
        saveData.landPriceCache[monthKey] = {};
    }

    if (!saveData.landPriceCache[monthKey][cityId]) {
        const cycle = saveData.market.cycle;
        const marketCfg = MARKET_CYCLE_CONFIG?.[cycle] || { demand: 1 };
        const volatility = 1 + (Math.random() * city.volatility - city.volatility / 2);

        const finalPrice = Math.floor(
            city.basePrice *
            marketCfg.demand *
            city.demand *
            volatility
        );

        saveData.landPriceCache[monthKey][cityId] = {
            price: finalPrice,
            cycle
        };
        localStorage.setItem("procoon_save", JSON.stringify(saveData));
    }

    const cached = saveData.landPriceCache[monthKey][cityId];
    return {
        finalPrice: cached.price,
        cycle: cached.cycle
    };
};

window.calculateLandROI = function ({ cityId, landHa, years = 5 }) {
    const city = CITY_CONFIG?.[cityId];
    if (!city || !saveData.market) return null;

    const basePrice = city.basePrice * 10000 * landHa;
    let annualRate = 0.03;
    if (city.tier === "metro") annualRate = 0.045;
    if (city.tier === "premium") annualRate = 0.06;

    const futureValue = basePrice * Math.pow(1 + annualRate, years);
    const roi = (futureValue - basePrice) / basePrice;

    return {
        baseValue: Math.floor(basePrice),
        futureValue: Math.floor(futureValue),
        roiPercent: +(roi * 100).toFixed(1),
        annualRate
    };
};

window.getBestLandUse = function (cityId, landHa) {
    const city = CITY_CONFIG?.[cityId];
    if (!city) return [];
    const result = [];
    if (landHa >= 0.3 && city.demand >= 1.0) result.push("Apartment");
    if (landHa >= 0.15) result.push("ShopHouse");
    if (landHa >= 0.1) result.push("House");
    return result;
};

window.getLandRiskLevel = function (cityId, cashAfterBuy) {
    const city = CITY_CONFIG?.[cityId];
    if (!city) return "Unknown";
    let risk = "Low";
    if (city.volatility > 0.07) risk = "Medium";
    if (cashAfterBuy < saveData.finance.cash * 0.3) risk = "High";
    return risk;
};

window.renderGlobalCash = function () {
    const el = document.getElementById("balance");
    if (!el) return;
    if (!window.saveData?.finance) return;
    el.innerText = formatRupiah(saveData.finance.cash);
};

window.syncCash = function () {
    if (typeof saveData.cash === "number") {
        saveData.cash = saveData.finance.cash;
    }
};