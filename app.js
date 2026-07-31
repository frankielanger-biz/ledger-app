// app.js — real per-user login now. Every request sends the signed-in
// user's own session token, and Row Level Security in the database
// enforces that they only ever see their own data.

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 220);
  }, 2200);
}
const FN_BASE = `${SUPABASE_URL}/functions/v1`;

const authScreenEl = document.getElementById("auth-screen");
const appRootEl = document.getElementById("app-root");
const authFormEl = document.getElementById("auth-form");
const authEmailEl = document.getElementById("auth-email");
const authPasswordEl = document.getElementById("auth-password");
const authSubmitBtnEl = document.getElementById("auth-submit-btn");
const authStatusEl = document.getElementById("auth-status");
const authToggleBtnEl = document.getElementById("auth-toggle-btn");
const authTitleEl = document.getElementById("auth-title");
const authCardEl = document.querySelector(".auth-card");

let authMode = "signin"; // or "signup"
let oauthResumeChecked = false;
let justSignedUp = false;

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
const spendingMonthSelectEl = document.getElementById("spending-month-select");
const trendCanvasEl = document.getElementById("trend-canvas");
const trendTooltipEl = document.getElementById("trend-tooltip");
const trendAxisLabelsEl = document.getElementById("trend-axis-labels");
const extraSavingsEl = document.getElementById("extra-savings-input");
const extraInvestingEl = document.getElementById("extra-investing-input");
const goalNetWorthEl = document.getElementById("goal-net-worth-input");
const forecastCurrentNetWorthEl = document.getElementById("forecast-current-net-worth");
const goalResultEl = document.getElementById("goal-result");
const forecastTrajectoryCanvasEl = document.getElementById("forecast-trajectory-canvas");
const forecastSpendingCanvasEl = document.getElementById("forecast-spending-canvas");
const investAmountEl = document.getElementById("invest-amount");
const investYearsEl = document.getElementById("invest-years");
const investCadenceEl = document.getElementById("invest-cadence");
const investResultEl = document.getElementById("invest-result");
const investTickerEl = document.getElementById("invest-ticker");
const investTickerQuoteEl = document.getElementById("invest-ticker-quote");
const compareSpyCheckEl = document.getElementById("compare-spy-check");
const noBrokerageCheckEl = document.getElementById("no-brokerage-check");
const noBrokeragePanelEl = document.getElementById("no-brokerage-panel");
const investInputsWrapEl = document.getElementById("invest-inputs-wrap");
const forecastBtnEl = document.getElementById("forecast-btn");
const allocationListEl = document.getElementById("allocation-list");
const addManualBtnEl = document.getElementById("add-manual-btn");
const addManualFormEl = document.getElementById("add-manual-form");
const manualLabelEl = document.getElementById("manual-label");
const manualAmountEl = document.getElementById("manual-amount");
const manualCategoryEl = document.getElementById("manual-category");
const manualSubmitBtnEl = document.getElementById("manual-submit-btn");
const manualAddStatusEl = document.getElementById("manual-add-status");
const ledgerBrandEl = document.querySelector(".topnav-brand");

// New feature elements
const percentileLineEl = document.getElementById("percentile-line");
const emergencyFundBarEl = document.getElementById("emergency-fund-bar");
const emergencyFundCaptionEl = document.getElementById("emergency-fund-caption");
const subscriptionListEl = document.getElementById("subscription-list");
const debtPayoffListEl = document.getElementById("debt-payoff-list");
const debtPayoffSummaryEl = document.getElementById("debt-payoff-summary");
const watchlistListEl = document.getElementById("watchlist-list");
const addWatchlistBtnEl = document.getElementById("add-watchlist-btn");
const addWatchlistFormEl = document.getElementById("add-watchlist-form");
const watchlistLabelEl = document.getElementById("watchlist-label");
const watchlistAmountEl = document.getElementById("watchlist-amount");
const watchlistSubmitBtnEl = document.getElementById("watchlist-submit-btn");
const discreteToggleBtnEl = document.getElementById("discrete-toggle-btn");
const eyeOpenIconEl = document.getElementById("eye-open-icon");
const eyeClosedIconEl = document.getElementById("eye-closed-icon");
const bookCallTopicEl = document.getElementById("book-call-topic");
const bookCallBtnEl = document.getElementById("book-call-btn");
const faqQuestionInputEl = document.getElementById("faq-question-input");
const faqQuestionSubmitEl = document.getElementById("faq-question-submit");
const faqQuestionStatusEl = document.getElementById("faq-question-status");
const amaQuestionInputEl = document.getElementById("ama-question-input");
const amaQuestionSubmitEl = document.getElementById("ama-question-submit");
const amaQuestionStatusEl = document.getElementById("ama-question-status");
const settingsFirstNameEl = document.getElementById("settings-first-name");
const settingsLastNameEl = document.getElementById("settings-last-name");
const settingsEmailEl = document.getElementById("settings-email");
const settingsPhoneEl = document.getElementById("settings-phone");
const settingsAgeEl = document.getElementById("settings-age");
const settingsBirthdayEl = document.getElementById("settings-birthday");
const settingsSaveBtnEl = document.getElementById("settings-save-btn");
const settingsAccountsListEl = document.getElementById("settings-accounts-list");
const inviteFriendsBtnEl = document.getElementById("invite-friends-btn");
const inviteStatusEl = document.getElementById("invite-status");
const settingsSaveStatusEl = document.getElementById("settings-save-status");
const swipeContainerEl = document.getElementById("swipe-container");

const BOOKING_EMAIL = "frankielanger@gmail.com";

let latestBalances = null;
let latestTransactions = null;
let latestHistory = [];

let trendResizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(trendResizeTimeout);
  trendResizeTimeout = setTimeout(() => {
    renderTrend(latestHistory);
    if (latestBalances) updateForecast(latestBalances);
  }, 150);
});

// Categories that count as "discretionary" for the afford-check comparison —
// matches the same buckets get-transactions uses server-side, so the two
// stay consistent with each other.
const DISCRETIONARY_CHECK_CATEGORIES = new Set(["discretionary", "subscription"]);

// ---------------------------------------------------------------
// Tab navigation
// ---------------------------------------------------------------

const tabButtons = document.querySelectorAll(".topnav-tab");
const tabPanels = document.querySelectorAll(".tab-panel");

const TAB_INTROS = {
  "dashboard": {
    title: "Dashboard",
    text: "Your net worth, financial health score, and recent trend, at a glance.",
  },
  "getting-started": {
    title: "Getting Started",
    text: "Your setup checklist. Connect a bank and fill in a few basics to get Ledger dialed in.",
  },
  "manage": {
    title: "Manage",
    text: "Connect banks, add things that aren't linked, compare investing vs. spending, and track debt payoff.",
  },
  "discretionary": {
    title: "Discretionary",
    text: "Check the impact of a new purchase before you make it, track things you're saving for, and audit your subscriptions.",
  },
  "forecast": {
    title: "Forecast (Beta)",
    text: "A projection of where your net worth is headed based on your recent trend. Still early, take it as a rough guide.",
  },
  "book-call": {
    title: "Book a call",
    text: "Grab time for personalized help going over your numbers.",
  },
  "faq": {
    title: "FAQ",
    text: "Quick answers to the questions people ask most about how Ledger works.",
  },
  "resources": {
    title: "Resources",
    text: "Guides and checklists, like the insurance/estate basics, to help you get your full financial picture in order.",
  },
  "settings": {
    title: "Settings",
    text: "Your profile, notifications, connected banks, and theme all live here.",
  },
  "beta": {
    title: "In Progress",
    text: "A preview of what's being built next for Ledger.",
  },
};

