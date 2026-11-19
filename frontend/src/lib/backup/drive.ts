/** 
 * Uploads the backup to users account.
 * Retries three times in case it fails.
*/

import * as Crypto from 'expo-crypto';

import {
  BACKUP_PREFIX,
  CancelToken, DriveError, DriveFile, mapDriveError, multipartBody, query,
} from './drive-helpers';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type TokenSource = { get(): Promise<string>; refresh(): Promise<string> };

async function request(tokens: TokenSource, url: string, init: RequestInit = {}): Promise<Response> {
  const send = (token: string) =>
    fetch(url, { ...init, headers: { ...(init.headers as object), Authorization: `Bearer ${token}` } });
  try {
    let res = await send(await tokens.get());
    if (res.status === 401) res = await send(await tokens.refresh()); // tokens last about an hour
    return res;
  } catch (e) {
    if (e instanceof DriveError) throw e;
    throw new DriveError('Could not reach Google. Check your connection.', 'network');
  }
}

async function ok(res: Response): Promise<Response> {
  if (res.ok) return res;
  throw mapDriveError(res.status, await res.text().catch(() => ''));
}

const toFile = (f: any): DriveFile => ({
  id: String(f.id), name: String(f.name), size: Number(f.size ?? 0), createdTime: String(f.createdTime),
});

/** Newest first. Only files in this app's hidden folder are visible, so it can't see anything else in Drive. */
export async function listBackups(tokens: TokenSource): Promise<DriveFile[]> {
  const qs = query({
    spaces: 'appDataFolder',
    pageSize: '100',
    orderBy: 'createdTime desc',
    fields: 'files(id,name,size,createdTime)',
    q: `name contains '${BACKUP_PREFIX}'`,
  });
  const body = await (await ok(await request(tokens, `${API}/files?${qs}`))).json();
  return (body.files ?? []).map(toFile);
}

export async function downloadBackup(tokens: TokenSource, fileId: string): Promise<string> {
  return (await ok(await request(tokens, `${API}/files/${fileId}?alt=media`))).text();
}

export async function deleteFile(tokens: TokenSource, fileId: string): Promise<void> {
  await ok(await request(tokens, `${API}/files/${fileId}`, { method: 'DELETE' }));
}

// XMLHttpRequest, because fetch can't report upload progress
function xhrUpload(
  token: string, body: string, boundary: string,
  onProgress: (fraction: number) => void, cancel: CancelToken
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${UPLOAD}/files?uploadType=multipart&fields=id,name,size,createdTime`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', `multipart/related; boundary=${boundary}`);
    xhr.timeout = 180_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new DriveError('Could not reach Google. Check your connection.', 'network'));
    xhr.ontimeout = () => reject(new DriveError('The upload took too long.', 'network'));
    xhr.onabort = () => reject(new DriveError('Cancelled', 'cancelled'));
    cancel.onCancel(() => xhr.abort());
    xhr.send(body);
  });
}

export async function uploadBackup(
  tokens: TokenSource, name: string, content: string,
  onProgress: (fraction: number) => void, cancel: CancelToken
): Promise<DriveFile> {
  const boundary = `pesabudge-${Crypto.randomUUID()}`;
  const body = multipartBody({ name, parents: ['appDataFolder'], mimeType: 'application/json' }, content, boundary);

  let token = await tokens.get();
  for (let attempt = 0; ; attempt++) {
    if (cancel.cancelled) throw new DriveError('Cancelled', 'cancelled');
    try {
      let res = await xhrUpload(token, body, boundary, onProgress, cancel);
      if (res.status === 401) {
        token = await tokens.refresh();
        res = await xhrUpload(token, body, boundary, onProgress, cancel);
      }
      if (res.status >= 200 && res.status < 300) return toFile(JSON.parse(res.text));
      throw mapDriveError(res.status, res.text);
    } catch (e) {
      const retry = e instanceof DriveError && (e.kind === 'network' || e.kind === 'server');
      if (!retry || attempt >= 2) throw e;
      onProgress(0);
      await sleep(1000 * 3 ** attempt); // 1s, then 3s
    }
  }
}