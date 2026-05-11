export type MemberTabParamList = {
  Discover: undefined;
  ClubHome: undefined;
  Spa: undefined;
  PT: undefined;
  Padel: undefined;
  Profile: undefined;
  // Hidden routes
  Messages: undefined;
  Connections: undefined;
  Chat: {
    conversationId: string;
    otherUser: {
      id: string;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
      role?: string;
    };
  };
  Legal: { type: 'privacy' | 'terms' };
  Notifications: undefined;
  Reservations: undefined;
};
