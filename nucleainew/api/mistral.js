const crypto = require('crypto');

const PROJECT_NUMBER = process.env.FIREBASE_PROJECT_NUMBER || '809997459519';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'nucleaai-30555';
const FIREBASE_APP_ID = process.env.FIREBASE_APP_ID || '1:809997459519:web:392698d2eccfe3380e988a';
const JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks';
const MAX_BODY_CHARS = 4_500_000;

let jwksCache = null;
let jwksCacheExpiresAt = 0;

function json(res, status, body) {
  return res.status(status).json(body);
}

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Token App Check invalido');
  return {
    header: JSON.parse(decodeBase64Url(parts[0])),
    payload: JSON.parse(decodeBase64Url(parts[1])),
    signingInput: parts[0] + '.' + parts[1],
    signature: parts[2]
  };
}

async function getJwks() {
  const now = Date.now();
  if (jwksCache && now < jwksCacheExpiresAt) return jwksCache;

  const response = await fetch(JWKS_URL);
  if (!response.ok) throw new Error('Falha ao carregar chaves App Check');

  const cacheControl = response.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 60 * 60 * 1000;

  jwksCache = await response.json();
  jwksCacheExpiresAt = now + Math.min(maxAgeMs, 6 * 60 * 60 * 1000);
  return jwksCache;
}

async function verifyAppCheckToken(token) {
  const parsed = parseJwt(token);
  if (parsed.header.alg !== 'RS256' || !parsed.header.kid) {
    throw new Error('Token App Check sem assinatura valida');
  }

  const jwks = await getJwks();
  const jwk = (jwks.keys || []).find(function(key) { return key.kid === parsed.header.kid; });
  if (!jwk) throw new Error('Chave App Check desconhecida');

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(parsed.signingInput);
  verifier.end();

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const signature = Buffer.from(parsed.signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (!verifier.verify(publicKey, signature)) {
    throw new Error('Assinatura App Check invalida');
  }

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(parsed.payload.aud) ? parsed.payload.aud : [parsed.payload.aud];
  const validAudience = aud.includes('projects/' + PROJECT_NUMBER) || aud.includes('projects/' + PROJECT_ID);
  const validIssuer = parsed.payload.iss === 'https://firebaseappcheck.googleapis.com/' + PROJECT_NUMBER;
  const validSubject = !FIREBASE_APP_ID || parsed.payload.sub === FIREBASE_APP_ID;

  if (!validAudience) throw new Error('Audiencia App Check invalida');
  if (!validIssuer) throw new Error('Emissor App Check invalido');
  if (!validSubject) throw new Error('App ID App Check invalido');
  if (!parsed.payload.exp || parsed.payload.exp < now - 30) throw new Error('Token App Check expirado');
  if (!parsed.payload.iat || parsed.payload.iat > now + 30) throw new Error('Token App Check emitido no futuro');

  return parsed.payload;
}

function allowedModel(model) {
  const allowed = (process.env.MISTRAL_ALLOWED_MODELS || [
    'open-mixtral-8x7b',
    'mistral-small-latest',
    'mistral-large-latest',
    'pixtral-12b-latest',
    'pixtral-large-latest'
  ].join(',')).split(',').map(function(item) { return item.trim(); }).filter(Boolean);

  return allowed.includes(model);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Metodo nao permitido' });
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return json(res, 500, { error: 'MISTRAL_API_KEY nao configurada na Vercel' });
  }

  if (process.env.DISABLE_APP_CHECK !== 'true') {
    const appCheckToken = req.headers['x-firebase-appcheck'];
    if (!appCheckToken) {
      return json(res, 401, { error: 'Token App Check ausente' });
    }

    try {
      await verifyAppCheckToken(appCheckToken);
    } catch (e) {
      return json(res, 401, { error: 'Token App Check invalido' });
    }
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body || '{}');
    }

    const model = body.model || process.env.MISTRAL_MODEL || 'open-mixtral-8x7b';
    const content = body.content || body.prompt || '';

    if (!allowedModel(model)) {
      return json(res, 400, { error: 'Modelo nao permitido' });
    }

    if (!content) {
      return json(res, 400, { error: 'Mensagem vazia' });
    }

    if (JSON.stringify(content).length > MAX_BODY_CHARS) {
      return json(res, 413, { error: 'Mensagem ou imagem muito grande' });
    }

    const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 1000,
        messages: [{ role: 'user', content: content }]
      })
    });

    const data = await mistralRes.json().catch(function() { return {}; });

    if (!mistralRes.ok) {
      return json(res, mistralRes.status, {
        error: data.message || data.error || 'Erro na Mistral'
      });
    }

    const answer = data && data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : '';

    return json(res, 200, { resposta: answer });
  } catch (e) {
    return json(res, 500, { error: e.message || 'Erro interno' });
  }
};
