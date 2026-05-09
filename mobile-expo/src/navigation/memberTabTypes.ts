export type MemberTabParamList = {
  Home: undefined;
  Discover: undefined;
  Messages: undefined;
  Massage: undefined;
  Profile: undefined;
  // Hidden routes
  Chat: {
    conversationId: string;
    otherUser: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  };
  Legal: { type: 'privacy' | 'terms' };
  Notifications: undefined;
};
