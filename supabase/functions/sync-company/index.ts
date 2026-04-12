const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
};

const JSON_HEADERS = {
  "User-Agent": BROWSER_HEADERS["User-Agent"],
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
  Referer: "https://finance.yahoo.co.jp/",
};

const IFIS_BASE_URL = "https://kabuyoho.ifis.co.jp/";

type FetchResult = { payload: unknown; error: string };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const apiKey = String(body.edinetApiKey || Deno.env.get("EDINETDB_API_KEY") || "").trim();
    const edinetCode = body.edinetCode || (await resolveEdinetCodeSafe(body));
    const headers = apiKey ? { "X-API-Key": apiKey } : {};

    const [publicCompany, companyResult, annualResult, quarterlyResult, ratiosResult, analysisResult, earningsResult] =
      await Promise.all([
        edinetCode ? fetchPublicCompanyProfile(edinetCode).catch(() => null) : Promise.resolve(null),
        apiKey && edinetCode
          ? fetchPayloadSafe(`https://edinetdb.jp/v1/companies/${edinetCode}`, headers)
          : Promise.resolve(emptyFetchResult()),
        apiKey && edinetCode
          ? fetchPayloadSafe(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?years=5`, headers)
          : Promise.resolve(emptyFetchResult()),
        apiKey && edinetCode
          ? fetchPayloadSafe(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?period=quarterly&years=20`, headers)
          : Promise.resolve(emptyFetchResult()),
        apiKey && edinetCode
          ? fetchPayloadSafe(`https://edinetdb.jp/v1/companies/${edinetCode}/ratios`, headers)
          : Promise.resolve(emptyFetchResult()),
        apiKey && edinetCode
          ? fetchPayloadSafe(`https://edinetdb.jp/v1/companies/${edinetCode}/analysis`, headers)
          : Promise.resolve(emptyFetchResult()),
        apiKey && edinetCode
          ? fetchPayloadSafe(`https://edinetdb.jp/v1/companies/${edinetCode}/earnings?limit=20`, headers)
          : Promise.resolve(emptyFetchResult()),
      ]);

    const company = mergeCompanyPayload(extractData(companyResult.payload) || {}, publicCompany, body, edinetCode);
    const secCode = String(company.sec_code || body.secCode || "").replaceAll(/[^0-9]/g, "").slice(0, 4);
    const ticker = toYahooTicker(secCode);

    const [yahooQuote, ifisSupplement, calendarRows] = await Promise.all([
      ticker ? fetchYahooQuoteSnapshot(ticker).catch(() => null) : Promise.resolve(null),
      secCode ? fetchIfisSupplement(secCode).catch(() => emptyIfisSupplement()) : Promise.resolve(emptyIfisSupplement()),
      secCode ? fetchCalendar(headers, secCode).catch(() => []) : Promise.resolve([]),
    ]);

    const [priceSeries, newsItems] = await Promise.all([
      ticker ? fetchYahooPriceSeries(ticker, yahooQuote).catch(() => []) : Promise.resolve([]),
      fetchRelatedNews(company.name || body.name || "", ticker, yahooQuote, ifisSupplement.newsItems),
    ]);

    const tdnetRows = mergeForecastRows(
      normalizeTdnet(extractData(earningsResult.payload) || earningsResult.payload),
      ifisSupplement.companyForecasts,
    );

    const quarterlyRows = mergeQuarterlyRows(
      extractArray(quarterlyResult.payload),
      ifisSupplement.quarterlyActuals,
    );

    const edinetErrors = [
      companyResult.error,
      annualResult.error,
      quarterlyResult.error,
      ratiosResult.error,
      analysisResult.error,
      earningsResult.error,
    ].filter(Boolean).join(" / ");

    if (
      !company.name &&
      !secCode &&
      !priceSeries.length &&
      !newsItems.length &&
      !quarterlyRows.length &&
      !tdnetRows.length
    ) {
      throw new Error(edinetErrors || "sync-company failed");
    }

    return jsonResponse({
      company,
      annual_financials: extractArray(annualResult.payload),
      quarterly_financials: quarterlyRows,
      ratios: extractArray(ratiosResult.payload),
      analysis: mergeAnalysisPayload(extractData(analysisResult.payload) || {}, publicCompany),
      tdnet_earnings: tdnetRows,
      price_series: priceSeries,
      news_items: newsItems,
      earnings_calendar: mergeCalendarItems(
        calendarRows,
        yahooQuote?.nextEarningsDate || ifisSupplement.nextEarningsDate,
        company,
        body,
      ),
      market_snapshot: yahooQuote?.marketSnapshot || {},
      fetch_status: {
        mode: "edge-function",
        used_function: true,
        partial: Boolean(edinetErrors),
        edinet_error: edinetErrors,
        price_error: priceSeries.length ? "" : "Yahoo Finance 系の株価取得に失敗しました。",
        news_error: newsItems.length ? "" : "関連ニュースの取得に失敗しました。",
      },
      rights: {
        edinetdb_note:
          "EDINET DB は個人用の企業調査用途を前提に利用しています。公開形態を変える場合は提供元の利用条件を確認してください。",
        price_note:
          "Yahoo Finance 系データは personal use only 前提で利用しています。個人での閲覧用途に限定してください。",
      },
    });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "sync-company failed" },
      400,
    );
  }
});

