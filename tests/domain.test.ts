import { describe, expect, it } from "vitest";
import { checkBatch, validateIdentifier } from "../src/domain/checker";

const cin = "L17110MH1973PLC019786";
describe("identifier validation", () => {
  it.each(['FAA-1234','FLL-1234','LLP-1234'])('accepts structurally valid overlapping LLP series %s',id=>{
    const result=validateIdentifier(id,2026);expect(result.valid).toBe(true);expect(result.entity).toBe('LLP');
  });
  it('recognises truncated CINs and pinpoints corrupt characters',()=>{
    const truncated=validateIdentifier('L17110MH1973',2026);expect(truncated.entity).toBe('Company');expect(truncated.errors[0].message).toMatch(/21/);
    expect(validateIdentifier('AAA-\t1234',2026).errors[0]).toMatchObject({code:'internal_space',start:5,end:5});
    expect(validateIdentifier('AAA–1234',2026).errors[0]).toMatchObject({code:'non_ascii',start:4,end:4});
    expect(validateIdentifier('AAA-12\u200b34',2026).errors[0]).toMatchObject({code:'non_ascii',start:7,end:7});
    expect(validateIdentifier('AAA-1234,BBB-1234',2026).errors[0]).toMatchObject({code:'separator',start:9,end:9});
  });
  it("decodes the assignment CIN without confusing public with listed", () => {
    const r = validateIdentifier(cin, 2026);
    expect(r.valid).toBe(true);
    expect(r.decoded).toMatchObject({
      listing: "Listed",
      state: "Maharashtra",
      year: "1973",
      companyType: "Public limited company",
      industry: "17110",
      registration: "019786",
    });
    expect(
      validateIdentifier("U17110MH1973PLC019786", 2026).decoded.listing,
    ).toBe("Unlisted");
  });
  it.each([
    ["OPC", "One-person company"],
    ["GOI", "Central government company"],
    ["SGC", "State government company"],
    ["PTC", "Private limited company"],
    ["NPL", "Not-for-profit company (Section 8 / former Section 25)"],
    ["FLC", "Public company with foreign ownership"],
    ["FTC", "Private company with foreign ownership"],
    ["GAP", "Public company limited by guarantee"],
    ["GAT", "Private company limited by guarantee"],
    ["ULL", "Public company with unlimited liability"],
    ["ULT", "Private company with unlimited liability"],
  ])("recognises ownership code %s", (code, label) => {
    expect(
      validateIdentifier(`U17110MH1973${code}019786`, 2026).decoded.companyType,
    ).toBe(label);
  });
  it.each([
    ["PN", "Maharashtra"],
    ["OR", "Odisha"],
    ["UR", "Uttarakhand"],
    ["TG", "Telangana"],
    ["TS", "Telangana"],
    ["CT", "Chhattisgarh"],
  ])("supports registry/legacy state code %s", (code, state) => {
    const r = validateIdentifier(`U17110${code}1973PTC019786`, 2026);
    expect(r.decoded.state).toBe(state);
    expect(r.warnings).toEqual([]);
  });
  it("warns about unknown alphabetic codes without inventing invalidity", () => {
    const r = validateIdentifier("U17110ZZ1973XYZ019786", 2026);
    expect(r.valid).toBe(true);
    expect(r.warnings).toHaveLength(2);
    expect(r.decoded.state).toBeNull();
  });
  it("accepts LLPs without fabricating their state or year", () => {
    const r = validateIdentifier("AAA-1234", 2026);
    expect(r.valid).toBe(true);
    expect(r.entity).toBe("LLP");
    expect(r.decoded).toMatchObject({
      state: null,
      year: null,
      listing: "Not applicable",
      companyType: "Limited Liability Partnership",
    });
  });
  it.each(["AAA1234", "AAA_1234", "AA1-1234", "AAA-12A4", "AAAA-1234"])(
    "reports malformed LLP %s",
    (input) => {
      const r = validateIdentifier(input, 2026);
      expect(r.valid).toBe(false);
      expect(r.errors.length).toBeGreaterThan(0);
    },
  );
  it("reports multiple independent segment errors with positions", () => {
    const r = validateIdentifier("X17A10M119A3P1C01978A", 2026);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(5);
    expect(r.errors.some((e) => e.start === 9 && e.end === 12)).toBe(true);
  });
  it.each(["0000", "2027"])("rejects impossible year %s", (year) =>
    expect(validateIdentifier(`U17110MH${year}PTC019786`, 2026).valid).toBe(
      false,
    ),
  );
  it.each(["1863", "2026"])("accepts past/current year %s", (year) =>
    expect(validateIdentifier(`U17110MH${year}PTC000000`, 2026).valid).toBe(
      true,
    ),
  );
  it("preserves unsupported industry codes and registration leading zeros", () => {
    expect(
      validateIdentifier("U00000MH2000PTC000001", 2026).decoded,
    ).toMatchObject({ industry: "00000", registration: "000001" });
  });
  it.each([
    "L17110MH1973PLC01978",
    "L17110MH1973PLC0197860",
    "L17110MH1973 PLC019786",
    "Ｌ17110MH1973PLC019786",
    "AAA–1234",
    "AAA-12\u200b34",
    "ßA-1234",
    "AAA-1234,L17110MH1973PLC019786",
  ])("rejects corrupted input %s", (input) =>
    expect(validateIdentifier(input, 2026).valid).toBe(false),
  );
  it("normalises only ASCII case and surrounding whitespace", () => {
    const r = validateIdentifier("  l17110mh1973plc019786  ", 2026);
    expect(r.normalized).toBe(cin);
    expect(r.valid).toBe(true);
  });
  it("explains foreign identifiers are unsupported", () =>
    expect(validateIdentifier("F07077", 2026).errors[0].message).toMatch(
      /foreign|unsupported/i,
    ));
});
describe("batch checking", () => {
  it("preserves physical lines, raw input, duplicates and blank count", () => {
    const r = checkBatch(
      `\r\n  ${cin.toLowerCase()}  \r\n \rAAA-1234\n${cin}`,
      2026,
    );
    expect(r.rows.map((x) => x.line)).toEqual([2, 4, 5]);
    expect(r.ignoredBlankLines).toBe(2);
    expect(r.rows[2].duplicateOf).toBe(2);
    expect(r.rows[0].raw).toContain("  ");
  });
  it("accepts exactly 500, rejects 501 without partial results", () => {
    expect(checkBatch(Array(500).fill(cin).join("\n"), 2026).rows).toHaveLength(
      500,
    );
    const r = checkBatch(Array(501).fill(cin).join("\n"), 2026);
    expect(r.error).toMatch(/500/);
    expect(r.rows).toHaveLength(0);
  });
  it("rejects more than 100 KiB in bytes and an empty batch", () => {
    expect(checkBatch("é".repeat(51201), 2026).error).toMatch(/100/);
    expect(checkBatch(" \n\r\n", 2026).error).toMatch(/at least one/i);
  });
});
