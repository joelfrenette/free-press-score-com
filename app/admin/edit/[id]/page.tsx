import { notFound, redirect } from 'next/navigation';
import { checkIsAdmin } from '@/lib/admin-actions';
import { mediaOutlets } from '@/lib/mock-data';
import { OutletEditForm } from '@/components/outlet-edit-form';

interface EditOutletPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditOutletPage({ params }: EditOutletPageProps) {
  const isAdmin = await checkIsAdmin();
  
  if (!isAdmin) {
    redirect('/admin/login');
  }

  const { id } = await params;
  const outlet = mediaOutlets.find((o) => o.id === id);

  if (!outlet) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Edit: {outlet.name}</h1>
        <OutletEditForm outlet={outlet} />
      </div>
    </main>
  );
}