const tabIntroOverlayEl = document.getElementById("tab-intro-overlay");
const tabIntroTitleEl = document.getElementById("tab-intro-title");
const tabIntroTextEl = document.getElementById("tab-intro-text");
const tabIntroDismissEl = document.getElementById("tab-intro-dismiss");
const tabIntroSkipEl = document.getElementById("tab-intro-skip");
const tabIntroStepEl = document.getElementById("tab-intro-step");

const WALKTHROUGH_ORDER = [
  "dashboard",
  "manage",
  "discretionary",
  "forecast",
  "book-call",
  "faq",
  "resources",
  "settings",
  "beta",
];

let walkthroughActive = false;
let walkthroughStep = 0;

function startWalkthrough() {
  walkthroughActive = true;
  walkthroughStep = 0;
  document.querySelector(`.topnav-tab[data-tab="${WALKTHROUGH_ORDER[0]}"]`).click();
}

function showWalkthroughStep(tabName) {
  const intro = TAB_INTROS[tabName];
  if (!intro) return;

  const stepIndex = WALKTHROUGH_ORDER.indexOf(tabName);
  const isLast = stepIndex === WALKTHROUGH_ORDER.length - 1;

  tabIntroTitleEl.textContent = intro.title;
  tabIntroTextEl.textContent = intro.text;
  tabIntroStepEl.textContent = `${stepIndex + 1} of ${WALKTHROUGH_ORDER.length}`;
  tabIntroDismissEl.textContent = isLast ? "Done" : "Next  →";
  tabIntroOverlayEl.classList.remove("hidden");
  tabIntroOverlayEl.classList.add("walkthrough-mode");

  tabIntroDismissEl.onclick = () => {
    if (isLast) {
      endWalkthrough();
      return;
    }
    walkthroughStep = stepIndex + 1;
    document.querySelector(`.topnav-tab[data-tab="${WALKTHROUGH_ORDER[walkthroughStep]}"]`).click();
  };
}

function endWalkthrough() {
  walkthroughActive = false;
  tabIntroOverlayEl.classList.add("hidden");
  tabIntroOverlayEl.classList.remove("walkthrough-mode");
}

tabIntroSkipEl.addEventListener("click", endWalkthrough);

document.getElementById("start-walkthrough-btn")?.addEventListener("click", startWalkthrough);

const TAB_ORDER = [
  "getting-started",
  "dashboard",
  "manage",
  "discretionary",
  "forecast",
  "book-call",
  "faq",
  "resources",
  "settings",
  "beta",
];

function switchToTab(target, slideDirection) {
  const btn = document.querySelector(`.topnav-tab[data-tab="${target}"]`);
  if (!btn) return;
  tabButtons.forEach((b) => b.classList.toggle("active", b === btn));
  tabPanels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== target));
  btn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  if (slideDirection) {
    const panel = document.querySelector(`.tab-panel[data-panel="${target}"]`);
    if (panel) {
      panel.classList.remove("slide-in-left", "slide-in-right");
      // Force reflow so the animation restarts even if the same class was used last time.
      void panel.offsetWidth;
      panel.classList.add(slideDirection === "left" ? "slide-in-left" : "slide-in-right");
    }
  }
  if (walkthroughActive) showWalkthroughStep(target);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchToTab(btn.dataset.tab));
});

// Swipe left/right between tabs, in nav order.
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener(
  "touchstart",
  (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  (e) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const SWIPE_THRESHOLD = 60;

    // Ignore swipes that are mostly vertical (normal scrolling) or too short.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;
    // Don't hijack swipes while the auth screen or a modal overlay is up.
    if (!authScreenEl.classList.contains("hidden")) return;
    if (!tabIntroOverlayEl.classList.contains("hidden")) return;

    const currentTab = document.querySelector(".topnav-tab.active")?.dataset.tab;
    const currentIndex = TAB_ORDER.indexOf(currentTab);
    if (currentIndex === -1) return;

    if (deltaX < 0 && currentIndex < TAB_ORDER.length - 1) {
      // Swiped left -> go to next tab, incoming panel slides in from the right.
      switchToTab(TAB_ORDER[currentIndex + 1], "left");
    } else if (deltaX > 0 && currentIndex > 0) {
      // Swiped right -> go to previous tab, incoming panel slides in from the left.
      switchToTab(TAB_ORDER[currentIndex - 1], "right");
    }
  },
  { passive: true }
);

ledgerBrandEl.addEventListener("click", () => {
  const dashboardBtn = document.querySelector('.topnav-tab[data-tab="dashboard"]');
  dashboardBtn.click();
});

document.getElementById("attention-banner-btn").addEventListener("click", () => {
  document.querySelector('.topnav-tab[data-tab="manage"]').click();
  if (!latestBalances?.accounts?.length) {
    setTimeout(() => connectBtn.click(), 300);
  }
});

// ---------------------------------------------------------------
// Swipe left/right to move between tabs, in nav order
// ---------------------------------------------------------------

let swipeStartX = null;
let swipeStartY = null;

swipeContainerEl.addEventListener(
  "touchstart",
  (e) => {
    swipeStartX = e.touches[0].clientX;
    swipeStartY = e.touches[0].clientY;
  },
  { passive: true }
);

swipeContainerEl.addEventListener(
  "touchend",
  (e) => {
    if (swipeStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - swipeStartX;
    const deltaY = e.changedTouches[0].clientY - swipeStartY;

    // Require a clearly horizontal swipe so vertical scrolling isn't hijacked.
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 2) {
      const buttons = Array.from(tabButtons);
      const currentIdx = buttons.findIndex((b) => b.classList.contains("active"));
      const nextIdx = deltaX < 0 ? currentIdx + 1 : currentIdx - 1;
      if (nextIdx >= 0 && nextIdx < buttons.length) buttons[nextIdx].click();
    }

    swipeStartX = null;
    swipeStartY = null;
  },
  { passive: true }
);

// ---------------------------------------------------------------
// Pull-to-refresh — only triggers when already at the top of the page,
// so it doesn't fight with normal scrolling.
// ---------------------------------------------------------------

let pullStartY = null;
let pullTriggered = false;

document.addEventListener(
  "touchstart",
  (e) => {
    if (window.scrollY === 0) pullStartY = e.touches[0].clientY;
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (pullStartY === null) return;
    const delta = e.touches[0].clientY - pullStartY;
    if (delta > 80 && !pullTriggered) {
      pullTriggered = true;
      topbarStatusEl.textContent = "Release to refresh…";
    }
  },
  { passive: true }
);

