let supabaseCreateClient = null;

const LOCAL_CONFIG_KEY = "jp-research-cockpit-config-v1";
const LOCAL_UI_KEY = "jp-research-cockpit-ui-v1";
const DEFAULT_CONFIG = {
  supabaseUrl: "https://kucwkuskoqwdtvmewtik.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Y3drdXNrb3F3ZHR2bWV3dGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTA1MzcsImV4cCI6MjA5MTUyNjUzN30.RReLIipWvYwO4qx3UBUbIFMD3E7EiuRfvdllUURCGp4",
  edinetApiKey: "",
};
const DEFAULT_SCORECARD = { quality: 3, momentum: 3, valuation: 3, management: 3 };
const DEFAULT_VALUATION = { bull: "", base: "", bear: "", memo: "", price_source_note: "" };
const FORECAST_TEMPLATE = {
  id: "",
  fiscal_year: "",
  fiscal_year_end_month: "3",
  quarter: "1",
  revenue_mn: "",
  operating_income_mn: "",
  net_income_mn: "",
  eps: "",
  note: "",
};

const state = {
  config: loadConfig(),
  ui: loadUiState(),
  supabase: null,
  authSubscription: null,
  session: null,
  companies: [],
  selectedCompanyId: null,
  importResults: [],
  importLoading: false,
  companySearch: "",
  statusFilter: "all",
  hoverTooltip: null,
};

const el = {
  sidebar: document.querySelector("#sidebar"),
  sidebarScrim: document.querySelector("#sidebarScrim"),
  menuToggleButton: document.querySelector("#menuToggleButton"),
  closeSidebarButton: document.querySelector("#closeSidebarButton"),
  settingsButton: document.querySelector("#settingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  closeSettingsDialogButton: document.querySelector("#closeSettingsDialogButton"),
  supabaseUrlInput: document.querySelector("#supabaseUrlInput"),
  supabaseAnonKeyInput: document.querySelector("#supabaseAnonKeyInput"),
  edinetApiKeyInput: document.querySelector("#edinetApiKeyInput"),
  saveSupabaseConfigButton: document.querySelector("#saveSupabaseConfigButton"),
  supabaseConfigStatus: document.querySelector("#supabaseConfigStatus"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  signOutButton: document.querySelector("#signOutButton"),
  authStatus: document.querySelector("#authStatus"),
  importSearchInput: document.querySelector("#importSearchInput"),
  importSearchButton: document.querySelector("#importSearchButton"),
  importResults: document.querySelector("#importResults"),
  companySearchInput: document.querySelector("#companySearchInput"),
  statusFilterSelect: document.querySelector("#statusFilterSelect"),
  companyList: document.querySelector("#companyList"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  workspaceSubtitle: document.querySelector("#workspaceSubtitle"),
  dashboard: document.querySelector("#dashboard"),
  workspaceContent: document.querySelector("#workspaceContent"),
  tabBar: document.querySelector("#tabBar"),
  exportButton: document.querySelector("#exportButton"),
  syncCompanyButton: document.querySelector("#syncCompanyButton"),
  newCompanyButton: document.querySelector("#newCompanyButton"),
  companyDialog: document.querySelector("#companyDialog"),
  companyDialogTitle: document.querySelector("#companyDialogTitle"),
  closeCompanyDialogButton: document.querySelector("#closeCompanyDialogButton"),
  companyForm: document.querySelector("#companyForm"),
};

boot().catch(handleFatalError);

async function boot() {
  applyConfigToInputs();
  applyUiInputs();
  wireEvents();
  await initSupabase();
  render();
  window.__researchAppBooted = true;
}

function wireEvents() {
  el.menuToggleButton?.addEventListener("click", toggleSidebar);
  el.closeSidebarButton?.addEventListener("click", closeSidebar);
  el.sidebarScrim?.addEventListener("click", closeSidebar);
  el.settingsButton?.addEventListener("click", openSettingsDialog);
  el.closeSettingsDialogButton?.addEventListener("click", () => closeDialog(el.settingsDialog));
  el.saveSupabaseConfigButton?.addEventListener("click", async () => {
    syncConfigFromInputs();
    await initSupabase();
    render();
  });
  el.signOutButton?.addEventListener("click", signOut);
  el.importSearchButton?.addEventListener("click", searchImportCandidates);
  el.importSearchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    searchImportCandidates();
  });
  el.companySearchInput?.addEventListener("input", (event) => {
    state.companySearch = String(event.target.value || "").trim().toLowerCase();
    renderCompanyList();
  });
  el.statusFilterSelect?.addEventListener("change", (event) => {
    state.statusFilter = String(event.target.value || "all");
    renderCompanyList();
  });
  el.tabBar?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    state.ui.activeTab = button.dataset.tab || "overview";
    saveUiState();
    renderTabs();
    renderWorkspace();
  });
  el.exportButton?.addEventListener("click", exportCompanies);
  el.syncCompanyButton?.addEventListener("click", syncSelectedCompany);
  el.newCompanyButton?.addEventListener("click", () => openCompanyDialog());
  el.closeCompanyDialogButton?.addEventListener("click", () => closeDialog(el.companyDialog));
  el.companyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCompanyFromDialog();
  });

  document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const type = action.dataset.action || "";
    if (type === "select-company") {
      state.selectedCompanyId = action.dataset.id || null;
      closeSidebar();
      render();
      return;
    }
    if (type === "import-company") {
      await importCompany(action.dataset.edinetCode || "");
      return;
    }
    if (type === "edit-company") {
      openCompanyDialog(action.dataset.id || "");
      return;
    }
    if (type === "delete-company") {
      await deleteSelectedCompany();
      return;
    }
    if (type === "select-quarter") {
      const company = getSelectedCompany();
      if (!company) return;
      state.ui.selectedQuarterKeys[company.id] = action.dataset.quarterKey || "";
      saveUiState();
      renderWorkspace();
      return;
    }
    if (type === "set-earnings-view") {
      state.ui.earningsView = action.dataset.view || "quarterly";
      saveUiState();
      renderWorkspace();
      return;
    }
    if (type === "delete-forecast") {
      await deleteForecast(action.dataset.id || "");
      return;
    }
    if (type === "delete-note") {
      await removeItemFromSelected("research_notes", action.dataset.id || "");
      return;
    }
    if (type === "delete-question") {
      await removeItemFromSelected("open_questions", action.dataset.id || "");
      return;
    }
    if (type === "toggle-question") {
      await toggleQuestion(action.dataset.id || "");
      return;
    }
    if (type === "open-settings") {
      openSettingsDialog();
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const formType = form.dataset.form || "";
    if (!formType) return;
    event.preventDefault();
    if (formType === "overview") await saveOverviewForm(form);
    if (formType === "forecast") await saveForecastForm(form);
    if (formType === "valuation") await saveValuationForm(form);
    if (formType === "note") await saveNoteForm(form);
    if (formType === "question") await saveQuestionForm(form);
  });

  document.addEventListener("pointermove", (event) => {
    const point = event.target.closest("[data-point-tooltip]");
    if (!point) {
      hideHoverTooltip();
      return;
    }
    showHoverTooltip(point.dataset.pointTooltip || "", event.clientX, event.clientY);
  });
  document.addEventListener("pointerdown", hideHoverTooltip);
  document.addEventListener("scroll", hideHoverTooltip, true);
}

async function initSupabase() {
  const { supabaseUrl, supabaseAnonKey } = state.config;
  unsubscribeAuth();

  if (!supabaseUrl || !supabaseAnonKey) {
    state.supabase = null;
    state.session = null;
    state.companies = [];
    setConfigStatus("Supabase URL と anon key を入力してください。", true);
    setAuthStatus("設定保存後にログインしてください。", false);
    return;
  }

  try {
    const createClient = await ensureSupabaseClientFactory();
    state.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    const {
      data: { session },
      error,
    } = await state.supabase.auth.getSession();
    if (error) throw error;

    state.authSubscription = state.supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      state.session = nextSession;
      if (nextSession) {
        await loadCompanies();
        setAuthStatus(`ログイン中: ${nextSession.user.email}`, false);
      } else {
        state.companies = [];
        state.selectedCompanyId = null;
        setAuthStatus("ログインしてください。", false);
      }
      render();
    });

    state.session = session;
    setConfigStatus("Supabase へ接続できました。", false);
    if (session) {
      await loadCompanies();
      setAuthStatus(`ログイン中: ${session.user.email}`, false);
    } else {
      state.companies = [];
      state.selectedCompanyId = null;
      setAuthStatus("ログインしてください。", false);
    }
  } catch (error) {
    state.supabase = null;
    state.session = null;
    state.companies = [];
    setConfigStatus(getErrorMessage(error), true);
    setAuthStatus("接続設定を確認してください。", true);
  }
}

async function signOut() {
  if (!state.supabase) {
    openSettingsDialog();
    return;
  }
  const { error } = await state.supabase.auth.signOut();
  if (error) {
    setAuthStatus(getErrorMessage(error), true);
    return;
  }
  state.session = null;
  state.companies = [];
  state.selectedCompanyId = null;
  setAuthStatus("ログアウトしました。", false);
  render();
}

async function loadCompanies() {
  if (!state.supabase || !state.session) return;
  const { data, error } = await state.supabase
    .from("research_companies")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  state.companies = (data || []).map(normalizeCompanyRow);
  if (!state.selectedCompanyId || !state.companies.find((item) => item.id === state.selectedCompanyId)) {
    state.selectedCompanyId = state.companies[0]?.id || null;
  }
}

function render() {
  applyConfigToInputs();
  renderTabs();
  renderImportResults();
  renderCompanyList();
  renderDashboard();
  renderWorkspace();
}

function renderTabs() {
  el.tabBar?.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.ui.activeTab);
  });
}

function renderImportResults() {
  if (!el.importResults) return;
  if (state.importLoading) {
    el.importResults.innerHTML = `<div class="result-card"><strong>検索中</strong><div class="dim">EDINET DB から候補を探しています。</div></div>`;
    return;
  }
  if (!state.importResults.length) {
    el.importResults.innerHTML = "";
    return;
  }
  el.importResults.innerHTML = state.importResults.map((item) => `
    <article class="result-card">
      <strong>${escapeHtml(item.name || "")}</strong>
      <div class="company-meta mono">${escapeHtml(item.sec_code || "")}${item.sec_code ? " / " : ""}${escapeHtml(item.edinet_code || "")}</div>
      <div class="company-meta">${escapeHtml(item.industry || "")}</div>
      <div class="button-row"><button class="tiny" data-action="import-company" data-edinet-code="${escapeHtml(item.edinet_code || "")}" type="button">取り込む</button></div>
    </article>
  `).join("");
}

function renderCompanyList() {
  if (!el.companyList) return;
  const filtered = state.companies.filter((company) => {
    const haystack = `${company.sec_code} ${company.edinet_code} ${company.name} ${company.industry}`.toLowerCase();
    const queryPass = !state.companySearch || haystack.includes(state.companySearch);
    const statusPass = state.statusFilter === "all" || company.status === state.statusFilter;
    return queryPass && statusPass;
  });
  el.companyList.innerHTML = filtered.length ? filtered.map((company) => `
    <article class="company-item ${company.id === state.selectedCompanyId ? "active" : ""}" data-action="select-company" data-id="${company.id}">
      <strong>${escapeHtml(company.sec_code || company.edinet_code || "-")} · ${escapeHtml(company.name)}</strong>
      <div class="company-meta">${escapeHtml(company.industry || "業種未設定")}</div>
      <div class="company-meta">次回決算: ${escapeHtml(formatDate(company.next_earnings))}</div>
      <div class="status-pill status-${escapeHtml(company.status)}">${escapeHtml(company.status)}</div>
    </article>
  `).join("") : `<div class="empty">条件に合う企業がありません。</div>`;
}

