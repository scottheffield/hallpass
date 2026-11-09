import type { CheckInRequest, CheckInResponse, PlanResponse, ProfileResponse } from "../../shared/api";
import { ATTENDEE_HEADER, type ApiError } from "../../shared/types";
import { getAttendeeId } from "./attendee";
import { demoNowHeader } from "./clock";
import {
  cachePlanResponse,
  cacheProfileResponse,
  isCheckInRequest,
  isNetworkFailure,
  isOnline,
  offlineCheckInResponse,
  readCachedPlan,
  readCachedProfile,
  flushCheckInQueueSoon,
  setCheckInSender,
  upsertQueuedCheckIn,
} from "./offline";

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
  if (path === "/api/checkin" && isCheckInRequest(body)) {
    if (!isOnline()) {
      const queued = upsertQueuedCheckIn(body);
      return offlineCheckInResponse(queued.body) as T;
    }
    try {
      const response = await deliverCheckIn(body);
      flushCheckInQueueSoon();
      return response as T;
    } catch (err) {
      if (isNetworkFailure(err)) {
        const queued = upsertQueuedCheckIn(body);
        return offlineCheckInResponse(queued.body) as T;
      }
      throw err;
    }
  }

  if (!isOnline()) {
    if (path === "/api/plan/get") {
      const cached = readCachedPlan();
      if (cached) return cached.body as T;
      throw new ApiFailure(503, { error: "You're offline and no plan is saved on this device.", code: "upstream" });
    }
    if (path === "/api/profile/get") {
      const cached = readCachedProfile();
      if (cached) return cached.body as T;
      throw new ApiFailure(503, { error: "You're offline and no goals are saved on this device.", code: "upstream" });
    }
  }

  const result = await request<T>(path, { ...init, method: "POST", body: JSON.stringify(body) });
  if (path === "/api/plan/get") cachePlanResponse(result as PlanResponse);
  if (path === "/api/profile/get") cacheProfileResponse(result as ProfileResponse);
  flushCheckInQueueSoon();
  return result;
}

export async function get<T>(path: string, init: RequestInit = {}): Promise<T> {
  const result = await request<T>(path, { ...init, method: "GET" });
  flushCheckInQueueSoon();
  return result;
}

async function deliverCheckIn(body: CheckInRequest): Promise<CheckInResponse> {
  const result = await request<CheckInResponse>("/api/checkin", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return result;
}

setCheckInSender(async (body) => {
  await deliverCheckIn(body);
});

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const demo = demoNowHeader();
  const res = await fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      [ATTENDEE_HEADER]: getAttendeeId(),
      ...(demo ? { [demo.name]: demo.value } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiFailure(res.status, body);
  }
  return (await res.json()) as T;
}
