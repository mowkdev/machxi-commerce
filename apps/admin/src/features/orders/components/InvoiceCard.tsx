import { IconDownload, IconFileInvoice } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDownloadInvoice, useOrderInvoice } from "../hooks";

interface InvoiceCardProps {
  orderId: string;
}

export function InvoiceCard({ orderId }: InvoiceCardProps) {
  const { data: invoiceResponse, isLoading } = useOrderInvoice(orderId);
  const downloadMutation = useDownloadInvoice();

  // Response may be 404 when no invoice exists — useAdminGetInvoiceByOrder
  // returns undefined on error since retry: false.
  const invoice = invoiceResponse?.data;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!invoice) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IconFileInvoice className="size-5" />
            Invoice
          </CardTitle>
          <CardDescription>
            No invoice has been generated for this order yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <IconFileInvoice className="size-5" />
            Invoice
          </CardTitle>
          <Badge
            variant={invoice.status === "issued" ? "default" : "secondary"}
            className="capitalize"
          >
            {invoice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Number</span>
            <p className="font-medium">{invoice.invoiceNumber}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date</span>
            <p className="font-medium">
              {new Date(invoice.invoiceDate).toLocaleDateString()}
            </p>
          </div>
        </div>
        {invoice.status === "issued" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate(invoice.id)}
          >
            <IconDownload className="mr-2 size-4" />
            {downloadMutation.isPending ? "Preparing..." : "Download PDF"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
