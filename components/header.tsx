'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchDialog } from '@/components/search-dialog';

export function Header() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a 
            href="https://free-press-scores.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3"
          >
            <Image 
              src="/logo.png" 
              alt="Free Press Score Logo" 
              width={40} 
              height={40}
              className="h-10 w-10"
              priority
            />
            <span className="text-xl font-bold tracking-tight">
              Free-Press-Scores.com
            </span>
          </a>
          
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/methodology"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Methodology
            </Link>
            <Link
              href="/compare"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Compare
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/admin"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Admin
            </Link>
          </nav>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="hidden md:inline">Search outlets</span>
            <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </div>
      </header>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
