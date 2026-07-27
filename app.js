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
const topbarStatusEl = document.getElementById("topbar-status");
const affordInput = document.getElementById("afford-input");
const affordCategoryEl = document.getElementById("afford-category");
const affordResult = document.getElementById("afford-result");
const dashboardStatus = document.getElementById("dashboard-status");

const scoreGaugeWrapEl = document.getElementById("score-gauge-wrap");
const scoreValueEl = document.getElementById("score-value");
const scoreGaugeFillEl = document.getElementById("score-gauge-fill");
const scoreBreakdownEl = document.getElementById("score-breakdown");
const scoreFlipInnerEl = document.getElementById("score-flip-inner");
const scoreFlipBtnFrontEl = document.getElementById("score-flip-btn-front");
const scoreFlipBtnBackEl = document.getElementById("score-flip-btn-back");
const spendingPieCanvasEl = document.getElementById("spending-pie-canvas");
const spendingLegendEl = document.getElementById("spending-legend");
const trendCanvasEl = document.getElementById("trend-canvas");
const trendTooltipEl = document.getElementById("trend-tooltip");
const trendAxisLabelsEl = document.getElementById("trend-axis-labels");
const goalInputEl = document.getElementById("goal-input");
const goalResultEl = document.getElementById("goal-result");
const investAmountEl = document.getElementById("invest-amount");
const investYearsEl = document.getElementById("invest-years");
const investCadenceEl = document.getElementById("invest-cadence");
const investResultEl = document.getElementById("invest-result");
const allocationListEl = document.getElementById("allocation-list");
const addManualBtnEl = document.getElementById("add-manual-btn");
const addManualFormEl = document.getElementById("add-manual-form");
const manualLabelEl = document.getElementById("manual-label");
const manualAmountEl = document.getElementById("manual-amount");
const manualCategoryEl = document.getElementById("manual-category");
const manualSubmitBtnEl = document.getElementById("manual-submit-btn");
const manualAddStatusEl = document.getElementById("manual-add-status");
const ledgerBrandEl = document.querySelector(".topnav-brand");

let latestBalances = null;
let latestTransactions = null;
let latestHistory = [];

// Categories that count as "discretionary" for the afford-check comparison —
// matches the same buckets get-transactions uses server-side, so the two
// stay consistent with each other.
const DISCRETIONARY_CHECK_CATEGORIES = new Set(["discretionary", "subscription"]);

// ---------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------

const tabButtons = document.querySelectorAll(".topnav-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
    tabPanels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== target));
  });
});

ledgerBrandEl.addEventListener("click", () => {
  const dashboardBtn = document.querySelector('.topnav-tab[data-tab="dashboard"]');
  dashboardBtn.click();
});

// ---------------------------------------------------------------
// FAQ accordion
// ---------------------------------------------------------------

document.querySelectorAll(".faq-question").forEach((q) => {
  q.addEventListener("click", () => {
    const answer = q.nextElementSibling;
    answer.classList.toggle("shown");
  });
});

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
  topbarStatusEl.textContent = "Pulling balances…";

  try {
    const balances = await callFunction("get-balances");
    latestBalances = balances;
    latestHistory = balances.history ?? [];
    renderBalances(balances);
    renderTrend(latestHistory);
    renderAllocation(balances);
    renderGoal(balances);
  } catch (err) {
    topbarStatusEl.textContent = "";
    dashboardStatus.textContent = `Couldn't load balances: ${err.message}`;
    refreshBtn.classList.remove("spinning");
    return;
  }

  topbarStatusEl.textContent = "Gathering transactions…";
  try {
    const transactions = await callFunction("get-transactions");
    latestTransactions = transactions;
  } catch (err) {
    console.warn("Couldn't load transactions:", err.message);
    latestTransactions = null;
  }

  renderScore();
  if (scoreFlipInnerEl.classList.contains("flipped")) renderSpendingBreakdown();
  syncFlipHeight();
  topbarStatusEl.textContent = "";
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
// "Can I afford it?" — with a category dropdown
// ---------------------------------------------------------------

