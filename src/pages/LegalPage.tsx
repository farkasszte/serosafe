import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  FileText,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface LegalPageProps {
  lang: 'hu' | 'en';
  onBack: () => void;
}

export function LegalPage({ lang, onBack }: LegalPageProps) {
  const hu = lang === 'hu';

  function jumpToSection(id: string) {
    const reduced =
      document.documentElement.dataset.reducedMotion === 'true' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  return (
    <div data-no-swipe="true" className="space-y-3 @lg:space-y-5">
      {/* Top Return Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-2 @lg:px-0 @lg:pt-0">
        <button
          type="button"
          onClick={onBack}
          className="px-3.5 py-2 rounded-xl bg-surface border border-border hover:border-border-strong text-xs font-bold text-ink inline-flex items-center gap-1.5 transition"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          {hu ? 'Vissza' : 'Back'}
        </button>

        <span className="text-xs font-medium text-ink-muted tabular-nums">
          {hu ? 'Verzió: 1.0 • Hatályos: 2026. 11. 21.' : 'Version 1.0 • Effective: 2026-11-21'}
        </span>
      </div>

      {/* Dedicated Full-Surface Document */}
      <article className="bg-surface border-y border-border px-4 py-5 @lg:border @lg:rounded-3xl @lg:p-8 space-y-6">
        <header className="space-y-3">
          <div className="space-y-1">
            <h1 className="text-lg @lg:text-xl font-bold text-ink">
              {hu
                ? 'Felhasználási feltételek, adatvédelem és források'
                : 'Terms of Use, Privacy Policy & Scientific Sources'}
            </h1>
            <p className="text-xs text-ink-muted leading-relaxed">
              {hu
                ? 'Általános jogi feltételek, felelősségi szabályok, GDPR-szerinti helyi adatkezelési tájékoztató, valamint nem kereskedelmi forráskód-licencek és klinikai hivatkozások.'
                : 'General legal terms, limitation of liability, GDPR-aligned local privacy notice, and non-commercial software & open scientific attributions.'}
            </p>
          </div>

          <nav
            aria-label={hu ? 'Jogi fejezetek' : 'Legal sections'}
            className="flex flex-wrap gap-1.5"
          >
            {[
              { id: 'legal-terms', hu: 'Feltételek', en: 'Terms' },
              { id: 'legal-liability', hu: 'Felelősség', en: 'Liability' },
              { id: 'legal-privacy', hu: 'Adatvédelem (GDPR)', en: 'Privacy (GDPR)' },
              { id: 'legal-sources', hu: 'Licencek és források', en: 'Licenses & Sources' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToSection(item.id)}
                className="px-3 py-1 rounded-full bg-surface-subtle border border-border hover:border-border-strong text-xs font-semibold text-ink-muted hover:text-ink transition"
              >
                {hu ? item.hu : item.en}
              </button>
            ))}
          </nav>
        </header>

        {/* 1. Általános rendelkezések */}
        <section id="legal-terms" className="pt-5 border-t border-border space-y-2.5 scroll-mt-16">
          <h2 className="text-sm font-bold text-ink inline-flex items-center gap-2">
            <FileText className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
            {hu
              ? '1. Általános rendelkezések és a feltételek elfogadása'
              : '1. General Provisions & Acceptance of Terms'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              {hu
                ? 'Jelen Felhasználási Feltételek (a továbbiakban: „Feltételek”) a SeroSafe webes és telepíthető (PWA / mobil) alkalmazás (a továbbiakban: „Alkalmazás”) használatának általános jogi feltételeit határozzák meg. Hatálybalépés dátuma: 2026. november 21.'
                : 'These Terms of Use govern access to and use of the SeroSafe web and installable (PWA / mobile) application ("Application"). Effective date: November 21, 2026.'}
            </li>
            <li>
              {hu
                ? 'Az Alkalmazás nyilvános forráskódú, nem kereskedelmi (Source-Available / Non-Commercial) szoftver, amely regisztráció, felhasználói fiók és előfizetési díj nélkül, térítésmentesen használható. Nem minősül üzletszerű elektronikus kereskedelmi vagy egészségügyi szolgáltatásnak.'
                : 'The Application is provided free of charge as source-available, non-commercial software without registration, user accounts, or paid subscriptions.'}
            </li>
            <li>
              {hu
                ? 'Az Alkalmazás megnyitásával és használatával a felhasználó elfogadja jelen Feltételeket és az Adatkezelési tájékoztatót. Amennyiben a Feltételekkel nem értesz egyet, kérjük, ne használd az Alkalmazást.'
                : 'By accessing or using the Application, you agree to these Terms and the Privacy Policy below. If you do not agree, please discontinue use.'}
            </li>
          </ul>
        </section>

        {/* 2. Orvosi és szabályozási nyilatkozat */}
        <section className="pt-5 border-t border-border space-y-2.5">
          <h2 className="text-sm font-bold text-ink inline-flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning-ink shrink-0" aria-hidden="true" />
            {hu
              ? '2. Orvosi és szabályozási nyilatkozat (EU MDR / MDCG 2019-11)'
              : '2. Medical & Regulatory Disclaimer (EU MDR / MDCG 2019-11)'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              {hu
                ? 'A SeroSafe személyes önmegfigyelő napló, publikált szakirodalmi gyógyszerinformációs szűrő és vészhelyzeti augmentatív kommunikációs (AAC) segédeszköz. Nem minősül orvostechnikai eszköznek (EU 2017/745 MDR / MDCG 2019-11), nem állít fel orvosi diagnózist, és nem helyettesíti kezelőorvos, pszichiáter vagy gyógyszerész szakvéleményét.'
                : 'SeroSafe is a personal self-tracking log, curated pharmacological reference filter, and emergency AAC aid. It is not a certified medical device (EU MDR 2017/745 / MDCG 2019-11), does not establish medical diagnoses, and never replaces physician or pharmacist advice.'}
            </li>
            <li>
              {hu
                ? 'Óvatossági elv (Anti-Reassurance): a figyelmeztetés hiánya soha nem jelenti azt, hogy egy gyógyszerkombináció vagy testi tünet biztonságos. Soha ne módosítsd, ne hagyd el és ne állítsd be önállóan az előírt gyógyszereidet az Alkalmazás alapján!'
                : 'Anti-Reassurance principle: absence of an alert never implies that a medication combination or symptom is safe. Never start, stop, or alter prescribed treatment solely based on this Application.'}
            </li>
            <li>
              {hu
                ? 'Akut vészhelyzetben (különösen ≥ 38,0 °C láz, akaratlan izomrángás, izommerevség, nehézlégzés vagy zavartság esetén) az Alkalmazás eredményétől függetlenül azonnal hívd a 112-t vagy fordulj a legközelebbi sürgősségi ellátóhoz!'
                : 'In any acute emergency (such as fever ≥ 38.0 °C, involuntary muscle twitching, rigidity, breathing difficulty, or confusion), call 112 or emergency services immediately regardless of app status.'}
            </li>
          </ul>
        </section>

        {/* 3. Korhatár és rendeltetésszerű használat */}
        <section className="pt-5 border-t border-border space-y-2.5">
          <h2 className="text-sm font-bold text-ink inline-flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
            {hu
              ? '3. Korhatár, cselekvőképesség és rendeltetésszerű használat'
              : '3. Eligibility, Minors & Acceptable Use'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              {hu
                ? 'Az Alkalmazás rendeltetése kizárólag személyes, nem kereskedelmi és jogszerű egészségügyi önmegfigyelés, valamint vészhelyzeti betegátadási támogatás.'
                : 'The Application is intended strictly for personal, non-commercial self-tracking and emergency communication support.'}
            </li>
            <li>
              {hu
                ? '16 év alatti vagy cselekvőképességében korlátozott felhasználó (az EU GDPR 8. cikkével összhangban) kizárólag szülői / törvényes képviselői felügyelettel és hozzájárulással állíthatja be és használhatja az Alkalmazást, különösen a gyógyszerlista és a Kríziskártya adatainak megadásánál.'
                : 'Users under age 16 (or without full legal capacity under EU GDPR Article 8) should set up and use the Application—especially medication entries and Crisis Card settings—under parent or legal guardian supervision.'}
            </li>
            <li>
              {hu
                ? 'A bevitt gyógyszerek, dózisok, bevételi időpontok, vészhelyzeti kontaktok és a zárolási képernyő háttérképének naprakészen tartása a felhasználó (vagy támogatója) felelőssége; a mintaadatok kizárólag kipróbálásra és oktatási bemutatóra szolgálnak.'
                : 'You (or your caregiver) are responsible for keeping entered medications, dose times, ICE contacts, and exported lock-screen images accurate and current. Demo presets are strictly illustrative.'}
            </li>
          </ul>
        </section>

        {/* 4. Szavatosság és felelősségkorlátozás */}
        <section id="legal-liability" className="pt-5 border-t border-border space-y-2.5 scroll-mt-16">
          <h2 className="text-sm font-bold text-ink inline-flex items-center gap-2">
            <Scale className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
            {hu
              ? '4. Szavatosság kizárása és felelősségkorlátozás („AS IS”)'
              : '4. Disclaimer of Warranties & Limitation of Liability ("AS IS")'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              {hu
                ? 'Az Alkalmazás „ahogy van” („AS IS”) és „ahogy elérhető” alapon áll rendelkezésre. A jogszabályok által megengedett legteljesebb mértékben kizárt minden kifejezett vagy hallgatólagos szavatosság a hibamentes, megszakítás nélküli működésre, adott célra való alkalmasságra vagy az adatok teljességére vonatkozóan.'
                : 'The Application is provided "AS IS" and "AS AVAILABLE", without express or implied warranties of merchantability, fitness for a particular purpose, accuracy, or uninterrupted availability to the fullest extent permitted by law.'}
            </li>
            <li>
              {hu
                ? 'A készítők és közreműködők nem vállalnak felelősséget az eszköz meghibásodásából, akkumulátor-lemerülésből, operációs rendszeri vagy böngészőkorlátozásból (pl. webes gyorsítótár automatikus törlése, hangszintetizátor hiánya), illetve a PIN-kód elfelejtéséből eredő adatvesztésért vagy közvetett károkért. Ajánlott a rendszeres helyi JSON biztonsági mentés készítése.'
                : 'Authors and contributors are not liable for hardware failure, depleted battery, OS/browser storage eviction, missing speech synthesis voices, forgotten PIN keys, or indirect/consequential damages. Regular local JSON backups are strongly recommended.'}
            </li>
            <li>
              {hu
                ? 'Jelen felelősségkorlátozás nem érinti azokat a jogokat és kötelezettségeket, amelyek a magyar Polgári Törvénykönyv (Ptk. 6:152. §) és az irányadó fogyasztóvédelmi jogszabályok alapján érvényesen nem korlátozhatók és nem zárhatók ki — ideértve különösen a szándékosan okozott, valamint az életet, testi épséget vagy egészséget megkárosító szerződésszegésért fennálló felelősséget.'
                : 'Nothing in these Terms limits or excludes any liability that cannot legally be limited or excluded under mandatory Hungarian Civil Code (Ptk. § 6:152) or EU statutory law, including intentional harm or injury to life, limb, or health.'}
            </li>
          </ul>
        </section>

        {/* 5. Adatkezelési tájékoztató és GDPR */}
        <section id="legal-privacy" className="pt-5 border-t border-border space-y-2.5 scroll-mt-16">
          <h2 className="text-sm font-bold text-ink inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
            {hu
              ? '5. Adatkezelési tájékoztató és GDPR jogok (EU 2016/679)'
              : '5. Privacy Policy & GDPR Rights (Regulation EU 2016/679)'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              {hu
                ? '100% helyi, szerver nélküli adatkezelés: az Alkalmazás nem üzemeltet távoli szervert vagy felhőadatbázist. A bevitt különleges személyes (egészségügyi) adatok (GDPR 9. cikk) — gyógyszerek, napi naplók, fájdalomértékek, kommunikációs profil — kizárólag a saját eszközöd böngészőjének helyi tárhelyén (IndexedDB) kerülnek tárolásra, és soha nem hagyják el az eszközt.'
                : '100% local, zero-server architecture: no personal or special-category health data (GDPR Article 9) is transmitted to any server or third party. All medications, symptom logs, pain scores, and ICE cards remain strictly inside your device’s IndexedDB.'}
            </li>
            <li>
              {hu
                ? 'Sütik és nyomkövetés hiánya: az Alkalmazás nem használ hirdetési, analitikai vagy viselkedéskövető sütiket (cookie-kat) és harmadik feles nyomkövető szkripteket.'
                : 'Zero cookies and zero tracking: the Application sets no advertising, analytics, or behavioral tracking cookies and loads no third-party telemetry scripts.'}
            </li>
            <li>
              {hu
                ? 'Titkosítás és fizikai hozzáférés: a Beállításokban opcionálisan bekapcsolható a helyi PIN-zár, amely PBKDF2 kulcsszármaztatással és AES-GCM (WebCrypto API) titkosítással védi a helyi tárhelyet. Ha bekapcsolva marad a „Kríziskártya elérése PIN nélkül” opció vagy zárolási képernyő háttérképet állítasz be, az alapvető vészhelyzeti adatok a telefon fizikai birtokában lévő személyek (pl. mentők) számára olvashatók lesznek.'
                : 'Encryption & physical visibility: enabling the optional PIN lock derives a local key (PBKDF2) and encrypts IndexedDB storage using AES-GCM (WebCrypto). If PIN-less Crisis Card access or a lock-screen wallpaper is enabled, emergency handover data is intentionally readable without unlocking the phone.'}
            </li>
            <li>
              {hu
                ? 'Érintetti jogok gyakorlása (GDPR 15–20. cikk): mivel adataid felett kizárólag Te rendelkezel az eszközödön, bármikor közvetlenül gyakorolhatod a hozzáférés és helyesbítés jogát a felületen, az adathordozhatóság jogát (JSON / CSV export a Biztonság fülön), valamint a törléshez való jogot („Minden adat törlése” gomb vagy a böngésző webhelyadatainak törlése).'
                : 'Your GDPR rights (Articles 15–20): since all data is stored locally under your sole control, you can directly inspect and edit entries, exercise data portability (JSON/CSV export on the Safety tab), and erase all data anytime ("Erase all local data" or clearing browser storage).'}
            </li>
            <li>
              {hu
                ? 'Technikai kiszolgálási naplók: ha az Alkalmazást külső statikus tárhelyről (pl. GitHub Pages) töltöd le, a tárhelyszolgáltató szabványos HTTP-kiszolgálási naplót (pl. IP-cím a statikus fájlok letöltésekor) rögzíthet saját adatvédelmi szabályzata szerint; az ezt követő offline használat során külső hálózati kérés nem történik.'
                : 'Static hosting logs: if loaded via a public static web host (e.g., GitHub Pages), that host may process standard HTTP request metadata to serve static assets under its own privacy notice; offline usage makes zero external requests.'}
            </li>
          </ul>
        </section>

        {/* 6. Szellemi tulajdonjogok és tudományos források */}
        <section id="legal-sources" className="pt-5 border-t border-border space-y-2.5 scroll-mt-16">
          <h2 className="text-sm font-bold text-ink inline-flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-secondary shrink-0" aria-hidden="true" />
            {hu
              ? '6. Szellemi tulajdonjogok, nyílt licencek és tudományos források'
              : '6. Intellectual Property, Open Licenses & Scientific Sources'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              <strong className="text-ink">
                {hu
                  ? 'Alkalmazás forráskódja (PolyForm Noncommercial License 1.0.0):'
                  : 'Application source code (PolyForm Noncommercial License 1.0.0):'}
              </strong>{' '}
              {hu
                ? 'A SeroSafe forráskódja személyes, oktatási, kutatási, civil és közegészségügyi célokra szabadon használható és továbbfejleszthető; kereskedelmi célú hasznosítása vagy értékesítése a szerzők engedélye nélkül tilos.'
                : 'SeroSafe source code is licensed for personal, educational, research, charitable, and public health non-commercial use; commercial exploitation is prohibited without permission.'}
            </li>
            <li>
              <strong className="text-ink">
                {hu
                  ? 'Kurált klinikai adatbázis és validációs dokumentáció (CC BY-NC-SA 4.0):'
                  : 'Curated clinical dataset & validation docs (CC BY-NC-SA 4.0):'}
              </strong>{' '}
              {hu
                ? 'A hazai gyógyszeradatbázis és a farmakológiai konkordancia-dokumentáció Nevezd meg! – Ne add el! – Így add tovább! licenc alatt áll.'
                : 'Curated pharmacological tables and validation matrices are licensed under CC BY-NC-SA 4.0.'}
            </li>
            <li>
              <strong className="text-ink">
                {hu
                  ? 'Nyílt Érzelemkerék (Open Emotion Wheel — CC BY-SA 4.0):'
                  : 'Open Emotion Wheel (CC BY-SA 4.0):'}
              </strong>{' '}
              {hu
                ? 'Dr. Gloria Willcox (1982) Érzéskerék (The Feeling Wheel) koncepciója alapján átdolgozott magyar és angol nyelvű érzelemválasztó.'
                : 'Bilingual emotion wheel adapted from Dr. Gloria Willcox (1982), The Feeling Wheel concept.'}
            </li>
            <li>
              <strong className="text-ink">
                {hu
                  ? 'Anatómiai testséma (Stanford CHOIR Body Map alapokon):'
                  : 'Anatomical Body Map (Stanford CHOIR Body Map inspired):'}
              </strong>{' '}
              {hu
                ? 'Elölnézeti, hátulnézeti és nagyított fej–száj–torok anatómiai zónák, 0–10 fájdalomskálával és fájdalomminőség-jelzőkkel.'
                : 'Anterior, posterior, and magnified head–mouth–throat body regions paired with a 0–10 NRS pain scale and pain quality descriptors.'}
            </li>
            <li>
              <strong className="text-ink">
                {hu
                  ? 'Szerotonerg és kiürülési referencia-adatbázis:'
                  : 'Serotonergic & washout reference matrix:'}
              </strong>{' '}
              {hu
                ? 'OGYÉI alkalmazási előírások (SmPC), Lexicomp, DrugBank, FDA/EMA biztonsági közlemények, Hunter Szerotonin Toxicitási Kritériumok (Dunkley et al., 2003), Boyer & Shannon (NEJM, 2005) és NMS-elkülönítő szempontok.'
                : 'Curated from OGYÉI SmPC, Lexicomp, DrugBank, FDA/EMA advisories, Hunter Serotonin Toxicity Criteria (Dunkley et al., 2003), Boyer & Shannon (NEJM, 2005), and NMS differential safeguards.'}
            </li>
            <li>
              <strong className="text-ink">
                {hu ? 'Mentőszolgálati átadási séma:' : 'Emergency handover schema:'}
              </strong>{' '}
              {hu
                ? 'Nemzetközi MIST átadási protokoll (gyógyszerek, tünetek, vitális jelek, szükséges bánásmód) a mentőszolgálati kommunikáció gyorsításához.'
                : 'International MIST emergency handover structure optimizing responder readability.'}
            </li>
          </ul>
        </section>

        {/* 7. Módosítás, elválaszthatóság, irányadó jog és kapcsolat */}
        <section className="pt-5 border-t border-border space-y-2.5">
          <h2 className="text-sm font-bold text-ink">
            {hu
              ? '7. A Feltételek módosítása, elválaszthatóság, irányadó jog és kapcsolat'
              : '7. Amendments, Severability, Governing Law & Contact'}
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-muted list-disc pl-4 leading-relaxed">
            <li>
              {hu
                ? 'Feltételek módosítása: a fejlesztők az Alkalmazás frissítéseivel együtt módosíthatják jelen Feltételeket, feltüntetve az új verziószámot és hatálybalépési dátumot. A módosítást követő további használat az új feltételek elfogadását jelenti.'
                : 'Amendments: these Terms may be updated alongside new releases with an updated version and effective date; continued use constitutes acceptance.'}
            </li>
            <li>
              {hu
                ? 'Elválaszthatóság: amennyiben jelen Feltételek bármely rendelkezése érvénytelennek vagy kikényszeríthetetlennek bizonyul, az nem érinti a többi rendelkezés érvényességét és alkalmazhatóságát.'
                : 'Severability: if any provision of these Terms is found invalid or unenforceable, the remaining provisions remain in full force.'}
            </li>
            <li>
              {hu
                ? 'Irányadó jog és jogvita: jelen Feltételekre és az Alkalmazás használatára Magyarország joga (különösen a Ptk.), valamint a közvetlenül alkalmazandó európai uniós rendeletek (GDPR, MDR) az irányadók.'
                : 'Governing law: governed by Hungarian law and directly applicable European Union regulations (GDPR, EU MDR), without prejudice to mandatory local consumer protections.'}
            </li>
            <li>
              {hu
                ? 'Kapcsolat és hibabejelentés: szakmai észrevételek, fordítási vagy jogi megkeresések a projekt nyilvános GitHub adattárának Issue / Security csatornáján keresztül nyújthatók be.'
                : 'Contact & feedback: legal notices, clinical feedback, or bug reports may be submitted through the project repository issue tracker.'}
            </li>
          </ul>
        </section>

        <div className="pt-4 border-t border-border flex justify-start">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-strong text-ink-on-accent text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            {hu ? 'Vissza az alkalmazáshoz' : 'Back to app'}
          </button>
        </div>
      </article>
    </div>
  );
}
