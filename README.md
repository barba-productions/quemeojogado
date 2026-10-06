# Que time é o teu?

Frontend público do jogo de identificação dos times de jogadores do Brasileirão Série A.
A aplicação é uma PWA estática publicada pelo GitHub Pages em
<https://quetimeteu.barbaproductions.com>.

## Estrutura

- `web/`: páginas, estilos, scripts e ícones publicados.
- `.github/workflows/pages.yml`: deploy automático do diretório `web/`.
- `validate-web.js`: valida referências locais e o manifesto da PWA.

O backend, o catálogo de jogadores, as imagens e os importadores ficam no
repositório privado `barba-productions/quemeojogado_backend`. O navegador recebe
somente os dados públicos de cada rodada e se comunica com as Cloud Functions
do projeto Firebase `quemeojogado`.

## Validação

```powershell
node validate-web.js
```

## Publicação

Todo push para `main` executa a ação **Publicar site**. O arquivo `web/CNAME`
configura o domínio `quetimeteu.barbaproductions.com`.