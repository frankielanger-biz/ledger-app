// app.js — no login. Every request just includes the shared APP_SECRET
// as a header, which the edge functions check before doing anything.

const FN_BASE = `${SUPABASE_URL}/functions/v1`;

const netWorthValueEl = document.getElementById("net-worth-value");
const netWorthDeltaEl = document.getElementById("net-worth-delta");
const liquidCashValueEl = document.getElementById("liquid-cash-value");
const totalAssetsValueEl = document.getElementById("total-assets-value");
const totalLiabilitiesValueEl = document.getElementById("total-liabilities-value");
const accountsListEl = document.getElementById("accounts-list");
const connectBtn = document.getElementById("connect-btn");
const refreshBtn = document.getElementById("refresh-btn");
const affordInput = document.getElementById("afford-input");
const affordDiscretionaryEl = document.getElementById("afford-discretionary");
const affordResult = document.getElementById("afford-result");
const dashboardStatus = document.getElementById("dashboard-status");

const scoreValueEl = document.getElementById("score-value");
const scoreBreakdownEl = document.getElementById("score-breakdown");
const trendCanvasEl = document.getElementById("trend-canvas");
const goalInputEl = document.getElementById("goal-input");
const goalResultEl = document.getElementById("goal-result");
const investAmountEl = document.getElementById("invest-amount");
const investYearsEl = document.getElementById("invest-years");
const investResultEl = document.getElementById("invest-result");
const allocationListEl = document.getElementById("allocation-list");

let latestBalances = null;
let latestTransactions = null;

// ---------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatDelta(n) {
  if (n === 0) return "No change today";
  const arrow = n > 0 ? "▲" : "▼";
  return `${arrow} ${formatMoney(Math.abs(n))} today`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ---------------------------------------------------------------
// Calling Supabase Edge Functions
// ---------------------------------------------------------------

async function callFunction(name, body) {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-app-secret": APP_SECRET,
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body ?? {}),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error ? JSON.stringify(json.error) : "Request failed");
  return json;
}

// ---------------------------------------------------------------
// Plaid Link — connect a new bank account
// ---------------------------------------------------------------

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = "Loading…";

  try {
    const { link_token } = await callFunction("create-link-token");

    const handler = Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        dashboardStatus.textContent = "Connecting…";
        try {
          await callFunction("exchange-public-token", {
            public_token,
            institution_name: metadata.institution?.name,
            institution_id: metadata.institution?.institution_id,
          });
          dashboardStatus.textContent = "";
          await loadEverything();
        } catch (err) {
          dashboardStatus.textContent = `Couldn't finish connecting: ${err.message}`;
        }
      },
      onExit: (err) => {
        if (err) console.error("Plaid Link exited with error:", err);
      },
    });

    handler.open();
  } catch (err) {
    dashboardStatus.textContent = `Couldn't start Plaid Link: ${err.message}`;
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = "+ Connect a bank";
  }
});

// ---------------------------------------------------------------
// Loading data — balances + transactions, then render everything
// ---------------------------------------------------------------

async function loadEverything() {
  refreshBtn.classList.add("spinning");
  dashboardStatus.textContent = "Refreshing…";

  try {
    const balances = await callFunction("get-balances");
    latestBalances = balances;
    renderBalances(balances);
    renderTrend(balances.history ?? []);
    renderAllocation(balances);
    renderGoal(balances);
  } catch (err) {
    dashboardStatus.textContent = `Couldn't load balances: ${err.message}`;
    refreshBtn.classList.remove("spinning");
    return;
  }

  try {
    const transactions = await callFunction("get-transactions");
    latestTransactions = transactions;
  } catch (err) {
    // Transactions failing shouldn't block the core net worth view — some
    // institutions don't support it, or there's no history yet.
    console.warn("Couldn't load transactions:", err.message);
    latestTransactions = null;
  }

  renderScore();
  dashboardStatus.textContent = "";
  refreshBtn.classList.remove("spinning");
}

