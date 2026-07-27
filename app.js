// app.js — all frontend logic for the single-screen dashboard.
// No build step, no framework — plain JS on purpose, so this stays a
// one-evening file to read top to bottom.

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Point these at your deployed Supabase Edge Functions.
// Format is always: https://YOUR-PROJECT-REF.supabase.co/functions/v1/FUNCTION-NAME
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

const authScreen = document.getElementById("auth-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authStatus = document.getElementById("auth-status");
const dashboardStatus = document.getElementById("dashboard-status");

const netWorthValueEl = document.getElementById("net-worth-value");
const netWorthDeltaEl = document.getElementById("net-worth-delta");
const liquidCashValueEl = document.getElementById("liquid-cash-value");
const totalAssetsValueEl = document.getElementById("total-assets-value");
const totalLiabilitiesValueEl = document.getElementById("total-liabilities-value");
const accountsListEl = document.getElementById("accounts-list");
const connectBtn = document.getElementById("connect-btn");
const refreshBtn = document.getElementById("refresh-btn");
const affordInput = document.getElementById("afford-input");
const affordResult = document.getElementById("afford-result");

const subscriptionsTotalEl = document.getElementById("subscriptions-total");
const subscriptionsListEl = document.getElementById("subscriptions-list");
const billsListEl = document.getElementById("bills-list");
const spendingListEl = document.getElementById("spending-list");
const investmentsSummaryEl = document.getElementById("investments-summary");
const topHoldingsListEl = document.getElementById("top-holdings-list");
const liabilitiesListEl = document.getElementById("liabilities-list");

let latestBalances = null; // cached response from get-balances, used by the afford calculator

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

// ---------------------------------------------------------------
// Auth — magic link, no password
// ---------------------------------------------------------------

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authStatus.textContent = "Sending…";

  const { error } = await supabase.auth.signInWithOtp({
    email: authEmail.value,
    options: { emailRedirectTo: window.location.href },
  });

  authStatus.textContent = error
    ? `Error: ${error.message}`
    : "Check your email for the link.";
});

async function checkSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    showDashboard();
    loadBalances();
  } else {
    showAuth();
  }
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showDashboard();
    loadBalances();
  } else {
    showAuth();
  }
});

function showAuth() {
  authScreen.classList.remove("hidden");
  dashboardScreen.classList.add("hidden");
}

function showDashboard() {
  authScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
}

// ---------------------------------------------------------------
// Calling Supabase Edge Functions (with the user's auth token attached)
// ---------------------------------------------------------------

async function callFunction(name, body) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
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
          await loadBalances();
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
// Loading + rendering balances
// ---------------------------------------------------------------

async function loadBalances() {
  dashboardStatus.textContent = "Refreshing…";
  try {
    const data = await callFunction("get-balances");
    latestBalances = data;
    render(data);
    dashboardStatus.textContent = "";
  } catch (err) {
    dashboardStatus.textContent = `Couldn't load balances: ${err.message}`;
    return;
  }

  // These three are independent of the core net worth number, so they load
  // in parallel and fail quietly per-section rather than blocking the
  // whole dashboard if one institution doesn't support a product.
  loadTransactions();
  loadInvestments();
  loadLiabilities();
}

async function loadTransactions() {
  try {
    const data = await callFunction("get-transactions");
    renderSubscriptionsAndBills(data);
    renderSpending(data);
  } catch (err) {
    subscriptionsListEl.innerHTML = `<div class="empty-state">Couldn't load: ${err.message}</div>`;
  }
}

async function loadInvestments() {
  try {
    const data = await callFunction("get-investments");
    renderInvestments(data);
  } catch (err) {
    investmentsSummaryEl.innerHTML = `<div class="empty-state">Couldn't load: ${err.message}</div>`;
  }
}

async function loadLiabilities() {
  try {
    const data = await callFunction("get-liabilities");
    renderLiabilities(data);
  } catch (err) {
    liabilitiesListEl.innerHTML = `<div class="empty-state">Couldn't load: ${err.message}</div>`;
  }
}

