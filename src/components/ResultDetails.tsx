import {AlertCircle,CheckCircle2,Info,RefreshCw} from 'lucide-react';
import type {RegistryResult,Row} from '../domain/types';
export function ResultDetails({row,lookup,onRetry,disabled}:{row:Row;lookup?:RegistryResult;onRetry:()=>void;disabled:boolean}) {
 const d=lookup?.data;
 return <div className="result-details" id={`details-${row.line}`}>
   <div className="details-heading"><h4>{row.valid?'How this identifier breaks down':'What needs fixing'}</h4><span>Input line {row.line}</span></div>
   {row.errors.length>0&&<ul className="issue-list">{row.errors.map(e=><li key={e.code}><AlertCircle size={16}/><span>{e.message}<small>Position {e.start}{e.end!==e.start?`–${e.end}`:''}</small></span></li>)}</ul>}
   {row.warnings.length>0&&<ul className="warning-list">{row.warnings.map(e=><li key={e.code}><Info size={16}/><span>{e.message}</span></li>)}</ul>}
   {row.segments.length>0&&<div className="segment-grid">{row.segments.map(s=><div key={s.label}><small>{s.label}</small><code>{s.value}</code><span>{s.meaning}</span><small>Position {s.start}{s.end!==s.start?`–${s.end}`:''}</small></div>)}</div>}
   <p className="provenance">Decoded from the identifier you entered. Valid format does not confirm registration or current company status.</p>
   {row.entity==='LLP'&&row.valid&&<p className="note"><Info size={16}/>An LLPIN does not encode its state or incorporation year. Registry lookup can supply these fields.</p>}
   {lookup&&lookup.state!=='not_checked'&&<section className="registry-details" aria-label="Registry details">
     <div className="details-heading"><h4>{lookup.state==='found'?<><CheckCircle2 size={16}/> Registry record</>:'Registry lookup'}</h4><span>FileSure sandbox</span></div>
     <p>{lookup.message}</p>
     {d&&<>
       <h4>{d.name}</h4>
       {d.identifier!==row.normalized&&<p className="note"><Info size={16}/>Registry resolved this input to <code>{d.identifier}</code>. The decoded values above describe the identifier submitted.</p>}
       <dl className="registry-grid">{[['Identifier',d.identifier],['State',d.state],['Incorporated',d.incorporated],['Type',d.companyType],['Listing',d.listing],['Status',d.status]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not returned'}</dd></div>)}</dl>
       <p className="provenance">Retrieved {lookup.retrievedAt?new Date(lookup.retrievedAt).toLocaleString():'just now'}{d.providerUpdatedAt?` · Provider record updated ${new Date(d.providerUpdatedAt).toLocaleString()}`:' · Provider record date not supplied'}</p>
     </>}
     {lookup.state!=='loading'&&<button className="text-button" disabled={disabled} onClick={onRetry}><RefreshCw size={15}/>{lookup.state==='found'?'Refresh record':'Retry lookup'}</button>}
   </section>}
   <a className="source-link" href="https://www.mospi.gov.in/sites/default/files/publication_reports/ASI/ASI_Manual_2022-23.pdf" target="_blank" rel="noreferrer">CIN format reference: Government of India ASI manual</a>
 </div>;
}
