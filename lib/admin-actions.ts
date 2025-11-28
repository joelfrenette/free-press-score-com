'use server'

import { cookies } from 'next/headers';

export async function checkScrapingBeeApiKey(): Promise<boolean> {
  return !!process.env.SCRAPINGBEE_API_KEY;
}

export async function checkIsAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get('admin-authenticated');
  return adminCookie?.value === 'true';
}

export async function loginAdmin(password: string): Promise<boolean> {
  // Simple password check - in production, use proper authentication
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password === ADMIN_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set('admin-authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    return true;
  }
  
  return false;
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('admin-authenticated');
}
