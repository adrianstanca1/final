import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { User, Company, LoginCredentials, RegistrationPayload } from '../types';

// Types to match existing auth client interface
export interface AuthenticatedSession {
  token: string;
  refreshToken: string;
}

export interface AuthClientInterface {
  login(credentials: LoginCredentials): Promise<{ session?: AuthenticatedSession; mfaRequired?: boolean; userId?: string }>;
  register(payload: RegistrationPayload): Promise<AuthenticatedSession>;
  logout(): Promise<void>;
  me(token: string): Promise<{ user: User; company: Company }>;
  refreshToken(refreshToken: string): Promise<{ token: string }>;
  requestPasswordReset(email: string): Promise<void>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  verifyMfa(userId: string, code: string): Promise<AuthenticatedSession>;
}

class FirebaseAuthClient implements AuthClientInterface {
  async login(credentials: LoginCredentials): Promise<{ session?: AuthenticatedSession; mfaRequired?: boolean; userId?: string }> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
      const firebaseUser = userCredential.user;
      
      // Get the Firebase ID token (acts as our JWT token)
      const token = await firebaseUser.getIdToken();
      const refreshToken = firebaseUser.refreshToken;
      
      return {
        session: {
          token,
          refreshToken
        }
      };
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  }

  async loginWithGoogle(): Promise<AuthenticatedSession> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        await this.createUserDocument(firebaseUser);
      }
      
      const token = await firebaseUser.getIdToken();
      const refreshToken = firebaseUser.refreshToken;
      
      return {
        token,
        refreshToken
      };
    } catch (error: any) {
      throw new Error(error.message || 'Google login failed');
    }
  }

  async register(payload: RegistrationPayload): Promise<AuthenticatedSession> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
      const firebaseUser = userCredential.user;
      
      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: `${payload.firstName} ${payload.lastName}`
      });

      // Create user document in Firestore
      const user = await this.createUserDocument(firebaseUser, {
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: 'admin'
      });

      // Create company if provided
      if (payload.companyName) {
        await this.createCompanyDocument(firebaseUser.uid, {
          name: payload.companyName,
          type: payload.companyType || 'general_contractor'
        });
      }

      const token = await firebaseUser.getIdToken();
      const refreshToken = firebaseUser.refreshToken;
      
      return {
        token,
        refreshToken
      };
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  async logout(): Promise<void> {
    await signOut(auth);
  }

  async me(token: string): Promise<{ user: User; company: Company }> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }

      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        firstName: userData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
        lastName: userData.lastName || firebaseUser.displayName?.split(' ')[1] || '',
        role: userData.role || 'user',
        companyId: userData.companyId,
        permissions: userData.permissions || [],
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date(),
        lastLoginAt: new Date(),
        isActive: true
      };

      // Get company document if user has companyId
      let company: Company;
      if (userData.companyId) {
        const companyDoc = await getDoc(doc(db, 'companies', userData.companyId));
        if (companyDoc.exists()) {
          const companyData = companyDoc.data();
          company = {
            id: userData.companyId,
            name: companyData.name,
            type: companyData.type,
            settings: companyData.settings || {
              workingHours: { start: '08:00', end: '17:00' },
              timezone: 'UTC',
              currency: 'USD'
            },
            createdAt: companyData.createdAt?.toDate() || new Date(),
            updatedAt: companyData.updatedAt?.toDate() || new Date()
          };
        } else {
          // Create a default company if none exists
          company = await this.createCompanyDocument(firebaseUser.uid, {
            name: 'Default Company',
            type: 'general_contractor'
          });
        }
      } else {
        // Create a default company if user doesn't have one
        company = await this.createCompanyDocument(firebaseUser.uid, {
          name: 'Default Company',
          type: 'general_contractor'
        });
      }

      return { user, company };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to get user information');
    }
  }

  async refreshToken(refreshToken: string): Promise<{ token: string }> {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        throw new Error('No authenticated user');
      }
      
      // Force refresh the token
      const token = await firebaseUser.getIdToken(true);
      return { token };
    } catch (error: any) {
      throw new Error(error.message || 'Token refresh failed');
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      throw new Error(error.message || 'Password reset request failed');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Firebase handles password reset differently - this would be handled by the email link
    throw new Error('Password reset should be handled through Firebase email link');
  }

  async verifyMfa(userId: string, code: string): Promise<AuthenticatedSession> {
    // MFA not implemented in this basic Firebase setup
    throw new Error('MFA not implemented');
  }

  // Helper method to create user document
  private async createUserDocument(firebaseUser: FirebaseUser, additionalData: any = {}): Promise<User> {
    const userData = {
      firstName: additionalData.firstName || firebaseUser.displayName?.split(' ')[0] || '',
      lastName: additionalData.lastName || firebaseUser.displayName?.split(' ')[1] || '',
      email: firebaseUser.email,
      role: additionalData.role || 'user',
      permissions: additionalData.permissions || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), userData);

    return {
      id: firebaseUser.uid,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: new Date(),
      isActive: true
    } as User;
  }

  // Helper method to create company document
  private async createCompanyDocument(userId: string, companyData: any): Promise<Company> {
    const companyDoc = await addDoc(collection(db, 'companies'), {
      name: companyData.name,
      type: companyData.type,
      ownerId: userId,
      settings: companyData.settings || {
        workingHours: { start: '08:00', end: '17:00' },
        timezone: 'UTC',
        currency: 'USD'
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update user document with companyId
    await updateDoc(doc(db, 'users', userId), {
      companyId: companyDoc.id,
      updatedAt: serverTimestamp()
    });

    return {
      id: companyDoc.id,
      name: companyData.name,
      type: companyData.type,
      settings: companyData.settings || {
        workingHours: { start: '08:00', end: '17:00' },
        timezone: 'UTC',
        currency: 'USD'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Method to listen to auth state changes
  onAuthStateChanged(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const { user } = await this.me(await firebaseUser.getIdToken());
          callback(user);
        } catch (error) {
          console.error('Error getting user data:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }
}

export const firebaseAuthClient = new FirebaseAuthClient();