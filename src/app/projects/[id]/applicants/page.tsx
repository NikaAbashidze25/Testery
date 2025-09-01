
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, type DocumentData, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Inbox, Check, X, Clock, CheckCircle, XCircle, MessageSquare, FileText, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


interface Application extends DocumentData {
    id: string;
    testerId: string;
    status: 'pending' | 'accepted' | 'declined';
    appliedAt: {
        seconds: number;
        nanoseconds: number;
    };
    testerInfo?: {
        fullName: string;
        profilePictureUrl: string;
    };
    hasSubmission?: boolean;
}

export default function ProjectApplicantsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState('');
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const projectDocRef = doc(db, 'projects', projectId);
        const projectDoc = await getDoc(projectDocRef);
        if (projectDoc.exists() && projectDoc.data().authorId !== currentUser.uid) {
            toast({ variant: 'destructive', title: 'Unauthorized', description: "You are not the owner of this project."});
            router.push('/projects');
        } else if (projectDoc.exists()) {
            setProjectTitle(projectDoc.data().title);
        } else {
             toast({ variant: 'destructive', title: 'Not Found', description: "Project not found."});
             router.push('/projects');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router, projectId, toast]);
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  useEffect(() => {
    if (user) {
      const fetchApplications = async () => {
        setIsLoading(true);
        try {
          const appsCollection = collection(db, 'applications');
          const q = query(appsCollection, where('projectId', '==', projectId));
          const querySnapshot = await getDocs(q);
          
          const appsDataPromises = querySnapshot.docs.map(async (appDoc) => {
            const appData = appDoc.data();
            const userDocRef = doc(db, 'users', appData.testerId);
            const userDocSnap = await getDoc(userDocRef);
            
            const application = { id: appDoc.id, ...appData } as Application;
            if (userDocSnap.exists()) {
              application.testerInfo = userDocSnap.data() as Application['testerInfo'];
            }
            
            const submissionDocRef = doc(db, 'submissions', appDoc.id);
            const submissionDoc = await getDoc(submissionDocRef);
            application.hasSubmission = submissionDoc.exists();

            return application;
          });
          
          const appsData = await Promise.all(appsDataPromises);
          appsData.sort((a, b) => b.appliedAt.seconds - a.appliedAt.seconds);
          setApplications(appsData);

        } catch (error) {
          console.error("Error fetching applications: ", error);
          toast({ variant: 'destructive', title: 'Error', description: "Failed to fetch applications."});
        } finally {
          setIsLoading(false);
        }
      };
      fetchApplications();
    }
  }, [user, projectId, toast]);

  const handleApplicationStatus = async (appId: string, status: 'accepted' | 'declined') => {
    try {
        const appDocRef = doc(db, 'applications', appId);
        await updateDoc(appDocRef, { status: status });
        setApplications(apps => apps.map(app => app.id === appId ? { ...app, status: status } : app));
        toast({ title: `Application ${status}`, description: `The application has been ${status}.`});
    } catch(error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleDeleteApplication = async (appId: string) => {
      try {
        await deleteDoc(doc(db, 'applications', appId));
        setApplications(apps => apps.filter(app => app.id !== appId));
        toast({ title: "Application Deleted", description: "The application has been removed."});
      } catch (error: any) {
         toast({ variant: 'destructive', title: 'Error', description: `Failed to delete application: ${error.message}` });
      }
  };

  const formatAppliedDate = (timestamp: Application['appliedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };
  
   const getStatusBadge = (status: Application['status']) => {
    switch (status) {
        case 'pending':
            return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
        case 'accepted':
            return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
        case 'declined':
            return <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"><XCircle className="mr-1 h-3 w-3" />Declined</Badge>;
    }
  };

  return (
    <div className="container py-12">
        <div className="mb-6">
             <Button variant="outline" onClick={() => router.push('/profile/my-projects')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Projects
            </Button>
        </div>
        <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline">Applicants</h1>
                <div className="text-muted-foreground">Testers who applied for: <span className="font-semibold text-foreground">{projectTitle || <Skeleton className="h-5 w-48 inline-block" />}</span></div>
            </div>
      </div>

       {isLoading && (
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-8 w-24" /></CardContent><CardFooter className="flex justify-end gap-4"><Skeleton className="h-10 w-24" /><Skeleton className="h-10 w-24" /></CardFooter></Card>
            ))}
         </div>
       )}

      {!isLoading && applications.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center"><Inbox className="h-8 w-8 text-muted-foreground" /></div>
                <CardTitle className="mt-4">No Applicants Yet</CardTitle>
                <CardDescription>Check back later to see who has applied to your project.</CardDescription>
            </CardHeader>
        </Card>
      )}

      {!isLoading && applications.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {applications.map(app => (
              <Card key={app.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                            <AvatarImage src={app.testerInfo?.profilePictureUrl} />
                            <AvatarFallback>{getInitials(app.testerInfo?.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                             <Link href={`/users/${app.testerId}`} className="font-semibold text-primary hover:underline">
                                <CardTitle>{app.testerInfo?.fullName || 'Unknown User'}</CardTitle>
                            </Link>
                            <CardDescription>Applied {formatAppliedDate(app.appliedAt)}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                     <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        {getStatusBadge(app.status)}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  {app.status === 'pending' && (
                    <>
                        <Button variant="outline" onClick={() => handleApplicationStatus(app.id, 'declined')}>
                            <X className="mr-2 h-4 w-4" /> Decline
                        </Button>
                        <Button onClick={() => handleApplicationStatus(app.id, 'accepted')}>
                            <Check className="mr-2 h-4 w-4" /> Accept
                        </Button>
                    </>
                  )}
                  {app.status === 'accepted' && (
                    <>
                      {app.hasSubmission && (
                        <Button asChild variant="secondary">
                           <Link href={`/project/${projectId}/submission/${app.id}`}>
                               <FileText className="mr-2 h-4 w-4" />
                               View Submission
                           </Link>
                       </Button>
                      )}
                      <Button asChild>
                          <Link href={`/chat/${app.id}`}>
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Chat
                          </Link>
                      </Button>
                    </>
                  )}
                  {app.status === 'declined' && (
                     <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">You have declined this application.</p>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon" className="h-8 w-8">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete this application. This action cannot be undone.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteApplication(app.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
