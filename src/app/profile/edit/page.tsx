
'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageCropperDialog } from '@/components/image-cropper-dialog';

const individualSchema = z.object({
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  skills: z.string().optional(),
  profilePicture: z.any().optional(),
});

const companySchema = z.object({
  companyName: z.string().min(2, { message: "Company name must be at least 2 characters." }),
  contactPerson: z.string().min(2, { message: "Contact person name must be at least 2 characters." }),
  industry: z.string().min(2, { message: "Industry must be at least 2 characters." }),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  companyLogo: z.any().optional(),
});

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

const MAX_FILE_SIZE = 2.5 * 1024 * 1024; // 2.5MB

export default function EditProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [croppedImage, setCroppedImage] = useState<File | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | undefined>(undefined);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const router = useRouter();

  const formSchema = userProfile?.accountType === 'individual' ? individualSchema : companySchema;
  
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const profileData = userDocSnap.data() as UserProfile;
          setUserProfile(profileData);
          form.reset({
            ...profileData,
            skills: profileData.skills?.join(', '),
          });
        }
      } else {
        router.push('/login');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [router, form]);
  
  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name[0];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > MAX_FILE_SIZE) {
        toast({
            variant: 'destructive',
            title: 'File Too Large',
            description: `The selected image must be smaller than ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset file input to allow re-selection of the same file
    e.target.value = '';
  };

  const handleCroppedImageSave = (imageFile: File) => {
    setCroppedImage(imageFile);
    const fileField = userProfile?.accountType === 'individual' ? 'profilePicture' : 'companyLogo';
    form.setValue(fileField, imageFile.name);
    setImageToCrop(undefined); // Close the dialog
  };

  const handleCropperClose = () => {
    setImageToCrop(undefined);
  }


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!auth.currentUser || !userProfile) return;
    setIsSubmitting(true);

    try {
      let imageUrl = userProfile.accountType === 'individual' ? userProfile.profilePictureUrl : userProfile.companyLogoUrl;
      const storagePath = userProfile.accountType === 'individual' ? 'profile_pictures' : 'company_logos';

      if (croppedImage) {
        const storageRef = ref(storage, `${storagePath}/${auth.currentUser.uid}`);
        await uploadBytes(storageRef, croppedImage);
        imageUrl = await getDownloadURL(storageRef);
      }
      
      const dataToUpdate: any = { ...values };
      const fileField = userProfile.accountType === 'individual' ? 'profilePicture' : 'companyLogo';
      delete dataToUpdate[fileField];

      if (userProfile.accountType === 'individual' && 'fullName' in values) {
        dataToUpdate.skills = (values.skills || '').split(',').map((s:string) => s.trim()).filter(Boolean);
        dataToUpdate.profilePictureUrl = imageUrl;
        await updateProfile(auth.currentUser, { displayName: values.fullName, photoURL: imageUrl });
      } else if (userProfile.accountType === 'company' && 'contactPerson' in values) {
        dataToUpdate.companyLogoUrl = imageUrl;
        await updateProfile(auth.currentUser, { displayName: values.contactPerson, photoURL: imageUrl });
      }

      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, dataToUpdate);
      
      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
      router.push('/profile');
      router.refresh();

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-12">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-5 w-64" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-11 w-24" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }
  
  const currentAvatarSrc = croppedImage 
    ? URL.createObjectURL(croppedImage) 
    : (userProfile.accountType === 'individual' ? userProfile.profilePictureUrl : userProfile.companyLogoUrl);

  const currentAvatarFallback = getInitials(userProfile.accountType === 'individual' ? userProfile.fullName : userProfile.companyName);

  return (
    <div className="container py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Edit Your Profile</CardTitle>
          <CardDescription>Update your account details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {userProfile.accountType === 'individual' && (
                <>
                   <FormField
                    control={form.control}
                    name="profilePicture"
                    render={({ field }) => (
                      <FormItem>
                         <div className="flex items-center gap-8">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={currentAvatarSrc} alt="Profile Picture" />
                                <AvatarFallback className="text-3xl">
                                  {currentAvatarFallback}
                                </AvatarFallback>
                            </Avatar>
                             <div className="flex-grow space-y-2">
                                <FormLabel>Profile Picture</FormLabel>
                                <FormControl>
                                    <div>
                                        <Input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            disabled={isSubmitting}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSubmitting}
                                        >
                                            <Upload className="mr-2 h-4 w-4" />
                                            Change Image
                                        </Button>
                                    </div>
                                </FormControl>
                                <FormDescription>Maximum file size: 2.5MB.</FormDescription>
                                <FormMessage />
                            </div>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Skills / Categories</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormDescription>Separate skills with commas.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {userProfile.accountType === 'company' && (
                <>
                   <FormField
                    control={form.control}
                    name="companyLogo"
                    render={({ field }) => (
                      <FormItem>
                         <div className="flex items-center gap-8">
                           <Avatar className="h-24 w-24">
                              <AvatarImage src={currentAvatarSrc} alt="Company Logo" />
                              <AvatarFallback className="text-3xl">
                                {currentAvatarFallback}
                              </AvatarFallback>
                          </Avatar>
                           <div className="flex-grow space-y-2">
                            <FormLabel>Company Logo</FormLabel>
                             <FormControl>
                                <div>
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        disabled={isSubmitting}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isSubmitting}
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Change Logo
                                    </Button>
                                </div>
                            </FormControl>
                             <FormDescription>Maximum file size: 2.5MB.</FormDescription>
                             <FormMessage />
                          </div>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Person</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Website</FormLabel>
                        <FormControl><Input {...field} disabled={isSubmitting} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <div className="flex gap-4">
                  <Button type="submit" size="lg" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                   <Button type="button" size="lg" variant="outline" asChild disabled={isSubmitting}>
                    <Link href="/profile">Cancel</Link>
                  </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {imageToCrop && (
        <ImageCropperDialog
            isOpen={!!imageToCrop}
            onClose={handleCropperClose}
            imageSrc={imageToCrop}
            onSave={handleCroppedImageSave}
        />
       )}
    </div>
  );
}
