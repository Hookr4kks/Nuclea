// ============================================================
//  config.js — Configurações da IA
//  Vários provedores gratuitos, todos no formato OpenAI.
//  Escolha o provedor e cole a chave em Configurações.
//    - Groq:       console.groq.com/keys      (grátis, sem cartão)
//    - OpenRouter: openrouter.ai/keys         (modelos :free)
//    - Gemini:     aistudio.google.com/apikey (free tier)
//    - Pollinations: sem chave (GPT-OSS 20B)
// ============================================================

const CONFIG = {
  // Provedor ativo: 'groq' | 'openrouter' | 'gemini' | 'pollinations'
  AI_PROVIDER: 'groq',

  // Presets dos provedores (endpoint, lista de modelos e modelo padrão).
  AI_PROVIDERS: {
    groq: {
      label: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
      modelsUrl: 'https://api.groq.com/openai/v1/models',
      defaultModel: 'openai/gpt-oss-120b',
      keyUrl: 'https://console.groq.com/keys'
    },
    openrouter: {
      label: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      modelsUrl: 'https://openrouter.ai/api/v1/models',
      defaultModel: 'openrouter/free',
      keyUrl: 'https://openrouter.ai/keys'
    },
    gemini: {
      label: 'Gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
      defaultModel: 'gemini-3.8-flash',
      keyUrl: 'https://aistudio.google.com/apikey',
      format: 'google'
    },
    pollinations: {
      label: 'Pollinations',
      baseUrl: 'https://text.pollinations.ai/openai',
      modelsUrl: 'https://text.pollinations.ai/models',
      defaultModel: 'openai-fast'
    }
  },

  // Chave fixa opcional (prefira salvar em Configurações — fica no navegador).
  AI_KEY: '',

  // Firebase App Check (reCAPTCHA v3) — usado apenas pelo login/sync do Firebase.
  // Cole aqui a SITE KEY publica do reCAPTCHA v3 depois de registrar o App Check.
  FIREBASE_APP_CHECK_SITE_KEY: '6LeyABktAAAAAG9ytSc1jHJ2wC1UVkbBAWO7Jj4L',

  // Use somente em localhost/desenvolvimento. Deixe false em producao.
  // Para gerar um token local, troque para true, abra o site e copie o token do console.
  FIREBASE_APP_CHECK_DEBUG_TOKEN: false,
};
