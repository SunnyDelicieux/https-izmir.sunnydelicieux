// Envoie un mail à chaque nouveau signalement (table "tickets").
//
// Appelée par un "Database Webhook" Supabase (Database → Webhooks) sur INSERT dans public.tickets,
// avec l'en-tête  x-izmir-secret: <WEBHOOK_SECRET>.
// Le mail part via Resend (https://resend.com, gratuit pour ce volume).
//
// Secrets à définir (Edge Functions → Secrets) :
//   RESEND_API_KEY   clé API Resend
//   ADMIN_EMAIL      ton adresse (celle de ton compte Resend si tu n'as pas de domaine vérifié)
//   WEBHOOK_SECRET   un mot de passe au hasard, le même que dans l'en-tête du webhook
//   MAIL_FROM        (facultatif) expéditeur, par défaut "Izmir <onboarding@resend.dev>"
//   SITE_URL         (facultatif) adresse du site, ex "https://mon-site.fr", pour un lien cliquable vers la page

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

Deno.serve(async (req) => {
  if (req.headers.get("x-izmir-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("interdit", { status: 401 });
  }

  const payload = await req.json();
  const t = payload.record;
  if (payload.type !== "INSERT" || payload.table !== "tickets" || !t) {
    return new Response("ignoré");
  }

  const site = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const pageLink = !t.page ? "—" : site ? `<a href="${esc(site + t.page)}">${esc(t.page)}</a>` : esc(t.page);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("MAIL_FROM") || "Izmir <onboarding@resend.dev>",
      to: [Deno.env.get("ADMIN_EMAIL")],
      subject: `[Izmir] ${t.categorie} — signalé par ${t.username}`,
      html: `
        <p><b>${esc(t.username)}</b> a signalé : <b>${esc(t.categorie)}</b></p>
        <p>Page : ${pageLink}</p>
        <blockquote style="white-space:pre-wrap;border-left:3px solid #c09050;padding-left:10px">${esc(t.message)}</blockquote>
        <p style="color:#888">ticket n°${esc(t.id)} · ${esc(t.created_at)}</p>`,
    }),
  });

  if (!res.ok) {
    console.error("Resend", res.status, await res.text());
    return new Response("échec de l'envoi", { status: 502 });
  }
  return new Response("ok");
});
