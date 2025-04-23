import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Operation } from "oas/operation";
import Zod, { ZodRawShape } from "zod";
import { mapOperationToProxy } from "./proxy";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { MediaTypeObject } from "oas/types";
import { JsonSchema, jsonSchemaToZod } from "@n8n/json-schema-to-zod";

function mapOperationToMcp(
  operation: Operation,
): [string, string, ZodRawShape] {
  const parameters = operation.getParameters()
    .reduce((acc, param) => ({
      ...acc,
      [param.name]: jsonSchemaToZod({ ...param, ...param?.schema } as unknown as JsonSchema),
    }), {} as ZodRawShape)

  const bodyParam = operation.getRequestBody()
  if (bodyParam) {
    const bodySchema: MediaTypeObject = Array.isArray(bodyParam) ? bodyParam[1] : bodyParam;
    if (bodySchema?.schema) {
      parameters.body = jsonSchemaToZod({ ...bodySchema, ...bodySchema?.schema } as unknown as JsonSchema);
    }
  }

  const requestHeaders = operation.getHeaders().request
    .reduce((acc, param) => ({
      ...acc,
      [param]: Zod.string().optional(),
    }), {} as ZodRawShape)

  parameters.headers = Zod.object(requestHeaders).optional();

  return [
    operation.getOperationId(),
    operation.getDescription(),
    parameters
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
      const proxyOperation = mapOperationToProxy(apiServerUrl, operation);

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
              { type: "text", text: JSON.stringify(await proxyOperation(params)) }
            ]
          }
        }
      );
    });

  return server;
}