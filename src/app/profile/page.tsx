
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { doc, getDoc, collection, query, where, getDocs, orderBy, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, Edit, Globe, Mail, User as UserIcon, Building, Inbox, Star, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
    projectTitle?: string;
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


export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [postedProjects, setPostedProjects] = useState<Project[]>([]);
  const [testedProjects, setTestedProjects] = useState<TestedProject[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchUserProfile = async () => {
        setIsLoading(true);
        try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const profileData = userDocSnap.data() as UserProfile;
                setUserProfile(profileData);
                
                const postedProjectsQuery = query(collection(db, 'projects'), where('authorId', '==', user.uid));
                const postedProjectsSnapshot = await getDocs(postedProjectsQuery);
                const postedProjectsData = postedProjectsSnapshot.docs
                    .map(doc => ({ id: doc.id, ...safeGetData(doc) } as Project))
                    .sort((a,b) => b.postedAt.seconds - a.postedAt.seconds);
                setPostedProjects(postedProjectsData);

                const testedApplicationsQuery = query(
                    collection(db, 'applications'), 
                    where('testerId', '==', user.uid),
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

                const reviewsQuery = query(collection(db, 'reviews'), where('testerId', '==', user.uid));
                const reviewsSnapshot = await getDocs(reviewsQuery);
                const reviewsDataPromises = reviewsSnapshot.docs.map(async (reviewDoc) => {
                    const reviewData = { id: reviewDoc.id, ...safeGetData(reviewDoc) } as Review;
                    if (reviewData.projectId) {
                        const projectDoc = await getDoc(doc(db, 'projects', reviewData.projectId));
                        if(projectDoc.exists()){
                            reviewData.projectTitle = projectDoc.data()?.title;
                        }
                    }
                    return reviewData;
                });
                const reviewsData = (await Promise.all(reviewsDataPromises)).sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

                setReviews(reviewsData);

            } else {
                console.error("User document not found in Firestore.");
            }
        } catch (error) {
            console.error("Error fetching user profile data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    fetchUserProfile();
  }, [user, isAuthLoading, router]);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const names = name.split(' ');
    return names.length > 1
      ? names[0][0] + names[names.length - 1][0]
      : name[0];
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
        if (!userProfile) return 'client';
        if (userProfile.accountType === 'company') {
            return "client";
        }
        return "tester";
    };

    if (isLoading || isAuthLoading) {
        return <LoadingSkeleton />;
    }

    if (!userProfile) {
        return (
            <div className="container py-12 text-center">
                <p>Could not load user profile. Please try again later.</p>
            </div>
        );
    }
    
    const hasAnyActivity = postedProjects.length > 0 || testedProjects.length > 0 || reviews.length > 0;
    
    const activeTabs = [
        userProfile.accountType === 'company' ? 'client' : null,
        userProfile.accountType === 'individual' ? 'tester' : null,
        reviews.length > 0 ? 'reviews' : null
    ].filter(Boolean);

    const getGridClass = (count: number) => {
        if (count === 0) return 'hidden';
        switch (count) {
          case 1: return 'grid-cols-1';
          case 2: return 'grid-cols-2';
          case 3: return 'grid-cols-3';
          default: return 'grid-cols-1';
        }
    };
    const gridClass = getGridClass(activeTabs.length);

    return (
        <div className="container py-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <ProfileSidebar userProfile={userProfile} getInitials={getInitials} />
                
                <div className="lg:col-span-2 space-y-6">
                     {hasAnyActivity && (
                        <ProfileStats 
                            postedProjects={postedProjects.length}
                            testedProjects={testedProjects.length}
                            reviews={reviews.length}
                            isCompany={userProfile.accountType === 'company'}
                        />
                    )}

                    <Tabs defaultValue={getDefaultTab()} className="w-full">
                         <TabsList className={cn("grid w-full", gridClass)}>
                            {userProfile.accountType === 'company' && (
                                <TabsTrigger value="client">My Projects</TabsTrigger>
                            )}
                            {userProfile.accountType === 'individual' && (
                                <TabsTrigger value="tester">My Work History</TabsTrigger>
                            )}
                            {reviews.length > 0 && (
                                <TabsTrigger value="reviews">My Reviews</TabsTrigger>
                            )}
                        </TabsList>
                        
                        <TabsContent value="client">
                            <PostedProjectsSection 
                                projects={postedProjects} 
                                formatDate={formatDate} 
                            />
                        </TabsContent>

                        <TabsContent value="tester">
                            <TestedProjectsSection 
                                projects={testedProjects} 
                                formatDate={formatDate} 
                            />
                        </TabsContent>

                        <TabsContent value="reviews">
                            <ReviewsSection 
                                reviews={reviews}
                                formatDate={formatDate} 
                                getInitials={getInitials}
                                renderStars={renderStars} 
                            />
                        </TabsContent>
                    </Tabs>
                    
                    {!hasAnyActivity && userProfile.accountType === 'company' && (
                         <EmptyStateCard
                            icon={<FileText className="h-12 w-12 text-muted-foreground" />}
                            title="No Projects Posted"
                            description="You haven't posted any projects yet."
                        />
                    )}
                     {!hasAnyActivity && userProfile.accountType === 'individual' && (
                         <EmptyStateCard
                            icon={<CheckCircle className="h-12 w-12 text-muted-foreground" />}
                            title="No Work History"
                            description="You haven't completed any tests yet."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

const LoadingSkeleton = () => (
    <div className="container py-12">
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
                    <h3 className="font-semibold text-lg flex items-center gap-3 text-muted-foreground">
                        <Briefcase className="h-5 w-5" />
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
            <CardFooter className="flex justify-center">
                 <Button asChild size="lg">
                    <Link href="/profile/edit">
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Profile
                    </Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
);

const PostedProjectsSection = ({ projects, formatDate }: { projects: Project[], formatDate: (timestamp: any) => string }) => (
    <div className="space-y-4">
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
                    <CardFooter className="flex justify-end gap-2">
                        <Button asChild variant="outline">
                           <Link href={`/projects/${project.id}/applicants`}>View Applicants</Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/projects/${project.id}`}>View Project</Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))
        ) : (
             <EmptyStateCard
                icon={<FileText className="h-12 w-12 text-muted-foreground" />}
                title="No Projects Posted"
                description="You haven't posted any projects yet."
            />
        )}
    </div>
);

const TestedProjectsSection = ({ projects, formatDate }: { projects: TestedProject[], formatDate: (timestamp: any) => string }) => (
    <div className="space-y-4">
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
                        <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
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
                description="You haven't completed any tests yet."
            />
        )}
    </div>
);

const ReviewsSection = ({ reviews, formatDate, getInitials, renderStars }: { reviews: Review[], formatDate: (timestamp: any) => string, getInitials: (name?: string) => string, renderStars: (rating: number) => JSX.Element }) => (
    <div className="space-y-4">
        {reviews.length > 0 ? (
            reviews.map(review => (
                <Card key={review.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 flex-shrink-0">
                          <AvatarImage src={review.clientAvatar} />
                          <AvatarFallback className="bg-primary/10">
                            {getInitials(review.clientName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                          <CardTitle className="text-lg">
                            {review.clientName}
                          </CardTitle>
                          <CardDescription className="line-clamp-1">
                            On project:{" "}
                            <Link 
                              href={`/projects/${review.projectId}`} 
                              className="text-primary hover:underline font-medium"
                            >
                              {review.projectTitle || 'Untitled Project'}
                            </Link>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <blockquote className="border-l-4 border-primary/20 pl-4 italic text-muted-foreground">
                      "{review.comment}"
                    </blockquote>
                  </CardContent>
                  <CardFooter className="text-sm text-muted-foreground">
                    Reviewed {formatDate(review.createdAt)}
                  </CardFooter>
                </Card>
            ))
        ) : (
            <EmptyStateCard
                icon={<Star className="h-12 w-12 text-muted-foreground" />}
                title="No Reviews Yet"
                description="You haven't received any reviews yet."
            />
        )}
    </div>
);


const EmptyStateCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <Card className="text-center py-12">
        <CardHeader className='p-0'>
            <div className="mx-auto mb-4">{icon}</div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
    </Card>
);

const NoActivityCard = () => (
    <Card className="text-center py-12">
        <CardHeader>
            <div className="mx-auto bg-secondary rounded-full h-16 w-16 flex items-center justify-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="mt-4">No Activity Yet</CardTitle>
            <CardDescription>You haven't posted, tested, or received reviews on any projects yet.</CardDescription>
        </CardHeader>
    </Card>
);

const ProfileStats = ({ postedProjects, testedProjects, reviews, isCompany }: { 
  postedProjects: number; 
  testedProjects: number; 
  reviews: number; 
  isCompany: boolean;
}) => {
    if (isCompany) {
        return (
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="text-center p-4">
                <CardTitle className="text-2xl font-bold">{postedProjects}</CardTitle>
                <CardDescription>Projects Posted</CardDescription>
                </Card>
                <Card className="text-center p-4">
                <CardTitle className="text-2xl font-bold">{reviews}</CardTitle>
                <CardDescription>Reviews Given</CardDescription>
                </Card>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="text-center p-4">
                <CardTitle className="text-2xl font-bold">{testedProjects}</CardTitle>
                <CardDescription>Tests Completed</CardDescription>
            </Card>
            <Card className="text-center p-4">
                <CardTitle className="text-2xl font-bold">{reviews}</CardTitle>
                <CardDescription>Reviews Received</CardDescription>
            </Card>
        </div>
    )
};

    

    