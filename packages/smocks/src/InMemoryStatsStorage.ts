import { IMemoryStatsStorage } from './SmocksServer';

class InMemoryStatsStorage implements IMemoryStatsStorage {
  private storage = new Map<string, string>();

  async getValue(key: string): Promise<string | undefined> {
    return this.storage.get(`val:${key}`);
  }

  async removeValue(key: string): Promise<void> {
    this.storage.delete(`val:${key}`);
  }

  async setValue(key: string, value: string): Promise<void> {
    this.storage.set(`val:${key}`, value);
  }

  async appendCollection(key: string, value: string): Promise<void> {
    const rawKey = `col:${key}`;
    this.storage.set(rawKey, JSON.stringify([...JSON.parse(this.storage.get(rawKey) || '[]'), value]));
  }

  async getCollection(key: string): Promise<string[]> {
    return JSON.parse(this.storage.get(`col:${key}`) || '[]');
  }

  async removeCollection(key: string): Promise<void> {
    this.storage.delete(`col:${key}`);
  }
}

export default InMemoryStatsStorage;