function updateAffordResult() {
  const amount = parseFloat(affordInput.value);
  const category = affordCategoryEl.value;

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

  let categoryLine = "";
  const isDiscretionary = DISCRETIONARY_CHECK_CATEGORIES.has(category);
  if (isDiscretionary && latestTransactions && latestTransactions.discretionary_spend_30d > 0) {
    const pctOfDiscretionary = (amount / latestTransactions.discretionary_spend_30d) * 100;
    categoryLine = `<p>${pctOfDiscretionary.toFixed(0)}% of your last 30 days of discretionary spending</p>`;
  } else if (category === "housing" || category === "utilities") {
    categoryLine = `<p>Fixed cost — this affects your runway, not your discretionary room.</p>`;
  }

  affordResult.innerHTML = `
    <p>${verdict}</p>
    <p>${pctOfLiquid.toFixed(1)}% of liquid cash · ${pctOfNetWorth.toFixed(1)}% of net worth</p>
    ${categoryLine}
    <p>new liquid cash ${formatMoney(newLiquid)} · new net worth ${formatMoney(newNetWorth)}</p>
  `;
}

affordInput.addEventListener("input", updateAffordResult);
affordCategoryEl.addEventListener("change", updateAffordResult);

// ---------------------------------------------------------------
// Financial health score — whoop-style circular gauge
//
// Four inputs, each 0-100, weighted. This is a first-pass formula — the
// weights are a reasonable starting guess, not a validated model.
//
//   Runway (35%)     — liquid cash / fixed monthly spend, in months
//   Elasticity (25%) — % of spending that's discretionary
//   Leverage (25%)   — debt / assets (less = better)
//   Trajectory (15%) — net worth growth over the last ~6 months
// ---------------------------------------------------------------

const GAUGE_RADIUS = 78;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * GAUGE_RADIUS;
scoreGaugeFillEl.style.strokeDasharray = `${GAUGE_CIRCUMFERENCE}`;
scoreGaugeFillEl.style.strokeDashoffset = `${GAUGE_CIRCUMFERENCE}`;

let scoreComponentsCache = [];

// Light green (low score) to deep green (high score) — always green, never
// red/yellow, just a richer shade as the number improves.
function scoreColor(score) {
  const pct = clamp(score, 0, 100) / 100;
  const light = { r: 167, g: 230, b: 205 }; // pale mint
  const deep = { r: 0, g: 158, b: 112 }; // rich emerald
  const r = Math.round(light.r + (deep.r - light.r) * pct);
  const g = Math.round(light.g + (deep.g - light.g) * pct);
  const b = Math.round(light.b + (deep.b - light.b) * pct);
  return `rgb(${r}, ${g}, ${b})`;
}

function setGauge(score) {
  const pct = clamp(score, 0, 100) / 100;
  const offset = GAUGE_CIRCUMFERENCE * (1 - pct);
  scoreGaugeFillEl.style.strokeDashoffset = `${offset}`;
  scoreGaugeFillEl.style.stroke = scoreColor(score);
}

