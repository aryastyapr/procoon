// =========================
// ASSETS PAGE SCRIPT (FINAL FIXED)
// =========================

if (!window.saveData) {
    showAlertModal("Save data not found", "Missing Save").then(() => location.href = "mainmenu.html");
    throw new Error("Save data missing");
}
window.uiLocked = false;

if (!saveData.market) {
    saveData.market = {
        cycle: "stagnant"
    };
}


function getRentKey(asset) {
    return `${asset.name}-${asset.variant}`;
}

function canRentAsset(asset) {
    // HOUSE & SHOPHOUSE
    if (asset.name === "House" || asset.name === "ShopHouse") {
        return asset.units >= 50;
    }

    // APARTMENT
    if (asset.name === "Apartment") {
        const unitsPerTower = asset.units / (asset.towers || 1);
        return asset.towers >= 3 && unitsPerTower >= 50;
    }

    return false;
}

function calculateDailyIncome(asset) {
    if (asset.finance?.mode !== "rented") return 0;
    const dailyRentPerUnit = Math.floor(asset.finance.rentPrice / 30);
    return asset.finance.occupiedUnits * dailyRentPerUnit;
}

function calculateDailyExpense(asset) {
    if (asset.finance?.mode !== "rented") return 0;

    const dailyRentPerUnit = Math.floor(asset.finance.rentPrice / 30);

    let maintenanceRate = 0.25;
    if (asset.name === "ShopHouse") maintenanceRate = 0.3;
    if (asset.name === "Apartment") maintenanceRate = 0.35;

    return asset.units * Math.floor(dailyRentPerUnit * maintenanceRate);
}

// =========================
// MODAL STATE
// =========================
let assetModalState = {
    index: null,
    mode: null, // rent | adjustRent | sellIdle | sellRented
    price: 0,
};

// =========================
// TOP BAR
// =========================
function renderTopBar() {
    const elName = document.getElementById("companyName");
    const elBal = document.getElementById("balance");
    
    if (elName) elName.innerText = saveData.companyName || "Company";
    if (elBal) elBal.innerText = formatRupiah(saveData.finance.cash || 0);
}

// =========================
// SUMMARY
// =========================
function renderSummary() {
    renderTopBar(); 
    
    if (!saveData.land || !saveData.land.locations) return;

    const totalLand = saveData.land.locations.reduce((s,l)=>s+l.total,0);
    const usedLand  = saveData.land.locations.reduce((s,l)=>s+l.used,0);

    const elCash = document.getElementById("assetCash");
    const elTotal = document.getElementById("assetLandTotal");
    const elUsed = document.getElementById("assetLandUsed");
    const elAvail = document.getElementById("assetLandAvailable");

    if(elCash) elCash.innerText = formatRupiah(saveData.finance.cash || 0);
    if(elTotal) elTotal.innerText = totalLand.toFixed(2) + " ha";
    if(elUsed) elUsed.innerText = usedLand.toFixed(2) + " ha";
    if(elAvail) elAvail.innerText = (totalLand - usedLand).toFixed(2) + " ha";
}

// =========================
// LAND MARKET VALUE UTIL
// =========================
function calculateLandMarketValue(location) {
    if (!location || !location.name || !window.gameTime) return null;

    let cityId = location.id || location.name.toLowerCase();
    if (!window.getLandPriceDetail) return null;

    const priceDetail = getLandPriceDetail(cityId);
    if (!priceDetail) return null;

    const totalM2 = location.total * 10_000;
    const marketValue = priceDetail.finalPrice * totalM2;

    // Initialize cost if missing (old save)
    let purchaseCost = location.cost;
    if (!purchaseCost || purchaseCost <= 0) {
        purchaseCost = priceDetail.finalPrice * totalM2;
        location.cost = purchaseCost;  // Update save data
    } 
    const diff = marketValue - purchaseCost;
    const percent = purchaseCost > 0 ? (diff / purchaseCost) * 100 : 0;

    return {
        marketValue: Math.floor(marketValue),
        diff,
        percent
    };
}

