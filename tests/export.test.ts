import { expect,it } from 'vitest';
import { checkBatch } from '../src/domain/checker';
import { exportCsv } from '../src/domain/export';
it('exports rows and registry provenance without losing zeros',()=>{
  const rows=checkBatch('L17110MH1973PLC019786\nAAA-1234',2026).rows;
  const csv=exportCsv(rows,{});
  expect(csv).toContain('019786');expect(csv).toContain('Not encoded in LLPIN');expect(csv.split('\r\n')).toHaveLength(3);
});
it('quotes special characters and neutralises spreadsheet formulas in untrusted text',()=>{
  const rows=checkBatch('=HYPERLINK("evil")\n+1234\n@SUM(1)\n-1234',2026).rows;
  const csv=exportCsv(rows,{});
  expect(csv).toContain("'=HYPERLINK");expect(csv).toContain("'+1234");expect(csv).toContain("'@SUM");expect(csv).toContain("'-1234");
});
