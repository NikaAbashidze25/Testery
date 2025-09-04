
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Mail, User as UserIcon, Building, Briefcase, Globe, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';


type UserProfile = {
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
};

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data() as UserProfile);
        } else {
          console.error("No profile data found in Firestore for this user.");
           toast({
            variant: "destructive",
            title: "Profile not found",
            description: "We couldn't find your profile data. Please try again or contact support.",
          });
          router.push('/');
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
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

  if (isLoading) {
    return (
        <div className="container py-12">
            <Card className="max-w-2xl mx-auto">
                <CardHeader className="flex flex-col items-center text-center border-b pb-6">
                    <Skeleton className="h-24 w-24 rounded-full mb-4" />
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-5 w-64" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-5 w-full" />
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-center pt-6 border-t">
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="container py-12 text-center">
        <p className="mb-4">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="flex flex-col items-center text-center border-b pb-6">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={userProfile.profilePictureUrl || userProfile.companyLogoUrl} alt="Profile Picture" />
            <AvatarFallback className="text-3xl">
              {getInitials(userProfile.fullName || userProfile.companyName)}
            </AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{userProfile.fullName || userProfile.companyName}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> {userProfile.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {userProfile.accountType === 'individual' && (
            <>
              <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Full Name:</strong> {userProfile.fullName}</p>
              </div>

              {userProfile.skills && userProfile.skills.length > 0 && userProfile.skills.some(s => s) && (
                <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                        Skills
                    </h3>
                    <div className="flex flex-wrap gap-2">
                    {userProfile.skills.map(skill => (
                        skill && <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                    </div>
                </div>
              )}
            </>
          )}

          {userProfile.accountType === 'company' && (
            <>
                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Company Name:</strong> {userProfile.companyName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Contact Person:</strong> {userProfile.contactPerson}</p>
                </div>
                 <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <p><strong>Industry:</strong> {userProfile.industry}</p>
                </div>
                {userProfile.website && (
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <p><strong>Website:</strong> <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">{userProfile.website} <ExternalLink className="h-4 w-4" /></a></p>
                  </div>
                )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center pt-6 border-t">
            <Button asChild>
                <Link href="/profile/edit">
                    <Edit className="mr-2 h-4 w-4" /> Edit Profile
                </Link>
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
