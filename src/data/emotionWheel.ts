export interface FeelingSubItem {
  id: string;
  hu: string;
  en: string;
}

export interface FeelingCoreGroup {
  id: string;
  hu: string;
  en: string;
  color: string;
  mapped: string;
  children: FeelingSubItem[];
}

// Open Emotion Wheel (CC BY-SA 4.0) — structured after Dr. Gloria Willcox (1982)
export const WILLCOX_CORES: FeelingCoreGroup[] = [
  {
    id: 'w_happy',
    hu: 'Boldog',
    en: 'Happy',
    color: 'var(--color-accent)',
    mapped: 'em_calm',
    children: [
      { id: 'w_peaceful', hu: 'Békés / nyugodt', en: 'Peaceful' },
      { id: 'w_optimistic', hu: 'Bizakodó', en: 'Optimistic' },
      { id: 'w_accepted', hu: 'Elfogadott', en: 'Accepted' },
      { id: 'w_inspired', hu: 'Lelkes / motivált', en: 'Inspired' },
    ],
  },
  {
    id: 'w_sad',
    hu: 'Szomorú',
    en: 'Sad',
    color: 'var(--color-secondary)',
    mapped: 'em_numb',
    children: [
      { id: 'w_lonely', hu: 'Magányos', en: 'Lonely' },
      { id: 'w_vulnerable', hu: 'Sebezhető', en: 'Vulnerable' },
      { id: 'w_empty', hu: 'Üres / tompa', en: 'Empty / numb' },
      { id: 'w_exhausted', hu: 'Kimerült', en: 'Exhausted' },
    ],
  },
  {
    id: 'w_fearful',
    hu: 'Félő',
    en: 'Fearful',
    color: 'var(--color-warning)',
    mapped: 'em_anxious',
    children: [
      { id: 'w_anxious', hu: 'Szorongó', en: 'Anxious' },
      { id: 'w_insecure', hu: 'Bizonytalan', en: 'Insecure' },
      { id: 'w_helpless', hu: 'Tehetetlen', en: 'Helpless' },
      { id: 'w_overwhelmed', hu: 'Túlterhelt', en: 'Overwhelmed' },
    ],
  },
  {
    id: 'w_angry',
    hu: 'Dühös',
    en: 'Angry',
    color: 'var(--color-emergency)',
    mapped: 'em_irritable',
    children: [
      { id: 'w_frustrated', hu: 'Frusztrált', en: 'Frustrated' },
      { id: 'w_irritable', hu: 'Ingerlékeny', en: 'Irritable' },
      { id: 'w_resentful', hu: 'Neheztelő', en: 'Resentful' },
      { id: 'w_critical', hu: 'Feszült', en: 'Critical / tense' },
    ],
  },
  {
    id: 'w_bad',
    hu: 'Terhelt',
    en: 'Bad / Stressed',
    color: 'var(--color-chart-sensory)',
    mapped: 'em_drained',
    children: [
      { id: 'w_bored', hu: 'Ingerszegény / unott', en: 'Bored' },
      { id: 'w_busy', hu: 'Szétszórt / hajszolt', en: 'Rushed / busy' },
      { id: 'w_stressed', hu: 'Túlterhelt / fáradt', en: 'Stressed' },
      { id: 'w_sleepy', hu: 'Álmos / lassú', en: 'Sleepy' },
    ],
  },
  {
    id: 'w_surprised',
    hu: 'Meglepett',
    en: 'Surprised',
    color: 'var(--color-info)',
    mapped: 'em_confused',
    children: [
      { id: 'w_startled', hu: 'Megriadt', en: 'Startled' },
      { id: 'w_confused', hu: 'Zavart', en: 'Confused' },
      { id: 'w_amazed', hu: 'Csodálkozó', en: 'Amazed' },
      { id: 'w_eager', hu: 'Éber / kíváncsi', en: 'Eager' },
    ],
  },
  {
    id: 'w_disgusted',
    hu: 'Idegenkedő',
    en: 'Disgusted',
    color: 'var(--color-chart-cognitive)',
    mapped: 'em_overwhelmed',
    children: [
      { id: 'w_avoidant', hu: 'Elutasító / elzárkózó', en: 'Avoidant' },
      { id: 'w_uncomfortable', hu: 'Kényelmetlen', en: 'Uncomfortable' },
      { id: 'w_hesitant', hu: 'Hezitáló', en: 'Hesitant' },
      { id: 'w_repelled', hu: 'Szenzorosan zavaró', en: 'Sensory repulsion' },
    ],
  },
];

const WILLCOX_LABEL_BY_ID = new Map<string, { hu: string; en: string }>();
for (const core of WILLCOX_CORES) {
  WILLCOX_LABEL_BY_ID.set(core.id, { hu: core.hu, en: core.en });
  for (const sub of core.children) {
    WILLCOX_LABEL_BY_ID.set(sub.id, { hu: sub.hu, en: sub.en });
  }
}

export function getWillcoxFeelingLabel(id: string, lang: 'hu' | 'en'): string {
  const entry = WILLCOX_LABEL_BY_ID.get(id);
  if (!entry) return id;
  return lang === 'hu' ? entry.hu : entry.en;
}
