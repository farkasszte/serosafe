# SeroSafe

**Neurodivergens felhasználókra szabott, 100%-ban offline szerotonerg gyógyszerkockázati és sürgősségi kommunikációs rendszer (PWA)**

*Offline-first, zero-server serotonergic medication safety log, clinical washout tracker, alexithymia-adapted symptom diary, and dual-pathway MIST emergency AAC handover tool.*

---

> [!IMPORTANT]
> **Orvosi és szabályozási nyilatkozat (EU MDR / MDCG 2019-11)**
> A SeroSafe **nem orvostechnikai eszköz (SaMD)** és **nem orvosi diagnosztikai szoftver**, hanem strukturált személyes önmegfigyelő napló, publikált szakirodalomra épülő gyógyszerinformációs szűrő és sürgősségi augmentatív kommunikációs (AAC) segédeszköz.
> Az alkalmazás **soha nem ad „Zöld / Biztonságos” igazolást** (*Anti-Reassurance elv*). Akut vészhelyzetben (pl. ≥ 38,0 °C láz, akaratlan izomrángás, izommerevség, zavartság) azonnal hívd a **112**-t!

---

## Miért jött létre a SeroSafe?

Autizmus spektrum zavarral (ASD) és alexitímiával élő személyeknél három tényező egyszerre veszélyezteti a gyógyszerbiztonságot:

1. **Rejtett szerotonerg kumuláció:** a vényköteles pszichofarmakonok mellett a vény nélkül kapható (OTC) köhögéscsillapítók (pl. dextrometorfán) és étrend-kiegészítők (orbáncfű, 5-HTP, L-triptofán) – valamint a már leállított, hosszú aktív metabolitú szerek (pl. fluoxetin / norfluoxetin, 35 napos kiürülési ablak) – összeadódhatnak.
2. **Alexitímia és atipikus interocepció:** elvont 1–10 skálák helyett megfigyelhető testi jelekre és vizuális eszközökre van szükség, mert a kezdődő szerotonerg tüneteket könnyű szenzoros túlterheltségnek nézni.
3. **Akut kommunikációs blokk (szelektív mutizmus):** krízisben a beteg gyakran nem tud szóban válaszolni, miközben a kiérkező mentőszolgálatnak 10–15 másodpercen belül pontos adatokra van szüksége.

---

## A négy fő pillér

1. **Kurált 30 hatóanyagos szerotonerg és kiürülési (washout) szűrő (`src/data/substances.ts`, `src/engine/safetyEngine.ts`):**
   Hazai (OGYÉI) forgalomban lévő és OTC/kiegészítő hatóanyagok `clinicalWashoutDays` ablakokkal, „Mi történne, ha bevenném?” ellenőrzővel, forrásjelzéssel és vizuális visszaszámláló ívvel (`WashoutArc`). Külön `nmsWatch` figyeléssel az antipszichotikumokra (Malignus Neuroleptikus Szindróma védelem).
2. **Alexitímia-barát, metaforamentes önmegfigyelés:**
   Dr. Gloria Willcox-ihletésű Nyílt Érzelemkerék (`EmotionWheel`), CHOIR-ihletésű elölnézeti / hátulnézeti / nagyított fej–száj–torok testséma (`BodyMap`) fájdalomskálával és fájdalomminőségekkel, valamint vizuális energia-, szenzoros akkumulátor- és alvásidő-tárcsák (`EnergySensoryDial`).
3. **Kettős útvonalú (Dual-Pathway) sürgősségi hozzáférés:**
   - **Nulladik másodperces Kríziskártya (`CrisisCardDialog`):** minden képernyőről egy koppintással elérhető MIST-sorrendű átadási lap, közvetlen `tel:112` gombbal és magyar/angol hangos felolvasással (TTS).
   - **Zárolási képernyő háttérkép + offline QR-kód (`lockscreenGenerator.ts`):** 1080×1920 PNG generátor HTML5 Canvas-szal, amely telefonfeloldás nélkül is olvashatóvá teszi a kommunikációs akadályokat, az utolsó gyógyszerbevételeket és a vitális adatokat.
4. **100% kliensoldali, szervermentes (Zero-Server) PWA & titkosítás:**
   Minden adat helyben, a böngésző `IndexedDB` tárhelyén (`Dexie.js`) marad. Opcionálisan PBKDF2 + WebCrypto AES-GCM PIN-zárral titkosítható, megtartva a PIN nélküli sürgősségi krízis-hozzáférést.

---

## Könyvtárstruktúra

