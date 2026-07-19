import { NextResponse } from "next/server";

// Email automation endpoint. Sends transactional emails via the Resend REST
// API (https://resend.com). When RESEND_API_KEY is not configured the endpoint
// is a safe no-op, so every app flow works without email set up.
//
// Only fixed templates can be sent — the client provides structured data,
// never subject lines or HTML — which keeps the endpoint unusable for
// arbitrary email relay.

const MAX_RECIPIENTS = 12;

type TemplateData = Record<string, string | number | undefined>;

interface EmailRequest {
  type: string;
  to: string[];
  data: TemplateData;
}

const str = (v: string | number | undefined) => String(v ?? "");

// Shared branded layout
function layout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt">
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#10b981);padding:24px 32px;">
              <span style="font-size:24px;font-weight:bold;color:#ffffff;">JOGA!</span>
              <span style="font-size:13px;color:#dcfce7;display:block;margin-top:2px;">Find Your Game</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:20px;color:#111827;">${title}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#6b7280;">
                Recebeste este email porque tens uma conta JOGA!. Este é um email automático — não respondas.
              </p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const p = (text: string) =>
  `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">${text}</p>`;

function detailsTable(rows: [string, string][]): string {
  const tr = rows
    .filter(([, v]) => v !== "")
    .map(
      ([k, v]) =>
        `<tr>
          <td style="padding:6px 12px;font-size:13px;color:#6b7280;white-space:nowrap;">${k}</td>
          <td style="padding:6px 12px;font-size:13px;color:#111827;font-weight:bold;">${v}</td>
        </tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;width:100%;">${tr}</table>`;
}

// Escape user-provided values before interpolating into HTML
function esc(v: string | number | undefined): string {
  return str(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function buildTemplate(type: string, d: TemplateData): { subject: string; html: string } | null {
  switch (type) {
    case "welcome":
      return {
        subject: "Bem-vindo ao JOGA! 🎉",
        html: layout(
          `Bem-vindo, ${esc(d.firstName)}! 👋`,
          p("A tua conta JOGA! está pronta. A partir de agora podes:") +
            p("⚡ Descobrir jogos perto de ti e juntares-te com um swipe<br/>🏟️ Reservar campos e arenas<br/>📊 Acompanhar as tuas estatísticas, subir de nível e ser eleito MVP<br/>🤝 Encontrar parceiros de jogo e fazer amigos") +
            p("Bons jogos! ⚽🎾🏀")
        ),
      };

    case "booking-user":
      return {
        subject: `Reserva ${d.status === "confirmed" ? "confirmada" : "recebida"} — ${str(d.venueName)}`,
        html: layout(
          d.status === "confirmed" ? "Reserva confirmada ✅" : "Reserva recebida 📩",
          p(`Olá ${esc(d.firstName)}, a tua reserva foi ${d.status === "confirmed" ? "confirmada" : "registada e aguarda confirmação"}.`) +
            detailsTable([
              ["Local", esc(d.venueName)],
              ["Data", esc(formatPtDate(str(d.date)))],
              ["Hora", esc(d.time)],
              ["Duração", esc(d.duration)],
              ["Jogadores", esc(d.players)],
              ["Preço", esc(d.price)],
            ]) +
            p("Podes gerir as tuas reservas na secção «As Minhas Reservas» da app.")
        ),
      };

    case "booking-organizer":
      return {
        subject: `Nova reserva — ${str(d.venueName)} (${str(d.date)} ${str(d.time)})`,
        html: layout(
          "Nova reserva na tua arena 🏟️",
          p(`Olá ${esc(d.organizerName)}, ${esc(d.userName)} fez uma reserva na tua arena.`) +
            detailsTable([
              ["Arena", esc(d.venueName)],
              ["Jogador", esc(d.userName)],
              ["Data", esc(formatPtDate(str(d.date)))],
              ["Hora", esc(d.time)],
              ["Duração", esc(d.duration)],
              ["Jogadores", esc(d.players)],
              ["Preço", esc(d.price)],
            ]) +
            p("Confirma ou recusa a reserva na secção «Gerir Arenas» da app.")
        ),
      };

    case "booking-status":
      return {
        subject:
          d.status === "confirmed"
            ? `Reserva confirmada — ${str(d.venueName)}`
            : `Reserva cancelada — ${str(d.venueName)}`,
        html: layout(
          d.status === "confirmed" ? "Reserva confirmada ✅" : "Reserva cancelada ❌",
          p(
            d.status === "confirmed"
              ? `Olá ${esc(d.firstName)}, boa notícia — a tua reserva foi confirmada!`
              : `Olá ${esc(d.firstName)}, infelizmente a tua reserva foi cancelada.`
          ) +
            detailsTable([
              ["Local", esc(d.venueName)],
              ["Data", esc(formatPtDate(str(d.date)))],
              ["Hora", esc(d.time)],
              ["Preço", esc(d.price)],
            ]) +
            (d.status === "confirmed"
              ? p("Bom jogo! 🎉")
              : p("Podes fazer uma nova reserva a qualquer momento na app."))
        ),
      };

    case "match-join":
      return {
        subject: `${str(d.playerName)} juntou-se ao teu jogo de ${str(d.sport)}!`,
        html: layout(
          "Novo jogador no teu jogo ⚡",
          p(`Olá ${esc(d.organizerName)}, <strong>${esc(d.playerName)}</strong> juntou-se ao teu jogo.`) +
            detailsTable([
              ["Desporto", esc(d.sport)],
              ["Data", esc(formatPtDate(str(d.date)))],
              ["Hora", esc(d.time)],
              ["Local", esc(d.location)],
              ["Vagas restantes", esc(d.spotsLeft)],
            ]) +
            p("Vê os detalhes do jogo na app.")
        ),
      };

    case "match-result": {
      const resultLabel =
        d.result === "win" ? "Vitória 🏆" : d.result === "loss" ? "Derrota" : "Empate";
      return {
        subject: `Resultado do jogo de ${str(d.sport)}: ${resultLabel.replace(" 🏆", "")}`,
        html: layout(
          `Jogo concluído — ${resultLabel}`,
          p(`Olá ${esc(d.firstName)}, o resultado do teu jogo de ${esc(d.sport)} já foi registado.`) +
            detailsTable([
              ["Resultado", esc(d.score) || resultLabel],
              ["Data", esc(formatPtDate(str(d.date)))],
              ["MVP", esc(d.mvp)],
              ["Pontos ganhos", d.pointsEarned ? `+${esc(d.pointsEarned)}` : ""],
            ]) +
            (str(d.mvp) && d.isMvp === "true"
              ? p("👑 <strong>Parabéns, foste eleito MVP do jogo!</strong>")
              : "") +
            p("As tuas estatísticas já foram atualizadas. Vê o teu histórico na app.")
        ),
      };
    }

    case "friend-request":
      return {
        subject: `${str(d.senderName)} quer ser teu amigo no JOGA!`,
        html: layout(
          "Novo pedido de amizade 🤝",
          p(`Olá ${esc(d.receiverName)}, <strong>${esc(d.senderName)}</strong> enviou-te um pedido de amizade.`) +
            p("Aceita o pedido na secção «Amigos» da app e combinem o próximo jogo!")
        ),
      };

    case "friend-accepted":
      return {
        subject: `${str(d.accepterName)} aceitou o teu pedido de amizade!`,
        html: layout(
          "Pedido aceite 🎉",
          p(`Olá ${esc(d.senderName)}, <strong>${esc(d.accepterName)}</strong> aceitou o teu pedido de amizade.`) +
            p("Convida-o para o próximo jogo na app!")
        ),
      };

    default:
      return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: EmailRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, to, data } = body || {};
  if (!type || !Array.isArray(to) || to.length === 0 || typeof data !== "object") {
    return NextResponse.json({ error: "Missing type/to/data" }, { status: 400 });
  }

  const recipients = [...new Set(to)]
    .filter((e) => typeof e === "string" && EMAIL_RE.test(e))
    .slice(0, MAX_RECIPIENTS);
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No valid recipients" }, { status: 400 });
  }

  const template = buildTemplate(type, data);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${type}` }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "JOGA! <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(`[JOGA email] RESEND_API_KEY not set — skipping "${type}" to ${recipients.join(", ")}`);
    return NextResponse.json({ sent: false, reason: "not-configured" });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject: template.subject,
        html: template.html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.error(`[JOGA email] Resend error ${res.status}: ${detail}`);
      return NextResponse.json({ sent: false, reason: "provider-error" }, { status: 502 });
    }

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("[JOGA email] send failed:", err);
    return NextResponse.json({ sent: false, reason: "network-error" }, { status: 502 });
  }
}