function renderDashboard() {
  if (!el.dashboard) return;
  if (!state.session) {
    el.dashboard.innerHTML = `<article class="metric-card"><p class="eyebrow">Status</p><div class="metric-value">0</div><div class="dim">ログイン前</div></article>`;
    return;
  }
  const openQuestions = state.companies.flatMap((item) => item.open_questions.filter((question) => question.status !== "解決"));
  const focusCount = state.companies.filter((item) => item.status === "重点").length;
  const upcoming = state.companies.filter((item) => item.next_earnings).sort((a, b) => String(a.next_earnings).localeCompare(String(b.next_earnings)))[0];
  const lastSync = state.companies.map((item) => item.external_snapshot?.synced_at).filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)))[0];
  el.dashboard.innerHTML = `
    <article class="metric-card"><p class="eyebrow">Coverage</p><div class="metric-value">${state.companies.length}</div><div class="dim">登録企業数</div></article>
    <article class="metric-card"><p class="eyebrow">Focus</p><div class="metric-value">${focusCount}</div><div class="dim">重点先</div></article>
    <article class="metric-card"><p class="eyebrow">Open Questions</p><div class="metric-value">${openQuestions.length}</div><div class="dim">未解決論点</div></article>
    <article class="metric-card"><p class="eyebrow">Last Sync</p><div class="metric-value">${escapeHtml(lastSync ? formatDateTime(lastSync) : "-")}</div><div class="dim">自動取得更新時刻</div></article>
    <article class="panel full">
      <div class="row-between"><h3>次に見る決算</h3><span class="dim">カバレッジ内</span></div>
      <div class="summary-card">
        ${upcoming ? `
          <strong>${escapeHtml(upcoming.name)}</strong>
          <div class="company-meta">${escapeHtml(upcoming.sec_code || upcoming.edinet_code || "")}</div>
          <div>予定日: ${escapeHtml(formatDate(upcoming.next_earnings))}</div>
          <div>主要論点: ${escapeHtml(upcoming.key_debate || "未設定")}</div>
        ` : `<div class="dim">次回決算予定が登録されていません。</div>`}
      </div>
    </article>
  `;
}

function renderWorkspace() {
  const company = getSelectedCompany();
  if (!company) {
    if (el.workspaceTitle) el.workspaceTitle.textContent = state.session ? "企業を選択してください" : "ログインして調査を開始";
    if (el.workspaceSubtitle) {
      el.workspaceSubtitle.textContent = state.session
        ? "左側の候補から企業を選ぶか、EDINET から取り込んでください。"
        : "設定とログイン後に、自分専用のデータが読み込まれます。";
    }
    if (el.workspaceContent) {
      el.workspaceContent.innerHTML = state.session
        ? `<div class="empty">表示する企業がまだありません。</div>`
        : `<div class="empty">表示する企業がまだありません。<div class="button-row"><button class="ghost" type="button" data-action="open-settings">設定・ログインを開く</button></div></div>`;
    }
    return;
  }

  if (el.workspaceTitle) el.workspaceTitle.textContent = `${company.sec_code || company.edinet_code || ""} ${company.name}`;
  if (el.workspaceSubtitle) {
    el.workspaceSubtitle.textContent = `${company.industry || "業種未設定"} · 更新 ${formatDateTime(company.updated_at)} · EDINET ${company.edinet_code || "未設定"}`;
  }

  const views = {
    overview: renderOverview(company),
    earnings: renderEarnings(company),
    valuation: renderValuation(company),
    notes: renderNotes(company),
    questions: renderQuestions(company),
    settings: renderAutoData(company),
  };
  el.workspaceContent.innerHTML = views[state.ui.activeTab] || views.overview;
}

function renderOverview(company) {
  const latestAnnual = company.external_snapshot.annual_financials[0];
  const latestPrice = company.external_snapshot.price_series.at(-1)?.close;
  const latestNews = company.external_snapshot.news_items[0];
  return `
    <div class="panel-grid">
      <section class="panel">
        <div class="row-between">
          <h3>投資仮説</h3>
          <div class="button-row">
            <button class="ghost tiny" data-action="edit-company" data-id="${company.id}" type="button">ヘッダー編集</button>
            <button class="ghost tiny" data-action="delete-company" type="button">削除</button>
          </div>
        </div>
        <form data-form="overview" class="stack">
          <label><span>投資仮説</span><textarea name="thesis" rows="4">${escapeHtml(company.thesis)}</textarea></label>
          <label><span>バリアントビュー</span><textarea name="variant_view" rows="4">${escapeHtml(company.variant_view)}</textarea></label>
          <label><span>主要論点</span><textarea name="key_debate" rows="4">${escapeHtml(company.key_debate)}</textarea></label>
          <div class="inline-grid two">
            <label><span>ステータス</span>${renderStatusSelect(company.status)}</label>
            <label><span>次回決算予定</span><input name="next_earnings" type="date" value="${escapeHtml(company.next_earnings || "")}"></label>
          </div>
          <div class="inline-grid four">
            <label><span>Quality</span><input name="quality" type="number" min="1" max="5" value="${escapeHtml(String(company.scorecard.quality || 3))}"></label>
            <label><span>Momentum</span><input name="momentum" type="number" min="1" max="5" value="${escapeHtml(String(company.scorecard.momentum || 3))}"></label>
            <label><span>Valuation</span><input name="valuation_score" type="number" min="1" max="5" value="${escapeHtml(String(company.scorecard.valuation || 3))}"></label>
            <label><span>Management</span><input name="management" type="number" min="1" max="5" value="${escapeHtml(String(company.scorecard.management || 3))}"></label>
          </div>
          <div class="button-row"><button type="submit">概要を保存</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>クイックスナップショット</h3>
        <div class="timeline">
          ${renderSummaryCard("会社名", company.name)}
          ${renderSummaryCard("業種", company.industry || "未設定")}
          ${renderSummaryCard("直近売上高", latestAnnual ? formatMillions(latestAnnual.revenue) : "-")}
          ${renderSummaryCard("直近営業利益", latestAnnual ? formatMillions(latestAnnual.operating_income) : "-")}
          ${renderSummaryCard("直近 EPS", latestAnnual?.eps ? `${formatNumber(latestAnnual.eps)} 円` : "-")}
          ${renderSummaryCard("株価", Number.isFinite(latestPrice) ? `${formatNumber(latestPrice)} 円` : "未取得")}
        </div>
      </section>
      <section class="panel full">
        <div class="row-between"><h3>最新ニュース</h3><span class="dim">Google News RSS ベース</span></div>
        ${latestNews ? renderNewsList(company.external_snapshot.news_items.slice(0, 6)) : `<div class="empty">ニュースはまだ取得されていません。</div>`}
      </section>
    </div>
  `;
}

function renderEarnings(company) {
  const earningsView = state.ui.earningsView || "quarterly";
  const quarterBuckets = buildQuarterBuckets(company);
  const annualRows = buildAnnualRows(company);
  const selectedBucket = getSelectedQuarterBucket(company, quarterBuckets);
  const defaults = inferNextForecastPeriod(company);
  const nextSchedule = getNextEarningsSchedule(company);
  const latestCompanyForecast = getLatestCompanyForecast(company);
  return `
    <div class="panel-grid">
      <section class="panel full">
        <div class="row-between">
          <h3>決算データ</h3>
          <div class="button-row earnings-subtabs">
            <button class="${earningsView === "quarterly" ? "" : "ghost"} tiny" data-action="set-earnings-view" data-view="quarterly" type="button">四半期</button>
            <button class="${earningsView === "annual" ? "" : "ghost"} tiny" data-action="set-earnings-view" data-view="annual" type="button">通期</button>
          </div>
        </div>
      </section>
      ${nextSchedule || latestCompanyForecast ? `
        <section class="panel">
          <h3>今後の予定・会社予想</h3>
          <div class="timeline">
            ${nextSchedule ? renderSummaryCard("次回決算予定", `${formatDate(nextSchedule.date)}${nextSchedule.label ? ` / ${nextSchedule.label}` : ""}`) : ""}
            ${latestCompanyForecast ? renderSummaryCard("会社予想 売上高", formatMillionsFromMn(latestCompanyForecast.revenue)) : ""}
            ${latestCompanyForecast ? renderSummaryCard("会社予想 営業利益", formatMillionsFromMn(latestCompanyForecast.operating_income)) : ""}
            ${latestCompanyForecast ? renderSummaryCard("会社予想 EPS", formatYen(latestCompanyForecast.eps)) : ""}
          </div>
          ${latestCompanyForecast?.source ? `<p class="help-text">予想ソース: ${escapeHtml(latestCompanyForecast.source)}</p>` : ""}
        </section>
      ` : ""}
      <section class="panel full">
        <div class="row-between"><h3>${earningsView === "quarterly" ? "四半期推移" : "通期推移"}</h3><span class="dim">最新は TDNet、履歴は Yuho を補完して表示します。</span></div>
        <div class="chart-grid">
          <article class="mini-chart-card"><div class="chart-head"><strong>売上高</strong><span class="dim">${earningsView === "quarterly" ? "百万円 / 単四" : "百万円 / 通期"}</span></div>${renderFinancialChart(earningsView === "quarterly" ? quarterBuckets : annualRows, "revenue", earningsView)}</article>
          <article class="mini-chart-card"><div class="chart-head"><strong>営業利益</strong><span class="dim">${earningsView === "quarterly" ? "百万円 / 単四" : "百万円 / 通期"}</span></div>${renderFinancialChart(earningsView === "quarterly" ? quarterBuckets : annualRows, "operating_income", earningsView)}</article>
          <article class="mini-chart-card"><div class="chart-head"><strong>EPS</strong><span class="dim">円</span></div>${renderFinancialChart(earningsView === "quarterly" ? quarterBuckets : annualRows, "eps", earningsView)}</article>
        </div>
      </section>
      ${earningsView === "quarterly" ? renderQuarterlyEarningsSection(company, quarterBuckets, selectedBucket) : renderAnnualEarningsSection(company, annualRows)}
      <section class="panel">
        <h3>次回予想を登録</h3>
        <form data-form="forecast" class="stack">
          <div class="inline-grid four">
            <label><span>年度</span><input name="fiscal_year" type="number" value="${escapeHtml(defaults.fiscal_year)}"></label>
            <label><span>決算月</span><select name="fiscal_year_end_month">${renderMonthOptions(defaults.fiscal_year_end_month)}</select></label>
            <label><span>四半期</span><select name="quarter">${renderQuarterOptions(defaults.quarter)}</select></label>
            <label><span>EPS</span><input name="eps" inputmode="decimal" value="${escapeHtml(defaults.eps)}"></label>
          </div>
          <div class="inline-grid three">
            <label><span>売上高</span><input name="revenue_mn" inputmode="numeric" value="${escapeHtml(defaults.revenue_mn)}" placeholder="百万円"></label>
            <label><span>営業利益</span><input name="operating_income_mn" inputmode="numeric" value="${escapeHtml(defaults.operating_income_mn)}" placeholder="百万円"></label>
            <label><span>当期利益</span><input name="net_income_mn" inputmode="numeric" value="${escapeHtml(defaults.net_income_mn)}" placeholder="百万円"></label>
          </div>
          <label><span>予想メモ</span><textarea name="note" rows="3">${escapeHtml(defaults.note)}</textarea></label>
          <div class="button-row"><button type="submit">予想を保存</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>選択中四半期</h3>
        ${selectedBucket ? renderQuarterDetail(company, selectedBucket) : `<div class="empty">四半期を選択してください。</div>`}
      </section>
    </div>
  `;
}

