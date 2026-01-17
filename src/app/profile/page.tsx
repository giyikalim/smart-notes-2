"use client";

import { AIUsageIndicator } from "@/components/ai/AIUsageIndicator";
import { useAuth, useProtectedRoute } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  Loader2,
  Mail,
  Save,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProfilePage() {
  const { isLoading: authLoading } = useProtectedRoute();
  const { user } = useAuth();
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tAI = useTranslations("aiUsage");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load profile from Supabase
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          // If no profile found, create one
          if (error.code === "PGRST116") {
            const { data: newProfile, error: insertError } = await (supabase as any)
              .from("profiles")
              .insert({
                id: user.id,
                email: user.email || "",
                full_name: user.user_metadata?.full_name || null,
                avatar_url: user.user_metadata?.avatar_url || null,
              })
              .select()
              .single();

            if (!insertError && newProfile) {
              setProfile(newProfile as Profile);
              setFullName((newProfile as Profile).full_name || "");
            }
          } else {
            console.error("Error loading profile:", error);
          }
        } else if (data) {
          setProfile(data as Profile);
          setFullName((data as Profile).full_name || "");
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  // Handle save
  const handleSave = async () => {
    if (!user || !profile) return;

    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: fullName || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        toast.error(t("saveError"));
        console.error("Error saving profile:", error);
      } else {
        setProfile((prev) => (prev ? { ...prev, full_name: fullName } : null));
        setIsEditing(false);
        toast.success(t("saveSuccess"));
      }
    } catch (error) {
      toast.error(t("saveError"));
      console.error("Error saving profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error(t("invalidImageType"));
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("imageTooLarge"));
      return;
    }

    setIsUploadingAvatar(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-avatar.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      // Update profile
      const { error: updateError } = await (supabase as any)
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) {
        throw updateError;
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : null));
      toast.success(t("avatarUpdated"));
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(t("avatarUploadError"));
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Get avatar URL (from profile or user metadata)
  const getAvatarUrl = () => {
    return (
      profile?.avatar_url ||
      user?.user_metadata?.avatar_url ||
      null
    );
  };

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Avatar Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar */}
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    {getAvatarUrl() ? (
                      <Image
                        src={getAvatarUrl()!}
                        alt="Avatar"
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-white">
                        {getInitials()}
                      </span>
                    )}
                  </div>

                  {/* Upload overlay */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Camera className="w-6 h-6 text-white" />
                    )}
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                {/* User info */}
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {profile?.full_name || t("noName")}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    {user.email}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    {t("clickToChangeAvatar")}
                  </p>
                </div>
              </div>
            </section>

            {/* Profile Info Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-medium text-gray-900 dark:text-white">
                  {t("personalInfo")}
                </h2>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {tCommon("edit")}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setFullName(profile?.full_name || "");
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {tCommon("save")}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <User className="w-4 h-4 text-gray-400" />
                    {t("fullName")}
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("enterFullName")}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-900 dark:text-white">
                      {profile?.full_name || (
                        <span className="text-gray-400 italic">
                          {t("notSet")}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {t("email")}
                  </label>
                  <p className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-900 dark:text-white flex items-center justify-between">
                    {user.email}
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <Check className="w-3 h-3" />
                      {t("verified")}
                    </span>
                  </p>
                </div>

                {/* Member Since */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {t("memberSince")}
                  </label>
                  <p className="px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-900 dark:text-white">
                    {profile?.created_at
                      ? formatDate(profile.created_at)
                      : formatDate(user.created_at)}
                  </p>
                </div>
              </div>
            </section>

            {/* Auth Provider Info */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-medium text-gray-900 dark:text-white mb-4">
                {t("connectedAccounts")}
              </h2>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm">
                    {user.app_metadata?.provider === "google" ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    ) : (
                      <User className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">
                      {user.app_metadata?.provider || "Email"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  {t("connected")}
                </span>
              </div>
            </section>

            {/* AI Usage Section */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="font-medium text-gray-900 dark:text-white">
                  {tAI("dailyUsage")}
                </h2>
              </div>
              <AIUsageIndicator variant="full" />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
