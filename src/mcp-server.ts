import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { jsonSchemaToZod } from "@n8n/json-schema-to-zod";
import { Operation } from "oas/operation";
import { ZodRawShape } from "zod";
import { mapOperationToProxy } from "./proxy";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

function mapOperationToMcp(
  operation: Operation,
): [string, string, ZodRawShape] {
  return [
    operation.getOperationId(),
    operation.getDescription(),
    operation.getParameters().reduce((acc, param) => ({
      ...acc,
      [param.name]: jsonSchemaToZod(param),
    }), {}),
  ];
}

// Spin up MCP server
export function createMCPServer(
  apiServerUrl: string,
  operations: Operation[],
) {
  const server = new McpServer({
    name: "MCP Server",
    version: "1.0.0",
  }, { capabilities: { logging: {} } });

  operations
    .forEach((operation) => {
      const [operationId, description, parameters] = mapOperationToMcp(operation);
      server.tool(
        operationId,
        description,
        parameters,
        async (params, { sendNotification }): Promise<CallToolResult> => {
          await sendNotification({
            method: "notifications/message",
            params: {
              level: "info",
              data: `calling ${operationId} with params: ${JSON.stringify(params)}`,
            }
          });
          return {
            content: [
              { type: "text", text: JSON.stringify(await mapOperationToProxy(apiServerUrl, operation)(params)) }
            ]
          }
        }
      );
    });

  return server;
}