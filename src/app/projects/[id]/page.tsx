

'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, type DocumentData, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, MapPin, DollarSign, Type, Briefcase, Info, UserCircle, AlertTriangle, Edit, Check, Send, Clock, CheckCircle, XCircle, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Project extends DocumentData {
    id: string;
    title: string;
    companyName: string;
    location: string;
    type: string;
    compensation: string;
    description: string;
    skills: string[];
    authorId: string;
    postedAt: {
        seconds: number;
        nanoseconds: number;
    };
}

interface Application {
    status: 'pending' | 'accepted' | 'declined';
}

interface UserProfile {
    savedProjects?: string[];
}


export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [application, setApplication] = useState<Application | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setIsCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof id === 'string') {
        const fetchProject = async () => {
            setIsLoading(true);
            const docRef = doc(db, 'projects', id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setProject({ id: docSnap.id, ...docSnap.data() } as Project);
            } else {
                console.log("No such document!");
            }
            setIsLoading(false);
        };
        fetchProject();
    }
  }, [id]);

  useEffect(() => {
    // Check if the user has already applied & fetch user profile for saved projects
    const checkApplicationAndProfile = async () => {
        if (user && project) {
            const applicationsRef = collection(db, 'applications');
            const q = query(applicationsRef, where('projectId', '==', project.id), where('testerId', '==', user.uid));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                setApplication(querySnapshot.docs[0].data() as Application);
            }

            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);
            if(userDocSnap.exists()){
                setUserProfile(userDocSnap.data() as UserProfile);
            }
        }
    };
    checkApplicationAndProfile();
  }, [user, project]);


  const handleApply = async () => {
    if (!user || !project) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'You must be logged in to apply.',
        });
        return;
    }
    setIsApplying(true);
    try {
        const applicationsRef = collection(db, 'applications');
        const newApplication: Application = { status: 'pending' };
        await addDoc(applicationsRef, {
            projectId: project.id,
            projectTitle: project.title,
            testerId: user.uid,
            ownerId: project.authorId,
            ...newApplication,
            appliedAt: serverTimestamp(),
        });
        setApplication(newApplication);
        toast({
            title: 'Application Sent!',
            description: "You have successfully applied for this project.",
        });
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Application Failed',
            description: error.message,
        });
    } finally {
        setIsApplying(false);
    }
  };

  const handleSaveToggle = async () => {
    if (!user || !project) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
        return;
    }
    setIsSaving(true);
    const userDocRef = doc(db, 'users', user.uid);
    const isSaved = userProfile?.savedProjects?.includes(project.id);
    
    try {
        if (isSaved) {
            await updateDoc(userDocRef, { savedProjects: arrayRemove(project.id) });
            setUserProfile(prev => ({...prev, savedProjects: prev?.savedProjects?.filter(id => id !== project.id)}));
            toast({ title: 'Project Unsaved' });
        } else {
            await updateDoc(userDocRef, { savedProjects: arrayUnion(project.id) });
            setUserProfile(prev => ({...prev, savedProjects: [...(prev?.savedProjects || []), project.id]}));
            toast({ title: 'Project Saved' });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update saved projects.' });
    } finally {
        setIsSaving(false);
    }
  };

  const formatPostedDate = (timestamp: Project['postedAt']) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  }

  const isOwner = user && project && user.uid === project.authorId;
  const isSaved = user && project && userProfile?.savedProjects?.includes(project.id);

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

  const renderActionButtons = () => {
      if (isCheckingAuth) {
          return <Skeleton className="h-11 w-48" />;
      }
      if (isOwner) {
          return (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  <UserCircle className="h-5 w-5" />
                  You cannot apply to your own project.
                </div>
                <Button asChild>
                    <Link href={`/projects/${project?.id}/edit`}>
                       <Edit className="mr-2 h-4 w-4"/>
                       Edit Project
                    </Link>
                </Button>
            </div>
          );
      }
      if (user) {
          return (
            <div className="flex gap-2">
                {application ? (
                    <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Your Status:</span> {getStatusBadge(application.status)}
                    </div>
                ) : (
                    <Button size="lg" onClick={handleApply} disabled={isApplying}>
                        {isApplying ? 'Submitting...' : (
                            <>
                                <Send className="mr-2 h-4 w-4" />
                                Apply for this Project
                            </>
                        )}
                    </Button>
                )}
                 <Button size="lg" variant="outline" onClick={handleSaveToggle} disabled={isSaving}>
                    <Bookmark className={cn("mr-2 h-4 w-4", isSaved && "fill-current")} />
                    {isSaving ? 'Saving...' : (isSaved ? 'Unsave Project' : 'Save Project')}
                </Button>
            </div>
          );
      }
      return (
          <Button size="lg" asChild>
              <Link href="/login">Log In to Apply</Link>
          </Button>
      );
  }

  if (isLoading) {
    return (
        <div className="container py-12">
             <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <Skeleton className="h-8 w-3/4 mb-2" />
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                     </div>
                     <div>
                        <Skeleton className="h-6 w-48 mb-4" />
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-5 w-4/5" />
                     </div>
                     <div>
                        <Skeleton className="h-6 w-32 mb-4" />
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-7 w-24" />
                            <Skeleton className="h-7 w-20" />
                            <Skeleton className="h-7 w-28" />
                        </div>
                     </div>
                </CardContent>
                <CardFooter className="flex-col items-start gap-4">
                    <Skeleton className="h-11 w-48" />
                </CardFooter>
            </Card>
        </div>
    );
  }

  if (!project) {
    return (
        <div className="container py-12 text-center">
            <Card className="max-w-md mx-auto py-12">
                 <CardHeader>
                    <div className="mx-auto bg-destructive/10 rounded-full h-16 w-16 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="mt-4">Project Not Found</CardTitle>
                    <CardDescription>The project you are looking for does not exist or may have been removed.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <Link href="/projects">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Projects
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container py-12">
        <div className="mb-6">
            <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Projects
            </Button>
        </div>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">{project.title}</CardTitle>
          <CardDescription>
            Posted by{' '}
            <Link href={`/users/${project.authorId}`} className="font-semibold text-primary hover:underline">
                {project.companyName}
            </Link>
            {' '}- {formatPostedDate(project.postedAt)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                    <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-semibold">Location</h4>
                        <p className="text-muted-foreground">{project.location}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3 rounded-lg border p-4">
                    <Type className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-semibold">Project Type</h4>
                        <p className="text-muted-foreground">{project.type}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3 rounded-lg border p-4">
                    <DollarSign className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="font-semibold">Compensation</h4>
                        <p className="text-muted-foreground">{project.compensation}</p>
                    </div>
                </div>
            </div>

            <div>
                 <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    Project Description & Acceptance Criteria
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{project.description}</p>
            </div>
             <div>
                 <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" />
                    Required Skills
                </h3>
                <div className="flex flex-wrap gap-2">
                    {project.skills.map(skill => (
                    <Badge key={skill} variant="secondary" className="text-sm py-1 px-3">{skill}</Badge>
                    ))}
                </div>
            </div>

        </CardContent>
        <CardFooter className="flex-col items-start gap-4 pt-6 border-t">
           {renderActionButtons()}
        </CardFooter>
      </Card>
    </div>
  );
}