document.addEventListener(
  "touchend",
  () => {
    if (pullTriggered) loadEverything();
    pullStartY = null;
    pullTriggered = false;
  },
  { passive: true }
);

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
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();

  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token ?? ""}`,
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

async function handlePlaidSuccess(public_token, metadata) {
  dashboardStatus.textContent = "Connecting…";
  try {
    await callFunction("exchange-public-token", {
      public_token,
      institution_name: metadata.institution?.name,
      institution_id: metadata.institution?.institution_id,
    });
    dashboardStatus.textContent = "";
    showToast(`${metadata.institution?.name ?? "Bank"} connected`);
    document.querySelector('.topnav-tab[data-tab="dashboard"]').click();
    await loadEverything();
  } catch (err) {
    dashboardStatus.textContent = `Couldn't finish connecting: ${err.message}`;
  }
}

connectBtn.addEventListener("click", async () => {
  connectBtn.disabled = true;
  connectBtn.textContent = "Loading…";

  try {
    const { link_token } = await callFunction("create-link-token");
    // Chase (and other OAuth institutions) redirect out to a real bank login
    // page, then bounce back to this same URL. We need the exact same
    // link_token to resume that session, so it has to survive the redirect —
    // localStorage does that; sessionStorage can get wiped if the browser
    // reclaims a backgrounded tab's memory during a slow mobile bank login
    // (MFA, security questions), which sessionStorage does not survive but
    // localStorage does.
    localStorage.setItem("ledger_plaid_link_token", link_token);

    const handler = Plaid.create({
      token: link_token,
      onSuccess: handlePlaidSuccess,
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

// If we're coming back from a Chase-style OAuth redirect, the URL will carry
// an oauth_state_id param. Resume the exact same Link session using the
// token we stashed before leaving, rather than starting a new one.
function maybeResumePlaidOAuth() {
  if (!window.location.href.includes("oauth_state_id=")) return;
  const savedToken = localStorage.getItem("ledger_plaid_link_token");
  if (!savedToken) {
    dashboardStatus.textContent =
      "Couldn't resume the bank connection after login. Please tap Connect a bank again.";
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }

  dashboardStatus.textContent = "Finishing bank connection…";
  const handler = Plaid.create({
    token: savedToken,
    receivedRedirectUri: window.location.href,
    onSuccess: handlePlaidSuccess,
    onExit: (err) => {
      if (err) console.error("Plaid Link (OAuth resume) exited with error:", err);
      dashboardStatus.textContent = "";
    },
  });
  handler.open();
  localStorage.removeItem("ledger_plaid_link_token");
  // Clean the URL so a later refresh doesn't try to resume this again.
  window.history.replaceState({}, document.title, window.location.pathname);
}

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
    renderSettingsAccounts(balances);
    renderPercentile(balances);
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

  renderEmergencyFund(latestBalances);
  loadSubscriptionAudit();
  loadDebtPayoff();
  renderScore();
  if (scoreFlipInnerEl.classList.contains("flipped")) loadSpendingForMonth();
  syncFlipHeight();
  topbarStatusEl.textContent = "";
  dashboardStatus.textContent = "";
  refreshBtn.classList.remove("spinning");
}

let discreteMode = true; // always defaults on at every load, can be toggled off per-session via the eye icon

function renderBalances(data) {
  if (discreteMode) {
    netWorthValueEl.textContent = "••••••";
    netWorthDeltaEl.textContent = "Discrete mode on";
    netWorthDeltaEl.className = "hero-delta";

    const total = data.total_assets || 1; // guard divide-by-zero
    liquidCashValueEl.textContent = `${((data.liquid_cash / total) * 100).toFixed(0)}%`;
    totalAssetsValueEl.textContent = "100%";
    totalLiabilitiesValueEl.textContent = `-${((data.total_liabilities / total) * 100).toFixed(0)}%`;
  } else {
    netWorthValueEl.textContent = formatMoney(data.net_worth);
    netWorthDeltaEl.textContent = formatDelta(data.change_today);
    netWorthDeltaEl.className = "hero-delta " + (data.change_today >= 0 ? "positive" : "negative");

    liquidCashValueEl.textContent = formatMoney(data.liquid_cash);
    totalAssetsValueEl.textContent = formatMoney(data.total_assets);
    totalLiabilitiesValueEl.textContent = formatMoney(-Math.abs(data.total_liabilities));
  }

  accountsListEl.innerHTML = "";
  const hasComplexAnswer = localStorage.getItem("ledger_has_complex_investments") !== null;
  const banner = document.getElementById("attention-banner");
  const bannerText = document.getElementById("attention-banner-text");
  if (!data.accounts || data.accounts.length === 0) {
    accountsListEl.innerHTML = `<div class="empty-state">No accounts connected yet.</div>`;
    bannerText.textContent = "No bank account connected";
    banner.classList.remove("hidden");
    return;
  }
  if (!hasComplexAnswer) {
    bannerText.textContent = "Finish setting up your profile";
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
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
      <span class="account-balance ${displayBalance < 0 ? "negative" : ""}">${discreteMode ? "••••" : formatMoney(displayBalance)}</span>
    `;
    accountsListEl.appendChild(row);
  }
}

discreteToggleBtnEl.addEventListener("click", () => {
  discreteMode = !discreteMode;
  discreteToggleBtnEl.classList.toggle("active", discreteMode);
  eyeOpenIconEl.classList.toggle("hidden", discreteMode);
  eyeClosedIconEl.classList.toggle("hidden", !discreteMode);
  if (latestBalances) renderBalances(latestBalances);
});
discreteToggleBtnEl.classList.add("active");
eyeOpenIconEl.classList.add("hidden");
eyeClosedIconEl.classList.remove("hidden");

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
    categoryLine = `<p>Fixed cost. This affects your runway, not your discretionary room.</p>`;
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
      tooltip: "Total debt divided by total assets. Lower leverage scores higher. Less of what you own is owed to someone else.",
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
  loadSpendingForMonth();
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
// Uses a real calendar-month date range fetched fresh from Plaid for
// whichever month is selected, rather than dividing 30-day totals into
// fake daily/weekly numbers.
// ---------------------------------------------------------------

const CATEGORY_COLORS = [
  "#00D9A3", "#4FA8D9", "#D9A24F", "#B56AD9", "#D95F5F", "#6AD98F", "#D9C24F", "#7C948A",
];

let monthlySpendingData = null;

function monthDateRange(monthsAgo) {
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const start = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
  const end =
    monthsAgo === 0
      ? now // "this month, so far" stops today
      : new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0); // last day of that month

  // Format using local date parts, not toISOString (which converts to UTC
  // and can shift the calendar day depending on the user's timezone).
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  return { start_date: fmt(start), end_date: fmt(end) };
}

async function loadSpendingForMonth() {
  const monthsAgo = parseInt(spendingMonthSelectEl.value, 10);
  const { start_date, end_date } = monthDateRange(monthsAgo);

  spendingLegendEl.innerHTML = `<div class="empty-state">Loading…</div>`;
  try {
    monthlySpendingData = await callFunction("get-transactions", { start_date, end_date });
  } catch (err) {
    monthlySpendingData = null;
    console.warn("Couldn't load monthly spending:", err.message);
  }
  renderSpendingBreakdown();
  syncFlipHeight();
}

spendingMonthSelectEl.addEventListener("change", (e) => {
  e.stopPropagation();
  loadSpendingForMonth();
});

function renderSpendingBreakdown() {
  const ctx = spendingPieCanvasEl.getContext("2d");
  const width = spendingPieCanvasEl.width;
  const height = spendingPieCanvasEl.height;
  ctx.clearRect(0, 0, width, height);

  const breakdown = monthlySpendingData?.category_breakdown_30d ?? [];
  if (breakdown.length === 0) {
    ctx.font = "13px Manrope, sans-serif";
    ctx.fillStyle = "#7C948A";
    ctx.textAlign = "center";
    ctx.fillText("No spending data for this month.", width / 2, height / 2);
    spendingLegendEl.innerHTML = "";
    return;
  }

  const total = breakdown.reduce((sum, b) => sum + b.total, 0);
  const cx = width / 2;
  const cy = height / 2;
  const radius = 70;
  let startAngle = -Math.PI / 2;

  breakdown.forEach((b, i) => {
    const sliceAngle = (b.total / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
    ctx.fill();
    startAngle += sliceAngle;
  });

  spendingLegendEl.innerHTML = breakdown
    .map((b, i) => {
      const label = b.category.replaceAll("_", " ").toLowerCase();
      const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
      return `
        <div class="spending-legend-row">
          <span class="spending-legend-swatch" style="background:${color}"></span>
          <span>${label}</span>
          <span class="mono">${formatMoney(b.total)}</span>
        </div>`;
    })
    .join("");
}

// ---------------------------------------------------------------
// Net worth trend graph — interactive canvas sparkline, last 90 days
// ---------------------------------------------------------------

let trendPoints = []; // cached pixel positions for hit-testing on hover/touch

function resizeTrendCanvas() {
  const canvas = trendCanvasEl;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const cssWidth = rect.width || canvas.parentElement.clientWidth;
  const cssHeight = 120;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: cssWidth, height: cssHeight };
}

function renderTrend(history) {
  const canvas = trendCanvasEl;
  const { width, height } = resizeTrendCanvas();
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  trendPoints = [];

  if (!history || history.length < 2) {
    ctx.font = "13px IBM Plex Mono, monospace";
    ctx.fillStyle = "#7C948A";
    ctx.textBaseline = "middle";
    const msg = history && history.length === 1
      ? "Building your trend — check back after a few days."
      : "Not enough history yet.";
    ctx.fillText(msg, 10, height / 2);
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
  const canvasX = clientX - rect.left;
  const point = nearestTrendPoint(canvasX);
  if (!point) return;

  const date = new Date(point.created_at);
  const dateLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  trendTooltipEl.textContent = `${dateLabel} · ${formatMoney(point.net_worth)}`;
  trendTooltipEl.style.left = `${point.x}px`;
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
// Net worth forecast — extra savings (flat) + extra investing
// (compounds at a 7%/yr estimate), projected 10 years out
// ---------------------------------------------------------------

const FORECAST_YEARS = 10;
const FORECAST_ANNUAL_RETURN = 0.07;

function renderGoal(data) {
  const savedSavings = localStorage.getItem("ledger_extra_savings");
  const savedInvesting = localStorage.getItem("ledger_extra_investing");
  const savedGoal = localStorage.getItem("ledger_goal_net_worth");
  if (savedSavings) extraSavingsEl.value = savedSavings;
  if (savedInvesting) extraInvestingEl.value = savedInvesting;
  if (savedGoal) goalNetWorthEl.value = savedGoal;
  if (data) forecastCurrentNetWorthEl.textContent = formatMoney(data.net_worth);
  updateForecast(data);
}

function updateForecast(data) {
  if (!data) {
    goalResultEl.textContent = "";
    return;
  }

  const history = data.history ?? [];
  const extraSavings = parseFloat(extraSavingsEl.value) || 0;
  const extraInvesting = parseFloat(extraInvestingEl.value) || 0;
  const goalNetWorth = parseFloat(goalNetWorthEl.value) || 0;

  if (history.length < 2) {
    goalResultEl.textContent = "Need a bit more history to project a timeline.";
    renderSpendingGraph();
    return;
  }

  const first = history[0];
  const last = history[history.length - 1];
  const daysElapsed = (new Date(last.created_at) - new Date(first.created_at)) / (1000 * 60 * 60 * 24);
  const baseGrowthPerDay = daysElapsed > 0 ? (last.net_worth - first.net_worth) / daysElapsed : 0;

  const months = FORECAST_YEARS * 12;
  const monthlyRate = FORECAST_ANNUAL_RETURN / 12;

  const baselineFinal = last.net_worth + baseGrowthPerDay * 365 * FORECAST_YEARS;

  const flatSavingsTotal = extraSavings * months;
  const investingFV =
    extraInvesting > 0 ? extraInvesting * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) : 0;
  const adjustedFinal = baselineFinal + flatSavingsTotal + investingFV;

  const hasExtra = extraSavings > 0 || extraInvesting > 0;
  const projectedNetWorth = hasExtra ? adjustedFinal : baselineFinal;

  let goalLine = "";
  if (goalNetWorth > 0) {
    if (projectedNetWorth >= goalNetWorth) {
      goalLine = `<p>At this pace, you're on track to pass your ${formatMoney(goalNetWorth)} goal within ${FORECAST_YEARS} years.</p>`;
    } else {
      const gap = goalNetWorth - projectedNetWorth;
      goalLine = `<p>At this pace, you're projected to be about ${formatMoney(gap)} short of your ${formatMoney(goalNetWorth)} goal in ${FORECAST_YEARS} years.</p>`;
    }
  }

  let planPhrase = "";
  if (extraSavings > 0 && extraInvesting > 0) {
    planPhrase = `save ${formatMoney(extraSavings)}/mo and invest ${formatMoney(extraInvesting)}/mo`;
  } else if (extraSavings > 0) {
    planPhrase = `save ${formatMoney(extraSavings)}/mo`;
  } else if (extraInvesting > 0) {
    planPhrase = `invest ${formatMoney(extraInvesting)}/mo`;
  }

  goalResultEl.innerHTML = `
    <p>Right now your net worth is ${formatMoney(last.net_worth)}.</p>
    ${
      hasExtra
        ? `<p>If you ${planPhrase}, you'll reach about ${formatMoney(adjustedFinal)} in ${FORECAST_YEARS} years.</p>`
        : `<p>Based on your recent trend alone, you're on pace for about ${formatMoney(baselineFinal)} in ${FORECAST_YEARS} years.</p>`
    }
    ${goalLine}
    <p class="beta-disclaimer">Forecast is in beta, a planning estimate using a 7%/yr market-average assumption for the investing portion, not a guarantee.</p>
  `;

  renderTrajectoryGraph(data, baseGrowthPerDay, extraSavings, extraInvesting);
  renderSpendingGraph();
}

extraSavingsEl.addEventListener("input", () => {
  localStorage.setItem("ledger_extra_savings", extraSavingsEl.value);
  updateForecast(latestBalances);
});

extraInvestingEl.addEventListener("input", () => {
  localStorage.setItem("ledger_extra_investing", extraInvestingEl.value);
  updateForecast(latestBalances);
});

goalNetWorthEl.addEventListener("input", () => {
  localStorage.setItem("ledger_goal_net_worth", goalNetWorthEl.value);
  updateForecast(latestBalances);
});

// ---------------------------------------------------------------
// Net worth trajectory graph — historical line + two projected
// curves (current pace vs. with extra savings/investing)
// ---------------------------------------------------------------

function renderTrajectoryGraph(data, baseGrowthPerDay, extraSavings, extraInvesting) {
  const canvas = forecastTrajectoryCanvasEl;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.parentElement.clientWidth;
  const height = 150;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const history = data.history ?? [];
  if (history.length < 2) {
    ctx.font = "13px Manrope, sans-serif";
    ctx.fillStyle = "#7C948A";
    ctx.textBaseline = "middle";
    ctx.fillText("Need a bit more history to project this.", 10, height / 2);
    return;
  }

  const months = FORECAST_YEARS * 12;
  const monthlyRate = FORECAST_ANNUAL_RETURN / 12;
  const monthlyBaseGrowth = baseGrowthPerDay * 30.44;
  const lastPoint = history[history.length - 1];

  // Build monthly projected points for both curves.
  const baselineSeries = [];
  const adjustedSeries = [];
  let investingBalance = 0;
  for (let m = 0; m <= months; m++) {
    const baseline = lastPoint.net_worth + monthlyBaseGrowth * m;
    investingBalance = m === 0 ? 0 : investingBalance * (1 + monthlyRate) + extraInvesting;
    const adjusted = baseline + extraSavings * m + investingBalance;
    baselineSeries.push(baseline);
    adjustedSeries.push(adjusted);
  }

  const hasExtra = extraSavings > 0 || extraInvesting > 0;
  const allValues = [...history.map((h) => h.net_worth), ...baselineSeries, ...(hasExtra ? adjustedSeries : [])];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  const padding = 10;
  const totalUnits = history.length - 1 + months;

  const xForHistory = (i) => padding + (i / totalUnits) * (width - padding * 2);
  const xForMonth = (m) => padding + ((history.length - 1 + m) / totalUnits) * (width - padding * 2);
  const yFor = (v) => height - padding - ((v - min) / range) * (height - padding * 2);

  // Historical line (solid, real data)
  ctx.beginPath();
  ctx.strokeStyle = "#00D9A3";
  ctx.lineWidth = 2;
  history.forEach((point, i) => {
    const x = xForHistory(i);
    const y = yFor(point.net_worth);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Baseline projection (dashed, current pace)
  ctx.beginPath();
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "#7C948A";
  ctx.lineWidth = 2;
  baselineSeries.forEach((v, m) => {
    const x = xForMonth(m);
    const y = yFor(v);
    if (m === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // Adjusted projection (solid, with extra savings/investing)
  if (hasExtra) {
    ctx.beginPath();
    ctx.strokeStyle = "#D9A24F";
    ctx.lineWidth = 2;
    adjustedSeries.forEach((v, m) => {
      const x = xForMonth(m);
      const y = yFor(v);
      if (m === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

// ---------------------------------------------------------------
// Current spending graph — simple bar chart by category, last 30 days
// ---------------------------------------------------------------

function renderSpendingGraph() {
  const canvas = forecastSpendingCanvasEl;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const breakdown = (latestTransactions?.category_breakdown_30d ?? []).slice(0, 6);
  if (breakdown.length === 0) {
    ctx.font = "13px Manrope, sans-serif";
    ctx.fillStyle = "#7C948A";
    ctx.fillText("No spending data yet.", 10, height / 2);
    return;
  }

  const max = Math.max(...breakdown.map((b) => b.total));
  const padding = 10;
  const barWidth = (width - padding * 2) / breakdown.length - 10;

  breakdown.forEach((b, i) => {
    const barHeight = (b.total / max) * (height - padding * 2 - 20);
    const x = padding + i * ((width - padding * 2) / breakdown.length) + 5;
    const y = height - padding - barHeight;

    ctx.fillStyle = "#00D9A3";
    ctx.fillRect(x, y, barWidth, barHeight);

    ctx.font = "10px Manrope, sans-serif";
    ctx.fillStyle = "#7C948A";
    ctx.textAlign = "center";
    const label = b.category.replaceAll("_", " ").toLowerCase().slice(0, 10);
    ctx.fillText(label, x + barWidth / 2, height - 2);
  });
}

// ---------------------------------------------------------------
// "Invest instead" comparison — grounded in a real ticker's current price.
//
// Honest scope: we show today's real price and how many shares your amount
// buys, for the chosen ticker and (if checked) SPY. The forward projection
// uses the same flat 7%/yr market-average estimate for both — we don't have
// ticker-specific historical return data, so we're not claiming one would
// have outperformed the other, just showing today's entry point for each.
// ---------------------------------------------------------------

let latestTickerQuote = null;
let latestSpyQuote = null;

async function lookupInvestTicker() {
  const ticker = investTickerEl.value.trim();
  if (!ticker) {
    latestTickerQuote = null;
    investTickerQuoteEl.textContent = "";
    updateInvestResult();
    return;
  }

  investTickerQuoteEl.textContent = "Looking up…";

  try {
    const quote = await callFunction("get-stock-quote", { ticker });
    latestTickerQuote = quote;
    const changeClass = quote.day_change >= 0 ? "positive" : "negative";
    const changeArrow = quote.day_change >= 0 ? "▲" : "▼";

    investTickerQuoteEl.innerHTML = `
      <div class="ticker-price">${quote.ticker} · $${quote.price.toFixed(2)}</div>
      <div class="ticker-change ${changeClass}">${changeArrow} ${Math.abs(quote.day_change).toFixed(2)}% today</div>
    `;
  } catch (err) {
    latestTickerQuote = null;
    investTickerQuoteEl.textContent = `Couldn't look that up: ${err.message}`;
  }

  await maybeLoadSpyQuote();
  updateInvestResult();
}

async function maybeLoadSpyQuote() {
  if (!compareSpyCheckEl.checked) {
    latestSpyQuote = null;
    return;
  }
  try {
    latestSpyQuote = await callFunction("get-stock-quote", { ticker: "SPY" });
  } catch (err) {
    latestSpyQuote = null;
  }
}

investTickerEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lookupInvestTicker();
});
investTickerEl.addEventListener("blur", lookupInvestTicker);

