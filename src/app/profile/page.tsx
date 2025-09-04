
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { doc, getDoc, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit } from 'lucide-react';

interface UserProfile extends DocumentData {
  uid: string;
  email: string;
  accountType: 'individual' | 'company';
  fullName?: string;
  profilePictureUrl?: string;
  companyName?: string;
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
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserProfile(userDocSnap.data() as UserProfile);
      } else {
        // This case might happen if there's a delay in creating the Firestore doc after signup
        console.error("User document not found in Firestore.");
      }
      setIsLoading(false);
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
        <Card className="max-w-xl mx-auto">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardFooter>
            <Skeleton className="h-11 w-36" />
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

  return (
    <div className="container py-12">
      <Card className="max-w-xl mx-auto">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 text-3xl">
            <AvatarImage src={avatarUrl || ''} alt={name || 'Profile picture'} />
            <AvatarFallback>{getInitials(name)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl pt-4">{name || 'User'}</CardTitle>
          <CardDescription>{userProfile.email}</CardDescription>
        </CardHeader>
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
}
