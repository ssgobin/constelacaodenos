# Constellation of us

Diário visual romântico com HTML, CSS, JavaScript, Firebase Firestore, Cloudinary, Firebase Analytics e Three.js.

## Como rodar

Instale as dependências:

```bash
npm install
```

Crie um arquivo `.env` a partir de `.env.example` e coloque o segredo da Cloudinary:

```bash
CLOUDINARY_CLOUD_NAME=dgnqkzqbo
CLOUDINARY_API_KEY=616249661174858
CLOUDINARY_API_SECRET=seu_api_secret
```

Depois rode com as funções do Netlify:

```bash
npm run dev
```

O upload de imagens precisa do Netlify Functions. Abrir o `index.html` direto ou servir com `python -m http.server` carrega a interface, mas não executa `/.netlify/functions/upload-image`.

## Dados

Firestore:

```txt
memorias
```

Documento:

```js
{
  titulo: string,
  texto: string,
  fraseEspecial: string,
  data: string,
  imagemUrl: string,
  imagemPath: string,
  criadoEm: timestamp
}
```

As imagens são enviadas para a pasta `memorias/` no Cloudinary. O `imagemPath` salva o `public_id` retornado pela Cloudinary.

## Regras temporárias para teste

Firestore:

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /memorias/{document} {
      allow read, write: if true;
    }
  }
}
```

Essas regras são apenas para desenvolvimento. Para publicar de verdade, adicione login, senha compartilhada, regras com validação ou App Check.

## Netlify

No painel do Netlify, configure as variáveis:

```txt
CLOUDINARY_CLOUD_NAME=dgnqkzqbo
CLOUDINARY_API_KEY=616249661174858
CLOUDINARY_API_SECRET=seu_api_secret
```

Você também pode usar `CLOUDINARY_URL` em vez das três variáveis separadas.