function renderBalances(data) {
  netWorthValueEl.textContent = formatMoney(data.net_worth);
  netWorthDeltaEl.textContent = formatDelta(data.change_today);
  netWorthDeltaEl.className = "hero-delta " + (data.change_today >= 0 ? "positive" : "negative");

  liquidCashValueEl.textContent = formatMoney(data.liquid_cash);
  totalAssetsValueEl.textContent = formatMoney(data.total_assets);
  totalLiabilitiesValueEl.textContent = formatMoney(-Math.abs(data.total_liabilities));

  accountsListEl.innerHTML = "";
  if (!data.accounts || data.accounts.length === 0) {
    accountsListEl.innerHTML = `<div class="empty-state">No accounts connected yet.</div>`;
    return;
  }

  for (const acct of data.accounts) {
    const row = document.createElement("div");
    row.className = "account-row";
    const isLiability = acct.type === "credit" || acct.type === "loan";
    const displayBalance = isLiability ? -Math.abs(acct.current ?? 0) : acct.current ?? 0;
    row.innerHTML = `
      <div class="account-meta">
        <span class="account-name">${acct.name}</span>
        <span class="account-institution">${acct.institution_name ?? ""}</span>
      </div>
      <span class="account-balance ${displayBalance < 0 ? "negative" : ""}">${formatMoney(displayBalance)}</span>
    `;
    accountsListEl.appendChild(row);
  }
}

refreshBtn.addEventListener("click", loadEverything);

// ---------------------------------------------------------------
// "Can I afford it?" — with a discretionary toggle
// ---------------------------------------------------------------

function updateAffordResult() {
  const amount = parseFloat(affordInput.value);
  const isDiscretionary = affordDiscretionaryEl.checked;

  if (!latestBalances || isNaN(amount) || amount <= 0) {
    affordResult.textContent = "";
    return;
  }

  const pctOfLiquid = (amount / latestBalances.liquid_cash) * 100;
  const pctOfNetWorth = (amount / latestBalances.net_worth) * 100;
  const newLiquid = latestBalances.liquid_cash - amount;
  const newNetWorth = latestBalances.net_worth - amount;

  let verdict;
  if (pctOfLiquid < 5) verdict = "Comfortably affordable.";
  else if (pctOfLiquid < 20) verdict = "Affordable, but noticeable.";
  else if (pctOfLiquid < 50) verdict = "This is a big chunk of your liquid cash.";
  else verdict = "This would take a serious bite out of your cash position.";

  let discretionaryLine = "";
  if (isDiscretionary && latestTransactions && latestTransactions.discretionary_spend_30d > 0) {
    const pctOfDiscretionary = (amount / latestTransactions.discretionary_spend_30d) * 100;
    discretionaryLine = `<p>${pctOfDiscretionary.toFixed(0)}% of your last 30 days of discretionary spending</p>`;
  }

  affordResult.innerHTML = `
    <p>${verdict}</p>
    <p>${pctOfLiquid.toFixed(1)}% of liquid cash · ${pctOfNetWorth.toFixed(1)}% of net worth</p>
    ${discretionaryLine}
    <p>new liquid cash ${formatMoney(newLiquid)} · new net worth ${formatMoney(newNetWorth)}</p>
  `;
}

affordInput.addEventListener("input", updateAffordResult);
affordDiscretionaryEl.addEventListener("change", updateAffordResult);

// ---------------------------------------------------------------
// Financial health score
//
// Four inputs, each 0-100, weighted. This is a first-pass formula — the
// weights are a reasonable starting guess, not a validated model. Test it
// against your own real numbers before trusting it as gospel.
//
//   Runway (35%)     — liquid cash / fixed monthly spend, in months
//   Elasticity (25%) — % of spending that's discretionary (more = more room to cut)
//   Leverage (25%)   — debt / assets (less = better)
//   Trajectory (15%) — net worth growth over the last ~6 months
// ---------------------------------------------------------------

