import Dexie, { type Table } from 'dexie';
import {
  decryptJSON,
  encryptJSON,
  type EncryptedPayload,
  type PinLockConfig,
} from '@/services/crypto';
import type {
  CommunicationProfile,
  ObservableSymptomEntry,
  SeroSafeState,
  UserMedication,
} from '@/types/serosafe';

interface KVRecord {
  id: string;
  value: unknown;
}

export interface EmergencySnapshot {
  lang: 'hu' | 'en';
  medications: UserMedication[];
  communicationProfile: CommunicationProfile;
  latestSymptom?: ObservableSymptomEntry;
  updatedAtIso: string;
}

class SeroSafeDatabase extends Dexie {
  kv!: Table<KVRecord, string>;

  constructor() {
    super('SeroSafeLocalDB');
    this.version(1).stores({
      kv: 'id',
    });
  }
}

const db = new SeroSafeDatabase();

const KEY_PLAIN_STATE = 'app_state_v1';
const KEY_ENCRYPTED_STATE = 'encrypted_app_state_v1';
const KEY_PIN_CONFIG = 'pin_config_v1';
const KEY_EMERGENCY_SNAPSHOT = 'emergency_snapshot_v1';

export function buildEmergencySnapshot(state: SeroSafeState): EmergencySnapshot {
  const latestWithSymptom = state.dailyLogs
    .filter((l) => Boolean(l.symptomEntry))
    .sort((a, b) => b.date.localeCompare(a.date))[0]?.symptomEntry;

  return {
    lang: state.settings.lang,
    medications: state.medications,
    communicationProfile: state.communicationProfile,
    latestSymptom: latestWithSymptom,
    updatedAtIso: new Date().toISOString(),
  };
}

export async function getPinConfig(): Promise<PinLockConfig | null> {
  try {
    const rec = await db.kv.get(KEY_PIN_CONFIG);
    return (rec?.value as PinLockConfig) ?? null;
  } catch {
    return null;
  }
}

export async function getEmergencySnapshot(): Promise<EmergencySnapshot | null> {
  try {
    const rec = await db.kv.get(KEY_EMERGENCY_SNAPSHOT);
    return (rec?.value as EmergencySnapshot) ?? null;
  } catch {
    return null;
  }
}

export async function loadPlainState(): Promise<SeroSafeState | null> {
  try {
    const rec = await db.kv.get(KEY_PLAIN_STATE);
    return (rec?.value as SeroSafeState) ?? null;
  } catch {
    return null;
  }
}

export async function loadEncryptedState(
  key: CryptoKey,
): Promise<SeroSafeState | null> {
  const rec = await db.kv.get(KEY_ENCRYPTED_STATE);
  if (!rec?.value) return null;
  return decryptJSON<SeroSafeState>(rec.value as EncryptedPayload, key);
}

export async function saveAppState(
  state: SeroSafeState,
  encryptionKey: CryptoKey | null,
): Promise<void> {
  if (encryptionKey && state.settings.pinEnabled) {
    const encrypted = await encryptJSON(state, encryptionKey);
    await db.kv.put({ id: KEY_ENCRYPTED_STATE, value: encrypted });
    await db.kv.delete(KEY_PLAIN_STATE);
  } else {
    await db.kv.put({ id: KEY_PLAIN_STATE, value: state });
    await db.kv.delete(KEY_ENCRYPTED_STATE);
  }

  if (state.settings.allowEmergencyWithoutPin) {
    await db.kv.put({
      id: KEY_EMERGENCY_SNAPSHOT,
      value: buildEmergencySnapshot(state),
    });
  } else {
    await db.kv.delete(KEY_EMERGENCY_SNAPSHOT);
  }
}

export async function enablePinProtection(
  state: SeroSafeState,
  pinConfig: PinLockConfig,
  key: CryptoKey,
): Promise<void> {
  const nextState: SeroSafeState = {
    ...state,
    settings: { ...state.settings, pinEnabled: true },
  };
  await db.kv.put({ id: KEY_PIN_CONFIG, value: pinConfig });
  await saveAppState(nextState, key);
}

export async function disablePinProtection(
  state: SeroSafeState,
): Promise<void> {
  const nextState: SeroSafeState = {
    ...state,
    settings: { ...state.settings, pinEnabled: false },
  };
  await db.kv.delete(KEY_PIN_CONFIG);
  await db.kv.delete(KEY_ENCRYPTED_STATE);
  await saveAppState(nextState, null);
}

export async function wipeAllLocalData(): Promise<void> {
  await db.kv.clear();
}
