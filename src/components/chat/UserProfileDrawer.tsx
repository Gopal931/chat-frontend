import React, { useState, useEffect, useRef } from 'react';
import {
  X, Camera, Pencil, Check, Mail, Phone, Calendar,
  ShieldCheck, KeyRound, Loader2, AlertCircle, Sparkles, UserCheck
} from 'lucide-react';
import { User } from '@/types/user';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import api from '@/api/axios';
import { USERS } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UserAvatar from '@/components/shared/UserAvatar';
import ChangePasswordModal from './ChangePasswordModal';
import { formatLastSeen } from '@/utils/formatLastSeen';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  userProfile: User | null;
  isSelf?: boolean;
}

const UserProfileDrawer: React.FC<Props> = ({
  open,
  onClose,
  userProfile,
  isSelf = false,
}) => {
  const { user: currentUser, updateUser } = useAuth();
  const { socket } = useSocket();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUser = isSelf ? (currentUser ?? userProfile) : userProfile;

  // Editing state for self bio & username
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState(activeUser?.bio ?? "Hey there! I am using Pulse Chat.");
  const [savingBio, setSavingBio] = useState(false);
  const [bioError, setBioError] = useState('');

  // Uploading profile photo state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Change password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Sync state when activeUser changes
  useEffect(() => {
    if (activeUser?.bio) {
      setBioText(activeUser.bio);
    }
  }, [activeUser?.bio]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Listen to profile_updated socket event
  useEffect(() => {
    if (!socket) return;
    const handleProfileUpdated = (updated: User) => {
      if (updated._id === currentUser?._id) {
        updateUser(updated);
      }
    };
    socket.on('profile_updated', handleProfileUpdated);
    return () => {
      socket.off('profile_updated', handleProfileUpdated);
    };
  }, [socket, currentUser?._id, updateUser]);

  if (!open || !activeUser) return null;

  // Handle bio save
  const handleSaveBio = async () => {
    setBioError('');
    setSavingBio(true);
    try {
      const { data } = await api.patch<User>(USERS.UPDATE_PROFILE, {
        bio: bioText,
      });
      if (isSelf) {
        updateUser(data);
      }
      setIsEditingBio(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setBioError(msg || 'Failed to save bio');
    } finally {
      setSavingBio(false);
    }
  };

  // Handle profile photo upload via S3 presigned PUT URL
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size cannot exceed 10MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Step 1: Request presigned upload URL
      const { data: presignedData } = await api.get<{ uploadUrl: string; fileKey: string }>(
        `${USERS.AVATAR_UPLOAD_URL}?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}&fileSize=${file.size}`
      );

      // Step 2: Upload file directly to S3
      await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      // Step 3: Save file key to backend user profile
      const { data: updatedProfile } = await api.post<User>(USERS.SAVE_AVATAR, {
        fileKey: presignedData.fileKey,
      });

      if (isSelf) {
        updateUser(updatedProfile);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setUploadError(msg || 'Failed to upload profile photo');
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
      />

      {/* Drawer */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-card/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl overflow-hidden',
          'w-full sm:w-[380px] md:w-[400px]',
          'animate-in slide-in-from-right duration-300 ease-out'
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 glass-header">
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-extrabold text-foreground tracking-tight">
              {isSelf ? 'Profile & Settings' : 'Contact Info'}
            </h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10" onClick={onClose}>
            <X size={18} />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

          {/* Hero Section */}
          <div className="flex flex-col items-center text-center space-y-3.5 pb-6 border-b border-white/10">
            <div className="relative group">
              <UserAvatar
                username={activeUser.username}
                avatarUrl={activeUser.avatarUrl}
                size="xl"
                isOnline={activeUser.isOnline}
                showStatus={true}
              />

              {/* Upload photo overlay button (only for self) */}
              {isSelf && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200"
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <>
                        <Camera size={22} />
                        <span className="text-[10px] font-medium mt-1">Change Photo</span>
                      </>
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoSelect}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                  />
                </>
              )}
            </div>

            {uploadError && (
              <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20">
                <AlertCircle size={13} />
                <span>{uploadError}</span>
              </div>
            )}

            <div>
              <h3 className="text-xl font-bold text-foreground">{activeUser.username}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{activeUser.email}</p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-xs font-medium">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  activeUser.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                )}
              />
              <span className={activeUser.isOnline ? 'text-emerald-400' : 'text-muted-foreground'}>
                {formatLastSeen(activeUser.lastSeen, activeUser.isOnline)}
              </span>
            </div>
          </div>

          {/* About / Bio Section */}
          <div className="space-y-2 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                About / Bio
              </span>
              {isSelf && !isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Pencil size={12} /> Edit
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div className="space-y-2 pt-1">
                <Input
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value.slice(0, 150))}
                  placeholder="Add a bio..."
                  className="text-sm bg-secondary"
                  disabled={savingBio}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {bioText.length}/150
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      onClick={() => {
                        setIsEditingBio(false);
                        setBioText(activeUser.bio ?? '');
                      }}
                      disabled={savingBio}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 px-2.5 text-xs gap-1"
                      onClick={handleSaveBio}
                      disabled={savingBio}
                    >
                      {savingBio ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} /> Save</>}
                    </Button>
                  </div>
                </div>
                {bioError && <p className="text-xs text-destructive mt-1">{bioError}</p>}
              </div>
            ) : (
              <p className="text-sm text-foreground/90 italic bg-secondary/40 p-3 rounded-xl border border-border/50">
                "{activeUser.bio || "Hey there! I am using Pulse Chat."}"
              </p>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-3 pb-4 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Contact Information
            </span>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-xl">
                <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Mail size={15} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium">Email Address</p>
                  <p className="text-xs font-semibold text-foreground truncate">{activeUser.email}</p>
                </div>
              </div>

              {activeUser.phone && (
                <div className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-xl">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Phone size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">Phone</p>
                    <p className="text-xs font-semibold text-foreground truncate">{activeUser.phone}</p>
                  </div>
                </div>
              )}

              {activeUser.createdAt && (
                <div className="flex items-center gap-3 bg-secondary/30 p-2.5 rounded-xl">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Calendar size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-muted-foreground font-medium">Member Since</p>
                    <p className="text-xs font-semibold text-foreground truncate">
                      {new Date(activeUser.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Security & Account Settings (Only for Self) */}
          {isSelf ? (
            <div className="space-y-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Security & Account
              </span>

              <div className="space-y-2 pt-1">
                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <KeyRound size={15} className="text-primary group-hover:text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Change Password</p>
                      <p className="text-[10px] text-muted-foreground">Update current login password</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Edit →</span>
                </button>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                  <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-400">Account Protected</p>
                    <p className="text-[10px] text-muted-foreground">End-to-end encrypted session active</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 text-xs text-muted-foreground">
                <UserCheck size={15} className="text-primary flex-shrink-0" />
                <span>Connected User in Pulse Chat</span>
              </div>
            </div>
          )}

        </div>
      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </>
  );
};

export default UserProfileDrawer;
