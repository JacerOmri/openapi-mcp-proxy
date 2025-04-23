import { JsonSchema, jsonSchemaToZod } from "@n8n/json-schema-to-zod";
import { Operation } from "oas/operation";
import { MediaTypeObject } from "oas/types";
import { createLogger } from './logger';

const logger = createLogger('express');

type HttpMethods = 'delete' | 'get' | 'head' | 'options' | 'patch' | 'post' | 'put' | 'trace';

//Proxy MCP requests to the API server
async function proxyRequest({
  method,
  apiServerUrl,
  path,
  queryParams = {},
  additionalHeaders = {},
  body
}: {
  method: HttpMethods;
  apiServerUrl: string;
  path: string;
  queryParams?: Record<string, string>;
  additionalHeaders?: Record<string, string>;
  body?: BodyInit;
}): Promise<unknown> {
  const queryString = new URLSearchParams(queryParams).toString();
  const targetUrl = `${apiServerUrl}${path}${queryString ? `?${queryString}` : ""}`;
  const headers = new Headers({
    "content-type": "application/json",
    "accept": "application/json",
    ...additionalHeaders,
  });
  const response = await fetch(targetUrl, { headers, method, ...(body ? { body } : {}) });
  if (!response.ok) {
    logger.error({
      status: response.status,
      statusText: response.statusText,
      response: await response.text(),
      headers: Object.fromEntries(headers.entries()),
      url: targetUrl,
      method,
      body,
    }, `Failed to fetch from API server:`);
    throw new Error(`Failed to fetch from API server: ${response.statusText}`);
  }
  return await response.json();
}

export function mapOperationToProxy(apiServerUrl: string, operation: Operation) {
  return async (params: Record<string, string>) => {
    const method = operation.method
    const path = parsePathWithParams(operation, params);
    const queryParams = parseQueryParams(operation, params);
    const additionalHeaders = parseHeaders(operation, params);
    let body = params.body;

    if (method !== "get" && method !== "delete") {
      const parsedBody = parseBodyParams(operation, params);
      if (parsedBody?.success && Object.keys(parsedBody.data).length > 0) {
        body = parsedBody.data;
      }
    }

    const response = await proxyRequest({
      method,
      apiServerUrl,
      path,
      queryParams,
      additionalHeaders,
      body
    });
    return response;
  }
}

function parsePathWithParams(operation: Operation, params: Record<string, string>) {
  const pathParams = operation.getParameters().filter((p) => p.in === "path")

  return operation.path.replace(
    /{([^}]+)}/g,
    (param) => {
      const paramName = param.replace(/{|}/g, "");
      if (!pathParams.some((p) => p.name === paramName)) {
        throw new Error(`Invalid path parameter: ${paramName}`);
      }
      const paramValue = params[paramName];
      if (paramValue === undefined) {
        throw new Error(`Missing path parameter: ${paramName}`);
      }
      return encodeURIComponent(paramValue);
    }
  );
}

function parseQueryParams(operation: Operation, params: Record<string, string>) {
  return operation.getParameters().filter((p) => p.in === "query")
    .reduce((acc, param) => {
      const paramValue = params[param.name];
      if (paramValue === undefined) {
        throw new Error(`Missing query parameter: ${param.name}`);
      }
      acc[param.name] = paramValue;
      return acc;
    }, {} as Record<string, string>);
}

function parseBodyParams(operation: Operation, params: Record<string, string>) {
  const bodyParam = operation.getRequestBody()
  if (bodyParam) {
    const bodySchema: MediaTypeObject = Array.isArray(bodyParam) ? bodyParam[1] : bodyParam;
    if (bodySchema?.schema) {
      const schema = jsonSchemaToZod(bodySchema.schema as unknown as JsonSchema);
      return schema.safeParse(params.body);
    }
  }
  return null
}

function parseHeaders(operation: Operation, params: Record<string, string>) {
  const headerParams = operation.getParameters().filter((p) => p.in === "header")
    .reduce((acc, param) => {
      const paramValue = params[param.name];
      if (paramValue === undefined) {
        throw new Error(`Missing query parameter: ${param.name}`);
      }
      acc[param.name] = paramValue;
      return acc;
    }, {} as Record<string, string>);

  const operationHeaders = operation.getHeaders().request
    .reduce((acc, headerName) => {
      const paramValue = params[headerName];
      if (paramValue) {
        acc[headerName] = paramValue;
      }
      return acc;
    }, {} as Record<string, string>);

  return { ...headerParams, ...operationHeaders };
}
