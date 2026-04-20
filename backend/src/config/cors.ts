import { CorsOptions } from 'cors';
import { config } from './env';

const allowedOrigins = config.corsOrigin;

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (config.nodeEnv === 'development') {
      console.warn(`CORS: Origin ${origin} not in allowed list, but allowing in development mode`);
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers',
  ],
  exposedHeaders: [
    'Content-Length',
    'Content-Type',
    'Content-Disposition',
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

export const corsOptionsDelegate = (req: any, callback: any) => {
  const origin = req.header('Origin');
  
  let corsOptionsForRequest: CorsOptions = { ...corsOptions };

  if (origin && allowedOrigins.includes(origin)) {
    corsOptionsForRequest.origin = true;
  } else if (config.nodeEnv === 'development') {
    corsOptionsForRequest.origin = true;
  } else {
    corsOptionsForRequest.origin = false;
  }

  callback(null, corsOptionsForRequest);
};

export default corsOptions;
