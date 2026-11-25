# Format and API research

Reviewed 25 November 2026. Structural correctness and registration are different questions. The reference table is deliberately extensible, and unknown alphabetic codes produce warnings.

## Sources

1. [Government of India ASI manual, 2022–23](https://www.mospi.gov.in/sites/default/files/publication_reports/ASI/ASI_Manual_2022-23.pdf), section 3.3.3, CIN structure and ownership-code list. The six segments are listing/industry/state/year/ownership/registration. Government and foreign-ownership codes are kept distinct from public/private and listing status.
2. [Government ASI manual, older complete ownership list](https://des.delhi.gov.in/sites/default/files/DES/generic_multiple_files/asi_instruction_manual_1.pdf), section 3.3.3: ULL, ULT, GAP, GAT and NPL. NPL retains the historical Section 25 reference alongside Section 8 terminology; it is not a claim about current charitable registration.
3. [MCA incorporation FAQs](https://www.mca.gov.in/content/mca/global/en/help-faq/faqs/company-services/incorporation/spiceplus-linked-filings.html): NIC-2008 changes mean membership in a single modern classification is not a safe validation rule for all historical CINs.
4. [MCA OPC records](https://www.mca.gov.in/Ministry/pdf/ListofDisqualifiedDirectors_19112019.pdf): an actual `U25199KA2015OPC083806` identifier demonstrates OPC usage. Registration status in that historical publication is not used by this checker.
5. [MCA company register, 2004](https://www.mca.gov.in/Ministry/pdf/llpreg_2004.pdf): OR appears for Odisha, PN appears for Pune ROC registrations in Maharashtra. Example: `U62100PN2004PTC019045`. PN is not interpreted as Punjab.
6. [MCA chit fund register](https://www.mca.gov.in/Ministry/pdf/Chit_Fund_Companies_6nov2008.pdf): `U65992UR2001PTC026024` demonstrates UR/Uttaranchal, now Uttarakhand.
7. [MCA June 2014 newsletter](https://www.mca.gov.in/Ministry/pdf/Monthly_Newsletter_June_2014.pdf): Telangana company CINs changed from AP to TG. The current FileSure coverage page also shows TS in a 2026 record. Both are supported; no automatic change to the supplied identifier is made.
8. [MCA LLP register, 2012](https://www.mca.gov.in/Ministry/pdf/List%20of%20LLPs-2012.pdf): LLPINs and registration dates appear separately; no derivation of state/year from the series is supported.
9. [MCA registered-office instruction kit](https://www.mca.gov.in/MCA21/dca/help/instructionkit/NCA/Form_INC-22_help.pdf): CINs may change when offices move. Encoded state is the state indicated by the submitted CIN, not a guaranteed current address.
10. [FileSure OpenAPI specification](https://api.filesure.in/portal/openapi-public.yaml), [pricing](https://api.filesure.in/pricing.html), and [sandbox](https://api.filesure.in/v1/sandbox). Native Node HTTP requests successfully accessed these when the text browsing tool could not load the docs route.

The baseline state table uses Indian state/UT names and established CIN abbreviations. OR, UR, TG, CT and PN are retained; TS/CG are also recognised. Merged-territory codes DD/DN are labelled legacy. The table is not asserted to exhaust every historical registry code. Unlisted codes remain structurally valid with a verification warning. Source-linked, confirmed edge cases have dedicated regression tests.

## Verified API contract

Native authenticated sandbox calls succeeded for Swiggy, Cars24, ACK-2998 and ACX-7976. Each returned `priceChargedPaisa: 0`. `/v1/sandbox` listed 52 company/LLP records, including two LLPs.

- Endpoint: `GET /v1/companies/{cinOrLlpin}`; auto-detection means no `idType` query parameter is required.
- Authentication: `Authorization: Bearer <test key>`.
- Identity: `data.cin`, name: `data.company` and `data.masterData.companyData.company`.
- Both company and LLP master data use `data.masterData.companyData`.
- Incorporation dates: **MM/DD/YYYY**. OpenAPI explicitly distinguishes this from filing dates, which use DD/MM/YYYY.
- Listing values: `Y` / `N`; LLP equity listing is presented as not applicable.
- Status: observed in `llpStatus` for both entity types.
- Registered state: `MCAMDSCompanyAddress` entry whose `addressType` is `Registered Address`.
- Record freshness: `meta.updatedAt`; request time is separately recorded.
- A non-whitelisted identifier returns HTTP 403 with `error.code: SANDBOX_ONLY`. This is not a declaration of invalidity or non-registration.

The real Cars24 incorporation date was `08/12/2015` (12 August 2015). Swiggy returned `12/26/2013` and ACX-7976 returned `04/28/2026`; those unambiguous dates exposed a DD/MM interpretation error in the first adapter. Regression tests now pin the actual source format.
