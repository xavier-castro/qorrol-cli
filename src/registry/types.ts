import type { Template } from "../types/index.js";

/**
 * A read-only source of Templates. Implementations may enumerate from an
 * in-code list (InlineRegistry), a local directory (LocalPathRegistry —
 * future), a network registry (NpmRegistry — future), etc.
 *
 * Lookup is by `Template.name`, the same string the CLI accepts
 * (`qorrol create <name>`). The name is the public identifier.
 */
export interface TemplateRegistry {
  /** Every Template known to this registry, in declaration order. */
  list(): readonly Template[];
  /** Find a Template by its public name; `undefined` if absent. */
  resolve(name: string): Template | undefined;
}
