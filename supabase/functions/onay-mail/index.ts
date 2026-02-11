import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Domain yok → verify istemez
const FROM_EMAIL = "Flowline <onboarding@resend.dev>";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (req.method !== "POST") return jsonErr("Method not allowed", 405);

    try {
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
        const ADMIN_EMAIL_ENV = Deno.env.get("ADMIN_APPROVAL_EMAIL") ?? "";
        const SUPABASE_URL_RAW = Deno.env.get("SUPABASE_URL") ?? "";

        if (!RESEND_API_KEY) return jsonErr("Missing RESEND_API_KEY", 500);
        if (!SUPABASE_URL_RAW) return jsonErr("Missing SUPABASE_URL", 500);

        let payload: any;
        try {
            payload = await req.json();
        } catch {
            return jsonErr("Invalid JSON body", 400);
        }

        const to = String(payload.admin_email || ADMIN_EMAIL_ENV || "").trim();
        const onayToken = String(payload.onay_token || "").trim();
        if (!to) return jsonErr("Missing admin_email (or ADMIN_APPROVAL_EMAIL)", 400);
        if (!onayToken) return jsonErr("Missing onay_token", 400);

        // En sağlam: origin al (rest/v1 vs gelirse bozulmasın)
        const origin = new URL(SUPABASE_URL_RAW).origin;

        const actionBase = `${origin}/functions/v1/onay-aksiyon`;
        const approveUrl = `${actionBase}?action=approve&token=${encodeURIComponent(onayToken)}`;
        const rejectUrl = `${actionBase}?action=reject&token=${encodeURIComponent(onayToken)}`;
        const holdUrl = `${actionBase}?action=hold&token=${encodeURIComponent(onayToken)}`;

        const ad_soyad = String(payload.ad_soyad || "");
        const email = String(payload.email || "");
        const telefon = String(payload.telefon || "-");
        const kullanici_adi = String(payload.kullanici_adi || "");
        const takip = String(payload.takip || "");
        const talep_tarihi = String(payload.talep_tarihi || "");

        const subject = `Yeni Onay Talebi: ${ad_soyad} (${kullanici_adi})`;

        const html = buildAdminEmail({
            approveUrl,
            rejectUrl,
            holdUrl,
            ad_soyad,
            email,
            telefon,
            kullanici_adi,
            takip,
            talep_tarihi,
            // 👇 Kullanıcının gönderdiği her alanı eklemek istersen aç:
            // rawPayload: payload,
        });

        console.log("Resend FROM =", FROM_EMAIL);
        console.log("Resend TO =", to);
        console.log("Approve URL =", approveUrl);

        const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
        });

        const raw = await resendRes.text();
        if (!resendRes.ok) {
            console.error("Resend raw:", raw);
            return jsonErr(parseResendError(raw), 500);
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (e) {
        return jsonErr(String((e as any)?.message || e), 500);
    }
});

