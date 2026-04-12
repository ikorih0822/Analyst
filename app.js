import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const LOCAL_CONFIG_KEY = "jp-research-cockpit-config-v1";
const LOCAL_UI_KEY = "jp-research-cockpit-ui-v1";
const DEFAULT_CONFIG = {
  supabaseUrl: "https://kucwkuskoqwdtvmewtik.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Y3drdXNrb3F3ZHR2bWV3dGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTA1MzcsImV4cCI6MjA5MTUyNjUzN30.RReLIipWvYwO4qx3UBUbIFMD3E7EiuRfvdllUURCGp4",
  edinetApiKey: "",
};
const DEFAULT_SCORECARD = { quality: 3, momentum: 3, valuation: 3, management: 3 };
const DEFAULT_FORECAST = { revenue_mn: "", operating_income_mn: "", eps: "", note: "" };
const DEFAULT_VALUATION = { bull: "", base: "", bear: "", memo: "", price_source_note: "" };

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
  signInButton: document.querySelector("#signInButton"),
  signUpButton: document.querySelector("#signUpButton"),
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

boot();

async function boot() {
  applyConfigToInputs();
  wireEvents();
  await initSupabase();
  render();
}

function wireEvents() {
  el.saveSupabaseConfigButton.addEventListener("click", async () => {
    syncConfigFromInputs();
    setConfigStatus("接続確認中...", false);
    await initSupabase();
    render();
  });

  el.menuToggleButton?.addEventListener("click", toggleSidebar);
  el.closeSidebarButton?.addEventListener("click", closeSidebar);
  el.sidebarScrim?.addEventListener("click", closeSidebar);
  el.settingsButton?.addEventListener("click", openSettingsDialog);
  el.closeSettingsDialogButton?.addEventListener("click", () => el.settingsDialog.close());

  el.signInButton.addEventListener("click", signIn);
  el.signUpButton.addEventListener("click", signUp);
  el.signOutButton.addEventListener("click", signOut);

  el.importSearchButton.addEventListener("click", () => searchImportCandidates());
  el.importSearchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchImportCandidates();
    }
  });

  el.companySearchInput.addEventListener("input", (event) => {
    state.companySearch = event.target.value.trim().toLowerCase();
    renderCompanyList();
  });

  el.statusFilterSelect.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderCompanyList();
  });

  el.tabBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button) return;
    state.ui.activeTab = button.dataset.tab;
    saveUiState();
    renderTabs();
    renderWorkspace();
  });

  el.exportButton.addEventListener("click", exportCompanies);
  el.syncCompanyButton.addEventListener("click", syncSelectedCompany);
  el.newCompanyButton.addEventListener("click", () => openCompanyDialog());
  el.closeCompanyDialogButton.addEventListener("click", () => el.companyDialog.close());

  el.companyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveCompanyFromDialog();
  });

  document.addEventListener("click", async (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) return;

    const { action: type, id, edinetCode } = action.dataset;

    if (type === "select-company") {
      state.selectedCompanyId = id;
      closeSidebar();
      render();
      return;
    }

    if (type === "import-company") {
      await importCompany(edinetCode);
      return;
    }

    if (type === "delete-company") {
      await deleteSelectedCompany();
      return;
    }

    if (type === "edit-company") {
      openCompanyDialog(id);
      return;
    }

    if (type === "delete-note") {
      await removeItemFromSelected("research_notes", id);
      return;
    }

    if (type === "delete-question") {
      await removeItemFromSelected("open_questions", id);
      return;
    }

    if (type === "toggle-question") {
      await toggleQuestion(id);
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const formType = form.dataset.form;
    if (!formType) return;

    event.preventDefault();

    if (formType === "overview") await saveOverviewForm(form);
    if (formType === "forecast") await saveForecastForm(form);
    if (formType === "valuation") await saveValuationForm(form);
    if (formType === "note") await saveNoteForm(form);
    if (formType === "question") await saveQuestionForm(form);
  });
}

async function initSupabase() {
  const { supabaseUrl, supabaseAnonKey } = state.config;

  if (!supabaseUrl || !supabaseAnonKey) {
    state.supabase = null;
    state.session = null;
    state.companies = [];
    setConfigStatus("Supabase URL と anon key を入力してください。", true);
    setAuthStatus("設定保存後にログインできます。", false);
    return;
  }

  try {
    state.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });

    const {
      data: { session },
      error,
    } = await state.supabase.auth.getSession();

    if (error) throw error;

    state.session = session;
    if (state.authSubscription) {
      const subscription =
        state.authSubscription?.data?.subscription
        || state.authSubscription?.subscription
        || null;
      subscription?.unsubscribe?.();
    }
    state.authSubscription = state.supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      state.session = nextSession;
      if (nextSession) {
        await loadCompanies();
      } else {
        state.companies = [];
        state.selectedCompanyId = null;
      }
      render();
    });

    setConfigStatus("Supabase へ接続できました。", false);

    if (session) {
      setAuthStatus(`ログイン中: ${session.user.email}`, false);
      await loadCompanies();
    } else {
      state.companies = [];
      state.selectedCompanyId = null;
      setAuthStatus("ログインしてデータを読み込んでください。", false);
    }
  } catch (error) {
    state.supabase = null;
    state.session = null;
    state.companies = [];
    setConfigStatus(getErrorMessage(error), true);
  }
}

async function signUp() {
  syncConfigFromInputs();
  await initSupabase();
  if (!state.supabase) {
    setAuthStatus("設定を確認してください。", true);
    return;
  }

  try {
    setAuthStatus("登録処理中...", false);
    const { error } = await state.supabase.auth.signUp({
      email: el.emailInput.value.trim(),
      password: el.passwordInput.value,
    });
    if (error) throw error;
    setAuthStatus("新規登録を送信しました。メール確認が必要なら受信箱を確認してください。", false);
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function signIn() {
  syncConfigFromInputs();
  await initSupabase();
  if (!state.supabase) {
    setAuthStatus("設定を確認してください。", true);
    return;
  }

  try {
    setAuthStatus("ログイン中...", false);
    const { error, data } = await state.supabase.auth.signInWithPassword({
      email: el.emailInput.value.trim(),
      password: el.passwordInput.value,
    });
    if (error) throw error;
    state.session = data.session;
    setAuthStatus(`ログイン中: ${data.user.email}`, false);
    if (el.settingsDialog?.open) el.settingsDialog.close();
    await loadCompanies();
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function signOut() {
  if (!state.supabase) return;
  await state.supabase.auth.signOut();
  state.companies = [];
  state.selectedCompanyId = null;
  render();
}

async function loadCompanies() {
  if (!state.supabase || !state.session) return;

  const { data, error } = await state.supabase
    .from("research_companies")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    setAuthStatus(getErrorMessage(error), true);
    return;
  }

  state.companies = (data || []).map(normalizeCompanyRow);
  if (!state.selectedCompanyId || !state.companies.find((item) => item.id === state.selectedCompanyId)) {
    state.selectedCompanyId = state.companies[0]?.id || null;
  }
}
async function searchImportCandidates() {
  const query = el.importSearchInput.value.trim();
  if (!query) return;

  state.importLoading = true;
  renderImportResults();

  try {
    const response = await fetch(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=8`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || "EDINET DB の検索に失敗しました。");
    state.importResults = Array.isArray(payload.data) ? payload.data : [];
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
    setAuthStatus("ログイン後に企業を取り込んでください。", true);
    return;
  }

  try {
    setAuthStatus("EDINET データを取得しています...", false);
    const payload = await fetchExternalData({ edinetCode });
    const candidate = buildCompanyFromExternal(payload);
    const existing = state.companies.find((item) => item.edinet_code === candidate.edinet_code);
    const row = existing ? { ...candidate, id: existing.id } : candidate;

    const { data, error } = await state.supabase
      .from("research_companies")
      .upsert(row)
      .select()
      .single();

    if (error) throw error;

    const normalized = normalizeCompanyRow(data);
    state.companies = [normalized, ...state.companies.filter((item) => item.id !== normalized.id)];
    state.selectedCompanyId = normalized.id;
    setAuthStatus(`${normalized.name} を取り込みました。`, false);
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function syncSelectedCompany() {
  const company = getSelectedCompany();
  if (!company) return;
  if (!company.edinet_code) {
    setAuthStatus("この企業には EDINET コードが設定されていません。", true);
    return;
  }

  try {
    setAuthStatus(`${company.name} を再同期しています...`, false);
    const payload = await fetchExternalData({ edinetCode: company.edinet_code, secCode: company.sec_code, name: company.name });
    const refreshed = buildCompanyFromExternal(payload, company);
    const { data, error } = await state.supabase
      .from("research_companies")
      .update(refreshed)
      .eq("id", company.id)
      .select()
      .single();

    if (error) throw error;

    const normalized = normalizeCompanyRow(data);
    state.companies = state.companies.map((item) => (item.id === normalized.id ? normalized : item));
    state.selectedCompanyId = normalized.id;
    setAuthStatus(`${company.name} を再同期しました。`, false);
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function fetchExternalData(input) {
  if (!state.config.edinetApiKey) {
    throw new Error("EDINET DB API Key を入力してください。");
  }

  const edinetCode = input.edinetCode || (await resolveEdinetCode(input));
  if (!edinetCode) throw new Error("EDINET コードを特定できませんでした。");

  const headers = { "X-API-Key": state.config.edinetApiKey };
  const [company, annualFinancials, quarterlyFinancials, ratios, analysis, tdnetEarnings] = await Promise.all([
    fetchEdinetJson(`https://edinetdb.jp/v1/companies/${edinetCode}`, headers),
    fetchEdinetJson(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?years=5`, headers),
    fetchEdinetJson(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?period=quarterly&years=12`, headers),
    fetchEdinetJson(`https://edinetdb.jp/v1/companies/${edinetCode}/ratios`, headers),
    fetchEdinetJson(`https://edinetdb.jp/v1/companies/${edinetCode}/analysis`, headers),
    fetchEdinetJson(`https://edinetdb.jp/v1/companies/${edinetCode}/earnings?limit=8`, headers),
  ]);

  const priceSeries = await fetchYahooPriceSeries(toYahooTicker(company?.sec_code || input.secCode || ""));

  return {
    company,
    annual_financials: Array.isArray(annualFinancials) ? annualFinancials : [],
    quarterly_financials: Array.isArray(quarterlyFinancials) ? quarterlyFinancials : [],
    ratios: Array.isArray(ratios) ? ratios : [],
    analysis: analysis || {},
    tdnet_earnings: Array.isArray(tdnetEarnings) ? tdnetEarnings : [],
    price_series: priceSeries,
    rights: {
      edinetdb_note: "あなた個人がログインして利用する前提で使用しています。再配布用途へ広げる前には規約本文の確認を推奨します。",
      price_note: "Yahoo Finance 系データは personal use only 前提です。このアプリはあなた個人が PC とスマホで参照する用途に寄せています。",
    },
  };
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
  el.tabBar.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.ui.activeTab);
  });
}