// =========================
// LAND BY LOCATION (FIXED)
// =========================
function renderLandByLocation() {
    const container = document.getElementById("landLocationList");
    if (!container) return;

    container.innerHTML = "";

const ownedLocations = saveData.land.locations.filter(loc => {
    if (loc.total === 0) return false;

    const reservedHa = (saveData.land.sellQueue || [])
        .filter(o =>
            o.cityName.toLowerCase() === loc.name.toLowerCase() &&
            o.status === "listed"
        )
        .reduce((sum, o) => sum + (o.m2 / 10000), 0);

    const rawAvailable = loc.total - loc.used - reservedHa;
    let available = parseFloat(rawAvailable.toFixed(4));
    if (available < 0.01) available = 0;

    const hasListing = (saveData.land.sellQueue || [])
        .some(o =>
            o.cityName.toLowerCase() === loc.name.toLowerCase() &&
            o.status === "listed"
        );

    // 🔒 RULE FINAL
    return available > 0 || hasListing;
});

if (ownedLocations.length === 0) {
    container.innerHTML = `
        <div class="assets-empty">
            You do not have any manageable land yet.<br>
            Please search and buy land first.
        </div>
    `;
    return;
}

    if (!window.gameTime) {
        setTimeout(renderLandByLocation, 100);
        return;
    }

    ownedLocations.forEach((loc, idx) => {
        // Init cost if missing
        if (!loc.cost || loc.cost <= 0 || loc._resetCostBasis) {
        const detail = getLandPriceDetail(cityId);
        if (detail) {
        loc.cost = detail.finalPrice * loc.total * 10000;
        delete loc._resetCostBasis;
    }
}
    
        const reserved = (saveData.land.sellQueue || [])
    .filter(o => o.cityName.toLowerCase() === loc.name.toLowerCase() && o.status === "listed")
    .reduce((s,o)=>s + (o.m2 / 10000), 0);

        const rawAvailable = loc.total - loc.used - reserved;
        const available = Math.max(0, parseFloat(rawAvailable.toFixed(4)));

        const activeOrders = (saveData.land.sellQueue || [])
            .filter(o => o.cityName === loc.name && o.status === "listed");

        let landSellAlertHTML = "";

        if (activeOrders.length > 0) {
            landSellAlertHTML = activeOrders.map((order) => {
                // Cari index asli di array sellQueue
                const realIdx = saveData.land.sellQueue.indexOf(order);
                
                const listedAt = new Date(order.listedAt);
                const now = window.gameTime;

                const passedDays = Math.floor(
                    (now - listedAt) / (1000 * 60 * 60 * 24)
                );

                let remaining = Math.ceil(order.durationDays - passedDays);
remaining = Math.max(1, remaining);

let text = `🕒 Selling ${(order.m2 / 10000).toFixed(2)} ha in ${remaining} days`;
                let color = "#38bdf8";

                if (remaining <= 7) {
                    text = `🕒 Selling ${(order.m2 / 10000).toFixed(2)} ha in ${remaining} days`;
                    color = "#facc15";
                }

                if (remaining <= 3) {
                    text = `⏰ Final buyer approaching (${remaining} days)`;
                    color = "#f87171";
                }

                return `
                    <div class="asset-status land-status" style="--status-color:${color}">
                        ${text}
                        <button
                            class="status-cancel-btn"
                            onclick="cancelLandSell(${realIdx})">
                            Cancel
                        </button>
                    </div>
                `;
            }).join("");
        }

        const card = document.createElement("div");
        card.className = "asset-card land-item-card";

        const market = calculateLandMarketValue(loc);
        let marketHTML = `<div class="helper-note">Market data unavailable</div>`;

        if (market) {
            const color = market.diff >= 0 ? "#22c55e" : "#ef4444";
            const sign = market.diff >= 0 ? "+" : "";

            marketHTML = `
                <div class="land-market">
                    <div class="land-market-title">Est. Market Value</div>
                    <div class="land-market-value">${formatRupiah(market.marketValue)}</div>
                    <div class="land-market-change" style="color:${color}">
                        ${sign}${market.percent.toFixed(1)}%
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="card-head">
                <h3 class="card-title">${loc.name}</h3>
                <span class="card-chip">LAND</span>
            </div>

            <div class="metrics-grid">
                <div class="metric">
                    <span class="metric-label">Total</span>
                    <strong class="metric-value">${loc.total.toFixed(2)} ha</strong>
                </div>
                <div class="metric">
                    <span class="metric-label">Used</span>
                    <strong class="metric-value">${loc.used.toFixed(2)} ha</strong>
                </div>
                <div class="metric">
                    <span class="metric-label">Available</span>
                    <strong class="metric-value">${available.toFixed(2)} ha</strong>
                </div>
            </div>

            ${marketHTML}
            ${landSellAlertHTML}
        `;

        container.appendChild(card);

// =========================
// FIX #3 — SELL LAND BUTTON (FINAL)
// =========================
const actions = document.createElement("div");
actions.className = "asset-actions";

const btn = document.createElement("button");
btn.type = "button";
btn.innerText = "Sell Land";
btn.className = "sell-land-btn";
btn.dataset.city = loc.name;

if (available <= 0) {
    // ❌ Cannot be sold
    btn.disabled = true;
    btn.style.opacity = "0.5";
    btn.title = "No available land can be sold";
} else {
    // ✅ Can be sold
    btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLandSellModal(loc.name);
    };
}

actions.appendChild(btn);
card.appendChild(actions);


    });
}

