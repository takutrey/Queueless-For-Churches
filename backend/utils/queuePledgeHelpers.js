const normalizePhone = (
  phone,
  countryCode = process.env.CHURCH_COUNTRY_CODE,
) => {
  if (typeof phone !== "string" || !phone.trim()) return null;

  const compact = phone.trim().replace(/[\s\-()[\]]/g, "");
  const code = String(countryCode || "").replace(/\D/g, "");
  let normalized = compact;

  if (code && /^0\d+$/.test(compact)) {
    normalized = `+${code}${compact.slice(1)}`;
  }

  const digits = normalized.replace(/\D/g, "");
  return digits || null;
};

const getMatchStatus = (matches = []) => {
  if (matches.length === 1) return "SINGLE_MATCH";
  if (matches.length > 1) return "MULTIPLE_MATCHES";
  return "NO_MATCH";
};

module.exports = { normalizePhone, getMatchStatus };
