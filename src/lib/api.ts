import { ATTENDEE_HEADER, type ApiError } from "../../shared/types";
import { getAttendeeId } from "./attendee";

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiError | null,
  ) {
    super(body?.error ?? `Request failed (${status})`);
  }
}

/** POST attendee data in the body, never the URL. */
export async function post<T>(path: string, body: unknown, init: RequestInit = {}): Promise<T> {
  return request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) });
}

export async function get<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, { ...init, method: "GET" });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      [ATTENDEE_HEADER]: getAttendeeId(),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiFailure(res.status, body);
  }
  return (await res.json()) as T;
}