function jsonErr(message: string, status = 500) {
    return new Response(JSON.stringify({ ok: false, message }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
}

function parseResendError(raw: string) {
    try {
        const outer = JSON.parse(raw);
        const msg = outer?.message;
        if (typeof msg === "string") {
            try {
                const inner = JSON.parse(msg);
                return inner?.message || msg;
            } catch {
                return msg;
            }
        }
        return outer?.error?.message || raw;
    } catch {
        return raw;
    }
}

function escapeHtml(input: string) {
    const s = String(input ?? "");
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function buildAdminEmail(input: {
    approveUrl: string;
    rejectUrl: string;
    holdUrl: string;
    ad_soyad: string;
    email: string;
    telefon: string;
    kullanici_adi: string;
    takip: string;
    talep_tarihi: string;
}) {
    const ad = escapeHtml(input.ad_soyad);
    const em = escapeHtml(input.email);
    const tel = escapeHtml(input.telefon);
    const ka = escapeHtml(input.kullanici_adi);
    const tk = escapeHtml(input.takip);
    const tt = escapeHtml(input.talep_tarihi);

    return `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Admin Onayı</title>
</head>
<body style="margin:0; padding:0; background:#2f3338;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent;">
    Yeni kullanıcı onay talebi: ${ad} (${ka})
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#2f3338; padding:26px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;">
          <tr>
            <td style="padding:0 6px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif; color:#e5e7eb; font-weight:800; letter-spacing:.4px;">
                    <span style="color:#60a5fa;">#</span> FLOWLINE
                  </td>
                  <td align="center" style="font-family:Arial,Helvetica,sans-serif; color:#cbd5e1;">
                    Admin Onayı
                  </td>
                  <td>&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 6px;">
              <div style="background:#242628; border:1px solid rgba(255,255,255,.08); border-radius:8px; padding:22px;">
                <div style="font-family:Arial,Helvetica,sans-serif; color:#e5e7eb; font-size:28px; font-weight:400; margin-bottom:8px;">
                  Yeni Kullanıcı Onay Talebi
                </div>
                <div style="font-family:Arial,Helvetica,sans-serif; color:#cbd5e1; font-size:14px; margin-bottom:18px;">
                  Aşağıdaki başvuruyu inceleyip bir aksiyon seçin.
                </div>

                <div style="background:#2b2e31; border:1px solid rgba(255,255,255,.06); border-radius:6px; padding:16px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                    style="font-family:Arial,Helvetica,sans-serif; font-size:14px; color:#e5e7eb;">
                    ${row("Ad Soyad", ad)}
                    ${rowLink("Email", em)}
                    ${row("Telefon", tel)}
                    ${row("Kullanıcı Adı", ka)}
                    ${row("Takip", tk)}
                    ${row("Talep Tarihi", tt)}
                  </table>
                </div>

                <div style="margin-top:20px; font-family:Arial,Helvetica,sans-serif; color:#e5e7eb; font-size:16px; font-weight:700;">
                  İşlem Seçin
                </div>

                <div style="margin-top:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right:10px; padding-bottom:10px;">
                        ${btn({
        href: input.approveUrl,
        label: "Onayla",
        icon: "✓",
        bg: "#22c55e",
        fg: "#07210f",
        border: "rgba(34,197,94,.35)",
        shadow: "rgba(34,197,94,.18)",
    })}
                      </td>
                      <td style="padding-right:10px; padding-bottom:10px;">
                        ${btn({
        href: input.holdUrl,
        label: "Beklemeye Al",
        icon: "Ⅱ",
        bg: "#60a5fa",
        fg: "#061a2e",
        border: "rgba(96,165,250,.35)",
        shadow: "rgba(96,165,250,.18)",
    })}
                      </td>
                      <td style="padding-bottom:10px;">
                        ${btn({
        href: input.rejectUrl,
        label: "Reddet",
        icon: "✕",
        bg: "#f43f5e",
        fg: "#2b0b12",
        border: "rgba(244,63,94,.35)",
        shadow: "rgba(244,63,94,.18)",
    })}
                      </td>
                    </tr>
                  </table>
                </div>

                <div style="font-family:Arial,Helvetica,sans-serif; color:#cbd5e1; font-size:13px; margin-top:8px;">
                  Not: Linkler güvenlik için token içerir. Süresi dolmuş linkler işlem yapmaz.
                </div>
              </div>

              <div style="font-family:Arial,Helvetica,sans-serif; color:#9ca3af; font-size:12px; margin-top:14px; padding:0 2px;">
                © 2026 Flowline
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    function row(label: string, value: string) {
        return `
      <tr>
        <td style="width:170px; color:#cbd5e1; padding:10px 8px; border-bottom:1px solid rgba(255,255,255,.06);">
          ${label}
        </td>
        <td style="padding:10px 8px; border-bottom:1px solid rgba(255,255,255,.06); font-weight:700; color:#e5e7eb;">
          ${value || "-"}
        </td>
      </tr>
    `;
    }

    function rowLink(label: string, value: string) {
        const safe = value || "-";
        const href = value ? `mailto:${value}` : "#";
        return `
      <tr>
        <td style="width:170px; color:#cbd5e1; padding:10px 8px; border-bottom:1px solid rgba(255,255,255,.06);">
          ${label}
        </td>
        <td style="padding:10px 8px; border-bottom:1px solid rgba(255,255,255,.06); font-weight:800;">
          ${value
                ? `<a href="${href}" style="color:#60a5fa; text-decoration:none;">${safe}</a>`
                : `<span style="color:#e5e7eb;">${safe}</span>`
            }
        </td>
      </tr>
    `;
    }

    function btn(opts: {
        href: string;
        label: string;
        icon: string;
        bg: string;
        fg: string;
        border: string;
        shadow: string;
    }) {
        return `
      <a href="${opts.href}"
         style="
           display:inline-block;
           text-decoration:none;
           font-family:Arial,Helvetica,sans-serif;
           font-weight:800;
           font-size:14px;
           letter-spacing:.2px;
           background:${opts.bg};
           color:${opts.fg};
           border:1px solid ${opts.border};
           border-radius:999px;
           padding:10px 14px;
           box-shadow:0 8px 18px ${opts.shadow};
         ">
        <span style="display:inline-block; width:18px; text-align:center; margin-right:8px; font-weight:900;">
          ${opts.icon}
        </span>
        ${opts.label}
      </a>
    `;
    }
}