function renderValuation(company) {
  const valuation = { ...DEFAULT_VALUATION, ...(company.manual_valuation || {}) };
  const priceSeries = company.external_snapshot.price_series;
  const latestPrice = priceSeries.at(-1)?.close;
  const firstPrice = priceSeries[0]?.close;
  const latestAnnual = company.external_snapshot.annual_financials[0];
  const change = Number.isFinite(latestPrice) && Number.isFinite(firstPrice) && firstPrice !== 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : null;
  const roughPer = Number.isFinite(latestPrice) && Number.isFinite(latestAnnual?.eps) && latestAnnual.eps !== 0 ? latestPrice / latestAnnual.eps : null;
  const priceError = company.external_snapshot.fetch_status?.price_error || "";
  const valuationSnapshot = extractValuationSnapshot(company);
  return `
    <div class="panel-grid">
      <section class="panel">
        <h3>シナリオ整理</h3>
        <form data-form="valuation" class="stack">
          <label><span>ブルケース</span><textarea name="bull" rows="4">${escapeHtml(valuation.bull)}</textarea></label>
          <label><span>ベースケース</span><textarea name="base" rows="4">${escapeHtml(valuation.base)}</textarea></label>
          <label><span>ベアケース</span><textarea name="bear" rows="4">${escapeHtml(valuation.bear)}</textarea></label>
          <label><span>バリュエーションメモ</span><textarea name="memo" rows="4">${escapeHtml(valuation.memo)}</textarea></label>
          <div class="button-row"><button type="submit">バリュエーションを保存</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>株価推移</h3>
        ${priceSeries.length ? `
          <div class="metric-strip">
            ${renderMetricChip("直近終値", `${formatNumber(latestPrice)} 円`)}
            ${renderMetricChip("1年騰落率", formatSignedPercent(change))}
            ${renderMetricChip("概算 PER", formatTimes(roughPer))}
          </div>
          ${renderPriceChart(priceSeries)}
        ` : `
          <strong>株価をまだ取得できていません</strong>
          <p class="dim">${escapeHtml(priceError || "EDINET 再同期で Edge Function 経由の株価取得を試します。")}</p>
        `}
      </section>
      <section class="panel">
        <h3>EDINET DB バリュエーション</h3>
        <div class="timeline">
          ${renderSummaryCard("PER", valuationSnapshot.per)}
          ${renderSummaryCard("PBR", valuationSnapshot.pbr)}
          ${renderSummaryCard("EV/EBITDA", valuationSnapshot.evEbitda)}
          ${renderSummaryCard("配当利回り", valuationSnapshot.dividendYield)}
          ${renderSummaryCard("時価総額", valuationSnapshot.marketCap)}
          ${renderSummaryCard("EV", valuationSnapshot.enterpriseValue)}
        </div>
      </section>
      <section class="panel full">
        <h3>バリュエーション推移</h3>
        ${renderValuationHistoryTable(company.external_snapshot.ratios)}
      </section>
      <section class="panel full">
        <div class="row-between"><h3>関連ニュース</h3><span class="dim">最新順</span></div>
        ${renderNewsList(company.external_snapshot.news_items)}
      </section>
    </div>
  `;
}

function renderNotes(company) {
  return `
    <div class="panel-grid">
      <section class="panel">
        <h3>調査ログを追加</h3>
        <form data-form="note" class="stack">
          <div class="inline-grid three">
            <label><span>日付</span><input name="date" type="date" value="${today()}"></label>
            <label><span>カテゴリ</span><input name="category" value="調査"></label>
            <label><span>タイトル</span><input name="title"></label>
          </div>
          <label><span>本文</span><textarea name="body" rows="6"></textarea></label>
          <div class="button-row"><button type="submit">ログを追加</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>蓄積ログ</h3>
        ${company.research_notes.length ? company.research_notes.map((item) => `
          <article class="summary-card">
            <div class="row-between">
              <strong>${escapeHtml(item.title || "無題")}</strong>
              <button class="ghost tiny" data-action="delete-note" data-id="${escapeHtml(item.id)}" type="button">削除</button>
            </div>
            <div class="company-meta">${escapeHtml(item.date || "")} · ${escapeHtml(item.category || "")}</div>
            <p>${escapeHtml(item.body || "")}</p>
          </article>
        `).join("") : `<div class="empty">ログはまだありません。</div>`}
      </section>
    </div>
  `;
}

function renderQuestions(company) {
  return `
    <div class="panel-grid">
      <section class="panel">
        <h3>論点を追加</h3>
        <form data-form="question" class="stack">
          <label><span>論点</span><textarea name="text" rows="4"></textarea></label>
          <div class="inline-grid two">
            <label><span>担当</span><input name="owner" value="自分"></label>
            <label><span>状態</span><select name="status"><option value="未着手">未着手</option><option value="確認中">確認中</option><option value="解決">解決</option></select></label>
          </div>
          <div class="button-row"><button type="submit">論点を追加</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>論点一覧</h3>
        ${company.open_questions.length ? company.open_questions.map((item) => `
          <article class="summary-card">
            <div class="row-between">
              <strong>${escapeHtml(item.text || "")}</strong>
              <div class="button-row">
                <button class="ghost tiny" data-action="toggle-question" data-id="${escapeHtml(item.id)}" type="button">状態更新</button>
                <button class="ghost tiny" data-action="delete-question" data-id="${escapeHtml(item.id)}" type="button">削除</button>
              </div>
            </div>
            <div class="company-meta">担当: ${escapeHtml(item.owner || "自分")} · 状態: ${escapeHtml(item.status || "未着手")}</div>
          </article>
        `).join("") : `<div class="empty">論点はまだありません。</div>`}
      </section>
    </div>
  `;
}

function renderAutoData(company) {
  const snapshot = company.external_snapshot;
  return `
    <div class="panel-grid">
      <section class="panel">
        <h3>自動取得データ</h3>
        <div class="timeline">
          ${renderSummaryCard("EDINET コード", company.edinet_code || "未設定")}
          ${renderSummaryCard("年次件数", String(snapshot.annual_financials.length))}
          ${renderSummaryCard("四半期件数", String(snapshot.quarterly_financials.length))}
          ${renderSummaryCard("TDNet 件数", String(snapshot.tdnet_earnings.length))}
          ${renderSummaryCard("ニュース件数", String(snapshot.news_items.length))}
          ${renderSummaryCard("決算予定件数", String(snapshot.earnings_calendar.length))}
          ${renderSummaryCard("株価系列数", String(snapshot.price_series.length))}
          ${renderSummaryCard("最終同期", formatDateTime(snapshot.synced_at))}
        </div>
      </section>
      <section class="panel">
        <h3>公開・利用メモ</h3>
        ${renderSummaryCard("EDINET DB", snapshot.rights?.edinetdb_note || defaultRights().edinetdb_note)}
        ${renderSummaryCard("株価データ", snapshot.rights?.price_note || defaultRights().price_note)}
        ${snapshot.fetch_status?.price_error ? renderSummaryCard("株価取得メモ", snapshot.fetch_status.price_error) : ""}
        ${snapshot.fetch_status?.news_error ? renderSummaryCard("ニュース取得メモ", snapshot.fetch_status.news_error) : ""}
      </section>
    </div>
  `;
}

