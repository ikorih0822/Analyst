const DEFAULT_METRICS = [
  {
    id: "roe",
    short: "ROE",
    name: "自己資本利益率",
    category: "収益性",
    numerator: "当期純利益",
    denominator: "自己資本の期中平均",
    unit: "%",
    multiplier: "×100",
    meaning: "株主が拠出した自己資本を使って、どれだけ最終利益を生んだかを見る。",
    note: "分母は期首・期末平均で押さえる。親会社株主に帰属する当期純利益を使う問題もある。",
  },
  {
    id: "roa-net",
    short: "ROA",
    name: "総資産利益率",
    category: "収益性",
    numerator: "当期純利益",
    denominator: "総資産の期中平均",
    unit: "%",
    multiplier: "×100",
    meaning: "会社全体の資産が、最終利益の獲得にどれだけ結びついたかを見る。",
    note: "総資本事業利益率として問われる場合は、分子が事業利益になる。",
  },
  {
    id: "roa-business",
    short: "総資本事業利益率",
    name: "事業利益ベースROA",
    category: "収益性",
    numerator: "事業利益",
    denominator: "総資本の期中平均",
    unit: "%",
    multiplier: "×100",
    meaning: "本業と金融収益を含む事業活動が、総資本からどれだけ利益を生んだかを見る。",
    note: "事業利益は、営業利益に受取利息・受取配当金などを加えた利益として扱う。",
  },
  {
    id: "gross-margin",
    short: "売上高総利益率",
    name: "粗利率",
    category: "収益性",
    numerator: "売上総利益",
    denominator: "売上高",
    unit: "%",
    multiplier: "×100",
    meaning: "商品・サービスそのものの付加価値や原価構造を見る。",
    note: "売上総利益は、売上高から売上原価を引いた利益。",
  },
  {
    id: "operating-margin",
    short: "売上高営業利益率",
    name: "営業利益率",
    category: "収益性",
    numerator: "営業利益",
    denominator: "売上高",
    unit: "%",
    multiplier: "×100",
    meaning: "本業の収益力を売上高に対する割合で見る。",
    note: "販管費まで差し引いた後の利益が分子。",
  },
  {
    id: "ordinary-margin",
    short: "売上高経常利益率",
    name: "経常利益率",
    category: "収益性",
    numerator: "経常利益",
    denominator: "売上高",
    unit: "%",
    multiplier: "×100",
    meaning: "営業外損益まで含めた通常の企業活動の収益力を見る。",
    note: "支払利息や受取利息などの営業外損益を含む。",
  },
  {
    id: "net-margin",
    short: "売上高当期純利益率",
    name: "純利益率",
    category: "収益性",
    numerator: "当期純利益",
    denominator: "売上高",
    unit: "%",
    multiplier: "×100",
    meaning: "最終利益が売上高に対してどれだけ残ったかを見る。",
    note: "特別損益や税金の影響も反映される。",
  },
  {
    id: "equity-ratio",
    short: "自己資本比率",
    name: "自己資本比率",
    category: "安全性",
    numerator: "自己資本",
    denominator: "総資本",
    unit: "%",
    multiplier: "×100",
    meaning: "総資本のうち返済不要の自己資本がどれだけあるかを見る。",
    note: "総資本は総資産と同義で扱われることが多い。",
  },
  {
    id: "debt-equity",
    short: "負債比率",
    name: "デット・エクイティ・レシオ",
    category: "安全性",
    numerator: "負債",
    denominator: "自己資本",
    unit: "%",
    multiplier: "×100",
    meaning: "自己資本に対して負債をどれだけ使っているかを見る。",
    note: "有利子負債だけを分子にするD/Eレシオと区別する。",
  },
  {
    id: "current-ratio",
    short: "流動比率",
    name: "流動比率",
    category: "安全性",
    numerator: "流動資産",
    denominator: "流動負債",
    unit: "%",
    multiplier: "×100",
    meaning: "短期の支払能力を流動資産と流動負債の対応で見る。",
    note: "高いほど安全性が高いが、資産効率の低さを示す場合もある。",
  },
  {
    id: "quick-ratio",
    short: "当座比率",
    name: "当座比率",
    category: "安全性",
    numerator: "当座資産",
    denominator: "流動負債",
    unit: "%",
    multiplier: "×100",
    meaning: "現金化しやすい資産で短期負債をどれだけ賄えるかを見る。",
    note: "当座資産は現金預金、受取手形、売掛金、有価証券など。",
  },
  {
    id: "fixed-ratio",
    short: "固定比率",
    name: "固定比率",
    category: "安全性",
    numerator: "固定資産",
    denominator: "自己資本",
    unit: "%",
    multiplier: "×100",
    meaning: "長期運用資産を返済不要の自己資本でどれだけ賄えているかを見る。",
    note: "100%以下なら自己資本の範囲で固定資産を賄っている状態。",
  },
  {
    id: "fixed-long-term",
    short: "固定長期適合率",
    name: "固定長期適合率",
    category: "安全性",
    numerator: "固定資産",
    denominator: "自己資本 + 固定負債",
    unit: "%",
    multiplier: "×100",
    meaning: "固定資産を長期資金でどれだけ賄えているかを見る。",
    note: "固定比率よりも長期借入などを考慮した安全性指標。",
  },
  {
    id: "interest-coverage",
    short: "インタレスト・カバレッジ・レシオ",
    name: "インタレスト・カバレッジ・レシオ",
    category: "安全性",
    numerator: "事業利益",
    denominator: "支払利息・割引料",
    unit: "倍",
    multiplier: "",
    meaning: "利息負担を事業利益で何倍カバーできているかを見る。",
    note: "分子は営業利益 + 受取利息・受取配当金として出題されることがある。",
  },
  {
    id: "asset-turnover",
    short: "総資本回転率",
    name: "総資本回転率",
    category: "効率性",
    numerator: "売上高",
    denominator: "総資本の期中平均",
    unit: "回",
    multiplier: "",
    meaning: "総資本を使って売上をどれだけ生み出したかを見る。",
    note: "ROE分解では、売上高利益率と財務レバレッジと合わせて使う。",
  },
  {
    id: "inventory-turnover",
    short: "棚卸資産回転率",
    name: "棚卸資産回転率",
    category: "効率性",
    numerator: "売上高",
    denominator: "棚卸資産の期中平均",
    unit: "回",
    multiplier: "",
    meaning: "在庫が売上に変わる速さを見る。",
    note: "問題によっては売上原価を分子にする。指定がある場合は指定に従う。",
  },
  {
    id: "receivables-turnover",
    short: "売上債権回転率",
    name: "売上債権回転率",
    category: "効率性",
    numerator: "売上高",
    denominator: "売上債権の期中平均",
    unit: "回",
    multiplier: "",
    meaning: "売上債権をどれだけ効率よく回収しているかを見る。",
    note: "売上債権は受取手形、売掛金、電子記録債権など。",
  },
  {
    id: "payables-turnover",
    short: "買入債務回転率",
    name: "買入債務回転率",
    category: "効率性",
    numerator: "売上原価",
    denominator: "買入債務の期中平均",
    unit: "回",
    multiplier: "",
    meaning: "仕入債務の支払いサイクルを見る。",
    note: "買入債務は支払手形、買掛金、電子記録債務など。",
  },
  {
    id: "fixed-asset-turnover",
    short: "有形固定資産回転率",
    name: "有形固定資産回転率",
    category: "効率性",
    numerator: "売上高",
    denominator: "有形固定資産の期中平均",
    unit: "回",
    multiplier: "",
    meaning: "設備などの有形固定資産が売上獲得にどれだけ使われたかを見る。",
    note: "設備産業では同業比較で効きやすい。",
  },
  {
    id: "eps",
    short: "EPS",
    name: "1株当たり当期純利益",
    category: "市場評価",
    numerator: "当期純利益",
    denominator: "期中平均株式数",
    unit: "円",
    multiplier: "",
    meaning: "1株に対応する当期純利益を見る。",
    note: "希薄化後EPSと通常のEPSの違いに注意する。",
  },
  {
    id: "bps",
    short: "BPS",
    name: "1株当たり純資産",
    category: "市場評価",
    numerator: "自己資本",
    denominator: "発行済株式数",
    unit: "円",
    multiplier: "",
    meaning: "1株に対応する自己資本を見る。",
    note: "自己株式控除後の株式数を使う問題がある。",
  },
  {
    id: "per",
    short: "PER",
    name: "株価収益率",
    category: "市場評価",
    numerator: "株価",
    denominator: "EPS",
    unit: "倍",
    multiplier: "",
    meaning: "株価が1株利益の何倍まで買われているかを見る。",
    note: "利益が小さい、または赤字の場合は解釈が難しくなる。",
  },
  {
    id: "pbr",
    short: "PBR",
    name: "株価純資産倍率",
    category: "市場評価",
    numerator: "株価",
    denominator: "BPS",
    unit: "倍",
    multiplier: "",
    meaning: "株価が1株純資産の何倍まで評価されているかを見る。",
    note: "資産価値と収益力の両方を見ながら解釈する。",
  },
  {
    id: "payout",
    short: "配当性向",
    name: "配当性向",
    category: "市場評価",
    numerator: "1株当たり配当金",
    denominator: "EPS",
    unit: "%",
    multiplier: "×100",
    meaning: "利益のうち配当に回した割合を見る。",
    note: "配当総額 ÷ 当期純利益でも同じ考え方になる。",
  },
  {
    id: "dividend-yield",
    short: "配当利回り",
    name: "配当利回り",
    category: "市場評価",
    numerator: "1株当たり年間配当金",
    denominator: "株価",
    unit: "%",
    multiplier: "×100",
    meaning: "株価に対して年間配当がどれだけ得られるかを見る。",
    note: "予想配当を使うか実績配当を使うか、問題文の指定を確認する。",
  },
  {
    id: "sales-growth",
    short: "売上高成長率",
    name: "売上高成長率",
    category: "成長性",
    numerator: "当期売上高 - 前期売上高",
    denominator: "前期売上高",
    unit: "%",
    multiplier: "×100",
    meaning: "売上規模が前期からどれだけ伸びたかを見る。",
    note: "増減率は差額を前期値で割る、と覚える。",
  },
  {
    id: "operating-income-growth",
    short: "営業利益成長率",
    name: "営業利益成長率",
    category: "成長性",
    numerator: "当期営業利益 - 前期営業利益",
    denominator: "前期営業利益",
    unit: "%",
    multiplier: "×100",
    meaning: "本業利益が前期からどれだけ伸びたかを見る。",
    note: "前期が赤字または極端に小さい場合は解釈に注意する。",
  },
  {
    id: "dupont-margin",
    short: "ROE分解: 利益率",
    name: "売上高当期純利益率",
    category: "分解式",
    numerator: "当期純利益",
    denominator: "売上高",
    unit: "%",
    multiplier: "×100",
    meaning: "ROEを分解したときの収益性部分。",
    note: "ROE = 売上高当期純利益率 × 総資本回転率 × 財務レバレッジ。",
  },
  {
    id: "dupont-turnover",
    short: "ROE分解: 回転率",
    name: "総資本回転率",
    category: "分解式",
    numerator: "売上高",
    denominator: "総資本",
    unit: "回",
    multiplier: "",
    meaning: "ROEを分解したときの効率性部分。",
    note: "売上高を中心に、利益率と資本効率をつなげる。",
  },
  {
    id: "financial-leverage",
    short: "財務レバレッジ",
    name: "財務レバレッジ",
    category: "分解式",
    numerator: "総資本",
    denominator: "自己資本",
    unit: "倍",
    multiplier: "",
    meaning: "自己資本に対して総資本をどれだけ膨らませているかを見る。",
    note: "ROE分解の3要素のうち、安全性と表裏になる部分。",
  },
];

