export type TrainerTabParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  Students: undefined;
  Discover: undefined;
  TrainerMessages: undefined;
  TrainerProfile: undefined;
  // Hidden routes
  StudentDetail: { userId: string };
  Chat: {
    conversationId: string;
    otherUser: { id: string; firstName: string; lastName: string; photoUrl: string | null };
  };
};
