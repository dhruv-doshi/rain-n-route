export function formatDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function formatCost(paise: number): string {
  if (paise === 0) return 'Free';
  const rupees = paise / 100;
  const whole = Math.floor(rupees);
  const fraction = rupees - whole;
  return fraction === 0 ? `₹${whole}` : `₹${rupees.toFixed(2)}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
