import OASNormalize from "oas-normalize";
import Oas from "oas";
import { OASDocument } from "oas/types";

// Load OpenAPI file
export async function loadOpenAPIFile(filePath: string) {
  if (
    !(
      filePath.endsWith(".yaml") ||
      filePath.endsWith(".yml") ||
      filePath.endsWith(".json")
    )
  ) {
    throw new Error("Unsupported file format. Use YAML or JSON.");
  }
  const oas = await new OASNormalize(
    filePath,
    { enablePaths: true }
  ).dereference();

  return new Oas(oas as OASDocument);
}

// Extract GET operations from OpenAPI file
export function extractReadOperations(openAPI: Oas) {
  return Object.values(openAPI.getPaths())
    .filter((op) => op.get)
    .map((op) => op.get);
}

// Extract non-GET operations from OpenAPI file
export function extractWriteOperations(openAPI: Oas) {
  const paths = openAPI.getPaths();
  return Object.values(paths)
    .flatMap((path) => {
      const operations = [];
      if (path.post) operations.push(path.post);
      if (path.put) operations.push(path.put);
      if (path.patch) operations.push(path.patch);
      if (path.delete) operations.push(path.delete);
      return operations;
    });
}