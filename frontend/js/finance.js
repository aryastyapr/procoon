// ==========================================================
// FINANCE.JS - ALL IN FIX (MANUAL & SECURE)
// ==========================================================

// ================== 1. HELPERS & FORMATTER ==================

// Format to Rupiah (Rp 1.000.000)
function safeFormatRupiah(number) {
    if (isNaN(number) || number === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(number);
}

// Format numbers only with dots (1.000.000) for input
function formatNumberWithDots(str) {
    // Remove non-digit characters
    let cleanVal = str.replace(/\D/g, "");
    if(cleanVal === "") return "";
    // Add thousand separators
    return parseInt(cleanVal).toLocaleString("id-ID");
}

// Get raw integer value from dotted input
function parseRawNumber(str) {
    if(!str) return 0;
    return parseInt(str.replace(/\./g, '')) || 0;
}

// Get game time
function getGameTimeSafe() {
    return window.gameTime ? new Date(window.gameTime) : new Date();
}

function parseHistoryDate(dateValue) {
    const parsed = new Date(dateValue);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameDay(dateA, dateB) {
    return (
        dateA.getFullYear() === dateB.getFullYear() &&
        dateA.getMonth() === dateB.getMonth() &&
        dateA.getDate() === dateB.getDate()
    );
}

function buildFinanceReportData(history, referenceDate) {
    const report = {
        daily: { income: 0, expense: 0, net: 0 },
        monthly: { 
            income: 0, expense: 0, net: 0, daysTracked: 0, avgNetPerDay: 0, 
            bestDayNet: null, bestDayLabel: "-", worstDayNet: null, worstDayLabel: "-",
            trend: "stable", totalDaysInMonth: 0
        },
        yearly: { 
            income: 0, expense: 0, net: 0, monthsTracked: 0, avgNetPerMonth: 0, 
            bestMonthNet: null, bestMonthLabel: "-", worstMonthNet: null, worstMonthLabel: "-",
            trend: "stable", totalMonthsInYear: 0
        }
    };

    const monthlyDayNetMap = new Map();
    const yearlyMonthNetMap = new Map();
    const monthlyDaysSet = new Set();
    const dailyNetValues = [];
    const monthlyNetValues = [];

    (history || []).forEach(entry => {
        const entryDate = parseHistoryDate(entry.date);
        if (!entryDate) return;

        const income = Number(entry.income) || 0;
        const expense = Number(entry.expense) || 0;
        const net = Number(entry.net ?? (income - expense)) || 0;

        if (isSameDay(entryDate, referenceDate)) {
            report.daily.income += income;
            report.daily.expense += expense;
            report.daily.net += net;
        }

        const isSameMonth =
            entryDate.getFullYear() === referenceDate.getFullYear() &&
            entryDate.getMonth() === referenceDate.getMonth();

        if (isSameMonth) {
            report.monthly.income += income;
            report.monthly.expense += expense;
            report.monthly.net += net;

            const dayKey = entryDate.toDateString();
            monthlyDaysSet.add(dayKey);
            monthlyDayNetMap.set(dayKey, (monthlyDayNetMap.get(dayKey) || 0) + net);
        }

        const isSameYear = entryDate.getFullYear() === referenceDate.getFullYear();
        if (isSameYear) {
            report.yearly.income += income;
            report.yearly.expense += expense;
            report.yearly.net += net;

            const monthKey = `${entryDate.getFullYear()}-${entryDate.getMonth()}`;
            yearlyMonthNetMap.set(monthKey, (yearlyMonthNetMap.get(monthKey) || 0) + net);
        }
    });

    // Monthly advance metrics
    report.monthly.daysTracked = monthlyDaysSet.size;
    report.monthly.avgNetPerDay = report.monthly.daysTracked > 0
        ? Math.round(report.monthly.net / report.monthly.daysTracked)
        : 0;

    let bestDay = null, worstDay = null;
    monthlyDayNetMap.forEach((value, key) => {
        if (!bestDay || value > bestDay.value) bestDay = { key, value };
        if (!worstDay || value < worstDay.value) worstDay = { key, value };
    });
    
    if (bestDay) {
        report.monthly.bestDayNet = bestDay.value;
        const bestDayDate = new Date(bestDay.key);
        report.monthly.bestDayLabel = Number.isNaN(bestDayDate.getTime())
            ? bestDay.key
            : bestDayDate.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    }
    
    if (worstDay) {
        report.monthly.worstDayNet = worstDay.value;
        const worstDayDate = new Date(worstDay.key);
        report.monthly.worstDayLabel = Number.isNaN(worstDayDate.getTime())
            ? worstDay.key
            : worstDayDate.toLocaleDateString("en-US", { day: "2-digit", month: "short" });
    }

    // Trend: compare first half vs second half of the month
    const sortedDates = Array.from(monthlyDaysSet).sort();
    if (sortedDates.length > 1) {
        const mid = Math.floor(sortedDates.length / 2);
        const firstHalf = sortedDates.slice(0, mid).reduce((sum, d) => sum + (monthlyDayNetMap.get(d) || 0), 0);
        const secondHalf = sortedDates.slice(mid).reduce((sum, d) => sum + (monthlyDayNetMap.get(d) || 0), 0);
        if (secondHalf > firstHalf * 1.1) report.monthly.trend = "📈 increasing";
        else if (secondHalf < firstHalf * 0.9) report.monthly.trend = "📉 decreasing";
        else report.monthly.trend = "➡️ stable";
    }
    report.monthly.totalDaysInMonth = sortedDates.length;

    // Yearly advance metrics
    report.yearly.monthsTracked = yearlyMonthNetMap.size;
    report.yearly.avgNetPerMonth = report.yearly.monthsTracked > 0
        ? Math.round(report.yearly.net / report.yearly.monthsTracked)
        : 0;

    let bestMonth = null, worstMonth = null;
    yearlyMonthNetMap.forEach((value, key) => {
        if (!bestMonth || value > bestMonth.value) bestMonth = { key, value };
        if (!worstMonth || value < worstMonth.value) worstMonth = { key, value };
    });
    
    if (bestMonth) {
        const [yearStr, monthStr] = bestMonth.key.split("-");
        const monthIndex = Number(monthStr);
        const year = Number(yearStr);
        const monthDate = new Date(year, monthIndex, 1);
        report.yearly.bestMonthNet = bestMonth.value;
        report.yearly.bestMonthLabel = Number.isNaN(monthDate.getTime())
            ? bestMonth.key
            : monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    
    if (worstMonth) {
        const [yearStr, monthStr] = worstMonth.key.split("-");
        const monthIndex = Number(monthStr);
        const year = Number(yearStr);
        const monthDate = new Date(year, monthIndex, 1);
        report.yearly.worstMonthNet = worstMonth.value;
        report.yearly.worstMonthLabel = Number.isNaN(monthDate.getTime())
            ? worstMonth.key
            : monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }

    // Trend: compare first half vs second half of the year
    const sortedMonths = Array.from(yearlyMonthNetMap.keys()).sort();
    if (sortedMonths.length > 1) {
        const mid = Math.floor(sortedMonths.length / 2);
        const firstHalf = sortedMonths.slice(0, mid).reduce((sum, d) => sum + (yearlyMonthNetMap.get(d) || 0), 0);
        const secondHalf = sortedMonths.slice(mid).reduce((sum, d) => sum + (yearlyMonthNetMap.get(d) || 0), 0);
        if (secondHalf > firstHalf * 1.1) report.yearly.trend = "📈 increasing";
        else if (secondHalf < firstHalf * 0.9) report.yearly.trend = "📉 decreasing";
        else report.yearly.trend = "➡️ stable";
    }
    report.yearly.totalMonthsInYear = sortedMonths.length;

    return report;
}

// ================== 2. LOAN LOGIC ==================

// Credit limit calculation - available credit after subtracting active loans
function calculateCreditLimit() {
    const dailyIncome = window.saveData.finance.dailyIncome || 0;
    
    // RULE: if income <= 0, loan is not allowed.
    if (dailyIncome <= 0) return 0;

    // RULE: maximum loan = 100x daily income (about 3 months of income)
    // Example: 10M/day income -> 1B max loan
    const maxCredit = dailyIncome * 100;
    
    // Subtract outstanding principal from active loans
    const loans = window.saveData.finance.loans || [];
    const totalOutstanding = loans
        .filter(l => l.status === "active")
        .reduce((sum, l) => sum + (l.outstandingPrincipal || 0), 0);
    
    const availableCredit = Math.max(0, maxCredit - totalOutstanding);
    return availableCredit;
}

// Calculate interest & installments
window.calculateLoanDetails = function(principal, years) {
    // Interest mapping (more sensible): mapping provided are interpreted as ANNUAL rates
    // We'll convert to monthly by dividing by 12.
    // Mapping (annual rates): 1y=7% p.a., 2y=10% p.a., 3y=15% p.a., 4y=18% p.a., 5y=21% p.a.
    const annualRateMap = {
        1: 0.07,
        2: 0.10,
        3: 0.15,
        4: 0.18,
        5: 0.21
    };

    const totalMonths = years * 12;
    const annualRate = annualRateMap[years] ?? 0.10; // fallback 10% p.a.
    const monthlyRate = annualRate / 12;

    // Monthly payment using amortizing loan formula
    // A = P * (i*(1+i)^n) / ((1+i)^n - 1)
    const i = monthlyRate;
    let monthlyInstallment;
    if (i === 0) {
        monthlyInstallment = Math.floor(principal / totalMonths);
    } else {
        const factor = Math.pow(1 + i, totalMonths);
        monthlyInstallment = Math.ceil(principal * (i * factor) / (factor - 1));
    }

    const totalPayment = monthlyInstallment * totalMonths;
    const totalInterest = totalPayment - principal;

    return { annualRate, monthlyRate, totalMonths, monthlyInstallment, totalPayment, totalInterest };
};

// Update simulation display in modal
window.updateLoanSimulation = function() {
    const amountStr = document.getElementById("loanAmount").value;
    const principal = parseRawNumber(amountStr);
    const years = parseInt(document.getElementById("loanTenor").value);
    const infoBox = document.getElementById("loanInfo");
    
    // Show credit limit in header
    const limit = calculateCreditLimit();
    const limitEl = document.getElementById("creditLimitDisplay");
    if(limitEl) {
        if(limit > 0) {
            limitEl.innerHTML = `Your Credit Limit: <span style="color:#22c55e">${safeFormatRupiah(limit)}</span>`;
        } else {
            limitEl.innerHTML = `<span style="color:#ef4444">⚠️ No income detected. Credit is frozen.</span>`;
        }
    }

    // Validate input
    // If empty, show placeholder + limit
    if (!principal || principal <= 0) {
        infoBox.innerHTML = `
            <div style="text-align:center; padding:20px; color:#64748b;">
                <div style="font-size:48px; margin-bottom:12px; opacity:0.3;">💰</div>
                <div style="font-size:13px; line-height:1.6;">
                    Enter a loan amount to see the simulation.<br>
                    <strong style="color:#94a3b8;">Minimum Rp 10.000.000</strong>
                </div>
                ${limit > 0 ? `<div style="margin-top:12px; font-size:12px; color:#22c55e;">Credit limit: ${safeFormatRupiah(limit)}</div>` : ''}
            </div>`;
        return;
    }

    // Check over limit
    if (principal > limit && limit > 0) {
        infoBox.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <div style="font-size:48px; margin-bottom:12px;">🚫</div>
                <div style="font-size:14px; color:#fca5a5; line-height:1.6;">
                    <strong>Exceeds Credit Limit</strong><br>
                    <span style="font-size:12px; color:#94a3b8;">
                        Amount: ${safeFormatRupiah(principal)}<br>
                        Limit: ${safeFormatRupiah(limit)}
                    </span>
                </div>
            </div>`;
        return;
    }

    const calc = window.calculateLoanDetails(principal, years);

    // Calculate first due date preview
    const previewStart = getGameTimeSafe();
    const previewFirstDue = new Date(previewStart);
    previewFirstDue.setMonth(previewFirstDue.getMonth() + 1);
    previewFirstDue.setDate(5);
    const daysPreview = Math.ceil((previewFirstDue - previewStart) / (1000*60*60*24));
    if (daysPreview < 5) {
        previewFirstDue.setMonth(previewFirstDue.getMonth() + 1);
    }
    const firstDueStr = previewFirstDue.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });

    infoBox.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; padding-bottom:10px; border-bottom:1px solid rgba(148,163,184,0.1);">
                <div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:4px;">Total Loan</div>
                    <strong style="font-size:15px; color:#f8fafc;">${safeFormatRupiah(principal)}</strong>
                </div>
                <div>
                    <div style="font-size:11px; color:#64748b; margin-bottom:4px;">Term</div>
                    <strong style="font-size:15px; color:#f8fafc;">${years} Years <span style="font-size:12px; color:#94a3b8;">(${calc.totalMonths} months)</span></strong>
                </div>
            </div>
            
            <div style="text-align:center; padding:12px; background:linear-gradient(135deg, rgba(251,191,36,0.12), rgba(245,158,11,0.06)); border-radius:8px; border:1px solid rgba(251,191,36,0.2);">
                <div style="font-size:11px; color:#94a3b8; margin-bottom:4px;">Monthly Installment</div>
                <strong style="font-size:22px; color:#fbbf24; display:block; margin-bottom:2px;">${safeFormatRupiah(calc.monthlyInstallment)}</strong>
                <div style="font-size:11px; color:#cbd5f5;">Interest ${(calc.annualRate*100).toFixed(1)}% p.a. • Total Interest ≈ ${safeFormatRupiah(calc.totalInterest)}</div>
            </div>
            
            <div style="font-size:12px; padding:10px; background:rgba(59,130,246,0.08); border-left:3px solid rgba(59,130,246,0.5); border-radius:4px;">
                <strong style="color:#93c5fd;">📅 Payment Schedule:</strong><br>
                <div style="color:#cbd5f5; margin-top:6px; line-height:1.5;">
                    • First Payment: <strong>${firstDueStr}</strong><br>
                    • Recurring: Every <strong>5th</strong>
                </div>
            </div>
            
            <div style="font-size:11px; padding:10px; background:rgba(239,68,68,0.08); border-left:3px solid rgba(239,68,68,0.5); border-radius:4px; color:#fca5a5; line-height:1.5;">
                <strong>⚠️ Penalty:</strong> 0.1% per day (max 30%) without grace period.
            </div>
        </div>
    `;
};

// Execute loan application
window.confirmLoan = async function() {
    const amountStr = document.getElementById("loanAmount").value;
    const principal = parseRawNumber(amountStr);
    const years = parseInt(document.getElementById("loanTenor").value);
    const limit = calculateCreditLimit();

    // Layered validation
    if (!principal || principal < 10000000) {
        await showAlertModal("Minimum loan amount is Rp 10.000.000", "Loan Validation");
        return;
    }

    if (limit <= 0) {
        await showAlertModal("Rejected: Your company has no daily income!", "Loan Rejected");
        return;
    }

    if (principal > limit) {
        await showAlertModal(`Rejected: Exceeds credit limit (${safeFormatRupiah(limit)})`, "Loan Rejected");
        return;
    }

    // Approval process
    const calc = window.calculateLoanDetails(principal, years);
    const start = getGameTimeSafe();
    const nextDue = new Date(start);
    nextDue.setMonth(nextDue.getMonth() + 1);

    // Set first due date to the 5th of next month (or the following month if too close)
    const firstDue = new Date(start);
    firstDue.setMonth(firstDue.getMonth() + 1);
    firstDue.setDate(5);
    
    // If loan starts on day 1-5, first due date is next month's 5th
    // If starts on day 6-31, still next month's 5th (~5 days minimum)
    // If less than 5 days away, shift one more month
    const daysUntilDue = Math.ceil((firstDue - start) / (1000*60*60*24));
    if (daysUntilDue < 5) {
        firstDue.setMonth(firstDue.getMonth() + 1);
    }

    const autoPayEnabled = document.getElementById("loanAutoPayToggle")?.checked ?? false;

    const newLoan = {
        id: "LN-" + Date.now(),
        principal: principal,
        outstandingPrincipal: principal,
        monthlyInstallment: calc.monthlyInstallment,
        remainingMonths: calc.totalMonths,
        startDate: start.toISOString(),
        nextDueDate: firstDue.toISOString(),
        status: "active",
        lastPaidMonth: null,
        autoPayEnabled: autoPayEnabled
    };

    // Extra bookkeeping fields to keep monthly processing stable
    newLoan.monthlyRate = calc.monthlyRate; // monthly interest fraction
    newLoan.annualRate = calc.annualRate;
    newLoan.missedPayments = 0;
    newLoan.accruedInterest = 0;
    newLoan.reminderSent = false;
    newLoan.totalPayment = calc.totalPayment;
    newLoan.totalInterest = calc.totalInterest;

    window.saveData.finance.loans.push(newLoan);
    window.saveData.finance.cash += principal;

    // Save & refresh
    localStorage.setItem("procoon_save", JSON.stringify(window.saveData));
    window.closeLoanModal();
    window.renderAllFinanceUI();
    showAlertModal(`✅ Loan ${safeFormatRupiah(principal)} has been disbursed!`, "Loan Approved");
};

// ================== 3. PAYMENT LOGIC (STRICT MANUAL) ==================

// Render debt panel
function renderActiveLoansPanel() {
    const container = document.querySelector(".finance-content");
    let loanPanel = document.getElementById("activeLoansPanel");

    // Create panel container if missing
    if (!loanPanel) {
        loanPanel = document.createElement("section");
        loanPanel.id = "activeLoansPanel";
        loanPanel.className = "finance-report"; 
        loanPanel.style.marginBottom = "24px";
        loanPanel.style.marginTop = "20px";
        
        // Place debt panel at the top (before Take Loan button)
        const openBtn = document.getElementById("openLoanBtn");
        if (container && openBtn && openBtn.parentNode === container) {
            container.insertBefore(loanPanel, openBtn);
        } else if (container) {
            container.prepend(loanPanel);
        }

        // Ensure the debt panel always receives clicks
        loanPanel.style.position = "relative";
        loanPanel.style.zIndex = "2";
    }

    const loans = window.saveData.finance.loans.filter(l => l.status === "active");

    if (loans.length === 0) {
        loanPanel.style.display = "none";
        return;
    }

    loanPanel.style.display = "block";
    let html = `
        <h3 style="margin-bottom:15px; color:#ef4444; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:10px;">
            ⚠️ Outstanding Debt (Manual Payment)
        </h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">
    `;

    loans.forEach(loan => {
        const nextDue = new Date(loan.nextDueDate);
        const today = getGameTimeSafe();
        const diffDays = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));

        let statusBadge, borderColor;
           if (diffDays <= 0) {
               statusBadge = `<span style="color:#ef4444; font-weight:bold; font-size:12px;">🔥 OVERDUE</span>`;
             borderColor = "#ef4444";
        } else {
               statusBadge = `<span style="color:#f59e0b; font-weight:bold; font-size:12px;">⏰ Due In: ${diffDays} Days</span>`;
             borderColor = "#f59e0b";
        }

        const autoToggleId = `autoToggle_${loan.id}`;
        const isAutoOn = loan.autoPayEnabled ?? false;

        html += `
            <div style="background:rgba(15, 23, 42, 0.6); padding:15px; border-radius:10px; border:1px solid ${borderColor};">
                <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
                    <strong style="color:#fff;">Loan #${loan.id.substr(-4)}</strong>
                    ${statusBadge}
                </div>
                <div style="font-size:12px; color:#94a3b8; margin-bottom:12px;">
                    Disbursed Principal: <b style="color:#cbd5f5">${safeFormatRupiah(loan.principal)}</b><br>
                    Remaining Payment: <b style="color:#cbd5f5">${safeFormatRupiah((loan.monthlyInstallment || 0) * (loan.remainingMonths || 0))}</b><br>
                    Remaining Term: <b style="color:#cbd5f5">${loan.remainingMonths} Months</b>
                </div>
                <div style="display:flex; align-items:center; gap:8px; padding:8px; background:rgba(0,0,0,0.2); border-radius:6px; margin-bottom:10px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; color:#cbd5f5;">
                        <input type="checkbox" id="${autoToggleId}" data-loan-id="${loan.id}" ${isAutoOn ? 'checked' : ''} style="cursor:pointer;">
                        <span>Auto-Pay (with buffer protection)</span>
                    </label>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px;">
                    <div>
                        <span style="font-size:11px; color:#64748b;">Tagihan:</span><br>
                        <strong style="color:#fbbf24; font-size:15px;">${safeFormatRupiah(loan.monthlyInstallment)}</strong>
                    </div>
                    <button type="button" class="pay-btn" data-id="${loan.id}" style="padding:8px 16px; border-radius:6px; background:#22c55e; color:#020617; font-weight:bold; border:none; cursor:pointer;">PAY</button>
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    loanPanel.innerHTML = html;

    // Attach event listeners for auto-pay toggles
    const activeLoans = window.saveData.finance.loans.filter(l => l.status === "active");
    activeLoans.forEach(loan => {
        const toggleEl = document.getElementById(`autoToggle_${loan.id}`);
        if (toggleEl) {
            toggleEl.addEventListener('change', function() {
                loan.autoPayEnabled = this.checked;
                localStorage.setItem("procoon_save", JSON.stringify(window.saveData));
                const statusText = this.checked ? "enabled" : "disabled";
                window.showToast(`Auto-Pay ${statusText} for Loan #${loan.id.substr(-4)}`, "info", 2000);
            });
        }
    });
}

