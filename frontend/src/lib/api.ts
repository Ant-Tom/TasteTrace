import { useAuthStore } from "@/store/authStore";
import type { AuthResponse, User } from "@/types/user";
import type { Establishment } from "@/types/establishment";
import type { Review } from "@/types/review";

export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
  return raw.replace(/\/api\/?$/, "");
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      if (body.detail) message = body.detail;
      else if (body.title) message = body.title;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export async function fetchEstablishments(): Promise<Establishment[]> {
  return apiFetch("/api/establishments");
}

export async function fetchEstablishment(id: number): Promise<Establishment> {
  return apiFetch(`/api/establishments/${id}`);
}

export async function register(payload: {
  email: string;
  password: string;
  displayName: string;
  website?: string;
}): Promise<AuthResponse> {
  return apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function login(payload: { email: string; password: string }): Promise<AuthResponse> {
  return apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchMe(): Promise<User> {
  return apiFetch("/api/auth/me");
}

export async function fetchReviews(establishmentId: number): Promise<Review[]> {
  return apiFetch(`/api/establishments/${establishmentId}/reviews`);
}

export async function createReview(
  establishmentId: number,
  payload: { rating: number; text: string }
): Promise<Review> {
  return apiFetch(`/api/establishments/${establishmentId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateReview(
  reviewId: number,
  payload: { rating: number; text: string }
): Promise<Review> {
  return apiFetch(`/api/reviews/${reviewId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}
