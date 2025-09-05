
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
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const projectFormSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  location: z.string().min(2, 'Location is required.'),
  rewardType: z.enum(['monetary', 'service'], { required_error: 'You must select a reward type.' }),
  compensation: z.string().min(1, 'A reward value or description is required.'),
  type: z.string().min(3, 'Type is required (e.g. Full-time, Contract)'),
  description: z.string().min(50, 'Description must be at least 50 characters.'),
  skills: z.string().min(3, 'Please list at least one skill.'),
}).refine(data => {
    if (data.rewardType === 'monetary') {
        return !isNaN(parseFloat(data.compensation)) && parseFloat(data.compensation) > 0;
    }
    return true;
}, {
    message: 'Monetary reward must be a positive number.',
    path: ['compensation'],
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function PostProjectPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/login');
      }
      setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      title: '',
      description: '',
      skills: '',
      rewardType: 'monetary',
      compensation: '',
      location: '',
      type: '',
    },
  });

  const rewardType = form.watch('rewardType');

  const onSubmit = async (data: ProjectFormValues) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to post a project.' });
        return;
    }

    setIsLoading(true);
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        let posterName = user.displayName; 
        if(userDocSnap.exists()) {
          const userData = userDocSnap.data();
          posterName = userData.companyName || userData.fullName;
        }

        const compensationValue = data.rewardType === 'monetary' 
            ? parseFloat(data.compensation) 
            : data.compensation;

        await addDoc(collection(db, 'projects'), {
            ...data,
            compensation: compensationValue,
            skills: data.skills.split(',').map(s => s.trim()),
            authorId: user.uid,
            companyName: posterName, 
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

  if (isCheckingAuth) {
      return <div className="container py-12 text-center">Loading...</div>
  }
  
  return (
    <div className="container py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Post a New Testing Project</CardTitle>
              <CardDescription>Fill out the details below to find the perfect tester for your project.</CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href="/profile/my-projects">
                    <FileText className="mr-2 h-4 w-4" />
                    My Posted Projects
                </Link>
            </Button>
          </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                </div>
                
                <FormField
                    control={form.control}
                    name="rewardType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Reward Type</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="monetary" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Monetary Reward
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="service" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                    Service / Voucher
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
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
                        <FormLabel>
                          {rewardType === 'monetary' ? 'Reward Amount ($)' : 'Reward Description'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type={rewardType === 'monetary' ? 'number' : 'text'}
                            step={rewardType === 'monetary' ? '0.01' : undefined}
                            placeholder={rewardType === 'monetary' ? 'e.g., 500' : 'e.g., $20 Amazon Voucher'} 
                            {...field} 
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                />


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