function renderScore() {
  if (!latestBalances) return;

  const fixedMonthlySpend = latestTransactions?.fixed_spend_30d ?? null;
  const discretionaryPct = latestTransactions?.discretionary_pct ?? null;

  let runwayScore = null;
  let runwayMonths = null;
  if (fixedMonthlySpend && fixedMonthlySpend > 0) {
    runwayMonths = latestBalances.liquid_cash / fixedMonthlySpend;
    runwayScore = clamp((runwayMonths / 12) * 100, 0, 100);
  }

  const elasticityScore = discretionaryPct !== null ? clamp(discretionaryPct * 100, 0, 100) : null;

  let leverageScore = null;
  if (latestBalances.total_assets > 0) {
    const debtRatio = latestBalances.total_liabilities / latestBalances.total_assets;
    leverageScore = clamp(100 - debtRatio * 100, 0, 100);
  }

  let trajectoryScore = null;
  const priorNetWorth = latestBalances.net_worth_6mo_ago;
  if (priorNetWorth && priorNetWorth !== 0) {
    const growthRate = (latestBalances.net_worth - priorNetWorth) / Math.abs(priorNetWorth);
    trajectoryScore = clamp(50 + growthRate * 250, 0, 100);
  }

  const weighted = [
    {
      score: runwayScore,
      weight: 0.35,
      label: "Runway",
      tooltip: "Liquid cash divided by your fixed monthly spend, in months. More months = more cushion if income stops.",
      detail: runwayMonths !== null ? `${runwayMonths.toFixed(1)} months of runway` : "",
    },
    {
      score: elasticityScore,
      weight: 0.25,
      label: "Elasticity",
      tooltip: "The % of your spending that's discretionary (could be cut fast) vs. fixed. Higher means more room to adapt.",
      detail: discretionaryPct !== null ? `${(discretionaryPct * 100).toFixed(0)}% of spend is discretionary` : "",
    },
    {
      score: leverageScore,
      weight: 0.25,
      label: "Leverage",
      tooltip: "Total debt divided by total assets. Lower leverage scores higher — less of what you own is owed to someone else.",
      detail:
        latestBalances.total_assets > 0
          ? `${((latestBalances.total_liabilities / latestBalances.total_assets) * 100).toFixed(0)}% debt-to-assets`
          : "",
    },
    {
      score: trajectoryScore,
      weight: 0.15,
      label: "Trajectory",
      tooltip: "How your net worth has moved over roughly the last 6 months. Flat growth scores as neutral (50).",
      detail:
        priorNetWorth && priorNetWorth !== 0
          ? `${(((latestBalances.net_worth - priorNetWorth) / Math.abs(priorNetWorth)) * 100) >= 0 ? "+" : ""}${(
              ((latestBalances.net_worth - priorNetWorth) / Math.abs(priorNetWorth)) *
              100
            ).toFixed(1)}% net worth, ~6 months`
          : "",
    },
  ].filter((c) => c.score !== null);

  scoreComponentsCache = weighted;

  if (weighted.length === 0) {
    scoreValueEl.textContent = "—";
    setGauge(0);
    scoreBreakdownEl.innerHTML = `<div class="empty-state">Connect a bank and give it a few days to build a score.</div>`;
    return;
  }

  const totalWeight = weighted.reduce((sum, c) => sum + c.weight, 0);
  const finalScore = weighted.reduce((sum, c) => sum + c.score * (c.weight / totalWeight), 0);

  scoreValueEl.textContent = Math.round(finalScore);
  setGauge(finalScore);

  scoreBreakdownEl.innerHTML = weighted
    .map(
      (c, i) => `
        <div class="list-row">
          <span>
            ${c.label} <span class="score-weight">(${Math.round(c.weight * 100)}%)</span>
            <span class="score-tooltip-icon" data-idx="${i}">?</span>
          </span>
          <span class="mono">${Math.round(c.score)} · ${c.detail}</span>
        </div>
        <div class="score-tooltip-text" data-idx="${i}">${c.tooltip}</div>
      `
    )
    .join("");

  if (weighted.length < 4) {
    scoreBreakdownEl.innerHTML += `<div class="empty-state">Score improves as more transaction history builds up.</div>`;
  }

  // Wire up the tooltip icons freshly rendered above.
  scoreBreakdownEl.querySelectorAll(".score-tooltip-icon").forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation(); // don't also trigger the expand/collapse on the section
      const idx = icon.dataset.idx;
      const text = scoreBreakdownEl.querySelector(`.score-tooltip-text[data-idx="${idx}"]`);
      text.classList.toggle("shown");
      icon.classList.toggle("active");
    });
  });
}

// Keeps the flip card's actual height matched to whichever face is
// currently showing — without this, the card stays sized to whichever
// face rendered first and the other face's content overlaps whatever
// comes after it on the page.
function syncFlipHeight() {
  const showingBack = scoreFlipInnerEl.classList.contains("flipped");
  const face = showingBack
    ? document.querySelector(".score-face-back")
    : document.querySelector(".score-face-front");
  scoreFlipInnerEl.style.height = `${face.scrollHeight}px`;
}

// Tap the gauge to expand/collapse the breakdown.
scoreGaugeWrapEl.addEventListener("click", () => {
  scoreBreakdownEl.classList.toggle("expanded");
  syncFlipHeight();
});

// Flip card — front (score) <-> back (spending breakdown)
scoreFlipBtnFrontEl.addEventListener("click", (e) => {
  e.stopPropagation();
  scoreFlipInnerEl.classList.add("flipped");
  renderSpendingBreakdown();
  syncFlipHeight();
});

scoreFlipBtnBackEl.addEventListener("click", (e) => {
  e.stopPropagation();
  scoreFlipInnerEl.classList.remove("flipped");
  syncFlipHeight();
});

