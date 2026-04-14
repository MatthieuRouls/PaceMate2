'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import type { OnboardingData } from '@/components/onboarding/onboarding.types';
import { supabase } from '@/lib/supabase';
import { saveManualLevel, completeOnboarding } from '@/lib/actions';
import type { ManualLevelAnswers } from '@/lib/level-manual';

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

    // Si Strava est connecté, marquer l'onboarding comme terminé
    // Le calcul de niveau se fait via le bouton "Synchroniser" dans Settings
    if (data.stravaConnected) {
      await completeOnboarding();
    } else if (data.levelIsRunner === true && data.levelWeeklyKm && data.levelPace && data.levelLongestRun) {
      // Save level from questionnaire (step 5)
      const levelAnswers: ManualLevelAnswers = {
        isRunner: true,
        weeklyKm: data.levelWeeklyKm as ManualLevelAnswers['weeklyKm'],
        pace: data.levelPace as ManualLevelAnswers['pace'],
        longestRun: data.levelLongestRun as ManualLevelAnswers['longestRun'],
        bestTime5k: data.levelBestTime5k || undefined,
        bestTime10k: data.levelBestTime10k || undefined,
        bestTimeSemi: data.levelBestTimeSemi || undefined,
        bestTimeMarathon: data.levelBestTimeMarathon || undefined,
      };
      await saveManualLevel(levelAnswers);
    } else {
      // Débutant ou étape skippée — marque l'onboarding comme terminé
      await completeOnboarding();
    }

    await refreshProfile();
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
