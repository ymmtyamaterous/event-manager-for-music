import { Announcement, EventCard, OrganizerReservation, RegisterFormData, Reservation, UserType } from "@/types";

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

type EventStatus = "draft" | "published" | "cancelled";

type APIReservation = {
  id: string;
  event_id: string;
  user_id: string;
  reservation_number: string;
  status: "reserved" | "cancelled";
  reserved_at: string;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type APIReservationWithUser = APIReservation & {
  user_display_name: string;
  user_email: string;
};

type APIAnnouncement = {
  id: string;
  event_id: string;
  title: string;
  content: string;
  published_at: string;
  created_at: string;
  updated_at: string;
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

export async function listEvents(searchWord: string, organizerId?: string): Promise<EventCard[]> {
  const params = new URLSearchParams({ status: "published" });
  if (searchWord.trim()) {
    params.set("search", searchWord.trim());
  }
  if (organizerId?.trim()) {
    params.set("organizer_id", organizerId.trim());
  }

  const response = await request<APIEvent[]>(`/events?${params.toString()}`, {
    method: "GET",
  });

  return response.map(toEventCard);
}

export async function listOrganizerEvents(organizerId: string): Promise<EventCard[]> {
  const params = new URLSearchParams({ organizer_id: organizerId });
  const response = await request<APIEvent[]>(`/events?${params.toString()}`, {
    method: "GET",
  });
  return response.map(toEventCard);
}

type CreateEventInput = {
  title: string;
  description?: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  doorsOpenTime: string;
  startTime: string;
  endTime?: string;
  ticketPrice?: number;
  capacity?: number;
  status: "draft" | "published";
};

export async function createEvent(accessToken: string, input: CreateEventInput): Promise<EventCard> {
  const response = await requestAuth<APIEvent>("/events", accessToken, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      venue_name: input.venueName,
      venue_address: input.venueAddress,
      event_date: input.eventDate,
      doors_open_time: input.doorsOpenTime,
      start_time: input.startTime,
      end_time: input.endTime,
      ticket_price: input.ticketPrice,
      capacity: input.capacity,
      status: input.status,
    }),
  });

  return toEventCard(response);
}

type UpdateEventInput = Partial<{
  title: string;
  description: string;
  venueName: string;
  venueAddress: string;
  eventDate: string;
  doorsOpenTime: string;
  startTime: string;
  endTime: string;
  ticketPrice: number;
  capacity: number;
  status: EventStatus;
}>;

