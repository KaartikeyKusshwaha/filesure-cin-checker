import { handleLookup } from '../server/registry.js';
export const maxDuration=15;
export function POST(request:Request):Promise<Response> {return handleLookup(request,process.env);}
