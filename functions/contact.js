const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function clean(value, limit) {
  return String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

async function verifyTurnstile(token, secret, ip) {
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form,
  });

  if (!response.ok) return false;
  const result = await response.json();
  return result.success === true;
}

async function sendAgentMail(env, payload) {
  const response = await fetch(
    AGENTMAIL_BASE + "/inboxes/" + encodeURIComponent("info@oldchemistry.com") + "/messages/send",
    {
      method: "POST",
      headers: {
        authorization: "Bearer " + env.AGENTMAIL_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error("AgentMail send failed: " + response.status + " " + text.slice(0, 240));
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.AGENTMAIL_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    return jsonResponse({ ok: false, error: "Contact form is not configured." }, 503);
  }

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return jsonResponse({ ok: false, error: "Invalid request." }, 400);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request." }, 400);
  }

  if (clean(body.company, 80)) {
    return jsonResponse({ ok: true });
  }

  const name = clean(body.name, 80);
  const email = clean(body.email, 160);
  const subject = clean(body.subject, 120) || "Website inquiry";
  const message = clean(body.message, 2400);
  const turnstileToken = clean(body.turnstileToken, 2048);

  if (!name || !email || !message || !email.includes("@")) {
    return jsonResponse({ ok: false, error: "Please include your name, email, and message." }, 400);
  }

  const verified = await verifyTurnstile(
    turnstileToken,
    env.TURNSTILE_SECRET_KEY,
    request.headers.get("CF-Connecting-IP"),
  );
  if (!verified) {
    return jsonResponse({ ok: false, error: "Verification failed. Please try again." }, 403);
  }

  const sentAt = new Date().toISOString();
  await sendAgentMail(env, {
    to: "karen@oldchemistry.com",
    subject: "[Website inquiry] " + subject,
    text: [
      "New Old Chemistry website inquiry",
      "",
      "Name: " + name,
      "Email: " + email,
      "Subject: " + subject,
      "Submitted: " + sentAt,
      "",
      message,
    ].join("\n"),
    labels: ["oldchemistry_website_contact", "action_required_aco"],
    headers: {
      "Reply-To": email,
      "X-OldChemistry-Website-Contact": "true",
    },
  });

  return jsonResponse({ ok: true });
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
}
