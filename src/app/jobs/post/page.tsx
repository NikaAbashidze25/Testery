'use client';

import { useState } from 'react';
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
import { analyzeJobDetails } from '@/ai/flows/job-detail-check';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const jobFormSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters.'),
  description: z.string().min(50, 'Description must be at least 50 characters.'),
  skills: z.string().min(3, 'Please list at least one skill.'),
  compensation: z.coerce.number().min(1, 'Compensation must be a positive number.'),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export default function PostJobPage() {
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: '',
      description: '',
      skills: '',
      compensation: 0,
    },
  });
  
  const jobDescription = form.watch('description');

  const handleAnalyze = async () => {
    setError(null);
    setAnalysisResult(null);
    if (!jobDescription || jobDescription.length < 50) {
        setError('Please provide a job description of at least 50 characters before analyzing.');
        return;
    }
    setIsAnalyzing(true);
    try {
      const result = await analyzeJobDetails({ jobDescription });
      setAnalysisResult(result.feedback);
    } catch (e) {
      setError('An error occurred while analyzing the job description. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = (data: JobFormValues) => {
    console.log(data);
    // Handle form submission
  };

  return (
    <div className="container py-12">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Post a New Testing Job</CardTitle>
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
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., QA Tester for Mobile App" {...field} />
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
                    <FormLabel>Job Description & Acceptance Criteria</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the project, tasks, and what defines a successful test..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                     <FormDescription>
                      Clearly define the acceptance criteria for your job. Use our AI assistant to get feedback.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-4">
                <Button type="button" variant="outline" onClick={handleAnalyze} disabled={isAnalyzing || !jobDescription || jobDescription.length < 50}>
                  {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Analyze Acceptance Criteria
                </Button>
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {analysisResult && (
                  <Alert>
                    <AlertTitle>AI Analysis Feedback</AlertTitle>
                    <AlertDescription>
                      <p className="whitespace-pre-wrap">{analysisResult}</p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Skills</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cypress, Selenium, Manual Testing, API Testing" {...field} />
                    </FormControl>
                    <FormDescription>
                      Separate skills with commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="compensation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compensation ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 500" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the total budget or hourly rate.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg">Post Job</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