- `src/` – Alkalmazásforráskód:
  - `components/` – UI komponensek (`layout/`, `modals/`, `visuals/`)
  - `data/` – Kurált 30 szerotonerg + 5 társgyógyszer hatóanyag-adatbázis (`substances.ts`) és CHOIR testtérkép-régiók (`choirBodyRegions.ts`)
  - `engine/` – Farmakológiai interakció- és kiürülési motor (`safetyEngine.ts`) és Vitest tesztek (`__tests__/`)
  - `pages/` – Fő nézetek (*Ma*, *Gyógyszer*, *Naptár*, *Elemzés*, *Biztonság*, *Jogi nyilatkozat*)
  - `services/` – IndexedDB (`db.ts`), PBKDF2 + AES-GCM titkosítás (`crypto.ts`), zárolási képernyő-generátor (`lockscreenGenerator.ts`), lokalizáció (`i18n.ts`), TTS (`tts.ts`) és demó előbeállítások (`demoData.ts`)
  - `styles/` & `types/` – Tailwind v4 dizájntokenek (`tokens.css`, `app.css`) és TypeScript típusdefiníciók (`serosafe.ts`)
- `public/icons/` – PWA és zárolási pajzs SVG/PNG ikonok
- `docs/otio/` – OTIO pályázati űrlap ([`Pályázati űrlap.docx`](docs/otio/P%C3%A1ly%C3%A1zati%20%C5%B1rlap.docx)) és projektterv ([`SeroSafe projektterv végső optimalizálása.md`](docs/otio/SeroSafe%20projektterv%20v%C3%A9gs%C5%91%20optimaliz%C3%A1l%C3%A1sa.md))
- `docs/validation/` – Gyógyszerészi/szakorvosi konkordancia-audit ([`farmakologiai-konkordancia-audit.md`](docs/validation/farmakologiai-konkordancia-audit.md)) és gépi CSV táblázatok
- `docs/prototypes/` – Korai egyfájlos HTML referenciaprototípusok ([`serosafe_neurodivergens_t_mogat_s_biztons_gi_app.html`](docs/prototypes/serosafe_neurodivergens_t_mogat_s_biztons_gi_app.html), [`serosafe_v3_mobile_swipe_prototype.html`](docs/prototypes/serosafe_v3_mobile_swipe_prototype.html))

---

## Fejlesztés és helyi futtatás

Követelmény: [Bun](https://bun.sh/) (vagy Node.js).

```bash
# Függőségek telepítése
bun install

# Fejlesztői szerver indítása
bun run dev

# Unit tesztek futtatása (Vitest)
bun run test

# Termelési PWA build (TypeScript ellenőrzés + Vite + Workbox)
bun run build

# Termelési build helyi előnézete
bun run preview
```

Opcionális natív csomagolás (Capacitor 8):
- `bun run cap:sync` · `bun run cap:android` · `bun run cap:ios`

---

## Tudományos források és nyílt licencek

- **Hunter Szerotonin Toxicitási Kritériumok:** Dunkley, E. J., Isbister, G. K., Sibbritt, D., Dawson, A. H., & Whyte, I. M. (2003). *QJM*, 96(9), 635–642.
- **Szerotonin-szindróma:** Boyer, E. W., & Shannon, M. (2005). *New England Journal of Medicine*, 352(11), 1112–1120.
- **Alexitímia és interocepció ASD-ben:** Kinnaird, E. et al. (2019), *European Psychiatry*, 55, 80–89; DuBois, D. et al. (2016), *Int. J. Dev. Neurosci.*, 52, 104–111.
- **Szabályozási keretrendszer:** Medical Device Coordination Group – *MDCG 2019-11* (Regulation EU 2017/745 – MDR).
- **Farmakológiai referencia:** OGYÉI alkalmazási előírások (SmPC), Lexicomp, DrugBank, EMA/FDA közlemények *(klinikai szakorvosi/gyógyszerészi auditra előkészített mátrix — részletes 30×30-as konkordancia-dokumentáció: [farmakologiai-konkordancia-audit.md](docs/validation/farmakologiai-konkordancia-audit.md), CSV mátrixok: [`substances-audit-table.csv`](docs/validation/substances-audit-table.csv), [`concordance-matrix-30x30.csv`](docs/validation/concordance-matrix-30x30.csv))*.
- **Vizuális modellek és licencek:**
  - *Nyílt Érzelemkerék (Open Emotion Wheel)* — **CC BY-SA 4.0**, Dr. Gloria Willcox (1982) *The Feeling Wheel* koncepciója alapján.
  - *Anatómiai testséma* — Stanford CHOIR Body Map (CHOIRBM) koncepciója által inspirálva.
  - *MIST sürgősségi betegátadási struktúra*.

---

## Licenc

- **Forráskód:** [PolyForm Noncommercial License 1.0.0](LICENSE) *(személyes, oktatási, egyetemi, egészségügyi és közhasznú felhasználás engedélyezett; kereskedelmi hasznosítása a szerzők külön engedélye nélkül tilos)*.
- **Klinikai hatóanyag-mátrix és validációs dokumentáció (`docs/validation/`):** **CC BY-NC-SA 4.0** (*Nevezd meg! – Ne add el! – Így add tovább!*).
- **Harmadik feles adaptáció:** A beépített *Open Emotion Wheel* alapú érzelmi szekvencia az eredeti **CC BY-SA 4.0** licenc feltételei szerint marad elérhető.
