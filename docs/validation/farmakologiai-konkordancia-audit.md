# SeroSafe — Farmakológiai Konkordancia-Audit és Validációs Dokumentáció (OTIO 1. fázis)

> **Dokumentum jellege:** Az alkalmazás futásidejétől és felhasználói felületétől **független**, nyíltan ellenőrizhető klinikai-farmakológiai auditcsomag és automatizált konkordancia-referencia.
>
> **Licenc:** **CC BY-NC-SA 4.0** (*Nevezd meg! – Ne add el! – Így add tovább!* — oktatási, kutatási és közegészségügyi célra szabadon használható, kereskedelmi hasznosítása tilos).
>
> **Szabályozási határ (EU MDR 2017/745 & MDCG 2019-11):** A SeroSafe **nem orvostechnikai eszköz (SaMD)** és nem diagnosztizál szerotonin-szindrómát; publikált szakirodalomra épülő gyógyszerkölcsönhatás-szűrőként, klinikai kiürülési idő (washout) nyilvántartóként és sürgősségi kommunikációs (AAC) segédeszközként működik.

---

## 1. Célkitűzés és Referencia-adatbázisok

Ez az auditdokumentáció a [SeroSafe projektterv végső optimalizálása.md](../otio/SeroSafe%20projektterv%20v%C3%A9gs%C5%91%20optimaliz%C3%A1l%C3%A1sa.md) **6.1. (Farmakológiai konkordancia-vizsgálat)** követelményét teljesíti:

1. Tételesen összeveti a SeroSafe kurált, **30 hazai szerotonerg hatóanyagból** (`CURATED_SUBSTANCES`) és **5 nem-szerotonerg társgyógyszerből** (`COMMON_CO_MEDICATIONS`) álló szabálymátrixát az alábbi klinikai referenciákkal:
   - **OGYÉI Alkalmazási Előírások (SmPC) / EMA EPAR** (4.3 Ellenjavallatok, 4.4 Különleges figyelmeztetések, 4.5 Gyógyszerkölcsönhatások);
   - **Lexicomp Drug Interactions** súlyossági kategóriák: **X** *(Kontraindikált)*, **D** *(Terápia módosítása mérlegelendő)*, **C** *(Terápia monitorozása)*;
   - **DrugBank** kölcsönhatási besorolás (**Major** / **Moderate**);
   - **Hunter Serotonin Toxicity Criteria** (Dunkley et al., 2003) és **Boyer & Shannon** (*NEJM*, 2005);
   - **FDA / EMA biztonsági közlemények** (linezolid, metilénkék, triptánok, antipszichotikum NMS differenciálvédelem).
2. Azonosítja a **konzervatív túlbiztosítási (safety-first)** eltéréseket és kijelöli azokat a pontos pontokat, amelyeket **klinikai gyógyszerész és pszichiáter szakorvos mentor** bevonásával célszerű pontosítani az OTIO 1. fázisában.

### Kapcsolódó gépileg olvasható mellékletek és tesztek
- **Hatóanyag- és kiürülési audit táblázat (35 sor):** [`substances-audit-table.csv`](./substances-audit-table.csv)
- **Teljes 30 × 30 pár-mátrix (435 egyedi pár):** [`concordance-matrix-30x30.csv`](./concordance-matrix-30x30.csv)
- **Automatizált konkordancia tesztkészlet (Vitest):** [`src/engine/__tests__/concordance.test.ts`](../../src/engine/__tests__/concordance.test.ts)

---

## 2. Összefoglaló konkordancia-metrikák (435 pár + 35 hatóanyag)

