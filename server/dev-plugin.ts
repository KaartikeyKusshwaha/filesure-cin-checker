import type { Plugin } from 'vite';
import { configuration, handleLookup } from './registry';
export function apiPlugin(env:Record<string,string>):Plugin {
  return {name:'filesure-local-api',configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      if(!['/api/config','/api/lookup'].includes(req.url??'')){next();return;}
      let response:Response;
      if(req.url==='/api/config')response=Response.json(configuration({...process.env,...env}));
      else {
        const chunks:Buffer[]=[];let size=0;
        for await (const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>1024){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({state:'error',message:'Request exceeds 1 KiB.'}));return;}chunks.push(b);}
        const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(v)headers.set(k,Array.isArray(v)?v.join(','):v);
        const method=req.method??'GET';
        response=await handleLookup(new Request(`http://${req.headers.host}${req.url}`,{method,headers,...(!['GET','HEAD'].includes(method)?{body:Buffer.concat(chunks).toString()}: {})}),{...process.env,...env});
      }
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
    });
  }};
}
