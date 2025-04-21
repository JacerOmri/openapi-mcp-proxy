import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export class TransportStore {
  private transports: Record<string, SSEServerTransport> = {};

  public store(sessionId: string, transport: SSEServerTransport): void {
    this.transports[sessionId] = transport;
  }

  public get(sessionId: string): SSEServerTransport | undefined {
    return this.transports[sessionId];
  }

  public remove(sessionId: string): void {
    delete this.transports[sessionId];
  }

  public clear(): void {
    for (const sessionId in this.transports) {
      this.transports[sessionId].close();
    }
    Object.keys(this.transports).forEach((key) => delete this.transports[key]);
  }
}