// ---------------------------------------------------------------
// Spending breakdown — pie chart on the back of the flip card
//
// Honest limitation: Plaid gives us 30 days of transactions, which
// get-transactions aggregates into 30-day category totals. "Week" below
// divides those by ~4.3 to approximate a weekly average. "Day" would need
// real daily-level data we don't have yet — labeled clearly as such rather
// than faking a number.
// ---------------------------------------------------------------

const CATEGORY_COLORS = [
  "#00D9A3", "#4FA8D9", "#D9A24F", "#B56AD9", "#D95F5F", "#6AD98F", "#D9C24F", "#7C948A",
];

let spendingPeriod = "week";

document.querySelectorAll(".spending-period-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    spendingPeriod = btn.dataset.period;
    document.querySelectorAll(".spending-period-btn").forEach((b) => b.classList.toggle("active", b === btn));
    renderSpendingBreakdown();
    syncFlipHeight();
  });
});

function renderSpendingBreakdown() {
  const ctx = spendingPieCanvasEl.getContext("2d");
  const width = spendingPieCanvasEl.width;
  const height = spendingPieCanvasEl.height;
  ctx.clearRect(0, 0, width, height);

  if (spendingPeriod === "day") {
    ctx.font = "13px IBM Plex Sans, sans-serif";
    ctx.fillStyle = "#7C948A";
    ctx.textAlign = "center";
    ctx.fillText("Day view coming soon —", width / 2, height / 2 - 8);
    ctx.fillText("needs daily-level data.", width / 2, height / 2 + 10);
    spendingLegendEl.innerHTML = "";
    return;
  }

  const breakdown = latestTransactions?.category_breakdown_30d ?? [];
  if (breakdown.length === 0) {
    ctx.font = "13px IBM Plex Sans, sans-serif";
    ctx.fillStyle = "#7C948A";
    ctx.textAlign = "center";
    ctx.fillText("No spending data yet.", width / 2, height / 2);
    spendingLegendEl.innerHTML = "";
    return;
  }

  // Divide 30-day totals down to a weekly average (~4.33 weeks/month).
  const weeklyBreakdown = breakdown.map((b) => ({ category: b.category, total: b.total / 4.33 }));
  const total = weeklyBreakdown.reduce((sum, b) => sum + b.total, 0);

  const cx = width / 2;
  const cy = height / 2;
  const radius = 70;
  let startAngle = -Math.PI / 2;

  weeklyBreakdown.forEach((b, i) => {
    const sliceAngle = (b.total / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  spendingLegendEl.innerHTML = weeklyBreakdown
    .map((b, i) => {
      const label = b.category.replaceAll("_", " ").toLowerCase();
      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
      return `
        <div class="spending-legend-row">
          <span class="spending-legend-swatch" style="background:${color}"></span>
          <span>${label}</span>
          <span class="mono">${formatMoney(b.total)}/wk</span>
        </div>`;
    })
    .join("");
}

// ---------------------------------------------------------------
// Net worth trend graph — interactive canvas sparkline, last 90 days
// ---------------------------------------------------------------

let trendPoints = []; // cached pixel positions for hit-testing on hover/touch

function renderTrend(history) {
  const canvas = trendCanvasEl;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  trendPoints = [];

  if (!history || history.length < 2) {
    ctx.font = "13px IBM Plex Mono, monospace";
    ctx.fillStyle = "#7C948A";
    ctx.fillText("Not enough history yet — check back after a few refreshes.", 10, height / 2);
    trendAxisLabelsEl.innerHTML = "";
    return;
  }

  const values = history.map((h) => h.net_worth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 10;

  ctx.beginPath();
  ctx.strokeStyle = "#00D9A3";
  ctx.lineWidth = 2;

  history.forEach((point, i) => {
    const x = padding + (i / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point.net_worth - min) / range) * (height - padding * 2);
    trendPoints.push({ x, y, net_worth: point.net_worth, created_at: point.created_at });
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  const dateLabel = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const mid = history[Math.floor((history.length - 1) / 2)];
  trendAxisLabelsEl.innerHTML = `
    <span>${dateLabel(history[0].created_at)}</span>
    <span>${dateLabel(mid.created_at)}</span>
    <span>${dateLabel(history[history.length - 1].created_at)}</span>
  `;
}

function nearestTrendPoint(canvasX) {
  if (trendPoints.length === 0) return null;
  let closest = trendPoints[0];
  let closestDist = Math.abs(trendPoints[0].x - canvasX);
  for (const p of trendPoints) {
    const dist = Math.abs(p.x - canvasX);
    if (dist < closestDist) {
      closest = p;
      closestDist = dist;
    }
  }
  return closest;
}

function showTrendTooltip(clientX) {
  const rect = trendCanvasEl.getBoundingClientRect();
  const scaleX = trendCanvasEl.width / rect.width;
  const canvasX = (clientX - rect.left) * scaleX;
  const point = nearestTrendPoint(canvasX);
  if (!point) return;

  const date = new Date(point.created_at);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  trendTooltipEl.textContent = `${dateLabel} · ${formatMoney(point.net_worth)}`;
  trendTooltipEl.style.left = `${(point.x / trendCanvasEl.width) * rect.width}px`;
  trendTooltipEl.classList.add("shown");
}

function hideTrendTooltip() {
  trendTooltipEl.classList.remove("shown");
}

trendCanvasEl.addEventListener("mousemove", (e) => showTrendTooltip(e.clientX));
trendCanvasEl.addEventListener("mouseleave", hideTrendTooltip);
trendCanvasEl.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches[0]) showTrendTooltip(e.touches[0].clientX);
  },
  { passive: true }
);
trendCanvasEl.addEventListener(
  "touchmove",
  (e) => {
    if (e.touches[0]) showTrendTooltip(e.touches[0].clientX);
  },
  { passive: true }
);
trendCanvasEl.addEventListener("touchend", hideTrendTooltip);

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

goalInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") showGoalPlan(latestBalances);
});