const DEFAULT_CALC_PROBLEMS = [
  {
    id: "calc-roe-average-equity",
    title: "ROE: 期中平均自己資本を使う",
    category: "収益性",
    prompt: "当期純利益が1,200百万円、自己資本が期首11,000百万円・期末13,000百万円のとき、ROEを求めなさい。",
    data: [
      { label: "当期純利益", value: "1,200百万円" },
      { label: "期首自己資本", value: "11,000百万円" },
      { label: "期末自己資本", value: "13,000百万円" },
    ],
    answer: 10,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "ROE = 当期純利益 / 自己資本の期中平均 ×100",
    explanation: "自己資本の期中平均は(11,000 + 13,000) / 2 = 12,000。1,200 / 12,000 ×100 = 10.0%。",
  },
  {
    id: "calc-roa-average-assets",
    title: "ROA: 総資産の期中平均",
    category: "収益性",
    prompt: "当期純利益が900百万円、総資産が期首18,000百万円・期末22,000百万円のとき、ROAを求めなさい。",
    data: [
      { label: "当期純利益", value: "900百万円" },
      { label: "期首総資産", value: "18,000百万円" },
      { label: "期末総資産", value: "22,000百万円" },
    ],
    answer: 4.5,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "ROA = 当期純利益 / 総資産の期中平均 ×100",
    explanation: "総資産の期中平均は20,000百万円。900 / 20,000 ×100 = 4.5%。",
  },
  {
    id: "calc-interest-coverage",
    title: "インタレスト・カバレッジ・レシオ",
    category: "安全性",
    prompt: "営業利益2,400百万円、受取利息・配当金100百万円、支払利息・割引料500百万円のとき、インタレスト・カバレッジ・レシオを求めなさい。",
    data: [
      { label: "営業利益", value: "2,400百万円" },
      { label: "受取利息・配当金", value: "100百万円" },
      { label: "支払利息・割引料", value: "500百万円" },
    ],
    answer: 5,
    tolerance: 0.05,
    unit: "倍",
    precision: 1,
    formula: "インタレスト・カバレッジ・レシオ = 事業利益 / 支払利息・割引料",
    explanation: "事業利益は2,400 + 100 = 2,500百万円。2,500 / 500 = 5.0倍。",
  },
  {
    id: "calc-current-ratio",
    title: "流動比率",
    category: "安全性",
    prompt: "流動資産8,400百万円、流動負債6,000百万円のとき、流動比率を求めなさい。",
    data: [
      { label: "流動資産", value: "8,400百万円" },
      { label: "流動負債", value: "6,000百万円" },
    ],
    answer: 140,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "流動比率 = 流動資産 / 流動負債 ×100",
    explanation: "8,400 / 6,000 ×100 = 140.0%。",
  },
  {
    id: "calc-equity-ratio",
    title: "自己資本比率",
    category: "安全性",
    prompt: "自己資本9,600百万円、総資産24,000百万円のとき、自己資本比率を求めなさい。",
    data: [
      { label: "自己資本", value: "9,600百万円" },
      { label: "総資産", value: "24,000百万円" },
    ],
    answer: 40,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "自己資本比率 = 自己資本 / 総資本 ×100",
    explanation: "9,600 / 24,000 ×100 = 40.0%。",
  },
  {
    id: "calc-total-capital-turnover",
    title: "総資本回転率",
    category: "効率性",
    prompt: "売上高60,000百万円、総資本が期首29,000百万円・期末31,000百万円のとき、総資本回転率を求めなさい。",
    data: [
      { label: "売上高", value: "60,000百万円" },
      { label: "期首総資本", value: "29,000百万円" },
      { label: "期末総資本", value: "31,000百万円" },
    ],
    answer: 2,
    tolerance: 0.01,
    unit: "回",
    precision: 2,
    formula: "総資本回転率 = 売上高 / 総資本の期中平均",
    explanation: "総資本の期中平均は30,000百万円。60,000 / 30,000 = 2.00回。",
  },
  {
    id: "calc-per",
    title: "PER",
    category: "市場評価",
    prompt: "株価2,400円、EPS160円のとき、PERを求めなさい。",
    data: [
      { label: "株価", value: "2,400円" },
      { label: "EPS", value: "160円" },
    ],
    answer: 15,
    tolerance: 0.01,
    unit: "倍",
    precision: 1,
    formula: "PER = 株価 / EPS",
    explanation: "2,400 / 160 = 15.0倍。",
  },
  {
    id: "calc-pbr-from-per-roe",
    title: "PERとROEからPBRを求める",
    category: "市場評価",
    prompt: "PERが12倍、ROEが8%のとき、PBRを求めなさい。",
    data: [
      { label: "PER", value: "12倍" },
      { label: "ROE", value: "8%" },
    ],
    answer: 0.96,
    tolerance: 0.005,
    unit: "倍",
    precision: 2,
    formula: "PBR = PER × ROE",
    explanation: "ROEは小数で0.08として使う。12 × 0.08 = 0.96倍。",
  },
  {
    id: "calc-payout-ratio",
    title: "配当性向",
    category: "市場評価",
    prompt: "1株当たり年間配当金45円、EPS150円のとき、配当性向を求めなさい。",
    data: [
      { label: "1株当たり年間配当金", value: "45円" },
      { label: "EPS", value: "150円" },
    ],
    answer: 30,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "配当性向 = 1株当たり配当金 / EPS ×100",
    explanation: "45 / 150 ×100 = 30.0%。",
  },
  {
    id: "calc-dupont-roe",
    title: "ROEの3分解",
    category: "分解式",
    prompt: "売上高当期純利益率6%、総資本回転率1.2回、財務レバレッジ2.0倍のとき、ROEを求めなさい。",
    data: [
      { label: "売上高当期純利益率", value: "6%" },
      { label: "総資本回転率", value: "1.2回" },
      { label: "財務レバレッジ", value: "2.0倍" },
    ],
    answer: 14.4,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "ROE = 売上高当期純利益率 × 総資本回転率 × 財務レバレッジ",
    explanation: "6%を小数で0.06として、0.06 × 1.2 × 2.0 = 0.144。百分率で14.4%。",
  },
  {
    id: "calc-fixed-long-term",
    title: "固定長期適合率",
    category: "安全性",
    prompt: "固定資産13,500百万円、自己資本9,000百万円、固定負債6,000百万円のとき、固定長期適合率を求めなさい。",
    data: [
      { label: "固定資産", value: "13,500百万円" },
      { label: "自己資本", value: "9,000百万円" },
      { label: "固定負債", value: "6,000百万円" },
    ],
    answer: 90,
    tolerance: 0.05,
    unit: "%",
    precision: 1,
    formula: "固定長期適合率 = 固定資産 / (自己資本 + 固定負債) ×100",
    explanation: "13,500 / (9,000 + 6,000) ×100 = 90.0%。",
  },
  {
    id: "calc-inventory-days",
    title: "棚卸資産回転期間",
    category: "効率性",
    prompt: "棚卸資産回転率が8.0回のとき、棚卸資産回転期間を365日基準で求めなさい。",
    data: [
      { label: "棚卸資産回転率", value: "8.0回" },
      { label: "年間日数", value: "365日" },
    ],
    answer: 45.6,
    tolerance: 0.05,
    unit: "日",
    precision: 1,
    formula: "棚卸資産回転期間 = 365日 / 棚卸資産回転率",
    explanation: "365 / 8.0 = 45.625。小数第1位で45.6日。",
  },
];

