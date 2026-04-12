const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("EDINETDB_API_KEY");
    if (!apiKey) {
      throw new Error("EDINETDB_API_KEY is not configured.");
    }

    const body = await request.json();
    const edinetCode = await resolveEdinetCode(body, apiKey);
    if (!edinetCode) {
      throw new Error("EDINET コードを特定できませんでした。");
    }

    const headers = { "X-API-Key": apiKey };
    const [company, annualFinancials, quarterlyFinancials, ratios, analysis, tdnetEarnings] = await Promise.all([
      fetchJson(`https://edinetdb.jp/v1/companies/${edinetCode}`, headers),
      fetchJson(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?years=5`, headers),
      fetchJson(`https://edinetdb.jp/v1/companies/${edinetCode}/financials?period=quarterly&years=12`, headers),
      fetchJson(`https://edinetdb.jp/v1/companies/${edinetCode}/ratios`, headers),
      fetchJson(`https://edinetdb.jp/v1/companies/${edinetCode}/analysis`, headers),
      fetchJson(`https://edinetdb.jp/v1/companies/${edinetCode}/earnings?limit=8`, headers),
    ]);
    const yahooTicker = toYahooTicker(company?.sec_code || body.secCode);
    const priceSeries = yahooTicker ? await fetchYahooPriceSeries(yahooTicker) : [];

    const payload = {
      company,
      annual_financials: Array.isArray(annualFinancials) ? annualFinancials : [],
      quarterly_financials: Array.isArray(quarterlyFinancials) ? quarterlyFinancials : [],
      ratios: Array.isArray(ratios) ? ratios : [],
      analysis: analysis || {},
      tdnet_earnings: Array.isArray(tdnetEarnings) ? tdnetEarnings : [],
      price_series: priceSeries,
      rights: {
        edinetdb_note: "あなた個人がログインして利用する前提では現実的ですが、継続的な再配布を伴う公開運用に切り替える前には Terms of Service 本文確認と運営確認を推奨します。",
        price_note: "Yahoo Finance 系データは yfinance の案内でも personal use only とされています。この実装はあなた個人がログインして参照する用途を前提にしています。",
      },
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function resolveEdinetCode(body, apiKey) {
  if (body.edinetCode) return body.edinetCode;

  const query = body.secCode || body.name;
  if (!query) return null;

  const response = await fetch(`https://edinetdb.jp/v1/search?q=${encodeURIComponent(query)}&limit=5`);
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "EDINET 検索に失敗しました。");
  }

  const results = Array.isArray(payload.data) ? payload.data : [];
  if (!results.length) return null;

  const secCode = String(body.secCode || "").replaceAll(/[^0-9]/g, "");
  const exactSec = results.find((item) => String(item.sec_code || "").startsWith(secCode));
  if (exactSec) return exactSec.edinet_code;

  return results[0].edinet_code;
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Request failed: ${url}`);
  }
  return payload.data;
}

async function fetchYahooPriceSeries(ticker) {
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
}

function toYahooTicker(secCode) {
  const digits = String(secCode || "").replaceAll(/[^0-9]/g, "");
  if (!digits) return "";
  return `${digits.slice(0, 4)}.T`;
}