function renderScore() {
  if (!latestBalances) return;

  const fixedMonthlySpend = latestTransactions?.fixed_spend_30d ?? null;
  const discretionaryPct = latestTransactions?.discretionary_pct ?? null;

  // Runway
  let runwayScore = null;
  let runwayMonths = null;
  if (fixedMonthlySpend && fixedMonthlySpend > 0) {
    runwayMonths = latestBalances.liquid_cash / fixedMonthlySpend;
    runwayScore = clamp((runwayMonths / 12) * 100, 0, 100);
  }

  // Elasticity
  const elasticityScore = discretionaryPct !== null ? clamp(discretionaryPct * 100, 0, 100) : null;

  // Leverage
  let leverageScore = null;
  if (latestBalances.total_assets > 0) {
    const debtRatio = latestBalances.total_liabilities / latestBalances.total_assets;
    leverageScore = clamp(100 - debtRatio * 100, 0, 100);
  }

  // Trajectory
  let trajectoryScore = null;
  const priorNetWorth = latestBalances.net_worth_6mo_ago;
  if (priorNetWorth && priorNetWorth !== 0) {
    const growthRate = (latestBalances.net_worth - priorNetWorth) / Math.abs(priorNetWorth);
    trajectoryScore = clamp(50 + growthRate * 250, 0, 100);
  }

  // Only average the components we actually have data for yet, and
  // renormalize weights so a missing component doesn't just drag the
  // score down artificially in the first few days of use.
  const weighted = [
    { score: runwayScore, weight: 0.35, label: "Runway" },
    { score: elasticityScore, weight: 0.25, label: "Elasticity" },
    { score: leverageScore, weight: 0.25, label: "Leverage" },
    { score: trajectoryScore, weight: 0.15, label: "Trajectory" },
  ].filter((c) => c.score !== null);

  if (weighted.length === 0) {
    scoreValueEl.textContent = "—";
    scoreBreakdownEl.innerHTML = `<div class="empty-state">Connect a bank and give it a few days to build a score.</div>`;
    return;
  }

  const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
  const finalScore = weighted.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0);

  scoreValueEl.textContent = Math.round(finalScore);

  scoreBreakdownEl.innerHTML = weighted
    .map((c) => {
      let detail = "";
      if (c.label === "Runway" && runwayMonths !== null) {
        detail = `${runwayMonths.toFixed(1)} months of runway`;
      } else if (c.label === "Elasticity" && discretionaryPct !== null) {
        detail = `${(discretionaryPct * 100).toFixed(0)}% of spend is discretionary`;
      } else if (c.label === "Leverage") {
        const debtRatio = latestBalances.total_liabilities / latestBalances.total_assets;
        detail = `${(debtRatio * 100).toFixed(0)}% debt-to-assets`;
      } else if (c.label === "Trajectory") {
        const growthRate = ((latestBalances.net_worth - priorNetWorth) / Math.abs(priorNetWorth)) * 100;
        detail = `${growthRate >= 0 ? "+" : ""}${growthRate.toFixed(1)}% net worth, ~6 months`;
      }
      return `
        <div class="list-row">
          <span>${c.label} <span class="score-weight">(${Math.round(c.weight * 100)}%)</span></span>
          <span class="mono">${Math.round(c.score)} · ${detail}</span>
        </div>`;
    })
    .join("");

  if (weighted.length < 4) {
    scoreBreakdownEl.innerHTML += `<div class="empty-state">Score improves as more transaction history builds up.</div>`;
  }
}

// ---------------------------------------------------------------
// Net worth trend graph — simple canvas sparkline, last 90 days
// ---------------------------------------------------------------

