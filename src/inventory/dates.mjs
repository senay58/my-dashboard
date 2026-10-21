export function businessDate(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(value));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function isSaleDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