function renderImportResults() {
  if (state.importLoading) {
    el.importResults.innerHTML = `<div class="result-card"><strong>検索中</strong><div class="dim">EDINET DB から候補を探しています。</div></div>`;
    return;
  }

  if (!state.importResults.length) {
    el.importResults.innerHTML = "";
    return;
  }

  el.importResults.innerHTML = state.importResults
    .map((item) => `
      <article class="result-card">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="company-meta mono">${escapeHtml(item.sec_code || "")}${item.sec_code ? " / " : ""}${escapeHtml(item.edinet_code || "")}</div>
        <div class="company-meta">${escapeHtml(item.industry || "")}</div>
        <div class="button-row">
          <button class="tiny" data-action="import-company" data-edinet-code="${escapeHtml(item.edinet_code)}" type="button">取り込む</button>
        </div>
      </article>
    `)
    .join("");
}

function renderCompanyList() {
  const filtered = state.companies.filter((company) => {
    const haystack = `${company.sec_code} ${company.edinet_code} ${company.name} ${company.industry}`.toLowerCase();
    const queryPass = !state.companySearch || haystack.includes(state.companySearch);
    const statusPass = state.statusFilter === "all" || company.status === state.statusFilter;
    return queryPass && statusPass;
  });

  el.companyList.innerHTML = filtered.length
    ? filtered
        .map((company) => `
          <article class="company-item ${company.id === state.selectedCompanyId ? "active" : ""}" data-action="select-company" data-id="${company.id}">
            <strong>${escapeHtml(company.sec_code || company.edinet_code || "-")} · ${escapeHtml(company.name)}</strong>
            <div class="company-meta">${escapeHtml(company.industry || "業種未設定")}</div>
            <div class="company-meta">次回決算: ${formatDate(company.next_earnings)}</div>
            <div class="status-pill status-${escapeHtml(company.status)}">${escapeHtml(company.status)}</div>
          </article>
        `)
        .join("")
    : `<div class="empty">条件に合う企業がありません。</div>`;
}