compareSpyCheckEl.addEventListener("change", async () => {
  await maybeLoadSpyQuote();
  updateInvestResult();
});

function projectedValue(amount, years, cadence) {
  const annualReturn = 0.07;
  if (cadence === "once") {
    return { futureValue: amount * Math.pow(1 + annualReturn, years), contributed: amount };
  }
  const periodsPerYear = { monthly: 12, yearly: 1 }[cadence];
  const periodRate = Math.pow(1 + annualReturn, 1 / periodsPerYear) - 1;
  const totalPeriods = years * periodsPerYear;
  const futureValue = amount * ((Math.pow(1 + periodRate, totalPeriods) - 1) / periodRate);
  return { futureValue, contributed: amount * totalPeriods };
}

function updateInvestResult() {
  const amount = parseFloat(investAmountEl.value);
  const years = parseFloat(investYearsEl.value);
  const cadence = investCadenceEl.value;

  if (isNaN(amount) || amount <= 0 || isNaN(years) || years <= 0) {
    investResultEl.textContent = "";
    return;
  }

  const { futureValue, contributed } = projectedValue(amount, years, cadence);
  const cadenceLabel = cadence === "once" ? "one-time" : `/${cadence.replace("ly", "")}`;

  let sharesLine = latestTickerQuote
    ? `<p class="invest-shares-line">${(amount / latestTickerQuote.price).toFixed(2)} shares of ${latestTickerQuote.ticker} at $${latestTickerQuote.price.toFixed(2)} today</p>`
    : "";

  let spyLine = "";
  if (compareSpyCheckEl.checked && latestSpyQuote) {
    spyLine = `<p class="invest-shares-line">vs. ${(amount / latestSpyQuote.price).toFixed(2)} shares of SPY at $${latestSpyQuote.price.toFixed(2)} today</p>`;
  }

  investResultEl.innerHTML = `
    <div class="invest-big-number">${formatMoney(futureValue)}</div>
    <p class="invest-caption">${formatMoney(amount)} ${cadenceLabel} over ${years} year${years == 1 ? "" : "s"}, at a 7%/yr market-average estimate</p>
    ${sharesLine}
    ${spyLine}
    ${compareSpyCheckEl.checked && latestSpyQuote ? '<p class="invest-caption">Same growth estimate applied to both. We don\'t have real historical performance data to show which would actually have done better.</p>' : ""}
  `;
}

