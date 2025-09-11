declare module '@modelcontextprotocol/sdk/server/mcp' {
  export class McpServer {
    constructor(info: { name: string; version: string }, options?: any);
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    registerTool(
      name: string,
      config: {
        title?: string;
        description?: string;
        inputSchema?: any;
        outputSchema?: any;
        annotations?: Record<string, unknown>;
      },
      cb: (...args: any[]) => any | Promise<any>
    ): any;
  }
}

declare module '@modelcontextprotocol/sdk/server/mcp.js' {
  export class McpServer {
    constructor(info: { name: string; version: string }, options?: any);
    connect(transport: any): Promise<void>;
    close(): Promise<void>;
    registerTool(
      name: string,
      config: {
        title?: string;
        description?: string;
        inputSchema?: any;
        outputSchema?: any;
        annotations?: Record<string, unknown>;
      },
      cb: (...args: any[]) => any | Promise<any>
    ): any;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio' {
  export class StdioServerTransport {
    constructor(stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream);
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor(stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream);
  }
}
