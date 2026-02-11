import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const FROM_EMAIL = "Flowline <onboarding@resend.dev>";
type Status = "ONAYLI" | "RED" | "BEKLEMEDE";

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const action = (url.searchParams.get("action") || "").toLowerCase();
        const token = (url.searchParams.get("token") || "").trim();

        if (!token) return html("Token eksik.", 400);
        if (!["approve", "reject", "hold"].includes(action))
            return html("Geçersiz işlem.", 400);

        const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
        const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

        if (!SUPABASE_URL || !SERVICE_ROLE) {
            return html("Server config eksik (SUPABASE_URL / SERVICE_ROLE).", 500);
        }

        const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
            auth: { persistSession: false },
        });

        const { data: user, error: selErr } = await sb
            .from("kullanicilar")
            .select("id, ad_soyad, email, token_son_kullanma, takip, kullanici_adi")
            .eq("onay_token", token)
            .maybeSingle();

        if (selErr) return html(`DB hata: ${escapeHtml(selErr.message)}`, 500);
        if (!user) return html("Bu link geçersiz veya daha önce kullanılmış.", 404);

        // Expiry varsa
        if (user.token_son_kullanma) {
            const exp = new Date(user.token_son_kullanma as any).getTime();
            if (!Number.isNaN(exp) && Date.now() > exp) {
                await sb.from("kullanicilar").update({ onay_token: null }).eq("id", user.id);
                return html("Bu onay linkinin süresi dolmuş.", 410);
            }
        }

        let newStatus: Status = "BEKLEMEDE";
        let update: Record<string, unknown> = {};
        let resultText = "";

        if (action === "approve") {
            newStatus = "ONAYLI";
            update = {
                durum: newStatus,
                onayli: true,
                onay_tarihi: new Date().toISOString(),
                onay_token: null,
            };
            resultText = "✅ Kullanıcı ONAYLANDI.";
        } else if (action === "reject") {
            newStatus = "RED";
            update = {
                durum: newStatus,
                onayli: false,
                onay_tarihi: null,
                onay_token: null,
            };
            resultText = "❌ Kullanıcı REDDEDİLDİ.";
        } else {
            newStatus = "BEKLEMEDE";
            update = {
                durum: newStatus,
                onayli: false,
                onay_tarihi: null,
                // hold linki tekrar kullanılabilsin diye token silmiyoruz
            };
            resultText = "⏸ Kullanıcı BEKLEMEYE ALINDI.";
        }

        const { error: upErr } = await sb.from("kullanicilar").update(update).eq("id", user.id);
        if (upErr) return html(`Güncelleme hatası: ${escapeHtml(upErr.message)}`, 500);

        // Kullanıcı maili
        let mailNote = "";
        if (!user.email) {
            mailNote = "Kullanıcının emaili yok, bildirim gönderilmedi.";
        } else if (!RESEND_API_KEY) {
            mailNote = "RESEND_API_KEY eksik, kullanıcı maili gönderilemedi.";
        } else {
            const subject =
                newStatus === "ONAYLI"
                    ? "Flowline | Hesabınız Onaylandı"
                    : newStatus === "RED"
                        ? "Flowline | Talebiniz Reddedildi"
                        : "Flowline | Talebiniz Beklemede";

            const htmlBody = buildUserEmail({
                status: newStatus,
                ad_soyad: String(user.ad_soyad || ""),
                kullanici_adi: String(user.kullanici_adi || ""),
                takip: String(user.takip || ""),
            });

            const r = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${RESEND_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    from: FROM_EMAIL,
                    to: String(user.email),
                    subject,
                    html: htmlBody,
                }),
            });

            const raw = await r.text();
            if (!r.ok) {
                console.error("Resend raw:", raw);
                mailNote = `Kullanıcı maili gönderilemedi: ${parseResendError(raw)}`;
            } else {
                mailNote = "Kullanıcıya bilgilendirme maili gönderildi ✅";
            }
        }

        return html(
            `${resultText}<br/><br/><span style="font-weight:700;color:rgba(15,23,42,.7)">${escapeHtml(
                mailNote,
            )}</span>`,
            200,
        );
    } catch (e) {
        return html(escapeHtml(String((e as any)?.message || e)), 500);
    }
});

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

function html(message: string, status = 200) {
    return new Response(
        `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Flowline Onay</title>
  <style>
    body{font-family:Inter,system-ui,Segoe UI,Roboto,Arial; background:#f6f8fb; color:#0f172a; margin:0}
    .wrap{max-width:720px;margin:56px auto;padding:0 16px}
    .card{background:#fff;border:1px solid rgba(15,23,42,.08); border-radius:18px; padding:22px; box-shadow:0 20px 50px rgba(15,23,42,.10)}
    .msg{font-weight:900;font-size:18px}
    .sub{margin-top:10px;color:rgba(15,23,42,.62);font-size:13px}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="msg">${message}</div>
      <div class="sub">Bu sayfayı kapatabilirsiniz.</div>
    </div>
  </div>
</body>
</html>`,
        { status, headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders } },
    );
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

function buildUserEmail(input: {
    status: Status;
    ad_soyad: string;
    kullanici_adi: string;
    takip: string;
}) {
    const ad = escapeHtml(input.ad_soyad);
    const ka = escapeHtml(input.kullanici_adi);
    const tk = escapeHtml(input.takip);

    const title =
        input.status === "ONAYLI"
            ? "🎉 Hesabınız Onaylandı"
            : input.status === "RED"
                ? "❌ Başvurunuz Reddedildi"
                : "⏸ Başvurunuz Beklemede";

    const body =
        input.status === "ONAYLI"
            ? "Hesabınız başarıyla onaylandı. Artık Flowline sistemine giriş yapabilirsiniz."
            : input.status === "RED"
                ? "Başvurunuz değerlendirme sonucunda reddedildi."
                : "Başvurunuz inceleme aşamasındadır. Kısa süre içinde bilgilendirileceksiniz.";

    return `<!doctype html>
<html lang="tr">
<body style="margin:0;padding:0;background:#f6f8fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
              <div style="font-weight:900;font-size:18px;margin-bottom:12px;">${title}</div>

              <div style="background:#ffffff;border:1px solid rgba(15,23,42,.08);border-radius:14px;padding:18px;">
                <p style="margin:0 0 10px;">
                  Merhaba <b>${ad}</b>,
                </p>

                <p style="margin:0 0 10px; line-height:1.55;">
                  ${escapeHtml(body)}
                </p>

                <div style="margin-top:12px;font-size:13px;color:#475569; line-height:1.6;">
                  Kullanıcı adı: <b>${ka || "-"}</b><br/>
                  Takip: <b>${tk || "-"}</b>
                </div>
              </div>

              <div style="margin-top:14px;font-size:12px;color:#64748b;">
                © ${new Date().getFullYear()} Flowline
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
