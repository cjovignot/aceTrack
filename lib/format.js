export function formatName(fullName) {
  if (!fullName) return "";

  const parts = fullName.trim().split(" ");

  if (parts.length === 1) return parts[0];

  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");

  return `${firstName.charAt(0).toUpperCase()}. ${lastName.toUpperCase()}`;
}

export const formatISODate = (iso) => {
  const date = new Date(iso);

  const day = new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(
    date,
  );
  const dayNum = date.getDate();
  const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(
    date,
  );
  const year = date.getFullYear();

  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return `${day} ${dayNum} ${month} ${year} - ${time}`;
};
