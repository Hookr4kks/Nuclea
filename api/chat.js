// api/chat.js — Proxy da IA para vários provedores gratuitos (formato OpenAI).
// Usado quando o navegador bloqueia a chamada direta (CORS) em produção na
// Vercel, ou para repassar a chave. Provedor vem do campo body.provider.
const PROVIDERS = {
  groq: {
    url: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    keyEnv: 'GROQ_API_KEY'
  },
  openrouter: {
    url: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'openrouter/free',
    keyEnv: 'OPENROUTER_API_KEY'
  },
  gemini: {
    url: process.env.AI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: process.env.AI_MODEL || 'gemini-3.8-flash',
    keyEnv: 'GEMINI_API_KEY'
  },
  pollinations: {
    url: process.env.AI_FALLBACK_BASE_URL || 'https://text.pollinations.ai/openai',
    model: process.env.AI_FALLBACK_MODEL || 'openai-fast'
  }
};
const MAX_BODY_CHARS = 4_500_000;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  try {
    let body = req.body || {};
    if (typeof body === 'string') {
      body = JSON.parse(body || '{}');
    }

    let messages = Array.isArray(body.messages) && body.messages.length
      ? body.messages
      : (body.content || body.prompt
          ? [{ role: 'user', content: body.content || body.prompt }]
          : null);

    if (!messages) {
      return res.status(400).json({ error: 'Mensagem vazia' });
    }

    if (JSON.stringify(messages).length > MAX_BODY_CHARS) {
      return res.status(413).json({ error: 'Mensagem ou imagem muito grande' });
    }

    const pid = PROVIDERS[body.provider] ? body.provider : ((body.key || process.env.AI_API_KEY) ? 'gemini' : 'pollinations');
    const provider = PROVIDERS[pid];
    const key = String(
      body.key || process.env.AI_API_KEY || (provider.keyEnv ? process.env[provider.keyEnv] : '') || ''
    ).trim();
    const model = body.model || provider.model;

    const headers = { 'Content-Type': 'application/json' };
    if (key) headers['Authorization'] = `Bearer ${key}`;

    const upstream = await fetch(provider.url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ model: model, messages: messages })
    });

    const data = await upstream.json().catch(function() { return {}; });

    if (!upstream.ok) {
      // A API Gemini devolve erros como array: [{error:{message}}]
      const first = Array.isArray(data) ? data[0] : data;
      const err = first && first.error;
      return res.status(upstream.status).json({
        error: (err && (err.message || err)) || 'Erro na IA'
      });
    }

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
