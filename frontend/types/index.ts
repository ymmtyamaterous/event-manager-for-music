export type UserType = "admin" | "organizer" | "performer" | "audience";

export type EventStatus = "draft" | "published" | "cancelled";

export type EventCard = {
  id: string;
  title: string;
  description: string;
  venueName: string;
  eventDate: string;
  ticketPrice: number | null;
  capacity: number | null;
  status: EventStatus;
};

export type LoginFormData = {
  email: string;
  password: string;
};

export type RegisterFormData = {
  userType: Exclude<UserType, "admin">;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
};

export type ReservationStatus = "reserved" | "cancelled";

export type Reservation = {
  id: string;
  eventId: string;
  userId: string;
  reservationNumber: string;
  status: ReservationStatus;
  reservedAt: string;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizerReservation = Reservation & {
  userDisplayName: string;
  userEmail: string;
};

export type Announcement = {
  id: string;
  eventId: string;
  title: string;
  content: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type EntryStatus = "pending" | "approved" | "rejected";

export type EventEntry = {
  id: string;
  eventId: string;
  bandId: string;
  status: EntryStatus;
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
  bandName: string;
};
