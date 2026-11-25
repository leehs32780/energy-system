import { Dashboard } from '@/features/dashboard/Dashboard';
import { WorkflowPanel } from '@/features/workflow/WorkflowPanel';
import { VerificationPanel } from '@/features/verifications/VerificationPanel';
import { AccountShell } from '@/features/account/AccountShell';
export default function Page() { return <AccountShell><Dashboard /><WorkflowPanel /><VerificationPanel /></AccountShell>; }
