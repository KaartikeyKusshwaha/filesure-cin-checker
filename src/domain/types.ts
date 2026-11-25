export type Entity = 'Company' | 'LLP' | 'Unknown';
export interface Issue { code: string; message: string; start: number; end: number }
export interface Segment { label: string; value: string; meaning: string; start: number; end: number }
export interface Decoded { listing: string | null; state: string | null; year: string | null; companyType: string | null; industry: string | null; registration: string | null }
export interface IdentifierResult {
  raw: string; normalized: string; entity: Entity; valid: boolean; errors: Issue[]; warnings: Issue[]; decoded: Decoded; segments: Segment[];
}
export interface Row extends IdentifierResult { line: number; duplicateOf: number | null }
export interface BatchResult { rows: Row[]; ignoredBlankLines: number; error: string | null }
export type RegistryState = 'not_checked' | 'loading' | 'found' | 'not_found' | 'unsupported_in_sandbox' | 'unavailable' | 'error';
export interface RegistryData {
  identifier: string; name: string | null; state: string | null; incorporated: string | null;
  companyType: string | null; listing: string | null; status: string | null; providerUpdatedAt: string | null;
}
export interface RegistryResult { state: RegistryState; message: string; data?: RegistryData; retrievedAt?: string }
export interface AppConfig { mode: 'sandbox' | 'unconfigured'; samples: string[]; message: string }
