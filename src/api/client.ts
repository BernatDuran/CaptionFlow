export class ApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  json?: unknown;
  timeoutMs?: number;
};

function createSignal(input: { signal?: AbortSignal | null; timeoutMs?: number }) {
  if (!input.signal && !input.timeoutMs) {
    return { signal: undefined, cleanup: () => undefined };
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function abortFromParent() {
    controller.abort(input.signal?.reason);
  }

  if (input.signal) {
    if (input.signal.aborted) {
      abortFromParent();
    } else {
      input.signal.addEventListener("abort", abortFromParent, { once: true });
    }
  }

  if (input.timeoutMs) {
    timeout = setTimeout(() => {
      controller.abort(new DOMException("Request timed out", "TimeoutError"));
    }, input.timeoutMs);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeout) clearTimeout(timeout);
      input.signal?.removeEventListener("abort", abortFromParent);
    }
  };
}

function normalizeAbortError(error: unknown) {
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new ApiError("La solicitud ha tardado demasiado o ha sido cancelada.", { code: error.name });
  }

  if (error instanceof Error && error.name === "AbortError") {
    return new ApiError("La solicitud ha sido cancelada.", { code: "AbortError" });
  }

  return error;
}

export async function apiFetch<T>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, timeoutMs, signal, headers, body, ...init } = options;
  const mergedHeaders = new Headers(headers);
  const requestBody = json !== undefined ? JSON.stringify(json) : body;

  if (json !== undefined && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const signalState = createSignal({ signal, timeoutMs });

  try {
    const response = await fetch(url, {
      ...init,
      body: requestBody,
      headers: mergedHeaders,
      signal: signalState.signal
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(payload?.error?.message || "No se pudo completar la operacion.", {
        code: payload?.error?.code,
        status: response.status
      });
    }

    return payload as T;
  } catch (error) {
    throw normalizeAbortError(error);
  } finally {
    signalState.cleanup();
  }
}
