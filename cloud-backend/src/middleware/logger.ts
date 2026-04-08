import { Request, Response, NextFunction } from 'express';

interface LogEntry {
  timestamp: string;
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

function getDuration(startTime: [number, number]): number {
  const diff = process.hrtime(startTime);
  return Math.round((diff[0] * 1000 + diff[1] / 1e6) * 100) / 100;
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = process.hrtime();
  
  const originalEnd = res.end.bind(res);
  
  res.end = function(chunk?: unknown, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    const duration = getDuration(startTime);
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId: req.requestId || 'unknown',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.socket.remoteAddress,
      userId: req.authUser?.id,
    };

    // Only log in non-test environments
    if (process.env.NODE_ENV !== 'test') {
      const logLine = `[${logEntry.timestamp}] ${logEntry.requestId} ${logEntry.method} ${logEntry.path} ${logEntry.statusCode} ${logEntry.duration}ms${logEntry.userId ? ` user:${logEntry.userId}` : ''}`;
      
      if (logEntry.statusCode >= 400) {
        console.error(logLine);
      } else {
        console.log(logLine);
      }
    }

    // Handle overloads
    if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding as () => void);
    }
    if (cb) {
      return originalEnd(chunk, encoding as BufferEncoding, cb);
    }
    return originalEnd(chunk, encoding as BufferEncoding);
  };

  next();
}
