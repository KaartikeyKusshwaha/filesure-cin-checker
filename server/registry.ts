import { z } from 'zod';
import { currentIndiaYear, normalize, validateIdentifier } from '../src/domain/checker';
import type { AppConfig, RegistryResult } from '../src/domain/types';
type Env=Record<string,string|undefined>;
const nullableText=z.string().nullish();
const recordSchema=z.object({
  companyName:nullableText,company:nullableText,llpName:nullableText,classOfCompany:nullableText,companyType:nullableText,
  dateOfIncorporation:nullableText,companyStatus:nullableText,llpStatus:nullableText,whetherListedOrNot:nullableText,
  MCAMDSCompanyAddress:z.array(z.object({addressType:nullableText,state:nullableText})).nullish(),
}).passthrough();
const envelope=z.object({data:z.object({
  cin:nullableText,llpin:nullableText,company:nullableText,
  masterData:z.object({companyData:recordSchema.optional(),llpData:recordSchema.optional()}),
}),meta:z.object({updatedAt:nullableText}).optional()});
const bodySchema=z.object({identifier:z.string().min(1).max(64)}).strict();
function keyAllowed(env:Env) {return /^fsk_test_[A-Za-z0-9_-]+$/.test(env.FILESURE_API_KEY??'');}
export function configuration(env:Env): AppConfig {
  const mode=keyAllowed(env)?'sandbox':'unconfigured';
  const samples=[...new Set((env.FILESURE_SANDBOX_SAMPLES??'L74110KA2013PLC096530,U74999HR2015FTC056386,ACK-2998,ACX-7976').split(',').map(normalize).filter(x=>validateIdentifier(x,currentIndiaYear()).valid))];
  return {mode,samples:mode==='sandbox'?samples:[],message:mode==='sandbox'?'Sandbox lookup covers FileSure’s supported sample records only.':'Registry lookup is not configured. Local checking works for every identifier.'};
}
function json(result:RegistryResult,status=200) {
  return Response.json(result,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
function dateValue(value:string|null|undefined):string|null {
  if(!value)return null;
  // Verified company master-data dates are MM/DD/YYYY, unlike filing dates.
  const mdy=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso=mdy?`${mdy[3]}-${mdy[1]}-${mdy[2]}`:value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
  const date=new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(date.getTime())&&date.toISOString().slice(0,10)===iso?iso:null;
}
async function limitedBody(request:Request):Promise<string|null> {
  if(Number(request.headers.get('content-length'))>1024)return null;
  const reader=request.body?.getReader();if(!reader)return '';
  const parts:Uint8Array[]=[];let size=0;
  while(true) {const part=await reader.read();if(part.done)break;size+=part.value.byteLength;
    if(size>1024){await reader.cancel();return null;}parts.push(part.value);}
  const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  return new TextDecoder().decode(bytes);
}
export async function handleLookup(request:Request,env:Env,fetcher:typeof fetch=fetch): Promise<Response> {
  if(request.method!=='POST')return json({state:'error',message:'Use POST for registry lookup.'},405);
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)return json({state:'error',message:'Cross-origin requests are not accepted.'},403);
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??''))return json({state:'error',message:'Send a JSON request.'},415);
  let parsed: z.infer<typeof bodySchema>;
  try {const raw=await limitedBody(request);if(raw===null)return json({state:'error',message:'Request exceeds 1 KiB.'},413);
    parsed=bodySchema.parse(JSON.parse(raw));
  } catch {return json({state:'error',message:'Send one identifier in a JSON object.'},400);}
  const identifier=normalize(parsed.identifier);
  if(!validateIdentifier(identifier,currentIndiaYear()).valid)return json({state:'error',message:'Correct the identifier format before looking it up.'},400);
  if(!keyAllowed(env))return json({state:'unavailable',message:'Registry lookup is not configured. Local checking is still available.'},503);
  try {
    const upstream=await fetcher(`https://api.filesure.in/v1/companies/${encodeURIComponent(identifier)}`,{
      headers:{Authorization:`Bearer ${env.FILESURE_API_KEY}`,Accept:'application/json'},signal:AbortSignal.timeout(10_000),redirect:'error',
    });
    const body:unknown=await upstream.json().catch(()=>null);
    if(!upstream.ok) {
      const error=z.object({error:z.object({code:z.string()})}).safeParse(body);
      if(error.success&&/SANDBOX.*(?:ONLY|NOT_ALLOWED|UNSUPPORTED|RESTRICTED|NOT_PERMITTED)/i.test(error.data.error.code))
        return json({state:'unsupported_in_sandbox',message:'This identifier is outside the sandbox sample set. Its local format result still applies.'});
      if(upstream.status===404)return json({state:'not_found',message:'No record was returned by the sandbox. This does not establish whether the identifier is registered.'});
      if([401,402,403].includes(upstream.status))return json({state:'unavailable',message:'The sandbox could not authorise this lookup. Check the test key and sample access.'},503);
      return json({state:'error',message:upstream.status===429?'The registry is rate-limiting requests. Try again later.':'The registry service is unavailable. Try again later.'},502);
    }
    const checked=envelope.safeParse(body);
    if(!checked.success)throw new Error('Incompatible provider data');
    const d=checked.data.data;const record=d.masterData.companyData??d.masterData.llpData;
    const resolved=d.cin??d.llpin;
    if(!record||!resolved||!validateIdentifier(resolved,currentIndiaYear()).valid)throw new Error('Missing registry record');
    const name=record.companyName||record.company||record.llpName||d.company||null;
    if(!name)throw new Error('Missing registry name');
    const address=record.MCAMDSCompanyAddress?.find(a=>a.addressType==='Registered Address');
    return json({state:'found',message:'Record returned by FileSure sandbox.',retrievedAt:new Date().toISOString(),data:{
      identifier:normalize(resolved),name,state:address?.state??null,incorporated:dateValue(record.dateOfIncorporation),
      companyType:record.classOfCompany||record.companyType||null,
      listing:validateIdentifier(resolved,currentIndiaYear()).entity==='LLP'?'Not applicable':({Y:'Listed',N:'Unlisted',Listed:'Listed',Unlisted:'Unlisted'} as Record<string,string>)[record.whetherListedOrNot??'']??null,
      status:record.companyStatus||record.llpStatus||null,providerUpdatedAt:checked.data.meta?.updatedAt??null,
    }});
  } catch(error) {
    const timeout=typeof error==='object' && error!==null && 'name' in error && /timeout|abort/i.test(String(error.name));
    return json({state:'error',message:timeout?'Registry lookup timed out. Try again.':'A registry response could not be read. Local checking is still available.'},502);
  }
}