function emptyFetchResult(): FetchResult {
  return { payload: null, error: "" };
}

async function fetchPayloadSafe(url: string, headers: Record<string, string> = {}): Promise<FetchResult> {
  try {
    return { payload: await fetchPayload(url, headers), error: "" };
  } catch (error) {
    return { payload: null, error: getErrorMessage(error) };
  }
}

async function resolveEdinetCodeSafe(body: Record<string, string>) {
  if (body.edinetCode) return body.edinetCode;
  const query = String(body.secCode || body.name || "").trim();
  if (!query) return "";
  try {
    const payload = await fetchPayload(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=5`);
    const rows = extractArray(payload);
    const secCode = String(body.secCode || "").replaceAll(/[^0-9]/g, "");
    const exact = rows.find((item) => String(item.sec_code || "").startsWith(secCode));
    return String((exact || rows[0])?.edinet_code || "");
  } catch {
    return "";
  }
}

async function fetchPayload(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed: ${url}`);
  }
  return payload;
}

async function fetchText(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed: ${url}`);
  }
  return await response.text();
}

function extractData(payload: any) {
  return payload?.data ?? payload;
}

function extractArray(payload: any) {
  const data = extractData(payload);
  return Array.isArray(data) ? data : [];
}

function normalizeTdnet(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.earnings)) return payload.earnings;
  if (Array.isArray(payload?.data?.earnings)) return payload.data.earnings;
  return [];
}

async function fetchPublicCompanyProfile(edinetCode: string) {
  const html = await fetchText(`https://edinetdb.jp/company/${encodeURIComponent(edinetCode)}`, BROWSER_HEADERS);
  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const pageTitle = cleanText(titleMatch?.[1] || "");
  const description = extractMetaContent(html, "description");
  const jsonBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const organization = jsonBlocks.find((item: any) => item?.["@type"] === "Organization") || {};
  const article = jsonBlocks.find((item: any) => item?.["@type"] === "AnalysisNewsArticle") || {};

  return {
    edinet_code: String(organization.identifier || edinetCode || ""),
    sec_code: String(organization.tickerSymbol || "").replaceAll(/[^0-9]/g, ""),
    name: String(organization.name || "").trim(),
    industry: String(organization.industry || "").trim(),
    name_en: cleanText(pageTitle.split("(")[0] || ""),
    meta_description: description,
    summary_text: String(article.description || description || "").trim(),
  };
}