async function searchImportCandidates() {
  const query = String(el.importSearchInput?.value || "").trim();
  if (!query) return;
  state.importLoading = true;
  renderImportResults();
  try {
    const response = await fetch(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=8`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "EDINET DB の検索に失敗しました。");
    state.importResults = Array.isArray(payload?.data) ? payload.data : [];
  } catch (error) {
    state.importResults = [];
    setAuthStatus(getErrorMessage(error), true);
  } finally {
    state.importLoading = false;
    renderImportResults();
  }
}

async function importCompany(edinetCode) {
  if (!state.supabase || !state.session) {
    openSettingsDialog();
    setAuthStatus("ログイン後に企業を取り込んでください。", true);
    return;
  }
  try {
    setAuthStatus("企業データを取り込んでいます...", false);
    const payload = await fetchExternalData({ edinetCode });
    const existing = state.companies.find((item) => item.edinet_code === edinetCode);
    const row = buildCompanyFromExternal(payload, existing);
    const query = existing
      ? state.supabase.from("research_companies").update(row).eq("id", existing.id).select().single()
      : state.supabase.from("research_companies").insert(row).select().single();
    const { data, error } = await query;
    if (error) throw error;
    upsertLocalCompany(data);
    state.selectedCompanyId = data.id;
    setAuthStatus(`${data.name} を取り込みました。`, false);
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function syncSelectedCompany() {
  const company = getSelectedCompany();
  if (!company) return;
  if (!company.edinet_code) {
    setAuthStatus("EDINET コードが未設定です。", true);
    return;
  }
  try {
    setAuthStatus(`${company.name} を再同期しています...`, false);
    const payload = await fetchExternalData({ edinetCode: company.edinet_code, secCode: company.sec_code, name: company.name });
    const row = buildCompanyFromExternal(payload, company);
    const { data, error } = await state.supabase.from("research_companies").update(row).eq("id", company.id).select().single();
    if (error) throw error;
    upsertLocalCompany(data);
    state.selectedCompanyId = data.id;
    setAuthStatus(`${company.name} を再同期しました。`, false);
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function saveCompanyFromDialog() {
  if (!state.supabase || !state.session) {
    setAuthStatus("ログイン後に保存してください。", true);
    return;
  }
  const formData = new FormData(el.companyForm);
  const editingId = el.companyForm.dataset.editingId || "";
  const existing = editingId ? state.companies.find((item) => item.id === editingId) : null;
  const row = {
    user_id: state.session.user.id,
    sec_code: stringOrNull(formData.get("sec_code")),
    edinet_code: stringOrNull(formData.get("edinet_code")),
    name: String(formData.get("name") || "").trim(),
    industry: stringOrNull(formData.get("industry")),
    status: String(formData.get("status") || "追跡"),
    next_earnings: stringOrNull(formData.get("next_earnings")),
    thesis: String(formData.get("thesis") || ""),
    variant_view: String(formData.get("variant_view") || ""),
    key_debate: String(formData.get("key_debate") || ""),
    scorecard: existing?.scorecard || DEFAULT_SCORECARD,
    manual_forecast: existing?.manual_forecast || [],
    manual_valuation: existing?.manual_valuation || DEFAULT_VALUATION,
    research_notes: existing?.research_notes || [],
    open_questions: existing?.open_questions || [],
    external_snapshot: existing?.external_snapshot || normalizeExternalPayload({}),
  };
  const query = editingId
    ? state.supabase.from("research_companies").update(row).eq("id", editingId).select().single()
    : state.supabase.from("research_companies").insert(row).select().single();
  const { data, error } = await query;
  if (error) {
    setAuthStatus(getErrorMessage(error), true);
    return;
  }
  upsertLocalCompany(data);
  state.selectedCompanyId = data.id;
  closeDialog(el.companyDialog);
  setAuthStatus("企業情報を保存しました。", false);
  render();
}

async function saveOverviewForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  await updateCompany(company.id, {
    thesis: String(formData.get("thesis") || ""),
    variant_view: String(formData.get("variant_view") || ""),
    key_debate: String(formData.get("key_debate") || ""),
    status: String(formData.get("status") || company.status),
    next_earnings: stringOrNull(formData.get("next_earnings")),
    scorecard: {
      quality: Number(formData.get("quality") || company.scorecard.quality || 3),
      momentum: Number(formData.get("momentum") || company.scorecard.momentum || 3),
      valuation: Number(formData.get("valuation_score") || company.scorecard.valuation || 3),
      management: Number(formData.get("management") || company.scorecard.management || 3),
    },
  }, "概要を保存しました。");
}

async function saveForecastForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const item = {
    id: uid("forecast"),
    fiscal_year: String(formData.get("fiscal_year") || "").trim(),
    fiscal_year_end_month: String(formData.get("fiscal_year_end_month") || "3"),
    quarter: String(formData.get("quarter") || "1"),
    revenue_mn: String(formData.get("revenue_mn") || "").trim(),
    operating_income_mn: String(formData.get("operating_income_mn") || "").trim(),
    net_income_mn: String(formData.get("net_income_mn") || "").trim(),
    eps: String(formData.get("eps") || "").trim(),
    note: String(formData.get("note") || "").trim(),
  };
  if (!item.fiscal_year) {
    setAuthStatus("予想の年度を入力してください。", true);
    return;
  }
  const next = upsertForecast(company.manual_forecast, item);
  await updateCompany(company.id, { manual_forecast: next }, "予想を保存しました。");
  form.reset();
}

async function saveValuationForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  await updateCompany(company.id, {
    manual_valuation: {
      bull: String(formData.get("bull") || ""),
      base: String(formData.get("base") || ""),
      bear: String(formData.get("bear") || ""),
      memo: String(formData.get("memo") || ""),
      price_source_note: company.manual_valuation?.price_source_note || "",
    },
  }, "バリュエーションを保存しました。");
}

async function saveNoteForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const notes = [{
    id: uid("note"),
    date: String(formData.get("date") || today()),
    category: String(formData.get("category") || "調査"),
    title: String(formData.get("title") || ""),
    body: String(formData.get("body") || ""),
  }, ...company.research_notes];
  await updateCompany(company.id, { research_notes: notes }, "調査ログを追加しました。");
  form.reset();
}

async function saveQuestionForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const questions = [{
    id: uid("question"),
    text: String(formData.get("text") || ""),
    owner: String(formData.get("owner") || "自分"),
    status: String(formData.get("status") || "未着手"),
  }, ...company.open_questions];
  await updateCompany(company.id, { open_questions: questions }, "論点を追加しました。");
  form.reset();
}

async function removeItemFromSelected(field, id) {
  const company = getSelectedCompany();
  if (!company) return;
  await updateCompany(company.id, { [field]: (company[field] || []).filter((item) => item.id !== id) }, "更新しました。");
}

async function toggleQuestion(id) {
  const company = getSelectedCompany();
  if (!company) return;
  const next = company.open_questions.map((item) => {
    if (item.id !== id) return item;
    const status = item.status === "未着手" ? "確認中" : item.status === "確認中" ? "解決" : "未着手";
    return { ...item, status };
  });
  await updateCompany(company.id, { open_questions: next }, "論点状態を更新しました。");
}

async function deleteForecast(id) {
  const company = getSelectedCompany();
  if (!company) return;
  await updateCompany(company.id, { manual_forecast: company.manual_forecast.filter((item) => item.id !== id) }, "予想を削除しました。");
}

async function deleteSelectedCompany() {
  const company = getSelectedCompany();
  if (!company || !state.supabase) return;
  if (!confirm(`${company.name} を削除します。`)) return;
  const { error } = await state.supabase.from("research_companies").delete().eq("id", company.id);
  if (error) {
    setAuthStatus(getErrorMessage(error), true);
    return;
  }
  state.companies = state.companies.filter((item) => item.id !== company.id);
  state.selectedCompanyId = state.companies[0]?.id || null;
  setAuthStatus("削除しました。", false);
  render();
}

async function updateCompany(id, payload, successMessage) {
  if (!state.supabase) return;
  const { data, error } = await state.supabase.from("research_companies").update(payload).eq("id", id).select().single();
  if (error) {
    setAuthStatus(getErrorMessage(error), true);
    return;
  }
  upsertLocalCompany(data);
  setAuthStatus(successMessage, false);
  render();
}

function upsertLocalCompany(row) {
  const company = normalizeCompanyRow(row);
  state.companies = [company, ...state.companies.filter((item) => item.id !== company.id)].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

function openCompanyDialog(companyId = "") {
  el.companyForm?.reset();
  delete el.companyForm.dataset.editingId;
  if (el.companyDialogTitle) el.companyDialogTitle.textContent = companyId ? "企業情報を編集" : "企業を追加";
  if (companyId) {
    const company = state.companies.find((item) => item.id === companyId);
    if (company) {
      el.companyForm.dataset.editingId = company.id;
      setFormValue("sec_code", company.sec_code);
      setFormValue("edinet_code", company.edinet_code);
      setFormValue("name", company.name);
      setFormValue("industry", company.industry);
      setFormValue("status", company.status);
      setFormValue("next_earnings", company.next_earnings);
      setFormValue("thesis", company.thesis);
      setFormValue("variant_view", company.variant_view);
      setFormValue("key_debate", company.key_debate);
    }
  }
  openDialog(el.companyDialog);
}

function exportCompanies() {
  const blob = new Blob([JSON.stringify(state.companies, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `research-companies-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildQuarterBuckets(company) {
  const map = new Map();
  const cumulativeMap = new Map();
  const annualMap = new Map();

  for (const item of company.external_snapshot.quarterly_financials) {
    if (!Number.isFinite(item.quarter) || item.quarter < 1 || item.quarter > 3) continue;
    const key = quarterKey(item);
    cumulativeMap.set(key, item);
  }

  for (const item of company.external_snapshot.tdnet_earnings) {
    if (!Number.isFinite(item.quarter)) continue;
    const existing = Number.isFinite(item.quarter) && item.quarter >= 1 && item.quarter <= 3 ? cumulativeMap.get(quarterKey(item)) : annualMap.get(annualKey(item));
    if (item.quarter >= 1 && item.quarter <= 3) {
      cumulativeMap.set(quarterKey(item), chooseLaterDisclosure(existing, item));
    } else if (item.quarter === 4) {
      annualMap.set(annualKey(item), chooseLaterDisclosure(existing, item));
    }
  }

  for (const item of company.external_snapshot.annual_financials) {
    const key = annualKey(item);
    if (!annualMap.has(key)) annualMap.set(key, item);
  }

  for (const cumulative of cumulativeMap.values()) {
    const prev = cumulative.quarter > 1
      ? cumulativeMap.get(quarterKey({ fiscal_year: cumulative.fiscal_year, fiscal_year_end_month: cumulative.fiscal_year_end_month, quarter: cumulative.quarter - 1 }))
      : null;
    const annual = annualMap.get(annualKey(cumulative));
    const standalone = convertToStandaloneQuarter(cumulative, prev, annual);
    const key = quarterKey(standalone);
    map.set(key, {
      ...(map.get(key) || makeQuarterBucket(standalone)),
      actual: standalone,
      source_actual: cumulative,
      tdnet: cumulative.source_type === "tdnet" ? cumulative : map.get(key)?.tdnet || null,
    });
  }

  for (const annual of annualMap.values()) {
    const q4Key = quarterKey({ fiscal_year: annual.fiscal_year, fiscal_year_end_month: annual.fiscal_year_end_month, quarter: 4 });
    const q3 = cumulativeMap.get(quarterKey({ fiscal_year: annual.fiscal_year, fiscal_year_end_month: annual.fiscal_year_end_month, quarter: 3 }));
    if (!q3) continue;
    const standaloneQ4 = {
      ...annual,
      quarter: 4,
      source_type: annual.source_type || "yuho",
      revenue: computeStandaloneMetric(annual.revenue, q3?.revenue, 4, annual.revenue),
      operating_income: computeStandaloneMetric(annual.operating_income, q3?.operating_income, 4, annual.operating_income),
      ordinary_income: computeStandaloneMetric(annual.ordinary_income, q3?.ordinary_income, 4, annual.ordinary_income),
      net_income: computeStandaloneMetric(annual.net_income, q3?.net_income, 4, annual.net_income),
      eps: computeStandaloneMetric(annual.eps, q3?.eps, 4, annual.eps),
      submit_date: annual.submit_date || annual.disclosure_date || "",
    };
    map.set(q4Key, {
      ...(map.get(q4Key) || makeQuarterBucket(standaloneQ4)),
      actual: standaloneQ4,
      source_actual: annual,
      tdnet: annual.source_type === "tdnet" ? annual : map.get(q4Key)?.tdnet || null,
    });
  }

  for (const item of company.manual_forecast) {
    const key = quarterKey(item);
    map.set(key, { ...(map.get(key) || makeQuarterBucket(item)), forecast: item });
  }

  return [...map.values()].map((item) => ({ ...item, label: quarterLabel(item) })).sort(compareQuarterDesc);
}

function makeQuarterBucket(item) {
  return {
    key: quarterKey(item),
    fiscal_year: Number(item.fiscal_year || 0),
    fiscal_year_end_month: Number(item.fiscal_year_end_month || 3),
    quarter: Number(item.quarter || 0),
    actual: null,
    source_actual: null,
    forecast: null,
    tdnet: null,
  };
}

function buildAnnualRows(company) {
  const map = new Map();
  for (const item of company.external_snapshot.annual_financials) {
    const key = annualKey(item);
    map.set(key, {
      key,
      fiscal_year: Number(item.fiscal_year || 0),
      fiscal_year_end_month: Number(item.fiscal_year_end_month || inferFiscalYearEndMonth(company.external_snapshot.company)),
      actual: item,
      tdnet: null,
      forecast: null,
      label: annualLabel(item),
      updated_at: item.submit_date || item.updated_at || "",
    });
  }
  for (const item of company.external_snapshot.tdnet_earnings.filter((entry) => entry.quarter === 4)) {
    const key = annualKey(item);
    const existing = map.get(key);
    map.set(key, {
      key,
      fiscal_year: Number(item.fiscal_year || 0),
      fiscal_year_end_month: Number(item.fiscal_year_end_month || inferFiscalYearEndMonth(company.external_snapshot.company)),
      actual: chooseLaterDisclosure(existing?.actual, item),
      tdnet: item,
      forecast: extractCompanyForecast(item),
      label: annualLabel(item),
      updated_at: item.disclosure_date || existing?.updated_at || "",
    });
  }
  for (const item of company.external_snapshot.tdnet_earnings.filter((entry) => entry.quarter >= 1 && entry.quarter <= 3)) {
    const key = annualKey(item);
    const existing = map.get(key) || {
      key,
      fiscal_year: Number(item.fiscal_year || 0),
      fiscal_year_end_month: Number(item.fiscal_year_end_month || inferFiscalYearEndMonth(company.external_snapshot.company)),
      actual: null,
      tdnet: null,
      forecast: null,
      label: annualLabel(item),
      updated_at: "",
    };
    map.set(key, {
      ...existing,
      forecast: extractCompanyForecast(item) || existing.forecast,
      tdnet: chooseLaterDisclosure(existing.tdnet, item),
      updated_at: item.disclosure_date || existing.updated_at,
    });
  }
  return [...map.values()].sort((left, right) => compareQuarterDesc({ ...left, quarter: 4 }, { ...right, quarter: 4 }));
}

function renderQuarterlyEarningsSection(company, buckets, selectedBucket) {
  return `
    <section class="panel full">
      <h3>四半期実績・予想一覧</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>期</th>
              <th>売上高</th>
              <th>営業利益</th>
              <th>当期利益</th>
              <th>EPS</th>
              <th>更新</th>
              <th>資料</th>
            </tr>
          </thead>
          <tbody>
            ${buckets.length ? buckets.map((bucket) => `
              <tr class="${selectedBucket?.key === bucket.key ? "selected-row" : ""}">
                <td><button class="ghost tiny" data-action="select-quarter" data-quarter-key="${escapeHtml(bucket.key)}" type="button">${escapeHtml(bucket.label)}</button><div class="table-subline">${renderBadges(bucket)}</div></td>
                <td>${renderMetricPair(bucket.actual, "revenue", bucket.forecast?.revenue_mn, true)}</td>
                <td>${renderMetricPair(bucket.actual, "operating_income", bucket.forecast?.operating_income_mn, true)}</td>
                <td>${renderMetricPair(bucket.actual, "net_income", bucket.forecast?.net_income_mn, true)}</td>
                <td>${renderMetricPair(bucket.actual, "eps", bucket.forecast?.eps, false)}</td>
                <td>${escapeHtml(formatQuarterUpdate(bucket))}</td>
                <td>${renderQuarterLinkSummary(company, bucket)}</td>
              </tr>
            `).join("") : `<tr><td colspan="7"><div class="empty">四半期データがありません。</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAnnualEarningsSection(company, annualRows) {
  return `
    <section class="panel full">
      <h3>通期実績・会社予想</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>期</th>
              <th>売上高</th>
              <th>営業利益</th>
              <th>当期利益</th>
              <th>EPS</th>
              <th>更新</th>
              <th>資料</th>
            </tr>
          </thead>
          <tbody>
            ${annualRows.length ? annualRows.map((row) => `
              <tr>
                <td>${escapeHtml(row.label)}<div class="table-subline">${row.actual ? `<span class="badge badge-actual">実績</span>` : ""}${row.forecast ? `<span class="badge badge-forecast">会社予想</span>` : ""}</div></td>
                <td>${renderMetricPair(row.actual, "revenue", row.forecast?.revenue, false)}</td>
                <td>${renderMetricPair(row.actual, "operating_income", row.forecast?.operating_income, false)}</td>
                <td>${renderMetricPair(row.actual, "net_income", row.forecast?.net_income, false)}</td>
                <td>${renderMetricPair(row.actual, "eps", row.forecast?.eps, false)}</td>
                <td>${escapeHtml(formatDate(row.updated_at))}</td>
                <td>${renderAnnualLinkSummary(company, row)}</td>
              </tr>
            `).join("") : `<tr><td colspan="7"><div class="empty">通期データがありません。</div></td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getLatestCompanyForecast(company) {
  const earnings = [...company.external_snapshot.tdnet_earnings].sort((left, right) => String(right.disclosure_date || "").localeCompare(String(left.disclosure_date || "")));
  for (const item of earnings) {
    const forecast = extractCompanyForecast(item);
    if (forecast) {
      return {
        ...forecast,
        fiscal_year: item.fiscal_year,
        label: annualLabel(item),
        source: `${item.disclosure_date ? formatDate(item.disclosure_date) : "-"} 開示`,
      };
    }
  }
  return null;
}

function getNextEarningsSchedule(company) {
  const schedules = Array.isArray(company.external_snapshot?.earnings_calendar) ? company.external_snapshot.earnings_calendar : [];
  const todayValue = today();
  return schedules
    .filter((item) => String(item.date || "") >= todayValue)
    .sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")))[0] || null;
}

function convertToStandaloneQuarter(current, previous, annual) {
  return {
    ...current,
    revenue: computeStandaloneMetric(current.revenue, previous?.revenue, current.quarter, annual?.revenue),
    operating_income: computeStandaloneMetric(current.operating_income, previous?.operating_income, current.quarter, annual?.operating_income),
    ordinary_income: computeStandaloneMetric(current.ordinary_income, previous?.ordinary_income, current.quarter, annual?.ordinary_income),
    net_income: computeStandaloneMetric(current.net_income, previous?.net_income, current.quarter, annual?.net_income),
    eps: computeStandaloneMetric(current.eps, previous?.eps, current.quarter, annual?.eps),
  };
}

function computeStandaloneMetric(currentValue, previousValue, quarter, annualValue) {
  const current = Number(currentValue);
  if (!Number.isFinite(current)) return null;
  if (quarter === 1) return current;
  if (quarter === 4) {
    const annual = Number(annualValue);
    const previous = Number(previousValue);
    if (Number.isFinite(annual) && Number.isFinite(previous)) return annual - previous;
    return Number.isFinite(annual) ? annual : null;
  }
  const previous = Number(previousValue);
  return Number.isFinite(previous) ? current - previous : current;
}

function chooseLaterDisclosure(existing, candidate) {
  if (!existing) return candidate;
  const existingDate = String(existing.disclosure_date || existing.submit_date || existing.updated_at || "");
  const candidateDate = String(candidate.disclosure_date || candidate.submit_date || candidate.updated_at || "");
  return candidateDate >= existingDate ? candidate : existing;
}

function extractCompanyForecast(item) {
  const revenue = findForecastField(item, ["forecast_revenue", "revenue_forecast", "next_revenue", "company_forecast_revenue", "forecast_sales", "sales_forecast"]);
  const operatingIncome = findForecastField(item, ["forecast_operating_income", "operating_income_forecast", "next_operating_income", "company_forecast_operating_income"]);
  const netIncome = findForecastField(item, ["forecast_net_income", "net_income_forecast", "next_net_income", "company_forecast_net_income"]);
  const eps = findForecastField(item, ["forecast_eps", "eps_forecast", "next_eps", "company_forecast_eps"]);
  if (![revenue, operatingIncome, netIncome, eps].some((value) => Number.isFinite(Number(value)))) return null;
  return {
    revenue: toNumberOrNull(revenue),
    operating_income: toNumberOrNull(operatingIncome),
    net_income: toNumberOrNull(netIncome),
    eps: toNumberOrNull(eps),
  };
}

function findForecastField(item, exactKeys) {
  for (const key of exactKeys) {
    if (item[key] !== undefined && item[key] !== null && String(item[key]) !== "") return item[key];
  }
  const lowered = Object.keys(item).map((key) => ({ key, lower: key.toLowerCase() }));
  const fuzzy = lowered.find((entry) => entry.lower.includes("forecast") && exactKeys.some((key) => entry.lower.includes(key.replace("forecast_", "").replace("company_", "").replace("next_", ""))));
  return fuzzy ? item[fuzzy.key] : null;
}

function annualKey(item) {
  return `${Number(item.fiscal_year || 0)}-${Number(item.fiscal_year_end_month || 3)}`;
}

function annualLabel(item) {
  return `${displayFiscalYear(item)}/${Number(item.fiscal_year_end_month || 3)}月期`;
}

function getSelectedQuarterBucket(company, buckets) {
  const key = state.ui.selectedQuarterKeys[company.id];
  return buckets.find((item) => item.key === key) || buckets[0] || null;
}

function inferNextForecastPeriod(company) {
  const latest = buildQuarterBuckets(company)[0];
  if (!latest) {
    return { ...FORECAST_TEMPLATE, fiscal_year: String(new Date().getFullYear()), fiscal_year_end_month: "3", quarter: "1" };
  }
  let fiscalYear = Number(latest.fiscal_year || new Date().getFullYear());
  let quarter = Number(latest.quarter || 0) + 1;
  if (quarter > 4) {
    fiscalYear += 1;
    quarter = 1;
  }
  return { ...FORECAST_TEMPLATE, fiscal_year: String(fiscalYear), fiscal_year_end_month: String(latest.fiscal_year_end_month || 3), quarter: String(quarter) };
}

function upsertForecast(items, candidate) {
  return [...(items || []).filter((item) => quarterKey(item) !== quarterKey(candidate)), candidate].sort(compareQuarterDesc);
}

function normalizeCompanyRow(row) {
  const external_snapshot = normalizeExternalPayload(row.external_snapshot || {});
  return {
    id: row.id,
    user_id: row.user_id,
    sec_code: row.sec_code || "",
    edinet_code: row.edinet_code || "",
    name: row.name || "",
    industry: row.industry || "",
    status: row.status || "追跡",
    next_earnings: row.next_earnings || "",
    thesis: row.thesis || "",
    variant_view: row.variant_view || "",
    key_debate: row.key_debate || "",
    scorecard: { ...DEFAULT_SCORECARD, ...(row.scorecard || {}) },
    manual_forecast: normalizeManualForecasts(row.manual_forecast, external_snapshot),
    manual_valuation: { ...DEFAULT_VALUATION, ...(row.manual_valuation || {}) },
    research_notes: Array.isArray(row.research_notes) ? row.research_notes : [],
    open_questions: Array.isArray(row.open_questions) ? row.open_questions : [],
    external_snapshot,
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

function buildCompanyFromExternal(payload, existing = null) {
  const normalized = normalizeExternalPayload(payload);
  const company = normalized.company || {};
  const nextSchedule = normalized.earnings_calendar
    .filter((item) => item.date >= today())
    .sort((left, right) => String(left.date).localeCompare(String(right.date)))[0];
  return {
    user_id: state.session.user.id,
    sec_code: company.sec_code ? String(company.sec_code).slice(0, 4) : existing?.sec_code || null,
    edinet_code: company.edinet_code || existing?.edinet_code || null,
    name: company.name || existing?.name || "",
    industry: company.industry || existing?.industry || null,
    status: existing?.status || "追跡",
    next_earnings: nextSchedule?.date || existing?.next_earnings || null,
    thesis: existing?.thesis || "",
    variant_view: existing?.variant_view || "",
    key_debate: existing?.key_debate || "",
    scorecard: existing?.scorecard || DEFAULT_SCORECARD,
    manual_forecast: existing?.manual_forecast || [],
    manual_valuation: existing?.manual_valuation || DEFAULT_VALUATION,
    research_notes: existing?.research_notes || [],
    open_questions: existing?.open_questions || [],
    external_snapshot: { ...normalized, synced_at: new Date().toISOString() },
  };
}

function normalizeExternalPayload(payload) {
  const company = extractEdinetData(payload?.company) || {};
  return {
    company,
    annual_financials: normalizeDescendingDateArray(Array.isArray(payload?.annual_financials) ? payload.annual_financials : [], (item) => Number(item.fiscal_year || 0)),
    quarterly_financials: normalizeQuarterlyFinancials(Array.isArray(payload?.quarterly_financials) ? payload.quarterly_financials : [], company),
    ratios: normalizeDescendingDateArray(Array.isArray(payload?.ratios) ? payload.ratios : []),
    analysis: payload?.analysis || {},
    tdnet_earnings: normalizeTdnetEarnings(payload?.tdnet_earnings),
    price_series: normalizePriceSeries(payload?.price_series),
    news_items: normalizeNewsItems(payload?.news_items),
    earnings_calendar: normalizeEarningsCalendar(payload?.earnings_calendar),
    fetch_status: payload?.fetch_status || {},
    rights: { ...defaultRights(), ...(payload?.rights || {}) },
    synced_at: payload?.synced_at || null,
  };
}

function normalizeQuarterlyFinancials(rows, company) {
  const endMonth = inferFiscalYearEndMonth(company);
  return [...rows].map((item) => ({
    ...item,
    fiscal_year: Number(item.fiscal_year || getFiscalYearFromEnd(item.fiscal_year_end) || 0),
    fiscal_year_end_month: Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || endMonth || 3),
    quarter: parseQuarter(item.quarter),
    source_type: "yuho",
  })).sort(compareQuarterDesc);
}

function normalizeTdnetEarnings(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.data?.earnings)
        ? payload.data.earnings
        : [];
  return rows.map((item) => ({
    ...item,
    fiscal_year: Number(item.fiscal_year || getFiscalYearFromEnd(item.fiscal_year_end) || inferFiscalYearFromQuarter(item) || 0),
    fiscal_year_end_month: Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || 3),
    quarter: parseQuarter(item.quarter),
    source_type: "tdnet",
  }))
    .filter((item) => Number.isFinite(item.quarter) && item.quarter > 0 && item.fiscal_year > 0)
    .sort(compareQuarterDesc);
}

function normalizeManualForecasts(raw, snapshot) {
  if (Array.isArray(raw)) {
    return raw.map((item) => ({
      ...FORECAST_TEMPLATE,
      ...item,
      id: item.id || uid("forecast"),
      fiscal_year: String(item.fiscal_year || ""),
      fiscal_year_end_month: String(item.fiscal_year_end_month || inferFiscalYearEndMonth(snapshot?.company || {}) || 3),
      quarter: String(item.quarter || "1"),
      revenue_mn: String(item.revenue_mn || ""),
      operating_income_mn: String(item.operating_income_mn || ""),
      net_income_mn: String(item.net_income_mn || ""),
      eps: String(item.eps || ""),
      note: String(item.note || ""),
    })).sort(compareQuarterDesc);
  }
  const legacy = raw || {};
  const hasValue = [legacy.revenue_mn, legacy.operating_income_mn, legacy.net_income_mn, legacy.eps, legacy.note].some((item) => String(item || "").trim());
  return hasValue ? [{
    ...inferNextForecastFallback(snapshot),
    id: uid("forecast"),
    revenue_mn: String(legacy.revenue_mn || ""),
    operating_income_mn: String(legacy.operating_income_mn || ""),
    net_income_mn: String(legacy.net_income_mn || ""),
    eps: String(legacy.eps || ""),
    note: String(legacy.note || ""),
  }] : [];
}

function inferNextForecastFallback(snapshot) {
  const latest = snapshot?.quarterly_financials?.[0];
  if (!latest) return { ...FORECAST_TEMPLATE, fiscal_year: String(new Date().getFullYear()), fiscal_year_end_month: "3", quarter: "1" };
  let fiscalYear = Number(latest.fiscal_year || new Date().getFullYear());
  let quarter = Number(latest.quarter || 0) + 1;
  if (quarter > 4) {
    fiscalYear += 1;
    quarter = 1;
  }
  return { ...FORECAST_TEMPLATE, fiscal_year: String(fiscalYear), fiscal_year_end_month: String(latest.fiscal_year_end_month || 3), quarter: String(quarter) };
}

function normalizePriceSeries(series) {
  return (Array.isArray(series) ? series : []).map((item) => ({
    date: item.date,
    close: Number(item.close),
  })).filter((item) => item.date && Number.isFinite(item.close)).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function normalizeNewsItems(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    title: String(item.title || "").trim(),
    link: String(item.link || "").trim(),
    source: String(item.source || "").trim(),
    published_at: normalizeNewsDate(item.published_at || item.pubDate || ""),
  })).filter((item) => item.title && item.link).sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
}

function normalizeEarningsCalendar(items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    date: String(item.date || item.announcement_date || ""),
    code: String(item.code || item.sec_code || ""),
    company: String(item.company || item.name || ""),
    label: String(item.type || item.period_type || item.quarter || ""),
    fiscal_end: String(item.fiscal_end || item.fiscal_year_end || ""),
  })).filter((item) => item.date);
}

