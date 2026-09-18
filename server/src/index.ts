import dns from 'dns';

// Enforce IPv4 DNS resolution on cloud hosting (avoids IPv6 ENETUNREACH)
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

import { app } from './app';
import { ENV } from './config/env';
import { checkDatabaseConnection } from './config/db';

const PORT = ENV.PORT;

// Start Server
app.listen(PORT, async () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Express Server is running on http://localhost:${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth Endpoints: /api/auth/signup & /api/auth/login`);

  const dbConnection = await checkDatabaseConnection();
  if (dbConnection.connected) {
    console.log(`🟢 PostgreSQL / Supabase: Connected (${dbConnection.details?.database})`);
  } else {
    console.log(`🟡 PostgreSQL / Supabase: Pending configuration`);
    console.log(`💡 ${dbConnection.message}`);
  }
  console.log(`==================================================\n`);
});