function mergeCompanyPayload(
  apiCompany: Record<string, unknown>,
  publicCompany: Record<string, unknown> | null,
  body: Record<string, string>,
  edinetCode: string,
) {
  const publicProfile = publicCompany || {};
  return {
    ...publicProfile,
    ...apiCompany,
    edinet_code: String(apiCompany.edinet_code || publicProfile.edinet_code || edinetCode || body.edinetCode || ""),
    sec_code: String(apiCompany.sec_code || publicProfile.sec_code || body.secCode || ""),
    name: String(apiCompany.name || publicProfile.name || body.name || ""),
    name_en: String(apiCompany.name_en || publicProfile.name_en || ""),
    industry: String(apiCompany.industry || publicProfile.industry || ""),
    meta_description: String(apiCompany.meta_description || publicProfile.meta_description || ""),
    summary_text: String(apiCompany.summary_text || publicProfile.summary_text || publicProfile.meta_description || ""),
  };
}

function mergeAnalysisPayload(analysis: Record<string, unknown>, publicCompany: Record<string, unknown> | null) {
  if (analysis && Object.keys(analysis).length) return analysis;
  const fallbackText = String(publicCompany?.summary_text || "");
  if (!fallbackText) return {};
  return {
    ai_summary: {
      text: fallbackText,
      generated_at: "",
      model_version: "public-meta",
    },
  };
}

async function fetchYahooQuoteSnapshot(ticker: string) {
  try {
    const html = await fetchText(`https://finance.yahoo.co.jp/quote/${encodeURIComponent(ticker)}`, BROWSER_HEADERS);
    const state = extractYahooPreloadedState(html);
    if (!state) return null;
    return {
      priceSeries: extractYahooPriceSeriesFromState(state),
      newsItems: extractYahooNewsItemsFromState(state),
      nextEarningsDate: extractYahooNextEarningsDate(state),
      marketSnapshot: extractYahooMarketSnapshot(state),
    };
  } catch {
    return null;
  }
}

function extractYahooPreloadedState(html: string) {
  const marker = "window.__PRELOADED_STATE__ = ";
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const tail = html.slice(start + marker.length);
  const end = tail.indexOf("</script>");
  if (end < 0) return null;
  const jsonText = tail.slice(0, end).replace(/;\s*$/, "").trim();
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function extractYahooPriceSeriesFromState(state: any) {
  const histories = Array.isArray(state?.mainItemDetailChartSetting?.timeSeriesData?.histories)
    ? state.mainItemDetailChartSetting.timeSeriesData.histories
    : Array.isArray(state?.mainYJChart?.chartInfo?.data)
      ? state.mainYJChart.chartInfo.data
      : [];
  return histories
    .map((item: any) => ({
      date: String(item.baseDatetime || item.date || "").slice(0, 10),
      close: Number(item.closePrice ?? item.close ?? item.value),
    }))
    .filter((item: { date: string; close: number }) => item.date && Number.isFinite(item.close));
}

function extractYahooNewsItemsFromState(state: any) {
  const updatedAt = normalizeDateTime(state?.symbolTopics?.updatedAtDateTime || state?.pageInfo?.currentDateTime || "");
  const topics = Array.isArray(state?.symbolTopics?.topics) ? state.symbolTopics.topics : [];
  const unique = new Map<string, { title: string; link: string; source: string; published_at: string }>();
  for (const topic of topics) {
    for (const source of Array.isArray(topic?.sources) ? topic.sources : []) {
      const link = String(source?.url || "").trim();
      const title = String(source?.title || "").replace(/^ニュース\s*-\s*/, "").trim();
      if (!title || !isMeaningfulNewsItem(title, link) || unique.has(link)) continue;
      unique.set(link, {
        title,
        link,
        source: extractYahooSourceLabel(source?.note),
        published_at: updatedAt,
      });
    }
  }
  return [...unique.values()].slice(0, 10);
}

function extractYahooNextEarningsDate(state: any) {
  const message = String(state?.mainStocksPressReleaseSchedule?.pressReleaseScheduleMessage || "").trim();
  const match = message.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})\D*/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function extractYahooMarketSnapshot(state: any) {
  return {
    price_board: state?.mainStocksPriceBoard?.priceBoard || {},
    reference_index: state?.mainStocksDetail?.referenceIndex || {},
    press_release_summary: state?.mainStocksPressReleaseSummary || {},
    performance_checkpoint: state?.performanceCheckpoint || {},
    stock_performance: state?.stockPerformance?.summaryInfo || {},
  };
}

