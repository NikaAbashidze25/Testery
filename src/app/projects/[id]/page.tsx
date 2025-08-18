
'use client';

import { useParams } from 'next/navigation';

export default function ProjectDetailPage() {
  const { id } = useParams();

  return (
    <div className="container py-12">
      <h1 className="text-4xl font-bold">Project Detail Page</h1>
      <p className="text-lg text-muted-foreground">Details for project with ID: {id}</p>
    </div>
  );
}
