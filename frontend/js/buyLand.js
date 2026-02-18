if (!window.saveData) {
    showAlertModal("No save data found!", "Missing Save").then(() => location.href = "mainmenu.html");
    throw new Error("Missing save data");
}

// ================= INIT =================
const citySelect = document.getElementById("citySelect");
const landSizeInput = document.getElementById("landSize");

Object.entries(CITY_CONFIG).forEach(([id, city]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = city.name;
    citySelect.appendChild(opt);
});

citySelect.onchange = updatePrice;
landSizeInput.oninput = updatePrice;

updatePrice();


// ================= PRICE CALC =================
function updatePrice() {
    const cityId = citySelect.value;
    const ha = parseFloat(landSizeInput.value) || 0;

    const detail = getLandPriceDetail(cityId);
    if (!detail) return;

    const marketEl = document.getElementById("marketCycle");
    if (marketEl) {
    marketEl.innerText = detail.cycle.toUpperCase();
    }

    const m2 = ha * 10000;
    const total = detail.finalPrice * m2;

    document.getElementById("pricePerM2").innerText =
        formatRupiah(detail.finalPrice);

    document.getElementById("totalCost").innerText =
        formatRupiah(total);

    // ===============================
// PHASE 2: ROI + STRATEGY
// ===============================
const roiBox = document.getElementById("cashImpact");
if (roiBox) {

    // ===============================
    // ROI REQUIRES LAND SIZE
    // ===============================
    if (!ha || ha <= 0) {
        roiBox.innerHTML = `
            <div class="roi-box" style="opacity:0.7">
                <strong>📈 Investment Projection (5 Years)</strong>
                <div style="margin-top:6px;font-size:12px">
                    ℹ Enter land size to see investment projection
                </div>

                <hr>

                <div>
                    🏗 Recommended Development:<br>
                    <b>${getBestLandUse(cityId, 0.2).join(", ")}</b>
                </div>
            </div>
        `;
        return;
    }

    // ===============================
    // ROI CALCULATION (VALID STATE)
    // ===============================
    const roi = calculateLandROI({
        cityId,
        landHa: ha,
        years: 5
    });

    const bestUse = getBestLandUse(cityId, 0.2);
    const cashAfter = saveData.finance.cash - total;
    const risk = getLandRiskLevel(cityId, cashAfter);

    roiBox.innerHTML = `
        <div class="roi-box">
            <strong>📈 Investment Projection (5 Years)</strong>
            <div>Est. Value: ${formatRupiah(roi.futureValue)}</div>
            <div>ROI: <b>${roi.roiPercent}%</b></div>

            <hr>

            <div>
                🏗 Recommended Development:<br>
                <b>${bestUse.join(", ")}</b>
            </div>

            <div style="margin-top:6px">
                ⚠ Risk Level:
                <b class="risk-${risk.toLowerCase()}">${risk}</b>
            </div>
        </div>
    `;
}

}

// ================= BUY LAND =================
async function confirmBuyLand() {
    const city = citySelect.value;
    const ha = parseFloat(landSizeInput.value);

    if (!ha || ha <= 0)
        return showAlertModal("Invalid land size", "Input Error");

    const detail = getLandPriceDetail(city);
if (!detail) return showAlertModal("Market data unavailable", "Market Error");

const pricePerM2 = detail.finalPrice;
    const m2 = ha * 10000;
    const totalCost = pricePerM2 * m2;

    if (saveData.finance.cash < totalCost)
        return showAlertModal("Insufficient cash", "Not Enough Cash");

    // ===============================
// CASH IMPACT WARNING
// ===============================
const remainingCash =
    saveData.finance.cash - totalCost;

if (remainingCash < saveData.finance.cash * 0.25) {
    const proceed = await showConfirmModal(
        "⚠ WARNING:\nThis purchase will consume most of your cash.\n\nProceed anyway?",
        "Low Cash Warning",
        "Proceed",
        "Cancel"
    );
    if (!proceed) return;
}

    // POTONG CASH
    saveData.finance.cash -= totalCost;

    document.getElementById("balance").innerText = formatRupiah(saveData.finance.cash);

    // ================================
// UPDATE LAND BY LOCATION (FIX)
// ================================
let location = saveData.land.locations.find(
    l => l.name.toLowerCase() === city.toLowerCase()
);

if (location) {
    location.total += ha;
    location.cost = (location.cost || 0) + totalCost;
} else {
    saveData.land.locations.push({
        id: city.toLowerCase(),
        name: city,
        total: ha,
        used: 0,
        cost: totalCost
    });
}
    

    saveData.land.total += ha;

    localStorage.setItem("procoon_save", JSON.stringify(saveData));
    showToast("🏞️ Land purchased successfully!");

setTimeout(() => {
    location.href = "assets.html";
}, 800);

}