| Mutató | Darabszám | Arány | Értelmezés |
| --- | ---: | ---: | --- |
| Auditált szerotonerg hatóanyagok (`CURATED_SUBSTANCES`) | **30** | 100% | Hazai vényköteles (SSRI, SNRI, TCA, MAOI, atípusos, opioid, triptán, 5-HT3) + OTC/kiegészítők |
| Nem-szerotonerg kontroll társgyógyszerek (`COMMON_CO_MEDICATIONS`) | **5** | 100% | ADHD szerek (`methylphenidate`, `atomoxetine`), NMS-figyeléses antipszichotikumok (`aripiprazole`, `risperidone`), `melatonin` |
| Egyedi hatóanyag-párok száma (`30 × 29 / 2`) | **435** | 100% | Teljes mátrix lefedve és automatizált teszttel ellenőrizve |
| `EGYEZIK_KONTRAINDIKALT` (MAOI + másik szer) | **135** | 31,0% | Lexicomp **X** / DrugBank **Major** / SmPC **4.3** — Motor: `CONSULT` + `hasContraindicatedMAOI=true` |
| `EGYEZIK_KONZULTACIO` (Erős SRI/prekurzor/Hypericum/lítium párok) | **190** | 43,7% | Lexicomp **D** / DrugBank **Major** / SmPC **4.4–4.5** — Motor: `CONSULT` |
| **Direkt súlyos interakciós konkordancia (X + D)** | **325 / 435** | **74,7%** | Nincs hamis negatív (*0% aluljelzés*) a kritikus (X/D) kategóriákban |
| `KONZERVATIV_TULBIZTOSITAS` (`mirtazapin`, `ondanszetron`, `szumatriptán`, `buspiron`, `fentanil`) | **110** | 25,3% | Lexicomp **C** / DrugBank **Moderate** — A SeroSafe szándékos biztonsági ráhagyással `CONSULT`-ot ad (0 hamis negatív!) |
| Szakorvosi pontosításra jelölt hatóanyagok (`AUDIT_SZUKSEGES`) | **12 / 30** | 40,0% | Külön kérdéslistával az [5. fejezetben](#5-szakorvossal-és-klinikai-gyógyszerésszel-pontosítandó-kérdések) |
| Szakorvosi átnézésre jelölt párok (`clinician_review_flag=IGEN`) | **239 / 435** | 54,9% | Főként RIMA/MAO-B, lítium, `desvenlafaxine` és a Lexicomp C / vitatott hatóanyagok párjai |

> [!NOTE]
> **Klinikai biztonsági aszimmetria:** A jelenlegi szabálymotor (`evaluateRiskAndSymptoms`) szándékosan **0% hamis negatívra (zero under-flagging)** optimalizál: minden Lexicomp X és D párt elkap (`325/325 = 100%`), míg a Lexicomp C / Moderate pároknál konzervatív `CONSULT` jelzést ad. A szakorvosi audit feladata eldönteni, hogy a 110 mérsékelt párnál megmaradjon-e ez a szigorú küszöb, vagy külön enyhébb „Tájékoztató / Monitorozás” fokozatot vezessünk be.

---

## 3. Tételes 30 + 5 hatóanyag audit táblázat

Az alábbi táblázat teljes egészében megfelel a [`substances-audit-table.csv`](./substances-audit-table.csv) adatainak:

| # | ID | Hatóanyag (HU) | Csoport | Mechanizmus | OTC | Washout (nap) | Referencia | Audit státusz |
| --: | --- | --- | --- | --- | --- | ---: | --- | --- |
| 1 | `fluoxetine` | Fluoxetin | SSRI | SRI | Nem | **35** | OGYÉI SmPC / Boyer & Shannon (NEJM 2005) | `KONFORM_ALAP` |
| 2 | `sertraline` | Szertralin | SSRI | SRI | Nem | 14 | OGYÉI SmPC / Lexicomp | `KONFORM_ALAP` |
| 3 | `escitalopram` | Eszcitaloprám | SSRI | SRI | Nem | 14 | OGYÉI SmPC / Lexicomp | `KONFORM_ALAP` |
| 4 | `citalopram` | Citaloprám | SSRI | SRI | Nem | 14 | OGYÉI SmPC / DrugBank | `KONFORM_ALAP` |
| 5 | `paroxetine` | Paroxetin | SSRI | SRI | Nem | 14 | OGYÉI SmPC / Lexicomp | `KONFORM_ALAP` |
| 6 | `fluvoxamine` | Fluvoxamin | SSRI | SRI | Nem | 14 | OGYÉI SmPC / DrugBank | `KONFORM_ALAP` |
| 7 | `venlafaxine` | Venlafaxin | SNRI | SRI | Nem | 14 | OGYÉI SmPC / Boyer & Shannon | **`AUDIT_SZUKSEGES`** |
| 8 | `duloxetine` | Duloxetin | SNRI | SRI | Nem | 14 | OGYÉI SmPC / Lexicomp | **`AUDIT_SZUKSEGES`** |
| 9 | `desvenlafaxine` | Dezvenlafaxin *(egyedi import)* | SNRI | SRI | Nem | 14 | Lexicomp / DrugBank | **`AUDIT_SZUKSEGES`** |
| 10 | `clomipramine` | Klomipramin | TCA | SRI | Nem | 14 | OGYÉI SmPC / Dunkley (Hunter Criteria) | `KONFORM_ALAP` |
| 11 | `amitriptyline` | Amitriptilin | TCA | SRI | Nem | 14 | OGYÉI SmPC / DrugBank | `KONFORM_ALAP` |
| 12 | `imipramine` | Imipramin | TCA | SRI | Nem | 14 | OGYÉI SmPC / Lexicomp | `KONFORM_ALAP` |
| 13 | `trazodone` | Trazodon | Atípusos | SRI + MODULATOR | Nem | 14 | OGYÉI SmPC / Lexicomp | `KONFORM_ALAP` |
| 14 | `vortioxetine` | Vortioxetin | Atípusos | SRI + MODULATOR | Nem | 14 | OGYÉI SmPC / EMA EPAR | `KONFORM_ALAP` |
| 15 | `mirtazapine` | Mirtazapin | Atípusos | MODULATOR | Nem | 14 | OGYÉI SmPC / Lexicomp | **`AUDIT_SZUKSEGES`** |
| 16 | `buspirone` | Buspiron | Atípusos *(szorongásoldó)* | AGONIST | Nem | 7 | OGYÉI SmPC / DrugBank | **`AUDIT_SZUKSEGES`** |
| 17 | `lithium` | Lítium-karbonát *(hangulatstab.)* | Atípusos *(hangulatstab.)* | MODULATOR | Nem | 14 | OGYÉI SmPC / Boyer & Shannon | **`AUDIT_SZUKSEGES`** |
| 18 | `moclobemide` | Moklobemid *(RIMA)* | MAOI | MAOI | Nem | 14 | OGYÉI SmPC / Lexicomp | **`AUDIT_SZUKSEGES`** |
| 19 | `selegiline` | Szelegilin *(MAO-B)* | MAOI | MAOI | Nem | 14 | OGYÉI SmPC / Lexicomp | **`AUDIT_SZUKSEGES`** |
| 20 | `rasagiline` | Razagilin *(MAO-B)* | MAOI | MAOI | Nem | 14 | OGYÉI SmPC / EMA EPAR | **`AUDIT_SZUKSEGES`** |
| 21 | `linezolid` | Linezolid *(kórházi AB)* | MAOI | MAOI | Nem | 14 | OGYÉI SmPC / FDA Warning | `KONFORM_ALAP` |
| 22 | `methylene_blue` | Metilénkék (IV) | MAOI | MAOI | Nem | 14 | EMA / FDA Safety Communication | `KONFORM_ALAP` |
| 23 | `tramadol` | Tramadol | Opioid fájd. | SRI | Nem | 7 | OGYÉI SmPC / Boyer & Shannon | `KONFORM_ALAP` |
| 24 | `fentanyl` | Fentanil | Opioid fájd. | AGONIST | Nem | 7 | Lexicomp / DrugBank | **`AUDIT_SZUKSEGES`** |
| 25 | `dextromethorphan` | Dextrometorfán (DXM) | OTC/kieg. | SRI | **Igen** | 5 | OGYÉI SmPC / Boyer & Shannon | `KONFORM_ALAP` |
| 26 | `st_johns_wort` | Orbáncfű (Hypericum) | OTC/kieg. | CYP_INHIBITOR_HYPERICUM + SRI | **Igen** | 14 | EMA HMPC / DrugBank | `KONFORM_ALAP` |
| 27 | `htp5` | 5-HTP | OTC/kieg. | PRECURSOR | **Igen** | 5 | DrugBank / Lexicomp | `KONFORM_ALAP` |
| 28 | `l_tryptophan` | L-triptofán | OTC/kieg. | PRECURSOR | **Igen** | 5 | DrugBank / Boyer & Shannon | `KONFORM_ALAP` |
| 29 | `sumatriptan` | Szumatriptán | Triptán | AGONIST | Nem | 3 | OGYÉI SmPC / FDA Advisory | **`AUDIT_SZUKSEGES`** |
| 30 | `ondansetron` | Ondanszetron | Egyéb (5-HT3) | MODULATOR | Nem | 3 | OGYÉI SmPC / Lexicomp | **`AUDIT_SZUKSEGES`** |

**Nem-szerotonerg kontroll társgyógyszerek (`COMMON_CO_MEDICATIONS`):**

| # | ID | Hatóanyag (HU) | Csoport | `nmsWatch` | Klinikai funkció a SeroSafe-ben | Audit státusz |
| --: | --- | --- | --- | --- | --- | --- |
| 31 | `methylphenidate` | Metilfenidát | ADHD stimuláns | Nem | Nem szerotonerg; tachikardia/autonóm tüneti elkülönítés | `KONFORM_ALAP` |
| 32 | `atomoxetine` | Atomoxetin | ADHD (NRI) | Nem | Nem szerotonerg; teljes mentőátadási lista | `KONFORM_ALAP` |
| 33 | `aripiprazole` | Aripiprazol | Antipszichotikum | **Igen** | Láz + izommerevség esetén **NMS védelmi 112-eszkaláció** | `KONFORM_ALAP` |
| 34 | `risperidone` | Riszperidon | Antipszichotikum | **Igen** | Láz + izommerevség esetén **NMS védelmi 112-eszkaláció** | `KONFORM_ALAP` |
| 35 | `melatonin` | Melatonin | Alvást segítő | Nem | Negatív kontroll (0 szerotonerg terhelés) | `KONFORM_ALAP` |

---

## 4. Kiemelt klinikai referencia-forgatókönyvek és washout-esetek

| Szcenárió / Pár | Klinikai referencia (Lexicomp / DrugBank / OGYÉI SmPC) | SeroSafe motor elvárt & mért eredmény | Konkordancia |
| --- | --- | --- | --- |
| **Fluoxetin elhagyva 34 napja + Moklobemid / Linezolid / Razagilin** | Lexicomp **X**, OGYÉI **4.3**: Fluoxetin aktív metabolitja (*norfluoxetin*) miatt minimum **5 hét (35 nap)** szünet kötelező | `activeSerotonergicCount=2`, `hasContraindicatedMAOI=true`, `level=CONSULT` + washout indoklás | **100% EGYEZIK** |
| **Fluoxetin elhagyva 36 napja + Moklobemid** | 35 napos klinikai kiürülési ablak leteltével a norfluoxetin ablak zárult | `activeSerotonergicCount=1`, `hasContraindicatedMAOI=false`, `level=INFO_LOGGED` | **100% EGYEZIK** |
| **Szertralin + OTC Dextrometorfán (DXM)** | Lexicomp **D**, DrugBank **Major**, Boyer & Shannon: súlyos szerotonerg kumuláció | `activeSerotonergicCount=2`, `level=CONSULT`, források feltüntetve | **100% EGYEZIK** |
| **Szertralin + OTC Orbáncfű / 5-HTP / L-triptofán / Tramadol** | Lexicomp **D**, DrugBank **Major**, EMA HMPC / OGYÉI SmPC | `activeSerotonergicCount=2`, `level=CONSULT` | **100% EGYEZIK** |
| **Venlafaxin + Linezolid vagy Metilénkék (IV)** | FDA/EMA Safety Alert, OGYÉI **4.3**: kórházi rejtett MAOI + SNRI életveszélyes interakció | `hasContraindicatedMAOI=true`, `level=CONSULT`, azonnali egyeztetési felhívás | **100% EGYEZIK** |
| **Szertralin + Mirtazapin / Ondanszetron / Szumatriptán** | Lexicomp **C**, DrugBank **Moderate** (részben vitatott szakirodalmi incidencia) | `level=CONSULT`, `hasContraindicatedMAOI=false` | **`KONZERVATIV_TULBIZTOSITAS`** *(mentorral döntendő)* |
| **Csak 1 szerotonerg szer (tünet nélkül, bármelyik a 30-ból)** | Nincs gyógyszerpár, Anti-Reassurance elv: nem állítható „Zöld/Biztonságos” | `activeSerotonergicCount=1`, `hasHighRiskCombination=false`, `level=INFO_LOGGED` | **100% EGYEZIK** |
| **5 nem-szerotonerg társgyógyszer együtt (tünet nélkül)** | Negatív kontroll: nincs szerotonerg kölcsönhatás | `activeSerotonergicCount=0`, `level=INFO_LOGGED` | **100% EGYEZIK** |
| **Csak Aripiprazol/Riszperidon + 38,5 °C láz + izommerevség** | Anti-Reassurance / **Malignus Neuroleptikus Szindróma (NMS)** vagy szepszis nem zárható ki | `activeSerotonergicCount=0`, `hasNmsOrSepsisConcern=true`, **`level=CALL_EMERGENCY_112`** | **100% EGYEZIK** |

---

## 5. Szakorvossal és klinikai gyógyszerésszel pontosítandó kérdések

Az alábbi **9 konkrét szakmai kérdést** szükséges átbeszélni és írásban rögzíteni a klinikai mentorokkal az OTIO 1. fázisának lezárásához:

1. **Moklobemid (RIMA) aszimmetrikus kiürülési ablaka (`moclobemide`):**
   - *Jelenlegi állapot:* Szimmetrikus `clinicalWashoutDays = 14`.
   - *Szakmai kérdés:* A reverzibilis MAO-A gátló moklobemid leállítása után az OGYÉI SmPC és a klinikai gyakorlat 24–48 órás (2–3 napos) kiürülési idővel számol SSRI indítása előtt (miközben SSRI/fluoxetin után továbbra is 14–35 napos várakozás kell). Csökkentsük-e a `moclobemide` saját kiürülési ablakát **3–5 napra**, meghagyva a fluoxetin/SSRI felőli hosszú ablakot?
2. **MAO-B gátlók dózisfüggése (`selegiline`, `rasagiline`):**
   - *Jelenlegi állapot:* Mindkettő `MAOI` mechanizmussal, feltétlen kontraindikációval (`hasContraindicatedMAOI=true`) szerepel minden szerotonerg szerrel.
   - *Szakmai kérdés:* Hazai neurológiai-pszichiátriai gyakorlatban szelegilin/razagilin mellett bizonyos SSRI-k alacsony dózisban egyedi orvosi kontrollal előfordulnak-e, vagy maradjon a betegbiztonsági szempontból konzervatív `MAOI` tiltójelzés (külön kiemelve a fluoxetin utáni 5 hetes tiltást)?
3. **Mirtazapin és Ondanszetron klinikai besorolása (`mirtazapine`, `ondansetron`):**
   - *Jelenlegi állapot:* Mindkettő szerepel a 30-as listában és `CONSULT` szintet ad pl. SSRI mellé rendelve.
   - *Szakmai kérdés:* Bár az FDA/OGYÉI figyelmeztetést tartalmaz, klinikai toxikológiai elemzések (pl. Gillman; Scotton et al.) szerint a 5-HT2/5-HT3 antagonista mirtazapin és az ondanszetron valós szerotonin-szindróma kockázata nagyon alacsony. Maradjanak bent az SmPC-vel való összhang miatt, vagy kerüljenek külön enyhébb „Tájékoztató / Ritka kockázat” alcsoportba?
4. **Szumatriptán + SSRI/SNRI figyelmeztetés fokozata (`sumatriptan`):**
   - *Jelenlegi állapot:* `CONSULT` figyelmeztetés bármely SSRI/SNRI mellett (gyakori migrén + antidepresszáns kombináció!).
   - *Szakmai kérdés:* Tekintettel az Orlova et al. (*JAMA Neurology*, 2018) nagy elemszámú vizsgálatára és a Lexicomp **C** kategóriára, hasznosabb-e a neurodivergens páciensek szorongáscsökkentése érdekében külön **„Mérsékelt / Ritka kölcsönhatás (Tájékoztató)”** szint létrehozása a MAOI+SRI (`X`) és SSRI+DXM/Tramadol (`D`) szinttől elkülönítve?
5. **Hazai forgalom és hatóanyagcsere (`desvenlafaxine`, `fentanyl`):**
   - *Jelenlegi állapot:* A `desvenlafaxine` jelenleg „egyedi import” megjegyzéssel van jelen; a `fentanyl` opioiddal együtt.
   - *Szakmai kérdés:* Érdemes-e a Magyarországon ritka `desvenlafaxine`-t (esetleg a `fentanyl`-t is) lecserélni a hazai betegellátásban és irodalomban gyakrabban ütköző szerotonerg szerekre — például **metoklopramid**, **zolmitriptán / eletriptán**, **klórprotixén / levomepromazin** helyett célzottabban **tapentadol**, **petidin (meperidin)** vagy **triptánok** köréből?
6. **SNRI-k kiürülési ablakának pufferelése (`venlafaxine`, `duloxetine`):**
   - *Jelenlegi állapot:* `14` nap mindkettőnél (míg egyes SmPC-k min. 5–7 napot adnak meg rövidebb felezési idő miatt).
   - *Szakmai kérdés:* Elfogadja-e a klinikai audit a **14 napos biztonsági puffert**, vagy igazítsuk pontosan az OGYÉI SmPC minimális (7 napos) előírásához?
7. **Lítium és Buspiron gyógyszercsoport-kódolása (`lithium`, `buspirone`):**
   - *Jelenlegi állapot:* Technikai okból `ATYPICAL_ANTIDEPRESSANT` kategóriakódot használnak.
   - *Szakmai kérdés:* Jóváhagyja-e a szakorvos a külön `MOOD_STABILIZER` (*Hangulatstabilizáló*) és `ANXIOLYTIC` (*Szorongáscsökkentő*) alosztály felvételét a kódbázis és az adatbázis tisztasága érdekében?
8. **3+ szerotonerg szer kombinációja vs. 2 szeres pár:**
   - *Jelenlegi állapot:* 2 és 3+ szerotonerg hatóanyag egyaránt `CONSULT` szintre kerül (csak magas láz/neuromuszkuláris vészjel eszkalál `CALL_EMERGENCY_112`-re).
   - *Szakmai kérdés:* Tünetmentes **3+ szerotonerg szer vagy aktív MAOI+SSRI** jelenlétében elégséges-e a kiemelt sürgős orvosi/gyógyszerészi konzultáció (`CONSULT`), hogy elkerüljük a tünet nélküli 112-es riasztástól való túlzott riadót?
9. **Komplett vény nélküli (OTC) kombinált magyar megfázás elleni készítmények nevesítése:**
   - *Jelenlegi állapot:* `Robitussin Antitussicum`, `Gripex`, `Rhinathiol köhögéscsillapító` van megadva `dextromethorphan` példaként.
   - *Szakmai kérdés:* Gyógyszerész mentor ellenőrzése arra, hogy pontosan mely aktuálisan hazai gyógyszertári forgalomban lévő megfázás- és köhögéscsillapító termékek tartalmaznak valóban DXM-et (és ne maradjon elavult márkanév a példalistában).

---

## 6. Automatizált konkordancia- és biztonsági tesztkészlet

A manuális táblázat mellett a projekt tartalmazza a teljes, gépileg futtatható Vitest validációs csomagot (**3 tesztfájl, 29/29 sikeres teszt** minden build előtt `bun run test` paranccsal ellenőrizve):

- **Farmakológiai konkordancia ([`src/engine/__tests__/concordance.test.ts`](../../src/engine/__tests__/concordance.test.ts) — 5 teszt):**
  - **35/35 anyag-konzisztencia ellenőrzés:** A [`substances-audit-table.csv`](./substances-audit-table.csv) minden `id`, `drug_class`, `mechanisms`, `is_otc_or_supplement` és `clinical_washout_days` mezője megegyezik a forráskóddal.
  - **435/435 pár-teszt:** A [`concordance-matrix-30x30.csv`](./concordance-matrix-30x30.csv) mind a 435 egyedi párján lefuttatja az `evaluateRiskAndSymptoms` motort, és ellenőrzi az elvárt döntési szint (`CONSULT`), a `hasContraindicatedMAOI` jelző, az aktív szerotonerg darabszám (`2`) és a forráshivatkozás meglétét.
  - **30/30 egyedüli hatóanyag Anti-Reassurance próba:** Igazolja, hogy önmagában egyetlen szerre sem ad vissza `SAFE`/`GREEN` eredményt (`INFO_LOGGED`).
  - **60/60 klinikai washout határérték-teszt:** Minden egyes hatóanyagra teszteli a `clinicalWashoutDays - 1` napos (aktív kiürülés → `CONSULT`) és `clinicalWashoutDays + 1` napos (kiürült → `INFO_LOGGED`) viselkedést.
  - **Klinikai referenciapróba (Vignetták):** Fluoxetin 34 vs. 36 nap + mind az 5 MAOI; SSRI/SNRI + DXM / Orbáncfű / 5-HTP / L-triptofán / Tramadol; kórházi Linezolid és Metilénkék; 5 nem-szerotonerg társgyógyszer negatív kontroll; Aripiprazol/Riszperidon + 38,5 °C láz + izommerevség → `CALL_EMERGENCY_112` (NMS védelem).
- **Motor-, riasztás- és adatmodell-tesztek ([`src/engine/__tests__/safetyEngine.test.ts`](../../src/engine/__tests__/safetyEngine.test.ts) — 21 teszt):** Ellenőrzi a tünet-szinkronizációt (`symptomSync.ts`), a 2×2-es kontingencia-alapú determinisztikus mintázat-felfedést (`patternEngine.ts`), az automatikus napszakfelismerést, a JSON-mentés validációját (`backup.ts`), valamint a megerősítéssel halkítható, de új figyelmeztető tünetre vagy szerváltozásra automatikusan visszatérő `CONSULT` riasztáslogikát (`consultAlert.ts`; 112-es vészjelzés soha nem halkítható).
- **Helyi titkosítási tesztek ([`src/services/__tests__/crypto.test.ts`](../../src/services/__tests__/crypto.test.ts) — 3 teszt):** PBKDF2 + AES-GCM kulcsszármaztatás, PIN-verifikáció és hibás PIN elutasítása.

---

## 7. Klinikai Gyógyszerészi és Pszichiáter Szakorvosi Audit-jegyzőkönyv (OTIO 1. fázis)

| Audit mező | Klinikai Gyógyszerész Mentor | Pszichiáter Szakorvos Mentor |
| --- | --- | --- |
| **Név és szakképesítés / pecsétszám** | ...................................................... | ...................................................... |
| **Intézmény** | ...................................................... | ...................................................... |
| **Ellenőrzött állomány verziója** | SeroSafe MVP v1.1 (2026.11.22., 30+5 tétel, 435 pár, 29/29 Vitest) | SeroSafe MVP v1.1 (2026.11.22., 30+5 tétel, 435 pár, 29/29 Vitest) |
| **Mely pontok elfogadottak módosítás nélkül?** | [ ] 1–30 tétel [ ] Washout idők | [ ] Tünetlisták [ ] NMS/112 határérték |
| **Módosítási / pontosítási javaslat (5. fejezet sorszámai)** | ...................................................... | ...................................................... |
| **Dátum és aláírás** | 2026. .... . .... .................................. | 2026. .... . .... .................................. |

---

## 8. Szakirodalom

1. Dunkley, E. J., Isbister, G. K., Sibbritt, D., Dawson, A. H., & Whyte, I. M. (2003). The Hunter Serotonin Toxicity Criteria: simple and accurate diagnostic decision rules for serotonin toxicity. *QJM*, 96(9), 635–642.
2. Boyer, E. W., & Shannon, M. (2005). The serotonin syndrome. *New England Journal of Medicine*, 352(11), 1112–1120.
3. Orlova, Y., Rizzoli, P., & Loder, E. (2018). Association of Coprescription of Triptan Antimigraine Drugs and Selective Serotonin Reuptake Inhibitor or Selective Norepinephrine Reuptake Inhibitor Antidepressants With Serotonin Syndrome. *JAMA Neurology*, 75(5), 566–572.
4. Gillman, P. K. (2006). A review of serotonin toxicity data: implications for the mechanisms of antidepressant drug action. *Biological Psychiatry*, 59(11), 1046–1051.
5. Medical Device Coordination Group (MDCG). (2019). *MDCG 2019-11: Guidance on Qualification and Classification of Software in Regulation (EU) 2017/745 – MDR*. European Commission.
6. OGYÉI / EMA Alkalmazási Előírások (SmPC) adatbázisa, Lexicomp Drug Interactions, DrugBank, FDA/EMA biztonsági közlemények.
