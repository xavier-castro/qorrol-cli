import type { Template } from "../types/index.js";
import type { TemplateRegistry } from "./types.js";

/** Curated list of templates the CLI ships with. The single source of truth. */
const DEFAULT_TEMPLATES: readonly Template[] = [
  {
    name: "saas-kit",
    description:
      "A complete SaaS starter kit with authentication, billing, and more",
    repo: "https://github.com/xavier-castro/saas-kit.git",
    branch: "main",
    category: "SaaS",
  },
];

function assertUnique(templates: readonly Template[]): void {
  const seen = new Set<string>();
  for (const t of templates) {
    if (seen.has(t.name)) {
      throw new Error(
        `InlineRegistry: duplicate template name "${t.name}". Template names must be unique.`,
      );
    }
    seen.add(t.name);
  }
}

/**
 * Build an InlineRegistry from an explicit list. Useful for tests that need
 * a custom set, and for the production default which wraps DEFAULT_TEMPLATES.
 *
 * Throws on construction if two entries share a name — the registry owns the
 * uniqueness invariant rather than letting it drift at lookup time.
 */
export function createInlineRegistry(
  templates: readonly Template[] = DEFAULT_TEMPLATES,
): TemplateRegistry {
  assertUnique(templates);
  const byName = new Map<string, Template>();
  for (const t of templates) {
    byName.set(t.name, t);
  }
  return {
    list: () => templates,
    resolve: (name) => byName.get(name),
  };
}

/** The default InlineRegistry used by the CLI. */
export const inlineRegistry: TemplateRegistry = createInlineRegistry();