function openLandSellModal(cityName) {
    console.log("Opening modal for:", cityName); 

    const modal = document.getElementById("assetModal");
    const title = document.getElementById("assetModalTitle");
    const body = document.getElementById("assetModalBody");
    const actions = document.getElementById("assetModalActions");

    // FIX: Ensure modal elements exist before continuing
    if (!modal || !title || !body || !actions) {
        console.error("Modal elements not found in HTML!");
        return;
    }

    const location = saveData.land.locations.find(l => l.name.toLowerCase() === cityName.toLowerCase());

    if (!location) {
        showAlertModal("Location data error: Not found in save data.", "Data Error");
        return;
    }

    const reserved = (saveData.land.sellQueue || [])
        .filter(o => o.cityName.toLowerCase() === cityName.toLowerCase() && o.status === "listed")
        .reduce((s,o) => s + (o.m2 / 10000), 0);

    // FIX: Use parseFloat & toFixed to avoid decimal precision bugs (e.g. 0.000000001)
    let available = parseFloat((location.total - location.used - reserved).toFixed(2));

    console.log("Available land:", available);

    if (available <= 0) {
    showToast("🚫 No available land can be sold", "warning", 3500);
    return;
}

    // Render Modal
    title.innerText = `Sell Land — ${cityName}`;
    
    // Reset price input that might carry over from property modal
    const priceInput = document.getElementById("assetPriceInput");
    if(priceInput) priceInput.style.display = "none";
    
    if (available <= 0) {
    showAlertModal("No available land to sell in this location.", "No Availability");
    return;
}

    body.innerHTML = `
    <div style="font-size:13px;color:#cbd5f5;margin-bottom:10px">
        <b>Land Area</b><br>
        Total owned: ${(location.total * 10000).toLocaleString()} m²<br>
        Available: ${(available * 10000).toLocaleString()} m²<br>
        <em>1 ha = 10.000 m²</em>
    </div>

    <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#94a3b8;">
            Area to sell (m²) — minimum 500 m²
        </label>
        <input
            id="landSellM2"
            type="number"
            min="500"
            max="${Math.floor(available * 10000)}"
            step="100"
            value="500"
            style="width:100%;padding:10px;margin-top:5px;border-radius:10px;border:none;"
        >
    </div>

    <div style="margin-bottom:12px;">
        <label style="font-size:12px;color:#94a3b8;">
            Price per m²
        </label>
        <input
            id="landSellPrice"
            type="text"
            placeholder="Rp / m²"
            style="width:100%;padding:10px;margin-top:5px;border-radius:10px;border:none;"
        >
    </div>

    <div id="landSellSim"
        style="font-size:13px;color:#cbd5f5;">
        Enter area and price to see simulation.
    </div>
`;

actions.innerHTML = `
    <button onclick="closeAssetModal()">Cancel</button>
    <button class="danger" onclick="confirmLandSell('${cityName}')">
        Sell Land
    </button>
`;

    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    setTimeout(() => {
    const m2Input = document.getElementById("landSellM2");
    const priceInput = document.getElementById("landSellPrice");

    priceInput.oninput = () => {
        const val = parseRupiah(priceInput.value);
        priceInput.value = formatRupiahInput(val);
        updateLandSellSimulation(location, available);
    };

    m2Input.oninput = () =>
        updateLandSellSimulation(location, available);
}, 50);

    // Trigger update estimasi
    setTimeout(() => {
    }, 50);
}

function updateLandSellSimulation(location, maxAvailableHa) {
    const m2Input = document.getElementById("landSellM2");
    const priceInput = document.getElementById("landSellPrice");
    const simBox = document.getElementById("landSellSim");

    if (!m2Input || !priceInput || !simBox) return;

    const m2 = parseInt(m2Input.value);
    const pricePerM2 = parseRupiah(priceInput.value);

    const totalOwnedM2 = Math.floor(location.total * 10000);
    const maxAvailableM2 = Math.floor(maxAvailableHa * 10000);
    const remainingM2 = totalOwnedM2 - m2;

    // =========================
    // VALIDATION
    // =========================
    if (!m2 || m2 < 500) {
        simBox.innerHTML =
            `<span style="color:#ef4444">Minimum sell is 500 m².</span>`;
        return;
    }

    if (m2 > maxAvailableM2) {
        simBox.innerHTML =
            `<span style="color:#ef4444">Exceeds available land.</span>`;
        return;
    }

    if (remainingM2 > 0 && remainingM2 < 500) {
        simBox.innerHTML =
            `<span style="color:#ef4444">
                Remaining land would be below minimum holding (500 m²).
            </span>`;
        return;
    }

    if (!pricePerM2 || pricePerM2 <= 0) {
        simBox.innerHTML = "Enter valid price per m².";
        return;
    }

    // =========================
    // MARKET REFERENCE
    // =========================
    const detail = getLandPriceDetail(location.name.toLowerCase());
    if (!detail) {
        simBox.innerHTML = "Market data unavailable.";
        return;
    }

    const marketPrice = detail.finalPrice;
    const ratio = pricePerM2 / marketPrice;
    const diffPct = ((pricePerM2 - marketPrice) / marketPrice) * 100;
    const totalValue = m2 * pricePerM2;

    // =========================
    // EXIT CONSEQUENCE
    // =========================
    let exitText, liquidity, pricingStatus, risk, cfoOpinion;

    if (ratio <= 1.0) {
        exitText = "2–5 months";
        liquidity = "High";
        pricingStatus = "Fair / Liquid";
        risk = "Low";
        cfoOpinion =
            "This exit prioritizes liquidity over long-term optionality.";
    } 
    else if (ratio <= 1.15) {
        exitText = "6–12 months";
        liquidity = "Medium";
        pricingStatus = "Slightly Overpriced";
        risk = "Low";
        cfoOpinion =
            "Acceptable pricing, but capital will be tied up for some time.";
    } 
    else if (ratio <= 1.3) {
        exitText = "12–24 months";
        liquidity = "Low";
        pricingStatus = "Overpriced";
        risk = "Medium";
        cfoOpinion =
            "We are freezing capital for uncertain premium. Not recommended.";
    } 
    else {
        simBox.innerHTML =
            `<span style="color:#ef4444">
                Price is unrealistic. No viable exit window.
            </span>`;
        return;
    }

    // =========================
    // RENDER OUTPUT (CLEAN)
    // =========================
    simBox.innerHTML = `
        <div class="land-sell-section">
            <h4>📐 Land Area</h4>
            <div class="row"><span>Owned</span><span>${totalOwnedM2.toLocaleString()} m²</span></div>
            <div class="row"><span>Selling</span><span>${m2.toLocaleString()} m²</span></div>
            <div class="row"><span>Remaining</span><span>${remainingM2.toLocaleString()} m²</span></div>
            <small>1 ha = 10.000 m²</small>
        </div>

        <div class="land-sell-section">
            <h4>💰 Pricing</h4>
            <div class="row"><span>Market price</span><span>${formatRupiah(marketPrice)} / m²</span></div>
            <div class="row">
                <span>Your price</span>
                <span>${formatRupiah(pricePerM2)} / m² (${diffPct >= 0 ? "+" : ""}${diffPct.toFixed(1)}%)</span>
            </div>
            <div class="row strong"><span>Total value</span><span>${formatRupiah(totalValue)}</span></div>
        </div>

        <div class="land-sell-section">
            <h4>⏳ Exit & Liquidity</h4>
            <div class="row"><span>Exit window</span><span>${exitText}</span></div>
            <div class="row"><span>Liquidity</span><span>${liquidity}</span></div>
            <div class="row"><span>Status</span><span>${pricingStatus}</span></div>
        </div>

        <div class="land-sell-section">
            <h4>⚠️ Risk</h4>
            <div class="row"><span>Downside risk</span><span>${risk}</span></div>
            <div class="row"><span>Correction chance</span><span>Small</span></div>
        </div>

        <div class="land-sell-section cfo">
            <h4>🧠 CFO Opinion</h4>
            <p>${cfoOpinion}</p>
        </div>
    `;
}