function render(data) {
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

refreshBtn.addEventListener("click", loadBalances);

// ---------------------------------------------------------------
// "Can I afford it?" — the whole point of the app
// ---------------------------------------------------------------

affordInput.addEventListener("input", () => {
  const amount = parseFloat(affordInput.value);

  if (!latestBalances || isNaN(amount) || amount <= 0) {
    affordResult.textContent = "";
    return;
  }

  const pctOfLiquid = (amount / latestBalances.liquid_cash) * 100;
  const pctOfNetWorth = (amount / latestBalances.net_worth) * 100;
  const newLiquid = latestBalances.liquid_cash - amount;
  const newNetWorth = latestBalances.net_worth - amount;

  let verdict;
  if (pctOfLiquid < 5) {
    verdict = "Comfortably affordable.";
  } else if (pctOfLiquid < 20) {
    verdict = "Affordable, but noticeable.";
  } else if (pctOfLiquid < 50) {
    verdict = "This is a big chunk of your liquid cash.";
  } else {
    verdict = "This would take a serious bite out of your cash position.";
  }

  affordResult.innerHTML = `
    <p>${verdict}</p>
    <p>${pctOfLiquid.toFixed(1)}% of liquid cash · ${pctOfNetWorth.toFixed(1)}% of net worth</p>
    <p>new liquid cash ${formatMoney(newLiquid)} · new net worth ${formatMoney(newNetWorth)}</p>
  `;
});

// ---------------------------------------------------------------
// Subscriptions + bill calendar (from get-transactions)
// ---------------------------------------------------------------

function renderSubscriptionsAndBills(data) {
  subscriptionsTotalEl.textContent = data.monthly_subscription_total
    ? `· ${formatMoney(data.monthly_subscription_total)}/mo`
    : "";

  if (!data.recurring_charges || data.recurring_charges.length === 0) {
    subscriptionsListEl.innerHTML = `<div class="empty-state">Nothing detected yet — needs a couple months of transaction history.</div>`;
    billsListEl.innerHTML = `<div class="empty-state">Nothing detected yet.</div>`;
    return;
  }

  subscriptionsListEl.innerHTML = data.recurring_charges
    .map(
      (r) => `
      <div class="list-row">
        <span>${r.merchant}</span>
        <span class="mono">${formatMoney(r.average_amount)}/mo</span>
      </div>`
    )
    .join("");

  // Bill calendar: same recurring list, sorted by soonest next date
  const upcoming = [...data.recurring_charges].sort(
    (a, b) => new Date(a.projected_next) - new Date(b.projected_next)
  );

  billsListEl.innerHTML = upcoming
    .slice(0, 8)
    .map((r) => {
      const daysOut = Math.round((new Date(r.projected_next) - new Date()) / 86400000);
      const dueLabel = daysOut <= 0 ? "due now" : `in ${daysOut} day${daysOut === 1 ? "" : "s"}`;
      return `
      <div class="list-row">
        <span>${r.merchant}</span>
        <span class="mono">${formatMoney(r.average_amount)} · ${dueLabel}</span>
      </div>`;
    })
    .join("");
}

function renderSpending(data) {
  const entries = Object.entries(data.category_totals_30d ?? {}).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    spendingListEl.innerHTML = `<div class="empty-state">No spending in the last 30 days.</div>`;
    return;
  }

  spendingListEl.innerHTML = entries
    .map(
      ([category, total]) => `
      <div class="list-row">
        <span>${category.replaceAll("_", " ").toLowerCase()}</span>
        <span class="mono">${formatMoney(total)}</span>
      </div>`
    )
    .join("");
}

// ---------------------------------------------------------------
// Investments (from get-investments)
// ---------------------------------------------------------------

function renderInvestments(data) {
  if (!data.top_holdings || data.top_holdings.length === 0) {
    investmentsSummaryEl.innerHTML = `<div class="empty-state">No investment accounts connected, or your institution doesn't support Plaid's investments product.</div>`;
    topHoldingsListEl.innerHTML = "";
    return;
  }

  investmentsSummaryEl.innerHTML = `
    <div class="ledger-row">
      <span class="ledger-label">Portfolio value</span>
      <span class="ledger-value">${formatMoney(data.total_portfolio_value)}</span>
    </div>
  `;

  topHoldingsListEl.innerHTML = data.top_holdings
    .map(
      (h) => `
      <div class="list-row">
        <span>${h.ticker || h.name}</span>
        <span class="mono">${formatMoney(h.value)} · ${h.pct_of_portfolio}%</span>
      </div>`
    )
    .join("");
}

// ---------------------------------------------------------------
// Liabilities detail (from get-liabilities)
// ---------------------------------------------------------------

function renderLiabilities(data) {
  const rows = [];

  for (const c of data.credit ?? []) {
    rows.push(`
      <div class="list-row">
        <span>${c.institution_name} card</span>
        <span class="mono">${c.apr_percentage ? c.apr_percentage + "% APR" : ""} · min ${formatMoney(c.minimum_payment_amount ?? 0)}</span>
      </div>`);
  }

  for (const m of data.mortgage ?? []) {
    rows.push(`
      <div class="list-row">
        <span>${m.institution_name} mortgage</span>
        <span class="mono">${m.interest_rate_percentage ? m.interest_rate_percentage + "%" : ""} · ${formatMoney(m.next_monthly_payment ?? 0)}/mo</span>
      </div>`);
  }

  for (const s of data.student ?? []) {
    rows.push(`
      <div class="list-row">
        <span>${s.loan_name ?? "Student loan"}</span>
        <span class="mono">${s.interest_rate_percentage ? s.interest_rate_percentage + "%" : ""} · min ${formatMoney(s.minimum_payment_amount ?? 0)}</span>
      </div>`);
  }

  liabilitiesListEl.innerHTML =
    rows.length > 0 ? rows.join("") : `<div class="empty-state">No detailed liabilities found.</div>`;
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

checkSession();
