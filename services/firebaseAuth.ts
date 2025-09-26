import {
  User as FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { User, Company, Role } from '../types';

// Interface for our authentication service
export interface AuthService {
  getCurrentUser(): Promise<User | null>;
  login(email: string, password: string): Promise<User>;
  loginWithGoogle(): Promise<User>;
  register(email: string, password: string, userData: Partial<User>, companyData: Partial<Company>): Promise<User>;
  logout(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updateProfile(updates: Partial<User>): Promise<User>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

class FirebaseAuthService implements AuthService {
  private currentUser: User | null = null;

  async getCurrentUser(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    this.currentUser = {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      name: firebaseUser.displayName || userData.name || '',
      role: userData.role || Role.OPERATIVE,
      companyId: userData.companyId,
      isActive: true,
      ...userData
    };

    return this.currentUser;
  }

  async login(email: string, password: string): Promise<User> {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = await this.getUserFromFirestore(result.user);
      this.currentUser = user;
      return user;
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async loginWithGoogle(): Promise<User> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user exists in Firestore
      let user = await this.getUserFromFirestore(firebaseUser);
      
      if (!user) {
        // Create new user and company for first-time Google sign-in
        user = await this.createUserAndCompany(firebaseUser, {
          name: firebaseUser.displayName || '',
          email: firebaseUser.email!,
          role: Role.PRINCIPAL_ADMIN
        }, {
          name: `${firebaseUser.displayName?.split(' ')[0] || 'User'}'s Company`
        });
      }

      this.currentUser = user;
      return user;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async register(
    email: string, 
    password: string, 
    userData: Partial<User>, 
    companyData: Partial<Company>
  ): Promise<User> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;

      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: userData.name
      });

      // Create user and company in Firestore
      const user = await this.createUserAndCompany(firebaseUser, userData, companyData);
      this.currentUser = user;
      return user;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(auth);
      this.currentUser = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw new Error(this.getAuthErrorMessage(error.code));
    }
  }

  async updateProfile(updates: Partial<User>): Promise<User> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !this.currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Update Firebase profile if needed
      if (updates.name && updates.name !== firebaseUser.displayName) {
        await updateProfile(firebaseUser, {
          displayName: updates.name
        });
      }

      // Update Firestore document
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // Update local user object
      this.currentUser = { ...this.currentUser, ...updates };
      return this.currentUser;
    } catch (error) {
      console.error('Update profile error:', error);
      throw new Error('Failed to update profile');
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const user = await this.getUserFromFirestore(firebaseUser);
          this.currentUser = user;
          callback(user);
        } catch (error) {
          console.error('Auth state change error:', error);
          callback(null);
        }
      } else {
        this.currentUser = null;
        callback(null);
      }
    });
  }

  private async getUserFromFirestore(firebaseUser: FirebaseUser): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (!userDoc.exists()) return null;

      const userData = userDoc.data();
      return {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: firebaseUser.displayName || userData.name || '',
        role: userData.role || Role.OPERATIVE,
        companyId: userData.companyId,
        isActive: userData.isActive ?? true,
        createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        ...userData
      };
    } catch (error) {
      console.error('Error getting user from Firestore:', error);
      return null;
    }
  }

  private async createUserAndCompany(
    firebaseUser: FirebaseUser, 
    userData: Partial<User>, 
    companyData: Partial<Company>
  ): Promise<User> {
    try {
      // Create company first
      const companyRef = doc(collection(db, 'companies'));
      const company: Company = {
        id: companyRef.id,
        name: companyData.name || `${userData.name}'s Company`,
        type: 'construction',
        address: companyData.address || '',
        phone: companyData.phone || '',
        email: companyData.email || firebaseUser.email!,
        website: companyData.website || '',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(companyRef, {
        ...company,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create user
      const user: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        name: userData.name || firebaseUser.displayName || '',
        role: userData.role || Role.PRINCIPAL_ADMIN,
        companyId: company.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        phone: userData.phone || '',
        position: userData.position || '',
        skills: userData.skills || [],
        availability: userData.availability || 'available'
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return user;
    } catch (error) {
      console.error('Error creating user and company:', error);
      throw new Error('Failed to create user account');
    }
  }

  private getAuthErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/popup-closed-by-user':
        return 'Sign-in was cancelled';
      case 'auth/cancelled-popup-request':
        return 'Sign-in was cancelled';
      default:
        return 'An error occurred during authentication';
    }
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;