// =========================
// RENT SIMULATION (OPTIMIZED)
// =========================
function simulateRent(asset, price) {
    const sim = calculateRentSimulation(asset, price);
    if (!sim) return null;
    return sim;
}

function simulateSellPerUnit(asset, pricePerUnit) {
    const marketUnit =
        (asset.cost *
            (MARKET_CYCLE_CONFIG[saveData.market.cycle]?.sellMultiplier || 1)) /
        asset.units;

    const ratio = pricePerUnit / marketUnit;

    // =========================
    // HARD FAIL (NO BUYER)
    // =========================
    if (ratio >= 1.9) {
        return {
            fail: true,
            reason:
                "The price is completely unrealistic. This property will not sell under current market conditions."
        };
    }

    // =========================
    // FIRE SALE (BRUTAL LOSS)
    // =========================
    if (ratio < 0.7) {
        return {
            days: 1,
            risk: "Fire Sale",
            note:
                "Price is far below market. It sells instantly, but destroys capital value."
        };
    }

    // =========================
    // BELOW / FAIR MARKET
    // =========================
    if (ratio <= 0.9) {
        return {
            days: 3 + Math.floor(Math.random() * 4), // 3–6
            risk: "Fast Sell",
            note:
                "Attractive price. Sells quickly, but there is opportunity cost."
        };
    }

    if (ratio <= 1.0) {
        return {
            days: 10 + Math.floor(Math.random() * 7), // 10–17
            risk: "Healthy",
            note:
                "Market-aligned pricing. Liquidity is healthy."
        };
    }

    // =========================
    // ABOVE MARKET (PAIN STARTS)
    // =========================
    if (ratio <= 1.1) {
        return {
            days: 30 + Math.floor(Math.random() * 20), // 30–50
            risk: "Slow",
            note:
                "Slightly above market. Selling time starts to inflate."
        };
    }

    // =========================
    // EXPENSIVE (SEVERELY PUNISHED)
    // =========================
    if (ratio <= 1.25) {
        return {
            days: 90 + Math.floor(Math.random() * 40), // 70–110
            risk: "High Risk",
            note:
                "Price is too optimistic. Capital stays idle for too long."
        };
    }

    // =========================
    // VERY EXPENSIVE (NEAR DEAD)
    // =========================
    if (ratio <= 1.45) {
        return {
            days: 180 + Math.floor(Math.random() * 60), // 180–200
            risk: "Very High Risk",
            note:
                "Very expensive. This asset is nearly illiquid."
        };
    }

    // =========================
    // DEAD MARKET (LONG TERM IDLE)
    // =========================
    return {
        days: 365 + Math.floor(Math.random() * 120), // 240–360
        risk: "Dead Market",
        note:
            "Extreme pricing. The property may stay idle for almost a year."
    };
}


function calculateSellResult(asset, pricePerUnit) {
    const totalSell = pricePerUnit * asset.units;
    const cost = asset.cost || 0;
    const profit = totalSell - cost;
    const roi = cost > 0 ? (profit / cost) * 100 : 0;

    return {
        totalSell,
        cost,
        profit,
        roi
    };
}

