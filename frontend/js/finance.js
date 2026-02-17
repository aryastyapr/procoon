// ================== LOAD SAVE DATA ==================
if (!window.saveData) {
    alert("No save data found!");
    window.location.href = "mainmenu.html";
}

// ================== ENSURE FINANCE STRUCT ==================
if (!saveData.finance) {
    saveData.finance = {
        cash: 0,
        dailyIncome: 0,
        dailyExpense: 0,
        assetIncome: [],
        history: []
    };
}

// ================== TOP BAR ==================
function renderTopBarFinance() {
    const nameEl = document.getElementById("companyName");
    const balEl = document.getElementById("balance");

    if (nameEl) nameEl.innerText = saveData.companyName || "Company";
    if (balEl) balEl.innerText = formatRupiah(saveData.finance.cash);
}

// ================== SUMMARY CARDS ==================
function renderSummaryCards() {
    const f = saveData.finance;

    const cashEl = document.getElementById("cash");
    const incomeEl = document.getElementById("income");
    const expenseEl = document.getElementById("expense");
    const netCardEl = document.getElementById("netProfitCard");

    const net = f.dailyIncome - f.dailyExpense;

    if (cashEl) cashEl.innerText = formatRupiah(f.cash);
    if (incomeEl) incomeEl.innerText = formatRupiah(f.dailyIncome);
    if (expenseEl) expenseEl.innerText = formatRupiah(f.dailyExpense);

    if (netCardEl) {
        netCardEl.innerText = formatRupiah(net);
        netCardEl.style.color = net >= 0 ? "#22c55e" : "#ef4444";
    }
}

// ================== DAILY FINANCIAL REPORT ==================
// LAST COMPLETED DAY (BUKAN HARI BERJALAN)
function renderDailyReport() {
    const incomeEl = document.getElementById("dailyIncomeReport");
    const expenseEl = document.getElementById("dailyExpenseReport");
    const netEl = document.getElementById("dailyNetReport");

    const history = saveData.finance.history;
    const lastDay = history.length ? history[history.length - 1] : null;

    if (!incomeEl || !expenseEl || !netEl) return;

    if (!lastDay) {
        incomeEl.innerText = "Rp 0";
        expenseEl.innerText = "Rp 0";
        netEl.innerText = "Rp 0";
        netEl.style.color = "#94a3b8";
        return;
    }

    incomeEl.innerText = formatRupiah(lastDay.income);
    expenseEl.innerText = formatRupiah(lastDay.expense);
    netEl.innerText = formatRupiah(lastDay.net);
    netEl.style.color = lastDay.net >= 0 ? "#22c55e" : "#ef4444";
}

// ================== DAILY INCOME BREAKDOWN ==================
function renderDailyIncomeBreakdown() {
    const list = document.getElementById("dailyIncomeBreakdown");
    if (!list) return;

    list.innerHTML = "";

    const items = saveData.finance.assetIncome;
    if (!items || !items.length) {
        list.innerHTML = `<div class="hint">No active rental income</div>`;
        return;
    }

    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "asset-income-item";
        row.innerHTML = `
            <span>${item.name} – ${item.variant}</span>
            <span>+ ${formatRupiah(item.income)} / day</span>
        `;
        list.appendChild(row);
    });
}

// ================== MONTHLY & YEARLY REPORT ==================
function renderMonthlyYearlyReport() {
    const history = saveData.finance.history || [];
    const now = window.gameTime;
    if (!now) return;

    let mIncome = 0, mExpense = 0;
    let yIncome = 0, yExpense = 0;

    history.forEach(h => {
        const d = new Date(h.date);

        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            mIncome += h.income;
            mExpense += h.expense;
        }

        if (d.getFullYear() === now.getFullYear()) {
            yIncome += h.income;
            yExpense += h.expense;
        }
    });

    const mi = document.getElementById("monthlyIncome");
    const me = document.getElementById("monthlyExpense");
    const mn = document.getElementById("monthlyNet");
    const yi = document.getElementById("yearlyIncome");
    const ye = document.getElementById("yearlyExpense");
    const yn = document.getElementById("yearlyNet");

    if (mi) mi.innerText = formatRupiah(mIncome);
    if (me) me.innerText = formatRupiah(mExpense);
    if (mn) mn.innerText = formatRupiah(mIncome - mExpense);

    if (yi) yi.innerText = formatRupiah(yIncome);
    if (ye) ye.innerText = formatRupiah(yExpense);
    if (yn) yn.innerText = formatRupiah(yIncome - yExpense);
}

// ================== TAB HANDLER ==================
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".report-section").forEach(s => s.classList.remove("active"));

        btn.classList.add("active");
        const target = document.getElementById("report-" + btn.dataset.tab);
        if (target) target.classList.add("active");
    });
});

// ================== INITIAL RENDER ==================
renderTopBarFinance();
renderSummaryCards();
renderDailyReport();
renderDailyIncomeBreakdown();
renderMonthlyYearlyReport();

// ================== REAL-TIME UPDATE (GAME LOOP) ==================
registerGameTick(() => {
    renderTopBarFinance();
    renderSummaryCards();
    renderDailyReport();
    renderDailyIncomeBreakdown();
    renderMonthlyYearlyReport();
});
