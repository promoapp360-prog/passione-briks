# Passione Briks

Il sito delle costruzioni in mattoncini di Alessio: treni storici, treni LEGO®, come sono fatti i mattoncini e come si monta un treno.

## Cosa c'è dentro

- **Costruzioni** — vetrina con foto, pezzi usati, ore di montaggio e passaggi di montaggio stile libretto di istruzioni. Filtri: treni storici, treni LEGO, altre costruzioni.
- **Officina dei mattoncini** — misure di un mattoncino, materiali, come nascono, i pezzi più usati.
- **Treni** — due linee del tempo (treni veri e treni LEGO) e la Napoli–Portici.
- **Catalogo** — tutti i treni LEGO dal 1964 al 2026 (228 set: locomotive, vagoni, stazioni, monorotaie, treni dei temi speciali), divisi per epoca con ricerca e filtri. Alessio, entrato con il PIN, segna i set che ha ("Ce l'ho") e quelli che vorrebbe. I dati sono in `public/treni-lego.json`.
- **Come si monta** — metodo in 6 passaggi, tecniche (SNOT, offset, telaio…) e calcolatore di scala.
- **Messaggi** — chiunque può lasciare un messaggio; compare sul sito solo dopo che Alessio lo approva.
- **Area Alessio** (bottone in alto) — con il PIN Alessio aggiunge, modifica ed elimina costruzioni, carica foto dal tablet e approva i messaggi.

## Pubblicare su Replit

1. Su Replit: **Create Repl → Import from GitHub** → `promoapp360-prog/passione-briks`.
2. **Tools → Database → Create a database** (PostgreSQL). Replit crea da solo la variabile `DATABASE_URL`: costruzioni, foto e messaggi vengono salvati lì e non si perdono quando ripubblichi.
3. **Tools → Secrets** → aggiungi:
   - `ADMIN_PIN` = il PIN di Alessio (es. 6 cifre)
   - `SESSION_SECRET` = una frase lunga a caso (facoltativo ma consigliato)
4. **Run** per provarlo, poi **Deploy** (Autoscale va bene, il database è esterno).

Senza `DATABASE_URL` il sito salva tutto nella cartella `data/` (va bene solo per le prove in locale).

## In locale

```bash
npm install
ADMIN_PIN=1234 npm start
# http://localhost:3000
```

## Struttura

```
server.js        server Express + API (costruzioni, foto, messaggi, PIN)
public/          pagina, stile e script del sito
```

LEGO® è un marchio del Gruppo LEGO, che non sponsorizza né approva questo sito.
