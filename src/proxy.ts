import { Operation } from "oas/operation";

//Proxy MCP requests to the API server
async function proxyRequest(
  apiServerUrl: string,
  path: string,
  parameters: Record<string, string>,
): Promise<unknown> {
  const queryString = new URLSearchParams(parameters).toString();
  const targetUrl = `${apiServerUrl}${path}${queryString ? `?${queryString}` : ""}`;
  const headers = new Headers({
    "content-type": "application/json",
    "accept": "application/json",
  });
  const response = await fetch(targetUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch from API server: ${response.statusText}`);
  }

  return await response.json();
}

export function mapOperationToProxy(apiServerUrl: string, operation: Operation) {
  return async (params: Record<string, string>) => {
    const pathParams = operation.getParameters().filter((p) => p.in === "path")
    const path = operation.path.replace(
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
    const queryParams = operation.getParameters().filter((p) => p.in === "query")
      .reduce((acc, param) => {
        const paramValue = params[param.name];
        if (paramValue === undefined) {
          throw new Error(`Missing query parameter: ${param.name}`);
        }
        acc[param.name] = paramValue;
        return acc;
      }, {} as Record<string, string>);
    const response = await proxyRequest(
      apiServerUrl,
      path,
      queryParams,
    );
    return response;
  }
}