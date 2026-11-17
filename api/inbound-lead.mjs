const roles = new Set([
  'Sales development', 'Customer success', 'Data analytics', 'Software development',
  'GTM strategy', 'RevOps', 'Operations', 'Founder’s Office', 'Other',
]);

function field(body, name, max) {
  const value = typeof body[name] === 'string' ? body[name].trim() : '';
  return value.length <= max ? value : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ ok: false });
  }

  const first = field(body, 'first_name', 100);
  const last = field(body, 'last_name', 100);
  const job = field(body, 'job_title', 150);
  const email = field(body, 'email', 254);
  const hiring = body.actively_hiring;
  const selected = hiring === 'Yes' ? body.roles : [];
  const other = field(body, 'other_role', 120);

  if (!first || !last || !job || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      || !['Yes', 'No'].includes(hiring) || !Array.isArray(selected)
      || selected.length > roles.size || !selected.every(role => roles.has(role))
      || (selected.includes('Other') && !other)) {
    return res.status(400).json({ ok: false });
  }

  const webhook = process.env.SLACK_INBOUND_WEBHOOK_URL;
  if (!webhook || !/^https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]+$/.test(webhook)) {
    return res.status(503).json({ ok: false });
  }

  const roleNames = [...new Set(selected)].map(role => role === 'Other' ? `Other (${other})` : role);
  const text = [
    'New hiring enquiry',
    `Name: ${first} ${last}`,
    `Job title: ${job}`,
    `Work email: ${email}`,
    `Actively hiring: ${hiring}`,
    `Roles: ${roleNames.join(', ') || 'None selected'}`,
  ].join('\n');

  try {
    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'New hiring enquiry from the AntBox website',
        blocks: [{ type: 'section', text: { type: 'plain_text', text } }],
        unfurl_links: false,
        unfurl_media: false,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok && (await response.text()).trim() === 'ok') {
      return res.status(200).json({ ok: true });
    }
  } catch {
    // Return a generic error without logging the webhook URL or submitted details.
  }

  return res.status(502).json({ ok: false });
}
