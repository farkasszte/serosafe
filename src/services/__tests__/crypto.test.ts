import { describe, expect, it } from 'vitest';
import {
  createPinConfig,
  decryptJSON,
  encryptJSON,
  verifyPinAndDeriveKey,
} from '@/services/crypto';

describe('WebCrypto PIN & AES-GCM local storage encryption', () => {
  it('encrypts and decrypts state accurately with the correct PIN', async () => {
    const sample = {
      meds: [{ name: 'Szertralin', dose: '50 mg' }],
      note: 'Nyugodt reggel',
    };

    const { config, key } = await createPinConfig('4829');
    const encrypted = await encryptJSON(sample, key);

    expect(encrypted.cipher).not.toContain('Szertralin');
    expect(encrypted.iv.length).toBeGreaterThan(8);

    const unlockedKey = await verifyPinAndDeriveKey('4829', config);
    expect(unlockedKey).not.toBeNull();

    const decrypted = await decryptJSON<typeof sample>(encrypted, unlockedKey!);
    expect(decrypted).toEqual(sample);
  });

  it('rejects an incorrect PIN and cannot decrypt ciphertext with another key', async () => {
    const { config, key } = await createPinConfig('1234');
    const encrypted = await encryptJSON({ secret: 'medical-log' }, key);

    const wrongKey = await verifyPinAndDeriveKey('9999', config);
    expect(wrongKey).toBeNull();

    const another = await createPinConfig('9999');
    await expect(decryptJSON(encrypted, another.key)).rejects.toThrow();
  });
});