const EXTRA_CALC_PROBLEMS = Array.isArray(window.CMA_EXTRA_CALC_PROBLEMS) ? window.CMA_EXTRA_CALC_PROBLEMS : [];
const DEFAULT_CONTENT_PROBLEMS = [...DEFAULT_CALC_PROBLEMS, ...EXTRA_CALC_PROBLEMS];
const BASE_CATEGORY_ORDER = ["すべて", "弱点", "収益性", "安全性", "効率性", "市場評価", "成長性", "分解式"];
const STORE_KEY = "cma-ratio-drill-progress-v1";
const PROBLEM_STORE_KEY = "cma-ratio-calculation-progress-v1";
const UI_KEY = "cma-ratio-drill-ui-v1";
const DATA_KEY = "cma-ratio-drill-content-v1";

const state = {
  view: "drill",
  category: "すべて",
  search: "",
  metrics: loadMetrics(),
  calculationProblems: loadCalculationProblems(),
  currentId: "",
  currentProblemId: "",
  activeSlot: "numerator",
  answers: { numerator: "", denominator: "" },
  choices: [],
  feedback: null,
  inlineMetricEditorOpen: false,
  problemAnswer: "",
  problemFeedback: null,
  inlineProblemEditorOpen: false,
  pendingProblemDeleteId: "",
  problemProgress: loadProblemProgress(),
  editorId: "",
  editorMessage: "",
  editorMessageType: "good",
  showCardAnswer: false,
  progress: loadProgress(),
};

const el = {
  categoryList: document.querySelector("#categoryList"),
  progressSummary: document.querySelector("#progressSummary"),
  appView: document.querySelector("#appView"),
  workspaceTitle: document.querySelector("#workspaceTitle"),
  searchInput: document.querySelector("#searchInput"),
};

state.currentId = state.metrics[0]?.id || "";
state.currentProblemId = state.calculationProblems[0]?.id || "";
restoreUi();
prepareQuestion(getCurrentMetric());
render();
wireEvents();

function wireEvents() {
  document.addEventListener("click", (event) => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      state.view = viewButton.dataset.view;
      state.showCardAnswer = false;
      state.problemFeedback = null;
      state.inlineMetricEditorOpen = false;
      state.inlineProblemEditorOpen = false;
      state.pendingProblemDeleteId = "";
      saveUi();
      render();
      return;
    }

    const categoryButton = event.target.closest("[data-category]");
    if (categoryButton) {
      state.category = categoryButton.dataset.category;
      if (state.view === "calculation") {
        const problem = getFilteredProblems()[0] || state.calculationProblems[0];
        if (problem) setCurrentProblem(problem.id);
      } else {
        const metric = getFilteredMetrics()[0] || state.metrics[0];
        if (metric) setCurrentMetric(metric.id);
      }
      saveUi();
      render();
      return;
    }

    const choiceButton = event.target.closest("[data-choice]");
    if (choiceButton) {
      fillActiveSlot(choiceButton.dataset.choice);
      return;
    }

    const slotButton = event.target.closest("[data-slot]");
    if (slotButton) {
      state.activeSlot = slotButton.dataset.slot;
      render();
      return;
    }

    const metricButton = event.target.closest("[data-metric-id]");
    if (metricButton) {
      state.view = "drill";
      state.inlineMetricEditorOpen = false;
      setCurrentMetric(metricButton.dataset.metricId);
      saveUi();
      render();
      return;
    }

    const editMetricButton = event.target.closest("[data-edit-metric-id]");
    if (editMetricButton) {
      state.view = "edit";
      state.editorId = editMetricButton.dataset.editMetricId;
      state.editorMessage = "";
      state.editorMessageType = "good";
      saveUi();
      render();
      return;
    }

    const problemButton = event.target.closest("[data-problem-id]");
    if (problemButton) {
      state.view = "calculation";
      state.inlineProblemEditorOpen = false;
      state.pendingProblemDeleteId = "";
      setCurrentProblem(problemButton.dataset.problemId);
      saveUi();
      render();
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    handleAction(actionButton.dataset.action);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!["metric-editor", "problem-editor"].includes(form.dataset.form)) return;
    event.preventDefault();
    if (form.dataset.form === "metric-editor") saveMetricFromForm(form);
    if (form.dataset.form === "problem-editor") saveProblemFromForm(form);
  });

  document.addEventListener("input", (event) => {
    const problemInput = event.target.closest("#problemAnswerInput");
    if (problemInput) {
      state.problemAnswer = problemInput.value;
      return;
    }
  });

  el.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    if (state.view === "calculation") {
      const problem = getFilteredProblems()[0];
      if (problem && !getFilteredProblems().some((item) => item.id === state.currentProblemId)) {
        setCurrentProblem(problem.id);
      }
    } else {
      const metric = getFilteredMetrics()[0];
      if (metric && !getFilteredMetrics().some((item) => item.id === state.currentId)) {
        setCurrentMetric(metric.id);
      }
    }
    saveUi();
    render();
  });
}

function handleAction(action) {
  if (action === "previous") moveBy(-1);
  if (action === "next") moveBy(1);
  if (action === "random") moveRandom();
  if (action === "check") checkAnswer();
  if (action === "check-problem") checkProblemAnswer();
  if (action === "show-problem-answer") showProblemAnswer();
  if (action === "clear-answer") clearAnswer();
  if (action === "show-answer") showAnswer();
  if (action === "toggle-current-metric-editor") {
    state.inlineMetricEditorOpen = !state.inlineMetricEditorOpen;
    render();
  }
  if (action === "toggle-current-problem-editor") {
    state.inlineProblemEditorOpen = !state.inlineProblemEditorOpen;
    state.pendingProblemDeleteId = "";
    render();
  }
  if (action === "duplicate-current-problem") duplicateCurrentProblem();
  if (action === "delete-current-problem") requestDeleteCurrentProblem();
  if (action === "cancel-delete-current-problem") cancelDeleteCurrentProblem();
  if (action === "confirm-delete-current-problem") deleteCurrentProblem();
  if (action === "toggle-card") {
    state.showCardAnswer = !state.showCardAnswer;
    render();
  }
  if (action === "rate-review") rateCurrent("review");
  if (action === "rate-solid") rateCurrent("solid");
  if (action === "rate-mastered") rateCurrent("mastered");
  if (action === "reset-progress") resetProgress();
  if (action === "new-metric") startNewMetric();
  if (action === "delete-metric") deleteCurrentEditorMetric();
  if (action === "export-content") exportContentJson();
  if (action === "apply-content") applyContentJson();
  if (action === "reset-content") resetContentData();
}

function restoreUi() {
  try {
    const saved = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
    if (["drill", "calculation", "cards", "list", "edit"].includes(saved.view)) state.view = saved.view;
    if (getCategoryOrder().includes(saved.category)) state.category = saved.category;
    if (typeof saved.search === "string") state.search = saved.search;
    if (state.metrics.some((metric) => metric.id === saved.currentId)) state.currentId = saved.currentId;
    if (state.calculationProblems.some((problem) => problem.id === saved.currentProblemId)) {
      state.currentProblemId = saved.currentProblemId;
    }
    if (state.metrics.some((metric) => metric.id === saved.editorId)) state.editorId = saved.editorId;
    el.searchInput.value = state.search;
  } catch {
    localStorage.removeItem(UI_KEY);
  }
}

