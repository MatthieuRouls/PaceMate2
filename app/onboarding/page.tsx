'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import OnboardingFlow from '@/components/onboarding/OnboardingFlow';
import type { OnboardingData } from '@/components/onboarding/onboarding.types';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, signUp, refreshProfile } = useAuth();

  const handleComplete = async (data: OnboardingData) => {
    try {
      // If no user yet, create account (step 1 data)
      if (!user) {
        const result = await signUp(data.email, data.password, data.firstName);
        if (!result.success) {
          throw new Error(result.error || 'Failed to create account');
        }
        // Wait for user to be set
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Get the current user ID
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Upload photo if provided
      let avatarUrl = null;
      if (data.photoFile) {
        const fileExt = data.photoFile.name.split('.').pop();
        const fileName = `${currentUser.id}/avatar.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, data.photoFile, {
            upsert: true,
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      // Update profile with onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: data.firstName,
          avatar_url: avatarUrl,
          home_city: data.city,
          // Store safety preferences (you may need to add this column)
          // safety_enhanced_mode: data.safetyEnhancedMode,
        })
        .eq('id', currentUser.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Store phone verification status if verified
      if (data.phoneVerified && data.phoneNumber) {
        // In production, store this securely
        console.log('Phone verified:', data.phoneNumber);
      }

      // Store trusted contact if provided
      if (data.trustedContactName && data.trustedContactPhone) {
        // In production, store this in a trusted_contacts table
        console.log('Trusted contact:', {
          name: data.trustedContactName,
          phone: data.trustedContactPhone,
          relation: data.trustedContactRelation,
        });
      }

      // Store safety mode preference
      if (data.safetyEnhancedMode) {
        // In production, store this in user settings
        console.log('Safety enhanced mode enabled');
      }

      // Refresh profile to get updated data
      await refreshProfile();

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding completion error:', error);
      throw error;
    }
  };

  return <OnboardingFlow onComplete={handleComplete} />;
}