investAmountEl.addEventListener("input", updateInvestResult);
investYearsEl.addEventListener("input", updateInvestResult);
investCadenceEl.addEventListener("change", updateInvestResult);

// "I don't have a brokerage account" — hides the calculator, shows guidance.
noBrokerageCheckEl.addEventListener("change", () => {
  const checked = noBrokerageCheckEl.checked;
  noBrokeragePanelEl.classList.toggle("hidden", !checked);
  investInputsWrapEl.classList.toggle("hidden", checked);
});

// ---------------------------------------------------------------
// Forecast button — jumps from the trend graph straight to the Forecast tab
// ---------------------------------------------------------------

forecastBtnEl.addEventListener("click", () => {
  document.querySelector('.topnav-tab[data-tab="forecast"]').click();
});

// ---------------------------------------------------------------
// Asset allocation breakdown
// ---------------------------------------------------------------

function renderAllocation(data) {
  const buckets = {
    Cash: { total: 0, items: [] },
    Investments: { total: 0, items: [] },
    "Real estate": { total: 0, items: [] },
    "Private/alternative": { total: 0, items: [] },
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
    let bucket = "Other";
    if (item.category === "real_estate") bucket = "Real estate";
    else if (item.category === "private_equity" || item.category === "venture" || item.category === "other_illiquid") {
      bucket = "Private/alternative";
    }
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
    showToast(`${label} added`);
    await loadEverything();
  } catch (err) {
    manualAddStatusEl.textContent = `Couldn't add it: ${err.message}`;
  } finally {
    manualSubmitBtnEl.disabled = false;
  }
});

