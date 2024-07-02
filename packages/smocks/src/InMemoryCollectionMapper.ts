import { ICollectionMapper } from './SmocksServer.js';

class InMemoryCollectionMapper implements ICollectionMapper {
  private storage = new Map<string, string>();
  async getCollectionName(forSessionId: string): Promise<string | undefined> {
    return this.storage.get(`${forSessionId}:collection`);
  }
  async setCollectionName(forSessionId: string, collectionName: string): Promise<void> {
    this.storage.set(`${forSessionId}:collection`, collectionName);
  }

  async getOverrides(forSessionId: string): Promise<Record<string, string> | undefined> {
    const overrides = this.storage.get(`${forSessionId}:overrides`);
    return overrides ? JSON.parse(overrides) : undefined;
  }

  async setOverrides(forSessionId: string, overrides: Record<string, string | undefined>): Promise<void> {
    this.storage.set(`${forSessionId}:overrides`, JSON.stringify(overrides));
  }
}

export default InMemoryCollectionMapper;
