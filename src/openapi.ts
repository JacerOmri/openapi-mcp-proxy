
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
export function extractGetOperations(openAPI: Oas) {
  return Object.values(openAPI.getPaths())
    .filter((op) => op.get)
    .map((op) => op.get);
}