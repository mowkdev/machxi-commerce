'use client';

import { ChevronDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCart } from '@/providers/cart-provider';
import { useCurrency } from '@/providers/currency-provider';

export function CurrencySwitcher() {
  const { available, selectedCode, isLoading, setSelectedCode } = useCurrency();
  const { cart, switchCurrency } = useCart();
  const [pendingCode, setPendingCode] = React.useState<string | null>(null);
  const [isSwitching, setIsSwitching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const itemCount =
    cart?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;

  const handleChange = React.useCallback(
    async (next: string) => {
      if (next === selectedCode) return;

      // Confirm only when the cart actually has items the user would lose.
      if (cart && itemCount > 0) {
        setPendingCode(next);
        return;
      }

      // No items at risk — apply immediately.
      setIsSwitching(true);
      setError(null);
      try {
        if (cart) {
          await switchCurrency(next);
        } else {
          setSelectedCode(next);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch currency');
      } finally {
        setIsSwitching(false);
      }
    },
    [cart, itemCount, selectedCode, setSelectedCode, switchCurrency],
  );

  const confirmSwitch = React.useCallback(async () => {
    if (!pendingCode) return;
    setIsSwitching(true);
    setError(null);
    try {
      await switchCurrency(pendingCode);
      setPendingCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch currency');
    } finally {
      setIsSwitching(false);
    }
  }, [pendingCode, switchCurrency]);

  if (available.length <= 1) return null;

  return (
    <>
      <Select
        value={selectedCode}
        onValueChange={handleChange}
        disabled={isLoading || isSwitching}
      >
        <SelectTrigger className="h-9 w-[110px] gap-1 border-none bg-transparent px-2 text-sm font-medium hover:bg-accent">
          <SelectValue />
          <ChevronDown className="h-4 w-4 opacity-50" />
        </SelectTrigger>
        <SelectContent align="end">
          {available.map((c) => (
            <SelectItem key={c.code} value={c.code}>
              <span className="mr-2 text-muted-foreground">{c.symbol}</span>
              {c.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog
        open={pendingCode !== null}
        onOpenChange={(open) => {
          if (!open && !isSwitching) {
            setPendingCode(null);
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch currency to {pendingCode}?</DialogTitle>
            <DialogDescription>
              Your cart has {itemCount} item{itemCount === 1 ? '' : 's'} priced
              in {selectedCode}. Switching to {pendingCode} will empty the cart;
              you&apos;ll be able to re-add items at their {pendingCode} prices.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPendingCode(null);
                setError(null);
              }}
              disabled={isSwitching}
            >
              Keep {selectedCode}
            </Button>
            <Button onClick={confirmSwitch} disabled={isSwitching}>
              {isSwitching ? 'Switching…' : `Switch to ${pendingCode}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
