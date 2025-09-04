
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Inbox, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Submission extends DocumentData {
    id: string;
    testerId: string;
    projectId: string;
    projectTitle: string;
    submittedAt: {
        seconds: number;
        nanoseconds: number;
    };
    testerInfo?: {
        fullName: string;
        profilePictureUrl: string;
    };
    applicationId: string;
}

export default function AllSubmissionsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      }
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [router]);
  
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
      const fetchSubmissions = async () => {
        setIsLoading(true);
        try {
          const subsCollection = collection(db, 'submissions');
          const q = query(subsCollection, where('clientId', '==', user.uid));
          const querySnapshot = await getDocs(q);
          
          const subsDataPromises = querySnapshot.docs.map(async (subDoc) => {
            const subData = subDoc.data();
            const userDocRef = doc(db, 'users', subData.testerId);
            const userDocSnap = await getDoc(userDocRef);
            
            const projectDocRef = doc(db, 'projects', subData.projectId);
            const projectDocSnap = await getDoc(projectDocRef);

            const submission: Submission = { 
                id: subDoc.id, 
                ...subData,
                applicationId: subDoc.id,
                projectTitle: projectDocSnap.exists() ? projectDocSnap.data().title : "Unknown Project"
            };

            if (userDocSnap.exists()) {
              submission.testerInfo = userDocSnap.data() as Submission['testerInfo'];
            }
            return submission;
          });
          
          const subsData = await Promise.all(subsDataPromises);
          subsData.sort((a, b) => b.submittedAt.seconds - a.submittedAt.seconds);
          setSubmissions(subsData);

        } catch (error) {
          console.error("Error fetching submissions: ", error);
          toast({ variant: 'destructive', title: 'Error', description: "Failed to fetch submissions."});
        } finally {
          setIsLoading(false);
        }
      };
      fetchSubmissions();
    }
  }, [user, toast]);

  const formatSubmittedDate = (timestamp: Submission['submittedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

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
                <h1 className="text-4xl font-bold font-headline">All Submissions</h1>
                <p className="text-muted-foreground">Work submitted to all of your projects.</p>
            </div>
      </div>

       {isLoading && (
         <div className="grid gap-6 md:grid-cols-1">
            {[...Array(2)].map((_, i) => (
                <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-1/2" /></CardContent><CardFooter className="flex justify-end gap-4"><Skeleton className="h-10 w-32" /></CardFooter></Card>
            ))}
         </div>
       )}

      {!isLoading && submissions.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center"><Inbox className="h-8 w-8 text-muted-foreground" /></div>
                <CardTitle className="mt-4">No Submissions Yet</CardTitle>
                <CardDescription>When testers submit their work, it will appear here.</CardDescription>
            </CardHeader>
        </Card>
      )}

      {!isLoading && submissions.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1">
            {submissions.map(sub => (
              <Card key={sub.id} className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                                <AvatarImage src={sub.testerInfo?.profilePictureUrl} />
                                <AvatarFallback>{getInitials(sub.testerInfo?.fullName)}</AvatarFallback>
                            </Avatar>
                            <div>
                                <Link href={`/users/${sub.testerId}`} className="font-semibold text-primary hover:underline">
                                    <CardTitle>{sub.testerInfo?.fullName || 'Unknown User'}</CardTitle>
                                </Link>
                                <CardDescription>Submitted {formatSubmittedDate(sub.submittedAt)}</CardDescription>
                            </div>
                        </div>
                        <Badge variant="outline">{sub.projectTitle}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground">{sub.comments || "No comments provided."}</p>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                    <Button asChild>
                       <Link href={`/project/${sub.projectId}/submission/${sub.applicationId}`}>
                           <FileText className="mr-2 h-4 w-4" />
                           View & Grade Submission
                       </Link>
                   </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