function saveUi() {
  localStorage.setItem(
    UI_KEY,
    JSON.stringify({
      view: state.view,
      category: state.category,
      search: state.search,
      currentId: state.currentId,
      currentProblemId: state.currentProblemId,
      editorId: state.editorId,
    }),
  );
}

function loadContentData() {
  try {
    const saved = JSON.parse(localStorage.getItem(DATA_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    localStorage.removeItem(DATA_KEY);
    return {};
  }
}

function loadMetrics() {
  const saved = loadContentData();
  if (Array.isArray(saved.metrics) && saved.metrics.length) {
    return mergeById(DEFAULT_METRICS, saved.metrics, sanitizeMetrics);
  }
  return clone(DEFAULT_METRICS);
}

function loadCalculationProblems() {
  const saved = loadContentData();
  if (Array.isArray(saved.calculationProblems) && saved.calculationProblems.length) {
    return mergeById(DEFAULT_CONTENT_PROBLEMS, saved.calculationProblems, sanitizeProblems);
  }
  return sanitizeProblems(DEFAULT_CONTENT_PROBLEMS);
}

function saveContentData() {
  localStorage.setItem(
    DATA_KEY,
    JSON.stringify({
      metrics: state.metrics,
      calculationProblems: state.calculationProblems,
      updatedAt: new Date().toISOString(),
    }),
  );
}

function sanitizeMetrics(metrics) {
  return metrics
    .map((metric, index) => ({
      id: normalizeId(metric.id || metric.short || `metric-${index + 1}`),
      short: String(metric.short || "").trim() || `指標${index + 1}`,
      name: String(metric.name || "").trim() || "名称未設定",
      category: String(metric.category || "").trim() || "未分類",
      numerator: String(metric.numerator || "").trim() || "分子未設定",
      denominator: String(metric.denominator || "").trim() || "分母未設定",
      unit: String(metric.unit || "").trim(),
      multiplier: String(metric.multiplier || "").trim(),
      meaning: String(metric.meaning || "").trim(),
      note: String(metric.note || "").trim(),
    }))
    .filter((metric, index, arr) => arr.findIndex((item) => item.id === metric.id) === index);
}

function sanitizeProblems(problems) {
  return problems
    .map((problem, index) => ({
      id: normalizeId(problem.id || problem.title || `problem-${index + 1}`),
      title: String(problem.title || "").trim() || `計算問題${index + 1}`,
      category: String(problem.category || "").trim() || "未分類",
      prompt: String(problem.prompt || "").trim(),
      data: Array.isArray(problem.data)
        ? problem.data.map((item) => ({
            label: String(item.label || "").trim(),
            value: String(item.value || "").trim(),
          })).filter((item) => item.label || item.value)
        : [],
      answer: Number(problem.answer),
      tolerance: Number.isFinite(Number(problem.tolerance)) ? Number(problem.tolerance) : 0.01,
      unit: String(problem.unit || "").trim(),
      precision: Number.isFinite(Number(problem.precision)) ? Number(problem.precision) : 2,
      formula: String(problem.formula || "").trim(),
      explanation: String(problem.explanation || "").trim(),
    }))
    .filter((problem, index, arr) => Number.isFinite(problem.answer) && arr.findIndex((item) => item.id === problem.id) === index);
}

function mergeById(defaultItems, savedItems, sanitizer) {
  const merged = new Map();
  sanitizer(defaultItems).forEach((item) => merged.set(item.id, item));
  sanitizer(savedItems).forEach((item) => merged.set(item.id, item));
  return [...merged.values()];
}

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    localStorage.removeItem(STORE_KEY);
    return {};
  }
}

function saveProgress() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.progress));
}

function loadProblemProgress() {
  try {
    return JSON.parse(localStorage.getItem(PROBLEM_STORE_KEY) || "{}");
  } catch {
    localStorage.removeItem(PROBLEM_STORE_KEY);
    return {};
  }
}

function saveProblemProgress() {
  localStorage.setItem(PROBLEM_STORE_KEY, JSON.stringify(state.problemProgress));
}

function resetProgress() {
  const ok = window.confirm("学習履歴をリセットしますか。");
  if (!ok) return;
  state.progress = {};
  state.problemProgress = {};
  saveProgress();
  saveProblemProgress();
  prepareQuestion(getCurrentMetric());
  render();
}

function getFilteredMetrics() {
  const keyword = normalize(state.search);
  return state.metrics.filter((metric) => {
    const matchesCategory =
      state.category === "すべて" ||
      metric.category === state.category ||
      (state.category === "弱点" && isReviewMetric(metric.id));

    const haystack = normalize([
      metric.short,
      metric.name,
      metric.category,
      metric.numerator,
      metric.denominator,
      metric.meaning,
      metric.note,
    ].join(" "));

    return matchesCategory && (!keyword || haystack.includes(keyword));
  });
}

function getFilteredProblems() {
  const keyword = normalize(state.search);
  return state.calculationProblems.filter((problem) => {
    const matchesCategory =
      state.category === "すべて" ||
      problem.category === state.category ||
      (state.category === "弱点" && isReviewProblem(problem.id));

    const haystack = normalize([
      problem.title,
      problem.category,
      problem.prompt,
      problem.formula,
      problem.explanation,
      problem.data.map((item) => `${item.label} ${item.value}`).join(" "),
    ].join(" "));

    return matchesCategory && (!keyword || haystack.includes(keyword));
  });
}

function isReviewMetric(id) {
  const progress = state.progress[id];
  if (!progress) return false;
  return progress.confidence === "review" || progress.lastResult === "wrong";
}

function isReviewProblem(id) {
  const progress = state.problemProgress[id];
  if (!progress) return false;
  return progress.confidence === "review" || progress.lastResult === "wrong";
}

function getCurrentMetric() {
  return state.metrics.find((metric) => metric.id === state.currentId) || state.metrics[0];
}

function setCurrentMetric(id) {
  state.currentId = id;
  state.showCardAnswer = false;
  prepareQuestion(getCurrentMetric());
}

function getCurrentProblem() {
  return state.calculationProblems.find((problem) => problem.id === state.currentProblemId) || state.calculationProblems[0];
}

function setCurrentProblem(id) {
  state.currentProblemId = id;
  state.problemAnswer = "";
  state.problemFeedback = null;
  state.pendingProblemDeleteId = "";
}

function prepareQuestion(metric) {
  if (!metric) return;
  state.activeSlot = "numerator";
  state.answers = { numerator: "", denominator: "" };
  state.feedback = null;
  state.choices = buildChoices(metric);
}

function buildChoices(metric) {
  const correct = [metric.numerator, metric.denominator];
  const pool = unique(state.metrics.flatMap((item) => [item.numerator, item.denominator]))
    .filter((item) => !correct.includes(item));
  return shuffle([...correct, ...shuffle(pool).slice(0, 10)]).slice(0, 12);
}

function fillActiveSlot(choice) {
  state.answers[state.activeSlot] = choice;
  if (state.activeSlot === "numerator") state.activeSlot = "denominator";
  render();
}

function clearAnswer() {
  prepareQuestion(getCurrentMetric());
  render();
}

function showAnswer() {
  const metric = getCurrentMetric();
  state.answers = { numerator: metric.numerator, denominator: metric.denominator };
  state.feedback = {
    type: "shown",
    title: "答え",
    message: buildFormula(metric),
  };
  render();
}

function checkAnswer() {
  const metric = getCurrentMetric();
  const numeratorOk = state.answers.numerator === metric.numerator;
  const denominatorOk = state.answers.denominator === metric.denominator;
  const correct = numeratorOk && denominatorOk;

  recordAttempt(metric.id, correct);

  state.feedback = {
    type: correct ? "good" : "bad",
    title: correct ? "正解" : "もう一度",
    message: correct
      ? "分子・分母とも一致しています。"
      : `正しくは ${buildFormula(metric)} です。`,
  };
  render();
}

function checkProblemAnswer() {
  const problem = getCurrentProblem();
  if (!problem) return;
  const submitted = parseAnswerNumber(state.problemAnswer);

  if (!Number.isFinite(submitted)) {
    state.problemFeedback = {
      type: "bad",
      title: "数値を入力してください",
      message: "答えは半角数字で入力します。カンマは入っていても大丈夫です。",
    };
    render();
    return;
  }

  const tolerance = Number(problem.tolerance) || 0.01;
  const correct = Math.abs(submitted - Number(problem.answer)) <= tolerance;
  recordProblemAttempt(problem.id, correct);

  state.problemFeedback = {
    type: correct ? "good" : "bad",
    title: correct ? "正解" : "もう一歩",
    message: correct
      ? `${formatProblemAnswer(problem)} で合っています。`
      : `正しくは ${formatProblemAnswer(problem)} です。`,
  };
  render();
}

function showProblemAnswer() {
  const problem = getCurrentProblem();
  if (!problem) return;
  state.problemAnswer = formatNumberForInput(problem.answer, problem.precision);
  state.problemFeedback = {
    type: "shown",
    title: "答え",
    message: `${formatProblemAnswer(problem)}。`,
  };
  render();
}