function normalizeDescendingDateArray(rows, selector = null) {
  return [...rows].sort((a, b) => {
    const left = selector ? selector(a) : guessSortValue(a);
    const right = selector ? selector(b) : guessSortValue(b);
    return right - left;
  });
}

function guessSortValue(item) {
  if (Number.isFinite(Number(item.fiscal_year))) return Number(item.fiscal_year);
  if (item.submit_date) return Date.parse(item.submit_date) || 0;
  if (item.disclosure_date) return Date.parse(item.disclosure_date) || 0;
  return 0;
}

async function fetchExternalData(input) {
  if (!state.config.edinetApiKey) throw new Error("EDINET DB API Key を入力してください。");
  const viaFunction = await tryFetchViaSupabaseFunction(input);
  if (viaFunction) return normalizeExternalPayload(viaFunction);
  const edinetCode = input.edinetCode || (await resolveEdinetCode(input));
  if (!edinetCode) throw new Error("EDINET コードを特定できませんでした。");
  const headers = { "X-API-Key": state.config.edinetApiKey };
  const [companyRaw, annualRaw, quarterlyRaw, ratiosRaw, analysisRaw, earningsRaw] = await Promise.all([
    fetchEdinetPayload(`https://edinetdb.jp/v1/companies/${edinetCode}`, headers),
    fetchEdinetPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?years=5`, headers),
    fetchEdinetPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?period=quarterly&years=20`, headers),
    fetchEdinetPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/ratios`, headers),
    fetchEdinetPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/analysis`, headers),
    fetchEdinetPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/earnings?limit=20`, headers),
  ]);
  const company = extractEdinetData(companyRaw) || {};
  const calendarRaw = await fetchEdinetCalendar(headers, company?.sec_code || input.secCode || "");
  const ticker = toYahooTicker(company?.sec_code || input.secCode || "");
  const quotePageState = ticker ? await fetchYahooQuotePageState(ticker).catch(() => null) : null;
  const quotePageSchedule = extractYahooQuoteNextEarningsDate(quotePageState);
  const [priceSeries, newsItems] = await Promise.all([
    fetchYahooPriceSeries(ticker),
    fetchGoogleNewsItems(company.name || input.name || "", ticker),
  ]);
  return normalizeExternalPayload({
    company,
    annual_financials: extractEdinetArray(annualRaw),
    quarterly_financials: extractEdinetArray(quarterlyRaw),
    ratios: extractEdinetArray(ratiosRaw),
    analysis: extractEdinetData(analysisRaw) || {},
    tdnet_earnings: normalizeTdnetEarnings(earningsRaw),
    price_series: priceSeries,
    news_items: newsItems,
    earnings_calendar: mergeCalendarEntries(extractEdinetArray(calendarRaw), quotePageSchedule, company, input),
    fetch_status: {
      mode: "browser-fallback",
      used_function: false,
      price_error: priceSeries.length ? "" : "Yahoo Finance 系の株価取得に失敗しました。",
      news_error: newsItems.length ? "" : "ニュース取得に失敗したか、まだ記事がありません。",
    },
    rights: defaultRights(),
  });
}

async function tryFetchViaSupabaseFunction(input) {
  if (!state.supabase || !state.session) return null;
  try {
    const { data, error } = await state.supabase.functions.invoke("sync-company", { body: { ...input, edinetApiKey: state.config.edinetApiKey } });
    if (error) throw error;
    return data || null;
  } catch {
    try {
      const accessToken = state.session?.access_token;
      if (!accessToken) return null;
      const response = await fetch(`${state.config.supabaseUrl}/functions/v1/sync-company`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: state.config.supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ ...input, edinetApiKey: state.config.edinetApiKey }),
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }
}

async function resolveEdinetCode(input) {
  if (input.edinetCode) return input.edinetCode;
  const query = input.secCode || input.name;
  if (!query) return "";
  const response = await fetch(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=1`);
  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data[0]?.edinet_code || "" : "";
}