function calculateHoldRentComparison(asset, months = 12) {
    if (!canRentAsset(asset)) return null;

    const dailyIncome = calculateDailyIncome(asset);
    const dailyExpense = calculateDailyExpense(asset);
    const netDaily = dailyIncome - dailyExpense;

    const netMonthly = Math.floor(netDaily * 26);
    const netPeriod = netMonthly * months;

    const cost = asset.cost || 0;
    const roi = cost > 0 ? (netPeriod / cost) * 100 : 0;

    return {
        netMonthly,
        netPeriod,
        roi,
        months
    };
}

// =========================
// RENDER ASSETS
// =========================
function renderPropertyAssets() {
    const container = document.getElementById("assetsList");
    if (!container) return;
    
    container.innerHTML = "";

    if (!saveData.assets || saveData.assets.length === 0) {
        container.innerHTML = `<div class="assets-empty">No completed properties yet.</div>`;
        return;
    }

    saveData.assets.forEach((asset, index) => {
        asset.finance ||= { mode: "idle" };

        const card = document.createElement("div");
        card.className = "asset-card property-item-card";

        card.innerHTML = `
            <div class="card-head">
                <h3 class="card-title">${asset.name} – ${asset.variant}</h3>
                <span class="card-chip">PROPERTY</span>
            </div>
            <div class="metrics-grid">
                <div class="metric">
                    <span class="metric-label">Units</span>
                    <strong class="metric-value">${asset.units}</strong>
                </div>
                <div class="metric">
                    <span class="metric-label">Land Used</span>
                    <strong class="metric-value">${asset.landUsed.toFixed(2)} ha</strong>
                </div>
            </div>
        `;

        // SELL LISTING STATUS
        if (asset.finance?.sell?.status === "listed") {
            const listedAt = new Date(asset.finance.sell.listedAt);
            const now = window.gameTime;
            const passedDays = Math.floor((now - listedAt) / (1000 * 60 * 60 * 24));
            const remaining = asset.finance.sell.durationDays - passedDays;

            let alertText = `🕒 Selling in ${remaining} days`;
            let alertColor = "#38bdf8"; 

            if (remaining <= 7) {
                alertText = `⚠ Selling in ${remaining} days`;
                alertColor = "#facc15";
            }
            if (remaining <= 3) {
                alertText = `⏰ Final buyer approaching (${remaining} days)`;
                alertColor = "#f87171";
            }

            card.innerHTML += `
                <div class="asset-status land-status" style="--status-color:${alertColor}">
                    ${alertText}
                </div>
            `;
        }


        const actions = document.createElement("div");
        actions.className = "asset-actions";

        if (asset.finance?.sell?.status === "listed") {
            actions.innerHTML = `
                <button onclick="cancelSell(${index})">
                    Cancel Listing
                </button>
            `;
        }
        else if (asset.finance.mode === "idle") {
            if (canRentAsset(asset)) {
                actions.innerHTML = `
                    <button onclick="openAssetModal(${index}, 'rent')">Rent</button>
                    <button class="sell-btn" onclick="openAssetModal(${index}, 'sellIdle')">Sell</button>
                `;
            } else {
                actions.innerHTML = `
                    <p class="property-warning">
                        ⚠ Property scale too small for rental market.<br>
                        Minimum rental requirement not met.
                    </p>
                    <button class="sell-btn" onclick="openAssetModal(${index}, 'sellIdle')">Sell</button>
                `;
            }
        }
        else if (asset.finance.mode === "rented") {
            const dailyIncome = calculateDailyIncome(asset);
            const dailyExpense = calculateDailyExpense(asset);
            const netDaily = dailyIncome - dailyExpense;
            const monthlyIncome = dailyIncome * 30;
            const monthlyExpense = dailyExpense * 30;
            const netMonthly = netDaily * 30;

            card.innerHTML += `
                <div class="asset-status">
                    <div class="status-line"><span>Status</span><strong>RENTED</strong></div>
                    <div class="status-line"><span>Rent / unit / month</span><strong>${formatRupiah(asset.finance.rentPrice)}</strong></div>
                    <div class="status-line"><span>Occupied</span><strong>${asset.finance.occupiedUnits}/${asset.units}</strong></div>
                    <div class="status-divider" aria-hidden="true"></div>
                    <div class="status-line"><span>Income / day</span><strong class="is-positive">${formatRupiah(dailyIncome)}</strong></div>
                    <div class="status-line"><span>Expense / day</span><strong class="is-negative">${formatRupiah(dailyExpense)}</strong></div>
                    <div class="status-line"><span>Net / day</span><strong class="${netDaily >= 0 ? "is-positive" : "is-negative"}">${formatRupiah(netDaily)}</strong></div>
                    <div class="status-divider" aria-hidden="true"></div>
                    <div class="status-line"><span>Income / month</span><strong class="is-positive">${formatRupiah(monthlyIncome)}</strong></div>
                    <div class="status-line"><span>Expense / month</span><strong class="is-negative">${formatRupiah(monthlyExpense)}</strong></div>
                    <div class="status-line"><span>Net / month</span><strong class="${netMonthly >= 0 ? "is-positive" : "is-negative"}">${formatRupiah(netMonthly)}</strong></div>
                </div>
            `;

            actions.innerHTML = `
                <button onclick="openAssetModal(${index}, 'adjustRent')">Adjust Rent</button>
                <button onclick="openAssetModal(${index}, 'sellRented')">Sell Property</button>
                <button onclick="stopRent(${index})">Stop Rent</button>
            `;
        }

        card.appendChild(actions);
        container.appendChild(card);
    });
}

