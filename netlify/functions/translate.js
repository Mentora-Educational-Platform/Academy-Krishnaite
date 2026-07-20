const crypto = require('crypto');

// In-memory server-side cache for container reuse
const translationCache = {};

// List of supported languages
const SUPPORTED_LANGUAGES = new Set([
  "en", "te", "hi", "ta", "kn", "ml", "mr", "bn", "gu", "pa",
  "fr", "de", "es", "it", "pt", "ru", "ja", "ko", "zh"
]);

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function translateWithGoogle(text, targetLang, apiKey) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: [text],
          target: targetLang,
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // 1. Request Size Validation (100KB limit)
    if (!event.body || event.body.length > 100 * 1024) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Text too large" }),
      };
    }

    const { text, targetLang } = JSON.parse(event.body);

    if (!text || !targetLang) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Missing text or targetLang" }),
      };
    }

    // 2. Target Language Validation
    const cleanTarget = targetLang.toLowerCase().trim();
    if (!SUPPORTED_LANGUAGES.has(cleanTarget)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: `Unsupported target language: ${targetLang}` }),
      };
    }

    // 3. API Key Validation
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY || "AIzaSyAnPyfKN-Aj4iuYpSNVY6g8asL_vFF-Wz4";
    console.log({
      hasKey: !!process.env.GOOGLE_TRANSLATE_API_KEY,
      prefix: process.env.GOOGLE_TRANSLATE_API_KEY?.slice(0, 8),
      length: process.env.GOOGLE_TRANSLATE_API_KEY?.length
    });
    if (!apiKey) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Missing API key configuration" }),
      };
    }

    // 4. Server-Side Caching Lookup
    const textHash = sha256(text);
    const cacheKey = `${textHash}_to_${cleanTarget}`;
    if (translationCache[cacheKey]) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ translatedText: translationCache[cacheKey] }),
      };
    }

    // 5. Google Translate Request Wrapper with 10s Timeout
    let response;
    try {
      response = await translateWithGoogle(text, cleanTarget, apiKey);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error("Google Translation API request timed out after 10s");
        return {
          statusCode: 504,
          headers,
          body: JSON.stringify({ error: "Translation temporarily unavailable" }),
        };
      }
      throw err;
    }

    // 6. Handle Google Response & Specific Status Codes
    if (!response.ok) {
      const status = response.status;
      console.error(`Google Translation API failed. Status: ${status}`);
      
      let clientStatus = 500;
      let errorMsg = "Unexpected server error";
      
      if (status === 400) {
        clientStatus = 400;
        errorMsg = "Bad request to Google API";
      } else if (status === 401 || status === 403) {
        clientStatus = 401;
        errorMsg = "Invalid API key";
      } else if (status === 429) {
        clientStatus = 429;
        errorMsg = "Rate limited by translation provider";
      }

      return {
        statusCode: clientStatus,
        headers,
        body: JSON.stringify({ error: errorMsg }),
      };
    }

    const data = await response.json();
    if (data && data.data && data.data.translations && data.data.translations[0]) {
      const translatedText = data.data.translations[0].translatedText;
      
      // Store in memory cache
      translationCache[cacheKey] = translatedText;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ translatedText }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Invalid response from translation API" }),
    };

  } catch (err) {
    console.error("Translation function handler error:", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Unexpected server error" }),
    };
  }
};
