const TICKETS_KEY = "nolinea-tickets";

export function getSavedTicketTokens() {
  try {
    const stored = window.localStorage.getItem(TICKETS_KEY);
    const tokens = stored ? JSON.parse(stored) : [];
    return Array.isArray(tokens) ? tokens.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function rememberTicket(customerToken) {
  if (!customerToken) return;

  try {
    const tokens = getSavedTicketTokens().filter(
      (token) => token !== customerToken,
    );
    tokens.unshift(customerToken);
    window.localStorage.setItem(TICKETS_KEY, JSON.stringify(tokens));
  } catch {
    // Ticket navigation still works when browser storage is unavailable.
  }
}