// =========================
// OPEN MODAL
// =========================
function openAssetModal(index, mode) {
    const asset = saveData.assets[index];
    assetModalState = {
        index,
        mode,
        price: asset.finance?.rentPrice || 0,
    };

    if (asset.finance?.sell?.status === "listed") {
        showAlertModal("Property is currently listed for sale.\nCancel listing to perform other actions.", "Action Locked");
        return;
    }

    const title = document.getElementById("assetModalTitle");
    const input = document.getElementById("assetPriceInput");
    const body = document.getElementById("assetModalBody");
    const modal = document.getElementById("assetModal");
    
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");

    title.innerText = "";
    body.innerHTML = "";
    input.style.display = "none";
    input.style.pointerEvents = "none";
    document.getElementById("assetModalActions").innerHTML = "";


    if (mode === "sellIdle" || mode === "sellRented") {
    title.innerText = "Sell Property (Price per Unit)";

    input.style.display = "block";
    input.style.pointerEvents = "auto";

    const marketUnit = Math.floor(
    (asset.cost * (MARKET_CYCLE_CONFIG[saveData.market.cycle]?.sellMultiplier || 1)) / asset.units
);
    input.value = formatRupiahInput(marketUnit);

    body.innerHTML = `
        <p>Market reference / unit: <b>${formatRupiah(marketUnit)}</b></p>
        <div id="sellSimResult" style="font-size:13px;color:#cbd5f5">
    Enter a selling price per unit to see:
    <ul style="margin:6px 0 0 16px">
        <li>Total sell value</li>
        <li>Profit / loss</li>
        <li>ROI</li>
        <li>Risk & estimated time to sell</li>
    </ul>
</div>
    `;

    document.getElementById("assetModalActions").innerHTML = `
        <button onclick="closeAssetModal()">Cancel</button>
        <button class="danger" onclick="confirmSellPerUnit()">Confirm Sell</button>
    `;

    input.oninput = () => {
    const price = parseRupiah(input.value);
    input.value = formatRupiahInput(price);

    const simBox = document.getElementById("sellSimResult");
    if (!price || price <= 0) {
        simBox.innerText = "Invalid price.";
        return;
    }

    // =========================
    // SELL SIMULATION (STRICT)
    // =========================
    const sim = simulateSellPerUnit(asset, price);
    if (sim.fail) {
        simBox.innerHTML = `<span style="color:#ef4444">${sim.reason}</span>`;
        return;
    }

    // =========================
    // SELL RESULT
    // =========================
    const result = calculateSellResult(asset, price);
    const profitColor = result.profit >= 0 ? "#22c55e" : "#ef4444";
    const profitSign = result.profit >= 0 ? "+" : "";

    // =========================
    // HOLD & RENT COMPARISON
    // =========================
    const hold = calculateHoldRentComparison(asset, 12);

    let holdHTML = "";
    let strategicHTML = "";

    if (hold) {
        const betterHold = hold.netPeriod > result.profit;

        holdHTML = `
            <hr>
            <p><b>Hold & Rent Comparison (12 months)</b></p>
            <p><b>Rent Property to see simulation results</b></p>
            <p>Net / month:
                <b>${formatRupiah(hold.netMonthly)}</b>
            </p>
            <p>Total 12 months:
                <b>${formatRupiah(hold.netPeriod)}</b>
            </p>
            <p>ROI (Rent):
                <b>${hold.roi.toFixed(1)}%</b>
            </p>
        `;

        strategicHTML = `
            <p style="margin-top:6px;color:${betterHold ? "#22c55e" : "#ef4444"}">
                ${
                    betterHold
                        ? "📈 Holding & renting yields higher long-term return than selling."
                        : "💸 Selling now yields higher return than holding."
                }
            </p>
        `;

        // EXTRA STRATEGIC WARNING (C1)
        if (result.roi < 5 && hold.roi > 10) {
            strategicHTML += `
                <p style="margin-top:6px;color:#facc15">
                    ⚠ Strategically weak decision:
                    Selling ROI is very low compared to rental performance.
                </p>
            `;
        }
    }

    // =========================
    // FINAL RENDER
    // =========================
    simBox.innerHTML = `
        <div style="margin-top:6px">
            <p><b>Market Risk:</b> ${sim.risk}</p>
            <p><b>Estimated Sold In:</b> ${sim.days} days</p>
            <p style="opacity:.8">${sim.note}</p>

            <hr>

            <p><b>Total Sell Value:</b><br>
               ${formatRupiah(result.totalSell)}</p>

            <p><b>Total Cost:</b><br>
               ${formatRupiah(result.cost)}</p>

            <p><b>Profit / Loss:</b><br>
               <span style="color:${profitColor}">
                   ${profitSign}${formatRupiah(result.profit)}
               </span>
            </p>

            <p><b>ROI (Sell):</b>
               <span style="color:${profitColor}">
                   ${result.roi.toFixed(1)}%
               </span>
            </p>

            ${holdHTML}
            ${strategicHTML}
        </div>
    `;
};


}

    // RENT / ADJUST
    if (mode === "rent" || mode === "adjustRent") {
        input.style.pointerEvents = "auto";
        if (mode === "rent" && !canRentAsset(asset)) {
            showAlertModal("Property does not meet the minimum scale for rental.", "Rental Not Allowed");
            closeAssetModal();
            return;
        }
        title.innerText = mode === "rent" ? "Rent Property" : "Adjust Rent";

        const key = getRentKey(asset)
        const cfg = RENT_MARKET_CONFIG[key];
        if (!cfg) { showAlertModal(`RENT CONFIG MISSING: ${key}`, "Config Missing"); return; }

        input.style.display = "block";
        input.value = formatRupiahInput(assetModalState.price);

        body.innerHTML = `
            <p><b>Recommended Rent (per month):</b><br>
            ${formatRupiah(cfg.min)} – ${formatRupiah(cfg.max)} / unit / month</p>
            <div id="rentSimulation" class="rent-simulation">
            <em>Enter price to see market response.</em>
            </div>
        `;

        document.getElementById("assetModalActions").innerHTML = `
            <button onclick="closeAssetModal()">Cancel</button>
            <button onclick="confirmAssetAction()">Confirm</button>
        `;

        input.oninput = () => {
            assetModalState.price = parseRupiah(input.value);
            input.value = formatRupiahInput(assetModalState.price);

            const sim = simulateRent(asset, assetModalState.price);
            if (!sim) return;

            const occupied = Math.floor((sim.minOcc + sim.maxOcc) / 2);
            const simulatedAsset = {
                ...asset,
                finance: {
                    ...asset.finance,
                    mode: "rented",
                    rentPrice: assetModalState.price,
                    occupiedUnits: occupied
                }
            };

            const dailyIncome = calculateDailyIncome(simulatedAsset);
            const dailyExpense = calculateDailyExpense(simulatedAsset);
            const netDaily = dailyIncome - dailyExpense;

            document.getElementById("rentSimulation").innerHTML = `
                <p><b>Market Simulation</b></p>
                <p>Occupancy: <b>${sim.demandPercent}%</b> (~${occupied} units)</p>
                <hr>
                <p style="color:#22c55e">Income: <b>${formatRupiah(dailyIncome)}</b>/day</p>
                <p style="color:#ef4444">Expense: <b>${formatRupiah(dailyExpense)}</b>/day</p>
                <p>Net: <b>${formatRupiah(netDaily)}</b>/day</p>
                <hr>
                <p>Risk: ${sim.risk}</p>
            `;
        };
    }
}