window.activePaymentLoanId = null;

function processSingleInstallment(loan, processDate) {
    if (window.saveData.finance.cash < loan.monthlyInstallment) {
        return { ok: false, reason: "insufficient-balance" };
    }

    window.saveData.finance.cash -= loan.monthlyInstallment;

    const monthlyRate = loan.monthlyRate || ((loan.rate || 0) / 12) || 0;
    const interestPortion = Math.floor((loan.outstandingPrincipal || 0) * monthlyRate);
    let principalPortion = loan.monthlyInstallment - interestPortion;
    if (principalPortion < 0) principalPortion = 0;
    principalPortion = Math.min(principalPortion, loan.outstandingPrincipal || 0);

    loan.outstandingPrincipal = (loan.outstandingPrincipal || 0) - principalPortion;
    if (loan.outstandingPrincipal < 0) loan.outstandingPrincipal = 0;

    loan.remainingMonths = Math.max(0, (loan.remainingMonths || 0) - 1);
    loan.lastPaidMonth = `${processDate.getFullYear()}-${processDate.getMonth()}`;

    const nextDueDate = new Date(loan.nextDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    loan.nextDueDate = nextDueDate.toISOString();

    window.saveData.finance.history.push({
        date: processDate.toDateString(),
        income: 0,
        expense: loan.monthlyInstallment,
        net: -loan.monthlyInstallment,
        note: `Installment #${loan.id.substr(-4)} (principal ${safeFormatRupiah(principalPortion)}, interest ${safeFormatRupiah(interestPortion)})`
    });

    return {
        ok: true,
        amountPaid: loan.monthlyInstallment,
        principalPortion,
        interestPortion
    };
}

window.openLoanPaymentModal = async function(loanId) {
    const loan = window.saveData.finance.loans.find(l => l.id === loanId);
    if (!loan) return;

    window.activePaymentLoanId = loanId;
    const modal = document.getElementById("loanPaymentModal");
    const monthsInput = document.getElementById("paymentMonths");
    const paymentLoanCodeEl = document.getElementById("paymentLoanCode");
    const paymentMonthlyBillEl = document.getElementById("paymentMonthlyBill");
    const paymentRemainingTenorEl = document.getElementById("paymentRemainingTenor");
    const paymentCurrentCashEl = document.getElementById("paymentCurrentCash");
    const maxByTenor = Math.max(1, loan.remainingMonths || 1);

    // Calculate penalty if any (0.1% per day, max 30%)
    const penalty = calculateLoanPenalty(loan);
    window.currentLoanPenalty = penalty;
    
    // Calculate overdue installments
    const overdueList = calculateOverdueInstallments(loan);
    window.currentOverdueList = overdueList;

    // Fallback safety: if modal elements are missing (old HTML cache / failed load),
    // keep manual prompt payment so the PAY button still works.
    if (!modal || !monthsInput || !paymentLoanCodeEl || !paymentMonthlyBillEl || !paymentRemainingTenorEl || !paymentCurrentCashEl) {
        const raw = await showPromptModal(`Pay installments for Loan #${loan.id.substr(-4)}. Enter number of months (1-${maxByTenor}):`, "1", "Pay Installments", "Pay", "Cancel");
        if (raw === null) return;

        let months = parseInt(raw, 10);
        if (Number.isNaN(months) || months < 1) months = 1;
        months = Math.min(months, maxByTenor);
        await window.payInstallment(loanId, months);
        return;
    }

    paymentLoanCodeEl.innerText = `Loan #${loan.id.substr(-4)}`;
    paymentMonthlyBillEl.innerText = safeFormatRupiah(loan.monthlyInstallment || 0);
    
    // Display remaining term + overdue info
    let tenorText = `${loan.remainingMonths || 0} months`;
    if (overdueList.length > 0) {
        tenorText += ` <span style="color:#ef4444; font-weight:700;">(${overdueList.length} months overdue)</span>`;
    }
    paymentRemainingTenorEl.innerHTML = tenorText;
    paymentCurrentCashEl.innerText = safeFormatRupiah(window.saveData.finance.cash || 0);
    
    // Render overdue list
    renderOverdueList(overdueList, loan);

    monthsInput.min = 1;
    monthsInput.step = 1;
    monthsInput.max = maxByTenor;
    monthsInput.value = 1;

    // Pastikan listener aktif walau ada race di DOMContentLoaded
    monthsInput.removeEventListener("input", window.updateLoanPaymentSimulation);
    monthsInput.addEventListener("input", window.updateLoanPaymentSimulation);
    monthsInput.removeEventListener("change", window.updateLoanPaymentSimulation);
    monthsInput.addEventListener("change", window.updateLoanPaymentSimulation);

    window.updateLoanPaymentSimulation();
    modal.classList.remove("hidden");
    window.isRunning = false;
};

// Render overdue installment list
function renderOverdueList(overdueList, loan) {
    const container = document.getElementById("overdueListContainer");
    if (!container) return;
    
    if (overdueList.length === 0) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    
    // If <= 6 months, show detailed list
    if (overdueList.length <= 6) {
        let html = `
            <div style="margin-bottom:16px; padding:12px; background:rgba(239,68,68,0.08); border-left:3px solid #ef4444; border-radius:6px;">
                <strong style="color:#fca5a5; font-size:13px;">⚠️ Overdue Installments (${overdueList.length} months)</strong>
            </div>
            <div style="display:flex; flex-direction:column; gap:10px;">
        `;
        
        overdueList.forEach((item, index) => {
            const monthName = item.dueDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const isAffordable = (window.saveData.finance.cash || 0) >= item.total;
            
            html += `
                <div style="padding:12px; background:rgba(15,23,42,0.5); border:1px solid rgba(239,68,68,0.3); border-radius:8px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div>
                            <strong style="color:#f8fafc; font-size:13px;">${monthName}</strong>
                            <span style="color:#64748b; font-size:11px; margin-left:8px;">(${item.daysLate} days late)</span>
                        </div>
                        <button 
                            class="pay-single-overdue-btn" 
                            data-overdue-index="${index}"
                            ${!isAffordable ? 'disabled' : ''}
                            style="padding:6px 14px; border-radius:6px; background:${isAffordable ? '#22c55e' : 'rgba(148,163,184,0.2)'}; color:${isAffordable ? '#020617' : '#64748b'}; font-weight:600; font-size:12px; border:none; cursor:${isAffordable ? 'pointer' : 'not-allowed'};">
                            Pay
                        </button>
                    </div>
                    <div style="font-size:12px; color:#cbd5f5; line-height:1.5;">
                        Installment: ${safeFormatRupiah(item.monthlyInstallment)}<br>
                        <span style="color:#fca5a5;">+ Penalty: ${safeFormatRupiah(item.penalty)}</span><br>
                        <strong style="color:#fbbf24;">Total: ${safeFormatRupiah(item.total)}</strong>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
        // Attach event listeners
        document.querySelectorAll('.pay-single-overdue-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.getAttribute('data-overdue-index'));
                paySpecificOverdueMonth(index);
            });
        });
        
    } else {
        // If > 6 months, show summary + bulk actions
        const totalOverdue = overdueList.reduce((sum, item) => sum + item.total, 0);
        const totalPrincipal = overdueList.reduce((sum, item) => sum + item.monthlyInstallment, 0);
        const totalPenalty = overdueList.reduce((sum, item) => sum + item.penalty, 0);
        
        const recent6 = overdueList.slice(0, 6);
        const total6 = recent6.reduce((sum, item) => sum + item.total, 0);
        
        const canPayAll = (window.saveData.finance.cash || 0) >= totalOverdue;
        const canPay6 = (window.saveData.finance.cash || 0) >= total6;
        
        container.innerHTML = `
            <div style="padding:16px; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.4); border-radius:10px;">
                <div style="text-align:center; margin-bottom:16px;">
                    <div style="font-size:40px; margin-bottom:8px;">⚠️</div>
                    <strong style="color:#fca5a5; font-size:16px; display:block; margin-bottom:4px;">High Arrears</strong>
                    <div style="font-size:13px; color:#cbd5f5;">
                        ${overdueList.length} months overdue
                    </div>
                </div>
                
                <div style="padding:12px; background:rgba(0,0,0,0.3); border-radius:8px; margin-bottom:12px;">
                    <div style="font-size:12px; color:#94a3b8; line-height:1.6;">
                        Installment: ${safeFormatRupiah(totalPrincipal)}<br>
                        Penalty: <span style="color:#fca5a5;">${safeFormatRupiah(totalPenalty)}</span><br>
                        <strong style="color:#fbbf24; font-size:14px;">Total: ${safeFormatRupiah(totalOverdue)}</strong>
                    </div>
                </div>
                
                <div style="display:flex; gap:8px;">
                    <button 
                        id="pay6OverdueBtn"
                        ${!canPay6 ? 'disabled' : ''}
                        style="flex:1; padding:10px; border-radius:8px; background:${canPay6 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(148,163,184,0.2)'}; color:${canPay6 ? 'white' : '#64748b'}; font-weight:600; font-size:13px; border:none; cursor:${canPay6 ? 'pointer' : 'not-allowed'};">
                        Pay Latest 6<br>
                        <span style="font-size:11px; opacity:0.9;">${safeFormatRupiah(total6)}</span>
                    </button>
                    <button 
                        id="payAllOverdueBtn"
                        ${!canPayAll ? 'disabled' : ''}
                        style="flex:1; padding:10px; border-radius:8px; background:${canPayAll ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(148,163,184,0.2)'}; color:${canPayAll ? 'white' : '#64748b'}; font-weight:600; font-size:13px; border:none; cursor:${canPayAll ? 'pointer' : 'not-allowed'};">
                        Pay All<br>
                        <span style="font-size:11px; opacity:0.9;">${safeFormatRupiah(totalOverdue)}</span>
                    </button>
                </div>
            </div>
        `;
        
        // Attach bulk payment listeners
        const pay6Btn = document.getElementById('pay6OverdueBtn');
        const payAllBtn = document.getElementById('payAllOverdueBtn');
        
        if (pay6Btn && canPay6) {
            pay6Btn.addEventListener('click', () => payBulkOverdue(6));
        }
        
        if (payAllBtn && canPayAll) {
            payAllBtn.addEventListener('click', () => payBulkOverdue(overdueList.length));
        }
    }
}

// Pay one specific overdue month
window.paySpecificOverdueMonth = async function(overdueIndex) {
    const overdueList = window.currentOverdueList || [];
    if (!overdueList[overdueIndex]) return;
    
    const item = overdueList[overdueIndex];
    const loan = window.saveData.finance.loans.find(l => l.id === window.activePaymentLoanId);
    if (!loan) return;
    
    if (window.saveData.finance.cash < item.total) {
        await showAlertModal(`❌ Insufficient cash!\n\nRequired: ${safeFormatRupiah(item.total)}\nCash: ${safeFormatRupiah(window.saveData.finance.cash)}`, "Insufficient Cash");
        return;
    }
    
    // Process payment
    window.saveData.finance.cash -= item.total;
    
    const monthlyRate = loan.monthlyRate || 0;
    const interestPortion = Math.floor((loan.outstandingPrincipal || 0) * monthlyRate);
    let principalPortion = loan.monthlyInstallment - interestPortion;
    if (principalPortion < 0) principalPortion = 0;
    principalPortion = Math.min(principalPortion, loan.outstandingPrincipal || 0);
    
    loan.outstandingPrincipal = (loan.outstandingPrincipal || 0) - principalPortion;
    if (loan.outstandingPrincipal < 0) loan.outstandingPrincipal = 0;
    
    loan.remainingMonths = Math.max(0, (loan.remainingMonths || 0) - 1);
    
    const nextDueDate = new Date(loan.nextDueDate);
    nextDueDate.setMonth(nextDueDate.getMonth() + 1);
    loan.nextDueDate = nextDueDate.toISOString();
    
    const paymentDate = getGameTimeSafe();
    const monthName = item.dueDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    window.saveData.finance.history.push({
        date: paymentDate.toDateString(),
        income: 0,
        expense: item.total,
        net: -item.total,
        note: `Pay Arrears ${monthName} - Loan #${loan.id.substr(-4)} (installment ${safeFormatRupiah(item.monthlyInstallment)} + penalty ${safeFormatRupiah(item.penalty)})`
    });
    
    if (loan.remainingMonths <= 0 || loan.outstandingPrincipal <= 1000) {
        loan.status = "paid";
        loan.outstandingPrincipal = 0;
    }
    
    localStorage.setItem("procoon_save", JSON.stringify(window.saveData));
    
    // Refresh modal
    window.closeLoanPaymentModal();
    window.renderAllFinanceUI();
    
    showAlertModal(`✅ Payment successful!\n\nArrears ${monthName} paid\nInstallment: ${safeFormatRupiah(item.monthlyInstallment)}\nPenalty: ${safeFormatRupiah(item.penalty)}\nTotal: ${safeFormatRupiah(item.total)}`, "Payment Success");
};

// Bulk payment (latest 6 or all)
window.payBulkOverdue = async function(count) {
    const overdueList = window.currentOverdueList || [];
    const loan = window.saveData.finance.loans.find(l => l.id === window.activePaymentLoanId);
    if (!loan) return;
    
    const toBePaid = overdueList.slice(0, count);
    const totalAmount = toBePaid.reduce((sum, item) => sum + item.total, 0);
    
    if (window.saveData.finance.cash < totalAmount) {
        await showAlertModal(`❌ Insufficient cash!\n\nRequired: ${safeFormatRupiah(totalAmount)}\nCash: ${safeFormatRupiah(window.saveData.finance.cash)}`, "Insufficient Cash");
        return;
    }

    const confirmMsg = `Pay ${count} overdue installments?\n\nTotal: ${safeFormatRupiah(totalAmount)}\n(Installment + Penalty)`;
    const confirmPay = await showConfirmModal(confirmMsg, "Pay Overdue", "Pay", "Cancel");
    if (!confirmPay) return;
    
    let totalPaid = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;
    let totalPenalty = 0;
    
    toBePaid.forEach(item => {
        window.saveData.finance.cash -= item.total;
        totalPaid += item.total;
        totalPenalty += item.penalty;
        
        const monthlyRate = loan.monthlyRate || 0;
        const interestPortion = Math.floor((loan.outstandingPrincipal || 0) * monthlyRate);
        let principalPortion = loan.monthlyInstallment - interestPortion;
        if (principalPortion < 0) principalPortion = 0;
        principalPortion = Math.min(principalPortion, loan.outstandingPrincipal || 0);
        
        loan.outstandingPrincipal = (loan.outstandingPrincipal || 0) - principalPortion;
        if (loan.outstandingPrincipal < 0) loan.outstandingPrincipal = 0;
        
        loan.remainingMonths = Math.max(0, (loan.remainingMonths || 0) - 1);
        
        totalPrincipal += principalPortion;
        totalInterest += interestPortion;
        
        const nextDueDate = new Date(loan.nextDueDate);
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        loan.nextDueDate = nextDueDate.toISOString();
    });
    
    const paymentDate = getGameTimeSafe();
    window.saveData.finance.history.push({
        date: paymentDate.toDateString(),
        income: 0,
        expense: totalPaid,
        net: -totalPaid,
        note: `Pay ${count} Arrears - Loan #${loan.id.substr(-4)} (total ${safeFormatRupiah(totalPaid)} including penalty ${safeFormatRupiah(totalPenalty)})`
    });
    
    if (loan.remainingMonths <= 0 || loan.outstandingPrincipal <= 1000) {
        loan.status = "paid";
        loan.outstandingPrincipal = 0;
    }
    
    localStorage.setItem("procoon_save", JSON.stringify(window.saveData));
    
    window.closeLoanPaymentModal();
    window.renderAllFinanceUI();
    
    showAlertModal(`✅ ${count} overdue payments successful!\n\nTotal: ${safeFormatRupiah(totalPaid)}\nPrincipal: ${safeFormatRupiah(totalPrincipal)}\nInterest: ${safeFormatRupiah(totalInterest)}\nPenalty: ${safeFormatRupiah(totalPenalty)}`, "Payment Success");
};

window.calculateLoanPenalty = function(loan) {
    const today = getGameTimeSafe();
    const due = new Date(loan.nextDueDate);
    
    if (today < due) return { daysLate: 0, penaltyAmount: 0, penaltyRate: 0 };
    
    const daysLate = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    if (daysLate <= 0) return { daysLate: 0, penaltyAmount: 0, penaltyRate: 0 };
    
    // Penalty: 0.1% per day, max 30%
    const penaltyRate = Math.min(daysLate * 0.001, 0.30);
    const penaltyAmount = Math.floor((loan.monthlyInstallment || 0) * penaltyRate);
    
    return { daysLate, penaltyAmount, penaltyRate };
};

// Calculate how many months are overdue and details per month
window.calculateOverdueInstallments = function(loan) {
    const today = getGameTimeSafe();
    const due = new Date(loan.nextDueDate);
    
    if (today < due) return [];
    
    const overdueList = [];
    let currentDue = new Date(due);
    
    // Loop from due date until today and count overdue months
    while (currentDue <= today) {
        const monthsPassed = Math.floor((today - currentDue) / (1000 * 60 * 60 * 24 * 30));
        const daysLate = Math.floor((today - currentDue) / (1000 * 60 * 60 * 24));
        
        const penaltyRate = Math.min(daysLate * 0.001, 0.30);
        const penalty = Math.floor((loan.monthlyInstallment || 0) * penaltyRate);
        
        overdueList.push({
            dueDate: new Date(currentDue),
            daysLate: daysLate,
            monthlyInstallment: loan.monthlyInstallment,
            penalty: penalty,
            total: loan.monthlyInstallment + penalty
        });
        
        // Move to next month
        currentDue.setMonth(currentDue.getMonth() + 1);
        
        // Safety: max 24 months back
        if (overdueList.length >= 24) break;
    }
    
    return overdueList;
};

window.updateLoanPaymentSimulation = function() {
    const loan = window.saveData.finance.loans.find(l => l.id === window.activePaymentLoanId);
    if (!loan) return;

    const monthsInput = document.getElementById("paymentMonths");
    const warningEl = document.getElementById("paymentWarning");
    const confirmBtn = document.getElementById("confirmLoanPaymentBtn");

    // Sanitize input: handle empty, decimals, scientific notation, negatives
    let rawVal = String(monthsInput.value || "");
    rawVal = rawVal.replace(/[^0-9-]/g, "");
    let months = parseInt(rawVal, 10);

    if (Number.isNaN(months) || months < 1) months = 1;
    months = Math.min(months, loan.remainingMonths || 1);
    monthsInput.value = months;

    const penalty = window.currentLoanPenalty || { daysLate: 0, penaltyAmount: 0 };
    const installmentTotal = (loan.monthlyInstallment || 0) * months;
    const penaltyForFirstMonth = penalty.penaltyAmount;
    const totalPayment = installmentTotal + penaltyForFirstMonth;
    
    let billHTML = `<strong style="font-size:20px;">${safeFormatRupiah(totalPayment)}</strong>`;
    
    if (months > 1 || penaltyForFirstMonth > 0) {
        billHTML += `<div style="margin-top:8px; padding-top:8px; border-top:1px solid rgba(148,163,184,0.1); font-size:11px; color:#94a3b8; line-height:1.6;">`;
        billHTML += `Installment ${months}× = ${safeFormatRupiah(installmentTotal)}`;
        if (penaltyForFirstMonth > 0) {
            billHTML += `<br><span style="color:#fca5a5;">+ Penalty ${penalty.daysLate} days = ${safeFormatRupiah(penaltyForFirstMonth)}</span>`;
        }
        billHTML += `</div>`;
    }
    
    document.getElementById("paymentTotalBill").innerHTML = billHTML;

    if ((window.saveData.finance.cash || 0) < totalPayment) {
        warningEl.innerText = `Insufficient cash for ${months} months. Required: ${safeFormatRupiah(totalPayment)}`;
        warningEl.classList.remove("hidden");
        if (confirmBtn) confirmBtn.disabled = true;
    } else {
        warningEl.classList.add("hidden");
        warningEl.innerText = "";
        if (confirmBtn) confirmBtn.disabled = false;
    }
};

window.closeLoanPaymentModal = function() {
    const modal = document.getElementById("loanPaymentModal");
    if (modal) modal.classList.add("hidden");
    window.activePaymentLoanId = null;
    window.isRunning = true;
};

window.confirmLoanPayment = async function() {
    if (!window.activePaymentLoanId) return;

    const monthsInput = document.getElementById("paymentMonths");
    const months = parseInt(monthsInput.value, 10) || 1;
    const result = await window.payInstallment(window.activePaymentLoanId, months);

    if (result && result.ok) {
        window.closeLoanPaymentModal();
    }
};

// Execute payment logic (manual, supports multi-month)
window.payInstallment = async function(loanId, requestedMonths = 1) {
    const loan = window.saveData.finance.loans.find(l => l.id === loanId);
    if (!loan || loan.status !== "active") return { ok: false, reason: "loan-not-found" };

    const monthsToPay = Math.max(1, Math.min(parseInt(requestedMonths, 10) || 1, loan.remainingMonths || 1));
    const penalty = calculateLoanPenalty(loan);
    const installmentTotal = (loan.monthlyInstallment || 0) * monthsToPay;
    const requiredAmount = installmentTotal + penalty.penaltyAmount;

    if ((window.saveData.finance.cash || 0) < requiredAmount) {
        await showAlertModal(`❌ INSUFFICIENT CASH!\n\nYou need ${safeFormatRupiah(requiredAmount)} for ${monthsToPay} months.\nCurrent cash: ${safeFormatRupiah(window.saveData.finance.cash)}`, "Insufficient Cash");
        return { ok: false, reason: "insufficient-balance" };
    }

    let paidMonths = 0;
    let totalPaid = 0;
    let totalPrincipal = 0;
    let totalInterest = 0;

    for (let index = 0; index < monthsToPay; index++) {
        if (loan.status !== "active") break;

        const paymentDate = getGameTimeSafe();
        const result = processSingleInstallment(loan, paymentDate);
        if (!result.ok) break;

        paidMonths += 1;
        totalPaid += result.amountPaid;
        totalPrincipal += result.principalPortion;
        totalInterest += result.interestPortion;

        if (loan.remainingMonths <= 0 || loan.outstandingPrincipal <= 1000) {
            loan.status = "paid";
            loan.outstandingPrincipal = 0;
            break;
        }
    }

    if (paidMonths === 0) {
        await showAlertModal("❌ Payment could not be processed.", "Payment Failed");
        return { ok: false, reason: "payment-failed" };
    }

    let successMsg = '';
    if (loan.status === "paid") {
        successMsg = `🎉 DEBT PAID OFF!\n\nPaid ${paidMonths} months (${safeFormatRupiah(totalPaid)})\nPrincipal: ${safeFormatRupiah(totalPrincipal)} | Interest: ${safeFormatRupiah(totalInterest)}`;
        if (penalty.penaltyAmount > 0) {
            successMsg += `\nPenalty: ${safeFormatRupiah(penalty.penaltyAmount)}`;
        }
        await showAlertModal(successMsg, "Payment Success");
    } else {
        successMsg = `✅ Payment successful!\n\nPaid ${paidMonths} months (${safeFormatRupiah(totalPaid)})\nPrincipal: ${safeFormatRupiah(totalPrincipal)} | Interest: ${safeFormatRupiah(totalInterest)}`;
        if (penalty.penaltyAmount > 0) {
            successMsg += `\nPenalty: ${safeFormatRupiah(penalty.penaltyAmount)}`;
        }
        await showAlertModal(successMsg, "Payment Success");
    }

    localStorage.setItem("procoon_save", JSON.stringify(window.saveData));
    window.renderAllFinanceUI();
    return { ok: true, paidMonths, totalPaid };
};

// ================== 4. UI & INIT ==================

let financeLastRenderAt = 0;
const FINANCE_RENDER_INTERVAL_MS = 300;

// Recalculate daily expense (clear phantom auto-pay)
function recalculateDailyCashflow() {
    let income = 0;
    let expense = 0;
    let items = [];

    // Recalculate only from buildings
    if(window.saveData.assets) {
        window.saveData.assets.forEach(a => {
            if(a.finance) {
                if(a.finance.dailyIncome) income += a.finance.dailyIncome;
                if(a.finance.maintenance) expense += a.finance.maintenance;
                
                if(a.finance.dailyIncome > 0) {
                    items.push({ name: a.name, variant: a.variant, income: a.finance.dailyIncome });
                }
            }
        });
    }

    window.saveData.finance.dailyIncome = income;
    window.saveData.finance.dailyExpense = expense; // Murni maintenance
    window.saveData.finance.assetIncome = items;
    localStorage.setItem("procoon_save", JSON.stringify(window.saveData));
}

// Main render
window.renderAllFinanceUI = function() {
    const now = (typeof performance !== "undefined" && performance.now)
        ? performance.now()
        : Date.now();

    if (now - financeLastRenderAt < FINANCE_RENDER_INTERVAL_MS) {
        return;
    }
    financeLastRenderAt = now;

    // Header
    const nameEl = document.getElementById("companyName");
    const balEl = document.getElementById("balance");
    if(nameEl) nameEl.innerText = window.saveData.companyName || "Company";
    if(balEl) balEl.innerText = safeFormatRupiah(window.saveData.finance.cash);

    // Cards
    const f = window.saveData.finance;
    document.getElementById("cash").innerText = safeFormatRupiah(f.cash);
    document.getElementById("income").innerText = safeFormatRupiah(f.dailyIncome);
    document.getElementById("expense").innerText = safeFormatRupiah(f.dailyExpense);
    const net = f.dailyIncome - f.dailyExpense;
    const netEl = document.getElementById("netProfitCard");
    netEl.innerText = safeFormatRupiah(net);
    netEl.style.color = net >= 0 ? "#22c55e" : "#ef4444";

    // Panels
    renderActiveLoansPanel();

    const reportData = buildFinanceReportData(f.history, getGameTimeSafe());

    // Daily Report
    document.getElementById("dailyIncomeReport").innerText = safeFormatRupiah(reportData.daily.income);
    document.getElementById("dailyExpenseReport").innerText = safeFormatRupiah(reportData.daily.expense);
    document.getElementById("dailyNetReport").innerText = safeFormatRupiah(reportData.daily.net);

    // Monthly Report
    document.getElementById("monthlyIncome").innerText = safeFormatRupiah(reportData.monthly.income);
    document.getElementById("monthlyExpense").innerText = safeFormatRupiah(reportData.monthly.expense);
    document.getElementById("monthlyNet").innerText = safeFormatRupiah(reportData.monthly.net);

    const monthlySummaryEl = document.getElementById("monthlySummary");
    if (monthlySummaryEl) {
        const monthlyAvgClass = reportData.monthly.avgNetPerDay >= 0 ? "success" : "danger";
        const monthlyBestNet = reportData.monthly.bestDayNet;
        const monthlyBestClass = (monthlyBestNet ?? 0) >= 0 ? "success" : "danger";
        const monthlyWorstNet = reportData.monthly.worstDayNet;
        const monthlyWorstClass = (monthlyWorstNet ?? 0) >= 0 ? "success" : "danger";

        monthlySummaryEl.innerHTML = `
            <div class="report-row">
                <span>Tracked days</span>
                <strong>${reportData.monthly.daysTracked} / ${new Date(reportData.monthly.net === 0 ? new Date() : new Date()).getDate()} days</strong>
            </div>
            <div class="report-row">
                <span>Average Net / Day</span>
                <strong class="${monthlyAvgClass}">${safeFormatRupiah(reportData.monthly.avgNetPerDay)}</strong>
            </div>
            <div class="report-row">
                <span>Best Day</span>
                <strong class="${monthlyBestClass}">${reportData.monthly.bestDayLabel} (${safeFormatRupiah(monthlyBestNet || 0)})</strong>
            </div>
            <div class="report-row">
                <span>Worst Day</span>
                <strong class="${monthlyWorstClass}">${reportData.monthly.worstDayLabel} (${safeFormatRupiah(monthlyWorstNet || 0)})</strong>
            </div>
            <div class="report-row">
                <span>Monthly Trend</span>
                <strong style="color: #f59e0b;">${reportData.monthly.trend}</strong>
            </div>
        `;
    }

    // Yearly Report
    document.getElementById("yearlyIncome").innerText = safeFormatRupiah(reportData.yearly.income);
    document.getElementById("yearlyExpense").innerText = safeFormatRupiah(reportData.yearly.expense);
    document.getElementById("yearlyNet").innerText = safeFormatRupiah(reportData.yearly.net);

    const yearlySummaryEl = document.getElementById("yearlySummary");
    if (yearlySummaryEl) {
        const yearlyAvgClass = reportData.yearly.avgNetPerMonth >= 0 ? "success" : "danger";
        const yearlyBestNet = reportData.yearly.bestMonthNet;
        const yearlyBestClass = (yearlyBestNet ?? 0) >= 0 ? "success" : "danger";
        const yearlyWorstNet = reportData.yearly.worstMonthNet;
        const yearlyWorstClass = (yearlyWorstNet ?? 0) >= 0 ? "success" : "danger";

        yearlySummaryEl.innerHTML = `
            <div class="report-row">
                <span>Tracked months</span>
                <strong>${reportData.yearly.monthsTracked} / 12 months</strong>
            </div>
            <div class="report-row">
                <span>Average Net / Month</span>
                <strong class="${yearlyAvgClass}">${safeFormatRupiah(reportData.yearly.avgNetPerMonth)}</strong>
            </div>
            <div class="report-row">
                <span>Best Month</span>
                <strong class="${yearlyBestClass}">${reportData.yearly.bestMonthLabel} (${safeFormatRupiah(yearlyBestNet || 0)})</strong>
            </div>
            <div class="report-row">
                <span>Worst Month</span>
                <strong class="${yearlyWorstClass}">${reportData.yearly.worstMonthLabel} (${safeFormatRupiah(yearlyWorstNet || 0)})</strong>
            </div>
            <div class="report-row">
                <span>Yearly Trend</span>
                <strong style="color: #f59e0b;">${reportData.yearly.trend}</strong>
            </div>
        `;
    }

    // Breakdown List
    const list = document.getElementById("dailyIncomeBreakdown");
    list.innerHTML = "";
    if ((f.assetIncome || []).length === 0) {
        list.innerHTML = `<div class="asset-income-item"><span>No income-generating assets yet</span><span>—</span></div>`;
    } else {
        f.assetIncome.forEach(item => {
            list.innerHTML += `<div class="asset-income-item"><span>${item.name} (${item.variant})</span><span class="success">+ ${safeFormatRupiah(item.income)}</span></div>`;
        });
    }
};

// Modal Control
window.closeLoanModal = function() {
    document.getElementById("loanModal").classList.add("hidden");
    window.isRunning = true;
};

// INIT DOM
document.addEventListener("DOMContentLoaded", () => {
    // Load Data
    if(!window.saveData) {
        if(localStorage.getItem("procoon_save")) {
            window.saveData = JSON.parse(localStorage.getItem("procoon_save"));
        } else {
            showAlertModal("Save data error", "Data Error"); return;
        }
    }
    
    // Ensure data structure
    window.saveData.finance = window.saveData.finance || { loans: [], history: [], cash:0 };
    window.saveData.finance.loans = window.saveData.finance.loans || [];

    // Normalize legacy loan objects to prevent NaN during processing
    window.saveData.finance.loans.forEach(l => {
        // Normalize monthlyRate from possible older fields
        if (typeof l.monthlyRate !== 'number') {
            if (typeof l.annualRate === 'number') {
                l.monthlyRate = l.annualRate / 12;
            } else if (typeof l.rate === 'number') {
                // older saves may have used `rate` (could be monthly) — keep as-is
                l.monthlyRate = l.rate;
            } else {
                l.monthlyRate = 0;
            }
        }
        if (typeof l.annualRate !== 'number') {
            l.annualRate = (typeof l.annualRate === 'number') ? l.annualRate : (l.monthlyRate || 0) * 12;
        }
        if (typeof l.missedPayments !== 'number') l.missedPayments = 0;
        if (typeof l.accruedInterest !== 'number') l.accruedInterest = 0;
        if (typeof l.reminderSent !== 'boolean') l.reminderSent = false;
    });

    // Recalculate legacy expense
    recalculateDailyCashflow();

    // Modal events
    const loanBtn = document.getElementById("openLoanBtn");
    const loanModal = document.getElementById("loanModal");
    if(loanBtn) {
        loanBtn.onclick = () => {
            loanModal.classList.remove("hidden");
            window.isRunning = false;
            // Reset input when opening
            document.getElementById("loanAmount").value = "";
            window.updateLoanSimulation();
        }
    }

    // Input formatting listener (important for thousands separator)
    const amountInput = document.getElementById("loanAmount");
    if(amountInput) {
        amountInput.addEventListener("input", function(e) {
            // Format while typing
            this.value = formatNumberWithDots(this.value);
            window.updateLoanSimulation();
        });
    }

    // Event delegation fallback for dynamically generated pay buttons
    document.addEventListener('click', function(e) {
        const btn = e.target.closest ? e.target.closest('.pay-btn') : null;
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        if (id) window.openLoanPaymentModal(id);
    }, true);

    const paymentMonthsInput = document.getElementById("paymentMonths");
    if (paymentMonthsInput) {
        paymentMonthsInput.addEventListener("input", window.updateLoanPaymentSimulation);
        paymentMonthsInput.addEventListener("change", window.updateLoanPaymentSimulation);
    }

    const tenorInput = document.getElementById("loanTenor");
    if(tenorInput) {
        tenorInput.addEventListener("change", window.updateLoanSimulation);
    }

    // Tabs
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            document.querySelectorAll(".report-section").forEach(s => s.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById("report-" + btn.dataset.tab).classList.add("active");
        });
    });

    renderAllFinanceUI();
});

// Game Tick
if(window.registerGameTick) {
    registerGameTick(renderAllFinanceUI);
}