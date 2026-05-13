export type RootStackParamList = {
  Intro: undefined;
  ClubConnect: undefined;
  RegistrationType: undefined;
  CorporateEntry: undefined;
  Login: undefined;
  ForgotPassword: undefined;
  Register: { preselectedSubdomain?: string; preselectedGoal?: string } | undefined;
  TrainerRegister: undefined;
  PendingApproval: undefined;
  PartnerProfile: { subdomain: string };
  TrainerDetail: { trainerId: string };
  Main: undefined;
  TrainerMain: undefined;
};