async function fetchYahooPriceSeries(ticker: string, yahooQuote: Record<string, unknown> | null = null) {
  const quoteSeries = Array.isArray(yahooQuote?.priceSeries) ? yahooQuote.priceSeries : [];
  if (quoteSeries.length) return quoteSeries;

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(
        `https://${host}/v8/finance/chart/${encodeURIComponent(ticker)}?range=1y&interval=1d&includePrePost=false`,
        { headers: JSON_HEADERS },
      );
      const payload = await response.json();
      const result = payload?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const series = timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          close: closes[index],
        }))
        .filter((item: { close: number }) => Number.isFinite(item.close));
      if (series.length) return series;
    } catch {
      continue;
    }
  }

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(
        `https://${host}/v7/finance/spark?symbols=${encodeURIComponent(ticker)}&range=1y&interval=1d&indicators=close&includeTimestamps=true`,
        { headers: JSON_HEADERS },
      );
      const payload = await response.json();
      const result = payload?.spark?.result?.[0]?.response?.[0] || payload?.spark?.result?.[0];
      const timestamps = result?.timestamp || [];
      const closes = result?.indicators?.quote?.[0]?.close || result?.close || [];
      const series = timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().slice(0, 10),
          close: closes[index],
        }))
        .filter((item: { close: number }) => Number.isFinite(item.close));
      if (series.length) return series;
    } catch {
      continue;
    }
  }

  return [];
}

async function fetchRelatedNews(
  companyName: string,
  ticker: string,
  yahooQuote: Record<string, unknown> | null = null,
  ifisNews: Array<Record<string, string>> = [],
) {
  const quoteNews = Array.isArray(yahooQuote?.newsItems) ? yahooQuote.newsItems : [];
  const [googleNews, yahooNews] = await Promise.all([
    fetchGoogleNewsItems(companyName, ticker),
    fetchYahooNewsItems(ticker),
  ]);
  return mergeNewsItems(ifisNews, quoteNews, googleNews, yahooNews);
}

async function fetchYahooNewsItems(ticker: string) {
  if (!ticker) return [];
  try {
    const response = await fetch(
      `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=ja-JP`,
    );
    const xml = await response.text();
    return extractRssItems(xml)
      .slice(0, 10)
      .map((item) => ({
        title: extractXmlTag(item, "title"),
        link: extractXmlTag(item, "link"),
        source: "Yahoo Finance",
        published_at: extractXmlTag(item, "pubDate"),
      }))
      .filter((item) => item.title && isMeaningfulNewsItem(item.title, item.link));
  } catch {
    return [];
  }
}