function renderTrend(history) {
  const canvas = trendCanvasEl;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!history || history.length < 2) {
    ctx.font = "13px IBM Plex Mono, monospace";
    ctx.fillStyle = "#5A6572";
    ctx.fillText("Not enough history yet — check back after a few refreshes.", 10, height / 2);
    return;
  }

  const values = history.map((h) => h.net_worth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 10;

  ctx.beginPath();
  ctx.strokeStyle = "#3DDC84";
  ctx.lineWidth = 2;

  history.forEach((point, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.net_worth - min) / range) * (height - padding * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

// ---------------------------------------------------------------
// Goal net worth — stored locally on this device (no backend field yet)
// ---------------------------------------------------------------

function renderGoal(data) {
  const savedGoal = localStorage.getItem("ledger_goal_net_worth");
  if (savedGoal) goalInputEl.value = savedGoal;
  updateGoalResult(data);
}

function updateGoalResult(data) {
  const goal = parseFloat(goalInputEl.value);
  if (isNaN(goal) || goal <= 0 || !data) {
    goalResultEl.textContent = "";
    return;
  }

  const history = data.history ?? [];
  if (history.length < 2) {
    goalResultEl.textContent = "Need a bit more history to project a timeline.";
    return;
  }

  const first = history[0];
  const last = history[history.length - 1];
  const daysElapsed = (new Date(last.created_at) - new Date(first.created_at)) / (1000 * 60 * 60 * 24);
  const growthPerDay = daysElapsed > 0 ? (last.net_worth - first.net_worth) / daysElapsed : 0;

  const remaining = goal - data.net_worth;

  if (remaining <= 0) {
    goalResultEl.textContent = "You've already hit this goal.";
    return;
  }

  if (growthPerDay <= 0) {
    goalResultEl.textContent = "At your current trend, you're not on pace to reach this — growth has been flat or negative.";
    return;
  }

  const daysToGoal = remaining / growthPerDay;
  const yearsToGoal = daysToGoal / 365;
  goalResultEl.textContent = `At your current pace, roughly ${yearsToGoal.toFixed(1)} years to reach ${formatMoney(goal)}.`;
}

goalInputEl.addEventListener("input", () => {
  localStorage.setItem("ledger_goal_net_worth", goalInputEl.value);
  updateGoalResult(latestBalances);
});

// ---------------------------------------------------------------
// "Invest instead" comparison
//
// Uses a default 7% annual return (roughly the S&P 500's long-run nominal
// average) — this is a simple estimate, not a real projection or advice.
// ---------------------------------------------------------------

function updateInvestResult() {
  const amount = parseFloat(investAmountEl.value);
  const years = parseFloat(investYearsEl.value);

  if (isNaN(amount) || amount <= 0 || isNaN(years) || years <= 0) {
    investResultEl.textContent = "";
    return;
  }

  const annualReturn = 0.07;
  const futureValue = amount * Math.pow(1 + annualReturn, years);
  const gain = futureValue - amount;

  investResultEl.innerHTML = `
    <p>At a 7%/yr estimate: ${formatMoney(futureValue)} in ${years} year${years == 1 ? "" : "s"}</p>
    <p>(${formatMoney(gain)} of growth — this is a rough estimate, not a guarantee)</p>
  `;
}

investAmountEl.addEventListener("input", updateInvestResult);
investYearsEl.addEventListener("input", updateInvestResult);

// ---------------------------------------------------------------
// Asset allocation breakdown
// ---------------------------------------------------------------

function renderAllocation(data) {
  const buckets = { Cash: 0, Investments: 0, "Real estate": 0, Other: 0 };

  for (const acct of data.accounts ?? []) {
    if (acct.type === "credit" || acct.type === "loan") continue; // liabilities, not assets
    const balance = acct.current ?? 0;
    if (acct.type === "investment") buckets["Investments"] += balance;
    else if (acct.type === "depository") buckets["Cash"] += balance;
    else buckets["Other"] += balance; // Plaid's "other" account type
  }

  for (const item of data.manual_items ?? []) {
    if (item.amount <= 0) continue; // only assets here, not manual debts
    if (item.category === "real_estate") buckets["Real estate"] += item.amount;
    else buckets["Other"] += item.amount;
  }

  const total = Object.values(buckets).reduce((sum, v) => sum + v, 0);

  if (total <= 0) {
    allocationListEl.innerHTML = `<div class="empty-state">Connect accounts to see your allocation.</div>`;
    return;
  }

  allocationListEl.innerHTML = Object.entries(buckets)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => {
      const pct = (value / total) * 100;
      return `
        <div class="list-row">
          <span>${label}</span>
          <span class="mono">${pct.toFixed(0)}% · ${formatMoney(value)}</span>
        </div>`;
    })
    .join("");
}

// ---------------------------------------------------------------
// PWA — register service worker for installability/offline shell
// ---------------------------------------------------------------

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch((err) => {
      console.warn("Service worker registration failed:", err);
    });
  });
}

loadEverything();
