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
