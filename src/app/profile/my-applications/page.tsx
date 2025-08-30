
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Inbox, FileText, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Application extends DocumentData {
    id: string;
    projectTitle: string;
    projectId: string;
    status: 'pending' | 'accepted' | 'declined';
    appliedAt: {
        seconds: number;
        nanoseconds: number;
    };
}

export default function MyApplicationsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
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
          const appsData = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Application))
            .sort((a, b) => b.appliedAt.seconds - a.appliedAt.seconds);
          setApplications(appsData);
        } catch (error) {
          console.error("Error fetching user's applications: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchApplications();
    }
  }, [user]);

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
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!user) {
      return (
         <div className="container py-12 text-center">
            <p>Redirecting to login...</p>
        </div>
      )
  }

  return (
    <div className="container py-12">
        <div className="mb-6">
             <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Profile
            </Button>
        </div>
        <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline">My Applications</h1>
                <p className="text-muted-foreground">Here are all the projects you've applied for.</p>
            </div>
             <Button asChild>
                <Link href="/projects">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse More Projects
                </Link>
            </Button>
      </div>

       {isLoading && (
         <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
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
       )}

      {!isLoading && applications.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">You Haven't Applied for Any Projects Yet</CardTitle>
                <CardDescription>Click the button below to browse available projects.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/projects">Browse Projects</Link>
                </Button>
            </CardContent>
        </Card>
      )}

      {!isLoading && applications.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {applications.map(app => (
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
                        {getStatusBadge(app.status)}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                   <Button asChild variant="outline">
                     <Link href={`/projects/${app.projectId}`}>View Project</Link>
                  </Button>
                  {app.status === 'accepted' && (
                    <Button asChild>
                       <Link href={`/chat/${app.id}`}>
                           <MessageSquare className="mr-2 h-4 w-4" />
                           Chat with Client
                       </Link>
                   </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

