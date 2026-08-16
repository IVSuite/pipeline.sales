"use client";

import { ImportDialog } from "@/components/import/import-dialog";
import { CUSTOMER_IMPORT_CONFIG } from "@/lib/import/customer-import";

/**
 * Customers "Import data" dialog. Thin wrapper over the shared <ImportDialog>
 * with the customer field config — kept as its own export so the Customers page
 * import path (and behavior) is unchanged.
 */
export function ImportCustomersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <ImportDialog open={open} onClose={onClose} config={CUSTOMER_IMPORT_CONFIG} />;
}
