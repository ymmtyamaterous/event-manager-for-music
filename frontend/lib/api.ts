import { EventCard, RegisterFormData, UserType } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000/api/v1";

type APIErrorResponse = {
  error: string;
};

export type APIUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  display_name: string;
  user_type: UserType;
  profile_image_path: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthResponse = {
  access_token: string;
  refresh_token: string;
  user: APIUser;
};

type APIEvent = {
  id: string;
  title: string;
  description: string | null;
  venue_name: string;
  event_date: string;
  ticket_price: number | null;
  capacity: number | null;
  status: "draft" | "published" | "cancelled";
};

type LoginInput = {
  email: string;
  password: string;
};

export async function login(input: LoginInput): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function register(input: RegisterFormData): Promise<AuthResponse> {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.displayName,
      user_type: input.userType,
    }),
  });
}

export async function listEvents(searchWord: string): Promise<EventCard[]> {
  const params = new URLSearchParams({ status: "published" });
  if (searchWord.trim()) {
    params.set("search", searchWord.trim());
  }

  const response = await request<APIEvent[]>(`/events?${params.toString()}`, {
    method: "GET",
  });

  return response.map(toEventCard);
}

export async function getEvent(id: string): Promise<EventCard> {
  const response = await request<APIEvent>(`/events/${id}`, {
    method: "GET",
  });

  return toEventCard(response);
}

function toEventCard(event: APIEvent): EventCard {
  return {
    id: event.id,
    title: event.title,
    description: event.description ?? "",
    venueName: event.venue_name,
    eventDate: event.event_date,
    ticketPrice: event.ticket_price,
    capacity: event.capacity,
    status: event.status,
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as APIErrorResponse | null;
    throw new Error(data?.error ?? "APIリクエストに失敗しました");
  }

  return (await response.json()) as T;
}
