// Stack Influence - TikTok Name Generator
// Netlify serverless function. Holds the Anthropic API key server-side and
// returns a JSON array of username ideas. POST-only, with OPTIONS/CORS.

const MODEL = "claude-sonnet-4-6";

const CATEGORY_GUIDANCE = {
  "beauty": "beauty, makeup, skincare, and glam content",
  "fashion": "fashion, styling, outfits, and personal style",
  "dance": "dance, choreography, and movement content",
  "comedy": "comedy, skits, and entertainment",
  "food": "food, cooking, recipes, and mukbang",
  "fitness": "fitness, workouts, wellness, and health",
  "gaming": "gaming, streaming, and esports",
  "education": "educational content, tips, how-tos, and explainers",
  "lifestyle": "lifestyle, daily life, vlogs, and aesthetics",
  "travel": "travel, adventure, and destination content",
  "business": "business, entrepreneurship, and marketing",
  "music": "music, singing, and audio content"
};

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server is missing its API key. Set ANTHROPIC_API_KEY in the Netlify environment." })
    };
  }

  let keyword = "";
  let category = "";
  let extra = "";
  try {
    const body = JSON.parse(event.body || "{}");
    keyword = String(body.keyword || "").slice(0, 60).trim();
    category = String(body.category || "").slice(0, 40).trim().toLowerCase();
    extra = String(body.extra || "").slice(0, 120).trim();
  } catch (e) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Could not read your request. Please try again." })
    };
  }

  if (!keyword) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Add a keyword or name to get started." })
    };
  }

  const niche = CATEGORY_GUIDANCE[category] || "general creator content";
  const extraLine = extra
    ? "Extra context to weave in where it fits naturally: " + extra + "."
    : "";

  const prompt = [
    "You are naming a TikTok account for a creator.",
    "Base word or name: \"" + keyword + "\".",
    "Content niche: " + niche + ".",
    extraLine,
    "",
    "Generate exactly 10 TikTok username ideas that fit this niche and feel native to TikTok.",
    "Rules for every username:",
    "- 3 to 20 characters, no spaces.",
    "- Only lowercase letters, numbers, periods, and underscores (TikTok's allowed set).",
    "- No leading or trailing period. No two periods in a row.",
    "- Easy to say out loud and easy to spell.",
    "- Avoid strings of random numbers; a short meaningful number or year is fine.",
    "Give a spread of styles: a couple clean and brandable, a couple playful, a couple niche-specific, a couple with a tasteful period or underscore separator.",
    "",
    "For each idea also write a 3 to 6 word note on why it works.",
    "",
    "Respond with ONLY a JSON array, no preamble and no markdown fences. Shape:",
    "[{\"username\":\"...\",\"note\":\"...\"}, ...]"
  ].join("\n");

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!resp.ok) {
      const detail = await resp.text();
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "The generator is busy right now. Please try again in a moment.", detail: detail.slice(0, 300) })
      };
    }

    const data = await resp.json();
    let text = "";
    if (data && Array.isArray(data.content)) {
      text = data.content
        .filter(function (b) { return b.type === "text"; })
        .map(function (b) { return b.text; })
        .join("");
    }

    const ideas = parseIdeas(text);
    if (!ideas.length) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "Could not read the results. Please try again." })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ideas: ideas.slice(0, 10) })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Something went wrong. Please try again." })
    };
  }
};

// Strip code fences, parse JSON, and sanitize every username to TikTok's rules.
function parseIdeas(raw) {
  if (!raw) return [];
  var text = raw.trim();
  text = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();

  var arr = null;
  try {
    arr = JSON.parse(text);
  } catch (e) {
    var start = text.indexOf("[");
    var end = text.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        arr = JSON.parse(text.slice(start, end + 1));
      } catch (e2) {
        arr = null;
      }
    }
  }

  if (!Array.isArray(arr)) return [];

  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var item = arr[i] || {};
    var username = sanitizeUsername(item.username);
    if (!username) continue;
    if (seen[username]) continue;
    seen[username] = true;
    var note = String(item.note || "").slice(0, 80).trim();
    out.push({ username: username, note: note });
  }
  return out;
}

function sanitizeUsername(value) {
  var u = String(value || "").toLowerCase();
  // keep only the allowed character set
  u = u.replace(/[^a-z0-9._]/g, "");
  // collapse runs of periods
  u = u.replace(/\.{2,}/g, ".");
  // trim leading/trailing periods and underscores
  u = u.replace(/^[._]+/, "").replace(/[._]+$/, "");
  if (u.length < 3 || u.length > 20) return "";
  return u;
}