async function fetchGoogleNewsItems(companyName: string, ticker: string) {
  if (!companyName && !ticker) return [];
  try {
    const response = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent([companyName, ticker].filter(Boolean).join(" OR "))}&hl=ja&gl=JP&ceid=JP:ja`,
    );
    const xml = await response.text();
    return extractRssItems(xml)
      .slice(0, 10)
      .map((item) => ({
        title: extractXmlTag(item, "title"),
        link: extractXmlTag(item, "link"),
        source: extractXmlTag(item, "source") || "Google News",
        published_at: extractXmlTag(item, "pubDate"),
      }))
      .filter((item) => item.title && isMeaningfulNewsItem(item.title, item.link));
  } catch {
    return [];
  }
}

function isMeaningfulNewsLink(link: string) {
  const value = String(link || "").trim();
  if (!value) return false;
  return !/\/quote\/[^/?#]+(?:[?#]|$)/.test(value) &&
    !/\/quote\/[^/?#]+\/(?:history|chart|forum|financials|performance|profile)(?:[/?#]|$)/.test(value);
}

function isMeaningfulNewsItem(title: string, link: string) {
  const headline = String(title || "").trim();
  if (!headline) return false;
  if (!isMeaningfulNewsLink(link)) return false;
  return !/(掲示板|株価・株式情報|株価履歴|銘柄時価|チャート|時系列)/.test(headline);
}

async function fetchCalendar(headers: Record<string, string>, secCode: string) {
  const code = String(secCode || "").replaceAll(/[^0-9]/g, "").slice(0, 4);
  if (!code) return [];

  if (headers["X-API-Key"]) {
    try {
      const from = new Date().toISOString().slice(0, 10);
      const toDate = new Date();
      toDate.setDate(toDate.getDate() + 180);
      const to = toDate.toISOString().slice(0, 10);
      const payload = await fetchPayload(`https://edinetdb.jp/v1/calendar?from=${from}&to=${to}`, headers);
      const rows = extractArray(payload).filter((item) =>
        String(item.code || item.sec_code || "").replaceAll(/[^0-9]/g, "").startsWith(code)
      );
      if (rows.length) return rows;
    } catch {
      // fall through to html fallback
    }
  }

  try {
    const html = await fetchText("https://edinetdb.com/calendar", BROWSER_HEADERS);
    return [...html.matchAll(/(\d{4}-\d{2}-\d{2})[\s\S]*?<td[^>]*>\s*([0-9A-Z]{4,5})\s*<\/td>[\s\S]*?<td[^>]*>\s*([^<]+)\s*<\/td>/g)]
      .map((match) => ({
        date: match[1],
        code: match[2],
        company: cleanText(match[3]),
      }))
      .filter((item) => String(item.code || "").replaceAll(/[^0-9]/g, "").startsWith(code));
  } catch {
    return [];
  }
}

function emptyIfisSupplement() {
  return {
    nextEarningsDate: "",
    quarterlyActuals: [] as any[],
    companyForecasts: [] as any[],
    newsItems: [] as any[],
  };
}

async function fetchIfisSupplement(secCode: string) {
  const code = String(secCode || "").replaceAll(/[^0-9]/g, "").slice(0, 4);
  if (!code) return emptyIfisSupplement();

  const [reportHtml, topicHtml] = await Promise.all([
    fetchText(`${IFIS_BASE_URL}index.php?action=tp1&bcode=${code}&sa=report`, BROWSER_HEADERS).catch(() => ""),
    fetchText(`${IFIS_BASE_URL}index.php?action=tp1&bcode=${code}&sa=report_tpx&topix_type=11`, BROWSER_HEADERS).catch(() => ""),
  ]);

  const topicEntries = parseIfisTopicEntries(topicHtml, code);
  const detailEntries = topicEntries.filter((item) => /consNewsDetail/.test(item.link) && /_act_/.test(item.link)).slice(0, 8);
  const detailRows = await Promise.all(detailEntries.map(async (entry) => {
    try {
      const html = await fetchText(entry.link, BROWSER_HEADERS);
      return parseIfisDetailPage(html, entry.link);
    } catch {
      return null;
    }
  }));

  const quarterlyActuals = detailRows
    .map((item) => item?.actualQuarter)
    .filter((item): item is Record<string, unknown> => Boolean(item && Number(item.quarter) >= 1 && Number(item.quarter) <= 3));

  const companyForecasts = mergeForecastRows(
    [],
    detailRows.map((item) => item?.forecastItem).filter(Boolean) as Record<string, unknown>[],
  );

  return {
    nextEarningsDate: parseIfisNextEarningsDate(reportHtml),
    quarterlyActuals,
    companyForecasts,
    newsItems: topicEntries.slice(0, 12),
  };
}

