export { scaffoldFromTemplate } from "./scaffoldFromTemplate.js";
export type {
  ScaffoldInput,
  ScaffoldProgress,
  ScaffoldResult,
  ScaffoldFailureCode,
  TemplateMaterializer,
} from "./types.js";
export type { TemplateRegistry } from "../registry/types.js";
export {
  createInlineRegistry,
  inlineRegistry,
} from "../registry/inline-registry.js";