async function fetchEdinetPayload(url, headers) {
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.error?.message || `EDINET request failed: ${url}`);
  return payload;
}

async function fetchEdinetCalendar(headers, secCode) {
  const code = String(secCode || "").replace(/\D/g, "").slice(0, 4);
  if (!code) return [];
  const from = today();
  const to = offsetDate(180);
  try {
    const payload = await fetchEdinetPayload(`https://edinetdb.jp/v1/calendar?from=${from}&to=${to}`, headers);
    const rows = extractEdinetArray(payload);
    const filtered = rows.filter((item) => String(item.code || item.sec_code || "").replace(/\D/g, "").startsWith(code));
    if (filtered.length) return filtered;
  } catch {}

  try {
    const response = await fetch("https://edinetdb.com/calendar");
    const html = await response.text();
    const pattern = /(\d{4}-\d{2}-\d{2})\s+.*?>([0-9A-Z]{4,5})<.*?>([^<]+)<.*?★\s+(\d{4}-\d{2}-\d{2})\s+([^<\n]+)/g;
    const matches = [...html.matchAll(pattern)].map((match) => ({
      date: match[1],
      code: match[2],
      company: match[3].trim(),
      fiscal_end: match[4],
      label: match[5].trim(),
    }));
    return matches.filter((item) => String(item.code || "").replace(/\D/g, "").startsWith(code));
  } catch {
    return [];
  }
}

function extractEdinetData(payload) {
  if (payload == null) return null;
  if (Array.isArray(payload)) return payload;
  if (payload.data !== undefined) return payload.data;
  return payload;
}

function extractEdinetArray(payload) {
  const data = extractEdinetData(payload);
  return Array.isArray(data) ? data : [];
}

async function fetchYahooPriceSeries(ticker) {
  if (!ticker) return [];
  try {
    const quotePageSeries = await fetchYahooQuotePagePriceSeries(ticker);
    if (quotePageSeries.length) return quotePageSeries;
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      try {
        const response = await fetch(`https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d&includePrePost=false&events=div%2Csplits`);
        const payload = await response.json();
        const result = payload?.chart?.result?.[0];
        const timestamps = result?.timestamp || [];
        const closes = result?.indicators?.quote?.[0]?.close || [];
        const chartSeries = timestamps.map((stamp, index) => ({
          date: new Date(stamp * 1000).toISOString().slice(0, 10),
          close: Number(closes[index]),
        })).filter((item) => item.date && Number.isFinite(item.close));
        if (chartSeries.length) return chartSeries;
      } catch {
        continue;
      }
    }
    for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
      try {
        const response = await fetch(`https://${host}/v7/finance/spark?symbols=${encodeURIComponent(ticker)}&range=1y&interval=1d&indicators=close&includeTimestamps=true`);
        const payload = await response.json();
        const result = payload?.spark?.result?.[0]?.response?.[0] || payload?.spark?.result?.[0];
        const timestamps = result?.timestamp || [];
        const closes = result?.indicators?.quote?.[0]?.close || result?.close || [];
        const sparkSeries = timestamps.map((stamp, index) => ({
          date: new Date(stamp * 1000).toISOString().slice(0, 10),
          close: Number(closes[index]),
        })).filter((item) => item.date && Number.isFinite(item.close));
        if (sparkSeries.length) return sparkSeries;
      } catch {
        continue;
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function fetchGoogleNewsItems(companyName, ticker) {
  const quotePageNews = await fetchYahooQuotePageNewsItems(ticker);
  if (quotePageNews.length) return quotePageNews;
  if (!companyName && !ticker) return [];
  try {
    const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent([companyName, ticker].filter(Boolean).join(" OR "))}&hl=ja&gl=JP&ceid=JP:ja`);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return Array.from(doc.querySelectorAll("item")).slice(0, 10).map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      source: item.querySelector("source")?.textContent?.trim() || "",
      published_at: normalizeNewsDate(item.querySelector("pubDate")?.textContent?.trim() || ""),
    })).filter((item) => item.title && item.link);
  } catch {
    return [];
  }
}

async function fetchYahooNewsItems(ticker) {
  if (!ticker) return [];
  try {
    const response = await fetch(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=ja-JP`);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    return Array.from(doc.querySelectorAll("item")).slice(0, 10).map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      source: "Yahoo Finance",
      published_at: normalizeNewsDate(item.querySelector("pubDate")?.textContent?.trim() || ""),
    })).filter((item) => item.title && item.link);
  } catch {
    return [];
  }
}

async function fetchYahooQuotePagePriceSeries(ticker) {
  try {
    const state = await fetchYahooQuotePageState(ticker);
    return extractYahooQuotePriceSeries(state);
  } catch {
    return [];
  }
}

async function fetchYahooQuotePageNewsItems(ticker) {
  try {
    const state = await fetchYahooQuotePageState(ticker);
    return extractYahooQuoteNewsItems(state);
  } catch {
    return [];
  }
}

async function fetchYahooQuotePageState(ticker) {
  const response = await fetch(`https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}`, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });
  const html = await response.text();
  const match = html.match(/window\.__PRELOADED_STATE__\s*=\s*(\{.*?\})\s*;\s*<\/script>/s);
  if (!match) return null;
  return JSON.parse(match[1]);
}

