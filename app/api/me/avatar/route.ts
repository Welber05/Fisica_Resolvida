import { NextResponse } from 'next/server';
import { getD1, getFilesBucket } from '@/db';
import { requireApiUser, writeAudit } from '@/lib/user-service';
import { assertSameOrigin, jsonError, ValidationError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireApiUser({ allowIncomplete: true });
    const form = await request.formData();
    const file = form.get('avatar');
    if (!(file instanceof File)) throw new ValidationError('Selecione uma imagem.');
    if (file.size < 1 || file.size > 2 * 1024 * 1024) {
      throw new ValidationError('A imagem deve ter no máximo 2 MB.');
    }
    const extension = allowedTypes.get(file.type);
    if (!extension) throw new ValidationError('Use uma imagem JPEG, PNG ou WebP.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!matchesImageSignature(file.type, bytes)) {
      throw new ValidationError('O conteúdo do arquivo não corresponde ao formato informado.');
    }

    const key = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
    const bucket = getFilesBucket();
    await bucket.put(key, bytes, {
      httpMetadata: { contentType: file.type, cacheControl: 'private, max-age=3600' },
      customMetadata: { owner: user.id },
    });
    await getD1()
      .prepare('UPDATE users SET avatar_key = ?, updated_by = ?, updated_at = ? WHERE id = ?')
      .bind(key, user.id, Date.now(), user.id)
      .run();
    if (user.avatarKey && user.avatarKey !== key) await bucket.delete(user.avatarKey);
    await writeAudit(user.id, user.id, 'profile.avatar_updated');
    return NextResponse.json({ avatarUrl: `/api/avatar/${user.id}` });
  } catch (error) {
    return jsonError(error);
  }
}

function matchesImageSignature(type: string, bytes: Uint8Array) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (type === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}