// ---------------------------------------------------------------
// Net worth percentile — sourced benchmarks, Federal Reserve Survey of
// Consumer Finances (2022, most recent published survey as of this build;
// the 2025 survey's results aren't out yet). Uses the person's age from
// Settings — shows nothing if age hasn't been entered, rather than
// guessing which bracket to compare against.
// ---------------------------------------------------------------

const NET_WORTH_MEDIAN_BY_AGE = [
  { maxAge: 34, median: 39000, label: "under 35" },
  { maxAge: 44, median: 135600, label: "35-44" },
  { maxAge: 54, median: 247200, label: "45-54" },
  { maxAge: 64, median: 364500, label: "55-64" },
  { maxAge: 74, median: 409900, label: "65-74" },
  { maxAge: Infinity, median: 335600, label: "75+" },
];

function renderPercentile(data) {
  const age = parseFloat(localStorage.getItem("ledger_settings_age"));
  if (isNaN(age) || age <= 0) {
    percentileLineEl.textContent = "";
    return;
  }

  const bracket = NET_WORTH_MEDIAN_BY_AGE.find((b) => age <= b.maxAge);
  const diff = data.net_worth - bracket.median;
  const diffPct = Math.abs((diff / bracket.median) * 100).toFixed(0);
  const direction = diff >= 0 ? "above" : "below";

  percentileLineEl.textContent = `${diffPct}% ${direction} the median net worth (national average) for ages ${bracket.label} ($${bracket.median.toLocaleString()}, Federal Reserve SCF 2022)`;
}

// ---------------------------------------------------------------
// Emergency fund tracker — runway vs. a standard 6-month benchmark
// ---------------------------------------------------------------

function renderEmergencyFund(data) {
  if (!data || !latestTransactions?.fixed_spend_30d) {
    emergencyFundCaptionEl.textContent = "Needs a bit more transaction history to calculate.";
    emergencyFundBarEl.style.width = "0%";
    return;
  }

  const months = data.liquid_cash / latestTransactions.fixed_spend_30d;
  const targetMonths = 6;
  const pct = clamp((months / targetMonths) * 100, 0, 100);

  emergencyFundBarEl.style.width = `${pct}%`;
  emergencyFundCaptionEl.textContent = `${months.toFixed(1)} of ${targetMonths} months covered (standard emergency-fund target)`;
}

// ---------------------------------------------------------------
// Subscription audit — real recurring-charge detection using a 90-day
// window (long enough for a monthly charge to appear 2+ times), not a
// guess dressed up as a feature.
// ---------------------------------------------------------------

async function loadSubscriptionAudit() {
  subscriptionListEl.innerHTML = `<div class="empty-state">Loading…</div>`;
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = new Date();

    const data = await callFunction("get-transactions", {
      start_date: fmt(ninetyDaysAgo),
      end_date: fmt(today),
    });

    const recurring = data.recurring_candidates ?? [];
    if (recurring.length === 0) {
      subscriptionListEl.innerHTML = `<div class="empty-state">No repeat charges detected in the last 90 days.</div>`;
      return;
    }

    subscriptionListEl.innerHTML = recurring
      .slice(0, 10)
      .map(
        (r) => `
        <div class="subscription-row">
          <span>${r.name}</span>
          <span class="mono">${formatMoney(r.total / r.count)}/charge · ${r.count}x</span>
        </div>`
      )
      .join("");
  } catch (err) {
    subscriptionListEl.innerHTML = `<div class="empty-state">Couldn't load: ${err.message}</div>`;
  }
}

// ---------------------------------------------------------------
// Debt payoff comparison — snowball (smallest balance first) vs.
// avalanche (highest APR first), using real balances from get-balances
// and real APRs/minimums from get-liabilities.
// ---------------------------------------------------------------

