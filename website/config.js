// ============================================================
//  config.js — Configurações da API Mistral
//  Cole sua chave abaixo e salve o arquivo.
//  Obtenha sua chave em: https://console.mistral.ai
// ============================================================

const CONFIG = {
  // 🔑 Substitua pelo valor real da sua chave
  MISTRAL_API_KEY: 'SUA_CHAVE_AQUI',

  // Modelo a usar. Opções disponíveis:
  //   'open-mixtral-8x7b'    → gratuito no plano free
  //   'mistral-small-latest' → rápido e barato
  //   'mistral-large-latest' → melhor qualidade
  MISTRAL_MODEL: 'open-mixtral-8x7b',

  // Firebase App Check (reCAPTCHA v3)
  // Cole aqui a SITE KEY publica do reCAPTCHA v3 depois de registrar o App Check.
  FIREBASE_APP_CHECK_SITE_KEY: '6LeyABktAAAAAG9ytSc1jHJ2wC1UVkbBAWO7Jj4L',

  // Use somente em localhost/desenvolvimento. Deixe false em producao.
  // Para gerar um token local, troque para true, abra o site e copie o token do console.
  FIREBASE_APP_CHECK_DEBUG_TOKEN: false,
};