function confirmAssetAction() {
    const { index, mode, price } = assetModalState;
    const asset = saveData.assets[index];
    if (!asset) return;

    if (mode === "rent" || mode === "adjustRent") {
        const sim = simulateRent(asset, price);
        if (!sim) {
            showAlertModal("Rent simulation failed", "Simulation Error");
            return;
        }
        
        // Calculate initial occupancy using proper dynamic calculation
        const initialOcc = window.calculateDailyOccupancy(
            asset.units, 
            sim.minOcc, 
            sim.maxOcc, 
            sim.demandPercent
        );
        
        asset.finance = {
            mode: "rented",
            rentPrice: price,
            occupiedUnits: initialOcc,
            occRange: { min: sim.minOcc, max: sim.maxOcc }
        };
    }

    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    closeAssetModal();
    renderPropertyAssets();
    renderSummary();
}

function confirmSellPerUnit() {
    const asset = saveData.assets[assetModalState.index];
    const pricePerUnit = parseRupiah(
        document.getElementById("assetPriceInput").value
    );

    if (!pricePerUnit || pricePerUnit <= 0) {
        showAlertModal("Invalid price per unit.", "Price Error");
        return;
    }

    const sim = simulateSellPerUnit(asset, pricePerUnit);
    if (sim.fail) {
        showAlertModal(sim.reason, "Unable to Sell");
        return;
    }

    asset.finance.sell = {
        status: "listed",
        pricePerUnit,
        totalPrice: pricePerUnit * asset.units,
        listedAt: window.gameTime.toISOString(),
        durationDays: sim.days
    };

    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    closeAssetModal();
    renderPropertyAssets();
}


function executeSell(asset, price) {
    saveData.finance.cash += price;
    const location = saveData.land.locations.find(l => l.name === asset.locationName);
    if (location) {
        location.used -= asset.landUsed;
        if (location.used < 0) location.used = 0;
    }
    saveData.assets = saveData.assets.filter(a => a !== asset);
    showToast(`💰 Property sold for ${formatRupiah(price)}`);
}

