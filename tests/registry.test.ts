import { describe, expect, it } from 'vitest';
import { configuration, handleLookup } from '../server/registry';
const id='U74999HR2015FTC056386';
const request=(body:unknown,headers:Record<string,string>={})=>new Request('https://checker.example/api/lookup',{method:'POST',headers:{'content-type':'application/json',origin:'https://checker.example',...headers},body:JSON.stringify(body)});
const env={FILESURE_API_KEY:'fsk_test_fixture'};
const fixture={data:{cin:id,company:'CARS24 SERVICES PRIVATE LIMITED',masterData:{companyData:{companyName:'CARS24 SERVICES PRIVATE LIMITED',classOfCompany:'Private',dateOfIncorporation:'02/02/2015',companyStatus:'Active'}}}};
describe('registry proxy',()=>{
  it('uses the verified MM/DD/YYYY contract, Y/N listing, and provider freshness',async()=>{
    const body={data:{cin:id,company:'CARS24 SERVICES PRIVATE LIMITED',masterData:{companyData:{CIN:id,company:'CARS24 SERVICES PRIVATE LIMITED',companyType:'Company',classOfCompany:'Private',dateOfIncorporation:'08/12/2015',whetherListedOrNot:'N',llpStatus:'Active',MCAMDSCompanyAddress:[{addressType:'Registered Address',state:'Haryana'}]}}},meta:{updatedAt:'2026-11-16T08:00:58.449Z',priceChargedPaisa:0}};
    const r=await (await handleLookup(request({identifier:id}),env,async()=>Response.json(body))).json();
    expect(r.data).toMatchObject({incorporated:'2015-08-12',listing:'Unlisted',state:'Haryana',status:'Active',providerUpdatedAt:'2026-11-16T08:00:58.449Z'});
  });
  it('reads the verified LLP companyData envelope and late-month dates',async()=>{
    const body={data:{cin:'ACX-7976',company:'ZALPE FOOD & BEVERAGES LLP',masterData:{companyData:{CIN:'ACX-7976',companyType:'LLP',classOfCompany:'',dateOfIncorporation:'04/28/2026',whetherListedOrNot:'N',llpStatus:'Active'}}}};
    const r=await (await handleLookup(request({identifier:'ACX-7976'}),env,async()=>Response.json(body))).json();
    expect(r.data).toMatchObject({incorporated:'2026-04-28',listing:'Not applicable',companyType:'LLP'});
  });
  it('recognises the verified SANDBOX_ONLY restriction',async()=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>Response.json({error:{code:'SANDBOX_ONLY'}},{status:403}));
    expect((await r.json()).state).toBe('unsupported_in_sandbox');
  });
  it('fails closed without a key or with a paid key',async()=>{
    expect(configuration({}).mode).toBe('unconfigured');
    expect(configuration({FILESURE_API_KEY:'fsk_live_private'}).mode).toBe('unconfigured');
    const r=await handleLookup(request({identifier:id}),{});
    expect(r.status).toBe(503); expect((await r.json()).state).toBe('unavailable');
  });
  it('exposes only configured valid sample identifiers and no key',()=>{
    const c=configuration({...env,FILESURE_SANDBOX_SAMPLES:`${id},AAA-1234,invalid`});
    expect(c.samples).toEqual([id,'AAA-1234']);expect(JSON.stringify(c)).not.toContain('fsk_test');
  });
  it('normalises published company data without sending raw fields to the browser',async()=>{
    const fake=async(url: string|URL|Request,options?:RequestInit)=>{
      expect(String(url)).toBe(`https://api.filesure.in/v1/companies/${id}`);
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer fsk_test_fixture');
      return new Response(JSON.stringify({...fixture,secret:'not for client'}));
    };
    const response=await handleLookup(request({identifier:id}),env,fake as typeof fetch);
    const r=await response.json();
    expect(r.state).toBe('found');expect(r.data).toMatchObject({identifier:id,name:'CARS24 SERVICES PRIVATE LIMITED',incorporated:'2015-02-02',status:'Active',state:null});
    expect(r.retrievedAt).toBeTruthy();expect(JSON.stringify(r)).not.toContain('secret');
  });
  it.each([[404,'not_found'],[401,'unavailable'],[429,'error'],[500,'error']])('separates upstream %i from format validity',async(status,state)=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>new Response('{}',{status}));
    expect((await r.json()).state).toBe(state);
  });
  it('recognises sandbox restriction only from an explicit provider code',async()=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>new Response(JSON.stringify({error:{code:'SANDBOX_NOT_ALLOWED',message:'secret'}}),{status:403}));
    expect((await r.json()).state).toBe('unsupported_in_sandbox');
  });
  it.each(['not json','{}','{"data":{"cin":"wrong","masterData":{}}}'])('rejects incompatible provider response %s',async(body)=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>new Response(body));expect((await r.json()).state).toBe('error');
  });
  it('preserves resolved identity and handles incomplete optional fields',async()=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>new Response(JSON.stringify({data:{cin:'L17110MH1973PLC019786',masterData:{companyData:{companyName:'RENAMED COMPANY'}}}})));
    const v=await r.json();expect(v.data.identifier).toBe('L17110MH1973PLC019786');expect(v.data.incorporated).toBeNull();
  });
  it('sanitises network errors',async()=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>{throw new Error('fsk_test_private')});
    const body=await r.text();expect(body).toContain('error');expect(body).not.toContain('fsk_test');
  });
  it('handles an aborted upstream timeout without changing syntax validity',async()=>{
    const r=await handleLookup(request({identifier:id}),env,async()=>{throw new DOMException('timeout','TimeoutError')});
    expect((await r.json()).message).toMatch(/timed out/i);
  });
  it('rejects malformed, oversized and cross-origin requests',async()=>{
    expect((await handleLookup(request({identifier:'bad'}),env)).status).toBe(400);
    expect((await handleLookup(request({identifier:id,extra:'a'.repeat(1025)}),env)).status).toBe(413);
    expect((await handleLookup(request({identifier:id},{origin:'https://evil.example'}),env)).status).toBe(403);
    expect((await handleLookup(new Request('https://checker.example/api/lookup'),env)).status).toBe(405);
    expect((await handleLookup(request({identifier:id},{'content-type':'text/plain'}),env)).status).toBe(415);
    expect((await handleLookup(request({identifier:id,extra:'unexpected'}),env)).status).toBe(400);
  });
});