function extractYahooQuotePriceSeries(state) {
  const histories = Array.isArray(state?.mainItemDetailChartSetting?.timeSeriesData?.histories)
    ? state.mainItemDetailChartSetting.timeSeriesData.histories
    : Array.isArray(state?.mainYJChart?.chartInfo?.data)
      ? state.mainYJChart.chartInfo.data
      : [];
  return histories.map((item) => {
    const base = String(item.baseDatetime || item.date || "");
    return {
      date: base.slice(0, 10),
      close: Number(item.closePrice ?? item.close ?? item.value),
    };
  }).filter((item) => item.date && Number.isFinite(item.close))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function extractYahooQuoteNewsItems(state) {
  const updatedAt = normalizeNewsDate(state?.symbolTopics?.updatedAtDateTime || state?.pageInfo?.currentDateTime || "");
  const sources = (Array.isArray(state?.symbolTopics?.topics) ? state.symbolTopics.topics : [])
    .flatMap((topic) => Array.isArray(topic?.sources) ? topic.sources : []);
  const unique = new Map();
  for (const source of sources) {
    const link = String(source?.url || "").trim();
    const title = String(source?.title || "").replace(/^ニュース\s*-\s*/, "").trim();
    if (!link || !title || unique.has(link)) continue;
    unique.set(link, {
      title,
      link,
      source: extractYahooSourceLabel(source?.note),
      published_at: updatedAt,
    });
  }
  return [...unique.values()].slice(0, 10);
}

function extractYahooSourceLabel(note) {
  const value = String(note || "").trim();
  const match = value.match(/（(.+?)）/);
  if (match) return match[1];
  return value || "Yahoo!ファイナンス";
}

function extractYahooQuoteNextEarningsDate(state) {
  const message = String(state?.mainStocksPressReleaseSchedule?.pressReleaseScheduleMessage || "").trim();
  const match = message.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function mergeCalendarEntries(items, nextEarningsDate, company, input) {
  const rows = Array.isArray(items) ? [...items] : [];
  if (nextEarningsDate && !rows.some((item) => String(item.date || item.announcement_date || "") === nextEarningsDate)) {
    rows.push({
      date: nextEarningsDate,
      code: company?.sec_code || input?.secCode || "",
      company: company?.name || input?.name || "",
      label: "next-earnings",
      fiscal_end: company?.fiscal_year_end || "",
    });
  }
  return rows;
}

function renderFinancialChart(rowsInput, metric, mode) {
  const rows = [...rowsInput].slice(0, 12).reverse();
  const values = rows.flatMap((item) => [getRowMetric(item, metric, true, mode), getRowMetric(item, metric, false, mode)]).filter(Number.isFinite);
  if (!values.length) return `<div class="summary-card">表示できるデータがありません。</div>`;
  const width = 720;
  const height = 220;
  const padding = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = rows.map((item, index) => ({
    x: padding + ((width - padding * 2) * index) / Math.max(rows.length - 1, 1),
    label: item.label,
    actual: getRowMetric(item, metric, true, mode),
    forecast: getRowMetric(item, metric, false, mode),
  }));
  const actualPoints = coords.filter((item) => Number.isFinite(item.actual)).map((item) => `${item.x},${chartY(item.actual, min, range, height, padding)}`).join(" ");
  const forecastPoints = coords.filter((item) => Number.isFinite(item.forecast)).map((item) => `${item.x},${chartY(item.forecast, min, range, height, padding)}`).join(" ");
  return `
    <svg viewBox="0 0 ${width} ${height}" class="price-chart" role="img" aria-label="四半期推移チャート">
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(255,255,255,0.48)"></rect>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(67,52,31,0.18)"></line>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(67,52,31,0.18)"></line>
      ${actualPoints ? `<polyline fill="none" stroke="#0d5b52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${actualPoints}"></polyline>` : ""}
      ${forecastPoints ? `<polyline fill="none" stroke="#b87512" stroke-width="3" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round" points="${forecastPoints}"></polyline>` : ""}
      ${coords.map((item) => renderChartPoint(item, min, range, height, padding, metric, mode)).join("")}
      <text x="${padding}" y="${height - 4}" fill="#6d5d4b" font-size="12">${escapeHtml(rows[0]?.label || "")}</text>
      <text x="${width - padding}" y="${height - 4}" fill="#6d5d4b" font-size="12" text-anchor="end">${escapeHtml(rows.at(-1)?.label || "")}</text>
    </svg>
  `;
}

function renderPriceChart(series) {
  const width = 720;
  const height = 220;
  const padding = 24;
  const values = series.map((item) => item.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const dots = series.map((item, index) => {
    const x = padding + ((width - padding * 2) * index) / Math.max(series.length - 1, 1);
    const y = chartY(item.close, min, range, height, padding);
    return {
      x,
      y,
      date: item.date,
      close: item.close,
    };
  });
  const points = dots.map((item) => `${item.x},${item.y}`).join(" ");
  return `
    <svg viewBox="0 0 ${width} ${height}" class="price-chart" role="img" aria-label="株価推移">
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(255,255,255,0.48)"></rect>
      <polyline fill="none" stroke="#0d5b52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}"></polyline>
      ${dots.map((item) => `<circle cx="${item.x}" cy="${item.y}" r="4" fill="#0d5b52" data-point-tooltip="${escapeHtml(`${formatDate(item.date)} / 株価 ${formatNumber(item.close)} 円`)}"><title>${escapeHtml(`${formatDate(item.date)} / 株価 ${formatNumber(item.close)} 円`)}</title></circle>`).join("")}
      <text x="${padding}" y="${padding}" fill="#6d5d4b" font-size="12">${escapeHtml(`${formatNumber(max)} 円`)}</text>
      <text x="${padding}" y="${height - 6}" fill="#6d5d4b" font-size="12">${escapeHtml(`${formatNumber(min)} 円`)}</text>
    </svg>
  `;
}

function getRowMetric(row, metric, actual, mode) {
  if (actual) {
    const value = row.actual?.[metric];
    if (!Number.isFinite(value)) return null;
    if (metric === "eps") return value;
    if (row.actual?.source_type === "tdnet") return value;
    return value / 1000000;
  }
  const raw = mode === "annual"
    ? row.forecast?.[metric]
    : metric === "eps"
      ? row.forecast?.eps
      : row.forecast?.[`${metric}_mn`];
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function chartY(value, min, range, height, padding) {
  return height - padding - ((value - min) / range) * (height - padding * 2);
}

function renderChartPoint(item, min, range, height, padding, metric, mode) {
  const actualLabel = Number.isFinite(item.actual) ? `${item.label} / 実績 ${formatTooltipMetric(item.actual, metric, mode)}` : "";
  const forecastLabel = Number.isFinite(item.forecast) ? `${item.label} / 予想 ${formatTooltipMetric(item.forecast, metric, mode)}` : "";
  return `
    ${Number.isFinite(item.actual) ? `<circle cx="${item.x}" cy="${chartY(item.actual, min, range, height, padding)}" r="4.5" fill="#0d5b52" data-point-tooltip="${escapeHtml(actualLabel)}"><title>${escapeHtml(actualLabel)}</title></circle>` : ""}
    ${Number.isFinite(item.forecast) ? `<circle cx="${item.x}" cy="${chartY(item.forecast, min, range, height, padding)}" r="4.5" fill="#b87512" data-point-tooltip="${escapeHtml(forecastLabel)}"><title>${escapeHtml(forecastLabel)}</title></circle>` : ""}
  `;
}

function renderQuarterDetail(company, bucket) {
  const links = buildQuarterLinks(company, bucket);
  return `
    <div class="stack">
      <div class="summary-card"><strong>${escapeHtml(bucket.label)}</strong><div class="table-subline">${renderBadges(bucket)}</div></div>
      <div class="metric-strip">
        ${renderMetricChip("売上高", renderDetailMetric(bucket.actual, "revenue", bucket.forecast?.revenue_mn, true))}
        ${renderMetricChip("営業利益", renderDetailMetric(bucket.actual, "operating_income", bucket.forecast?.operating_income_mn, true))}
        ${renderMetricChip("当期利益", renderDetailMetric(bucket.actual, "net_income", bucket.forecast?.net_income_mn, true))}
        ${renderMetricChip("EPS", renderDetailMetric(bucket.actual, "eps", bucket.forecast?.eps, false))}
      </div>
      <div class="summary-card"><strong>資料リンク</strong><div class="document-list">${links.length ? links.map((item) => `<a class="inline-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join("") : `<span class="dim">リンクが見つかっていません。</span>`}</div></div>
      ${bucket.forecast?.note ? `<div class="summary-card"><strong>予想メモ</strong><div>${escapeHtml(bucket.forecast.note)}</div></div>` : ""}
      ${bucket.forecast ? `<div class="button-row"><button class="ghost tiny" data-action="delete-forecast" data-id="${escapeHtml(bucket.forecast.id)}" type="button">この予想を削除</button></div>` : ""}
    </div>
  `;
}

function buildQuarterLinks(company, bucket) {
  const links = [];
  if (bucket.tdnet?.pdf_url) links.push({ label: "決算短信 PDF", url: bucket.tdnet.pdf_url });
  const annualMatch = company.external_snapshot.annual_financials.find((item) => Number(item.fiscal_year) === Number(bucket.fiscal_year) && item.edinet_filing_url);
  if (annualMatch?.edinet_filing_url) links.push({ label: "有価証券報告書", url: annualMatch.edinet_filing_url });
  links.push({ label: "決算説明資料を検索", url: `https://www.google.com/search?q=${encodeURIComponent(`${company.name} ${bucket.label} 決算説明資料`)}` });
  return links.filter((item, index, arr) => arr.findIndex((candidate) => candidate.url === item.url) === index);
}

function renderQuarterLinkSummary(company, bucket) {
  const links = buildQuarterLinks(company, bucket);
  return links.length ? `<div class="link-row">${links.slice(0, 2).map((item) => `<a class="inline-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join("")}</div>` : `<span class="dim">なし</span>`;
}

function renderAnnualLinkSummary(company, row) {
  const links = [];
  if (row.tdnet?.pdf_url) links.push({ label: "決算短信 PDF", url: row.tdnet.pdf_url });
  const annual = company.external_snapshot.annual_financials.find((item) => Number(item.fiscal_year) === Number(row.fiscal_year) && item.edinet_filing_url);
  if (annual?.edinet_filing_url) links.push({ label: "有価証券報告書", url: annual.edinet_filing_url });
  return links.length ? `<div class="link-row">${links.map((item) => `<a class="inline-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join("")}</div>` : `<span class="dim">なし</span>`;
}

function renderNewsList(items) {
  if (!items.length) return `<div class="empty">ニュースはまだ取得されていません。</div>`;
  return items.slice(0, 10).map((item) => `
    <article class="summary-card">
      <strong><a class="inline-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.title)}</a></strong>
      <div class="company-meta">${escapeHtml(formatDateTime(item.published_at))}${item.source ? ` · ${escapeHtml(item.source)}` : ""}</div>
    </article>
  `).join("");
}

function extractValuationSnapshot(company) {
  const latestRatio = company.external_snapshot.ratios[0] || {};
  return {
    per: formatRatioField(latestRatio, ["per"]),
    pbr: formatRatioField(latestRatio, ["pbr"]),
    evEbitda: formatRatioField(latestRatio, ["ev_ebitda", "evToEbitda"]),
    dividendYield: formatPercentField(latestRatio, ["dividend_yield", "yield"]),
    marketCap: formatMoneyField(latestRatio, ["market_cap", "marketcap"]),
    enterpriseValue: formatMoneyField(latestRatio, ["enterprise_value", "ev"]),
  };
}

function renderValuationHistoryTable(rows) {
  if (!rows.length) return `<div class="empty">バリュエーション時系列はまだありません。</div>`;
  const visible = rows.slice(0, 6);
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>期</th>
            <th>PER</th>
            <th>PBR</th>
            <th>EV/EBITDA</th>
            <th>配当利回り</th>
            <th>時価総額</th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((row) => `
            <tr>
              <td>${escapeHtml(`${displayFiscalYear(row) || "-"}${row.fiscal_year ? `/${row.fiscal_year_end_month || 3}月期` : ""}`)}</td>
              <td>${escapeHtml(formatRatioField(row, ["per"]))}</td>
              <td>${escapeHtml(formatRatioField(row, ["pbr"]))}</td>
              <td>${escapeHtml(formatRatioField(row, ["ev_ebitda", "evToEbitda"]))}</td>
              <td>${escapeHtml(formatPercentField(row, ["dividend_yield", "yield"]))}</td>
              <td>${escapeHtml(formatMoneyField(row, ["market_cap", "marketcap"]))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMetricChip(label, value) {
  return `<div class="summary-card"><strong>${escapeHtml(label)}</strong><div>${value}</div></div>`;
}

function renderSummaryCard(label, value) {
  return `<div class="summary-card"><strong>${escapeHtml(label)}</strong><div>${escapeHtml(value)}</div></div>`;
}

function renderMetricPair(actualRecord, metric, forecastValue, forecastInMillions) {
  const blocks = [];
  const actualText = formatActualMetric(actualRecord, metric);
  if (actualText !== "-") blocks.push(`<div><span class="badge badge-actual">実績</span> ${escapeHtml(actualText)}</div>`);
  const forecastNumber = Number(forecastValue);
  if (String(forecastValue || "").trim() && Number.isFinite(forecastNumber)) {
    const value = metric === "eps"
      ? formatYen(forecastNumber)
      : forecastInMillions
        ? formatMillions(forecastNumber * 1000000)
        : formatMillionsFromMn(forecastNumber);
    blocks.push(`<div><span class="badge badge-forecast">予想</span> ${escapeHtml(value)}</div>`);
  }
  return blocks.length ? `<div class="value-stack">${blocks.join("")}</div>` : "-";
}

function renderBadges(bucket) {
  return [bucket.actual ? `<span class="badge badge-actual">実績</span>` : "", bucket.forecast ? `<span class="badge badge-forecast">予想</span>` : "", bucket.tdnet?.pdf_url ? `<span class="badge badge-doc">資料</span>` : ""].filter(Boolean).join("");
}

function renderDetailMetric(actualRecord, metric, forecastValue, forecastInMillions) {
  const parts = [];
  const actualText = formatActualMetric(actualRecord, metric);
  if (actualText !== "-") parts.push(`実績 ${actualText}`);
  const forecastNumber = Number(forecastValue);
  if (String(forecastValue || "").trim() && Number.isFinite(forecastNumber)) {
    parts.push(`予想 ${metric === "eps" ? formatYen(forecastNumber) : forecastInMillions ? formatMillions(forecastNumber * 1000000) : formatMillionsFromMn(forecastNumber)}`);
  }
  return parts.join(" / ") || "-";
}

function formatActualMetric(actualRecord, metric) {
  if (!actualRecord) return "-";
  const value = Number(actualRecord[metric]);
  if (!Number.isFinite(value)) return "-";
  if (metric === "eps") return formatYen(value);
  return actualRecord.source_type === "tdnet" ? formatMillionsFromMn(value) : formatMillions(value);
}

function renderMonthOptions(selected) {
  return Array.from({ length: 12 }, (_, index) => String(index + 1)).map((month) => `<option value="${month}" ${String(selected) === month ? "selected" : ""}>${month}月</option>`).join("");
}

function renderQuarterOptions(selected) {
  return ["1", "2", "3", "4"].map((quarter) => `<option value="${quarter}" ${String(selected) === quarter ? "selected" : ""}>${quarter}Q</option>`).join("");
}

function renderStatusSelect(selected) {
  return `<select name="status"><option value="追跡" ${selected === "追跡" ? "selected" : ""}>追跡</option><option value="重点" ${selected === "重点" ? "selected" : ""}>重点</option><option value="再確認" ${selected === "再確認" ? "selected" : ""}>再確認</option></select>`;
}

function formatQuarterUpdate(bucket) {
  if (bucket.actual?.submit_date) return formatDate(bucket.actual.submit_date);
  if (bucket.tdnet?.disclosure_date) return formatDate(bucket.tdnet.disclosure_date);
  if (bucket.forecast) return "手入力";
  return "-";
}

function quarterKey(item) {
  return `${Number(item.fiscal_year || 0)}-${Number(item.fiscal_year_end_month || 3)}-${Number(item.quarter || 0)}`;
}

function quarterLabel(item) {
  return `${displayFiscalYear(item)}/${Number(item.fiscal_year_end_month || 3)}月期 ${Number(item.quarter || 0)}Q`;
}

function compareQuarterDesc(left, right) {
  const a = [Number(left.fiscal_year || 0), Number(left.fiscal_year_end_month || 3), Number(left.quarter || 0)];
  const b = [Number(right.fiscal_year || 0), Number(right.fiscal_year_end_month || 3), Number(right.quarter || 0)];
  if (a[0] !== b[0]) return b[0] - a[0];
  if (a[1] !== b[1]) return b[1] - a[1];
  return b[2] - a[2];
}

function getSelectedCompany() {
  return state.companies.find((item) => item.id === state.selectedCompanyId) || null;
}

function loadConfig() {
  try {
    return { ...DEFAULT_CONFIG, ...(JSON.parse(localStorage.getItem(LOCAL_CONFIG_KEY) || "{}") || {}) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  localStorage.setItem(LOCAL_CONFIG_KEY, JSON.stringify(state.config));
}

function loadUiState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_UI_KEY) || "{}") || {};
    return {
      activeTab: parsed.activeTab || "overview",
      earningsView: parsed.earningsView || "quarterly",
      selectedQuarterKeys: parsed.selectedQuarterKeys || {},
    };
  } catch {
    return { activeTab: "overview", earningsView: "quarterly", selectedQuarterKeys: {} };
  }
}

function saveUiState() {
  localStorage.setItem(LOCAL_UI_KEY, JSON.stringify(state.ui));
}

function applyConfigToInputs() {
  if (el.supabaseUrlInput) el.supabaseUrlInput.value = state.config.supabaseUrl || "";
  if (el.supabaseAnonKeyInput) el.supabaseAnonKeyInput.value = state.config.supabaseAnonKey || "";
  if (el.edinetApiKeyInput) el.edinetApiKeyInput.value = state.config.edinetApiKey || "";
}

function applyUiInputs() {
  if (el.companySearchInput) el.companySearchInput.value = "";
  if (el.statusFilterSelect) el.statusFilterSelect.value = state.statusFilter;
}

function openSettingsDialog() {
  syncConfigFromInputs();
  applyConfigToInputs();
  openDialog(el.settingsDialog);
  closeSidebar();
}

function syncConfigFromInputs() {
  state.config.supabaseUrl = String(el.supabaseUrlInput?.value || "").trim();
  state.config.supabaseAnonKey = String(el.supabaseAnonKeyInput?.value || "").trim();
  state.config.edinetApiKey = String(el.edinetApiKeyInput?.value || "").trim();
  saveConfig();
}

function setConfigStatus(message, isError) {
  if (!el.supabaseConfigStatus) return;
  el.supabaseConfigStatus.textContent = message;
  el.supabaseConfigStatus.style.color = isError ? "#9f4134" : "";
}

function setAuthStatus(message, isError) {
  if (!el.authStatus) return;
  el.authStatus.textContent = message;
  el.authStatus.style.color = isError ? "#9f4134" : "";
}

function toggleSidebar() {
  el.sidebar?.classList.toggle("open");
  if (el.sidebarScrim) el.sidebarScrim.hidden = !el.sidebar?.classList.contains("open");
}

function closeSidebar() {
  el.sidebar?.classList.remove("open");
  if (el.sidebarScrim) el.sidebarScrim.hidden = true;
}

function openDialog(dialog) {
  if (!dialog) return;
  if (dialog.open) return;
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
    return;
  }
  dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  if (!dialog) return;
  if (typeof dialog.close === "function") {
    dialog.close();
    return;
  }
  dialog.removeAttribute("open");
}

function setFormValue(name, value) {
  const field = el.companyForm?.elements?.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    field.value = value || "";
  }
}

function unsubscribeAuth() {
  const subscription = state.authSubscription?.data?.subscription || state.authSubscription?.subscription || null;
  subscription?.unsubscribe?.();
  state.authSubscription = null;
}

function showHoverTooltip(text, x, y) {
  if (!text) return;
  if (!state.hoverTooltip) {
    const node = document.createElement("div");
    node.className = "chart-tooltip";
    document.body.appendChild(node);
    state.hoverTooltip = node;
  }
  state.hoverTooltip.textContent = text;
  state.hoverTooltip.hidden = false;
  state.hoverTooltip.style.left = `${x + 14}px`;
  state.hoverTooltip.style.top = `${y + 14}px`;
}

function hideHoverTooltip() {
  if (!state.hoverTooltip) return;
  state.hoverTooltip.hidden = true;
}

function handleFatalError(error) {
  console.error(error);
  setConfigStatus(`初期化に失敗しました: ${getErrorMessage(error)}`, true);
  setAuthStatus("ページを再読み込みしてもう一度試してください。", true);
  render();
}

async function ensureSupabaseClientFactory() {
  if (supabaseCreateClient) return supabaseCreateClient;
  const module = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  supabaseCreateClient = module.createClient;
  return supabaseCreateClient;
}

function inferFiscalYearEndMonth(company) {
  return Number(company?.fiscal_year_end_month || company?.accounting_period_end_month || 3) || 3;
}

function getFiscalYearFromEnd(value) {
  const date = parseDate(value);
  return date ? date.getUTCFullYear() : 0;
}

function getMonthFromDate(value) {
  const date = parseDate(value);
  return date ? date.getUTCMonth() + 1 : 0;
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed : null;
}

function parseQuarter(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return 0;
  if (raw === "FY" || raw === "Q4" || raw === "4Q" || raw === "YEAR") return 4;
  const match = raw.match(/([1-4])/);
  return match ? Number(match[1]) : Number(raw) || 0;
}

function inferFiscalYearFromQuarter(item) {
  if (item.fiscal_year) return Number(item.fiscal_year);
  const disclosure = parseDate(item.disclosure_date);
  const endMonth = Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || 3);
  if (!disclosure) return 0;
  const month = disclosure.getUTCMonth() + 1;
  let endYear = disclosure.getUTCFullYear();
  if (month > endMonth) endYear += 1;
  return endMonth === 12 ? endYear : endYear - 1;
}

function displayFiscalYear(item) {
  const raw = Number(item.fiscal_year || 0);
  return raw || 0;
}

function normalizeNewsDate(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.toISOString() : "";
}

function formatDate(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleDateString("ja-JP") : "-";
}

function formatDateTime(value) {
  const parsed = parseDate(value);
  return parsed ? parsed.toLocaleString("ja-JP") : "-";
}

function formatNumber(value) {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatMillions(value) {
  if (!Number.isFinite(Number(value))) return "-";
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(Number(value) / 1000000)} 百万円`;
}

function formatMillionsFromMn(value) {
  if (!Number.isFinite(Number(value))) return "-";
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(Number(value))} 百万円`;
}

function formatYen(value) {
  return Number.isFinite(Number(value)) ? `${formatNumber(value)} 円` : "-";
}

function formatTooltipMetric(value, metric, mode) {
  if (metric === "eps") return formatYen(value);
  return mode === "annual" ? formatMillionsFromMn(value) : formatMillionsFromMn(value);
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatTimes(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}x` : "-";
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function findMetricValue(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]) !== "") return row[key];
  }
  const lowered = Object.keys(row).map((key) => ({ key, lower: key.toLowerCase() }));
  for (const candidate of lowered) {
    if (keys.some((key) => candidate.lower === key.toLowerCase() || candidate.lower.includes(key.toLowerCase()))) {
      return row[candidate.key];
    }
  }
  return null;
}

function formatRatioField(row, keys) {
  const value = toNumberOrNull(findMetricValue(row, keys));
  return Number.isFinite(value) ? `${value.toFixed(2)}x` : "-";
}

function formatPercentField(row, keys) {
  const value = toNumberOrNull(findMetricValue(row, keys));
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "-";
}

function formatMoneyField(row, keys) {
  const value = toNumberOrNull(findMetricValue(row, keys));
  return Number.isFinite(value) ? formatMillionsFromMn(value) : "-";
}

function stringOrNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function defaultRights() {
  return {
    edinetdb_note: "個人利用前提です。公開用途へ広げる前には EDINET DB の規約本文を確認してください。",
    price_note: "Yahoo Finance 系データは personal use only 前提です。",
  };
}

function getErrorMessage(error) {
  return error?.message || "不明なエラーが発生しました。";
}

function uid(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function toYahooTicker(secCode) {
  const code = String(secCode || "").replace(/\D/g, "").slice(0, 4);
  return code ? `${code}.T` : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