function renderDashboard() {
  if (!state.session) {
    el.dashboard.innerHTML = `<article class="metric-card"><p class="eyebrow">Status</p><div class="metric-value">0</div><div class="dim">ログイン前</div></article>`;
    return;
  }

  const openQuestions = state.companies.flatMap((item) => item.open_questions.filter((q) => q.status !== "解決"));
  const focusCount = state.companies.filter((item) => item.status === "重点").length;
  const upcoming = state.companies
    .filter((item) => item.next_earnings)
    .sort((a, b) => String(a.next_earnings).localeCompare(String(b.next_earnings)))[0];
  const lastSync = state.companies
    .map((item) => item.external_snapshot?.synced_at)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0];

  el.dashboard.innerHTML = `
    <article class="metric-card">
      <p class="eyebrow">Coverage</p>
      <div class="metric-value">${state.companies.length}</div>
      <div class="dim">登録企業数</div>
    </article>
    <article class="metric-card">
      <p class="eyebrow">Focus</p>
      <div class="metric-value">${focusCount}</div>
      <div class="dim">重点先</div>
    </article>
    <article class="metric-card">
      <p class="eyebrow">Open Questions</p>
      <div class="metric-value">${openQuestions.length}</div>
      <div class="dim">未解決論点</div>
    </article>
    <article class="metric-card">
      <p class="eyebrow">Last Sync</p>
      <div class="metric-value">${lastSync ? formatDateTime(lastSync) : "-"}</div>
      <div class="dim">自動取得更新時刻</div>
    </article>
    <article class="panel full">
      <div class="row-between">
        <h3>次に見る決算</h3>
        <span class="dim">カバレッジ内</span>
      </div>
      <div class="summary-card">
        ${upcoming ? `
          <strong>${escapeHtml(upcoming.name)}</strong>
          <div class="company-meta">${escapeHtml(upcoming.sec_code || upcoming.edinet_code || "")}</div>
          <div>予定日: ${formatDate(upcoming.next_earnings)}</div>
          <div>主要論点: ${escapeHtml(upcoming.key_debate || "未設定")}</div>
        ` : `<div class="dim">次回決算予定が登録されていません。</div>`}
      </div>
    </article>
  `;
}
function renderWorkspace() {
  const company = getSelectedCompany();

  if (!company) {
    el.workspaceTitle.textContent = state.session ? "企業を選択してください" : "ログインして調査を開始";
    el.workspaceSubtitle.textContent = state.session
      ? "左側の候補から企業を選ぶか、EDINET から取り込んでください。"
      : "接続設定とログインを済ませると、自分専用のバックエンドに保存されます。";
    el.workspaceContent.innerHTML = state.session
      ? `<div class="empty">表示する企業がまだありません。</div>`
      : `<div class="empty">表示する企業がまだありません。<div class="button-row"><button id="openSettingsInlineButton" class="ghost" type="button">設定・ログインを開く</button></div></div>`;
    document.querySelector("#openSettingsInlineButton")?.addEventListener("click", openSettingsDialog, { once: true });
    return;
  }

  el.workspaceTitle.textContent = `${company.sec_code || company.edinet_code || ""} ${company.name}`;
  el.workspaceSubtitle.textContent = `${company.industry || "業種未設定"} · 更新 ${formatDateTime(company.updated_at)} · EDINET ${company.edinet_code || "未設定"}`;

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
          <label>
            <span>投資仮説</span>
            <textarea name="thesis" rows="4">${escapeHtml(company.thesis)}</textarea>
          </label>
          <label>
            <span>バリアントビュー</span>
            <textarea name="variant_view" rows="4">${escapeHtml(company.variant_view)}</textarea>
          </label>
          <label>
            <span>主要論点</span>
            <textarea name="key_debate" rows="4">${escapeHtml(company.key_debate)}</textarea>
          </label>
          <div class="inline-grid two">
            <label>
              <span>ステータス</span>
              <select name="status">${renderOptions(["追跡", "重点", "再確認"], company.status)}</select>
            </label>
            <label>
              <span>次回決算予定</span>
              <input name="next_earnings" type="date" value="${company.next_earnings || ""}">
            </label>
          </div>
          <div class="inline-grid two">
            <label>
              <span>質</span>
              <input name="quality" type="number" min="1" max="5" value="${company.scorecard.quality}">
            </label>
            <label>
              <span>モメンタム</span>
              <input name="momentum" type="number" min="1" max="5" value="${company.scorecard.momentum}">
            </label>
            <label>
              <span>バリュエーション</span>
              <input name="valuation_score" type="number" min="1" max="5" value="${company.scorecard.valuation}">
            </label>
            <label>
              <span>経営陣</span>
              <input name="management" type="number" min="1" max="5" value="${company.scorecard.management}">
            </label>
          </div>
          <div class="button-row"><button type="submit">概要を保存</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>最新スナップショット</h3>
        <div class="metric-strip">
          ${renderMetricChip("売上高", formatMillions(company.external_snapshot?.annual_financials?.[0]?.revenue))}
          ${renderMetricChip("営業利益", formatMillions(company.external_snapshot?.annual_financials?.[0]?.operating_income))}
          ${renderMetricChip("当期利益", formatMillions(company.external_snapshot?.annual_financials?.[0]?.net_income))}
        </div>
        <div class="metric-strip">
          ${renderMetricChip("ROE", formatPercent(company.external_snapshot?.ratios?.[0]?.roe))}
          ${renderMetricChip("営業利益率", formatPercent(company.external_snapshot?.ratios?.[0]?.operating_margin))}
          ${renderMetricChip("自己資本比率", formatPercent(company.external_snapshot?.ratios?.[0]?.equity_ratio))}
        </div>
        <div class="summary-card">
          <strong>EDINET AI要約</strong>
          <div>${escapeHtml(company.external_snapshot?.analysis?.ai_summary?.text || "未取得")}</div>
        </div>
      </section>
    </div>
  `;
}

function renderEarnings(company) {
  const quarters = company.external_snapshot?.quarterly_financials || [];
  const latestTdnet = company.external_snapshot?.tdnet_earnings || [];
  const forecast = { ...DEFAULT_FORECAST, ...(company.manual_forecast || {}) };

  return `
    <div class="panel-grid">
      <section class="panel full">
        <h3>四半期実績（EDINET DB 自動取得）</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>期</th>
                <th>売上高</th>
                <th>営業利益</th>
                <th>当期利益</th>
                <th>EPS</th>
                <th>提出日</th>
              </tr>
            </thead>
            <tbody>
              ${quarters.length ? quarters.slice(0, 12).map((item) => `
                <tr>
                  <td>${escapeHtml(quarterLabel(item))}</td>
                  <td>${escapeHtml(formatMillions(item.revenue))}</td>
                  <td>${escapeHtml(formatMillions(item.operating_income))}</td>
                  <td>${escapeHtml(formatMillions(item.net_income))}</td>
                  <td>${escapeHtml(formatNumber(item.eps))}</td>
                  <td>${escapeHtml(item.submit_date || "-")}</td>
                </tr>
              `).join("") : `<tr><td colspan="6">四半期データがありません。</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <h3>次回予想（手入力）</h3>
        <form data-form="forecast" class="stack">
          <div class="inline-grid three">
            <label>
              <span>売上高予想（百万円）</span>
              <input name="revenue_mn" value="${escapeHtml(forecast.revenue_mn)}">
            </label>
            <label>
              <span>営業利益予想（百万円）</span>
              <input name="operating_income_mn" value="${escapeHtml(forecast.operating_income_mn)}">
            </label>
            <label>
              <span>EPS予想</span>
              <input name="eps" value="${escapeHtml(forecast.eps)}">
            </label>
          </div>
          <label>
            <span>メモ</span>
            <textarea name="note" rows="4">${escapeHtml(forecast.note)}</textarea>
          </label>
          <div class="button-row"><button type="submit">予想を保存</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>TDNet 最新開示</h3>
        <div class="timeline">
          ${latestTdnet.length ? latestTdnet.slice(0, 5).map((item) => `
            <div class="summary-card">
              <strong>${escapeHtml(item.title || "決算開示")}</strong>
              <div class="company-meta">${escapeHtml(item.disclosure_date || "-")} ${escapeHtml(item.disclosure_time || "")}</div>
              <div>売上高 ${escapeHtml(formatMillionsFromTdnet(item.revenue))} / 営業利益 ${escapeHtml(formatMillionsFromTdnet(item.operating_income))} / EPS ${escapeHtml(formatNumber(item.eps))}</div>
            </div>
          `).join("") : `<div class="empty">最近の TDNet 開示はありません。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderValuation(company) {
  const valuation = { ...DEFAULT_VALUATION, ...(company.manual_valuation || {}) };
  const priceSeries = company.external_snapshot?.price_series || [];
  const latestPrice = priceSeries.at(-1)?.close;
  const firstPrice = priceSeries[0]?.close;
  const priceChange = Number.isFinite(latestPrice) && Number.isFinite(firstPrice) && firstPrice !== 0
    ? ((latestPrice - firstPrice) / firstPrice) * 100
    : null;

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
        <div class="chart-placeholder">
          ${priceSeries.length ? `
            <div class="metric-strip">
              ${renderMetricChip("直近終値", formatPrice(latestPrice))}
              ${renderMetricChip("1年騰落率", formatSignedPercent(priceChange))}
              ${renderMetricChip("系列数", `${priceSeries.length} 点`)}
            </div>
            ${renderPriceChart(priceSeries)}
          ` : `
            <strong>未接続</strong>
            <p class="dim">まだ株価系列がありません。EDINET 再同期後に Yahoo Finance 系の価格データを取得します。</p>
          `}
        </div>
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
          <div class="inline-grid two">
            <label>
              <span>日付</span>
              <input name="date" type="date" value="${today()}">
            </label>
            <label>
              <span>区分</span>
              <select name="category">${renderOptions(["調査", "決算プレビュー", "決算レビュー", "面談", "チャネルチェック", "週次レビュー"], "調査")}</select>
            </label>
          </div>
          <label>
            <span>タイトル</span>
            <input name="title" required>
          </label>
          <label>
            <span>本文</span>
            <textarea name="body" rows="5"></textarea>
          </label>
          <div class="button-row"><button type="submit">ログを追加</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>保存済みログ</h3>
        <div class="timeline">
          ${company.research_notes.length ? company.research_notes.map((note) => `
            <article class="note-card">
              <div class="row-between">
                <div>
                  <strong>${escapeHtml(note.title)}</strong>
                  <div class="company-meta">${escapeHtml(note.date)} · ${escapeHtml(note.category)}</div>
                </div>
                <button class="ghost tiny" data-action="delete-note" data-id="${note.id}" type="button">削除</button>
              </div>
              <div>${escapeHtml(note.body)}</div>
            </article>
          `).join("") : `<div class="empty">調査ログはまだありません。</div>`}
        </div>
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
          <label>
            <span>論点</span>
            <textarea name="text" rows="4" required></textarea>
          </label>
          <div class="inline-grid two">
            <label>
              <span>担当</span>
              <input name="owner" value="自分">
            </label>
            <label>
              <span>状態</span>
              <select name="status">${renderOptions(["未着手", "確認中", "解決"], "未着手")}</select>
            </label>
          </div>
          <div class="button-row"><button type="submit">論点を追加</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>論点一覧</h3>
        <div class="question-list">
          ${company.open_questions.length ? company.open_questions.map((question) => `
            <article class="question-card">
              <div class="row-between">
                <strong>${escapeHtml(question.text)}</strong>
                <div class="button-row">
                  <button class="ghost tiny" data-action="toggle-question" data-id="${question.id}" type="button">状態変更</button>
                  <button class="ghost tiny" data-action="delete-question" data-id="${question.id}" type="button">削除</button>
                </div>
              </div>
              <div class="company-meta">${escapeHtml(question.owner)} · ${escapeHtml(question.status)}</div>
            </article>
          `).join("") : `<div class="empty">未解決論点はありません。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderAutoData(company) {
  const snapshot = company.external_snapshot || {};
  const annual = snapshot.annual_financials || [];
  const rights = snapshot.rights || {};

  return `
    <div class="panel-grid">
      <section class="panel">
        <h3>自動取得の中身</h3>
        <div class="timeline">
          <div class="summary-card"><strong>EDINET コード</strong><div class="mono">${escapeHtml(company.edinet_code || "未設定")}</div></div>
          <div class="summary-card"><strong>会計基準</strong><div>${escapeHtml(snapshot.company?.accounting_standard || "未取得")}</div></div>
          <div class="summary-card"><strong>データ年数</strong><div>${escapeHtml(String(snapshot.company?.data_years || annual.length || 0))}</div></div>
          <div class="summary-card"><strong>最終同期</strong><div>${escapeHtml(formatDateTime(snapshot.synced_at))}</div></div>
        </div>
      </section>
      <section class="panel">
        <h3>公開前の注意</h3>
        <div class="summary-card">
          <strong>EDINET DB</strong>
          <div>${escapeHtml(rights.edinetdb_note || "利用規約本文の再確認が必要です。少なくとも公開アプリで恒常的に再配布する場合は運営確認を推奨します。")}</div>
        </div>
        <div class="summary-card">
          <strong>株価データ</strong>
          <div>${escapeHtml(rights.price_note || "J-Quants は個人私的利用限定で、データを利用したアプリ提供は禁止と公式 FAQ に記載があります。公開用ソースは別途契約・許諾確認が必要です。")}</div>
        </div>
      </section>
    </div>
  `;
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
    manual_forecast: existing?.manual_forecast || DEFAULT_FORECAST,
    manual_valuation: existing?.manual_valuation || DEFAULT_VALUATION,
    research_notes: existing?.research_notes || [],
    open_questions: existing?.open_questions || [],
    external_snapshot: existing?.external_snapshot || {},
  };

  try {
    if (editingId) {
      const { data, error } = await state.supabase.from("research_companies").update(row).eq("id", editingId).select().single();
      if (error) throw error;
      upsertLocalCompany(data);
    } else {
      const { data, error } = await state.supabase.from("research_companies").insert(row).select().single();
      if (error) throw error;
      upsertLocalCompany(data);
    }
    el.companyDialog.close();
    setAuthStatus("企業情報を保存しました。", false);
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
}

async function saveOverviewForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const payload = {
    thesis: String(formData.get("thesis") || ""),
    variant_view: String(formData.get("variant_view") || ""),
    key_debate: String(formData.get("key_debate") || ""),
    status: String(formData.get("status") || company.status),
    next_earnings: stringOrNull(formData.get("next_earnings")),
    scorecard: {
      quality: Number(formData.get("quality") || company.scorecard.quality),
      momentum: Number(formData.get("momentum") || company.scorecard.momentum),
      valuation: Number(formData.get("valuation_score") || company.scorecard.valuation),
      management: Number(formData.get("management") || company.scorecard.management),
    },
  };
  await updateCompany(company.id, payload, "概要を保存しました。");
}

async function saveForecastForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const manual_forecast = {
    revenue_mn: String(formData.get("revenue_mn") || ""),
    operating_income_mn: String(formData.get("operating_income_mn") || ""),
    eps: String(formData.get("eps") || ""),
    note: String(formData.get("note") || ""),
  };
  await updateCompany(company.id, { manual_forecast }, "予想を保存しました。");
}

async function saveValuationForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const manual_valuation = {
    bull: String(formData.get("bull") || ""),
    base: String(formData.get("base") || ""),
    bear: String(formData.get("bear") || ""),
    memo: String(formData.get("memo") || ""),
    price_source_note: company.manual_valuation?.price_source_note || "",
  };
  await updateCompany(company.id, { manual_valuation }, "バリュエーションを保存しました。");
}
async function saveNoteForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const notes = [
    {
      id: uid("note"),
      date: String(formData.get("date") || today()),
      category: String(formData.get("category") || "調査"),
      title: String(formData.get("title") || ""),
      body: String(formData.get("body") || ""),
    },
    ...company.research_notes,
  ];
  await updateCompany(company.id, { research_notes: notes }, "調査ログを追加しました。");
  form.reset();
}

async function saveQuestionForm(form) {
  const company = getSelectedCompany();
  if (!company) return;
  const formData = new FormData(form);
  const questions = [
    {
      id: uid("question"),
      text: String(formData.get("text") || ""),
      owner: String(formData.get("owner") || "自分"),
      status: String(formData.get("status") || "未着手"),
    },
    ...company.open_questions,
  ];
  await updateCompany(company.id, { open_questions: questions }, "論点を追加しました。");
  form.reset();
}

async function removeItemFromSelected(field, id) {
  const company = getSelectedCompany();
  if (!company) return;
  const nextValue = (company[field] || []).filter((item) => item.id !== id);
  await updateCompany(company.id, { [field]: nextValue }, "更新しました。");
}

async function toggleQuestion(id) {
  const company = getSelectedCompany();
  if (!company) return;
  const nextValue = company.open_questions.map((question) => {
    if (question.id !== id) return question;
    const nextStatus = question.status === "未着手" ? "確認中" : question.status === "確認中" ? "解決" : "未着手";
    return { ...question, status: nextStatus };
  });
  await updateCompany(company.id, { open_questions: nextValue }, "論点状態を更新しました。");
}

async function deleteSelectedCompany() {
  const company = getSelectedCompany();
  if (!company) return;
  if (!confirm(`${company.name} を削除します。Supabase 上の保存データも削除されます。`)) return;

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
  const normalized = normalizeCompanyRow(row);
  state.companies = [normalized, ...state.companies.filter((item) => item.id !== normalized.id)].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  state.selectedCompanyId = normalized.id;
}

function openCompanyDialog(companyId = "") {
  el.companyForm.reset();
  delete el.companyForm.dataset.editingId;
  el.companyDialogTitle.textContent = companyId ? "企業情報を編集" : "企業を追加";

  if (companyId) {
    const company = state.companies.find((item) => item.id === companyId);
    if (company) {
      el.companyForm.dataset.editingId = company.id;
      setFormValue("sec_code", company.sec_code || "");
      setFormValue("edinet_code", company.edinet_code || "");
      setFormValue("name", company.name || "");
      setFormValue("industry", company.industry || "");
      setFormValue("status", company.status || "追跡");
      setFormValue("next_earnings", company.next_earnings || "");
      setFormValue("thesis", company.thesis || "");
      setFormValue("variant_view", company.variant_view || "");
      setFormValue("key_debate", company.key_debate || "");
    }
  }

  el.companyDialog.showModal();
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

function buildCompanyFromExternal(payload, existing = null) {
  const company = payload.company || {};
  const external_snapshot = {
    company,
    annual_financials: Array.isArray(payload.annual_financials) ? payload.annual_financials : [],
    quarterly_financials: Array.isArray(payload.quarterly_financials) ? payload.quarterly_financials : [],
    ratios: Array.isArray(payload.ratios) ? payload.ratios : [],
    analysis: payload.analysis || {},
    tdnet_earnings: Array.isArray(payload.tdnet_earnings) ? payload.tdnet_earnings : [],
    price_series: Array.isArray(payload.price_series) ? payload.price_series : [],
    rights: payload.rights || {},
    synced_at: new Date().toISOString(),
  };

  return {
    user_id: state.session.user.id,
    sec_code: company.sec_code ? String(company.sec_code).slice(0, 4) : existing?.sec_code || null,
    edinet_code: company.edinet_code || existing?.edinet_code || null,
    name: company.name || existing?.name || "",
    industry: company.industry || existing?.industry || null,
    status: existing?.status || "追跡",
    next_earnings: existing?.next_earnings || null,
    thesis: existing?.thesis || "",
    variant_view: existing?.variant_view || "",
    key_debate: existing?.key_debate || "",
    scorecard: existing?.scorecard || DEFAULT_SCORECARD,
    manual_forecast: existing?.manual_forecast || DEFAULT_FORECAST,
    manual_valuation: existing?.manual_valuation || DEFAULT_VALUATION,
    research_notes: existing?.research_notes || [],
    open_questions: existing?.open_questions || [],
    external_snapshot,
  };
}

async function resolveEdinetCode(input) {
  const query = input.secCode || input.name;
  if (!query) return "";

  const response = await fetch(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=5`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "EDINET 検索に失敗しました。");
  }

  const results = Array.isArray(payload.data) ? payload.data : [];
  if (!results.length) return "";

  const secCode = String(input.secCode || "").replaceAll(/[^0-9]/g, "");
  const exactSec = results.find((item) => String(item.sec_code || "").startsWith(secCode));
  return (exactSec || results[0]).edinet_code || "";
}

async function fetchEdinetJson(url, headers) {
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `EDINET DB request failed: ${url}`);
  }
  return payload.data;
}

