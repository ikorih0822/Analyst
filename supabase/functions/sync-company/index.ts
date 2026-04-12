const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const apiKey = String(body.edinetApiKey || Deno.env.get("EDINETDB_API_KEY") || "").trim();
    if (!apiKey) {
      throw new Error("EDINET DB API Key が設定されていません。");
    }

    const edinetCode = body.edinetCode || (await resolveEdinetCode(body));
    if (!edinetCode) {
      throw new Error("EDINET コードを特定できませんでした。");
    }

    const headers = { "X-API-Key": apiKey };
    const [companyPayload, annualPayload, quarterlyPayload, ratiosPayload, analysisPayload, earningsPayload] = await Promise.all([
      fetchPayload(`https://edinetdb.jp/v1/companies/${edinetCode}`, headers),
      fetchPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?years=5`, headers),
      fetchPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?period=quarterly&years=20`, headers),
      fetchPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/ratios`, headers),
      fetchPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/analysis`, headers),
      fetchPayload(`https://edinetdb.jp/v1/companies/${edinetCode}/earnings?limit=20`, headers),
    ]);
    const company = extractData(companyPayload) || {};
    const calendarItems = await fetchCalendar(headers, company?.sec_code || body.secCode || "");
    const ticker = toYahooTicker(company?.sec_code || body.secCode || "");
    const [priceSeries, newsItems] = await Promise.all([
      ticker ? fetchYahooPriceSeries(ticker) : Promise.resolve([]),
      fetchRelatedNews(company.name || body.name || "", ticker),
    ]);

    return jsonResponse({
      company,
      annual_financials: extractArray(annualPayload),
      quarterly_financials: extractArray(quarterlyPayload),
      ratios: extractArray(ratiosPayload),
      analysis: extractData(analysisPayload) || {},
      tdnet_earnings: normalizeTdnet(extractData(earningsPayload) || earningsPayload),
      price_series: priceSeries,
      news_items: newsItems,
      earnings_calendar: calendarItems,
      fetch_status: {
        mode: "edge-function",
        used_function: true,
        price_error: priceSeries.length ? "" : "Yahoo Finance 系の株価系列を取得できませんでした。",
        news_error: newsItems.length ? "" : "ニュース記事を取得できませんでした。",
      },
      rights: {
        edinetdb_note: "EDINET DB は個人用途の調査支援として利用しています。運用形態を変える前には規約本文の確認を推奨します。",
        price_note: "Yahoo Finance 系データは personal use only 前提です。このアプリはあなた個人が PC とスマホで参照する用途に寄せています。",
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "sync-company failed" }, 400);
  }
});

async function resolveEdinetCode(body: Record<string, string>) {
  if (body.edinetCode) return body.edinetCode;

  const query = body.secCode || body.name;
  if (!query) return "";

  const payload = await fetchPayload(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=5`);
  const results = extractArray(payload);
  if (!results.length) return "";

  const secCode = String(body.secCode || "").replaceAll(/[^0-9]/g, "");
  const exactSec = results.find((item) => String(item.sec_code || "").startsWith(secCode));
  return (exactSec || results[0]).edinet_code || "";
}

async function fetchPayload(url: string, headers: Record<string, string> = {}) {
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed: ${url}`);
  }
  return payload;
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

async function fetchYahooPriceSeries(ticker: string) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    "Referer": "https://finance.yahoo.com/",
  };
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const response = await fetch(`https://${host}/v8/finance/chart/${ticker}?range=2y&interval=1d&includePrePost=false`, { headers });
      const payload = await response.json();
      const result = payload?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const series = timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString(),
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
      const response = await fetch(`https://${host}/v7/finance/spark?symbols=${ticker}&range=2y&interval=1d&indicators=close&includeTimestamps=true`, { headers });
      const payload = await response.json();
      const result = payload?.spark?.result?.[0]?.response?.[0] || payload?.spark?.result?.[0];
      const timestamps = result?.timestamp || [];
      const closes = result?.indicators?.quote?.[0]?.close || result?.close || [];
      const series = timestamps
        .map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString(),
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

async function fetchRelatedNews(companyName: string, ticker: string) {
  const yahooNews = await fetchYahooNewsItems(ticker);
  if (yahooNews.length) return yahooNews;
  return fetchGoogleNewsItems(companyName, ticker);
}

async function fetchYahooNewsItems(ticker: string) {
  if (!ticker) return [];
  try {
    const response = await fetch(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(ticker)}&region=US&lang=ja-JP`);
    const xml = await response.text();
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const items = Array.from(doc?.querySelectorAll("item") || []);
    return items.slice(0, 10).map((item) => ({
      title: item.querySelector("title")?.textContent?.trim() || "",
      link: item.querySelector("link")?.textContent?.trim() || "",
      source: "Yahoo Finance",
      published_at: item.querySelector("pubDate")?.textContent?.trim() || "",
    })).filter((item) => item.title && item.link);
  } catch {
    return [];
  }
}

async function fetchGoogleNewsItems(companyName: string, ticker: string) {
  if (!companyName && !ticker) return [];

  const response = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent([companyName, ticker].filter(Boolean).join(" OR "))}&hl=ja&gl=JP&ceid=JP:ja`);
  const xml = await response.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const items = Array.from(doc?.querySelectorAll("item") || []);

  return items.slice(0, 10).map((item) => ({
    title: item.querySelector("title")?.textContent?.trim() || "",
    link: item.querySelector("link")?.textContent?.trim() || "",
    source: item.querySelector("source")?.textContent?.trim() || "",
    published_at: item.querySelector("pubDate")?.textContent?.trim() || "",
  })).filter((item) => item.title && item.link);
}

function toYahooTicker(secCode: string) {
  const digits = String(secCode || "").replaceAll(/[^0-9]/g, "");
  return digits ? `${digits.slice(0, 4)}.T` : "";
}

async function fetchCalendar(headers: Record<string, string>, secCode: string) {
  const code = String(secCode || "").replaceAll(/[^0-9]/g, "").slice(0, 4);
  if (!code) return [];
  try {
    const from = new Date().toISOString().slice(0, 10);
    const toDate = new Date();
    toDate.setDate(toDate.getDate() + 180);
    const to = toDate.toISOString().slice(0, 10);
    const payload = await fetchPayload(`https://edinetdb.jp/v1/calendar?from=${from}&to=${to}`, headers);
    const rows = extractArray(payload).filter((item) => String(item.code || item.sec_code || "").replaceAll(/[^0-9]/g, "").startsWith(code));
    if (rows.length) return rows;
  } catch {}

  try {
    const response = await fetch("https://edinetdb.com/calendar");
    const html = await response.text();
    const pattern = /(\d{4}-\d{2}-\d{2})\s+.*?>([0-9A-Z]{4,5})<.*?>([^<]+)<.*?★\s+(\d{4}-\d{2}-\d{2})\s+([^<\n]+)/g;
    return [...html.matchAll(pattern)]
      .map((match) => ({
        date: match[1],
        code: match[2],
        company: match[3].trim(),
        fiscal_end: match[4],
        label: match[5].trim(),
      }))
      .filter((item) => String(item.code || "").replaceAll(/[^0-9]/g, "").startsWith(code));
  } catch {
    return [];
  }
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
