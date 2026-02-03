// AUTH REFACTOR: NextAuth is the SINGLE SOURCE OF TRUTH for authentication
// All auth flows (credentials, Google OAuth) use NextAuth session
// Role is stored in JWT token and session.user.role

// AUTH REFACTOR: NextAuth is the SINGLE SOURCE OF TRUTH for authentication
// All auth flows (credentials, Google OAuth) use NextAuth session
// Role is stored in JWT token and session.user.role
// MIGRATION: Customer model → User model (single source of truth)

import NextAuth, { type AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

// AUTH AUDIT FIX
// Scoped change – do NOT reuse for Customer
// Reason: prevent admin without password & auth mismatch
// MIGRATION: All auth now uses User model (role: admin|staff|customer)

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: any) {
        const email = typeof credentials?.email === 'string' ? credentials.email.toLowerCase().trim() : '';
        const password = credentials?.password || '';
        if (!email || !password) return null;

        await dbConnect();

        // Admin/staff login (User model)
        const admin = await User.findOne({ email, role: { $in: ['admin', 'staff'] } });
        if (admin) {
          if (admin.status && admin.status !== 'active') {
            console.warn('[AUTH] admin blocked/deleted:', email);
            return null;
          }
          if (!admin.password) {
            console.warn('[AUTH] admin missing password:', email);
            return null;
          }
          const ok = bcrypt.compareSync(password, admin.password);
          if (!ok) return null;
          return {
            id: String(admin._id),
            email: admin.email,
            name: admin.name,
            role: admin.role,
            status: admin.status || 'active',
          };
        }

        // Customer login (User model with role='customer')
        // MIGRATION: Customer model → User model
        const customer = await User.findOne({ email, role: 'customer' });
        if (!customer) return null;
        if (customer.status && customer.status !== 'active') {
          console.warn('[AUTH] customer blocked/deleted:', email);
          return null;
        }
        if (customer.provider && customer.provider !== 'local') {
          console.warn('[AUTH] customer provider mismatch:', email);
          return null;
        }
        const ok = customer.password ? bcrypt.compareSync(password, customer.password) : false;
        if (!ok) return null;
        return {
          id: String(customer._id),
          email: customer.email,
          name: customer.name,
          role: customer.role || 'customer',
          status: customer.status || 'active',
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      // AUTH REFACTOR: GoogleProvider handles OAuth flow automatically
      // User creation/update is handled in signIn callback
    }),
  ],
  session: { strategy: 'jwt' as const },
  callbacks: {
    // AUTH REFACTOR: JWT callback stores role/id/status in token (source of truth)
    async jwt({ token, user, account }: any) {
      // Initial sign in - user data from authorize/signIn
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      
      // AUTH REFACTOR: Handle Google OAuth user creation/update
      // GoogleProvider doesn't have authorize(), so we handle user creation in signIn callback
      // But we need to ensure role is set in token here
      // MIGRATION: Customer model → User model
      if (account?.provider === 'google' && user) {
        await dbConnect();
        const normalizedEmail = user.email?.toLowerCase().trim() || '';
        const customer = await User.findOne({ email: normalizedEmail, role: 'customer' });
        if (customer) {
          // Ensure role is set from DB if user exists
          token.role = customer.role || 'customer';
          token.status = customer.status || 'active';
        }
      }
      
      return token;
    },
    // AUTH REFACTOR: Session callback exposes role/id/status from token to session.user
    async session({ session, token }: any) {
      if (session?.user) {
        // Role is source of truth from JWT token (set in jwt callback)
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).status = token.status;
      }
      return session;
    },
    // AUTH REFACTOR: signIn callback handles Google OAuth user creation and status check
    async signIn({ user, account, profile }: any) {
      // AUTH AUDIT FIX: check status for User model, active for Customer model
      if (user?.status && user.status !== 'active') return false;
      
      // AUTH REFACTOR: Handle Google OAuth user creation/update
      // MIGRATION: Customer model → User model
      if (account?.provider === 'google' && profile?.email) {
        await dbConnect();
        const normalizedEmail = profile.email.toLowerCase().trim();
        
        // Find or create customer from Google OAuth (User model with role='customer')
        let customer = await User.findOne({ email: normalizedEmail, role: 'customer' });
        if (!customer) {
          // Create new customer from Google (User model)
          customer = await User.create({
            name: profile.name || profile.email.split('@')[0],
            email: normalizedEmail,
            provider: 'google',
            googleId: profile.sub || account.providerAccountId,
            role: 'customer',
            status: 'active',
          });
        } else {
          // Update existing customer if needed
          const update: any = {};
          if (!customer.provider) update.provider = 'google';
          if (!customer.googleId) update.googleId = profile.sub || account.providerAccountId;
          if (customer.status && customer.status !== 'active') {
            // Block sign in if customer is inactive
            console.warn('[AUTH] Google OAuth - customer blocked:', normalizedEmail);
            return false;
          }
          if (Object.keys(update).length) {
            await User.updateOne({ _id: customer._id }, { $set: update });
          }
        }
        
        // Set user data for JWT token (role will be read in jwt callback)
        user.id = String(customer._id);
        user.role = customer.role || 'customer';
        user.status = customer.status || 'active';
      }
      
      return true;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

export default NextAuth(authOptions);
