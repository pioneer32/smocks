import { ICollectionMapper } from './SmocksServer';

class InMemoryCollectionMapper implements ICollectionMapper {
  private storage = new Map<string, string>();
  async getCollectionName(forSessionId: string): Promise<string | undefined> {
    return this.storage.get(forSessionId);
  }
  async setCollectionName(forSessionId: string, collectionName: string): Promise<void> {
    this.storage.set(forSessionId, collectionName);
  }
}

export default InMemoryCollectionMapper;
