
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';

const projectFormSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  location: z.string().min(2, 'Location is required.'),
  compensation: z.string().min(1, 'Compensation is required.'),
  type: z.string().min(3, 'Type is required (e.g. Full-time, Contract)'),
  description: z.string().min(50, 'Description must be at least 50 characters.'),
  skills: z.string().min(3, 'Please list at least one skill.'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const projectId = params.id as string;
  const [user, setUser] = useState<User | null>(null);
  const [project, setProject] = useState<DocumentData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {},
  });

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!projectId) return;

    const fetchProject = async () => {
        setIsLoading(true);
        const docRef = doc(db, 'projects', projectId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const projectData = docSnap.data();
            if (projectData.authorId !== auth.currentUser?.uid) {
                 toast({ variant: 'destructive', title: 'Unauthorized', description: "You don't have permission to edit this project." });
                 router.push('/projects');
                 return;
            }

            setProject(projectData);
            form.reset({
                ...projectData,
                skills: projectData.skills?.join(', '),
            });
        } else {
            toast({ variant: 'destructive', title: 'Not Found', description: "This project doesn't exist." });
            router.push('/projects');
        }
        setIsLoading(false);
    }
    fetchProject();
  }, [projectId, router, form, toast]);


  const onSubmit = async (data: ProjectFormValues) => {
    if (!user || !projectId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong. Please try again.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const projectDocRef = doc(db, 'projects', projectId);
        await updateDoc(projectDocRef, {
            ...data,
            skills: data.skills.split(',').map(s => s.trim()),
            updatedAt: serverTimestamp(),
        });
        toast({ title: 'Project Updated', description: 'Your project has been successfully updated.' });
        router.push(`/projects/${projectId}`);
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
        <div className="container py-12">
            <Card className="max-w-3xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-5 w-full" />
                </CardHeader>
                <CardContent className="space-y-8 pt-6">
                    <Skeleton className="h-10 w-full" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-32" />
                </CardContent>
            </Card>
        </div>
    )
  }
  
  return (
    <div className="container py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
          <CardDescription>Update the details below for your project.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., QA Tester for Mobile App" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Remote, New York" {...field} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                    <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Type</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Full-time, Contract" {...field} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="compensation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compensation</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., $500, $75/hour" {...field} disabled={isSubmitting}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Description & Acceptance Criteria</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project, tasks, and what defines a successful test..."
                        className="min-h-[200px]"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                     <FormDescription>
                      Clearly define the acceptance criteria for your project.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Skills</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cypress, Selenium, Manual Testing, API Testing" {...field} disabled={isSubmitting} />
                    </FormControl>
                    <FormDescription>
                      Separate skills with commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                  <Button type="button" size="lg" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                    Cancel
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