async function fetchYahooPriceSeries(ticker) {
  if (!ticker) return [];
  try {
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=1y&interval=1d&includePrePost=false`);
    const payload = await response.json();
    const result = payload?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    return timestamps
      .map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString(),
        close: closes[index],
      }))
      .filter((item) => Number.isFinite(item.close));
  } catch {
    return [];
  }
}

function toYahooTicker(secCode) {
  const digits = String(secCode || "").replaceAll(/[^0-9]/g, "");
  if (!digits) return "";
  return `${digits.slice(0, 4)}.T`;
}

function normalizeCompanyRow(row) {
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
    manual_forecast: { ...DEFAULT_FORECAST, ...(row.manual_forecast || {}) },
    manual_valuation: { ...DEFAULT_VALUATION, ...(row.manual_valuation || {}) },
    research_notes: Array.isArray(row.research_notes) ? row.research_notes : [],
    open_questions: Array.isArray(row.open_questions) ? row.open_questions : [],
    external_snapshot: row.external_snapshot || {},
    updated_at: row.updated_at || row.created_at || new Date().toISOString(),
  };
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
    return { activeTab: parsed.activeTab || "overview" };
  } catch {
    return { activeTab: "overview" };
  }
}

function saveUiState() {
  localStorage.setItem(LOCAL_UI_KEY, JSON.stringify(state.ui));
}
function applyConfigToInputs() {
  el.supabaseUrlInput.value = state.config.supabaseUrl || "";
  el.supabaseAnonKeyInput.value = state.config.supabaseAnonKey || "";
  el.edinetApiKeyInput.value = state.config.edinetApiKey || "";
}

function setConfigStatus(message, isError) {
  el.supabaseConfigStatus.textContent = message;
  el.supabaseConfigStatus.style.color = isError ? "#9f4134" : "";
}

function setAuthStatus(message, isError) {
  el.authStatus.textContent = message;
  el.authStatus.style.color = isError ? "#9f4134" : "";
}

function setFormValue(name, value) {
  const field = el.companyForm.elements.namedItem(name);
  if (field) field.value = value;
}

function renderOptions(options, selected) {
  return options.map((option) => `<option value="${option}" ${option === selected ? "selected" : ""}>${option}</option>`).join("");
}

function renderMetricChip(label, value) {
  return `<div class="metric-chip"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderPriceChart(series) {
  const width = 720;
  const height = 240;
  const padding = 18;
  const values = series.map((item) => item.close).filter((value) => Number.isFinite(value));
  if (!values.length) return `<div class="summary-card">価格系列がありません。</div>`;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = series
    .filter((item) => Number.isFinite(item.close))
    .map((item, index, arr) => {
      const x = padding + ((width - padding * 2) * index) / Math.max(arr.length - 1, 1);
      const y = height - padding - ((item.close - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" class="price-chart" role="img" aria-label="株価推移">
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(255,255,255,0.48)"></rect>
      <polyline fill="none" stroke="#0d5b52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${points}"></polyline>
      <text x="${padding}" y="${padding}" fill="#6d5d4b" font-size="14">高値 ${escapeHtml(formatPrice(max))}</text>
      <text x="${padding}" y="${height - 8}" fill="#6d5d4b" font-size="14">安値 ${escapeHtml(formatPrice(min))}</text>
    </svg>
  `;
}

function quarterLabel(item) {
  if (item.quarter) return `${item.fiscal_year || ""} ${item.quarter}`.trim();
  if (item.context_id) return item.context_id;
  if (item.fiscal_year && item.fiscal_period) return `${item.fiscal_year} ${item.fiscal_period}`;
  return item.fiscal_year ? `FY${item.fiscal_year}` : "-";
}

function formatMillions(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(value / 1000000)} 百万円`;
}

function formatMillionsFromTdnet(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(value)} 百万円`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${Number(value).toFixed(1)}%`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(value);
}

function formatPrice(value) {
  if (!Number.isFinite(value)) return "-";
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 2 }).format(value)} 円`;
}

function formatSignedPercent(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "未設定";
  return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stringOrNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getErrorMessage(error) {
  return error?.message || "処理に失敗しました。";
}

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

state.ui.selectedQuarterKeys ||= {};

function loadUiState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_UI_KEY) || "{}") || {};
    return {
      activeTab: parsed.activeTab || "overview",
      selectedQuarterKeys: parsed.selectedQuarterKeys || {},
    };
  } catch {
    return { activeTab: "overview", selectedQuarterKeys: {} };
  }
}

function saveUiState() {
  localStorage.setItem(LOCAL_UI_KEY, JSON.stringify(state.ui));
}

async function fetchExternalData(input) {
  if (!state.config.edinetApiKey) {
    throw new Error("EDINET DB API Key を入力してください。");
  }

  const functionPayload = await tryFetchViaSupabaseFunction(input);
  if (functionPayload) {
    return normalizeExternalPayload(functionPayload);
  }

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
  const ticker = toYahooTicker(company?.sec_code || input.secCode || "");
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
    fetch_status: {
      mode: "browser-fallback",
      used_function: false,
      price_error: priceSeries.length ? "" : "Yahoo Finance 系の株価取得に失敗しました。Edge Function 経由での取得が安定です。",
      news_error: newsItems.length ? "" : "ニュース取得に失敗したか、まだ記事がありません。",
    },
    rights: defaultRights(),
  });
}

async function tryFetchViaSupabaseFunction(input) {
  if (!state.supabase || !state.session) return null;

  try {
    const { data, error } = await state.supabase.functions.invoke("sync-company", {
      body: {
        ...input,
        edinetApiKey: state.config.edinetApiKey,
      },
    });
    if (error) throw error;
    return data || null;
  } catch {
    return null;
  }
}

async function fetchEdinetPayload(url, headers) {
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `EDINET DB request failed: ${url}`);
  }
  return payload;
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

async function fetchGoogleNewsItems(companyName, ticker) {
  if (!companyName && !ticker) return [];

  try {
    const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent([companyName, ticker].filter(Boolean).join(" OR "))}&hl=ja&gl=JP&ceid=JP:ja`);
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "application/xml");
    const items = Array.from(doc.querySelectorAll("item"));
    return items.slice(0, 10).map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      source: item.querySelector("source")?.textContent?.trim() || "",
      published_at: normalizeNewsDate(item.querySelector("pubDate")?.textContent?.trim() || ""),
    })).filter((item) => item.title && item.link);
  } catch {
    return [];
  }
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

  return {
    user_id: state.session.user.id,
    sec_code: company.sec_code ? String(company.sec_code).slice(0, 4) : existing?.sec_code || null,
    edinet_code: company.edinet_code || existing?.edinet_code || null,
    name: company.name || existing?.name || "",
    industry: company.industry || existing?.industry || null,
    status: existing?.status || "追跡",
    next_earnings: existing?.next_earnings || null,
    thesis: existing?.thesis || "",
    variant_view: existing?.variant_view || "",
    key_debate: existing?.key_debate || "",
    scorecard: existing?.scorecard || DEFAULT_SCORECARD,
    manual_forecast: existing?.manual_forecast || [],
    manual_valuation: existing?.manual_valuation || DEFAULT_VALUATION,
    research_notes: existing?.research_notes || [],
    open_questions: existing?.open_questions || [],
    external_snapshot: {
      ...normalized,
      synced_at: new Date().toISOString(),
    },
  };
}