function recordAttempt(id, correct) {
  const progress = state.progress[id] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    confidence: "new",
    lastResult: "",
  };

  progress.attempts += 1;
  progress.correct += correct ? 1 : 0;
  progress.streak = correct ? progress.streak + 1 : 0;
  progress.lastResult = correct ? "correct" : "wrong";
  progress.updatedAt = new Date().toISOString();

  if (!correct) progress.confidence = "review";
  if (correct && progress.streak >= 2 && progress.confidence !== "mastered") progress.confidence = "solid";
  if (correct && progress.streak >= 4) progress.confidence = "mastered";

  state.progress[id] = progress;
  saveProgress();
}

function recordProblemAttempt(id, correct) {
  const progress = state.problemProgress[id] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    confidence: "new",
    lastResult: "",
  };

  progress.attempts += 1;
  progress.correct += correct ? 1 : 0;
  progress.streak = correct ? progress.streak + 1 : 0;
  progress.lastResult = correct ? "correct" : "wrong";
  progress.updatedAt = new Date().toISOString();

  if (!correct) progress.confidence = "review";
  if (correct && progress.streak >= 2 && progress.confidence !== "mastered") progress.confidence = "solid";
  if (correct && progress.streak >= 4) progress.confidence = "mastered";

  state.problemProgress[id] = progress;
  saveProblemProgress();
}

function rateCurrent(confidence) {
  if (state.view === "calculation") {
    rateCurrentProblem(confidence);
    return;
  }

  const metric = getCurrentMetric();
  const progress = state.progress[metric.id] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    confidence: "new",
    lastResult: "",
  };

  progress.confidence = confidence;
  progress.updatedAt = new Date().toISOString();
  if (confidence === "review") progress.lastResult = "wrong";
  if (confidence === "mastered") progress.lastResult = "correct";
  state.progress[metric.id] = progress;
  saveProgress();
  render();
}

function rateCurrentProblem(confidence) {
  const problem = getCurrentProblem();
  if (!problem) return;
  const progress = state.problemProgress[problem.id] || {
    attempts: 0,
    correct: 0,
    streak: 0,
    confidence: "new",
    lastResult: "",
  };

  progress.confidence = confidence;
  progress.updatedAt = new Date().toISOString();
  if (confidence === "review") progress.lastResult = "wrong";
  if (confidence === "mastered") progress.lastResult = "correct";
  state.problemProgress[problem.id] = progress;
  saveProblemProgress();
  render();
}

function moveBy(direction) {
  if (state.view === "calculation") {
    const problems = getFilteredProblems();
    if (!problems.length) return;
    const currentIndex = Math.max(0, problems.findIndex((problem) => problem.id === state.currentProblemId));
    const nextIndex = (currentIndex + direction + problems.length) % problems.length;
    setCurrentProblem(problems[nextIndex].id);
    saveUi();
    render();
    return;
  }

  if (state.view === "edit") {
    state.view = "drill";
  }

  const metrics = getFilteredMetrics();
  if (!metrics.length) return;
  const currentIndex = Math.max(0, metrics.findIndex((metric) => metric.id === state.currentId));
  const nextIndex = (currentIndex + direction + metrics.length) % metrics.length;
  setCurrentMetric(metrics[nextIndex].id);
  saveUi();
  render();
}

function moveRandom() {
  if (state.view === "calculation") {
    const problems = getFilteredProblems();
    if (!problems.length) return;
    const candidates = problems.filter((problem) => problem.id !== state.currentProblemId);
    const next = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : problems[0];
    setCurrentProblem(next.id);
    saveUi();
    render();
    return;
  }

  const metrics = getFilteredMetrics();
  if (!metrics.length) return;
  const candidates = metrics.filter((metric) => metric.id !== state.currentId);
  const next = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : metrics[0];
  setCurrentMetric(next.id);
  saveUi();
  render();
}

function render() {
  renderModeTabs();
  renderCategories();
  renderProgress();
  renderTitle();

  if (state.view === "edit") {
    el.appView.innerHTML = renderEditor();
    return;
  }

  if (state.view === "calculation") {
    const problems = getFilteredProblems();
    const problem = problems.find((item) => item.id === state.currentProblemId) || problems[0];

    if (!problems.length || !problem) {
      el.appView.innerHTML = `<div class="empty-state">該当する計算問題がありません。</div>`;
      return;
    }

    if (problem.id !== state.currentProblemId) setCurrentProblem(problem.id);
    el.appView.innerHTML = renderCalculation(problem, problems);
    return;
  }

  const metrics = getFilteredMetrics();
  const metric = metrics.find((item) => item.id === state.currentId) || metrics[0];

  if (!metrics.length || !metric) {
    el.appView.innerHTML = `<div class="empty-state">該当する指標がありません。</div>`;
    return;
  }

  if (metric.id !== state.currentId) setCurrentMetric(metric.id);

  if (state.view === "drill") el.appView.innerHTML = renderDrill(metric, metrics);
  if (state.view === "cards") el.appView.innerHTML = renderCards(metric, metrics);
  if (state.view === "list") el.appView.innerHTML = renderList(metrics);
}

function renderModeTabs() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

function renderCategories() {
  const categoryOrder = getCategoryOrder();
  const source = state.view === "calculation" ? state.calculationProblems : state.metrics;
  const counts = categoryOrder.reduce((acc, category) => {
    acc[category] = category === "すべて"
      ? source.length
      : category === "弱点"
        ? source.filter((item) => state.view === "calculation" ? isReviewProblem(item.id) : isReviewMetric(item.id)).length
        : source.filter((item) => item.category === category).length;
    return acc;
  }, {});

  el.categoryList.innerHTML = categoryOrder.map((category) => `
    <button class="category-button ${state.category === category ? "active" : ""}" type="button" data-category="${escapeHtml(category)}">
      <span>${escapeHtml(category)}</span>
      <span class="category-count">${counts[category]}</span>
    </button>
  `).join("");
}

function renderProgress() {
  const entries = Object.values(state.progress);
  const attempts = entries.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const correct = entries.reduce((sum, item) => sum + (item.correct || 0), 0);
  const studied = entries.filter((item) => item.attempts > 0 || item.confidence !== "new").length;
  const mastered = entries.filter((item) => item.confidence === "mastered").length;
  const review = state.metrics.filter((metric) => isReviewMetric(metric.id)).length;
  const accuracy = attempts ? Math.round((correct / attempts) * 100) : 0;
  const problemEntries = Object.values(state.problemProgress);
  const problemAttempts = problemEntries.reduce((sum, item) => sum + (item.attempts || 0), 0);
  const problemCorrect = problemEntries.reduce((sum, item) => sum + (item.correct || 0), 0);
  const problemAccuracy = problemAttempts ? Math.round((problemCorrect / problemAttempts) * 100) : 0;

  el.progressSummary.innerHTML = `
    ${progressTile(studied, "指標着手")}
    ${progressTile(`${accuracy}%`, "穴埋め")}
    ${progressTile(problemAttempts, "計算演習")}
    ${progressTile(`${problemAccuracy}%`, "計算正答")}
    ${progressTile(mastered, "定着")}
    ${progressTile(review, "弱点")}
  `;
}

function progressTile(value, label) {
  return `<div class="progress-tile"><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`;
}

function renderTitle() {
  const titles = {
    drill: "穴埋めドリル",
    calculation: "計算問題",
    cards: "暗記カード",
    list: "指標一覧",
    edit: "教材編集",
  };
  el.workspaceTitle.textContent = titles[state.view];
}

