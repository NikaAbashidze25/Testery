
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc, type DocumentData, documentId } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Inbox, Bookmark, MapPin, Clock, CheckCircle } from 'lucide-react';

interface Project extends DocumentData {
    id: string;
    title: string;
    companyName: string;
    location: string;
    description: string;
    skills: string[];
    rewardType: 'monetary' | 'service';
    compensation: number | string;
    postedAt: {
        seconds: number;
        nanoseconds: number;
    };
}

interface Application extends DocumentData {
    projectId: string;
    status: 'pending' | 'accepted' | 'declined';
}

interface UserProfile {
    savedProjects?: string[];
}

const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
};

export default function SavedProjectsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [savedProjects, setSavedProjects] = useState<Project[]>([]);
  const [applications, setApplications] = useState<Map<string, Application>>(new Map());
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
      const fetchSavedProjectsAndApps = async () => {
        setIsLoading(true);
        try {
            // Fetch applications first
            const appsCollection = collection(db, 'applications');
            const appsQuery = query(appsCollection, where('testerId', '==', user.uid));
            const appsSnapshot = await getDocs(appsQuery);
            const userApps = new Map<string, Application>();
            appsSnapshot.forEach(doc => {
                const appData = doc.data() as Application;
                userApps.set(appData.projectId, appData);
            });
            setApplications(userApps);

            // Fetch saved projects
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data() as UserProfile;
                const savedProjectIds = userData.savedProjects || [];

                if (savedProjectIds.length > 0) {
                    const projectsCollection = collection(db, 'projects');
                    const q = query(projectsCollection, where(documentId(), 'in', savedProjectIds));
                    const querySnapshot = await getDocs(q);
                    
                    const projectsData = querySnapshot.docs
                        .map(doc => ({ id: doc.id, ...doc.data() } as Project))
                        .sort((a, b) => b.postedAt.seconds - a.postedAt.seconds);
                    
                    setSavedProjects(projectsData);
                } else {
                    setSavedProjects([]);
                }
            }
        } catch (error) {
          console.error("Error fetching data: ", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSavedProjectsAndApps();
    }
  }, [user]);

  const formatPostedDate = (timestamp: Project['postedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  const getApplicationStatusBadge = (status: Application['status']) => {
    if (status === 'pending') {
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"><Clock className="mr-1 h-3 w-3" />Applied</Badge>;
    }
    if (status === 'accepted') {
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"><CheckCircle className="mr-1 h-3 w-3" />Accepted</Badge>;
    }
    return null;
  }

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
                <h1 className="text-4xl font-bold font-headline">Saved Projects</h1>
                <p className="text-muted-foreground">Here are all the projects you've saved for later.</p>
            </div>
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
                        <Skeleton className="h-4 w-full" />
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-28" />
                    </CardFooter>
                </Card>
            ))}
         </div>
       )}

      {!isLoading && savedProjects.length === 0 && (
        <Card className="text-center py-12">
            <CardHeader>
                <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                    <Bookmark className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">You Haven't Saved Any Projects Yet</CardTitle>
                <CardDescription>Browse projects and click the save button to keep them here.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href="/projects">Browse Projects</Link>
                </Button>
            </CardContent>
        </Card>
      )}

      {!isLoading && savedProjects.length > 0 && (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
            {savedProjects.map(project => {
                const application = applications.get(project.id);
                return (
                <Card key={project.id} className="flex flex-col hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <CardTitle>{project.title}</CardTitle>
                            {application && getApplicationStatusBadge(application.status)}
                        </div>
                        <CardDescription>
                            <div className="flex items-center gap-2 text-sm">
                            <Link href={`/users/${project.authorId}`} className="font-semibold text-primary hover:underline">
                                {project.companyName}
                            </Link>
                            <span className="text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {project.location}
                            </span>
                            </div>
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
                        
                        <div className="text-sm font-semibold text-foreground">
                            {project.rewardType === 'monetary'
                                ? `Reward: ${formatCurrency(project.compensation as number)}`
                                : `Reward: ${project.compensation}`
                            }
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {project.skills.map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                            ))}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{formatPostedDate(project.postedAt)}</span>
                        <Button asChild>
                            <Link href={`/projects/${project.id}`}>View Details</Link>
                        </Button>
                    </CardFooter>
                </Card>
            )})}
          </div>
        )}
    </div>
  );
}
