'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import type { OnboardingData } from '@/components/onboarding/onboarding.types';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const handleComplete = async (data: OnboardingData) => {
    if (!user) {
      router.push('/');
      return;
    }

    // Upload photo if provided
    let avatarUrl = null;
    if (data.photoFile) {
      const fileExt = data.photoFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, data.photoFile, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        avatarUrl = publicUrl;
      }
    }

    // Update profile
    await supabase
      .from('profiles')
      .update({
        username: data.firstName,
        avatar_url: avatarUrl,
        home_city: data.city,
      })
      .eq('id', user.id);

    await refreshProfile();
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
