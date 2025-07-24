export function parseJsonSafe<T>(value: string | undefined, fallback: T): T {
  try {
    return JSON.parse(value || "") || fallback;
  } catch {
    return fallback;
  }
}

export function validateCreateEventInput(body: any) {
  const errors: string[] = [];

  if (!body.title) errors.push("Missing 'title'");
  if (!body.eventType) errors.push("Missing 'eventType'");
  if (!body.date) errors.push("Missing 'date'");
  if (!body.startTime) errors.push("Missing 'startTime'");
  if (!body.mode) errors.push("Missing 'mode'");

  if (body.mode !== "virtual") {
    if (!body.location) errors.push("Missing 'location' for physical event");
    if (!body.latitude || !body.longitude)
      errors.push("Missing 'latitude' or 'longitude'");
  }
  const rawTicketing = parseJsonSafe(body.ticketing, {
    enabled: false,
    totalTickets: 0,
    price: 0,
    currency: "eur",
    payoutStripeAccountId: null,
  });
  if (rawTicketing.enabled) {
    if (!rawTicketing.totalTickets || rawTicketing.totalTickets <= 0) {
      errors.push("Ticketing enabled but missing valid totalTickets");
    }
    if (!rawTicketing.price || rawTicketing.price <= 0) {
      errors.push("Ticketing enabled but missing valid price");
    }
    if (!rawTicketing.currency) {
      errors.push("Ticketing enabled but missing currency");
    }
  }
  if (errors.length > 0) {
    const error = new Error(`Validation error: ${errors.join(", ")}`);
    (error as any).status = 400;
    throw error;
  }

  // Return parsed and cleaned values
  return {
    title: body.title.trim(),
    username: body.username?.trim() || "",
    eventType: body.eventType,
    mode: body.mode,
    location:
      body.mode === "virtual" ? "Virtual Event" : body.location?.trim() || "",
    latitude: parseFloat(body.latitude || 0),
    longitude: parseFloat(body.longitude || 0),
    date: body.date,
    endDate: body.endDate || null,
    startTime: body.startTime,
    endTime: body.endTime || null,
    description: body.description?.trim() || "",
    uploadedMedia: parseJsonSafe(body.uploadedMedia, []),
    predefinedMedia: parseJsonSafe(body.predefinedMedia, []),
    interests: parseJsonSafe(body.interests, []),
    questions: parseJsonSafe(body.questions, []),
    additionalField: parseJsonSafe(body.additionalField, []),
    coHosts: parseJsonSafe(body.coHosts, []),
    timeSlots: parseJsonSafe(body.timeSlots, []),
    restricted: body.restricted === "true",
    includeChat: body.includeChat === "true",
    createRSVP: body.createRSVP === "true",
    requiresApproval: body.requiresApproval === "true",
    guests: parseJsonSafe(body.guests, []),
    limitedGuests: body.limitedGuests ? Number(body.limitedGuests) : null,
    UrlLink: body.UrlLink?.trim() || "",
    UrlTitle: body.UrlTitle?.trim() || "",
    timeZone: body.timeZone?.trim() || "",
    ticketing: {
      enabled: !!rawTicketing.enabled,
      totalTickets: Number(rawTicketing.totalTickets || 0),
      price: Number(rawTicketing.price || 0),
      currency: rawTicketing.currency || "eur",
      payoutStripeAccountId: rawTicketing.payoutStripeAccountId || undefined,
    },
  };
}
