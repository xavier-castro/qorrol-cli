export type JsonSuccess<T> = {
  ok: true;
  command: string;
  data: T;
};

export type JsonError = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

export function jsonSuccess<T>(command: string, data: T): JsonSuccess<T> {
  return { ok: true, command, data };
}

export function jsonError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): JsonError {
  return {
    ok: false,
    error: details ? { code, message, details } : { code, message },
  };
}

export function emitJson(payload: unknown): void {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

type CommandNode = {
  opts?: () => { json?: boolean };
  parent?: CommandNode | null;
};

export function isJsonMode(
  options: { json?: boolean },
  cmd?: CommandNode | null,
): boolean {
  if (options.json) return true;
  let current: CommandNode | null | undefined = cmd;
  while (current) {
    if (typeof current.opts === "function" && current.opts().json) return true;
    current = current.parent;
  }
  return false;
}

export function emitSuccess<T>(
  json: boolean,
  command: string,
  data: T,
  human?: (data: T) => void,
): void {
  if (json) {
    emitJson(jsonSuccess(command, data));
    return;
  }
  human?.(data);
}

export function emitErrorAndExit(
  json: boolean,
  code: string,
  message: string,
  details?: Record<string, unknown>,
  human?: () => void,
): never {
  if (json) {
    emitJson(jsonError(code, message, details));
  } else if (human) {
    human();
  } else {
    console.error(message);
  }
  process.exit(1);
}