// =========================
// LAND SELL FUNCTIONS (FIXED)
// =========================
function confirmLandSell(cityName) {
    const m2 = parseInt(document.getElementById("landSellM2").value);
    const pricePerM2 = parseRupiah(
        document.getElementById("landSellPrice").value
    );

    if (!m2 || m2 < 500) {
        showAlertModal("Minimum sell is 500 m².", "Minimum Area");
        return;
    }

    if (!pricePerM2 || pricePerM2 <= 0) {
        showAlertModal("Invalid price.", "Price Error");
        return;
    }

    const detail = getLandPriceDetail(cityName.toLowerCase());
    const ratio = pricePerM2 / detail.finalPrice;

    if (ratio > 1.3) {
        showAlertModal("Unrealistic pricing. No buyers.", "Price Too High");
        return;
    }

    let durationDays =
        ratio <= 1.0 ? randomRange(60,150) :
        ratio <= 1.15 ? randomRange(180,360) :
        randomRange(360,720);

        durationDays = Math.floor(durationDays);

    saveData.land.sellQueue ||= [];
    saveData.land.sellQueue.push({
        cityName,
        m2,
        pricePerM2,
        listedAt: window.gameTime.toISOString(),
        durationDays,
        status: "listed"
    });

    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    closeAssetModal();
    renderLandByLocation();
    showToast("📋 Land listed for sale");
}


// This function was previously missing
function cancelLandSell(index) {
    if (!saveData.land.sellQueue || !saveData.land.sellQueue[index]) return;
    
    saveData.land.sellQueue.splice(index, 1);
    
    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    renderLandByLocation();
    showToast("❎ Land listing cancelled");
}

function cancelSell(index) {
    const asset = saveData.assets[index];
    if (!asset || !asset.finance?.sell) return;
    delete asset.finance.sell;
    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    renderPropertyAssets();
    showToast("❎ Property listing cancelled");
}

function stopRent(index) {
    saveData.assets[index].finance = { mode: "idle" };
    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    renderPropertyAssets();
}

function closeAssetModal() {
    assetModalState = { index: null, mode: null, price: 0 };
    document.getElementById("assetModal").classList.add("hidden");
    document.body.classList.remove("modal-open");
    window.uiLocked = false;
}

function handleAssetModalOverlay(e) {
    if (e.target.classList.contains("modal-overlay")) closeAssetModal();
}

// =========================
// INIT & TICKS
// =========================
registerGameTick(() => {
    if (window.uiLocked) return;
    renderTopBar();
    renderSummary();
    // ❌ Do not render buttons every frame! Buttons become unclickable
    // renderLandByLocation();
    // renderPropertyAssets();
});

document.addEventListener("DOMContentLoaded", () => {
    renderTopBar();
    renderSummary();
    renderLandByLocation();
    renderPropertyAssets();

    // Event delegation for sell land buttons
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('sell-land-btn') && e.target.closest('#landLocationList')) {
            const city = e.target.dataset.city;
            if (typeof openLandSellModal === "function") {
                openLandSellModal(city);
            }
        }
    });
});

// DAILY HANDLER: PROCESS LISTINGS
registerDailyHandler(function () {
    // ✅ Re-render buttons every day (when data changes)
    setTimeout(() => {
        renderLandByLocation();
        renderPropertyAssets();
    }, 100);

    // Land Sell
    if (Array.isArray(saveData.land?.sellQueue)) {
        saveData.land.sellQueue.forEach(order => {
            if (order.status !== "listed") return;

            const passedDays = Math.floor((window.gameTime - new Date(order.listedAt)) / 86400000);
            
            if (passedDays >= order.durationDays) {
                const priceDetail = getLandPriceDetail(order.cityName.toLowerCase());
                const finalPrice = order.m2 * order.pricePerM2;

                saveData.finance.cash += finalPrice;

                const loc = saveData.land.locations.find(l => l.name === order.cityName);
                if (loc) {
                    const prevTotal = loc.total;
                    const soldHa = order.m2 / 10000;

loc.total -= soldHa;

// CLAMP TOTAL
if (loc.total < 0) loc.total = 0;

// 🔒 HARD RULE: USED MUST NOT EXCEED TOTAL
if (loc.used > loc.total) {
    loc.used = loc.total;
}

// 🔒 CLEAN FLOAT PRECISION
loc.total = parseFloat(loc.total.toFixed(4));
loc.used  = parseFloat(loc.used.toFixed(4));

// 🔥 SOLD OUT TOTAL
if (loc.total === 0) {
    loc.used = 0;
    loc.cost = 0;
    loc._resetCostBasis = true;
    loc._forceHide = true;
}

// Update cost proporsional
if (prevTotal > 0 && loc.cost > 0) {
    loc.cost -= (loc.cost / prevTotal) * soldHa;
}
                }
                order.status = "sold";
                showToast(`💰 Listed land sold for ${formatRupiah(finalPrice)}`);
            }
        });
        saveData.land.sellQueue = saveData.land.sellQueue.filter(o => o.status !== "sold");
    }

    // Property Sell
    saveData.assets.forEach(asset => {
        const sell = asset.finance?.sell;
        if (!sell || sell.status !== "listed") return;
        
        const passedDays = Math.floor((window.gameTime - new Date(sell.listedAt)) / 86400000);
        
        if (passedDays >= sell.durationDays) {
    if (typeof sell.totalPrice !== "number") {
        console.warn("Invalid sell data, cancelling sell:", asset);
        delete asset.finance.sell;
        return;
    }
    executeSell(asset, sell.totalPrice);
    sell.status = "sold";
}
    });
    saveData.assets = saveData.assets.filter(a => a.finance?.sell?.status !== "sold");
});