// ============================================================
//  config.js — Configurações da API Mistral
//  Cole sua chave abaixo e salve o arquivo.
//  Obtenha sua chave em: https://console.mistral.ai
// ============================================================

video: document.getElementById('voz-video')
const CONFIG = {
  // 🔑 Substitua pelo valor real da sua chave
  MISTRAL_API_KEY: 'TUmcgM9wFHcGbNf2a9eLd7lCOalqw6YJ',

  // Modelo a usar. Opções disponíveis:
  //   'open-mixtral-8x7b'    → gratuito no plano free
  //   'mistral-small-latest' → rápido e barato
  //   'mistral-large-latest' → melhor qualidade
  MISTRAL_MODEL: 'open-mixtral-8x7b',
};