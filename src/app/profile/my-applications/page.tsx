
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Inbox, FileText, Clock, CheckCircle, XCircle, MessageSquare, Upload } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Application extends DocumentData {
    id: string;
    projectTitle: string;
    projectId: string;
    status: 'pending' | 'accepted' | 'declined';
    appliedAt: {
        seconds: number;
        nanoseconds: number;
    };
    isApproved?: boolean;
    hasSubmission?: boolean;
}

const getStatusBadge = (status: Application['status']) => {
    switch (status) {
        case 'pending':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
        case 'accepted':
            return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
        case 'declined':
            return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="mr-1 h-3 w-3" />Declined</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const formatAppliedDate = (timestamp: Application['appliedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
};

const ApplicationCard = ({ app }: { app: Application }) => (
    <Card key={app.id} className="flex flex-col">
        <CardHeader>
            <CardTitle>{app.projectTitle}</CardTitle>
            <CardDescription>
                Applied {formatAppliedDate(app.appliedAt)}
            </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {app.isApproved ? (
                    <Badge variant="success"><CheckCircle className="mr-1 h-3 w-3" />Approved & Completed</Badge>
                ) : getStatusBadge(app.status)}
            </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
           <Button asChild variant="outline">
             <Link href={`/projects/${app.projectId}`}>View Project</Link>
          </Button>
          {app.status === 'accepted' && (
            <div className="flex gap-2">
                {app.hasSubmission ? (
                     <Button asChild variant="outline">
                       <Link href={`/project/${app.projectId}/submission/${app.id}`}>
                           View Submission
                       </Link>
                   </Button>
                ) : (
                     <Button asChild>
                       <Link href={`/project/${app.projectId}/submission/${app.id}`}>
                           <Upload className="mr-2 h-4 w-4" />
                           Submit Work
                       </Link>
                   </Button>
                )}
                <Button asChild>
                   <Link href={`/chat/${app.id}`}>
                       <MessageSquare className="mr-2 h-4 w-4" />
                       Chat
                   </Link>
               </Button>
            </div>
          )}
        </CardFooter>
    </Card>
);

export default function MyApplicationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [wipApplications, setWipApplications] = useState<Application[]>([]);
  const [pendingApplications, setPendingApplications] = useState<Application[]>([]);
  const [archivedApplications, setArchivedApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (user) {
      const fetchApplications = async () => {
        setIsLoading(true);
        try {
          const appsCollection = collection(db, 'applications');
          const q = query(appsCollection, where('testerId', '==', user.uid));
          const querySnapshot = await getDocs(q);

          const appsDataPromises = querySnapshot.docs.map(async (appDoc) => {
              const appData = { id: appDoc.id, ...appDoc.data() } as Application;
              
              const submissionsRef = collection(db, 'applications', appDoc.id, 'submissions');
              const submissionSnapshot = await getDocs(query(submissionsRef));
              appData.hasSubmission = !submissionSnapshot.empty;

              return appData;
          });

          const appsData = await Promise.all(appsDataPromises);
          
          const wip: Application[] = [];
          const pending: Application[] = [];
          const archived: Application[] = [];

          appsData.forEach(app => {
            if (app.isApproved) {
              archived.push(app);
            } else if (app.status === 'accepted') {
              wip.push(app);
            } else if (app.status === 'pending') {
              pending.push(app);
            } else { // declined
              archived.push(app);
            }
          });

          const sortByDate = (a: Application, b: Application) => b.appliedAt.seconds - a.appliedAt.seconds;
          setWipApplications(wip.sort(sortByDate));
          setPendingApplications(pending.sort(sortByDate));
          setArchivedApplications(archived.sort(sortByDate));
          
        } catch (error) {
          console.error("Error fetching user's applications: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchApplications();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="container py-12">
        <Skeleton className="h-10 w-32 mb-8" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-5 w-64 mb-8" />
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-24" />
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Skeleton className="h-10 w-28" />
                    </CardFooter>
                </Card>
            ))}
        </div>
      </div>
    );
  }

  const noApplications = wipApplications.length === 0 && pendingApplications.length === 0 && archivedApplications.length === 0;

  return (
    <div className="container py-12">
        <div className="mb-6">
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
        </div>
        <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline">My Applications</h1>
                <p className="text-muted-foreground">Track the status of all your project applications.</p>
            </div>
             <Button asChild>
                <Link href="/projects">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse More Projects
                </Link>
            </Button>
      </div>

      {noApplications ? (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">You Haven't Applied for Any Projects Yet</CardTitle>
                <CardDescription>Click the button above to browse available projects.</CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={['wip', 'pending']} className="w-full space-y-6">
            
            {wipApplications.length > 0 && (
                <AccordionItem value="wip" className="border rounded-lg p-4 bg-background">
                    <AccordionTrigger className="text-xl font-semibold hover:no-underline py-2">Work In Progress ({wipApplications.length})</AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                            {wipApplications.map(app => <ApplicationCard key={app.id} app={app} />)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            )}

            {pendingApplications.length > 0 && (
                <AccordionItem value="pending" className="border rounded-lg p-4 bg-background">
                    <AccordionTrigger className="text-xl font-semibold hover:no-underline py-2">Pending Applications ({pendingApplications.length})</AccordionTrigger>
                    <AccordionContent className="pt-4">
                         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                            {pendingApplications.map(app => <ApplicationCard key={app.id} app={app} />)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            )}

            {archivedApplications.length > 0 && (
                 <AccordionItem value="archived" className="border rounded-lg p-4 bg-background">
                    <AccordionTrigger className="text-xl font-semibold hover:no-underline py-2">Archived Applications ({archivedApplications.length})</AccordionTrigger>
                    <AccordionContent className="pt-4">
                        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
                            {archivedApplications.map(app => <ApplicationCard key={app.id} app={app} />)}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            )}

        </Accordion>
      )}
    </div>
  );
}