function renderDrill(metric, metrics) {
  const progress = state.progress[metric.id] || {};
  const index = metrics.findIndex((item) => item.id === metric.id) + 1;
  const numeratorFilled = Boolean(state.answers.numerator);
  const denominatorFilled = Boolean(state.answers.denominator);
  const used = new Set([state.answers.numerator, state.answers.denominator].filter(Boolean));

  return `
    <article class="quiz-panel">
      <div class="formula-meta">
        <div class="badge-row">
          <span class="badge">${escapeHtml(metric.category)}</span>
          <span class="badge ${escapeHtml(progress.confidence || "")}">${escapeHtml(confidenceLabel(progress.confidence))}</span>
        </div>
        <span class="counter">${index} / ${metrics.length}</span>
      </div>

      <h2 class="metric-title">${escapeHtml(metric.short)}</h2>
      <p class="metric-subtitle">${escapeHtml(metric.name)}。${escapeHtml(metric.meaning)}</p>

      <div class="formula-board">
        <div class="formula-line">
          <span class="formula-symbol">${escapeHtml(metric.short)}</span>
          <span class="operator">=</span>
          ${slotButton("numerator", state.answers.numerator || "分子", !numeratorFilled)}
          <span class="operator">/</span>
          ${slotButton("denominator", state.answers.denominator || "分母", !denominatorFilled)}
          <span class="unit-text">${escapeHtml([metric.multiplier, metric.unit].filter(Boolean).join(" "))}</span>
        </div>
      </div>

      <div class="choice-grid">
        ${state.choices.map((choice) => `
          <button class="choice-button ${used.has(choice) ? "used" : ""}" type="button" data-choice="${escapeHtml(choice)}">
            ${escapeHtml(choice)}
          </button>
        `).join("")}
      </div>

      <div class="card-actions">
        <div class="primary-actions">
          <button type="button" data-action="check">判定</button>
          <button class="ghost" type="button" data-action="show-answer">答え</button>
          <button class="ghost" type="button" data-action="clear-answer">クリア</button>
          <button class="ghost" type="button" data-action="toggle-current-metric-editor">${state.inlineMetricEditorOpen ? "編集を閉じる" : "この指標を編集"}</button>
        </div>
        <div class="rating-actions">
          <button class="ghost" type="button" data-action="rate-review">復習</button>
          <button class="ghost" type="button" data-action="rate-solid">まずまず</button>
          <button class="ghost" type="button" data-action="rate-mastered">定着</button>
        </div>
      </div>

      ${renderFeedback(metric)}

      <div class="note-grid">
        <div class="note-block">
          <h3>押さえどころ</h3>
          <p>${escapeHtml(metric.note)}</p>
        </div>
        <div class="note-block">
          <h3>完成式</h3>
          <p class="answer-line">${escapeHtml(buildFormula(metric))}</p>
        </div>
      </div>
      ${state.inlineMetricEditorOpen ? renderMetricEditForm(metric, "inline") : ""}
    </article>
  `;
}

function slotButton(slot, label, empty) {
  return `
    <button class="slot-button ${empty ? "empty" : ""} ${state.activeSlot === slot ? "active" : ""}" type="button" data-slot="${slot}">
      ${escapeHtml(label)}
    </button>
  `;
}

function renderFeedback(metric) {
  if (!state.feedback) return "";
  const className = state.feedback.type === "good" ? "good" : state.feedback.type === "bad" ? "bad" : "";
  return `
    <div class="feedback ${className}">
      <strong>${escapeHtml(state.feedback.title)}</strong>
      <div>${escapeHtml(state.feedback.message)}</div>
      <div class="answer-line">${escapeHtml(buildFormula(metric))}</div>
    </div>
  `;
}

function renderCalculation(problem, problems) {
  const progress = state.problemProgress[problem.id] || {};
  const index = problems.findIndex((item) => item.id === problem.id) + 1;

  return `
    <article class="quiz-panel">
      <div class="formula-meta">
        <div class="badge-row">
          <span class="badge">${escapeHtml(problem.category)}</span>
          <span class="badge ${escapeHtml(progress.confidence || "")}">${escapeHtml(confidenceLabel(progress.confidence))}</span>
        </div>
        <span class="counter">${index} / ${problems.length}</span>
      </div>

      <h2 class="metric-title">${escapeHtml(problem.title)}</h2>
      <p class="metric-subtitle">${escapeHtml(problem.prompt)}</p>

      <div class="problem-grid">
        ${problem.data.map((item) => `
          <div class="problem-data">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>
        `).join("")}
      </div>

      <div class="answer-panel">
        <label class="field">
          <span>解答</span>
          <input id="problemAnswerInput" class="answer-input" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(state.problemAnswer)}" placeholder="例: ${escapeHtml(formatNumberForInput(problem.answer, problem.precision))}">
        </label>
        <span class="answer-unit">${escapeHtml(problem.unit)}</span>
      </div>

      <div class="card-actions">
        <div class="primary-actions">
          <button type="button" data-action="check-problem">判定</button>
          <button class="ghost" type="button" data-action="show-problem-answer">答え</button>
          <button class="ghost" type="button" data-action="random">シャッフル</button>
          <button class="ghost" type="button" data-action="toggle-current-problem-editor">${state.inlineProblemEditorOpen ? "編集を閉じる" : "この問題を編集"}</button>
          <button class="ghost" type="button" data-action="duplicate-current-problem">類題を作成</button>
        </div>
        <div class="rating-actions">
          <button class="ghost" type="button" data-action="rate-review">復習</button>
          <button class="ghost" type="button" data-action="rate-solid">まずまず</button>
          <button class="ghost" type="button" data-action="rate-mastered">定着</button>
        </div>
      </div>

      ${renderProblemFeedback(problem)}
      ${state.problemFeedback ? renderProblemSolution(problem) : ""}
      ${state.inlineProblemEditorOpen ? renderProblemEditForm(problem) : ""}
    </article>
  `;
}

function renderProblemFeedback(problem) {
  if (!state.problemFeedback) return "";
  const className = state.problemFeedback.type === "good" ? "good" : state.problemFeedback.type === "bad" ? "bad" : "";
  return `
    <div class="feedback ${className}">
      <strong>${escapeHtml(state.problemFeedback.title)}</strong>
      <div>${escapeHtml(state.problemFeedback.message)}</div>
    </div>
  `;
}

function renderProblemSolution(problem) {
  return `
    <div class="note-grid">
      <div class="note-block">
        <h3>使う式</h3>
        <p>${escapeHtml(problem.formula)}</p>
      </div>
      <div class="note-block">
        <h3>解説</h3>
        <p>${escapeHtml(problem.explanation)}</p>
      </div>
    </div>
  `;
}

function renderCards(metric, metrics) {
  const progress = state.progress[metric.id] || {};
  const index = metrics.findIndex((item) => item.id === metric.id) + 1;

  return `
    <article class="flash-panel">
      <div class="formula-meta">
        <div class="badge-row">
          <span class="badge">${escapeHtml(metric.category)}</span>
          <span class="badge ${escapeHtml(progress.confidence || "")}">${escapeHtml(confidenceLabel(progress.confidence))}</span>
        </div>
        <span class="counter">${index} / ${metrics.length}</span>
      </div>

      <div class="flash-card">
        <p class="eyebrow">${escapeHtml(metric.name)}</p>
        <h3>${escapeHtml(metric.short)}</h3>
        <p class="metric-subtitle">${escapeHtml(metric.meaning)}</p>
        ${state.showCardAnswer ? `
          <div class="flash-answer">
            <p class="formula-text">${escapeHtml(buildFormula(metric))}</p>
            <p class="metric-subtitle">${escapeHtml(metric.note)}</p>
          </div>
        ` : ""}
      </div>

      <div class="card-actions">
        <div class="primary-actions">
          <button type="button" data-action="toggle-card">${state.showCardAnswer ? "隠す" : "式を見る"}</button>
          <button class="ghost" type="button" data-action="random">シャッフル</button>
        </div>
        <div class="rating-actions">
          <button class="ghost" type="button" data-action="rate-review">復習</button>
          <button class="ghost" type="button" data-action="rate-solid">まずまず</button>
          <button class="ghost" type="button" data-action="rate-mastered">定着</button>
        </div>
      </div>
    </article>
  `;
}

