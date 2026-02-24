declare namespace Express {
  interface Request {
    authUser?: {
      id: string;
      email: string;
    };
    walletRole?: 'owner' | 'member';
  }
}
