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
const affordResult = document.getElementById("afford-result");
const dashboardStatus = document.getElementById("dashboard-status");

let latestBalances = null;

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatDelta(n) {
  if (n === 0) return "No change today";
  const arrow = n > 0 ? "▲" : "▼";
  return `${arrow} ${formatMoney(Math.abs(n))} today`;
}

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

async function loadBalances() {
  dashboardStatus.textContent = "Refreshing…";
  try {
    const data = await callFunction("get-balances");
    latestBalances = data;
    render(data);
    dashboardStatus.textContent = "";
  } catch (err) {
    dashboardStatus.textContent = `Couldn't load balances: ${err.message}`;
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
  if (pctOfLiquid < 5) verdict = "Comfortably affordable.";
  else if (pctOfLiquid < 20) verdict = "Affordable, but noticeable.";
  else if (pctOfLiquid < 50) verdict = "This is a big chunk of your liquid cash.";
  else verdict = "This would take a serious bite out of your cash position.";

  affordResult.innerHTML = `
    <p>${verdict}</p>
    <p>${pctOfLiquid.toFixed(1)}% of liquid cash · ${pctOfNetWorth.toFixed(1)}% of net worth</p>
    <p>new liquid cash ${formatMoney(newLiquid)} · new net worth ${formatMoney(newNetWorth)}</p>
  `;
});

loadBalances();
