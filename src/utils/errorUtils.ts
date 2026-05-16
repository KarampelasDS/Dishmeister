export function getFriendlyErrorMessage(err: any, defaultFallback?: string): string {
  const code = err?.code || "";
  const message = err?.message || err?.toString() || "";

  if (message.includes("Invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (message.includes("Email not confirmed")) {
    return "Please confirm your email before logging in.";
  }
  if (message.includes("User already registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("Password should be at least 6 characters")) {
    return "Your password must be at least 6 characters.";
  }
  if (message.includes("JWT expired") || message.includes("expired")) {
    return "Your session has expired. Please log in again.";
  }
  if (code === "23505" || message.includes("duplicate key")) {
    return "This username is already taken.";
  }
  if (code === "23503" || message.includes("foreign key")) {
    return "Couldn't perform this action because a related item is missing.";
  }
  if (code === "42501" || message.includes("insufficient privilege") || message.includes("row-level security")) {
    return "You don't have permission to do this.";
  }
  if (code === "PGRST116" || message.includes("multiple (or no) rows")) {
    return "We couldn't find what you were looking for.";
  }
  if (message.includes("Failed to fetch") || message.includes("NetworkError")) {
    return "Connection error. Please check your internet and try again.";
  }

  return defaultFallback || "Something went wrong. Please try again.";
}