export async function updateEvent(eventId: string, accessToken: string, input: UpdateEventInput): Promise<EventCard> {
  const response = await requestAuth<APIEvent>(`/events/${eventId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title,
      description: input.description,
      venue_name: input.venueName,
      venue_address: input.venueAddress,
      event_date: input.eventDate,
      doors_open_time: input.doorsOpenTime,
      start_time: input.startTime,
      end_time: input.endTime,
      ticket_price: input.ticketPrice,
      capacity: input.capacity,
      status: input.status,
    }),
  });

  return toEventCard(response);
}

export async function deleteEvent(eventId: string, accessToken: string): Promise<void> {
  await requestAuthWithoutJson(`/events/${eventId}`, accessToken, {
    method: "DELETE",
  });
}

export async function getEvent(id: string): Promise<EventCard> {
  const response = await request<APIEvent>(`/events/${id}`, {
    method: "GET",
  });

  return toEventCard(response);
}

export async function createReservation(eventId: string, accessToken: string): Promise<Reservation> {
  const response = await requestAuth<APIReservation>(`/events/${eventId}/reservations`, accessToken, {
    method: "POST",
  });

  return toReservation(response);
}

export async function getMe(accessToken: string): Promise<APIUser> {
  return requestAuth<APIUser>("/users/me", accessToken, {
    method: "GET",
  });
}

type UpdateMeInput = {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  email?: string;
};

export async function updateMe(accessToken: string, input: UpdateMeInput): Promise<APIUser> {
  return requestAuth<APIUser>("/users/me", accessToken, {
    method: "PATCH",
    body: JSON.stringify({
      first_name: input.firstName,
      last_name: input.lastName,
      display_name: input.displayName,
      email: input.email,
    }),
  });
}

export async function listMyReservations(accessToken: string, status?: "reserved" | "cancelled"): Promise<Reservation[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }

  const query = params.toString();
  const path = query ? `/reservations/me?${query}` : "/reservations/me";

  const response = await requestAuth<APIReservation[]>(path, accessToken, {
    method: "GET",
  });

  return response.map(toReservation);
}

export async function cancelReservation(reservationId: string, accessToken: string): Promise<Reservation> {
  const response = await requestAuth<APIReservation>(`/reservations/${reservationId}/cancel`, accessToken, {
    method: "PATCH",
  });

  return toReservation(response);
}

export async function listEventReservations(
  eventId: string,
  accessToken: string,
  status?: "reserved" | "cancelled",
  searchWord?: string,
): Promise<OrganizerReservation[]> {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (searchWord?.trim()) {
    params.set("search", searchWord.trim());
  }

  const query = params.toString();
  const path = query ? `/events/${eventId}/reservations?${query}` : `/events/${eventId}/reservations`;

  const response = await requestAuth<APIReservationWithUser[]>(path, accessToken, {
    method: "GET",
  });

  return response.map(toOrganizerReservation);
}

export async function downloadEventReservationsCsv(
  eventId: string,
  accessToken: string,
  status?: "reserved" | "cancelled",
  searchWord?: string,
): Promise<Blob> {
  const params = new URLSearchParams({ format: "csv" });
  if (status) {
    params.set("status", status);
  }
  if (searchWord?.trim()) {
    params.set("search", searchWord.trim());
  }

  const response = await requestAuthRaw(`/events/${eventId}/reservations?${params.toString()}`, accessToken, {
    method: "GET",
    headers: {
      Accept: "text/csv",
    },
  });

  return response.blob();
}

type AnnouncementInput = {
  title: string;
  content: string;
};

export async function listEventAnnouncements(eventId: string): Promise<Announcement[]> {
  const response = await request<APIAnnouncement[]>(`/events/${eventId}/announcements`, {
    method: "GET",
  });

  return response.map(toAnnouncement);
}

export async function createEventAnnouncement(
  eventId: string,
  accessToken: string,
  input: AnnouncementInput,
): Promise<Announcement> {
  const response = await requestAuth<APIAnnouncement>(`/events/${eventId}/announcements`, accessToken, {
    method: "POST",
    body: JSON.stringify({
      title: input.title,
      content: input.content,
    }),
  });

  return toAnnouncement(response);
}

export async function updateEventAnnouncement(
  eventId: string,
  announcementId: string,
  accessToken: string,
  input: AnnouncementInput,
): Promise<Announcement> {
  const response = await requestAuth<APIAnnouncement>(`/events/${eventId}/announcements/${announcementId}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify({
      title: input.title,
      content: input.content,
    }),
  });

  return toAnnouncement(response);
}

export async function deleteEventAnnouncement(eventId: string, announcementId: string, accessToken: string): Promise<void> {
  await requestAuthWithoutJson(`/events/${eventId}/announcements/${announcementId}`, accessToken, {
    method: "DELETE",
  });
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

function toReservation(reservation: APIReservation): Reservation {
  return {
    id: reservation.id,
    eventId: reservation.event_id,
    userId: reservation.user_id,
    reservationNumber: reservation.reservation_number,
    status: reservation.status,
    reservedAt: reservation.reserved_at,
    cancelledAt: reservation.cancelled_at,
    createdAt: reservation.created_at,
    updatedAt: reservation.updated_at,
  };
}

function toOrganizerReservation(reservation: APIReservationWithUser): OrganizerReservation {
  return {
    ...toReservation(reservation),
    userDisplayName: reservation.user_display_name,
    userEmail: reservation.user_email,
  };
}

function toAnnouncement(announcement: APIAnnouncement): Announcement {
  return {
    id: announcement.id,
    eventId: announcement.event_id,
    title: announcement.title,
    content: announcement.content,
    publishedAt: announcement.published_at,
    createdAt: announcement.created_at,
    updatedAt: announcement.updated_at,
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

async function requestAuth<T>(path: string, accessToken: string, init: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });
}

async function requestAuthWithoutJson(path: string, accessToken: string, init: RequestInit): Promise<void> {
  const response = await requestAuthRaw(path, accessToken, init);

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as APIErrorResponse | null;
    throw new Error(data?.error ?? "APIリクエストに失敗しました");
  }
}

async function requestAuthRaw(path: string, accessToken: string, init: RequestInit): Promise<Response> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as APIErrorResponse | null;
    throw new Error(data?.error ?? "APIリクエストに失敗しました");
  }

  return response;
}
