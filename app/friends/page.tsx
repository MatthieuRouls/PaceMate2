'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
// Page protégée par le middleware - seuls les utilisateurs connectés y accèdent
import { Users, UserPlus, Clock, Search, MessageCircle, UserMinus, Check, X } from 'lucide-react';
import {
  getFriendsList,
  getPendingRequests,
  getSentRequests,
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  checkFriendshipStatusBatch
} from '@/lib/friend-actions';
import { getOrCreateDirectConversation } from '@/lib/chat-actions';
import type { Profile, Friendship } from '@/lib/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

type Tab = 'friends' | 'requests' | 'search';

export default function FriendsPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [loading, setLoading] = useState(true);

  // Data states
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchStatuses, setSearchStatuses] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Fetch data on mount and tab change
  useEffect(() => {
    if (!profile) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'friends') {
          const result = await getFriendsList();
          if (result.success && result.friends) {
            setFriends(result.friends);
          }
        } else if (activeTab === 'requests') {
          const [pending, sent] = await Promise.all([
            getPendingRequests(),
            getSentRequests()
          ]);
          if (pending.success && pending.requests) {
            setPendingRequests(pending.requests);
          }
          if (sent.success && sent.requests) {
            setSentRequests(sent.requests);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, activeTab]);

  // Search users
  useEffect(() => {
    if (activeTab !== 'search' || !searchQuery || searchQuery.length < 2) {
      setSearchResults([]);
      setSearchStatuses({});
      return;
    }

    const delaySearch = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const result = await searchUsers(searchQuery);
        if (result.success && result.users) {
          setSearchResults(result.users);
          // Fetch all friendship statuses in one batch call
          const ids = result.users.map(u => u.id);
          const statusResult = await checkFriendshipStatusBatch(ids);
          if (statusResult.success && statusResult.statuses) {
            setSearchStatuses(statusResult.statuses);
          }
        }
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, activeTab]);

  // Actions
  const handleSendRequest = async (userId: string) => {
    setActionLoading(userId);
    try {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        // Rafraîchir la recherche pour mettre à jour le statut
        if (searchQuery) {
          const searchResult = await searchUsers(searchQuery);
          if (searchResult.success && searchResult.users) {
            setSearchResults(searchResult.users);
          }
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const result = await acceptFriendRequest(friendshipId);
      if (result.success) {
        setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const result = await rejectFriendRequest(friendshipId);
      if (result.success) {
        setPendingRequests(prev => prev.filter(r => r.id !== friendshipId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const result = await cancelFriendRequest(friendshipId);
      if (result.success) {
        setSentRequests(prev => prev.filter(r => r.id !== friendshipId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (friendshipId: string, friendId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet ami ?')) return;

    setActionLoading(friendId);
    try {
      const result = await removeFriend(friendshipId);
      if (result.success) {
        setFriends(prev => prev.filter(f => f.id !== friendId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleMessage = async (friendId: string) => {
    setActionLoading(friendId);
    try {
      const result = await getOrCreateDirectConversation(friendId);
      if (result.success && result.conversation) {
        router.push(`/messages?conv=${result.conversation.id}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-neu-base flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'friends' as Tab, label: 'Mes amis', icon: Users, count: friends.length },
    { id: 'requests' as Tab, label: 'Demandes', icon: Clock, count: pendingRequests.length },
    { id: 'search' as Tab, label: 'Rechercher', icon: Search }
  ];

  return (
    <div className="min-h-screen bg-neu-base pt-20 pb-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-dark-800 mb-2">Amis</h1>
          <p className="text-dark-500">Gère tes connexions et trouve de nouveaux partenaires de course</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-neon-500 text-dark-800'
                    : 'bg-white border border-silver-400 text-dark-600 hover:border-neon-500'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id ? 'bg-dark-800 text-white' : 'bg-pink-500 text-white'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-dark-700 rounded-xl border border-silver-400 p-6">
          {/* Search input */}
          {activeTab === 'search' && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom d'utilisateur..."
                  className="w-full pl-12 pr-4 py-3 rounded-lg border border-silver-400 focus:border-neon-500 focus:ring-2 focus:ring-neon-500/20 outline-none transition-all"
                />
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              {/* Friends List */}
              {activeTab === 'friends' && (
                <div className="space-y-4">
                  {friends.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-silver-400 mx-auto mb-4" />
                      <p className="text-dark-500">Tu n'as pas encore d'amis</p>
                      <button
                        onClick={() => setActiveTab('search')}
                        className="mt-4 text-neon-600 hover:text-neon-700 font-medium"
                      >
                        Rechercher des utilisateurs
                      </button>
                    </div>
                  ) : (
                    friends.map((friend) => (
                      <FriendCard
                        key={friend.id}
                        profile={friend}
                        onMessage={() => handleMessage(friend.id)}
                        onRemove={() => {
                          // Need to find the friendship ID - for now use friend.id as placeholder
                          // In a real implementation, we'd store the friendship ID
                        }}
                        loading={actionLoading === friend.id}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Requests */}
              {activeTab === 'requests' && (
                <div className="space-y-6">
                  {/* Pending incoming */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
                      Demandes reçues ({pendingRequests.length})
                    </h3>
                    {pendingRequests.length === 0 ? (
                      <p className="text-dark-500 text-center py-4">Aucune demande en attente</p>
                    ) : (
                      <div className="space-y-3">
                        {pendingRequests.map((request) => (
                          <RequestCard
                            key={request.id}
                            request={request}
                            type="received"
                            onAccept={() => handleAcceptRequest(request.id)}
                            onReject={() => handleRejectRequest(request.id)}
                            loading={actionLoading === request.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sent */}
                  <div>
                    <h3 className="text-sm font-semibold text-dark-500 uppercase tracking-wider mb-4">
                      Demandes envoyées ({sentRequests.length})
                    </h3>
                    {sentRequests.length === 0 ? (
                      <p className="text-dark-500 text-center py-4">Aucune demande envoyée</p>
                    ) : (
                      <div className="space-y-3">
                        {sentRequests.map((request) => (
                          <RequestCard
                            key={request.id}
                            request={request}
                            type="sent"
                            onCancel={() => handleCancelRequest(request.id)}
                            loading={actionLoading === request.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {activeTab === 'search' && (
                <div className="space-y-4">
                  {searchLoading ? (
                    <div className="flex justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : searchQuery.length < 2 ? (
                    <p className="text-dark-500 text-center py-8">
                      Entre au moins 2 caractères pour rechercher
                    </p>
                  ) : searchResults.length === 0 ? (
                    <p className="text-dark-500 text-center py-8">
                      Aucun utilisateur trouvé pour "{searchQuery}"
                    </p>
                  ) : (
                    searchResults.map((user) => (
                      <SearchResultCard
                        key={user.id}
                        profile={user}
                        status={searchStatuses[user.id] || 'none'}
                        onSendRequest={() => handleSendRequest(user.id)}
                        loading={actionLoading === user.id}
                      />
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components

function FriendCard({
  profile,
  onMessage,
  onRemove,
  loading
}: {
  profile: Profile;
  onMessage: () => void;
  onRemove: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-silver-50 dark:bg-dark-600 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neon-400 flex items-center justify-center text-white font-bold">
          {profile.username.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-dark-800">{profile.username}</div>
          <div className="text-sm text-dark-500">Niveau {profile.running_level}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onMessage}
          disabled={loading}
          className="p-2.5 rounded-lg bg-neon-500 text-dark-800 hover:bg-neon-400 transition-colors disabled:opacity-50"
        >
          <MessageCircle className="w-5 h-5" />
        </button>
        <button
          onClick={onRemove}
          disabled={loading}
          className="p-2.5 rounded-lg bg-silver-200 text-dark-600 hover:bg-pink-100 hover:text-pink-600 transition-colors disabled:opacity-50"
        >
          <UserMinus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function RequestCard({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  loading
}: {
  request: Friendship;
  type: 'received' | 'sent';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  loading: boolean;
}) {
  const profile = type === 'received' ? request.user : request.friend;

  return (
    <div className="flex items-center justify-between p-4 bg-silver-50 dark:bg-dark-600 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-pink-400 flex items-center justify-center text-white font-bold">
          {profile?.username?.substring(0, 2).toUpperCase() || '??'}
        </div>
        <div>
          <div className="font-semibold text-dark-800">{profile?.username || 'Utilisateur'}</div>
          <div className="text-sm text-dark-500">
            {type === 'received' ? 'Souhaite être ton ami' : 'En attente de réponse'}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {type === 'received' ? (
          <>
            <button
              onClick={onAccept}
              disabled={loading}
              className="p-2.5 rounded-lg bg-neon-500 text-dark-800 hover:bg-neon-400 transition-colors disabled:opacity-50"
            >
              <Check className="w-5 h-5" />
            </button>
            <button
              onClick={onReject}
              disabled={loading}
              className="p-2.5 rounded-lg bg-silver-200 text-dark-600 hover:bg-pink-100 hover:text-pink-600 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-silver-200 text-dark-600 hover:bg-pink-100 hover:text-pink-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({
  profile,
  status,
  onSendRequest,
  loading
}: {
  profile: Profile;
  status: string;
  onSendRequest: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-silver-50 dark:bg-dark-600 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-neon-400 flex items-center justify-center text-white font-bold">
          {profile.username.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold text-dark-800">{profile.username}</div>
          <div className="text-sm text-dark-500">Niveau {profile.running_level}</div>
        </div>
      </div>
      <div>
        {status === 'accepted' ? (
          <span className="px-4 py-2 rounded-lg bg-neon-100 text-neon-700 text-sm font-medium">
            Ami
          </span>
        ) : status === 'pending_sent' ? (
          <span className="px-4 py-2 rounded-lg bg-silver-200 text-dark-600 text-sm font-medium">
            Demande envoyée
          </span>
        ) : status === 'pending_received' ? (
          <span className="px-4 py-2 rounded-lg bg-pink-100 text-pink-600 text-sm font-medium">
            T'a envoyé une demande
          </span>
        ) : status === 'blocked' ? (
          <span className="px-4 py-2 rounded-lg bg-silver-200 text-dark-500 text-sm font-medium">
            Bloqué
          </span>
        ) : (
          <button
            onClick={onSendRequest}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-500 text-white hover:bg-pink-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Ajouter
          </button>
        )}
      </div>
    </div>
  );
}
