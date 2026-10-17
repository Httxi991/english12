import { env } from 'cloudflare:workers';
import { handleAccountRequest } from '../../../../server/api.mjs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handleAccountRequest(request, env);
export const POST = GET;
export const PUT = GET;
export const OPTIONS = GET;