function renderList(metrics) {
  return `
    <article class="list-panel">
      <div class="list-head">
        <h3>${metrics.length} 指標</h3>
        <div class="badge-row">
          <span class="badge">${escapeHtml(state.category)}</span>
        </div>
      </div>
      <div class="metric-table-wrap">
        <table class="metric-table">
          <thead>
            <tr>
              <th>指標</th>
              <th>単元</th>
              <th>式</th>
              <th>メモ</th>
              <th>状態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${metrics.map((metric) => {
              const progress = state.progress[metric.id] || {};
              return `
                <tr>
                  <td><strong>${escapeHtml(metric.short)}</strong><br>${escapeHtml(metric.name)}</td>
                  <td>${escapeHtml(metric.category)}</td>
                  <td>${escapeHtml(buildFormula(metric))}</td>
                  <td>${escapeHtml(metric.note)}</td>
                  <td>${escapeHtml(confidenceLabel(progress.confidence))}</td>
                  <td>
                    <div class="table-actions">
                      <button class="ghost inline-action" type="button" data-metric-id="${escapeHtml(metric.id)}">出題</button>
                      <button class="ghost inline-action" type="button" data-edit-metric-id="${escapeHtml(metric.id)}">編集</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function renderEditor() {
  const metric = state.metrics.find((item) => item.id === state.editorId) || createBlankMetric();
  const isNew = !state.metrics.some((item) => item.id === metric.id);
  const exportValue = JSON.stringify({
    metrics: state.metrics,
    calculationProblems: state.calculationProblems,
  }, null, 2);

  return `
    <article class="editor-panel">
      <div class="list-head">
        <div>
          <h3>教材編集</h3>
          <p class="panel-subtitle">指標はフォームで追加・修正できます。計算問題も含めた全教材はJSONで入出力できます。</p>
        </div>
        <div class="primary-actions">
          <button type="button" data-action="new-metric">新規指標</button>
          <button class="ghost" type="button" data-action="export-content">JSON表示</button>
        </div>
      </div>

      ${state.editorMessage ? `<div class="feedback ${state.editorMessageType === "bad" ? "bad" : "good"}">${escapeHtml(state.editorMessage)}</div>` : ""}

      <div class="editor-layout">
        <section class="editor-list">
          <h3>指標</h3>
          <div class="metric-edit-list">
            ${state.metrics.map((item) => `
              <button class="metric-edit-button ${item.id === state.editorId ? "active" : ""}" type="button" data-edit-metric-id="${escapeHtml(item.id)}">
                <strong>${escapeHtml(item.short)}</strong>
                <span>${escapeHtml(item.name)}</span>
              </button>
            `).join("")}
          </div>
        </section>

        <section class="editor-form-wrap">
          <form class="editor-form" data-form="metric-editor">
            <input type="hidden" name="originalId" value="${escapeHtml(metric.id)}">
            <div class="form-grid">
              ${fieldInput("id", "ID", metric.id, "roe-custom")}
              ${fieldInput("short", "略称", metric.short, "ROE")}
              ${fieldInput("name", "名称", metric.name, "自己資本利益率")}
              ${fieldInput("category", "単元", metric.category, "収益性")}
              ${fieldInput("numerator", "分子", metric.numerator, "当期純利益")}
              ${fieldInput("denominator", "分母", metric.denominator, "自己資本の期中平均")}
              ${fieldInput("multiplier", "倍率", metric.multiplier, "×100")}
              ${fieldInput("unit", "単位", metric.unit, "%")}
              ${fieldTextarea("meaning", "意味", metric.meaning)}
              ${fieldTextarea("note", "メモ", metric.note)}
            </div>
            <div class="card-actions">
              <div class="primary-actions">
                <button type="submit">${isNew ? "追加" : "保存"}</button>
                <button class="ghost" type="button" data-action="delete-metric" ${isNew ? "disabled" : ""}>削除</button>
              </div>
            </div>
          </form>
        </section>
      </div>

      <section class="json-panel">
        <div class="list-head">
          <div>
            <h3>JSON編集</h3>
            <p class="panel-subtitle">指標と計算問題をまとめて編集できます。問題を増やす場合は calculationProblems に追加します。</p>
          </div>
          <div class="primary-actions">
            <button class="ghost" type="button" data-action="apply-content">JSONから反映</button>
            <button class="ghost" type="button" data-action="reset-content">初期教材に戻す</button>
          </div>
        </div>
        <textarea id="contentJsonInput" class="json-input" spellcheck="false">${escapeHtml(exportValue)}</textarea>
      </section>
    </article>
  `;
}

function renderMetricEditForm(metric, mode = "standalone") {
  return `
    <form class="inline-editor" data-form="metric-editor">
      <div class="list-head">
        <div>
          <h3>指標を編集</h3>
          <p class="panel-subtitle">保存すると、穴埋め・カード・一覧の表示にすぐ反映されます。</p>
        </div>
      </div>
      <input type="hidden" name="originalId" value="${escapeHtml(metric.id)}">
      <div class="editor-form">
        <div class="form-grid">
          ${fieldInput("id", "ID", metric.id, "interest-coverage")}
          ${fieldInput("short", "表示名", metric.short, "インタレスト・カバレッジ・レシオ")}
          ${fieldInput("name", "名称", metric.name, "インタレスト・カバレッジ・レシオ")}
          ${fieldInput("category", "単元", metric.category, "安全性")}
          ${fieldInput("numerator", "分子", metric.numerator, "事業利益")}
          ${fieldInput("denominator", "分母", metric.denominator, "支払利息・割引料")}
          ${fieldInput("multiplier", "倍率", metric.multiplier, "×100")}
          ${fieldInput("unit", "単位", metric.unit, "倍")}
          ${fieldTextarea("meaning", "意味", metric.meaning)}
          ${fieldTextarea("note", "メモ", metric.note)}
        </div>
        <div class="card-actions">
          <div class="primary-actions">
            <button type="submit">保存</button>
            ${mode === "inline" ? `<button class="ghost" type="button" data-action="toggle-current-metric-editor">閉じる</button>` : ""}
          </div>
        </div>
      </div>
    </form>
  `;
}

function renderProblemEditForm(problem) {
  const confirmingDelete = state.pendingProblemDeleteId === problem.id;
  return `
    <form class="inline-editor" data-form="problem-editor">
      <div class="list-head">
        <div>
          <h3>問題を編集</h3>
          <p class="panel-subtitle">問題文・正解・解説をその場で修正できます。別問題として作りたい場合は先に「類題を作成」を押します。</p>
        </div>
      </div>
      <input type="hidden" name="originalId" value="${escapeHtml(problem.id)}">
      <div class="editor-form">
        <div class="form-grid">
          ${fieldInput("id", "ID", problem.id, "advanced-new-problem")}
          ${fieldInput("title", "タイトル", problem.title, "ROE分解")}
          ${fieldInput("category", "単元", problem.category, "応用")}
          ${fieldInput("answer", "正解数値", formatNumberForInput(problem.answer, problem.precision), "12.3")}
          ${fieldInput("tolerance", "許容誤差", problem.tolerance, "0.05")}
          ${fieldInput("unit", "単位", problem.unit, "%")}
          ${fieldInput("precision", "表示桁数", problem.precision, "1")}
          ${fieldTextarea("prompt", "問題文", problem.prompt, 4)}
          ${fieldTextarea("data", "表示データ", formatProblemData(problem.data), 5)}
          ${fieldTextarea("formula", "使う式", problem.formula, 3)}
          ${fieldTextarea("explanation", "解説", problem.explanation, 4)}
        </div>
        <div class="card-actions">
          <div class="primary-actions">
            <button type="submit">保存</button>
            <button class="ghost" type="button" data-action="toggle-current-problem-editor">閉じる</button>
            <button class="ghost danger-button" type="button" data-action="delete-current-problem">この問題を削除</button>
          </div>
        </div>
        ${confirmingDelete ? `
          <div class="delete-confirmation">
            <strong>この問題を削除しますか？</strong>
            <span>${escapeHtml(problem.title)}</span>
            <div class="primary-actions">
              <button class="danger-solid" type="button" data-action="confirm-delete-current-problem">削除する</button>
              <button class="ghost" type="button" data-action="cancel-delete-current-problem">キャンセル</button>
            </div>
          </div>
        ` : ""}
      </div>
    </form>
  `;
}

function fieldInput(name, label, value, placeholder) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input name="${escapeHtml(name)}" type="text" value="${escapeHtml(value || "")}" placeholder="${escapeHtml(placeholder || "")}">
    </label>
  `;
}

function fieldTextarea(name, label, value, rows = 3) {
  return `
    <label class="field full">
      <span>${escapeHtml(label)}</span>
      <textarea name="${escapeHtml(name)}" rows="${escapeHtml(rows)}">${escapeHtml(value || "")}</textarea>
    </label>
  `;
}

function createBlankMetric() {
  return {
    id: "",
    short: "",
    name: "",
    category: state.category !== "すべて" && state.category !== "弱点" ? state.category : "収益性",
    numerator: "",
    denominator: "",
    unit: "%",
    multiplier: "×100",
    meaning: "",
    note: "",
  };
}

function startNewMetric() {
  state.view = "edit";
  state.editorId = "";
  state.editorMessage = "";
  state.editorMessageType = "good";
  saveUi();
  render();
}

function saveMetricFromForm(form) {
  const formData = new FormData(form);
  const originalId = String(formData.get("originalId") || "").trim();
  const metric = sanitizeMetrics([{
    id: String(formData.get("id") || "").trim() || String(formData.get("short") || "").trim(),
    short: formData.get("short"),
    name: formData.get("name"),
    category: formData.get("category"),
    numerator: formData.get("numerator"),
    denominator: formData.get("denominator"),
    multiplier: formData.get("multiplier"),
    unit: formData.get("unit"),
    meaning: formData.get("meaning"),
    note: formData.get("note"),
  }])[0];

  if (!metric) return;

  const duplicate = state.metrics.some((item) => item.id === metric.id && item.id !== originalId);
  if (duplicate) {
    state.editorMessage = "同じIDの指標があります。IDを変えてください。";
    state.editorMessageType = "bad";
    render();
    return;
  }

  const index = state.metrics.findIndex((item) => item.id === originalId);
  if (index >= 0) {
    state.metrics[index] = metric;
  } else {
    state.metrics.push(metric);
  }

  state.editorId = metric.id;
  state.currentId = metric.id;
  state.category = metric.category;
  state.editorMessage = `${metric.short} を保存しました。`;
  state.editorMessageType = "good";
  state.inlineMetricEditorOpen = false;
  saveContentData();
  prepareQuestion(metric);
  saveUi();
  render();
}

function saveProblemFromForm(form) {
  const formData = new FormData(form);
  const originalId = String(formData.get("originalId") || "").trim();
  const problem = sanitizeProblems([{
    id: String(formData.get("id") || "").trim() || String(formData.get("title") || "").trim(),
    title: formData.get("title"),
    category: formData.get("category"),
    prompt: formData.get("prompt"),
    data: parseProblemData(String(formData.get("data") || "")),
    answer: parseAnswerNumber(formData.get("answer")),
    tolerance: parseAnswerNumber(formData.get("tolerance")),
    unit: formData.get("unit"),
    precision: parseAnswerNumber(formData.get("precision")),
    formula: formData.get("formula"),
    explanation: formData.get("explanation"),
  }])[0];

  if (!problem) {
    state.problemFeedback = {
      type: "bad",
      title: "保存できませんでした",
      message: "正解数値を確認してください。",
    };
    render();
    return;
  }

  const duplicate = state.calculationProblems.some((item) => item.id === problem.id && item.id !== originalId);
  if (duplicate) {
    state.problemFeedback = {
      type: "bad",
      title: "保存できませんでした",
      message: "同じIDの計算問題があります。IDを変えてください。",
    };
    render();
    return;
  }

  const index = state.calculationProblems.findIndex((item) => item.id === originalId);
  if (index >= 0) {
    state.calculationProblems[index] = problem;
  } else {
    state.calculationProblems.push(problem);
  }

  state.currentProblemId = problem.id;
  state.category = problem.category;
  state.problemAnswer = "";
  state.problemFeedback = {
    type: "good",
    title: "保存しました",
    message: `${problem.title} を更新しました。`,
  };
  state.inlineProblemEditorOpen = false;
  saveContentData();
  saveUi();
  render();
}

function duplicateCurrentProblem() {
  const problem = getCurrentProblem();
  if (!problem) return;
  const copy = clone(problem);
  copy.id = uniqueProblemId(`${problem.id}-copy`);
  copy.title = `${problem.title} コピー`;
  state.calculationProblems.push(copy);
  state.currentProblemId = copy.id;
  state.problemAnswer = "";
  state.problemFeedback = {
    type: "good",
    title: "類題を作成しました",
    message: "内容を編集して保存できます。",
  };
  state.inlineProblemEditorOpen = true;
  state.pendingProblemDeleteId = "";
  saveContentData();
  saveUi();
  render();
}

function requestDeleteCurrentProblem() {
  const problem = getCurrentProblem();
  if (!problem) return;
  if (state.calculationProblems.length <= 1) {
    state.problemFeedback = {
      type: "bad",
      title: "削除できません",
      message: "最後の1問は削除できません。",
    };
    render();
    return;
  }

  state.pendingProblemDeleteId = problem.id;
  state.problemFeedback = null;
  render();
}

function cancelDeleteCurrentProblem() {
  state.pendingProblemDeleteId = "";
  render();
}

function deleteCurrentProblem() {
  const problem = state.calculationProblems.find((item) => item.id === state.pendingProblemDeleteId) || getCurrentProblem();
  if (!problem) return;
  if (state.calculationProblems.length <= 1) {
    state.problemFeedback = {
      type: "bad",
      title: "削除できません",
      message: "最後の1問は削除できません。",
    };
    state.pendingProblemDeleteId = "";
    render();
    return;
  }

  const previousFiltered = getFilteredProblems();
  const currentIndex = Math.max(0, previousFiltered.findIndex((item) => item.id === problem.id));
  state.calculationProblems = state.calculationProblems.filter((item) => item.id !== problem.id);
  delete state.problemProgress[problem.id];

  let candidates = getFilteredProblems();
  if (!candidates.length && state.category !== "すべて") {
    state.category = "すべて";
    candidates = getFilteredProblems();
  }

  const nextIndex = Math.min(currentIndex, Math.max(candidates.length - 1, 0));
  const nextProblem = candidates[nextIndex] || state.calculationProblems[0];
  state.currentProblemId = nextProblem.id;
  state.problemAnswer = "";
  state.problemFeedback = {
    type: "good",
    title: "削除しました",
    message: `${problem.title} を削除しました。`,
  };
  state.inlineProblemEditorOpen = false;
  state.pendingProblemDeleteId = "";
  saveContentData();
  saveProblemProgress();
  saveUi();
  render();
}

function deleteCurrentEditorMetric() {
  const metric = state.metrics.find((item) => item.id === state.editorId);
  if (!metric) return;
  if (state.metrics.length <= 1) {
    state.editorMessage = "最後の1件は削除できません。";
    state.editorMessageType = "bad";
    render();
    return;
  }
  const ok = window.confirm(`${metric.short} を削除しますか。`);
  if (!ok) return;
  state.metrics = state.metrics.filter((item) => item.id !== metric.id);
  delete state.progress[metric.id];
  state.currentId = state.metrics[0]?.id || "";
  state.editorId = state.currentId;
  state.editorMessage = `${metric.short} を削除しました。`;
  state.editorMessageType = "good";
  saveContentData();
  saveProgress();
  prepareQuestion(getCurrentMetric());
  saveUi();
  render();
}

function exportContentJson() {
  const textarea = document.querySelector("#contentJsonInput");
  if (!textarea) return;
  textarea.value = JSON.stringify({
    metrics: state.metrics,
    calculationProblems: state.calculationProblems,
  }, null, 2);
  state.editorMessage = "現在の教材JSONを表示しました。";
  state.editorMessageType = "good";
  render();
}

function applyContentJson() {
  const textarea = document.querySelector("#contentJsonInput");
  if (!textarea) return;
  try {
    const parsed = JSON.parse(textarea.value);
    const metrics = sanitizeMetrics(parsed.metrics);
    const calculationProblems = sanitizeProblems(parsed.calculationProblems);
    if (!metrics.length) throw new Error("metrics が空です。");
    if (!calculationProblems.length) throw new Error("calculationProblems が空です。");
    state.metrics = metrics;
    state.calculationProblems = calculationProblems;
    state.currentId = metrics[0].id;
    state.currentProblemId = calculationProblems[0].id;
    state.editorId = metrics[0].id;
    state.editorMessage = "JSONから教材を反映しました。";
    state.editorMessageType = "good";
    saveContentData();
    prepareQuestion(getCurrentMetric());
    saveUi();
    render();
  } catch (error) {
    state.editorMessage = `JSONを反映できませんでした: ${error.message}`;
    state.editorMessageType = "bad";
    render();
  }
}

function resetContentData() {
  const ok = window.confirm("指標と計算問題を初期教材に戻しますか。学習履歴は残ります。");
  if (!ok) return;
  state.metrics = clone(DEFAULT_METRICS);
  state.calculationProblems = sanitizeProblems(DEFAULT_CONTENT_PROBLEMS);
  state.currentId = state.metrics[0].id;
  state.currentProblemId = state.calculationProblems[0].id;
  state.editorId = state.currentId;
  state.editorMessage = "初期教材に戻しました。";
  state.editorMessageType = "good";
  saveContentData();
  prepareQuestion(getCurrentMetric());
  saveUi();
  render();
}

function buildFormula(metric) {
  return `${metric.short} = ${metric.numerator} / ${metric.denominator}${metric.multiplier ? ` ${metric.multiplier}` : ""}${metric.unit ? ` (${metric.unit})` : ""}`;
}

function confidenceLabel(value) {
  if (value === "review") return "復習";
  if (value === "solid") return "まずまず";
  if (value === "mastered") return "定着";
  return "未着手";
}

function getCategoryOrder() {
  const categories = unique([
    ...BASE_CATEGORY_ORDER,
    ...state.metrics.map((metric) => metric.category),
    ...state.calculationProblems.map((problem) => problem.category),
  ]).filter(Boolean);
  return categories.filter((category) => category === "すべて" || category === "弱点")
    .concat(categories.filter((category) => category !== "すべて" && category !== "弱点"));
}

function parseAnswerNumber(value) {
  const normalized = String(value || "").replaceAll(",", "").replace(/[^\d.+-]/g, "");
  return normalized.trim() ? Number(normalized) : NaN;
}

function formatProblemAnswer(problem) {
  return `${formatNumberForInput(problem.answer, problem.precision)}${problem.unit}`;
}

function formatProblemData(data) {
  return (data || []).map((item) => `${item.label}: ${item.value}`).join("\n");
}

function parseProblemData(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.search(/[:：,，\t]/);
      if (separatorIndex < 0) return { label: line, value: "" };
      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim(),
      };
    })
    .filter((item) => item.label || item.value);
}

function formatNumberForInput(value, precision = 2) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "";
  const digits = Math.max(0, Number(precision) || 0);
  return parsed.toFixed(digits).replace(/\.?0+$/, "");
}

function normalizeId(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || `item-${Date.now()}`;
}

function uniqueProblemId(baseId) {
  const base = normalizeId(baseId);
  let candidate = base;
  let index = 2;
  while (state.calculationProblems.some((problem) => problem.id === candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function shuffle(items) {
  const copied = [...items];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[randomIndex]] = [copied[randomIndex], copied[index]];
  }
  return copied;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
