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
    const ticker = toYahooTicker(company?.sec_code || body.secCode || "");
    const [priceSeries, newsItems] = await Promise.all([
      ticker ? fetchYahooPriceSeries(ticker) : Promise.resolve([]),
      fetchGoogleNewsItems(company.name || body.name || "", ticker),
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
  const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=2y&interval=1d&includePrePost=false`);
  const payload = await response.json();
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp || [];
  const closes = result?.indicators?.quote?.[0]?.close || [];

  return timestamps
    .map((timestamp: number, index: number) => ({
      date: new Date(timestamp * 1000).toISOString(),
      close: closes[index],
    }))
    .filter((item: { close: number }) => Number.isFinite(item.close));
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

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
