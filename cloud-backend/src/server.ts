import cors from 'cors';
import express, { Request, Response } from 'express';
import { config } from './config';
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallets';
import invitationRoutes from './routes/invitations';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/wallets', walletRoutes);
app.use('/invitations', invitationRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(config.PORT, () => {
  console.log(`[cloud-backend] listening on port ${config.PORT}`);
});
