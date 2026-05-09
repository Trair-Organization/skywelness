export type MemberTabParamList = {
  Home: undefined;
  Reservations: undefined;
  SpecialLessons: undefined;
  Massage: undefined;
  Events: undefined;
  Notifications: undefined;
  Network: undefined;
  Messages: undefined;
  Chat: {
    conversationId: string;
    otherUser: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  };
  Legal: { type: 'privacy' | 'terms' };
  Profile: undefined;
};
