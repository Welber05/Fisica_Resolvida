import { getFilesBucket } from '@/db';
import { getUserById, requireApiUser } from '@/lib/user-service';
import { jsonError } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const { user: requester } = await requireApiUser({ allowIncomplete: true });
    const { userId } = await context.params;
    if (requester.id !== userId && !['admin', 'manager'].includes(requester.role)) {
      return new Response(null, { status: 403 });
    }
    const user = await getUserById(userId);
    if (!user?.avatarKey) return new Response(null, { status: 404 });
    const object = await getFilesBucket().get(user.avatarKey);
    if (!object) return new Response(null, { status: 404 });
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'private, max-age=3600');
    return new Response(object.body, { headers });
  } catch (error) {
    return jsonError(error);
  }
}
