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

    // Update profile — tous les champs collectés pendant l'onboarding
    const updatePayload: Record<string, string | boolean | null> = {
      username: data.firstName,
      avatar_url: avatarUrl,
      home_city: data.city,
      safety_enhanced_mode: data.safetyEnhancedMode,
    };

    if (data.gender) {
      updatePayload.gender = data.gender;
    }

    if (data.phoneNumber) {
      updatePayload.phone_number = data.phoneNumber;
      updatePayload.phone_verified = data.phoneVerified;
    }

    if (data.trustedContactName) {
      updatePayload.trusted_contact_name = data.trustedContactName;
      updatePayload.trusted_contact_phone = data.trustedContactPhone;
      updatePayload.trusted_contact_relation = data.trustedContactRelation;
    }

    await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id);

    await refreshProfile();
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
