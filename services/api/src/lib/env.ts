import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter ao menos 16 caracteres'),
  OPENAI_API_KEY: z.string().optional().default('mock'),
  OPENAI_MODEL: z.string().optional().default('gpt-4o-mini'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional().default('mock_token'),
  MERCADO_PAGO_WEBHOOK_SECRET: z.string().optional().default('mock_secret'),
  WHATSAPP_API_URL: z.string().url().optional().default('http://localhost:8080'),
  WHATSAPP_API_KEY: z.string().optional().default('mock_key'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  throw new Error('Configuração de ambiente inválida. Consulte o arquivo .env.example.');
}

export const env = parsed.data;