function normalizeExternalPayload(payload) {
  const company = extractEdinetData(payload?.company) || {};
  return {
    company,
    annual_financials: normalizeAnnualFinancials(payload?.annual_financials),
    quarterly_financials: normalizeQuarterlyFinancials(payload?.quarterly_financials, company),
    ratios: normalizeDescendingDateArray(Array.isArray(payload?.ratios) ? payload.ratios : []),
    analysis: payload?.analysis || {},
    tdnet_earnings: normalizeTdnetEarnings(payload?.tdnet_earnings),
    price_series: normalizePriceSeries(payload?.price_series),
    news_items: normalizeNewsItems(payload?.news_items),
    fetch_status: payload?.fetch_status || {},
    rights: { ...defaultRights(), ...(payload?.rights || {}) },
    synced_at: payload?.synced_at || null,
  };
}

function normalizeAnnualFinancials(rows) {
  return normalizeDescendingDateArray(Array.isArray(rows) ? rows : [], (item) => Number(item.fiscal_year || 0));
}

function normalizeQuarterlyFinancials(rows, company) {
  const fiscalYearEndMonth = inferFiscalYearEndMonth(company);
  return (Array.isArray(rows) ? rows : [])
    .map((item) => ({
      ...item,
      fiscal_year: Number(item.fiscal_year || 0),
      fiscal_year_end_month: Number(item.fiscal_year_end_month || fiscalYearEndMonth || 3),
      quarter: Number(item.quarter || 0),
    }))
    .sort(compareQuarterDesc);
}

function normalizeTdnetEarnings(payload) {
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.earnings)
      ? payload.earnings
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.data?.earnings)
          ? payload.data.earnings
          : [];

  return rows.map((item) => ({
    ...item,
    fiscal_year: getFiscalYearFromEnd(item.fiscal_year_end),
    fiscal_year_end_month: getMonthFromDate(item.fiscal_year_end),
    quarter: Number(item.quarter || 0),
  })).sort(compareQuarterDesc);
}

function normalizePriceSeries(series) {
  return (Array.isArray(series) ? series : [])
    .map((item) => ({
      date: item.date,
      close: Number(item.close),
    }))
    .filter((item) => item.date && Number.isFinite(item.close))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function normalizeNewsItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      title: String(item.title || "").trim(),
      link: String(item.link || "").trim(),
      source: String(item.source || "").trim(),
      published_at: normalizeNewsDate(item.published_at || item.pubDate || ""),
    }))
    .filter((item) => item.title && item.link)
    .sort((a, b) => String(b.published_at || "").localeCompare(String(a.published_at || "")));
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
  const hasLegacyValue = [legacy.revenue_mn, legacy.operating_income_mn, legacy.eps, legacy.note].some((value) => String(value || "").trim());
  if (!hasLegacyValue) return [];

  return [{
    ...FORECAST_TEMPLATE,
    ...inferLegacyForecastPeriod(snapshot),
    id: uid("forecast"),
    revenue_mn: String(legacy.revenue_mn || ""),
    operating_income_mn: String(legacy.operating_income_mn || ""),
    net_income_mn: String(legacy.net_income_mn || ""),
    eps: String(legacy.eps || ""),
    note: String(legacy.note || ""),
  }];
}

function inferLegacyForecastPeriod(snapshot) {
  const latest = snapshot?.quarterly_financials?.[0];
  if (!latest) {
    return {
      fiscal_year: String(new Date().getFullYear()),
      fiscal_year_end_month: "3",
      quarter: "1",
    };
  }

  let fiscalYear = Number(latest.fiscal_year || new Date().getFullYear());
  let quarter = Number(latest.quarter || 0) + 1;
  if (quarter > 4) {
    fiscalYear += 1;
    quarter = 1;
  }

  return {
    fiscal_year: String(fiscalYear),
    fiscal_year_end_month: String(latest.fiscal_year_end_month || 3),
    quarter: String(quarter),
  };
}

function compareQuarterDesc(a, b) {
  return quarterSortValue(b) - quarterSortValue(a);
}

function quarterSortValue(item) {
  return (Number(item.fiscal_year || getFiscalYearFromEnd(item.fiscal_year_end) || 0) * 100)
    + (Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || 3) * 10)
    + Number(item.quarter || 0);
}

function inferFiscalYearEndMonth(company) {
  return getMonthFromDate(company?.latest_earnings?.fiscal_year_end)
    || getMonthFromDate(company?.latest_financials?.fiscal_year_end)
    || 3;
}

function getFiscalYearFromEnd(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getFullYear() : Number(String(value).slice(0, 4)) || 0;
}

function getMonthFromDate(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getMonth() + 1 : 0;
}

function normalizeNewsDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : String(value);
}

function quarterKey(item) {
  return `${Number(item.fiscal_year || getFiscalYearFromEnd(item.fiscal_year_end) || 0)}-${Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || 3)}-${Number(item.quarter || 0)}`;
}

function quarterLabel(item) {
  const fiscalYear = Number(item.fiscal_year || getFiscalYearFromEnd(item.fiscal_year_end) || 0);
  const endMonth = Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || 3);
  const quarter = Number(item.quarter || 0);
  if (fiscalYear && quarter) return `${fiscalYear}/${endMonth}月期 ${quarter}Q`;
  if (fiscalYear) return `${fiscalYear}/${endMonth}月期`;
  return "-";
}

