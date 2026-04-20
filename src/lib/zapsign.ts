const ZAPSIGN_BASE = 'https://api.zapsign.com.br/api/v1';

export interface ZapSignSigner {
  name: string;
  email: string;
  phone_country?: string;
  phone_number?: string;
  auth_mode?: string;
  send_automatic_email?: boolean;
}

export interface ZapSignDocSigner {
  token: string;
  status: string;
  name: string;
  email: string;
  link: string;
}

export interface ZapSignDoc {
  token: string;
  name: string;
  status: string;
  signers: ZapSignDocSigner[];
}

export async function zapSignCreateDoc(params: {
  name: string;
  base64_pdf: string;
  signers: ZapSignSigner[];
}): Promise<ZapSignDoc> {
  const apiToken = process.env.ZAPSIGN_API_TOKEN;
  if (!apiToken) throw new Error('ZAPSIGN_API_TOKEN not configured');

  const res = await fetch(`${ZAPSIGN_BASE}/docs/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: params.name,
      base64_pdf: params.base64_pdf,
      lang: 'pt-br',
      disable_signer_emails: false,
      signers: params.signers.map((s) => ({
        ...s,
        auth_mode: s.auth_mode ?? 'assinaturaTela',
        send_automatic_email: s.send_automatic_email ?? true,
      })),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ZapSign API ${res.status}: ${body}`);
  }

  return res.json() as Promise<ZapSignDoc>;
}

export async function zapSignGetDoc(docToken: string): Promise<ZapSignDoc> {
  const apiToken = process.env.ZAPSIGN_API_TOKEN;
  if (!apiToken) throw new Error('ZAPSIGN_API_TOKEN not configured');

  const res = await fetch(`${ZAPSIGN_BASE}/docs/${docToken}/`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`ZapSign GET ${res.status}`);
  return res.json() as Promise<ZapSignDoc>;
}
