import { configuration } from '../server/registry.js';
export function GET():Response {return Response.json(configuration(process.env),{headers:{'Cache-Control':'no-store'}});}
