// Shared contracts imported by apps/api, apps/web, and the eval runner.
// PRD §7.1 (answer format), §11.5 (tool contract), EC-8 (structured output).

export interface SourceRef {
  /** Tool name from the tool contract, e.g. `transaction.get_history` */
  toolName: string;
  /** Query or filter actually executed by the tool */
  query: string;
  /** ISO timestamp of retrieval */
  retrievedAt: string;
  /** Link to the origin system when one exists */
  originLink?: string;
}

export type DataStatus = 'complete' | 'partial' | 'unavailable';

export interface Claim {
  text: string;
  /** ID of a SourceRef produced by a tool call in the same execution (EC-1, EC-8) */
  sourceRefId: string;
}

export interface Hypothesis {
  text: string;
  supportingEvidence: Claim[];
  missingEvidence: string[];
}

/** Standard answer format, PRD §7.1 */
export interface StandardAnswer {
  ringkasan: string;
  temuan: Claim[];
  dugaanPenyebab?: Hypothesis;
  langkahBerikut: string[];
  sumber: SourceRef[];
  statusData: DataStatus;
}

export type SideEffect = 'read' | 'write' | 'external_message';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ApprovalPolicy = 'none' | 'user_confirmation' | 'user_approval' | 'two_person';

/** Tool contract, PRD §11.5 */
export interface ToolContract {
  name: string;
  version: string;
  platform: 'business' | 'intelligence' | 'engineering' | 'core';
  description: string;
  sideEffect: SideEffect;
  riskLevel: RiskLevel;
  requiredPermission: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  piiFields: string[];
  timeoutMs: number;
  idempotent: boolean;
  approvalPolicy: ApprovalPolicy;
}

export type UserRole =
  | 'org_admin'
  | 'workspace_admin'
  | 'agent_builder'
  | 'member'
  | 'viewer_auditor';

/** PRD §11.2 layer 3: data scope, a mandatory query parameter, not a post-filter. */
export interface DataScope {
  regions: string[];
}
