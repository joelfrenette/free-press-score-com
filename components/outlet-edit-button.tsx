'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OutletEditButtonProps {
  outletId: string;
  isAdmin: boolean;
}

export function OutletEditButton({ outletId, isAdmin }: OutletEditButtonProps) {
  const router = useRouter();
  
  if (!isAdmin) return null;

  return (
    <Button
      onClick={() => router.push(`/admin/edit/${outletId}`)}
      className="gap-2"
    >
      <Pencil className="h-4 w-4" />
      Edit
    </Button>
  );
}
