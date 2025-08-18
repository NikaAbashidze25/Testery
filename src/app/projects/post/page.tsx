
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
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';

const projectFormSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  location: z.string().min(2, 'Location is required.'),
  compensation: z.string().min(1, 'Compensation is required.'),
  type: z.string().min(3, 'Type is required (e.g. Full-time, Contract)'),
  description: z.string().min(50, 'Description must be at least 50 characters.'),
  skills: z.string().min(3, 'Please list at least one skill.'),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function PostProjectPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userAccountType, setUserAccountType] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserAccountType(userDocSnap.data().accountType);
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      skills: '',
      compensation: '',
      location: '',
      type: '',
    },
  });

  const onSubmit = async (data: ProjectFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to post a project.' });
        return;
    }
    if (userAccountType !== 'company') {
        toast({ variant: 'destructive', title: 'Invalid Account Type', description: 'Only company accounts can post projects.' });
        return;
    }

    setIsLoading(true);
    try {
        await addDoc(collection(db, 'projects'), {
            ...data,
            skills: data.skills.split(',').map(s => s.trim()),
            authorId: user.uid,
            companyName: user.displayName, // Assumes company name is stored in displayName for company accounts
            postedAt: serverTimestamp(),
        });
        toast({ title: 'Project Posted', description: 'Your project is now live.' });
        router.push('/projects');
    } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsLoading(false);
    }
  };

  if (!user || userAccountType === null) {
      return <div className="container py-12 text-center">Loading...</div>
  }
  
  if (userAccountType !== 'company') {
      return (
          <div className="container py-12 text-center">
              <Card className="max-w-md mx-auto">
                  <CardHeader>
                      <CardTitle>Access Denied</CardTitle>
                      <CardDescription>Only company accounts are allowed to post new projects. Testers can browse available projects.</CardDescription>
                  </CardHeader>
                  <CardContent>
                       <Button asChild>
                            <a href="/projects">Browse Projects</a>
                        </Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="container py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Post a New Testing Project</CardTitle>
          <CardDescription>Fill out the details below to find the perfect tester for your project.</CardDescription>
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
                      <Input placeholder="e.g., QA Tester for Mobile App" {...field} disabled={isLoading} />
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
                          <Input placeholder="e.g., Remote, New York" {...field} disabled={isLoading}/>
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
                          <Input placeholder="e.g., Full-time, Contract" {...field} disabled={isLoading}/>
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
                          <Input placeholder="e.g., $500, $75/hour" {...field} disabled={isLoading}/>
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
                        disabled={isLoading}
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
                      <Input placeholder="e.g., Cypress, Selenium, Manual Testing, API Testing" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormDescription>
                      Separate skills with commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" disabled={isLoading}>
                {isLoading ? 'Posting Project...' : 'Post Project'}
                </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
