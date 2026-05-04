/** Minimal HTML escape for untrusted strings in email bodies. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatDateRange(
  start: Date,
  end: Date,
  locale: string,
  timeZone: string,
): { dateLine: string; timeLine: string } {
  const dOpts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone,
  };
  const tOpts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  };
  const dateLine = new Intl.DateTimeFormat(locale, dOpts).format(start);
  const startT = new Intl.DateTimeFormat(locale, tOpts).format(start);
  const endT = new Intl.DateTimeFormat(locale, tOpts).format(end);
  return { dateLine, timeLine: `${startT} – ${endT}` };
}

export function emailShell(params: {
  title: string;
  previewText: string;
  innerHtml: string;
  clubName: string;
  footerNote?: string;
}): string {
  const foot = params.footerNote
    ? `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">${params.footerNote}</p>`
    : '';
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(params.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(params.previewText)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:linear-gradient(145deg,#1e293b 0%,#0f172a 100%);border-radius:16px;border:1px solid rgba(148,163,184,0.2);overflow:hidden;">
        <tr>
          <td style="padding:24px 28px 8px;">
            <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#94a3b8;font-weight:700;">${escapeHtml(params.clubName)}</p>
            <h1 style="margin:12px 0 0;font-size:22px;font-weight:800;color:#f8fafc;line-height:1.25;">${escapeHtml(params.title)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 28px;color:#e2e8f0;font-size:15px;line-height:1.6;">
            ${params.innerHtml}
            ${foot}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 20px;border-top:1px solid rgba(148,163,184,0.15);">
            <p style="margin:0;font-size:12px;color:#64748b;">Sky Wellness — rezervasyon bildirimi</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
