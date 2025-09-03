
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Mail, User as UserIcon, Building, Briefcase, Globe, ArrowLeft, Inbox, Star, Clock, CheckCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';

interface UserProfile {
  uid: string;
  email: string;
  accountType: 'individual' | 'company';
  fullName?: string;
  skills?: string[];
  profilePictureUrl?: string;
  companyName?: string;
  contactPerson?: string;
  industry?: string;
  website?: string;
  companyLogoUrl?: string;
}

interface Project extends DocumentData {
    id: string;
    title: string;
    description: string;
    skills: string[];
    postedAt: {
        seconds: number;
        nanoseconds: number;
    };
}

interface TestedProject extends Project {
  testedAt: { 
    seconds: number;
    nanoseconds: number;
  };
  applicationStatus: 'accepted' | 'pending' | 'declined';
}


interface Review extends DocumentData {
    id: string;
    rating: number;
    comment: string;
    clientName: string;
    clientAvatar: string;
    projectId: string;
    createdAt: {
        seconds: number;
        nanoseconds: number;
    };
    projectTitle?: string;
}

const safeGetData = (doc: any): DocumentData => {
  const data = doc.data();
  return data ? { ...data } : {};
};


export default function UserProfilePage({ params }: { params: { uid: string } }) {
  const uid = params.uid;
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [postedProjects, setPostedProjects] = useState<Project[]>([]);
  const [testedProjects, setTestedProjects] = useState<TestedProject[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof uid === 'string') {
        const fetchUserProfile = async () => {
            setIsLoading(true);
            try {
                const userDocRef = doc(db, 'users', uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    const profileData = safeGetData(userDocSnap) as UserProfile;
                    setUserProfile(profileData);
                    
                    // 1. Fetch Projects the User HAS POSTED
                    const postedProjectsQuery = query(collection(db, 'projects'), where('authorId', '==', uid), orderBy('postedAt', 'desc'));
                    const postedProjectsSnapshot = await getDocs(postedProjectsQuery);
                    const postedProjectsData = postedProjectsSnapshot.docs.map(doc => ({ id: doc.id, ...safeGetData(doc) } as Project));
                    setPostedProjects(postedProjectsData);

                    // 2. Fetch Projects the User HAS TESTED
                    const testedApplicationsQuery = query(
                        collection(db, 'applications'), 
                        where('testerId', '==', uid),
                        where('status', '==', 'accepted')
                    );
                    const testedApplicationsSnapshot = await getDocs(testedApplicationsQuery);
                    const testedProjectsData = await Promise.all(
                        testedApplicationsSnapshot.docs.map(async (appDoc) => {
                            try {
                                const appData = safeGetData(appDoc);
                                if (!appData.projectId) return null;

                                const projectDoc = await getDoc(doc(db, 'projects', appData.projectId));
                                if (!projectDoc.exists()) return null;

                                const projectData = safeGetData(projectDoc);
                                return {
                                    ...(projectData as Project),
                                    id: projectDoc.id,
                                    testedAt: appData.appliedAt, 
                                    applicationStatus: appData.status,
                                } as TestedProject;
                            } catch (error) {
                                console.error("Error fetching tested project:", error);
                                return null;
                            }
                        })
                    );
                    
                    const validTestedProjects = testedProjectsData.filter(Boolean) as TestedProject[];
                    validTestedProjects.sort((a,b) => b.testedAt.seconds - a.testedAt.seconds);
                    setTestedProjects(validTestedProjects);

                    // 3. Fetch Reviews the User HAS RECEIVED
                    const reviewsQuery = query(collection(db, 'reviews'), where('testerId', '==', uid), orderBy('createdAt', 'desc'));
                    const reviewsSnapshot = await getDocs(reviewsQuery);
                    const reviewsData = await Promise.all(reviewsSnapshot.docs.map(async (reviewDoc) => {
                        const reviewData = { id: reviewDoc.id, ...safeGetData(reviewDoc) } as Review;
                        const projectDoc = await getDoc(doc(db, 'projects', reviewData.projectId));
                        if(projectDoc.exists()){
                            reviewData.projectTitle = projectDoc.data()?.title;
                        }
                        return reviewData;
                    }));
                    setReviews(reviewsData);

                } else {
                    console.error("No such user!");
                }
            } catch (error) {
                console.error("Error fetching user profile data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchUserProfile();
    }
  }, [uid]);

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const formatDate = (timestamp: { seconds: number; nanoseconds: number } | undefined) => {
    if (!timestamp) return '...';
    const date = new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const renderStars = (rating: number) => {
    return (
        <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
            ))}
        </div>
    );
  };
  
    const getDefaultTab = () => {
        if (reviews.length > 0) return "reviews";
        if (postedProjects.length > 0) return "client";
        if (testedProjects.length > 0) return "tester";
        return "reviews"; // fallback
    };
    
    if (isLoading) {
        return <LoadingSkeleton />;
    }

    if (!userProfile) {
        return <UserNotFound onBack={() => router.back()} />;
    }

    const hasAnyActivity = postedProjects.length > 0 || testedProjects.length > 0 || reviews.length > 0;
    
    const activeTabs = [
        postedProjects.length > 0 ? 'client' : null,
        testedProjects.length > 0 ? 'tester' : null,
        reviews.length > 0 ? 'reviews' : null
    ].filter(Boolean);

    const gridClass = `grid-cols-${activeTabs.length}`;

    return (
        <div className="container py-12">
            <div className="mb-8">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <ProfileSidebar userProfile={userProfile} getInitials={getInitials} />
                
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue={getDefaultTab()} className="w-full">
                        {hasAnyActivity && activeTabs.length > 0 && (
                            <TabsList className={cn("grid w-full", gridClass)}>
                                {postedProjects.length > 0 && (
                                    <TabsTrigger value="client">Posted Projects</TabsTrigger>
                                )}
                                {testedProjects.length > 0 && (
                                    <TabsTrigger value="tester">Work History</TabsTrigger>
                                )}
                                {reviews.length > 0 && (
                                    <TabsTrigger value="reviews">Reviews</TabsTrigger>
                                )}
                            </TabsList>
                        )}
                        
                        <TabsContent value="client">
                            <PostedProjectsSection 
                                projects={postedProjects} 
                                userProfile={userProfile} 
                                formatDate={formatDate} 
                            />
                        </TabsContent>

                        <TabsContent value="tester">
                            <TestedProjectsSection 
                                projects={testedProjects} 
                                userProfile={userProfile} 
                                formatDate={formatDate} 
                            />
                        </TabsContent>

                        <TabsContent value="reviews">
                            <ReviewsSection 
                                reviews={reviews} 
                                userProfile={userProfile} 
                                formatDate={formatDate} 
                                getInitials={getInitials}
                                renderStars={renderStars} 
                            />
                        </TabsContent>
                    </Tabs>

                    {!hasAnyActivity && <NoActivityCard />}
                </div>
            </div>
        </div>
    );
}

