# Nuclea

Assistente de estudos com IA (Mistral) e voz (camb.ai).

## Estrutura do projeto

```
Nuclea/
├── api/
│   └── chat.js          ← Serverless function (proxy seguro para Mistral)
├── public/
│   ├── index.html       ← Interface principal
│   ├── style.css        ← Estilos
│   ├── icons/           ← Imagens e vídeos
│   └── important/       ← Arquivos de prompts
├── .env                 ← Chaves locais (NÃO commitar)
├── .env.example         ← Template de variáveis (commitar)
├── .gitignore
└── vercel.json          ← Configuração do Vercel
```

## Deploy no Vercel

### 1. Suba o projeto no GitHub
```bash
git init
git add .
git commit -m "first commit"
git remote add origin https://github.com/seu-usuario/nuclea.git
git push -u origin main
```

### 2. Importe no Vercel
1. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**
2. Selecione o repositório do GitHub
3. Clique em **Deploy** (sem alterar nada)

### 3. Adicione a variável de ambiente
1. No painel do projeto → **Settings → Environment Variables**
2. Adicione:
   - **Key:** `MISTRAL_API_KEY`
   - **Value:** sua chave de [console.mistral.ai](https://console.mistral.ai)
3. Clique em **Save** e faça um **Redeploy**

## Desenvolvimento local

```bash
npm i -g vercel   # instalar CLI do Vercel (uma vez)
cp .env.example .env
# edite .env e coloque sua chave Mistral
vercel dev        # sobe local com as serverless functions
```

## Segurança

A chave Mistral **nunca** é enviada ao navegador. O frontend chama `/api/chat`,
que é uma serverless function no servidor que lê `process.env.MISTRAL_API_KEY`.
