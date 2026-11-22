import { describe, expect, it } from 'vitest';
import {
  createPinConfig,
  decryptJSON,
  encryptJSON,
  generateSaltBase64,
  hashPin,
  verifyPinAndDeriveKey,
} from '@/services/crypto';

describe('WebCrypto PIN & AES-GCM local storage encryption', () => {
  it('creates a v2 verifier without storing the raw PBKDF2 key in pinHash and round-trips accurately', async () => {
    const sample = {
      meds: [{ name: 'Szertralin', dose: '50 mg' }],
      note: 'Nyugodt reggel',
    };

    const { config, key } = await createPinConfig('4829');
    expect(config.version).toBe(2);
    expect(config.verifier).toBeDefined();
    expect(config.pinHash).toBeUndefined();

    const encrypted = await encryptJSON(sample, key);
    expect(encrypted.cipher).not.toContain('Szertralin');
    expect(encrypted.iv.length).toBeGreaterThan(8);

    const unlockedKey = await verifyPinAndDeriveKey('4829', config);
    expect(unlockedKey).not.toBeNull();

    const decrypted = await decryptJSON<typeof sample>(encrypted, unlockedKey!);
    expect(decrypted).toEqual(sample);
  });

  it('rejects an incorrect PIN, tampered verifier, and cannot decrypt with another key', async () => {
    const { config, key } = await createPinConfig('1234');
    const encrypted = await encryptJSON({ secret: 'medical-log' }, key);

    const wrongKey = await verifyPinAndDeriveKey('9999', config);
    expect(wrongKey).toBeNull();

    const tampered = {
      ...config,
      verifier: { ...config.verifier!, cipher: encrypted.cipher },
    };
    const tamperedKey = await verifyPinAndDeriveKey('1234', tampered);
    expect(tamperedKey).toBeNull();

    const another = await createPinConfig('9999');
    await expect(decryptJSON(encrypted, another.key)).rejects.toThrow();
  });

  it('remains backwards-compatible with legacy v1 pinHash configs', async () => {
    const salt = generateSaltBase64();
    const legacyHash = await hashPin('5678', salt, 10_000);
    const legacyCfg = { salt, pinHash: legacyHash, iterations: 10_000 };

    expect(await verifyPinAndDeriveKey('0000', legacyCfg)).toBeNull();
    expect(await verifyPinAndDeriveKey('5678', legacyCfg)).not.toBeNull();
  });
});
