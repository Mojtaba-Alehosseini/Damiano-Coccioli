# Damiano Coccioli — Sito di campagna

Sito di campagna elettorale per **Damiano Coccioli**, candidato al Consiglio Comunale di Moncalieri (Torino) con **Forza Italia**, alle elezioni amministrative del **24–25 maggio 2026**.

## Sito live

🌐 **[mojtaba-alehosseini.github.io/Damiano-Coccioli](https://mojtaba-alehosseini.github.io/Damiano-Coccioli/)**

## Pagine principali

- **Home** — biografia, manifesto, squadra, programma, voto
- **Come votare** — guida ai 3 passaggi per il voto di preferenza
- **Programma completo** (`/programma-completo/`) — i 14 punti del centrodestra
- **Le priorità di Damiano** (`/programma-coccioli/`) — il suo manifesto personale
- **Privacy** e **Cookie Policy** — conformità GDPR

## Lingue supportate

- 🇮🇹 Italiano (default)
- 🇬🇧 English
- 🇫🇷 Français
- 🇩🇪 Deutsch (solo home page)

## Stack tecnico

- HTML5 + CSS3 + Vanilla JavaScript
- Nessun framework, nessun build step
- Google Fonts (Fraunces, Inter, Archivo Black)
- Service Worker per cache offline
- PWA manifest

## Come testare in locale

```bash
# Python 3
python -m http.server 8080
# Apri http://localhost:8080/
```

## Asset PDF

I PDF nel `assets/pdf/` sono generati a partire dai template in `pdf-templates/` tramite Playwright + Chromium.

## Crediti

Sito realizzato dal team di campagna per Damiano Coccioli · Maggio 2026.

**Committente responsabile / Mandatario elettorale:** Stefano Delpero — Comitato Forza Italia Moncalieri 2026.