function parseIfisTopicEntries(html: string, secCode: string) {
  if (!html) return [];
  return [...html.matchAll(/<div class="context">[\s\S]*?<span class="date">\s*([^<]+)\s*<\/span>[\s\S]*?<span class="code">\((\d{4})\)<\/span>[\s\S]*?<a[^>]+href="([^"]*consNewsDetail[^"]+)"[^>]*>\s*([\s\S]*?)\s*<\/a>/g)]
    .map((match) => ({
      title: stripHtml(match[4]),
      link: new URL(match[3], IFIS_BASE_URL).href,
      source: "IFIS株予報",
      published_at: parseJstDateTime(match[1]),
      code: match[2],
    }))
    .filter((item) => item.title && item.link && item.code === secCode);
}

function parseIfisNextEarningsDate(html: string) {
  if (!html) return "";
  const match = html.match(/<div class="block_update right">[\s\S]*?<div class="date left">\s*([^<]+)\s*<\/div>/i);
  return match ? parseDateOnly(match[1]) : "";
}

function parseIfisDetailPage(html: string, detailUrl: string) {
  const title = stripHtml((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const meta = parseIfisTitleMeta(title);
  if (!meta) return null;

  const actualRow = extractIfisRowHtml(html, ["actnew", "act"]);
  const forecastRow = extractIfisRowHtml(html, ["estnew", "est"]);

  return {
    actualQuarter: actualRow ? parseIfisActualRow(actualRow, meta, detailUrl) : null,
    forecastItem: forecastRow ? parseIfisForecastRow(forecastRow, meta, title) : null,
  };
}

function parseIfisTitleMeta(title: string) {
  const match = title.match(/(\d{4})\D+(\d{1,2})\D*期/);
  if (!match) return null;

  let quarter = 0;
  if (/Q1|第1四半期/.test(title)) quarter = 1;
  else if (/Q2|中間決算|第2四半期/.test(title)) quarter = 2;
  else if (/Q3|第3四半期/.test(title)) quarter = 3;
  else if (/Q4|本決算|通期/.test(title)) quarter = 4;
  if (!quarter) return null;

  return {
    fiscal_year: Number(match[1]),
    fiscal_year_end_month: Number(match[2]),
    quarter,
  };
}

function parseIfisActualRow(
  rowHtml: string,
  meta: { fiscal_year: number; fiscal_year_end_month: number; quarter: number },
  detailUrl: string,
) {
  const cells = extractIfisCells(rowHtml);
  if (cells.length < 9) return null;
  return {
    fiscal_year: meta.fiscal_year,
    fiscal_year_end_month: meta.fiscal_year_end_month,
    quarter: meta.quarter,
    revenue: parseIfisNumber(cells[5]),
    operating_income: parseIfisNumber(cells[6]),
    ordinary_income: parseIfisNumber(cells[7]),
    net_income: parseIfisNumber(cells[8]),
    disclosure_date: parseDateOnly(cells[4]),
    submit_date: parseDateOnly(cells[4]),
    detail_url: detailUrl,
    source_type: "ifis",
  };
}

function parseIfisForecastRow(
  rowHtml: string,
  meta: { fiscal_year: number; fiscal_year_end_month: number; quarter: number },
  title: string,
) {
  const cells = extractIfisCells(rowHtml);
  if (cells.length < 9) return null;
  return {
    fiscal_year: meta.fiscal_year,
    fiscal_year_end_month: meta.fiscal_year_end_month,
    quarter: meta.quarter,
    disclosure_date: parseDateOnly(cells[4]),
    forecast_revenue: parseIfisNumber(cells[5]),
    forecast_operating_income: parseIfisNumber(cells[6]),
    forecast_ordinary_income: parseIfisNumber(cells[7]),
    forecast_net_income: parseIfisNumber(cells[8]),
    title,
    source_type: "ifis",
  };
}

function mergeQuarterlyRows(primary: any[], supplemental: any[]) {
  const map = new Map<string, any>();
  for (const row of [...primary, ...supplemental]) {
    const key = `${Number(row.fiscal_year || 0)}-${Number(row.fiscal_year_end_month || 3)}-${Number(row.quarter || 0)}`;
    if (!key) continue;
    map.set(key, chooseLaterDisclosure(map.get(key), row));
  }
  return [...map.values()];
}

function mergeForecastRows(primary: any[], supplemental: any[]) {
  const map = new Map<string, any>();
  for (const row of [...primary, ...supplemental]) {
    const key = `${Number(row.fiscal_year || 0)}-${Number(row.fiscal_year_end_month || 3)}-${Number(row.quarter || 0)}-${String(row.title || "")}`;
    map.set(key, chooseLaterDisclosure(map.get(key), row));
  }
  return [...map.values()];
}

function chooseLaterDisclosure(existing: any, candidate: any) {
  if (!existing) return candidate;
  const existingDate = String(existing?.disclosure_date || existing?.submit_date || existing?.updated_at || "");
  const candidateDate = String(candidate?.disclosure_date || candidate?.submit_date || candidate?.updated_at || "");
  return candidateDate >= existingDate ? candidate : existing;
}

function mergeNewsItems(...groups: any[][]) {
  const unique = new Map<string, any>();
  for (const items of groups) {
    for (const item of Array.isArray(items) ? items : []) {
      const title = String(item?.title || "").trim();
      const link = String(item?.link || "").trim();
      if (!title || !isMeaningfulNewsItem(title, link) || unique.has(link)) continue;
      unique.set(link, {
        title,
        link,
        source: String(item?.source || "").trim(),
        published_at: normalizeDateTime(item?.published_at || item?.pubDate || ""),
      });
    }
  }
  return [...unique.values()]
    .sort((left, right) => String(right.published_at || "").localeCompare(String(left.published_at || "")))
    .slice(0, 12);
}

function mergeCalendarItems(items: any[], nextEarningsDate: string, company: any, body: Record<string, string>) {
  const rows = Array.isArray(items) ? [...items] : [];
  if (nextEarningsDate && !rows.some((item) => String(item.date || item.announcement_date || "") === nextEarningsDate)) {
    rows.push({
      date: nextEarningsDate,
      code: company?.sec_code || body.secCode || "",
      company: company?.name || body.name || "",
      label: "次回決算予定",
      fiscal_end: company?.fiscal_year_end || "",
    });
  }
  return rows.sort((left, right) => String(left.date || "").localeCompare(String(right.date || "")));
}

function extractMetaContent(html: string, name: string) {
  const match = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"));
  return cleanText(match?.[1] || "");
}

function cleanText(value: string) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return cleanText(
    String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&#x2F;/g, "/"),
  );
}

function extractRssItems(xml: string) {
  return [...String(xml || "").matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
}

function extractXmlTag(block: string, tagName: string) {
  const match = String(block || "").match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return stripHtml(match?.[1] || "");
}

function extractIfisRowHtml(html: string, classes: string[]) {
  for (const className of classes) {
    const matches = [...String(html || "").matchAll(new RegExp(`<tr class="${className}">([\\s\\S]*?)<\\/tr>`, "g"))];
    if (matches.length) return matches[matches.length - 1][1];
  }
  return "";
}

function extractIfisCells(rowHtml: string) {
  return [...String(rowHtml || "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => stripHtml(match[1]));
}

function parseIfisNumber(value: string) {
  const normalized = String(value || "").replaceAll(",", "").trim();
  if (!normalized || normalized === "--") return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDateOnly(value: string) {
  const match = String(value || "").match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function parseJstDateTime(value: string) {
  const match = String(value || "").match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (!match) return "";
  const hour = match[4] ? match[4].padStart(2, "0") : "00";
  const minute = match[5] ? match[5].padStart(2, "0") : "00";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}T${hour}:${minute}:00+09:00`;
}

function normalizeDateTime(value: string | number) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toISOString() : "";
}

function extractYahooSourceLabel(note: string) {
  const value = String(note || "").trim();
  const match = value.match(/[(（]([^()（）]+)[)）]/);
  if (match) return match[1];
  return value || "Yahoo!ファイナンス";
}

function toYahooTicker(secCode: string) {
  const digits = String(secCode || "").replaceAll(/[^0-9]/g, "");
  return digits ? `${digits.slice(0, 4)}.T` : "";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "");
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
