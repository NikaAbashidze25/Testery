
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, Edit, FileText, Send, Bookmark, User as UserIcon, Building, Mail, Globe, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

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
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          console.error("User document not found in Firestore.");
          // You might want to create a default profile here or redirect
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
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

  if (isLoading || isAuthLoading) {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </CardHeader>
           <CardContent className="space-y-4">
             <Skeleton className="h-5 w-32" />
             <Skeleton className="h-5 w-full" />
            <div className="flex justify-center mt-4">
                <Skeleton className="h-11 w-36" />
            </div>
           </CardContent>
          <CardFooter className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container py-12 text-center">
        <p>Could not load user profile. Please try again later.</p>
      </div>
    );
  }

  const isCompany = userProfile.accountType === 'company';
  const name = isCompany ? userProfile.companyName : userProfile.fullName;
  const avatarUrl = isCompany ? userProfile.companyLogoUrl : userProfile.profilePictureUrl;

  const ActivityCard = ({ href, icon: Icon, title, description }: { href: string; icon: React.ElementType; title: string; description: string; }) => (
      <Link href={href} className="block">
        <Card className="h-full hover:bg-accent hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center gap-4">
                <Icon className="h-8 w-8 text-primary" />
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
      </Link>
  );

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 text-3xl">
            <AvatarImage src={avatarUrl || ''} alt={name || 'Profile picture'} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <div className="pt-4">
              <CardTitle className="text-3xl">{name || 'User'}</CardTitle>
              <CardDescription className="flex items-center justify-center gap-2 mt-2">
                 <Mail className="h-4 w-4" />
                {userProfile.email || 'No email provided'}
              </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-6 space-y-6">
            <Separator />
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-3 text-muted-foreground">
                  <UserIcon className="h-5 w-5" />
                  About
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                   <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      <p><strong>Account Type:</strong> <span className="capitalize">{userProfile.accountType}</span></p>
                  </div>
                  {isCompany && userProfile.contactPerson && (
                       <div className="flex items-center gap-3">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                          <p><strong>Contact:</strong> {userProfile.contactPerson}</p>
                      </div>
                  )}
                   {isCompany && userProfile.industry && (
                       <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5 text-muted-foreground" />
                          <p><strong>Industry:</strong> {userProfile.industry}</p>
                      </div>
                  )}
                   {isCompany && userProfile.website && (
                       <div className="flex items-center gap-3">
                          <Globe className="h-5 w-5 text-muted-foreground" />
                          <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">Website <ExternalLink className="h-4 w-4" /></a>
                      </div>
                  )}
              </div>
              {!isCompany && Array.isArray(userProfile.skills) && userProfile.skills.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-muted-foreground">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                      {userProfile.skills.map((skill: string) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center pt-2">
                 <Button asChild size="lg">
                    <Link href="/profile/edit">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                    </Link>
                </Button>
            </div>
        </CardContent>
        
        <CardFooter className="flex-col items-stretch gap-4 px-6 pb-6">
            <h3 className="text-center font-semibold text-muted-foreground text-sm uppercase tracking-wider pt-4 border-t">My Activity</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 {isCompany ? (
                    <ActivityCard
                        href="/profile/my-projects"
                        icon={FileText}
                        title="My Projects"
                        description="View and manage the projects you have posted."
                    />
                 ) : (
                    <ActivityCard
                        href="/profile/my-applications"
                        icon={Send}
                        title="My Applications"
                        description="Track the status of all your project applications."
                    />
                 )}
                 <ActivityCard
                    href="/profile/saved-projects"
                    icon={Bookmark}
                    title="Saved Projects"
                    description="Access projects you have saved to view later."
                />
                 <ActivityCard
                    href={`/users/${user.uid}`}
                    icon={Briefcase}
                    title="Public View"
                    description="See how your profile appears to other users."
                />
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