async function loadDebtPayoff() {
  debtPayoffListEl.innerHTML = `<div class="empty-state">Loading…</div>`;
  debtPayoffSummaryEl.textContent = "";

  try {
    const liabData = await callFunction("get-liabilities");
    const debts = liabData.debts ?? [];

    if (debts.length === 0) {
      debtPayoffListEl.innerHTML = `<div class="empty-state">No liability detail available (not every institution supports this, or you have no debt connected).</div>`;
      return;
    }

    // Match balances by account_id, not array position — Plaid doesn't
    // guarantee liabilities and balances come back in the same order.
    const accountsById = new Map((latestBalances?.accounts ?? []).map((a) => [a.account_id, a]));

    const enriched = debts.map((d) => ({
      ...d,
      balance: accountsById.get(d.account_id)?.current ?? null,
    }));

    const avalancheOrder = [...enriched].sort((a, b) => (b.apr ?? 0) - (a.apr ?? 0));

    debtPayoffListEl.innerHTML = avalancheOrder
      .map(
        (d, i) => `
        <div class="debt-row">
          <div class="debt-row-meta">
            <span>${i + 1}. ${d.name}</span>
            <span class="debt-row-sub">${d.apr !== null ? d.apr.toFixed(2) + "% APR" : "APR not available"}${d.balance !== null ? " · " + formatMoney(d.balance) : ""}</span>
          </div>
          <span class="mono">${d.minimum_payment !== null ? formatMoney(d.minimum_payment) + "/mo min" : ""}</span>
        </div>`
      )
      .join("");

    debtPayoffSummaryEl.textContent = "Sorted highest APR first (avalanche method, usually saves the most in interest). Pay minimums on everything else, put extra toward #1.";
  } catch (err) {
    debtPayoffListEl.innerHTML = `<div class="empty-state">Couldn't load: ${err.message}</div>`;
  }
}

// ---------------------------------------------------------------
// Purchase watchlist — saved locally on this device
// ---------------------------------------------------------------

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem("ledger_watchlist") ?? "[]");
  } catch {
    return [];
  }
}

function saveWatchlist(list) {
  localStorage.setItem("ledger_watchlist", JSON.stringify(list));
}

function renderWatchlist() {
  const list = getWatchlist();
  if (list.length === 0) {
    watchlistListEl.innerHTML = `<div class="empty-state">Nothing on your watchlist yet.</div>`;
    return;
  }

  watchlistListEl.innerHTML = list
    .map((item, i) => {
      const pctOfLiquid = latestBalances ? ((item.amount / latestBalances.liquid_cash) * 100).toFixed(0) : null;
      return `
        <div class="watchlist-row">
          <div class="watchlist-row-meta">
            <span>${item.label}</span>
            <span class="debt-row-sub">${formatMoney(item.amount)}${pctOfLiquid !== null ? " · " + pctOfLiquid + "% of liquid cash" : ""}</span>
          </div>
          <button class="watchlist-remove-btn" data-idx="${i}">Remove</button>
        </div>`;
    })
    .join("");

  watchlistListEl.querySelectorAll(".watchlist-remove-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const list = getWatchlist();
      list.splice(parseInt(btn.dataset.idx, 10), 1);
      saveWatchlist(list);
      renderWatchlist();
    });
  });
}

addWatchlistBtnEl.addEventListener("click", () => {
  addWatchlistFormEl.classList.toggle("hidden");
});

watchlistSubmitBtnEl.addEventListener("click", () => {
  const label = watchlistLabelEl.value.trim();
  const amount = parseFloat(watchlistAmountEl.value);
  if (!label || isNaN(amount) || amount <= 0) return;

  const list = getWatchlist();
  list.push({ label, amount });
  saveWatchlist(list);
  watchlistLabelEl.value = "";
  watchlistAmountEl.value = "";
  addWatchlistFormEl.classList.add("hidden");
  showToast(`${label} added to watchlist`);
  renderWatchlist();
});

renderWatchlist();

// ---------------------------------------------------------------
// Complex investments question (Getting Started) — gates the
// advanced manual-item categories so beginners aren't shown them
// ---------------------------------------------------------------

function applyComplexInvestState() {
  const has = localStorage.getItem("ledger_has_complex_investments") === "true";
  document.querySelectorAll(".advanced-category").forEach((opt) => {
    opt.hidden = !has;
  });
  document.getElementById("complex-invest-yes")?.classList.toggle("active", has);
  document.getElementById("complex-invest-no")?.classList.toggle(
    "active",
    localStorage.getItem("ledger_has_complex_investments") === "false"
  );
}

document.getElementById("complex-invest-yes")?.addEventListener("click", () => {
  localStorage.setItem("ledger_has_complex_investments", "true");
  applyComplexInvestState();
  showToast("Advanced categories added to Manage");
});

document.getElementById("complex-invest-no")?.addEventListener("click", () => {
  localStorage.setItem("ledger_has_complex_investments", "false");
  applyComplexInvestState();
});

document.getElementById("complex-invest-unsure")?.addEventListener("click", () => {
  localStorage.setItem("ledger_has_complex_investments", "false");
  applyComplexInvestState();
  showToast("Got it, you can change this anytime");
});

applyComplexInvestState();

// ---------------------------------------------------------------
// Insurance/estate checklist — saved locally, educational only
// ---------------------------------------------------------------