function defaultRights() {
  return {
    edinetdb_note: "EDINET DB は個人用途の調査支援として利用しています。運用形態を変える前には規約本文の確認を推奨します。",
    price_note: "Yahoo Finance 系データは personal use only 前提です。このアプリはあなた個人が PC とスマホで参照する用途に寄せています。",
  };
}

function syncConfigFromInputs() {
  state.config.supabaseUrl = el.supabaseUrlInput.value.trim();
  state.config.supabaseAnonKey = el.supabaseAnonKeyInput.value.trim();
  state.config.edinetApiKey = el.edinetApiKeyInput.value.trim();
  saveConfig();
}

function openSettingsDialog() {
  applyConfigToInputs();
  el.settingsDialog?.showModal();
  closeSidebar();
}

function toggleSidebar() {
  const isOpen = el.sidebar?.classList.contains("open");
  if (isOpen) {
    closeSidebar();
    return;
  }
  el.sidebar?.classList.add("open");
  if (el.sidebarScrim) el.sidebarScrim.hidden = false;
}

function closeSidebar() {
  el.sidebar?.classList.remove("open");
  if (el.sidebarScrim) el.sidebarScrim.hidden = true;
}

function buildQuarterBuckets(company) {
  const bucketMap = new Map();

  (company.external_snapshot?.quarterly_financials || []).forEach((item) => {
    const key = quarterKey(item);
    bucketMap.set(key, { ...(bucketMap.get(key) || makeQuarterBucket(item)), actual: item });
  });

  (company.manual_forecast || []).forEach((item) => {
    const key = quarterKey(item);
    bucketMap.set(key, { ...(bucketMap.get(key) || makeQuarterBucket(item)), forecast: item });
  });

  (company.external_snapshot?.tdnet_earnings || []).forEach((item) => {
    const key = quarterKey(item);
    bucketMap.set(key, { ...(bucketMap.get(key) || makeQuarterBucket(item)), tdnet: item });
  });

  return [...bucketMap.values()].map((item) => ({ ...item, label: quarterLabel(item) })).sort(compareQuarterDesc);
}

function makeQuarterBucket(item) {
  return {
    key: quarterKey(item),
    fiscal_year: Number(item.fiscal_year || getFiscalYearFromEnd(item.fiscal_year_end) || 0),
    fiscal_year_end_month: Number(item.fiscal_year_end_month || getMonthFromDate(item.fiscal_year_end) || 3),
    quarter: Number(item.quarter || 0),
    actual: null,
    forecast: null,
    tdnet: null,
  };
}

function getSelectedQuarterBucket(company, buckets) {
  if (!buckets.length) return null;
  const savedKey = state.ui.selectedQuarterKeys[company.id];
  return buckets.find((item) => item.key === savedKey) || buckets[0];
}

function inferNextForecastPeriod(company, selectedBucket) {
  if (selectedBucket?.forecast) return selectedBucket.forecast;

  const latest = buildQuarterBuckets(company)[0];
  if (!latest) {
    return {
      ...FORECAST_TEMPLATE,
      fiscal_year: String(new Date().getFullYear()),
      fiscal_year_end_month: "3",
      quarter: "1",
    };
  }

  let fiscalYear = Number(latest.fiscal_year || new Date().getFullYear());
  let quarter = Number(latest.quarter || 0) + 1;
  if (quarter > 4) {
    fiscalYear += 1;
    quarter = 1;
  }

  return {
    ...FORECAST_TEMPLATE,
    fiscal_year: String(fiscalYear),
    fiscal_year_end_month: String(latest.fiscal_year_end_month || 3),
    quarter: String(quarter),
  };
}

function upsertForecast(items, candidate) {
  const next = (items || []).filter((item) => quarterKey(item) !== quarterKey(candidate));
  next.unshift(candidate);
  return next.sort(compareQuarterDesc);
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
    external_snapshot: existing?.external_snapshot || {},
  };

  try {
    if (editingId) {
      const { data, error } = await state.supabase.from("research_companies").update(row).eq("id", editingId).select().single();
      if (error) throw error;
      upsertLocalCompany(data);
    } else {
      const { data, error } = await state.supabase.from("research_companies").insert(row).select().single();
      if (error) throw error;
      upsertLocalCompany(data);
    }
    el.companyDialog.close();
    setAuthStatus("企業情報を保存しました。", false);
    render();
  } catch (error) {
    setAuthStatus(getErrorMessage(error), true);
  }
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
    setAuthStatus("決算期の年を入力してください。", true);
    return;
  }

  await updateCompany(company.id, { manual_forecast: upsertForecast(company.manual_forecast || [], item) }, "予想を保存しました。");
  form.reset();
}

async function deleteForecast(id) {
  const company = getSelectedCompany();
  if (!company) return;
  const next = (company.manual_forecast || []).filter((item) => item.id !== id);
  await updateCompany(company.id, { manual_forecast: next }, "予想を削除しました。");
}