const LoadingSkeleton = () => (
    <div className="container py-12">
        <Skeleton className="h-10 w-40 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <Card>
                    <CardHeader className="flex flex-col items-center text-center">
                        <Skeleton className="h-24 w-24 rounded-full mb-4" />
                        <Skeleton className="h-8 w-48 mb-2" />
                        <Skeleton className="h-5 w-64" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-5 w-32" />
                            <Skeleton className="h-5 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-2 space-y-6">
                 <Skeleton className="h-8 w-56 mb-4" />
                 <Card>
                    <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                    <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                    <CardFooter><Skeleton className="h-10 w-28" /></CardFooter>
                 </Card>
            </div>
        </div>
    </div>
);

const UserNotFound = ({ onBack }: { onBack: () => void }) => (
    <div className="container py-12 text-center">
        <p className="mb-4">User not found.</p>
        <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
    </div>
);

const ProfileSidebar = ({ userProfile, getInitials }: { userProfile: UserProfile, getInitials: (name?: string) => string }) => (
    <div className="lg:col-span-1 space-y-8 sticky top-24">
        <Card>
            <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={userProfile.profilePictureUrl || userProfile.companyLogoUrl} alt="Profile" />
                <AvatarFallback className="text-3xl">
                {getInitials(userProfile.fullName || userProfile.companyName)}
                </AvatarFallback>
            </Avatar>
            <CardTitle className="text-3xl">{userProfile.fullName || userProfile.companyName}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4" /> {userProfile.email}
            </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
             {userProfile.accountType === 'company' && userProfile.website && (
                    <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-muted-foreground" />
                        <p className="truncate"><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{userProfile.website} <ExternalLink className="h-4 w-4 flex-shrink-0" /></a></p>
                    </div>
            )}
             {userProfile.skills && userProfile.skills.length > 0 && (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {userProfile.skills.map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                    </div>
                </div>
            )}
            </CardContent>
        </Card>
    </div>
);

const PostedProjectsSection = ({ projects, userProfile, formatDate }: { projects: Project[], userProfile: UserProfile, formatDate: (timestamp: any) => string }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Posted Projects</h2>
        {projects.length > 0 ? (
            projects.map(project => (
                <Card key={project.id}>
                    <CardHeader>
                        <CardTitle>{project.title}</CardTitle>
                        <CardDescription>Posted {formatDate(project.postedAt)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{project.description}</p>
                        <div className="flex flex-wrap gap-2">
                        {project.skills.map(skill => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="secondary">
                            <Link href={`/projects/${project.id}`}>View Project Details</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))
        ) : (
            <EmptyStateCard
                icon={<FileText className="h-12 w-12 text-muted-foreground" />}
                title="No Projects Posted"
                description="This user hasn't posted any projects yet."
            />
        )}
    </div>
);

const TestedProjectsSection = ({ projects, userProfile, formatDate }: { projects: TestedProject[], userProfile: UserProfile, formatDate: (timestamp: any) => string }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Work History</h2>
        {projects.length > 0 ? (
            projects.map(project => (
                <Card key={project.id}>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            {project.title}
                        </CardTitle>
                        <CardDescription>
                            Application accepted {formatDate(project.testedAt)}
                        </CardDescription>
                    </CardHeader>
                     <CardContent>
                        <p className="text-sm text-muted-foreground">{project.description}</p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/projects/${project.id}`}>View Project</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))
        ) : (
            <EmptyStateCard
                icon={<CheckCircle className="h-12 w-12 text-muted-foreground" />}
                title="No Work History"
                description="This user hasn't completed any tests yet."
            />
        )}
    </div>
);

const ReviewsSection = ({ reviews, userProfile, formatDate, getInitials, renderStars }: { reviews: Review[], userProfile: UserProfile, formatDate: (timestamp: any) => string, getInitials: (name?: string) => string, renderStars: (rating: number) => JSX.Element }) => (
    <div className="space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
        {reviews.length > 0 ? (
            reviews.map(review => (
                <Card key={review.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={review.clientAvatar} />
                                    <AvatarFallback>{getInitials(review.clientName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-lg">
                                        {review.clientName}
                                    </CardTitle>
                                    <CardDescription>
                                        On project: <Link href={`/projects/${review.projectId}`} className="text-primary hover:underline">{review.projectTitle || 'Project'}</Link>
                                    </CardDescription>
                                </div>
                            </div>
                           {renderStars(review.rating)}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground italic">"{review.comment}"</p>
                    </CardContent>
                     <CardFooter>
                        <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                    </CardFooter>
                </Card>
            ))
        ) : (
            <EmptyStateCard
                icon={<Star className="h-12 w-12 text-muted-foreground" />}
                title="No Reviews Yet"
                description="This user hasn't received any reviews."
            />
        )}
    </div>
);

const EmptyStateCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <Card className="text-center py-12">
        <div className="mx-auto mb-4">{icon}</div>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
    </Card>
);

const NoActivityCard = () => (
    <Card className="text-center py-12">
        <CardHeader>
            <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">No Activity Yet</CardTitle>
            <CardDescription>This user hasn't posted, tested, or received reviews on any projects.</CardDescription>
        </CardHeader>
    </Card>
);

    