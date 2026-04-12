import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const LOCAL_CONFIG_KEY = "jp-research-cockpit-config-v1";
const LOCAL_UI_KEY = "jp-research-cockpit-ui-v1";
const DEFAULT_CONFIG = {
  supabaseUrl: "https://kucwkuskoqwdtvmewtik.supabase.co",
  supabaseAnonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1Y3drdXNrb3F3ZHR2bWV3dGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NTA1MzcsImV4cCI6MjA5MTUyNjUzN30.RReLIipWvYwO4qx3UBUbIFMD3E7EiuRfvdllUURCGp4",
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
  supabaseUrlInput: document.querySelector("#supabaseUrlInput"),
  supabaseAnonKeyInput: document.querySelector("#supabaseAnonKeyInput"),
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
    state.config.supabaseUrl = el.supabaseUrlInput.value.trim();
    state.config.supabaseAnonKey = el.supabaseAnonKeyInput.value.trim();
    saveConfig();
    await initSupabase();
    render();
  });

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
      state.authSubscription.subscription.unsubscribe();
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
  if (!state.supabase) {
    setAuthStatus("先に Supabase 設定を保存してください。", true);
    return;
  }

  try {
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
  if (!state.supabase) {
    setAuthStatus("先に Supabase 設定を保存してください。", true);
    return;
  }

  try {
    const { error, data } = await state.supabase.auth.signInWithPassword({
      email: el.emailInput.value.trim(),
      password: el.passwordInput.value,
    });
    if (error) throw error;
    state.session = data.session;
    setAuthStatus(`ログイン中: ${data.user.email}`, false);
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
    const payload = await callSyncFunction({ edinetCode });
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
    const payload = await callSyncFunction({ edinetCode: company.edinet_code });
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

async function callSyncFunction(body) {
  if (!state.supabase) throw new Error("Supabase が未設定です。");
  const { data, error } = await state.supabase.functions.invoke("sync-company", { body });
  if (error) throw error;
  return data;
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
      : "Supabase 設定とログインが完了すると、自分専用のバックエンドに保存されます。";
    el.workspaceContent.innerHTML = `<div class="empty">表示する企業がまだありません。</div>`;
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