function showGoalPlan(data) {
  const goal = parseFloat(goalInputEl.value);
  if (isNaN(goal) || goal <= 0 || !data) return;

  const remaining = goal - data.net_worth;
  if (remaining <= 0) {
    goalResultEl.textContent = "You've already hit this goal.";
    return;
  }

  // Required monthly savings to hit the goal in 5 years, assuming a 7%/yr
  // return compounded monthly — the same annuity-payment math as a
  // standard retirement calculator. A planning estimate, not a guarantee.
  const years = 5;
  const monthlyRate = 0.07 / 12;
  const months = years * 12;
  const requiredMonthly = (remaining * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);

  const currentPaceLine = (() => {
    const history = data.history ?? [];
    if (history.length < 2) return "";
    const first = history[0];
    const last = history[history.length - 1];
    const daysElapsed = (new Date(last.created_at) - new Date(first.created_at)) / (1000 * 60 * 60 * 24);
    const growthPerDay = daysElapsed > 0 ? (last.net_worth - first.net_worth) / daysElapsed : 0;
    if (growthPerDay <= 0) return "At your current trend, growth has been flat or negative.";
    const yearsToGoal = remaining / growthPerDay / 365;
    return `At your current pace: ~${yearsToGoal.toFixed(1)} years.`;
  })();

  goalResultEl.innerHTML = `
    <p><strong>Here's your plan:</strong></p>
    <p>${currentPaceLine}</p>
    <p>To hit this in 5 years at a 7%/yr estimate: save ~${formatMoney(requiredMonthly)}/month.</p>
  `;
}

// ---------------------------------------------------------------
// "Invest instead" comparison — simple 7%/yr nominal estimate
// ---------------------------------------------------------------

function updateInvestResult() {
  const amount = parseFloat(investAmountEl.value);
  const years = parseFloat(investYearsEl.value);
  const cadence = investCadenceEl.value;

  if (isNaN(amount) || amount <= 0 || isNaN(years) || years <= 0) {
    investResultEl.textContent = "";
    return;
  }

  const annualReturn = 0.07;

  if (cadence === "once") {
    const futureValue = amount * Math.pow(1 + annualReturn, years);
    const gain = futureValue - amount;
    investResultEl.innerHTML = `
      <p>At a 7%/yr estimate: ${formatMoney(futureValue)} in ${years} year${years == 1 ? "" : "s"}</p>
      <p>(${formatMoney(gain)} of growth — this is a rough estimate, not a guarantee)</p>
    `;
    return;
  }

  // Recurring contribution — future value of an annuity, compounded at the
  // same cadence as the contribution (weekly/monthly/yearly).
  const periodsPerYear = { weekly: 52, monthly: 12, yearly: 1 }[cadence];
  const periodRate = Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1;
  const totalPeriods = years * periodsPerYear;
  const futureValue = amount * ((Math.pow(1 + periodRate, totalPeriods) - 1) / periodRate);
  const totalContributed = amount * totalPeriods;
  const gain = futureValue - totalContributed;

  investResultEl.innerHTML = `
    <p>${formatMoney(amount)}/${cadence.replace("ly", "")} at 7%/yr: ${formatMoney(futureValue)} in ${years} year${years == 1 ? "" : "s"}</p>
    <p>(${formatMoney(totalContributed)} contributed · ${formatMoney(gain)} of growth — a rough estimate, not a guarantee)</p>
  `;
}