document.querySelectorAll("#insurance-checklist input[type='checkbox']").forEach((box) => {
  const key = `ledger_checklist_${box.dataset.check}`;
  box.checked = localStorage.getItem(key) === "true";
  box.addEventListener("change", () => {
    localStorage.setItem(key, box.checked);
  });
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

// ---------------------------------------------------------------
// Book a call — placeholder Calendly link; falls back to email with the
// chosen topic until the real Calendly link is wired in.
// ---------------------------------------------------------------

bookCallBtnEl.addEventListener("click", (e) => {
  if (bookCallBtnEl.getAttribute("href") === "#") {
    e.preventDefault();
    const topic = bookCallTopicEl.value || "General";
    const subject = encodeURIComponent(`Ledger call: ${topic}`);
    window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}`;
  }
});

// ---------------------------------------------------------------
// FAQ — submit a question not covered above
// ---------------------------------------------------------------

faqQuestionSubmitEl.addEventListener("click", () => {
  const question = faqQuestionInputEl.value.trim();
  if (!question) return;
  const subject = encodeURIComponent("Ledger question");
  const body = encodeURIComponent(question);
  window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
  faqQuestionInputEl.value = "";
  faqQuestionStatusEl.textContent = "Your question has been submitted. You'll hear back within 1-2 business days.";
});

amaQuestionSubmitEl.addEventListener("click", () => {
  const question = amaQuestionInputEl.value.trim();
  if (!question) return;
  const subject = encodeURIComponent("Ledger question");
  const body = encodeURIComponent(question);
  window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
  amaQuestionInputEl.value = "";
  amaQuestionStatusEl.textContent = "Your question has been submitted. You'll hear back within 1-2 business days.";
});

// ---------------------------------------------------------------
// Settings — personal info saved locally, prefills the book-a-call flow
// ---------------------------------------------------------------

settingsFirstNameEl.value = localStorage.getItem("ledger_settings_first_name") ?? "";
settingsLastNameEl.value = localStorage.getItem("ledger_settings_last_name") ?? "";
settingsEmailEl.value = localStorage.getItem("ledger_settings_email") ?? "";
settingsPhoneEl.value = localStorage.getItem("ledger_settings_phone") ?? "";
settingsAgeEl.value = localStorage.getItem("ledger_settings_age") ?? "";
settingsBirthdayEl.value = localStorage.getItem("ledger_settings_birthday") ?? "";

settingsSaveBtnEl.addEventListener("click", () => {
  localStorage.setItem("ledger_settings_first_name", settingsFirstNameEl.value.trim());
  localStorage.setItem("ledger_settings_last_name", settingsLastNameEl.value.trim());
  localStorage.setItem("ledger_settings_email", settingsEmailEl.value.trim());
  localStorage.setItem("ledger_settings_phone", settingsPhoneEl.value.trim());
  localStorage.setItem("ledger_settings_age", settingsAgeEl.value.trim());
  localStorage.setItem("ledger_settings_birthday", settingsBirthdayEl.value.trim());
  settingsSaveStatusEl.textContent = "Saved.";
  showToast("Settings saved");
  setTimeout(() => (settingsSaveStatusEl.textContent = ""), 2000);
});

// ---------------------------------------------------------------
// Theme toggle — light/dark, saved locally
// ---------------------------------------------------------------

const savedTheme = localStorage.getItem("ledger_theme") ?? "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
document.querySelectorAll(".theme-toggle-btn").forEach((btn) => {
  btn.classList.toggle("active", btn.dataset.theme === savedTheme);
  btn.addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", btn.dataset.theme);
    localStorage.setItem("ledger_theme", btn.dataset.theme);
    document.querySelectorAll(".theme-toggle-btn").forEach((b) => b.classList.toggle("active", b === btn));
  });
});

// ---------------------------------------------------------------
// Connected banks list + disconnect
// ---------------------------------------------------------------

function renderSettingsAccounts(data) {
  const items = new Map();
  for (const acct of data.accounts ?? []) {
    if (!items.has(acct.item_id)) {
      items.set(acct.item_id, acct.institution_name ?? "Connected bank");
    }
  }

  if (items.size === 0) {
    settingsAccountsListEl.innerHTML = `<div class="empty-state">No banks connected yet.</div>`;
    return;
  }

  settingsAccountsListEl.innerHTML = Array.from(items.entries())
    .map(
      ([itemId, name]) => `
      <div class="settings-account-row">
        <span>${name}</span>
        <button class="disconnect-btn" data-item-id="${itemId}">Disconnect</button>
      </div>`
    )
    .join("");

  settingsAccountsListEl.querySelectorAll(".disconnect-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Disconnect this bank? You can reconnect it later.")) return;
      btn.disabled = true;
      btn.textContent = "Disconnecting…";
      try {
        await callFunction("disconnect-item", { item_id: btn.dataset.itemId });
        await loadEverything();
      } catch (err) {
        btn.textContent = "Failed";
        console.error(err);
      }
    });
  });
}

// ---------------------------------------------------------------
// Invite friends — native share sheet, falls back to clipboard copy
// ---------------------------------------------------------------

inviteFriendsBtnEl.addEventListener("click", async () => {
  const shareData = {
    title: "Ledger",
    text: "Check out Ledger, a net-worth based finance app.",
    url: window.location.origin + window.location.pathname,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (err) {
      // User cancelled the share sheet, nothing to do.
    }
  } else {
    try {
      await navigator.clipboard.writeText(shareData.url);
      inviteStatusEl.textContent = "Link copied to clipboard.";
      setTimeout(() => (inviteStatusEl.textContent = ""), 2000);
    } catch (err) {
      inviteStatusEl.textContent = shareData.url;
    }
  }
});

const signOutBtnEl = document.getElementById("sign-out-btn");

signOutBtnEl.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
});

// ---------------------------------------------------------------
// Auth — real sign in / sign up, gates the whole app
// ---------------------------------------------------------------

authToggleBtnEl.addEventListener("click", () => {
  authMode = authMode === "signin" ? "signup" : "signin";
  authTitleEl.textContent = authMode === "signin" ? "Welcome back" : "Create your account";
  authSubmitBtnEl.textContent = authMode === "signin" ? "Sign in" : "Sign up";
  authToggleBtnEl.textContent =
    authMode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in";
  authStatusEl.textContent = "";
  authCardEl.classList.toggle("signup-mode", authMode === "signup");
  // Clear whatever the browser autofilled and swap the autocomplete hint so
  // it stops offering saved sign-in credentials on the signup form.
  authEmailEl.value = "";
  authPasswordEl.value = "";
  authPasswordEl.autocomplete = authMode === "signup" ? "new-password" : "current-password";
});

authFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  authSubmitBtnEl.disabled = true;
  authStatusEl.textContent = authMode === "signin" ? "Signing in…" : "Creating your account…";

  const email = authEmailEl.value.trim();
  const password = authPasswordEl.value;
  const wasSigningUp = authMode === "signup";

  // Set this BEFORE the async call, not after — onAuthStateChange can fire
  // and call showApp() while signUp() is still resolving, so setting the
  // flag afterward was a race condition that made Getting Started routing
  // land inconsistently.
  if (wasSigningUp) justSignedUp = true;

  const { error } =
    authMode === "signin"
      ? await supabaseClient.auth.signInWithPassword({ email, password })
      : await supabaseClient.auth.signUp({ email, password });

  authSubmitBtnEl.disabled = false;

  if (error) {
    if (wasSigningUp) justSignedUp = false;
    authStatusEl.textContent = error.message;
    return;
  }

  authStatusEl.textContent = "";
  // onAuthStateChange below handles showing the app once the session lands.
});

function showAuthScreen() {
  authScreenEl.classList.remove("hidden");
  appRootEl.classList.add("hidden");
  tabButtons.forEach((b) => b.classList.toggle("active", b.dataset.tab === "dashboard"));
  tabPanels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== "dashboard"));
}

function showApp() {
  authScreenEl.classList.add("hidden");
  appRootEl.classList.remove("hidden");

  // The OAuth-resume check only matters once per real page load, since it's
  // tied to a URL parameter Plaid adds on redirect back from the bank.
  if (!oauthResumeChecked) {
    oauthResumeChecked = true;
    if (window.location.href.includes("oauth_state_id=")) {
      maybeResumePlaidOAuth();
    }
  }

  // Everything below runs on EVERY sign-in, not just the first one on this
  // page load — otherwise signing out and into a second account in the same
  // browser session (e.g. someone else trying the app on your device)
  // silently skips both the new-signup routing and the data reload.
  if (justSignedUp) {
    document.querySelector('.topnav-tab[data-tab="getting-started"]').click();
    justSignedUp = false;
  } else if (!window.location.href.includes("oauth_state_id=")) {
    // Every return visit lands on Dashboard, consistently, except a fresh
    // signup (goes to Getting Started above) or a mid-flight OAuth resume
    // (handled separately once the bank connection actually finishes).
    document.querySelector('.topnav-tab[data-tab="dashboard"]').click();
  }

  loadEverything();
}

supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp();
  } else {
    showAuthScreen();
  }
});

// Initial check on page load, in case a session is already stored from a
// previous visit.
supabaseClient.auth.getSession().then(({ data: { session } }) => {
  if (session) showApp();
  else showAuthScreen();
});
