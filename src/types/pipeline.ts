interface Lead {
  id: string;
  clientName: string;
  phone: string;
  email?: string | null;
  companyName?: string | null;
  dealValue: number | null;
  assignedUser: { name: string };
  stage: string;
}

interface PaymentSnapshot {
  agreedAmount: number;
  totalPaid: number;
  remainingBalance: number;
  nextDuePaymentDate: string | null;
  nextInstallmentNumber: number | null;
}

interface StageDataEntry {
  id: string;
  stage: string;
  data: Record<string, any>;
}

interface StageEditContext {
  lead: Lead;
  stage: string;
  stageDataId?: string;
  initialData?: Record<string, any>;
}

export type { Lead, PaymentSnapshot, StageDataEntry, StageEditContext };