function renderOverview(company) {
  const latestAnnual = company.external_snapshot?.annual_financials?.[0];
  const latestPrice = company.external_snapshot?.price_series?.at(-1)?.close;
  const latestNews = company.external_snapshot?.news_items?.[0];

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
          <label>
            <span>投資仮説</span>
            <textarea name="thesis" rows="4">${escapeHtml(company.thesis)}</textarea>
          </label>
          <label>
            <span>バリアントビュー</span>
            <textarea name="variant_view" rows="4">${escapeHtml(company.variant_view)}</textarea>
          </label>
          <label>
            <span>主要論点</span>
            <textarea name="key_debate" rows="4">${escapeHtml(company.key_debate)}</textarea>
          </label>
          <div class="inline-grid two">
            <label>
              <span>ステータス</span>
              <select name="status">${renderOptions(["追跡", "重点", "再確認"], company.status)}</select>
            </label>
            <label>
              <span>次回決算予定</span>
              <input name="next_earnings" type="date" value="${company.next_earnings || ""}">
            </label>
          </div>
          <div class="inline-grid two">
            <label><span>質</span><input name="quality" type="number" min="1" max="5" value="${company.scorecard.quality}"></label>
            <label><span>モメンタム</span><input name="momentum" type="number" min="1" max="5" value="${company.scorecard.momentum}"></label>
            <label><span>バリュエーション</span><input name="valuation_score" type="number" min="1" max="5" value="${company.scorecard.valuation}"></label>
            <label><span>経営陣</span><input name="management" type="number" min="1" max="5" value="${company.scorecard.management}"></label>
          </div>
          <div class="button-row"><button type="submit">概要を保存</button></div>
        </form>
      </section>
      <section class="panel">
        <h3>最新スナップショット</h3>
        <div class="metric-strip">
          ${renderMetricChip("売上高", formatMillions(latestAnnual?.revenue))}
          ${renderMetricChip("営業利益", formatMillions(latestAnnual?.operating_income))}
          ${renderMetricChip("当期利益", formatMillions(latestAnnual?.net_income))}
        </div>
        <div class="metric-strip">
          ${renderMetricChip("ROE", formatPercent(company.external_snapshot?.ratios?.[0]?.roe))}
          ${renderMetricChip("営業利益率", formatPercent(company.external_snapshot?.ratios?.[0]?.operating_margin))}
          ${renderMetricChip("直近株価", formatPrice(latestPrice))}
        </div>
        <div class="summary-card">
          <strong>EDINET AI要約</strong>
          <div>${escapeHtml(company.external_snapshot?.analysis?.ai_summary?.text || "未取得")}</div>
        </div>
        <div class="summary-card">
          <strong>最新ニュース</strong>
          ${latestNews ? `
            <div><a class="inline-link" href="${escapeHtml(latestNews.link)}" target="_blank" rel="noreferrer">${escapeHtml(latestNews.title)}</a></div>
            <div class="company-meta">${escapeHtml(formatDateTime(latestNews.published_at))}${latestNews.source ? ` · ${escapeHtml(latestNews.source)}` : ""}</div>
          ` : `<div class="dim">ニュースはまだ取得されていません。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderEarnings(company) {
  const buckets = buildQuarterBuckets(company);
  const selectedBucket = getSelectedQuarterBucket(company, buckets);
  const forecastDefaults = inferNextForecastPeriod(company, selectedBucket);

  return `
    <div class="panel-grid">
      <section class="panel full">
        <div class="row-between">
          <h3>四半期推移</h3>
          <span class="dim">実績は EDINET DB、予想は手入力です。</span>
        </div>
        <div class="chart-grid">
          <article class="mini-chart-card">
            <div class="chart-head"><strong>売上高</strong><span class="dim">百万円</span></div>
            ${renderQuarterlyChart(buckets, "revenue")}
          </article>
          <article class="mini-chart-card">
            <div class="chart-head"><strong>営業利益</strong><span class="dim">百万円</span></div>
            ${renderQuarterlyChart(buckets, "operating_income")}
          </article>
          <article class="mini-chart-card">
            <div class="chart-head"><strong>EPS</strong><span class="dim">円</span></div>
            ${renderQuarterlyChart(buckets, "eps")}
          </article>
        </div>
      </section>

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
              ${buckets.length ? buckets.slice(0, 16).map((bucket) => `
                <tr class="${selectedBucket?.key === bucket.key ? "selected-row" : ""}">
                  <td>
                    <button class="table-link" data-action="select-quarter" data-quarter-key="${escapeHtml(bucket.key)}" type="button">${escapeHtml(bucket.label)}</button>
                    <div class="table-subline">${renderBadges(bucket)}</div>
                  </td>
                  <td>${renderMetricPair(bucket.actual?.revenue, bucket.forecast?.revenue_mn, formatMillions, true)}</td>
                  <td>${renderMetricPair(bucket.actual?.operating_income, bucket.forecast?.operating_income_mn, formatMillions, true)}</td>
                  <td>${renderMetricPair(bucket.actual?.net_income, bucket.forecast?.net_income_mn, formatMillions, true)}</td>
                  <td>${renderMetricPair(bucket.actual?.eps, bucket.forecast?.eps, formatNumber, false)}</td>
                  <td>${escapeHtml(formatQuarterUpdate(bucket))}</td>
                  <td>${renderQuarterLinkSummary(company, bucket)}</td>
                </tr>
              `).join("") : `<tr><td colspan="7">四半期データがありません。</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      <section class="panel">
        <h3>四半期予想を追加・更新</h3>
        <form data-form="forecast" class="stack">
          <div class="inline-grid three">
            <label><span>決算期の年</span><input name="fiscal_year" type="number" min="2000" max="2100" value="${escapeHtml(forecastDefaults.fiscal_year)}" required></label>
            <label><span>決算月</span><select name="fiscal_year_end_month">${renderMonthOptions(forecastDefaults.fiscal_year_end_month)}</select></label>
            <label><span>四半期</span><select name="quarter">${renderOptions(["1", "2", "3", "4"], forecastDefaults.quarter)}</select></label>
          </div>
          <div class="inline-grid two">
            <label><span>売上高予想（百万円）</span><input name="revenue_mn" value="${escapeHtml(forecastDefaults.revenue_mn)}"></label>
            <label><span>営業利益予想（百万円）</span><input name="operating_income_mn" value="${escapeHtml(forecastDefaults.operating_income_mn)}"></label>
            <label><span>当期利益予想（百万円）</span><input name="net_income_mn" value="${escapeHtml(forecastDefaults.net_income_mn)}"></label>
            <label><span>EPS予想</span><input name="eps" value="${escapeHtml(forecastDefaults.eps)}"></label>
          </div>
          <label><span>メモ</span><textarea name="note" rows="4">${escapeHtml(forecastDefaults.note)}</textarea></label>
          <div class="button-row"><button type="submit">予想を保存</button></div>
        </form>
        <div class="timeline">
          ${company.manual_forecast.length ? company.manual_forecast.map((item) => `
            <article class="summary-card">
              <div class="row-between">
                <strong>${escapeHtml(quarterLabel(item))}</strong>
                <button class="ghost tiny" data-action="delete-forecast" data-id="${escapeHtml(item.id)}" type="button">削除</button>
              </div>
              <div class="company-meta">売上高 ${escapeHtml(formatMillionsText(item.revenue_mn))} / 営業利益 ${escapeHtml(formatMillionsText(item.operating_income_mn))} / 当期利益 ${escapeHtml(formatMillionsText(item.net_income_mn))} / EPS ${escapeHtml(formatTextNumber(item.eps))}</div>
              <div>${escapeHtml(item.note || "")}</div>
            </article>
          `).join("") : `<div class="empty">保存済み予想はまだありません。</div>`}
        </div>
      </section>

      <section class="panel">
        <h3>選択中の四半期</h3>
        ${selectedBucket ? renderQuarterDetail(company, selectedBucket) : `<div class="empty">四半期を選択すると資料リンクと詳細を表示します。</div>`}
      </section>

      <section class="panel">
        <h3>関連ニュース</h3>
        <div class="timeline">${renderNewsList(company.external_snapshot?.news_items || [])}</div>
      </section>

      <section class="panel">
        <h3>TDNet 最新開示</h3>
        <div class="timeline">
          ${(company.external_snapshot?.tdnet_earnings || []).length ? (company.external_snapshot.tdnet_earnings || []).slice(0, 8).map((item) => `
            <article class="summary-card">
              <strong>${escapeHtml(item.title || "決算開示")}</strong>
              <div class="company-meta">${escapeHtml(formatDateTime(item.disclosure_date))}${item.disclosure_time ? ` ${escapeHtml(item.disclosure_time)}` : ""}</div>
              <div>売上高 ${escapeHtml(formatMillionsText(item.revenue))} / 営業利益 ${escapeHtml(formatMillionsText(item.operating_income))} / EPS ${escapeHtml(formatTextNumber(item.eps))}</div>
              ${item.pdf_url ? `<div class="link-row"><a class="inline-link" href="${escapeHtml(item.pdf_url)}" target="_blank" rel="noreferrer">PDF を開く</a></div>` : ""}
            </article>
          `).join("") : `<div class="empty">最近の TDNet 開示はありません。</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderValuation(company) {
  const valuation = { ...DEFAULT_VALUATION, ...(company.manual_valuation || {}) };
  const priceSeries = company.external_snapshot?.price_series || [];
  const latestPrice = priceSeries.at(-1)?.close;
  const firstPrice = priceSeries[0]?.close;
  const latestAnnual = company.external_snapshot?.annual_financials?.[0];
  const priceChange = Number.isFinite(latestPrice) && Number.isFinite(firstPrice) && firstPrice !== 0 ? ((latestPrice - firstPrice) / firstPrice) * 100 : null;
  const roughPer = Number.isFinite(latestPrice) && Number.isFinite(latestAnnual?.eps) && latestAnnual.eps !== 0 ? latestPrice / latestAnnual.eps : null;
  const priceError = company.external_snapshot?.fetch_status?.price_error || "";

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
        <div class="chart-placeholder">
          ${priceSeries.length ? `
            <div class="metric-strip">
              ${renderMetricChip("直近終値", formatPrice(latestPrice))}
              ${renderMetricChip("1年騰落率", formatSignedPercent(priceChange))}
              ${renderMetricChip("概算 PER", formatTimes(roughPer))}
            </div>
            ${renderPriceChart(priceSeries)}
          ` : `
            <strong>株価をまだ取得できていません</strong>
            <p class="dim">${escapeHtml(priceError || "再同期時に株価系列を取り込みます。")}</p>
          `}
        </div>
      </section>
    </div>
  `;
}

function renderAutoData(company) {
  const snapshot = company.external_snapshot || {};
  return `
    <div class="panel-grid">
      <section class="panel">
        <h3>自動取得の中身</h3>
        <div class="timeline">
          <div class="summary-card"><strong>EDINET コード</strong><div class="mono">${escapeHtml(company.edinet_code || "未設定")}</div></div>
          <div class="summary-card"><strong>年次データ件数</strong><div>${escapeHtml(String(snapshot.annual_financials?.length || 0))}</div></div>
          <div class="summary-card"><strong>四半期データ件数</strong><div>${escapeHtml(String(snapshot.quarterly_financials?.length || 0))}</div></div>
          <div class="summary-card"><strong>TDNet 件数</strong><div>${escapeHtml(String(snapshot.tdnet_earnings?.length || 0))}</div></div>
          <div class="summary-card"><strong>ニュース件数</strong><div>${escapeHtml(String(snapshot.news_items?.length || 0))}</div></div>
          <div class="summary-card"><strong>株価系列数</strong><div>${escapeHtml(String(snapshot.price_series?.length || 0))}</div></div>
          <div class="summary-card"><strong>取得経路</strong><div>${escapeHtml(snapshot.fetch_status?.used_function ? "Supabase Edge Function" : snapshot.fetch_status?.mode || "不明")}</div></div>
          <div class="summary-card"><strong>最終同期</strong><div>${escapeHtml(formatDateTime(snapshot.synced_at))}</div></div>
        </div>
      </section>
      <section class="panel">
        <h3>公開前の注意</h3>
        <div class="summary-card"><strong>EDINET DB</strong><div>${escapeHtml(snapshot.rights?.edinetdb_note || defaultRights().edinetdb_note)}</div></div>
        <div class="summary-card"><strong>株価データ</strong><div>${escapeHtml(snapshot.rights?.price_note || defaultRights().price_note)}</div></div>
        ${snapshot.fetch_status?.price_error ? `<div class="summary-card"><strong>株価取得メモ</strong><div>${escapeHtml(snapshot.fetch_status.price_error)}</div></div>` : ""}
        ${snapshot.fetch_status?.news_error ? `<div class="summary-card"><strong>ニュース取得メモ</strong><div>${escapeHtml(snapshot.fetch_status.news_error)}</div></div>` : ""}
      </section>
    </div>
  `;
}

function renderQuarterlyChart(buckets, metric) {
  const rows = [...buckets].slice(0, 12).reverse();
  const values = rows.flatMap((item) => [getBucketMetric(item, metric, true), getBucketMetric(item, metric, false)]).filter(Number.isFinite);
  if (!values.length) return `<div class="summary-card">表示できるデータがありません。</div>`;

  const width = 720;
  const height = 220;
  const padding = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = rows.map((item, index) => {
    const x = padding + ((width - padding * 2) * index) / Math.max(rows.length - 1, 1);
    return {
      x,
      label: item.label,
      actual: getBucketMetric(item, metric, true),
      forecast: getBucketMetric(item, metric, false),
    };
  });

  const actualPoints = coords.filter((item) => Number.isFinite(item.actual)).map((item) => `${item.x},${chartY(item.actual, min, range, height, padding)}`).join(" ");
  const forecastPoints = coords.filter((item) => Number.isFinite(item.forecast)).map((item) => `${item.x},${chartY(item.forecast, min, range, height, padding)}`).join(" ");
  const firstForecastIndex = coords.findIndex((item) => Number.isFinite(item.forecast));
  const lastActualBeforeForecast = firstForecastIndex > 0
    ? [...coords].slice(0, firstForecastIndex + 1).map((item, index) => ({ ...item, index })).filter((item) => Number.isFinite(item.actual)).at(-1)
    : null;
  const bridge = lastActualBeforeForecast && firstForecastIndex >= 0
    ? `${lastActualBeforeForecast.x},${chartY(lastActualBeforeForecast.actual, min, range, height, padding)} ${coords[firstForecastIndex].x},${chartY(coords[firstForecastIndex].forecast, min, range, height, padding)}`
    : "";

  return `
    <svg viewBox="0 0 ${width} ${height}" class="price-chart" role="img" aria-label="四半期推移チャート">
      <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="rgba(255,255,255,0.48)"></rect>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="rgba(67,52,31,0.18)" />
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="rgba(67,52,31,0.18)" />
      <text x="${padding}" y="${padding - 4}" fill="#6d5d4b" font-size="12">${escapeHtml(formatChartMetric(max, metric))}</text>
      <text x="${padding}" y="${height - 6}" fill="#6d5d4b" font-size="12">${escapeHtml(formatChartMetric(min, metric))}</text>
      ${actualPoints ? `<polyline fill="none" stroke="#0d5b52" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${actualPoints}"></polyline>` : ""}
      ${bridge ? `<polyline fill="none" stroke="#b87512" stroke-width="2.5" stroke-dasharray="8 6" stroke-linecap="round" points="${bridge}"></polyline>` : ""}
      ${forecastPoints ? `<polyline fill="none" stroke="#b87512" stroke-width="3" stroke-dasharray="8 6" stroke-linecap="round" stroke-linejoin="round" points="${forecastPoints}"></polyline>` : ""}
      ${coords.map((item) => renderChartPoints(item, min, range, height, padding)).join("")}
      <text x="${padding}" y="${height - 4}" fill="#6d5d4b" font-size="12">${escapeHtml(rows[0]?.label || "")}</text>
      <text x="${width - padding}" y="${height - 4}" fill="#6d5d4b" font-size="12" text-anchor="end">${escapeHtml(rows.at(-1)?.label || "")}</text>
    </svg>
  `;
}

function getBucketMetric(bucket, metric, actual) {
  if (actual) {
    const value = bucket.actual?.[metric];
    if (!Number.isFinite(value)) return null;
    return metric === "eps" ? value : value / 1000000;
  }
  const raw = metric === "eps" ? bucket.forecast?.eps : bucket.forecast?.[`${metric}_mn`];
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function chartY(value, min, range, height, padding) {
  return height - padding - ((value - min) / range) * (height - padding * 2);
}

function renderChartPoints(item, min, range, height, padding) {
  return `
    ${Number.isFinite(item.actual) ? `<circle cx="${item.x}" cy="${chartY(item.actual, min, range, height, padding)}" r="4.5" fill="#0d5b52"></circle>` : ""}
    ${Number.isFinite(item.forecast) ? `<circle cx="${item.x}" cy="${chartY(item.forecast, min, range, height, padding)}" r="4.5" fill="#b87512"></circle>` : ""}
  `;
}

function renderMetricPair(actualValue, forecastValue, formatter, forecastInMillions) {
  const blocks = [];
  if (Number.isFinite(actualValue)) blocks.push(`<div><span class="badge badge-actual">実績</span> ${escapeHtml(formatter(actualValue))}</div>`);
  const forecastNumber = Number(forecastValue);
  if (String(forecastValue || "").trim() && Number.isFinite(forecastNumber)) {
    blocks.push(`<div><span class="badge badge-forecast">予想</span> ${escapeHtml(forecastInMillions ? formatMillions(forecastNumber * 1000000) : formatter(forecastNumber))}</div>`);
  }
  return blocks.length ? `<div class="value-stack">${blocks.join("")}</div>` : "-";
}

function renderBadges(bucket) {
  return [
    bucket.actual ? `<span class="badge badge-actual">実績</span>` : "",
    bucket.forecast ? `<span class="badge badge-forecast">予想</span>` : "",
    bucket.tdnet?.pdf_url ? `<span class="badge badge-doc">資料</span>` : "",
  ].filter(Boolean).join("");
}

function formatQuarterUpdate(bucket) {
  if (bucket.actual?.submit_date) return bucket.actual.submit_date;
  if (bucket.tdnet?.disclosure_date) return formatDateTime(bucket.tdnet.disclosure_date);
  if (bucket.forecast) return "手入力";
  return "-";
}

function buildQuarterLinks(company, bucket) {
  const links = [];
  if (bucket.tdnet?.pdf_url) links.push({ label: "決算短信 PDF", url: bucket.tdnet.pdf_url });

  const latestFinancials = company.external_snapshot?.company?.latest_financials;
  if (latestFinancials?.edinet_filing_url && Number(latestFinancials.fiscal_year) === Number(bucket.fiscal_year)) {
    links.push({ label: "有価証券報告書", url: latestFinancials.edinet_filing_url });
  }

  links.push({
    label: "決算説明資料を検索",
    url: `https://www.google.com/search?q=${encodeURIComponent(`${company.name} ${bucket.label} 決算説明資料`)}`,
  });

  return links.filter((item, index, arr) => arr.findIndex((candidate) => candidate.url === item.url) === index);
}

function renderQuarterLinkSummary(company, bucket) {
  const links = buildQuarterLinks(company, bucket);
  return links.length
    ? `<div class="link-row">${links.slice(0, 2).map((item) => `<a class="inline-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join("")}</div>`
    : `<span class="dim">なし</span>`;
}

function renderQuarterDetail(company, bucket) {
  const links = buildQuarterLinks(company, bucket);
  return `
    <div class="stack">
      <div class="summary-card">
        <strong>${escapeHtml(bucket.label)}</strong>
        <div class="table-subline">${renderBadges(bucket)}</div>
      </div>
      <div class="metric-strip">
        ${renderMetricChip("売上高", renderDetailMetric(bucket.actual?.revenue, bucket.forecast?.revenue_mn, true))}
        ${renderMetricChip("営業利益", renderDetailMetric(bucket.actual?.operating_income, bucket.forecast?.operating_income_mn, true))}
        ${renderMetricChip("EPS", renderDetailMetric(bucket.actual?.eps, bucket.forecast?.eps, false))}
      </div>
      <div class="summary-card">
        <strong>資料リンク</strong>
        <div class="document-list">
          ${links.length ? links.map((item) => `<a class="inline-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.label)}</a>`).join("") : `<span class="dim">リンクが見つかっていません。</span>`}
        </div>
      </div>
      ${bucket.forecast?.note ? `<div class="summary-card"><strong>予想メモ</strong><div>${escapeHtml(bucket.forecast.note)}</div></div>` : ""}
    </div>
  `;
}

function renderDetailMetric(actualValue, forecastValue, forecastInMillions) {
  const parts = [];
  if (Number.isFinite(actualValue)) parts.push(`実績 ${forecastInMillions ? formatMillions(actualValue) : formatNumber(actualValue)}`);
  const forecastNumber = Number(forecastValue);
  if (String(forecastValue || "").trim() && Number.isFinite(forecastNumber)) {
    parts.push(`予想 ${forecastInMillions ? formatMillions(forecastNumber * 1000000) : formatNumber(forecastNumber)}`);
  }
  return parts.join(" / ") || "-";
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

function renderMonthOptions(selected) {
  return Array.from({ length: 12 }, (_, index) => String(index + 1))
    .map((month) => `<option value="${month}" ${String(selected) === month ? "selected" : ""}>${month}月</option>`)
    .join("");
}

function formatMillionsText(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(parsed)} 百万円`;
}

function formatTextNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? formatNumber(parsed) : "-";
}

function formatTimes(value) {
  if (!Number.isFinite(value)) return "-";
  return `${value.toFixed(1)}x`;
}

function formatChartMetric(value, metric) {
  if (!Number.isFinite(value)) return "-";
  return metric === "eps"
    ? `${formatNumber(value)} 円`
    : `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(value)} 百万円`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) return "-";
  const percent = Math.abs(Number(value)) <= 1 ? Number(value) * 100 : Number(value);
  return `${percent.toFixed(1)}%`;
}

document.addEventListener("click", async (event) => {
  const action = event.target.closest("[data-action]");
  if (!action) return;

  if (action.dataset.action === "select-quarter") {
    const company = getSelectedCompany();
    if (!company) return;
    state.ui.selectedQuarterKeys[company.id] = action.dataset.quarterKey;
    saveUiState();
    renderWorkspace();
  }

  if (action.dataset.action === "delete-forecast") {
    await deleteForecast(action.dataset.id);
  }
});