investAmountEl.addEventListener("input", updateInvestResult);
investYearsEl.addEventListener("input", updateInvestResult);
investCadenceEl.addEventListener("change", updateInvestResult);

// ---------------------------------------------------------------
// Asset allocation breakdown
// ---------------------------------------------------------------

function renderAllocation(data) {
  const buckets = {
    Cash: { total: 0, items: [] },
    Investments: { total: 0, items: [] },
    "Real estate": { total: 0, items: [] },
    Other: { total: 0, items: [] },
  };

  for (const acct of data.accounts ?? []) {
    if (acct.type === "credit" || acct.type === "loan") continue;
    const balance = acct.current ?? 0;
    const label = `${acct.name}${acct.institution_name ? " · " + acct.institution_name : ""}`;
    if (acct.type === "investment") buckets["Investments"].items.push({ label, amount: balance });
    else if (acct.type === "depository") buckets["Cash"].items.push({ label, amount: balance });
    else buckets["Other"].items.push({ label, amount: balance });
  }

  for (const item of data.manual_items ?? []) {
    if (item.amount <= 0) continue;
    const bucket = item.category === "real_estate" ? "Real estate" : "Other";
    buckets[bucket].items.push({ label: item.label, amount: item.amount });
  }

  for (const key of Object.keys(buckets)) {
    buckets[key].total = buckets[key].items.reduce((sum, i) => sum + i.amount, 0);
  }

  const total = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

  if (total <= 0) {
    allocationListEl.innerHTML = `<div class="empty-state">Connect accounts to see your allocation.</div>`;
    return;
  }

  allocationListEl.innerHTML = Object.entries(buckets)
    .filter(([, b]) => b.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([label, bucket], i) => {
      const pct = (bucket.total / total) * 100;
      const detailRows = bucket.items
        .map((item) => `<div class="account-detail-row"><span>${item.label}</span><span>${formatMoney(item.amount)}</span></div>`)
        .join("");
      return `
        <div>
          <div class="list-row allocation-row-clickable" data-idx="${i}">
            <span>${label}</span>
            <span class="mono">${pct.toFixed(0)}% · ${formatMoney(bucket.total)}</span>
          </div>
          <div class="allocation-detail hidden" data-idx="${i}">${detailRows}</div>
        </div>`;
    })
    .join("");

  allocationListEl.querySelectorAll(".allocation-row-clickable").forEach((row) => {
    row.addEventListener("click", () => {
      const idx = row.dataset.idx;
      allocationListEl.querySelector(`.allocation-detail[data-idx="${idx}"]`).classList.toggle("hidden");
    });
  });
}

// ---------------------------------------------------------------
// Add a manual item (real estate, other assets not connected via Plaid)
// ---------------------------------------------------------------

addManualBtnEl.addEventListener("click", () => {
  addManualFormEl.classList.toggle("hidden");
});

manualSubmitBtnEl.addEventListener("click", async () => {
  const label = manualLabelEl.value.trim();
  const amount = parseFloat(manualAmountEl.value);
  const category = manualCategoryEl.value;

  if (!label || isNaN(amount)) {
    manualAddStatusEl.textContent = "Enter a label and a value first.";
    return;
  }

  manualSubmitBtnEl.disabled = true;
  manualAddStatusEl.textContent = "Adding…";

  try {
    await callFunction("add-manual-item", { label, amount, category });
    manualLabelEl.value = "";
    manualAmountEl.value = "";
    manualAddStatusEl.textContent = "Added.";
    addManualFormEl.classList.add("hidden");
    await loadEverything();
  } catch (err) {
    manualAddStatusEl.textContent = `Couldn't add it: ${err.message}`;
  } finally {
    manualSubmitBtnEl.disabled = false;
  }
});

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
